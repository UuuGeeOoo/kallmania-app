import { db } from "@/lib/db";
import { TEAM_META } from "@/lib/auth";
import { resolveKpiCatalogue } from "@/lib/kpi-resolve";
import {
  loadUsers, loadReports, loadTasks, loadEscalations, loadLogins, loadActivityEvents,
  taskStats, attendanceStats, groupByUser, centreLabelOf, previousPeriod, iso,
  type IntelPeriod, type IntelReportRow,
} from "./data";
import { userKpiAnalysis, loadMemberOverrides, expectedReportDays } from "./kpi-analysis";
import { agentCumulativeView, agentTechTaskView, collectWorkCompleted } from "./kpi-engine-views";
import { performanceScore, loadScoringWeights, meanKpiAchievement, KPI_STATUS_LABELS, type ScoreInputs } from "./scoring";
import { aiCommentary } from "./ai";
import type { DataAvailabilityNote, IntelFinding, IntelKpiRow, PerformanceScore, TrendPoint } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL AGENT OPERATIONAL REPORT (sections A–H of the brief).
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;
const pctOr = (n: number | null) => (n === null ? null : round2(n));


export async function buildAgentReport(userId: string, period: IntelPeriod) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Agent not found" as const };
  const prev = previousPeriod(period);
  const [catalogue, overridesAll, weights] = await Promise.all([
    resolveKpiCatalogue(user.country && user.state ? { country: user.country, state: user.state } : null),
    loadMemberOverrides([user.id]),
    loadScoringWeights(),
  ]);

  const [reports, prevReports, tasks, prevTasks, escalations, logins, prevLogins, events] = await Promise.all([
    loadReports([user.id], period),
    loadReports([user.id], prev),
    loadTasks([user.id], period),
    loadTasks([user.id], prev),
    loadEscalations([user.id], period),
    loadLogins([user.id], period),
    loadLogins([user.id], prev),
    loadActivityEvents([user.id], period),
  ]);

  // ── A. Profile & employment ──
  const profile = {
    fullName: user.fullName,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    roleLabel: TEAM_META[user.team ?? ""]?.label ? `${user.role === "TEAM_LEAD" ? "Team Lead — " : ""}${TEAM_META[user.team ?? ""].label}` : user.role,
    department: user.department,
    team: user.team,
    teamLabel: user.team ? TEAM_META[user.team]?.label ?? user.team : null,
    centre: centreLabelOf(user),
    country: user.country,
    state: user.state,
    city: user.city,
    accountStatus: user.status,
    employmentType: user.employmentType,
    workDays: user.workDays,
    shift: `${user.shiftStart}–${user.shiftEnd}`,
    dateJoined: iso(new Date(user.createdAt)),
    reportingPeriod: period.label,
    daysWithRecordedActivity: new Set([
      ...reports.map((r) => iso(new Date(r.reportDate))),
      ...events.map((e) => iso(new Date(e.createdAt))),
      ...logins.map((l) => iso(new Date(l.createdAt))),
    ]).size,
  };

  // ── B. KPI performance analysis ──
  const overrides = overridesAll.get(user.id);
  const kpi = await userKpiAnalysis(user, reports, catalogue, overrides ? { map: overrides } : undefined, period);
  const kpiPrev = await userKpiAnalysis(user, prevReports, catalogue, overrides ? { map: overrides } : undefined, prev);
  const prevByKey = new Map(kpiPrev.rows.map((r) => [r.key, r.achievementPct]));
  const kpiWithTrend: (IntelKpiRow & { trend: "improving" | "declining" | "stable" | "new" | "no_history"; trendDeltaPct: number | null })[] =
    kpi.rows.map((r) => {
      const p = prevByKey.get(r.key) ?? null;
      const trendDeltaPct = p !== null && r.achievementPct !== null ? round2(r.achievementPct - p) : null;
      return {
        ...r,
        trend: p === null ? (r.achievementPct === null ? "no_history" : "new") : trendDeltaPct === null ? "no_history" : trendDeltaPct > 5 ? "improving" : trendDeltaPct < -5 ? "declining" : "stable",
        trendDeltaPct,
      };
    });

  // ── B2. Cumulative KPI records — the engine view over the SAME normalized
  // records the dashboards use (§9 single source of truth). Sum-based
  // cumulative math, missing-day flags, per-day evidence.
  const cumulativeView = await agentCumulativeView(user, period);
  const isTechTeam = user.team === "TECH";
  const techView = isTechTeam ? await agentTechTaskView(user.id, reports, period) : null;
  const workCompleted = collectWorkCompleted(reports.map((r) => ({ ref: r.ref, reportDate: new Date(r.reportDate), status: r.status, workEntries: r.workEntries })));

  // ── C. Best & weakest KPI identification ──
  const withAch = kpiWithTrend.filter((r) => r.achievementPct !== null);
  const sorted = [...withAch].sort((a, b) => (b.achievementPct as number) - (a.achievementPct as number));
  const strongest = sorted[0] ?? null;
  const weakest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  const biggestNegativeVariance = [...kpiWithTrend].filter((r) => r.variance !== null && r.variance < 0).sort((a, b) => (a.variance as number) - (b.variance as number))[0] ?? null;
  const greatestImprovement = [...kpiWithTrend].filter((r) => r.trendDeltaPct !== null).sort((a, b) => (b.trendDeltaPct as number) - (a.trendDeltaPct as number))[0] ?? null;
  const greatestDecline = [...kpiWithTrend].filter((r) => r.trendDeltaPct !== null).sort((a, b) => (a.trendDeltaPct as number) - (b.trendDeltaPct as number))[0] ?? null;
  const mostConsistent = [...kpiWithTrend].filter((r) => r.trend === "stable").sort((a, b) => (b.achievementPct as number ?? 0) - (a.achievementPct as number ?? 0))[0] ?? null;
  const needsAttention = kpiWithTrend.filter((r) => r.status === "CRITICAL" || r.status === "BELOW" || r.trend === "declining");

  // ── D. Application usage & activity ──
  const submittedReports = reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
  const drafts = reports.filter((r) => r.status === "DRAFT");
  const rejected = reports.filter((r) => r.status === "REJECTED");
  const eventsByType = new Map<string, number>();
  for (const e of events) eventsByType.set(e.eventType, (eventsByType.get(e.eventType) ?? 0) + 1);
  const loginDates = new Set(logins.map((l) => iso(new Date(l.createdAt))));
  const meaningfulDates = new Set<string>([
    ...submittedReports.map((r) => iso(new Date(r.reportDate))),
    ...events.filter((e) => e.eventType !== "LOGIN").map((e) => iso(new Date(e.createdAt))),
  ]);
  const lastLogin = logins.length ? logins.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt : null;
  const firstActivity = reports.length && reports[0].reportDate && reports[0].createdAt ? reports.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt : events.length ? events[0].createdAt : null;
  const lastActivity = (() => {
    const candidates = [...reports.map((r) => r.updatedAt), ...events.map((e) => e.createdAt)];
    return candidates.length ? candidates.reduce((a, b) => (a > b ? a : b)) : null;
  })();
  const escalationReplies = eventsByType.get("ESCALATION_REPLIED") ?? 0;
  const activity = {
    successfulLogins: logins.length,
    prevLogins: prevLogins.length,
    lastLoginAt: lastLogin ? new Date(lastLogin).toISOString() : null,
    firstRecordedActivity: firstActivity ? new Date(firstActivity).toISOString() : null,
    mostRecentActivity: lastActivity ? new Date(lastActivity).toISOString() : null,
    activeDays: new Set([...loginDates, ...meaningfulDates]).size,
    meaningfulWorkDays: meaningfulDates.size,
    reportsCreated: reports.length,
    reportsSubmitted: submittedReports.length,
    reportsRejected: rejected.length,
    draftsSaved: drafts.length,
    draftsResumedAndSubmitted: eventsByType.get("REPORT_SUBMITTED") ?? 0,
    taskStatusUpdates: eventsByType.get("TASK_STATUS_CHANGED") ?? 0,
    tasksCompletedEvents: eventsByType.get("TASK_COMPLETED") ?? 0,
    escalationsRaised: escalations.filter((e) => e.fromId === user.id).length,
    escalationReplies,
    announcementsAcknowledged: null as number | null, // not tracked
    activityTrend: weeklyActivityTrend(events, logins, submittedReports, period),
    loginWorkGapNote: null as string | null,
  };
  // Login vs meaningful work — a login is authentication, not productivity.
  const productivityShare = activity.successfulLogins > 0 ? round2((meaningfulDates.size / Math.max(1, activity.activeDays)) * 100) : null;

  // ── E. Task management ──
  const tasksStats = taskStats(tasks, period, user.id);
  const prevTasksStats = taskStats(prevTasks, prev, user.id);

  // ── F. Attendance ──
  const attendance = attendanceStats(user, reports, period);

  // ── G. Strengths & weaknesses (evidence-based) ──
  const strengths: IntelFinding[] = [];
  const weaknesses: IntelFinding[] = [];
  const risks: IntelFinding[] = [];

  if (kpi.meanAchPct !== null && kpi.meanAchPct >= 80)
    strengths.push({ title: "KPI targets met overall", evidence: `Mean KPI achievement ${kpi.meanAchPct}% across ${withAch.length} measured KPI(s) — ${kpi.exceeded} exceeded, ${kpi.met} met.` });
  if (strongest && (strongest.achievementPct as number) >= 100)
    strengths.push({ title: `Strongest KPI: ${strongest.label}`, evidence: `${strongest.actual} vs target ${strongest.target} (${strongest.achievementPct}%).` });
  if (greatestImprovement && (greatestImprovement.trendDeltaPct as number) > 5)
    strengths.push({ title: `Improving: ${greatestImprovement.label}`, evidence: `Achievement rose ${greatestImprovement.trendDeltaPct} pts vs the previous period (${prev.label}).` });
  if (tasksStats.assigned > 0 && (tasksStats.completionRatePct ?? 0) >= 80)
    strengths.push({ title: "Reliable task completion", evidence: `${tasksStats.completed}/${tasksStats.assigned} tasks completed (${tasksStats.completionRatePct}%), ${tasksStats.completedBeforeDeadline} before deadline.` });
  if (tasksStats.punctualityPct !== null && tasksStats.punctualityPct >= 80)
    strengths.push({ title: "Consistently meets task deadlines", evidence: `${tasksStats.completedBeforeDeadline} of ${tasksStats.completedBeforeDeadline + tasksStats.completedAfterDeadline} deadline-bearing completions were on time (${tasksStats.punctualityPct}%).` });
  if (attendance.available && (attendance.attendancePct ?? 0) >= 90)
    strengths.push({ title: "Strong recorded attendance", evidence: `Present/late on ${attendance.present + attendance.late} of ${attendance.daysWithRecord} recorded day(s) (${attendance.attendancePct}%).` });
  const scheduledDays = expectedReportDays(user, period);
  const compliancePct = scheduledDays > 0 ? pctOr((new Set(kpi.submittedDates)).size / scheduledDays * 100) : null;
  if (compliancePct !== null && compliancePct >= 90)
    strengths.push({ title: "Consistent daily reporting", evidence: `Submitted on ${new Set(kpi.submittedDates).size} of ${scheduledDays} scheduled day(s) (${compliancePct}%).` });

  if (kpi.meanAchPct !== null && kpi.meanAchPct < 80)
    weaknesses.push({ title: "KPI achievement below target overall", evidence: `Mean KPI achievement ${kpi.meanAchPct}% — ${kpi.below} KPI(s) below target, ${kpi.critical} critical.` });
  if (weakest && (weakest.achievementPct as number) < 80)
    weaknesses.push({ title: `Weakest KPI: ${weakest.label}`, evidence: `${weakest.actual ?? "no data"} vs target ${weakest.target} (${weakest.achievementPct}% — ${KPI_STATUS_LABELS[weakest.status]}).` });
  if (greatestDecline && (greatestDecline.trendDeltaPct as number) < -5)
    weaknesses.push({ title: `Declining: ${greatestDecline.label}`, evidence: `Achievement fell ${Math.abs(greatestDecline.trendDeltaPct as number)} pts vs the previous period (${prev.label}).` });
  if (tasksStats.overdue > 0)
    weaknesses.push({ title: "Overdue tasks", evidence: `${tasksStats.overdue} task(s) past their deadline and not completed.` });
  if (tasksStats.punctualityPct !== null && tasksStats.punctualityPct < 60)
    weaknesses.push({ title: "Frequent late task completion", evidence: `Only ${tasksStats.completedBeforeDeadline} of ${tasksStats.completedBeforeDeadline + tasksStats.completedAfterDeadline} deadline-bearing completions were on time (${tasksStats.punctualityPct}%).` });
  if (compliancePct !== null && compliancePct < 70)
    weaknesses.push({ title: "Inconsistent daily reporting", evidence: `Submitted on ${new Set(kpi.submittedDates).size} of ${scheduledDays} scheduled day(s) (${compliancePct}%).` });
  if (attendance.available && (attendance.punctualityPct ?? 0) < 70 && attendance.late > 0)
    weaknesses.push({ title: "Late arrivals on record", evidence: `${attendance.late} late arrival(s) of ${attendance.daysWithRecord} recorded day(s); average lateness ${attendance.avgLatenessMins ?? 0} mins.` });
  if (activity.successfulLogins > 0 && productivityShare !== null && productivityShare < 30 && activity.meaningfulWorkDays <= 2)
    risks.push({ title: "Logins without matching work activity", evidence: `${activity.successfulLogins} login day(s) but only ${activity.meaningfulWorkDays} day(s) with meaningful recorded work in the period.` });

  // ── H. Overall assessment ──
  const scoreInputs: ScoreInputs = {
    kpiAchPct: meanKpiAchievement(kpi.rows),
    taskCompletionPct: tasksStats.completionRatePct,
    taskPunctualityPct: tasksStats.punctualityPct,
    reportingCompliancePct: compliancePct,
    attendancePct: attendance.attendancePct,
    attendanceReliable: attendance.available,
  };
  const score: PerformanceScore = performanceScore(scoreInputs, weights);
  const commentary = await aiCommentary(
    `${user.fullName} (individual agent report)`,
    {
      period: period.label, meanKpiAchievementPct: kpi.meanAchPct, kpiStatusCounts: { exceeded: kpi.exceeded, met: kpi.met, approaching: kpi.approaching, below: kpi.below, critical: kpi.critical },
      logins: activity.successfulLogins, activeDays: activity.activeDays, meaningfulWorkDays: activity.meaningfulWorkDays,
      reportsSubmitted: activity.reportsSubmitted, tasks: tasksStats, attendanceRecorded: attendance.available ? attendance : null,
      reportingCompliancePct: compliancePct,
    },
    strengths, weaknesses, risks,
  );

  const notes: DataAvailabilityNote[] = [
    { metric: "Announcements viewed / acknowledged", note: "Not currently tracked by the application." },
    { metric: "Task views", note: "Not currently tracked by the application (task status changes are tracked)." },
    { metric: "Login → first work activity gap", note: "Approximate only — based on recorded event timestamps; absence of an event is not proof of inactivity." },
  ];
  if (!attendance.available) notes.push({ metric: "Attendance", note: "No attendance records in the period — attendance is only recorded when the agent's daily report carries the attendance block. Missing records are NOT counted as absence." });
  if (kpi.distinctReportDates.length < 2) notes.push({ metric: "Performance trend", note: "Insufficient historical data to establish a reliable performance trend." });

  return {
    reportType: "agent" as const,
    generatedAt: new Date().toISOString(),
    period,
    profile,
    kpi: {
      rows: kpiWithTrend,
      submittedDates: kpi.submittedDates,
      summary: { meanAchPct: kpi.meanAchPct, exceeded: kpi.exceeded, met: kpi.met, approaching: kpi.approaching, below: kpi.below, critical: kpi.critical, insufficient: kpi.insufficient, submittedCount: kpi.submittedCount },
    },
    cumulativeKpi: cumulativeView.cumulative,
    cumulativeRecords: cumulativeView.dailyRecords,
    techTaskProfile: techView?.profile ?? null,
    workCompleted,
    bestWeakest: {
      strongest: strongest ? { label: strongest.label, why: `${strongest.actual} vs target ${strongest.target} = ${strongest.achievementPct}% (${KPI_STATUS_LABELS[strongest.status]})` } : null,
      weakest: weakest ? { label: weakest.label, why: `${weakest.actual ?? "no data"} vs target ${weakest.target} = ${weakest.achievementPct}% (${KPI_STATUS_LABELS[weakest.status]})` } : null,
      highestAchievement: strongest?.label ?? null,
      lowestAchievement: weakest?.label ?? null,
      largestNegativeVariance: biggestNegativeVariance ? { label: biggestNegativeVariance.label, variance: biggestNegativeVariance.variance } : null,
      greatestImprovement: greatestImprovement ? { label: greatestImprovement.label, deltaPct: greatestImprovement.trendDeltaPct } : null,
      greatestDecline: greatestDecline ? { label: greatestDecline.label, deltaPct: greatestDecline.trendDeltaPct } : null,
      mostConsistent: mostConsistent ? { label: mostConsistent.label, why: "Achievement stayed within ±5 pts across the two periods" } : null,
      requiringAttention: needsAttention.map((r) => ({ label: r.label, status: r.status, trend: r.trend, achievementPct: r.achievementPct })),
    },
    activity,
    tasks: { ...tasksStats, prev: { assigned: prevTasksStats.assigned, completed: prevTasksStats.completed, overdue: prevTasksStats.overdue } },
    attendance,
    strengths,
    weaknesses,
    risks,
    assessment: {
      score: score.score,
      scoreComponents: score.components,
      includedWeights: score.includedWeights,
      coverageNote: score.includedWeights < 100 ? `Score computed from ${score.includedWeights} of 100 weight points — components without data were excluded, never counted against the agent.` : null,
      classification: score.classification,
      commentary,
    },
    dataNotes: notes,
    teamContext: { team: user.team, teamLabel: user.team ? TEAM_META[user.team]?.label ?? user.team : null, centre: centreLabelOf(user) },
  };
}

export type AgentReport = Awaited<ReturnType<typeof buildAgentReport>>;

function weeklyActivityTrend(
  events: { eventType: string; createdAt: Date }[],
  logins: { userId: string; createdAt: Date }[],
  submitted: IntelReportRow[],
  period: IntelPeriod,
): TrendPoint[] {
  const MS_DAY = 86_400_000;
  const start = new Date(period.from + "T00:00:00.000Z").getTime();
  const end = new Date(period.to + "T00:00:00.000Z").getTime();
  const weeks = Math.min(26, Math.max(1, Math.ceil((end - start + MS_DAY) / (7 * MS_DAY))));
  const points: TrendPoint[] = [];
  for (let w = 0; w < weeks; w++) {
    const wStart = start + w * 7 * MS_DAY;
    const wEnd = Math.min(end, wStart + 7 * MS_DAY - 1);
    const inBucket = (t: number) => t >= wStart && t <= wEnd;
    points.push({
      label: `W${w + 1}`,
      submitted: submitted.filter((r) => inBucket(new Date(r.reportDate).getTime())).length || null,
      kpiPct: null,
      tasksCompleted: events.filter((e) => e.eventType === "TASK_COMPLETED" && inBucket(new Date(e.createdAt).getTime())).length || null,
    });
  }
  return points;
}
