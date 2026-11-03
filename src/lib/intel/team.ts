import { db } from "@/lib/db";
import { TEAM_META } from "@/lib/auth";
import { safeParse } from "@/lib/api-utils";
import { type KpiMetric } from "@/lib/kpi";
import { teamPeriodTargets, teamDept, cumulativeKpiRows, type KpiRowDef, type RosterMember } from "@/lib/kpi-summary";
import { resolveKpiCatalogue, type ResolvedKpiConfig } from "@/lib/kpi-resolve";
import { SOCIAL_TEMPLATE_KPIS, TECH_SUMMARY_METRICS } from "@/lib/template-config";
import {
  loadUsers, loadReports, loadTasks, loadEscalations, loadLogins, loadActivityEvents,
  previousPeriod, centreLabelOf, iso, type IntelPeriod, type IntelReportRow,
} from "./data";
import { loadMemberOverrides, expectedReportDays } from "./kpi-analysis";
import { analyseKpiRows, KPI_STATUS_LABELS, type KpiTargetActual } from "./scoring";
import { agentCore, rankable, weeklyTrend, type AgentCore } from "./analyze";
import { aiCommentary } from "./ai";
import type { DataAvailabilityNote, IntelFinding, IntelKpiRow } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TEAM OPERATIONAL PERFORMANCE REPORT (sections A–G of the brief).
// Team count-KPI targets follow the roster method aggregated per agent:
// Σ each agent's effective daily target × the days THAT AGENT submitted, so
// the team target is the roll-up of the per-agent targets; reporting
// compliance (scheduled vs submitted agent-days) is reported separately.
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function buildTeamReport(opts: { team: string | null; teamLeadId: string | null; country: string | null; state: string | null; period: IntelPeriod }) {
  let { team, country, state } = opts;
  const { period } = opts;

  // Resolve the team from a team lead when given (lead → their team + centre).
  let lead: { id: string; fullName: string; email: string; team: string | null; country: string | null; state: string | null; status: string; createdAt: Date; workDays: string; department: string; role: string; employeeId: string | null } | null = null;
  if (opts.teamLeadId) {
    const u = await db.user.findUnique({ where: { id: opts.teamLeadId } });
    if (!u || u.role !== "TEAM_LEAD") return { error: "Team lead not found" as const };
    lead = u;
    team = u.team;
    country = u.country;
    state = u.state;
  }
  if (!team || !TEAM_META[team]) return { error: "A valid team (or a team lead) is required" as const };

  const prev = previousPeriod(period);
  const dept = teamDept(team);

  // ── Roster: agents of the team (leads handled separately) ──
  const rosterWhere: Record<string, unknown> = { team, role: { in: ["AGENT_BPO", "SOCIAL_MEDIA", "DEVELOPER"] }, status: { not: "REJECTED" } };
  if (country) rosterWhere.country = country;
  if (state) rosterWhere.state = state;
  const roster = await db.user.findMany({
    where: rosterWhere,
    select: { id: true, fullName: true, email: true, role: true, department: true, team: true, employeeId: true, country: true, state: true, status: true, employmentType: true, workDays: true, shiftStart: true, shiftEnd: true, createdAt: true },
    orderBy: { fullName: "asc" },
    take: 500,
  });

  // Team lead(s) of this team+centre
  const leadWhere: Record<string, unknown> = { team, role: "TEAM_LEAD", status: "APPROVED" };
  if (country) leadWhere.country = country;
  if (state) leadWhere.state = state;
  const leads = await db.user.findMany({ where: leadWhere, select: { id: true, fullName: true, email: true, team: true, country: true, state: true, status: true, createdAt: true, workDays: true, department: true, role: true, employeeId: true } });
  const primaryLead = lead ?? leads[0] ?? null;

  // Supervisors covering the centre
  const supWhere: Record<string, unknown> = { role: "SUPERVISOR", status: "APPROVED" };
  if (country) supWhere.country = country;
  if (state) supWhere.state = state;
  const supervisors = await db.user.findMany({ where: supWhere, select: { id: true, fullName: true, country: true, state: true } });

  const ids = roster.map((u) => u.id);
  const [catalogue, overridesAll, reports, prevReports, tasks, escalations, logins, events] = await Promise.all([
    resolveKpiCatalogue(country && state ? { country, state } : null),
    loadMemberOverrides(ids),
    loadReports(ids, period),
    loadReports(ids, prev),
    loadTasks(ids, period),
    loadEscalations(ids, period),
    loadLogins(ids, period),
    loadActivityEvents(ids, period),
  ]);

  // ── A. Team overview ──
  const active = roster.filter((u) => u.status === "APPROVED");
  const inactive = roster.filter((u) => u.status !== "APPROVED");
  const submitted = reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
  const tasksStats = (await import("./data")).taskStats(tasks, period);
  const scheduledDayCount = active.reduce((s, u) => s + expectedReportDays(u, period), 0);
  const submittedDayCount = new Set(submitted.map((r) => `${r.userId}:${iso(new Date(r.reportDate))}`)).size;
  const teamCompliancePct = scheduledDayCount > 0 ? round2((submittedDayCount / scheduledDayCount) * 100) : null;

  // Team KPI rows (roster method over the whole team)
  const teamKpiRows = await teamKpiAnalysis(team, active, reports, catalogue, overridesAll, period);

  // ── Per-member cores (same engine as the individual report) ──
  const reportsByUser = groupBy(reports, (r) => r.userId);
  const tasksByUser = new Map<string, typeof tasks>();
  const loginsByUser = groupBy(logins, (l) => l.userId);
  const eventsByUser = groupBy(events, (e) => e.userId);
  const escByUser = groupBy(escalations, (e) => e.fromId);
  const cores: AgentCore[] = [];
  for (const u of active) {
    cores.push(await agentCore(u, period, {
      reports: reportsByUser.get(u.id) ?? [],
      tasks: tasks, // taskStats filters per user
      escalations: escByUser.get(u.id) ?? [],
      logins: loginsByUser.get(u.id) ?? [],
      events: eventsByUser.get(u.id) ?? [],
      catalogue,
      overrides: overridesAll.get(u.id),
      weights: undefined,
      prevPeriod: prev,
      prevReports: prevReports.filter((r) => r.userId === u.id),
    }));
  }

  // ── B. Agent performance ranking ──
  const ranked = [...cores].sort((a, b) => (b.score.score ?? -1) - (a.score.score ?? -1));
  // Callouts come from the SORTED ranking restricted to comparable scores —
  // never from roster order, or "highest performer" would be whoever sorts
  // first alphabetically.
  const rankableRanked = ranked.filter((c) => rankable(c.score));
  const highest = rankableRanked[0] ?? null;
  const lowest = rankableRanked.length > 1 ? rankableRanked[rankableRanked.length - 1] : null;
  const mostCompleted = [...cores].sort((a, b) => b.tasks.completed - a.tasks.completed)[0] ?? null;
  const mostOverdue = [...cores].sort((a, b) => b.tasks.overdue - a.tasks.overdue)[0] ?? null;
  const punctual = [...cores].filter((c) => c.tasks.punctualityPct !== null).sort((a, b) => (b.tasks.punctualityPct as number) - (a.tasks.punctualityPct as number))[0] ?? null;
  const mostActive = [...cores].sort((a, b) => b.activity.meaningfulWorkDays - a.activity.meaningfulWorkDays)[0] ?? null;
  const leastActive = cores.length > 1 ? [...cores].sort((a, b) => a.activity.meaningfulWorkDays - b.activity.meaningfulWorkDays)[0] ?? null : null;
  const mostSubmissions = [...cores].sort((a, b) => new Set(a.submittedDates).size - new Set(b.submittedDates).size)[0] ?? null;

  // ── C. Team KPI comparison (per-agent × per-KPI achievement grid) ──
  const kpiKeys = teamKpiRows.map((r) => ({ key: r.key, label: r.label }));
  const grid = cores.map((c) => ({
    agent: c.user.fullName,
    agentId: c.user.id,
    meanAchPct: c.kpi.meanAchPct,
    scores: kpiKeys.map((k) => {
      const row = c.kpiRows.find((r) => r.key === k.key);
      return { key: k.key, achievementPct: row?.achievementPct ?? null, status: row?.status ?? "INSUFFICIENT_DATA" };
    }),
    strongest: strongestLabel(c.kpiRows),
    weakest: weakestLabel(c.kpiRows),
  }));
  const teamAvgByKey = kpiKeys.map((k) => {
    const vals = grid.map((g) => g.scores.find((s) => s.key === k.key)?.achievementPct).filter((v): v is number => v !== null);
    return { key: k.key, label: k.label, teamAvg: vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null, row: teamKpiRows.find((r) => r.key === k.key) ?? null };
  });
  const strongKpis = teamAvgByKey.filter((k) => (k.teamAvg ?? 0) >= 80 && k.row?.actual !== null);
  const weakKpis = teamAvgByKey.filter((k) => k.teamAvg !== null && k.teamAvg < 80);
  const aboveAvg = grid.filter((g) => g.meanAchPct !== null && teamAvgMean(teamAvgByKey) !== null && (g.meanAchPct as number) >= (teamAvgMean(teamAvgByKey) as number));
  const belowAvg = grid.filter((g) => g.meanAchPct !== null && teamAvgMean(teamAvgByKey) !== null && (g.meanAchPct as number) < (teamAvgMean(teamAvgByKey) as number));

  // ── D. Team productivity & application usage ──
  const usage = cores.map((c) => ({
    agent: c.user.fullName,
    agentId: c.user.id,
    logins: c.activity.logins,
    activeDays: c.activity.activeDays,
    meaningfulWorkDays: c.activity.meaningfulWorkDays,
    meaningfulEvents: c.activity.meaningfulEvents,
    reportsSubmitted: c.activity.reportsSubmitted,
    tasksCompleted: c.tasks.completed,
    tasksOverdue: c.tasks.overdue,
    escalationsRaised: c.activity.escalationsRaised,
    lastActivityAt: c.activity.lastActivityAt,
  }));

  // ── E. Team strengths / weaknesses / risks ──
  const strengths: IntelFinding[] = [];
  const weaknesses: IntelFinding[] = [];
  const risks: IntelFinding[] = [];
  const teamMeanAch = teamAvgMean(teamAvgByKey);
  if (teamMeanAch !== null && teamMeanAch >= 80) strengths.push({ title: "Team KPI achievement at or above bar", evidence: `Mean per-agent KPI achievement ${teamMeanAch}%; ${strongKpis.length} KPI(s) averaging ≥80%.` });
  if (strongKpis.length) strengths.push({ title: `Strongest KPIs: ${strongKpis.slice(0, 3).map((k) => k.label).join(", ")}`, evidence: strongKpis.slice(0, 3).map((k) => `${k.label} team average ${k.teamAvg}%`).join("; ") + "." });
  if (tasksStats.completionRatePct !== null && tasksStats.completionRatePct >= 80) strengths.push({ title: "Reliable task delivery", evidence: `${tasksStats.completed}/${tasksStats.assigned} tasks completed (${tasksStats.completionRatePct}%).` });
  if (teamCompliancePct !== null && teamCompliancePct >= 90) strengths.push({ title: "Consistent daily reporting", evidence: `${submittedDayCount} agent-day submissions against ${scheduledDayCount} scheduled agent-days (${teamCompliancePct}%).` });
  if (teamMeanAch !== null && teamMeanAch < 80) weaknesses.push({ title: "Team KPI achievement below the bar", evidence: `Mean per-agent KPI achievement ${teamMeanAch}%; ${weakKpis.length} KPI(s) averaging below 80%.` });
  if (weakKpis.length) weaknesses.push({ title: `Problem KPIs: ${weakKpis.slice(0, 3).map((k) => k.label).join(", ")}`, evidence: weakKpis.slice(0, 3).map((k) => `${k.label} team average ${k.teamAvg}%`).join("; ") + "." });
  if (tasksStats.overdue > 0) weaknesses.push({ title: "Overdue tasks in the team", evidence: `${tasksStats.overdue} task(s) past deadline and not completed.` });
  if (teamCompliancePct !== null && teamCompliancePct < 70) weaknesses.push({ title: "Reporting compliance gap", evidence: `${submittedDayCount}/${scheduledDayCount} scheduled agent-days covered (${teamCompliancePct}%).` });
  if (cores.some((c) => c.tasks.overdue >= 3)) risks.push({ title: "Agents with repeated overdue tasks", evidence: cores.filter((c) => c.tasks.overdue >= 3).map((c) => `${c.user.fullName}: ${c.tasks.overdue} overdue`).join("; ") + "." });
  if (cores.some((c) => c.activity.meaningfulWorkDays === 0 && c.activity.logins > 0)) risks.push({ title: "Logins without recorded work", evidence: cores.filter((c) => c.activity.meaningfulWorkDays === 0 && c.activity.logins > 0).map((c) => c.user.fullName).join(", ") + " — logged in but no meaningful activity recorded." });

  // ── F. Team Lead performance (recorded activities only) ──
  const leadAnalysis = primaryLead ? await leadPerformance(primaryLead, { team, country, state }, period, reports, tasks, escalations) : null;

  // ── G. Recommendations (AI via Gemini, rule-based fallback) ──
  const commentary = await aiCommentary(
    `${TEAM_META[team]?.label ?? team} team${country && state ? ` (${state}, ${country})` : ""}`,
    {
      period: period.label, rosterSize: roster.length, activeAgents: active.length,
      teamMeanKpiAchPct: teamMeanAch, teamKpiRows: teamKpiRows.map((r) => ({ label: r.label, target: r.target, actual: r.actual, achPct: r.achievementPct })),
      tasks: tasksStats, reportingCompliancePct: teamCompliancePct,
      topPerformer: highest ? { name: highest.user.fullName, score: highest.score.score } : null,
      lowestPerformer: lowest ? { name: lowest.user.fullName, score: lowest.score.score } : null,
    },
    strengths, weaknesses, risks,
  );

  const notes: DataAvailabilityNote[] = [
    { metric: "Team Lead coaching / support activities", note: leadAnalysis?.notes ?? "Only recorded application activities are analysed (reports filed, tasks assigned, escalations handled)." },
    { metric: "Team KPI trend across the period", note: reports.length < 4 ? "Insufficient historical data to establish a reliable performance trend." : "Weekly buckets shown in the historical trend sheet." },
  ];
  if (!cores.some((c) => c.attendance.available)) notes.push({ metric: "Attendance", note: "No attendance records in the period for this team — attendance is only recorded via daily report blocks." });

  return {
    reportType: "team" as const,
    generatedAt: new Date().toISOString(),
    period,
    team: { key: team, label: TEAM_META[team]?.label ?? team, department: TEAM_META[team]?.department ?? dept, centre: country && state ? `${state}, ${country}` : "All centres" },
    overview: {
      totalRegistered: roster.length,
      activeAgents: active.length,
      inactive: inactive.length,
      teamLead: primaryLead ? { id: primaryLead.id, name: primaryLead.fullName } : null,
      allLeads: leads.map((l) => l.fullName),
      supervisors: supervisors.map((s) => ({ id: s.id, name: s.fullName, centre: centreLabelOf(s) })),
      tasks: tasksStats,
      teamKpiRows,
      meanAgentScore: rankableRanked.length ? round2(rankableRanked.reduce((s, c) => s + (c.score.score as number), 0) / rankableRanked.length) : null,
      reportingCompliancePct: teamCompliancePct,
      scheduledAgentDays: scheduledDayCount,
      submittedAgentDays: submittedDayCount,
      appActivity: { logins: logins.length, meaningfulEvents: events.filter((e) => e.eventType !== "LOGIN").length, activeAgents: cores.filter((c) => c.activity.meaningfulWorkDays > 0).length },
      trend: weeklyTrend(reports, period),
    },
    ranking: {
      ranked: cores.map((c, i) => ({
        position: rankable(c.score) ? ranked.findIndex((r) => r.user.id === c.user.id) + 1 : null,
        agent: c.user.fullName,
        agentId: c.user.id,
        score: c.score.score,
        classification: c.score.classification,
        coverageNote: c.score.includedWeights < 100 ? `${c.score.includedWeights}/100 weight points` : null,
        meanKpiAchPct: c.kpi.meanAchPct,
        tasksCompleted: c.tasks.completed,
        tasksOverdue: c.tasks.overdue,
        punctualityPct: c.tasks.punctualityPct,
        meaningfulWorkDays: c.activity.meaningfulWorkDays,
        submittedDays: new Set(c.submittedDates).size,
      })),
      callouts: {
        highest: highest ? { name: highest.user.fullName, score: highest.score.score, why: `Overall score ${highest.score.score} — KPI ${highest.kpi.meanAchPct ?? "n/a"}%, tasks ${highest.tasks.completed}/${highest.tasks.assigned}` } : null,
        lowest: lowest ? { name: lowest.user.fullName, score: lowest.score.score, why: `Overall score ${lowest.score.score} — KPI ${lowest.kpi.meanAchPct ?? "n/a"}%, ${lowest.tasks.overdue} overdue task(s)` } : null,
        mostCompleted: mostCompleted ? { name: mostCompleted.user.fullName, tasksCompleted: mostCompleted.tasks.completed } : null,
        mostOverdue: mostOverdue && mostOverdue.tasks.overdue > 0 ? { name: mostOverdue.user.fullName, overdue: mostOverdue.tasks.overdue } : null,
        bestPunctuality: punctual ? { name: punctual.user.fullName, punctualityPct: punctual.tasks.punctualityPct } : null,
        mostActiveApp: mostActive ? { name: mostActive.user.fullName, meaningfulWorkDays: mostActive.activity.meaningfulWorkDays, note: "Application activity ≠ productivity — see task figures for output." } : null,
        leastActiveApp: leastActive ? { name: leastActive.user.fullName, meaningfulWorkDays: leastActive.activity.meaningfulWorkDays } : null,
        mostConsistentSubmissions: mostSubmissions ? { name: mostSubmissions.user.fullName, submittedDays: new Set(mostSubmissions.submittedDates).size } : null,
      },
    },
    kpiComparison: { teamAverages: teamAvgByKey, grid, aboveTeamAverage: aboveAvg.map((g) => g.agent), belowTeamAverage: belowAvg.map((g) => g.agent) },
    productivity: { usage, mostActive: mostActive?.user.fullName ?? null, leastActive: leastActive?.user.fullName ?? null },
    strengths, weaknesses, risks,
    teamLead: leadAnalysis,
    assessment: { commentary },
    dataNotes: notes,
  };
}

export type TeamReport = Awaited<ReturnType<typeof buildTeamReport>>;

// ── helpers ──

function groupBy<T>(rows: T[], keyFn: (r: T) => string | null | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return map;
}

function strongestLabel(rows: IntelKpiRow[]): string | null {
  const withAch = rows.filter((r) => r.achievementPct !== null).sort((a, b) => (b.achievementPct as number) - (a.achievementPct as number));
  return withAch[0]?.label ?? null;
}
function weakestLabel(rows: IntelKpiRow[]): string | null {
  const withAch = rows.filter((r) => r.achievementPct !== null).sort((a, b) => (a.achievementPct as number) - (b.achievementPct as number));
  return withAch[0]?.label ?? null;
}
function teamAvgMean(rows: { teamAvg: number | null }[]): number | null {
  const vals = rows.map((r) => r.teamAvg).filter((v): v is number => v !== null);
  return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
}

/** Team-level KPI rows — roster-method targets + summed actuals (also used by the centre report). */
export async function teamKpiAnalysis(
  team: string,
  members: { id: string; team: string | null; workDays: string }[],
  reports: IntelReportRow[],
  catalogue: ResolvedKpiConfig[],
  overridesAll: Map<string, Map<string, number>>,
  period: IntelPeriod,
): Promise<IntelKpiRow[]> {
  const dept = teamDept(team);
  const configured = catalogue.filter((c) => c.active && c.department === dept);
  const deptRows: KpiRowDef[] = configured.length
    ? configured.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ key: c.key, label: c.label, unit: (c.unit === "percent" || c.unit === "minutes" ? c.unit : "count") as KpiRowDef["unit"], category: "DEPT_CATALOGUE", target: c.defaultTarget, sortOrder: c.sortOrder }))
    : dept === "SOCIAL_MEDIA"
      ? SOCIAL_TEMPLATE_KPIS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, category: "SOCIAL_TEMPLATE", target: null, sortOrder: i }))
      : dept === "WEB_DEV"
        ? TECH_SUMMARY_METRICS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, category: "TECH_TEMPLATE", target: null, sortOrder: i }))
        : [];
  if (!deptRows.length || !members.length) return [];

  const submitted = reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
  const dates = [...new Set(submitted.map((r) => iso(new Date(r.reportDate))))].sort();
  if (!dates.length) return [];

  const rosterMembers: RosterMember[] = members.map((m) => ({ id: m.id, team: m.team, workDays: m.workDays, overrides: overridesAll.get(m.id) }));
  // Roster method, aggregated per agent: each agent's effective daily target
  // accrues on the days THAT AGENT actually submitted (team target = Σ agent
  // targets), so the team achievement is the direct roll-up of the same
  // per-member grades the individual reports show. Reporting compliance (the
  // gap between scheduled and submitted agent-days) is reported separately.
  interface TAcc { target: number; agents: number; agentDays: number; uniform: number | null; mixed: boolean }
  const accs = new Map<string, TAcc>();
  for (const m of rosterMembers) {
    const ownDates = [...new Set(submitted.filter((r) => r.userId === m.id).map((r) => iso(new Date(r.reportDate))))].sort();
    if (!ownDates.length) continue;
    const mTargets = teamPeriodTargets([m], new Map([[dept, deptRows]]), ownDates);
    for (const [key, v] of mTargets) {
      const days = ownDates.length;
      const daily = days > 0 ? v.target / days : 0;
      const acc = accs.get(key);
      if (!acc) {
        accs.set(key, { target: v.target, agents: 1, agentDays: days, uniform: daily, mixed: false });
        continue;
      }
      acc.target += v.target;
      acc.agents += 1;
      acc.agentDays += days;
      if (acc.uniform !== null && acc.uniform !== daily) { acc.mixed = true; acc.uniform = null; }
    }
  }
  const periodTargets = new Map<string, { target: number; label: string }>();
  for (const [key, acc] of accs) {
    const label = !acc.mixed && acc.uniform !== null
      ? `${Math.round(acc.uniform * 100) / 100}/agent × ${acc.agents} agent${acc.agents === 1 ? "" : "s"} × ${acc.agentDays} agent-day${acc.agentDays === 1 ? "" : "s"}`
      : `roster total across ${acc.agents} agent${acc.agents === 1 ? "" : "s"}`;
    periodTargets.set(key, { target: round2(acc.target), label });
  }
  const targets = new Map<string, number | null>();
  for (const row of deptRows) if (!targets.has(row.key)) targets.set(row.key, row.target);

  const blobs = submitted.map((r) => {
    const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []).filter((m) => m?.key);
    const seen = new Set(metrics.map((m) => m.key));
    if (r.metricsSummary) {
      const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
      for (const [k, v] of Object.entries(ms)) {
        if (typeof v !== "number" || Number.isNaN(v) || seen.has(k)) continue;
        const def = deptRows.find((d) => d.key === k);
        metrics.push({ key: k, label: def?.label ?? k, target: null, targetLabel: "-", actual: v, variance: null, unit: (def?.unit as KpiMetric["unit"]) ?? "count", category: "INTEL_SUMMARY", auto: false, notes: "" });
      }
    }
    return JSON.stringify(metrics);
  });

  const rows = cumulativeKpiRows(blobs, dates.length, targets, deptRows, periodTargets).filter((r) => r.actual !== null || r.target !== null);
  const directionByKey = new Map(catalogue.filter((c) => c.active).map((c) => [c.key, c.direction]));
  return analyseKpiRows(rows.map((r): KpiTargetActual => ({
    key: r.key, label: r.label, unit: r.unit,
    direction: directionByKey.get(r.key) ?? (r.unit === "minutes" ? "LOWER_BETTER" : "HIGHER_BETTER"),
    target: r.target, actual: r.actual,
    notes: r.target !== null ? undefined : "No target configured for this metric",
  })));
}

/** Team Lead effectiveness from RECORDED activities only. */
async function leadPerformance(
  lead: { id: string; fullName: string; team: string | null; country: string | null; state: string | null },
  scope: { team: string | null; country: string | null; state: string | null },
  period: IntelPeriod,
  teamReports: IntelReportRow[],
  teamTasks: Awaited<ReturnType<typeof loadTasks>>,
  escalations: Awaited<ReturnType<typeof loadEscalations>>,
) {
  const [ownReports, assignedTasks, resolvedEsc, messages] = await Promise.all([
    db.report.findMany({ where: { userId: lead.id, reportDate: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true, type: true, status: true, reportDate: true } }),
    db.task.findMany({ where: { createdById: lead.id, dateAssigned: { lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true, assigneeId: true, status: true } }),
    db.escalation.findMany({ where: { resolvedById: lead.id, resolvedAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true } }),
    db.escalationMessage.findMany({ where: { senderId: lead.id, createdAt: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } }, select: { id: true } }),
  ]);
  const assigneeIds = new Set(assignedTasks.map((t) => t.assigneeId).filter(Boolean) as string[]);
  const teamMemberIds = new Set(teamReports.map((r) => r.userId));
  const tasksToTeam = assignedTasks.filter((t) => t.assigneeId && teamMemberIds.has(t.assigneeId)).length;
  const teamEscalations = escalations.filter((e) => teamMemberIds.has(e.fromId));
  const openTeamEscalations = teamEscalations.filter((e) => ["OPEN", "REOPENED", "IN_PROGRESS"].includes(e.status)).length;
  void assigneeIds;
  return {
    lead: { id: lead.id, name: lead.fullName, team: lead.team },
    ownReportsSubmitted: ownReports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status)).length,
    ownReportsExpected: 0, // filled by caller if needed
    tasksAssignedToTeam: tasksToTeam,
    tasksAssignedTotal: assignedTasks.length,
    taskCompletionOfAssigned: assignedTasks.length ? round2((assignedTasks.filter((t) => t.status === "COMPLETED").length / assignedTasks.length) * 100) : null,
    escalationsResolved: resolvedEsc.length,
    escalationReplies: messages.length,
    openTeamEscalations,
    notes: null as string | null,
  };
}
