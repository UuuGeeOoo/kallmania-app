import { db } from "@/lib/db";
import { TEAM_META } from "@/lib/auth";
import { worksOn } from "@/lib/schedule";
import { resolveKpiCatalogue, type ResolvedKpiConfig } from "@/lib/kpi-resolve";
import type { IntelPeriod, IntelScope, IntelTaskStats, IntelAttendanceStats } from "./types";

export type { IntelPeriod, IntelScope, IntelTaskStats, IntelAttendanceStats };

// ─────────────────────────────────────────────────────────────────────────────
// Scoped data loading for the Operational Intelligence module.
// All queries are server-side, administrator-gated, and shaped for aggregation
// (no unbounded selects). Missing data is preserved as null — never coerced.
// ─────────────────────────────────────────────────────────────────────────────

const MS_DAY = 86_400_000;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const dayStart = (s: string) => new Date(s + "T00:00:00.000Z");
export const dayEnd = (s: string) => new Date(s + "T23:59:59.999Z");

/** Reporting periods — today / this-week / this-month / last-month / this-quarter / custom. */
export function resolveIntelPeriod(params: URLSearchParams): IntelPeriod {
  const preset = params.get("period") || "this-month";
  const now = new Date();
  const today = iso(now);
  const customFrom = params.get("from");
  const customTo = params.get("to");
  if (preset === "custom" && customFrom && customTo && /^\d{4}-\d{2}-\d{2}$/.test(customFrom) && /^\d{4}-\d{2}-\d{2}$/.test(customTo) && customFrom <= customTo) {
    return { preset, from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` };
  }
  if (preset === "today") return { preset, from: today, to: today, label: `Today — ${today}` };
  if (preset === "this-week") {
    const d = dayStart(today);
    const diffToMon = (d.getUTCDay() + 6) % 7;
    const mon = new Date(d.getTime() - diffToMon * MS_DAY);
    const sun = new Date(mon.getTime() + 6 * MS_DAY);
    return { preset, from: iso(mon), to: iso(sun), label: `This week — ${iso(mon)} → ${iso(sun)}` };
  }
  if (preset === "last-month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    return { preset, from: iso(start), to: iso(end), label: `Last month — ${iso(start)} → ${iso(end)}` };
  }
  if (preset === "this-quarter") {
    const q = Math.floor(now.getUTCMonth() / 3);
    const start = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), q * 3 + 3, 0));
    return { preset, from: iso(start), to: iso(end), label: `This quarter — ${iso(start)} → ${iso(end)}` };
  }
  if (preset === "last-quarter") {
    const q = Math.floor(now.getUTCMonth() / 3);
    const start = new Date(Date.UTC(now.getUTCFullYear(), (q - 1) * 3, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 0));
    return { preset, from: iso(start), to: iso(end), label: `Last quarter — ${iso(start)} → ${iso(end)}` };
  }
  if (preset === "last-week") {
    const d = dayStart(today);
    const diffToMon = (d.getUTCDay() + 6) % 7;
    const mon = new Date(d.getTime() - (diffToMon + 7) * MS_DAY);
    const sun = new Date(mon.getTime() + 6 * MS_DAY);
    return { preset, from: iso(mon), to: iso(sun), label: `Last week — ${iso(mon)} → ${iso(sun)}` };
  }
  // default: this-month
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { preset: "this-month", from: iso(start), to: today, label: `This month — ${iso(start)} → ${today}` };
}

export function parseScope(params: URLSearchParams): IntelScope {
  const s = (k: string) => {
    const v = params.get(k);
    return v && v !== "all" && v.trim() ? v.trim() : null;
  };
  return {
    country: s("country"),
    state: s("state"),
    team: s("team"),
    agentId: s("agentId"),
    supervisorId: s("supervisorId"),
    teamLeadId: s("teamLeadId"),
    accountStatus: s("accountStatus"),
  };
}

export const teamLabel = (team: string | null | undefined) =>
  team ? TEAM_META[team]?.label ?? team : null;

export function centreLabelOf(u: { country: string | null; state: string | null }) {
  return [u.state, u.country].filter(Boolean).join(", ") || "Unassigned";
}

/** The equal-length period immediately before the given one (trend deltas). */
export function previousPeriod(p: IntelPeriod): IntelPeriod {
  const from = dayStart(p.from).getTime();
  const to = dayStart(p.to).getTime();
  const lenDays = Math.max(1, Math.round((to - from) / MS_DAY) + 1);
  const prevTo = new Date(from - MS_DAY);
  const prevFrom = new Date(prevTo.getTime() - (lenDays - 1) * MS_DAY);
  return { preset: p.preset, from: iso(prevFrom), to: iso(prevTo), label: `${iso(prevFrom)} → ${iso(prevTo)}` };
}

export interface IntelUserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  team: string | null;
  employeeId: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  status: string;
  employmentType: string;
  workDays: string;
  shiftStart: string;
  shiftEnd: string;
  createdAt: Date;
}

export interface IntelReportRow {
  id: string;
  ref: string;
  type: string;
  reportDate: Date;
  department: string;
  userId: string;
  status: string;
  shiftTime: string | null;
  clockIn: string | null;
  clockOut: string | null;
  attendanceStatus: string | null;
  latenessMins: number | null;
  kpiMetrics: string | null;
  metricsSummary: string | null;
  challenges: string | null;
  escalations: string | null;
  additionalActivities: string | null;
  workEntries: string | null;
  sourceType: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  supervisorFeedback: string | null;
  user?: { id: string; fullName: string; role: string; team: string | null; department: string; workDays: string; country: string | null; state: string | null };
}

export interface IntelTaskRow {
  id: string;
  title: string;
  department: string;
  assigneeId: string | null;
  status: string;
  priority: string;
  dateAssigned: Date;
  deadline: Date | null;
  updatedAt: Date;
  assignees?: { userId: string; status: string }[];
}

export interface IntelEscalationRow {
  id: string;
  fromId: string;
  fromName: string;
  targetUserId: string | null;
  targetRole: string | null;
  subject: string;
  status: string;
  severity: string;
  createdAt: Date;
  resolvedAt: Date | null;
  team: string | null;
}

/** Users in operational scope. Supervisors/team leads included when relevant. */
export async function loadUsers(scope: IntelScope, includeManagement = false): Promise<IntelUserRow[]> {
  const roles = includeManagement
    ? ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "TEAM_LEAD", "SUPERVISOR"]
    : ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "TEAM_LEAD"];
  const where: Record<string, unknown> = { role: { in: roles } };
  if (scope.country) where.country = scope.country;
  if (scope.state) where.state = scope.state;
  if (scope.team) where.team = scope.team;
  if (scope.accountStatus) where.status = scope.accountStatus;
  if (scope.agentId) where.id = scope.agentId;
  if (scope.teamLeadId) {
    // agents under a team lead: same team + centre as the lead
    const lead = await db.user.findUnique({ where: { id: scope.teamLeadId } });
    if (!lead) return [];
    where.team = lead.team;
    where.country = lead.country ?? undefined;
    where.state = lead.state ?? undefined;
  }
  if (scope.supervisorId) {
    const sup = await db.user.findUnique({ where: { id: scope.supervisorId } });
    if (!sup) return [];
    where.country = sup.country ?? undefined;
    where.state = sup.state ?? undefined;
  }
  const rows = await db.user.findMany({
    where,
    select: { id: true, fullName: true, email: true, role: true, department: true, team: true, employeeId: true, phone: true, country: true, state: true, city: true, status: true, employmentType: true, workDays: true, shiftStart: true, shiftEnd: true, createdAt: true },
    orderBy: [{ fullName: "asc" }],
    take: 1000,
  });
  return rows;
}

export async function loadReports(userIds: string[], period: IntelPeriod): Promise<IntelReportRow[]> {
  if (!userIds.length) return [];
  return db.report.findMany({
    where: { userId: { in: userIds }, reportDate: { gte: dayStart(period.from), lte: dayEnd(period.to) } },
    orderBy: { reportDate: "asc" },
    take: 8000,
  });
}

export async function loadTasks(userIds: string[], period: IntelPeriod): Promise<IntelTaskRow[]> {
  if (!userIds.length) return [];
  // Tasks known as of the END of the period — a task assigned before the period
  // started is still the assignee's workload and belongs in their stats (its
  // completion, punctuality and overdue state are evaluated against the period
  // end). Tasks assigned after the period ended are future work, not history.
  return db.task.findMany({
    where: {
      dateAssigned: { lte: dayEnd(period.to) },
      OR: [{ assigneeId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }],
    },
    select: { id: true, title: true, department: true, assigneeId: true, status: true, priority: true, dateAssigned: true, deadline: true, updatedAt: true, assignees: { select: { userId: true, status: true } } },
    orderBy: { dateAssigned: "asc" },
    take: 8000,
  }) as Promise<IntelTaskRow[]>;
}

export async function loadEscalations(userIds: string[], period: IntelPeriod): Promise<IntelEscalationRow[]> {
  if (!userIds.length) return [];
  return db.escalation.findMany({
    where: {
      createdAt: { gte: dayStart(period.from), lte: dayEnd(period.to) },
      OR: [{ fromId: { in: userIds } }, { targetUserId: { in: userIds } }],
    },
    select: { id: true, fromId: true, fromName: true, targetUserId: true, targetRole: true, subject: true, status: true, severity: true, createdAt: true, resolvedAt: true, team: true },
    orderBy: { createdAt: "asc" },
    take: 4000,
  });
}

/** Logins — mined from the existing audit trail (historical since day one). */
export async function loadLogins(userIds: string[], period: IntelPeriod): Promise<{ userId: string; createdAt: Date }[]> {
  if (!userIds.length) return [];
  const rows = await db.auditLog.findMany({
    where: { action: "LOGIN", userId: { in: userIds }, createdAt: { gte: dayStart(period.from), lte: dayEnd(period.to) } },
    select: { userId: true, createdAt: true },
    take: 20000,
  });
  return rows.filter((r): r is { userId: string; createdAt: Date } => r.userId !== null);
}

export async function loadActivityEvents(userIds: string[], period: IntelPeriod) {
  if (!userIds.length) return [];
  return db.activityEvent.findMany({
    where: { userId: { in: userIds }, createdAt: { gte: dayStart(period.from), lte: dayEnd(period.to) } },
    select: { id: true, userId: true, eventType: true, relatedType: true, relatedId: true, team: true, centreCountry: true, centreState: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 20000,
  });
}

export async function loadCatalogue(centre: { country: string | null; state: string | null } | null): Promise<ResolvedKpiConfig[]> {
  return resolveKpiCatalogue(centre && centre.country && centre.state ? centre : null);
}

// ── Task statistics ──────────────────────────────────────────────────────────

const OPEN_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "PENDING_DEPLOYMENT", "AWAITING_APPROVAL", "UNDER_REVIEW"];

/** Task statistics. `forUserId` scopes multi-assignee rows to one member —
 *  the member's own TaskAssignee status wins over the task-level status. */
export function taskStats(tasks: IntelTaskRow[], period: IntelPeriod, forUserId?: string): IntelTaskStats {
  const mine = forUserId
    ? tasks.filter((t) => t.assigneeId === forUserId || t.assignees?.some((a) => a.userId === forUserId))
    : tasks;
  const assigned = mine.length;
  const statusOf = (t: IntelTaskRow) => {
    if (!forUserId) return t.status;
    const perUser = t.assignees?.find((a) => a.userId === forUserId);
    if (perUser && t.status === "COMPLETED") return perUser.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";
    return t.status;
  };
  const completedTasks = mine.filter((t) => statusOf(t) === "COMPLETED");
  const completed = completedTasks.length;
  const pending = mine.filter((t) => OPEN_STATUSES.includes(statusOf(t)) && statusOf(t) !== "BLOCKED").length;
  const blocked = mine.filter((t) => statusOf(t) === "BLOCKED").length;
  const notCompleted = mine.filter((t) => statusOf(t) === "NOT_COMPLETED").length;
  const periodEnd = dayEnd(period.to);
  const overdue = mine.filter((t) => t.deadline && new Date(t.deadline) < periodEnd && !["COMPLETED"].includes(statusOf(t))).length;

  let beforeDeadline = 0;
  let afterDeadline = 0;
  let withDeadline = 0;
  let totalHours = 0;
  let timedCount = 0;
  for (const t of completedTasks) {
    // updatedAt is the completion timestamp proxy (documented limitation)
    const completedAt = new Date(t.updatedAt);
    if (t.deadline) {
      withDeadline++;
      if (completedAt <= new Date(t.deadline)) beforeDeadline++; else afterDeadline++;
    }
    const base = new Date(t.dateAssigned);
    const hours = (completedAt.getTime() - base.getTime()) / 3_600_000;
    if (hours >= 0) { totalHours += hours; timedCount++; }
  }
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : null);
  return {
    assigned,
    completed,
    pending,
    overdue,
    blocked,
    cancelledOrNotCompleted: notCompleted,
    completedBeforeDeadline: beforeDeadline,
    completedAfterDeadline: afterDeadline,
    completionRatePct: pct(completed, assigned),
    punctualityPct: pct(beforeDeadline, withDeadline),
    avgCompletionHours: timedCount ? Math.round((totalHours / timedCount) * 100) / 100 : null,
  };
}

// ── Attendance statistics ────────────────────────────────────────────────────
// Attendance is only recorded when the agent's own daily report carries an
// attendance block. A missing record is NEVER counted as an absence.

export function attendanceStats(
  user: { workDays: string; createdAt: Date; status: string },
  reports: IntelReportRow[],
  period: IntelPeriod,
): IntelAttendanceStats {
  const start = dayStart(period.from);
  const end = dayEnd(period.to);
  const created = new Date(user.createdAt);
  // Scheduled days: the agent's own workDays mask across the period, capped to
  // their tenure (an agent hired mid-period isn't "missing" earlier days).
  let scheduledDays = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    const d = new Date(t);
    if (created > d) continue;
    if (worksOn(user.workDays, iso(d))) scheduledDays++;
  }
  const withRecord = reports.filter((r) => r.attendanceStatus);
  const present = withRecord.filter((r) => r.attendanceStatus === "Present").length;
  const late = withRecord.filter((r) => r.attendanceStatus === "Late").length;
  const absent = withRecord.filter((r) => r.attendanceStatus === "Absent").length;
  const recorded = withRecord.length;
  const missingRecords = Math.max(0, scheduledDays - recorded);
  const lateness = withRecord.map((r) => r.latenessMins).filter((v): v is number => typeof v === "number" && v > 0);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : null);
  const available = scheduledDays > 0 && recorded > 0;
  return {
    available,
    scheduledDays,
    daysWithRecord: recorded,
    present,
    late,
    absent,
    missingRecords,
    // Attendance % is against RECORDED days — missing records are not absences
    attendancePct: pct(present + late, recorded),
    punctualityPct: pct(present, recorded),
    avgLatenessMins: lateness.length ? Math.round((lateness.reduce((s, v) => s + v, 0) / lateness.length) * 100) / 100 : null,
  };
}

/** Split reports into a per-user map. */
export function groupByUser<T extends { userId?: string; fromId?: string }>(rows: T[], key: "userId" | "fromId"): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = (key === "userId" ? r.userId : r.fromId) as string | undefined;
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return map;
}
