import { db } from "@/lib/db";
import { teamDept } from "@/lib/kpi-summary";
import {
  computeCumulativeKpi,
  expectedWorkingDays,
  buildTechTaskProfile,
  type RawKpiRecord,
  type CumulativeResult,
  type TechTaskProfile,
} from "@/lib/kpi-engine";
import type { IntelPeriod, IntelReportRow } from "./data";
import { iso } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// KPI-engine views for the Operational Intelligence module.
//
// The individual agent report and the team report read the SAME normalized
// KpiResult records the dashboards use (single source of truth, §9) — the
// cumulative math, the missing-day flags and the strictly task-based
// Web Development/Technical profile all come from src/lib/kpi-engine.ts.
// Every ranking below carries its measurement basis, and rankings that
// measure different things stay in separate lists (§7).
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentCumulativeView {
  cumulative: CumulativeResult;
  /** Per-day, per-KPI records with provenance (evidence for §6.C). */
  dailyRecords: {
    date: string; kpiKey: string; label: string; unit: string;
    target: number | null; actual: number | null; variance: number | null;
    achievement: number | null; statusLabel: string | null;
    source: string; verification: string; extractionConfidence: string | null;
    evidence: string | null; ref: string | null;
  }[];
}

/** Load KpiResult records for one user in the intel period and run the engine. */
export async function agentCumulativeView(
  user: { id: string; workDays: string; createdAt: Date; team: string | null; department: string },
  period: IntelPeriod,
): Promise<AgentCumulativeView> {
  const start = new Date(period.from + "T00:00:00.000Z");
  const end = new Date(period.to + "T23:59:59.999Z");
  const dept = user.team === "SOCIAL" ? "SOCIAL_MEDIA" : user.team === "TECH" ? "WEB_DEV" : user.department;
  const [records, reports, dirRows] = await Promise.all([
    db.kpiResult.findMany({
      where: { userId: user.id, reportDate: { gte: start, lte: end } },
      orderBy: [{ reportDate: "asc" }, { kpiKey: "asc" }],
      include: { report: { select: { ref: true } } },
    }),
    db.report.findMany({
      where: { userId: user.id, reportDate: { gte: start, lte: end }, status: { in: ["SUBMITTED", "APPROVED"] } },
      select: { ref: true, reportDate: true },
    }),
    db.kpiConfig.findMany({ where: { department: dept, active: true }, select: { key: true, direction: true } }),
  ]);
  const directions = new Map(dirRows.map((r) => [r.key, r.direction]));
  const raw: RawKpiRecord[] = records.map((r) => ({
    kpiKey: r.kpiKey,
    label: r.label,
    unit: r.unit,
    target: r.target,
    actual: r.actual,
    achievement: r.achievement,
    statusLabel: r.statusLabel,
    source: r.source,
    reportDate: r.reportDate,
    updatedAt: r.updatedAt,
    reportRef: r.report?.ref ?? null,
    sbtsEventId: r.sbtsEventId,
  }));
  const reportedDates = new Set<string>([
    ...records.map((r) => iso(new Date(r.reportDate))),
    ...reports.map((r) => iso(new Date(r.reportDate))),
  ]);
  const expected = expectedWorkingDays(user.workDays, start, end, user.createdAt);
  const cumulative = computeCumulativeKpi(raw, directions, { expectedDays: expected.count, reportedDates });
  cumulative.reporting.missingDates = expected.dates.filter((d) => !reportedDates.has(d)).slice(0, 31);

  const dailyRecords = records.map((r) => ({
    date: iso(new Date(r.reportDate)),
    kpiKey: r.kpiKey,
    label: r.label,
    unit: r.unit,
    target: r.target,
    actual: r.actual,
    variance: r.actual !== null && r.target !== null ? Math.round((r.actual - r.target) * 100) / 100 : null,
    achievement: r.achievement,
    statusLabel: r.statusLabel,
    source: r.source,
    verification: r.verification,
    extractionConfidence: r.extractionConfidence,
    evidence: r.evidence,
    ref: r.report?.ref ?? (r.sbtsEventId ? `SBTS event ${r.sbtsEventId.slice(0, 18)}…` : null),
  }));

  return { cumulative, dailyRecords };
}

/** Task-engine view for one WEB_DEV/TECH agent (§3/§5/§6.D/§6.E). */
export async function agentTechTaskView(
  userId: string,
  reports: IntelReportRow[],
  period: IntelPeriod,
): Promise<{ profile: TechTaskProfile; tasks: { title: string; status: string; deadline: Date | null; dateAssigned: Date; blocker: string | null; priority: string; category: string | null; updatedAt: Date }[] }> {
  const start = new Date(period.from + "T00:00:00.000Z").getTime();
  const end = new Date(period.to + "T23:59:59.999Z").getTime();
  const tasks = await db.task.findMany({
    where: {
      OR: [{ assigneeId: userId }, { assignees: { some: { userId } } }],
    },
    select: { title: true, status: true, deadline: true, dateAssigned: true, blocker: true, priority: true, category: true, updatedAt: true },
    take: 500,
  });
  const taskRows = tasks.filter((t) => {
    const t0 = new Date(t.dateAssigned).getTime();
    const t1 = t.deadline ? new Date(t.deadline).getTime() : new Date(t.updatedAt).getTime();
    return t1 >= start || (t0 <= end && t1 >= start) || (t0 >= start && t0 <= end);
  });
  const profile = buildTechTaskProfile(
    reports.map((r) => ({
      id: r.id, ref: r.ref, reportDate: new Date(r.reportDate), status: r.status,
      kpiMetrics: r.kpiMetrics, workEntries: r.workEntries,
    })),
    taskRows.map((t) => ({ ...t, dateAssigned: new Date(t.dateAssigned), deadline: t.deadline ? new Date(t.deadline) : null, updatedAt: new Date(t.updatedAt) })),
  );
  return { profile, tasks: taskRows };
}

// ── §7 Team rankings — each with its measurement basis, categories separate ──

export interface BasisRanking {
  id: string;
  label: string;
  basis: string;
  higherIsBetter: boolean;
  leaders: { agentId: string; agent: string; value: number | null; display: string }[];
  needsAttention: { agentId: string; agent: string; value: number | null; display: string; detail: string }[];
}

export interface AgentEngineCore {
  agentId: string;
  agent: string;
  cumulative: CumulativeResult;
  tech: TechTaskProfile | null;
}

/** Build per-agent engine cores for a team roster, then derive §7 rankings. */
export async function teamEngineCores(
  roster: { id: string; fullName: string; workDays: string; createdAt: Date; team: string | null; department: string }[],
  period: IntelPeriod,
): Promise<AgentEngineCore[]> {
  const cores: AgentEngineCore[] = [];
  for (const u of roster) {
    const view = await agentCumulativeView(u, period);
    let tech: TechTaskProfile | null = null;
    if (teamDept(u.team) === "WEB_DEV") {
      const reports = await db.report.findMany({
        where: { userId: u.id, reportDate: { gte: new Date(period.from + "T00:00:00.000Z"), lte: new Date(period.to + "T23:59:59.999Z") } },
        select: { id: true, ref: true, reportDate: true, status: true, kpiMetrics: true, workEntries: true },
        take: 400,
      });
      tech = (await agentTechTaskView(u.id, reports as IntelReportRow[], period)).profile;
    }
    cores.push({ agentId: u.id, agent: u.fullName, cumulative: view.cumulative, tech });
  }
  return cores;
}

const fmt = (v: number | null, suffix = "") => (v === null ? "n/a" : `${Math.round(v * 100) / 100}${suffix}`);

/** §6.D Work Completed — verified accomplishments gathered from the submitted
 *  reports' own work entries (grouped by normalized title so a recurring daily
 *  duty shows as one line with its dates, never as inflated one-off counts). */
export function collectWorkCompleted(
  reports: { ref: string; reportDate: Date; status: string; workEntries: string | null }[],
): { task: string; project: string | null; dates: string[]; deliverables: string[]; timesCompleted: number; reportRefs: string[] }[] {
  const groups = new Map<string, { task: string; project: string | null; dates: string[]; deliverables: string[]; timesCompleted: number; reportRefs: string[] }>();
  for (const r of reports) {
    if (!["SUBMITTED", "APPROVED"].includes(r.status) || !r.workEntries) continue;
    let entries: { task?: string; project?: string; status?: string; deliverable?: string }[] = [];
    try { entries = JSON.parse(r.workEntries); } catch { /* malformed → no claims */ }
    const seen = new Set<string>();
    for (const e of entries) {
      if (!e || typeof e.task !== "string" || !e.task.trim()) continue;
      const key = e.task.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const status = (e.status ?? "").toLowerCase();
      if (!status.includes("complet") && !status.includes("done") && !status.includes("resolved") && !status.includes("closed")) continue;
      const g = groups.get(key) ?? { task: e.task.trim(), project: typeof e.project === "string" ? e.project : null, dates: [], deliverables: [], timesCompleted: 0, reportRefs: [] };
      g.dates.push(iso(new Date(r.reportDate)));
      g.reportRefs.push(r.ref);
      if (typeof e.deliverable === "string" && e.deliverable.trim() && !g.deliverables.includes(e.deliverable.trim())) g.deliverables.push(e.deliverable.trim());
      g.timesCompleted += 1;
      groups.set(key, g);
    }
  }
  return [...groups.values()].sort((a, b) => b.timesCompleted - a.timesCompleted);
}

export function deriveRankings(cores: AgentEngineCore[]): { rankings: BasisRanking[]; separateGrades: string[] } {
  const rankings: BasisRanking[] = [];
  const notes: string[] = [];
  if (!cores.length) return { rankings, separateGrades: notes };

  const top = (
    id: string, label: string, basis: string,
    value: (c: AgentEngineCore) => number | null, display: (c: AgentEngineCore) => string,
    opts: { attention?: boolean; higherIsBetter?: boolean; attentionDetail?: (c: AgentEngineCore) => string } = {},
  ) => {
    const withVal = cores.map((c) => ({ c, v: value(c) })).filter((x) => x.v !== null) as { c: AgentEngineCore; v: number }[];
    const higher = opts.higherIsBetter !== false;
    const sorted = [...withVal].sort((a, b) => (higher ? b.v - a.v : a.v - b.v));
    rankings.push({
      id, label, basis, higherIsBetter: higher,
      leaders: sorted.slice(0, 3).map(({ c, v }) => ({ agentId: c.agentId, agent: c.agent, value: Math.round(v * 100) / 100, display: display(c) })),
      needsAttention: opts.attention
        ? [...withVal].sort((a, b) => (higher ? a.v - b.v : b.v - a.v)).slice(0, 3).map(({ c, v }) => ({
            agentId: c.agentId, agent: c.agent, value: Math.round(v * 100) / 100, display: display(c),
            detail: opts.attentionDetail ? opts.attentionDetail(c) : `${label}: ${display(c)}`,
          }))
        : [],
    });
  };

  // Social / volume-based comparisons (sum-based cumulative achievement).
  const hasSocial = cores.some((c) => c.cumulative.kpis.length > 0);
  if (hasSocial) {
    top(
      "cumulative-achievement",
      "Highest overall KPI achievement",
      "Σ cumulative actuals ÷ Σ cumulative targets across higher-is-better KPIs with configured targets (never an average of daily percentages)",
      (c) => c.cumulative.overall.achievementPct,
      (c) => `${fmt(c.cumulative.overall.achievementPct, "%")} (Σ${c.cumulative.overall.cumulativeActual ?? 0} vs Σ${c.cumulative.overall.cumulativeTarget ?? 0})`,
      { attentionDetail: (c) => `Overall cumulative achievement ${fmt(c.cumulative.overall.achievementPct, "%")} against the configured daily targets` },
    );
    top(
      "most-consistent",
      "Most consistent reporting",
      "days with a submitted report ÷ expected working days (workDays mask, capped by tenure and today)",
      (c) => c.cumulative.reporting.consistencyPct,
      (c) => `${fmt(c.cumulative.reporting.consistencyPct, "%")} (${c.cumulative.reporting.reportedDays}/${c.cumulative.reporting.expectedDays} days)`,
    );
    top(
      "most-missing-reports",
      "Most missing reports (management attention)",
      "expected working days with no submitted report — flagged MISSING, never counted as zero achievement",
      (c) => (c.cumulative.reporting.expectedDays > 0 ? c.cumulative.reporting.missingCount : null),
      (c) => `${c.cumulative.reporting.missingCount} missing of ${c.cumulative.reporting.expectedDays} expected`,
      { higherIsBetter: false, attention: true, attentionDetail: (c) => `${c.cumulative.reporting.missingCount} working day(s) without any report (${c.cumulative.reporting.missingDates.slice(0, 5).join(", ") || "dates trimmed"})` },
    );
    top(
      "missed-target-days",
      "Most days below daily target",
      "count of reported days where that KPI's actual ÷ target was below 100% (all KPIs summed per agent)",
      (c) => (c.cumulative.kpis.some((k) => k.days.missed > 0) ? c.cumulative.kpis.reduce((s, k) => s + k.days.missed, 0) : null),
      (c) => `${c.cumulative.kpis.reduce((s, k) => s + k.days.missed, 0)} missed day-KPI(s) of ${c.cumulative.kpis.reduce((s, k) => s + k.days.reported, 0)} reported`,
      { higherIsBetter: false, attention: true },
    );
  }

  // Web Dev / Technical — strictly task-based, quality kept separate.
  const techCores = cores.filter((c) => c.tech);
  if (techCores.length) {
    top(
      "deliverables-completed",
      "Highest number of completed deliverables",
      "Σ 'Tickets / Tasks Completed' actual rows across submitted TECH reports (verified entries only)",
      (c) => (c.tech ? c.tech.completedDeliverables : null),
      (c) => `${c.tech?.completedDeliverables ?? 0} of ${c.tech?.assignedDeliverables ?? 0} assigned`,
      { attention: false },
    );
    top(
      "completion-rate",
      "Highest completion rate",
      "completed deliverables ÷ assigned deliverables × 100",
      (c) => (c.tech ? c.tech.completionRatePct : null),
      (c) => `${fmt(c.tech?.completionRatePct ?? null, "%")}`,
      { attention: true, attentionDetail: (c) => `Completion rate ${fmt(c.tech?.completionRatePct ?? null, "%")} — ${c.tech?.outstandingDeliverables ?? 0} outstanding deliverable(s)` },
    );
    top(
      "on-time-rate",
      "Highest on-time delivery",
      "Task records: completions by deadline ÷ deadline-bearing completions (Task.updatedAt as completion proxy)",
      (c) => (c.tech ? c.tech.onTimeCompletionRatePct : null),
      (c) => `${fmt(c.tech?.onTimeCompletionRatePct ?? null, "%")}`,
    );
    top(
      "bugs-resolved",
      "Most bugs resolved",
      "Σ 'Bugs Resolved' actual rows — deliberately separate from bugs reported (§5)",
      (c) => (c.tech && (c.tech.bugsResolved > 0 || c.tech.bugsReported > 0) ? c.tech.bugsResolved : null),
      (c) => `${c.tech?.bugsResolved ?? 0} resolved / ${c.tech?.bugsReported ?? 0} reported`,
      { attention: false },
    );
    top(
      "outstanding-assignments",
      "Most outstanding assignments (management attention)",
      "Task records not completed within the period — cancelled assignments excluded; blocked items shown separately with their documented blocker",
      (c) => (c.tech ? c.tech.outstandingWork.filter((w) => w.kind !== "BLOCKED").length : null),
      (c) => `${c.tech?.outstandingWork.filter((w) => w.kind !== "BLOCKED").length ?? 0} outstanding, ${c.tech?.overdueDeliverables ?? 0} overdue, ${c.tech?.blocked ?? 0} blocked`,
      { higherIsBetter: false, attention: true, attentionDetail: (c) => (c.tech?.outstandingWork ?? []).slice(0, 3).map((w) => `${w.kind}: ${w.label}`).join("; ") || "no outstanding work" },
    );
    notes.push(
      "Task counts are NOT treated as overall performance: rankings above measure different things and stay separate. Complexity/priority weighting is applied only where management configured it (Task.priority); raw counts never override quality, deadlines and verified completion.",
    );
  }

  const gapAgents = cores.filter((c) => c.cumulative.kpis.length === 0 && (c.tech === null || c.tech.assignedDeliverables === 0));
  if (gapAgents.length) {
    notes.push(
      `No verifiable KPI data in the period for: ${gapAgents.map((c) => c.agent).join(", ")} — they appear in no ranking above (absence of data is never scored as zero or as failure; flagged for review).`,
    );
  }

  return { rankings, separateGrades: notes };
}
