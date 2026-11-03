import { TEAM_META } from "@/lib/auth";
import {
  taskStats, attendanceStats, centreLabelOf, iso,
  type IntelPeriod, type IntelReportRow, type IntelTaskRow, type IntelEscalationRow,
} from "./data";
import { userKpiAnalysis, expectedReportDays } from "./kpi-analysis";
import { performanceScore, loadScoringWeights, meanKpiAchievement, type ScoreInputs, type ScoringWeights } from "./scoring";
import type { PerformanceScore, IntelAttendanceStats, IntelTaskStats, IntelKpiRow, TrendPoint } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Shared per-member analysis core. The individual, team and centre reports all
// grade a member through THIS function so a score in a ranking always matches
// the same member's individual report.
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberActivity {
  logins: number;
  activeDays: number;
  meaningfulWorkDays: number;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  reportsSubmitted: number;
  reportsDrafts: number;
  reportsRejected: number;
  escalationsRaised: number;
  meaningfulEvents: number;
}

export interface AgentCore {
  user: { id: string; fullName: string; email: string; role: string; department: string; team: string | null; employeeId: string | null; country: string | null; state: string | null; status: string; employmentType: string; workDays: string; createdAt: Date };
  centre: string;
  teamLabel: string | null;
  kpi: Awaited<ReturnType<typeof userKpiAnalysis>>;
  kpiRows: IntelKpiRow[];
  tasks: IntelTaskStats;
  attendance: IntelAttendanceStats;
  scheduledDays: number;
  submittedDates: string[];
  compliancePct: number | null;
  score: PerformanceScore;
  activity: MemberActivity;
  trend: TrendPoint[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CoreInputs {
  reports: IntelReportRow[];
  tasks: IntelTaskRow[];
  escalations: IntelEscalationRow[];
  logins: { userId: string; createdAt: Date }[];
  events: { eventType: string; userId: string; createdAt: Date }[];
  catalogue: Awaited<ReturnType<typeof import("@/lib/kpi-resolve").resolveKpiCatalogue>>;
  overrides?: Map<string, number>;
  weights?: ScoringWeights;
  prevPeriod?: IntelPeriod;
  prevReports?: IntelReportRow[];
}

export async function agentCore(
  user: AgentCore["user"],
  period: IntelPeriod,
  inputs: CoreInputs,
): Promise<AgentCore> {
  const weights = inputs.weights ?? (await loadScoringWeights());
  const overrides = inputs.overrides ? { map: inputs.overrides } : undefined;
  const kpi = await userKpiAnalysis(user, inputs.reports, inputs.catalogue, overrides, period);

  const tasksStats = taskStats(inputs.tasks, period, user.id);
  const attendance = attendanceStats(user, inputs.reports, period);
  const scheduledDays = expectedReportDays(user, period);
  const submittedDates = kpi.submittedDates;
  const compliancePct = scheduledDays > 0 ? round2((new Set(submittedDates).size / scheduledDays) * 100) : null;

  const scoreInputs: ScoreInputs = {
    kpiAchPct: meanKpiAchievement(kpi.rows),
    taskCompletionPct: tasksStats.completionRatePct,
    taskPunctualityPct: tasksStats.punctualityPct,
    reportingCompliancePct: compliancePct,
    attendancePct: attendance.attendancePct,
    attendanceReliable: attendance.available,
  };
  const score = performanceScore(scoreInputs, weights);

  const submitted = inputs.reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
  const loginDates = new Set(inputs.logins.map((l) => iso(new Date(l.createdAt))));
  const meaningfulDates = new Set<string>([
    ...submitted.map((r) => iso(new Date(r.reportDate))),
    ...inputs.events.filter((e) => e.userId === user.id && e.eventType !== "LOGIN").map((e) => iso(new Date(e.createdAt))),
  ]);
  const loginsSorted = [...inputs.logins].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const eventDates = inputs.events.filter((e) => e.userId === user.id).map((e) => new Date(e.createdAt).getTime());
  const reportDates = inputs.reports.map((r) => new Date(r.updatedAt).getTime());
  const lastActivityTs = [...eventDates, ...reportDates].sort((a, b) => a - b).pop();

  const activity: MemberActivity = {
    logins: inputs.logins.length,
    activeDays: new Set([...loginDates, ...meaningfulDates]).size,
    meaningfulWorkDays: meaningfulDates.size,
    lastLoginAt: loginsSorted.length ? new Date(loginsSorted[loginsSorted.length - 1].createdAt).toISOString() : null,
    lastActivityAt: lastActivityTs ? new Date(lastActivityTs).toISOString() : null,
    reportsSubmitted: submitted.length,
    reportsDrafts: inputs.reports.filter((r) => r.status === "DRAFT").length,
    reportsRejected: inputs.reports.filter((r) => r.status === "REJECTED").length,
    escalationsRaised: inputs.escalations.filter((e) => e.fromId === user.id).length,
    meaningfulEvents: inputs.events.filter((e) => e.userId === user.id && e.eventType !== "LOGIN").length,
  };

  return {
    user,
    centre: centreLabelOf(user),
    teamLabel: user.team ? TEAM_META[user.team]?.label ?? user.team : null,
    kpi,
    kpiRows: kpi.rows,
    tasks: tasksStats,
    attendance,
    scheduledDays,
    submittedDates,
    compliancePct,
    score,
    activity,
    trend: weeklyTrend(inputs.reports, period),
  };
}

/** Weekly submitted-report trend across the period (max 26 buckets). */
export function weeklyTrend(reports: IntelReportRow[], period: IntelPeriod): TrendPoint[] {
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
      submitted: reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status) && inBucket(new Date(r.reportDate).getTime())).length || null,
      kpiPct: null,
      tasksCompleted: null,
    });
  }
  return points;
}

/** Is a score comparable for ranking? Requires ≥50 of 100 weight points. */
export function rankable(score: PerformanceScore): boolean {
  return score.score !== null && score.includedWeights >= 50;
}
