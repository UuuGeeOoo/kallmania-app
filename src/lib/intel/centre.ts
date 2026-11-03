import { db } from "@/lib/db";
import { TEAM_META } from "@/lib/auth";
import { resolveKpiCatalogue } from "@/lib/kpi-resolve";
import {
  loadUsers, loadReports, loadTasks, loadEscalations, loadLogins, loadActivityEvents,
  taskStats, previousPeriod, centreLabelOf, type IntelPeriod, type IntelTaskRow,
} from "./data";
import { loadMemberOverrides } from "./kpi-analysis";
import { agentCore, rankable, type AgentCore } from "./analyze";
import { teamKpiAnalysis } from "./team";
import { aiCommentary } from "./ai";
import type { DataAvailabilityNote, IntelFinding } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CENTRE-WIDE OPERATIONAL PERFORMANCE REPORT (sections A–F of the brief).
// Consolidates every team, supervisor, team lead and agent assigned to the
// centre (a centre = country + state). Agents are analysed through the same
// shared core as individual/team reports — no double counting, no duplication.
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function buildCentreReport(opts: { country: string | null; state: string | null; period: IntelPeriod }) {
  const { country, state, period } = opts;
  if (!country || !state) return { error: "A centre (country + state) is required" as const };
  const centre = { country, state };
  const prev = previousPeriod(period);

  const [centreUsers, leads, supervisors, catalogue, overridesAll] = await Promise.all([
    loadUsers({ country, state, team: null, agentId: null, supervisorId: null, teamLeadId: null, accountStatus: "APPROVED" }),
    db.user.findMany({ where: { country, state, role: "TEAM_LEAD", status: "APPROVED" }, select: { id: true, fullName: true, email: true, team: true, department: true, employeeId: true, status: true, createdAt: true, workDays: true, role: true, country: true, state: true } }),
    db.user.findMany({ where: { country, state, role: "SUPERVISOR", status: "APPROVED" }, select: { id: true, fullName: true, email: true, department: true, status: true, createdAt: true, country: true, state: true } }),
    resolveKpiCatalogue(centre),
    loadMemberOverrides([]),
  ]);
  // Team leads are analysed in their own section (C) — they are never agents,
  // so counting them among the centre's agents would double-count a person.
  const agents = centreUsers.filter((u) => u.role !== "TEAM_LEAD");

  const agentIds = agents.map((a) => a.id);
  const [reports, prevReports, tasks, prevTasks, escalations, logins, events] = await Promise.all([
    loadReports(agentIds, period),
    loadReports(agentIds, prev),
    loadTasks(agentIds, period),
    loadTasks(agentIds, prev),
    loadEscalations(agentIds, period),
    loadLogins(agentIds, period),
    loadActivityEvents(agentIds, period),
  ]);

  const reportsByUser = new Map<string, typeof reports>();
  for (const r of reports) { const a = reportsByUser.get(r.userId) ?? []; a.push(r); reportsByUser.set(r.userId, a); }
  const loginsByUser = new Map<string, typeof logins>();
  for (const l of logins) { const a = loginsByUser.get(l.userId) ?? []; a.push(l); loginsByUser.set(l.userId, a); }
  const eventsByUser = new Map<string, typeof events>();
  for (const e of events) { const a = eventsByUser.get(e.userId) ?? []; a.push(e); eventsByUser.set(e.userId, a); }
  const escByUser = new Map<string, typeof escalations>();
  for (const e of escalations) { const a = escByUser.get(e.fromId) ?? []; a.push(e); escByUser.set(e.fromId, a); }

  const cores: AgentCore[] = [];
  for (const u of agents) {
    cores.push(await agentCore(u, period, {
      reports: reportsByUser.get(u.id) ?? [],
      tasks,
      escalations: escByUser.get(u.id) ?? [],
      logins: loginsByUser.get(u.id) ?? [],
      events: eventsByUser.get(u.id) ?? [],
      catalogue,
      overrides: overridesAll.get(u.id),
      prevPeriod: prev,
      prevReports: prevReports.filter((r) => r.userId === u.id),
    }));
  }

  // ── A. Centre overview ──
  const teams = [...new Set(agents.map((a) => a.team).filter((t): t is string => !!t))];
  const tasksStats = taskStats(tasks, period);
  const prevTasksStats = taskStats(prevTasks, prev);
  const submitted = reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
  const scheduledAgentDays = cores.reduce((s, c) => s + c.scheduledDays, 0);
  const submittedAgentDays = new Set(submitted.map((r) => `${r.userId}:${new Date(r.reportDate).toISOString().slice(0, 10)}`)).size;
  const centreCompliancePct = scheduledAgentDays > 0 ? round2((submittedAgentDays / scheduledAgentDays) * 100) : null;
  const rankableCores = cores.filter((c) => rankable(c.score));
  const meanAgentScore = rankableCores.length ? round2(rankableCores.reduce((s, c) => s + (c.score.score as number), 0) / rankableCores.length) : null;

  const teamOverviews = [] as {
    team: string; label: string; agents: number; meanKpiAchPct: number | null; meanScore: number | null;
    tasksCompleted: number; tasksOverdue: number; compliancePct: number | null; kpiRows: Awaited<ReturnType<typeof teamKpiAnalysis>>;
  }[];
  for (const t of teams) {
    const teamAgents = agents.filter((a) => a.team === t).map((a) => ({ id: a.id, team: a.team, workDays: a.workDays }));
    const teamReports = reports.filter((r) => agents.find((a) => a.id === r.userId)?.team === t);
    const teamCores = cores.filter((c) => c.user.team === t);
    const teamMemberIds = new Set(agents.filter((a) => a.team === t).map((a) => a.id));
    const teamTasks = tasks.filter((x) => (x.assigneeId && teamMemberIds.has(x.assigneeId)) || x.assignees?.some((m) => teamMemberIds.has(m.userId)));
    const kpiRows = await teamKpiAnalysis(t, teamAgents, teamReports, catalogue, overridesAll, period);
    const meanAch = (() => {
      const vals = teamCores.map((c) => c.kpi.meanAchPct).filter((v): v is number => v !== null);
      return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    })();
    const scheduled = teamCores.reduce((s, c) => s + c.scheduledDays, 0);
    const subbed = teamCores.reduce((s, c) => s + new Set(c.submittedDates).size, 0);
    const ttStats = taskStats(teamTasks, period);
    teamOverviews.push({
      team: t, label: TEAM_META[t]?.label ?? t,
      agents: teamAgents.length,
      meanKpiAchPct: meanAch,
      meanScore: teamCores.filter((c) => rankable(c.score)).length ? round2(teamCores.filter((c) => rankable(c.score)).reduce((s, c) => s + (c.score.score as number), 0) / teamCores.filter((c) => rankable(c.score)).length) : null,
      tasksCompleted: ttStats.completed,
      tasksOverdue: ttStats.overdue,
      compliancePct: scheduled > 0 ? round2((subbed / scheduled) * 100) : null,
      kpiRows,
    });
  }

  // ── B. Supervisor performance analysis ──
  const supervisorAnalysis = [] as Record<string, unknown>[];
  for (const sup of supervisors) {
    const [reviewed, resolvedEsc, receivedEsc] = await Promise.all([
      db.report.findMany({ where: { reviewedById: sup.id, reviewedAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true, reviewedAt: true, reportDate: true } }),
      db.escalation.findMany({ where: { resolvedById: sup.id, resolvedAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true } }),
      db.escalation.findMany({ where: { centreCountry: country, centreState: state, createdAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") }, OR: [{ targetRole: "SUPERVISOR" }, { targetUserId: sup.id }] }, select: { id: true, status: true } }),
    ]);
    const reviewDelays = reviewed.map((r) => (new Date(r.reviewedAt as Date).getTime() - new Date(r.reportDate).getTime()) / 3_600_000).filter((h) => h >= 0);
    const supTeams = [...new Set(agents.filter((a) => a.team).map((a) => a.team as string))];
    supervisorAnalysis.push({
      id: sup.id, name: sup.fullName, centre: centreLabelOf(sup),
      teamsSupervised: supTeams.map((t) => TEAM_META[t]?.label ?? t),
      agentsSupervised: agents.length,
      teamMeanScore: meanAgentScore,
      reportsReviewed: reviewed.length,
      avgReviewHours: reviewDelays.length ? round2(reviewDelays.reduce((s, h) => s + h, 0) / reviewDelays.length) : null,
      escalationsReceived: receivedEsc.length,
      escalationsResolved: resolvedEsc.length,
      outstandingEscalations: receivedEsc.filter((e) => ["OPEN", "REOPENED", "IN_PROGRESS"].includes(e.status)).length,
      managedAgentCount: agents.length, // supervisors manage the whole centre by design
    });
  }

  // ── C. Team Lead analysis ──
  const leadAnalysis = [] as Record<string, unknown>[];
  for (const lead of leads) {
    const [assignedTasks, resolvedEsc, leadReports, replies] = await Promise.all([
      db.task.findMany({ where: { createdById: lead.id, dateAssigned: { lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true, status: true, assigneeId: true } }),
      db.escalation.findMany({ where: { resolvedById: lead.id, resolvedAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true } }),
      db.report.findMany({ where: { userId: lead.id, reportDate: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") }, status: { in: ["SUBMITTED", "APPROVED"] } }, select: { id: true } }),
      db.escalationMessage.findMany({ where: { senderId: lead.id, createdAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true } }),
    ]);
    const teamAgents = agents.filter((a) => a.team === lead.team);
    const teamCores = cores.filter((c) => c.user.team === lead.team);
    const meanAch = (() => {
      const vals = teamCores.map((c) => c.kpi.meanAchPct).filter((v): v is number => v !== null);
      return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    })();
    leadAnalysis.push({
      id: lead.id, name: lead.fullName, team: lead.team, teamLabel: lead.team ? TEAM_META[lead.team]?.label ?? lead.team : null,
      agentsInTeam: teamAgents.length,
      teamMeanKpiAchPct: meanAch,
      ownReportsSubmitted: leadReports.length,
      tasksAssigned: assignedTasks.length,
      taskCompletionPct: assignedTasks.length ? round2((assignedTasks.filter((t) => t.status === "COMPLETED").length / assignedTasks.length) * 100) : null,
      escalationsResolved: resolvedEsc.length,
      escalationReplies: replies.length,
    });
  }

  // ── D. Centre agent analysis (consolidated, no duplication) ──
  const sortedCores = [...cores].sort((a, b) => (b.score.score ?? -1) - (a.score.score ?? -1));
  const agentAnalysis = cores.map((c) => ({
    agent: c.user.fullName, agentId: c.user.id, team: c.teamLabel, score: c.score.score,
    classification: c.score.classification, meanKpiAchPct: c.kpi.meanAchPct,
    tasksCompleted: c.tasks.completed, tasksOverdue: c.tasks.overdue,
    punctualityPct: c.tasks.punctualityPct, meaningfulWorkDays: c.activity.meaningfulWorkDays,
    submittedDays: new Set(c.submittedDates).size, scheduledDays: c.scheduledDays,
    compliancePct: c.compliancePct,
  }));
  const repeatDeficient = cores.filter((c) => c.kpi.critical + c.kpi.below >= 2);
  const strongestReporting = [...cores].filter((c) => c.compliancePct !== null).sort((a, b) => (b.compliancePct as number) - (a.compliancePct as number))[0] ?? null;

  // ── E. Centre operational risk analysis ──
  const risks: IntelFinding[] = [];
  const achievements = teamOverviews.filter((t) => t.meanKpiAchPct !== null);
  const missingTeams = achievements.filter((t) => (t.meanKpiAchPct as number) < 70);
  if (missingTeams.length) risks.push({ title: "Teams consistently missing KPI targets", evidence: missingTeams.map((t) => `${t.label}: mean KPI achievement ${t.meanKpiAchPct}%`).join("; ") + "." });
  if (tasksStats.overdue > 0) risks.push({ title: "Overdue tasks", evidence: `${tasksStats.overdue} task(s) past deadline and not completed (prev period: ${prevTasksStats.overdue}).` });
  if (centreCompliancePct !== null && centreCompliancePct < 70) risks.push({ title: "Repeated reporting delays", evidence: `Only ${submittedAgentDays}/${scheduledAgentDays} scheduled agent-days covered by submitted reports (${centreCompliancePct}%).` });
  const lowEngagement = cores.filter((c) => c.activity.meaningfulWorkDays === 0);
  if (lowEngagement.length) risks.push({ title: "Low application engagement", evidence: `${lowEngagement.length} agent(s) with no meaningful recorded activity in the period: ${lowEngagement.slice(0, 5).map((c) => c.user.fullName).join(", ")}${lowEngagement.length > 5 ? "…" : ""}.` });
  const openEsc = escalations.filter((e) => ["OPEN", "REOPENED"].includes(e.status));
  if (openEsc.length) risks.push({ title: "Unresolved escalations", evidence: `${openEsc.length} escalation(s) still OPEN/REOPENED.` });
  const attendanceIssues = cores.filter((c) => c.attendance.available && (c.attendance.punctualityPct ?? 100) < 70);
  if (attendanceIssues.length) risks.push({ title: "Attendance and punctuality issues", evidence: attendanceIssues.map((c) => `${c.user.fullName}: ${c.attendance.late} late of ${c.attendance.daysWithRecord} recorded`).join("; ") + "." });

  // Prev-period centre mean for the trend line
  const prevCoresMean = (() => {
    const vals = cores.map((c) => c.kpi.meanAchPct).filter((v): v is number => v !== null);
    return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  })();

  // ── F. Recommendations ──
  const strengths: IntelFinding[] = [];
  if (centreCompliancePct !== null && centreCompliancePct >= 90) strengths.push({ title: "Strong reporting discipline", evidence: `${submittedAgentDays}/${scheduledAgentDays} scheduled agent-days submitted (${centreCompliancePct}%).` });
  if (tasksStats.completionRatePct !== null && tasksStats.completionRatePct >= 80) strengths.push({ title: "Healthy task completion", evidence: `${tasksStats.completed}/${tasksStats.assigned} tasks completed (${tasksStats.completionRatePct}%).` });
  const topTeams = achievements.filter((t) => (t.meanKpiAchPct as number) >= 80);
  if (topTeams.length) strengths.push({ title: "Teams meeting the KPI bar", evidence: topTeams.map((t) => `${t.label}: ${t.meanKpiAchPct}%`).join("; ") + "." });
  const commentary = await aiCommentary(
    `Centre ${state}, ${country}`,
    {
      period: period.label, teams: teamOverviews.map((t) => ({ label: t.label, agents: t.agents, meanKpiAchPct: t.meanKpiAchPct, compliancePct: t.compliancePct })),
      meanAgentScore, tasks: tasksStats, reportingCompliancePct: centreCompliancePct,
      supervisors: supervisorAnalysis.length, teamLeads: leadAnalysis.length, agents: cores.length,
    },
    strengths, [], risks,
  );

  const notes: DataAvailabilityNote[] = [
    { metric: "Attendance & punctuality", note: cores.some((c) => c.attendance.available) ? "Analysed only where agents file attendance blocks in their daily reports." : "No attendance records in the period — attendance is not reliably recorded for this centre." },
    { metric: "Infrastructure / IT incidents", note: "Not currently tracked by the application as a distinct record type." },
    { metric: "Leave records", note: "Approved leave is respected via SystemFlag leave records when present; unrecorded leave cannot be distinguished from missing reports." },
  ];

  return {
    reportType: "centre" as const,
    generatedAt: new Date().toISOString(),
    period,
    centre: { country, state, label: `${state}, ${country}` },
    overview: {
      totalTeams: teams.length,
      totalSupervisors: supervisors.length,
      totalTeamLeads: leads.length,
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === "APPROVED").length,
      inactiveAgents: agents.filter((a) => a.status !== "APPROVED").length,
      tasks: { ...tasksStats, prevCompleted: prevTasksStats.completed, prevOverdue: prevTasksStats.overdue },
      centreKpiAchPct: prevCoresMean,
      meanAgentScore,
      reportingCompliancePct: centreCompliancePct,
      scheduledAgentDays, submittedAgentDays,
      teamOverviews,
      escalations: { total: escalations.length, open: escalations.filter((e) => ["OPEN", "REOPENED"].includes(e.status)).length, resolved: escalations.filter((e) => ["RESOLVED", "CLOSED"].includes(e.status)).length },
      trend: (await import("./analyze")).weeklyTrend(reports, period),
    },
    supervisors: supervisorAnalysis,
    teamLeads: leadAnalysis,
    agents: {
      ranked: agentAnalysis.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
      highest: sortedCores[0] ? { name: sortedCores[0].user.fullName, score: sortedCores[0].score.score } : null,
      lowest: sortedCores.length > 1 ? { name: sortedCores[sortedCores.length - 1].user.fullName, score: sortedCores[sortedCores.length - 1].score.score } : null,
      mostActive: [...cores].sort((a, b) => b.activity.meaningfulWorkDays - a.activity.meaningfulWorkDays)[0] ? { name: [...cores].sort((a, b) => b.activity.meaningfulWorkDays - a.activity.meaningfulWorkDays)[0].user.fullName, meaningfulWorkDays: [...cores].sort((a, b) => b.activity.meaningfulWorkDays - a.activity.meaningfulWorkDays)[0].activity.meaningfulWorkDays } : null,
      mostOverdue: [...cores].sort((a, b) => b.tasks.overdue - a.tasks.overdue)[0]?.tasks.overdue ? { name: [...cores].sort((a, b) => b.tasks.overdue - a.tasks.overdue)[0].user.fullName, overdue: [...cores].sort((a, b) => b.tasks.overdue - a.tasks.overdue)[0].tasks.overdue } : null,
      repeatedKpiDeficiencies: repeatDeficient.map((c) => ({ name: c.user.fullName, belowOrCritical: c.kpi.below + c.kpi.critical })),
      strongestReporting: strongestReporting ? { name: strongestReporting.user.fullName, compliancePct: strongestReporting.compliancePct } : null,
    },
    risks,
    strengths,
    assessment: { commentary },
    dataNotes: notes,
  };
}

export type CentreReport = Awaited<ReturnType<typeof buildCentreReport>>;
