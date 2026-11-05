import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/integrations/sbts";
import { resolveKpiDirection, rowAchievement } from "@/lib/kpi-engine";
import type { KpiMetric } from "@/lib/kpi";
import type { Report, User, SbtsEvent } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Normalized KPI result materialization — the report→KPI-record bridge.
//
// Every SUBMITTED report (manual, upload-confirmed, or team-lead payload) and
// every matched SBTS score event writes one KpiResult row per KPI value, each
// idempotent on dedupeKey, each linked back to its source (report id / SBTS
// event id), period, target and verification state. Corrections bump revision
// and keep the previous actual — history is never erased. Missing values are
// never faked to zero: a KPI without data simply produces no row, and a KPI
// without a configured target gets achievement=null + statusLabel NO_TARGET.
// ─────────────────────────────────────────────────────────────────────────────

export type KpiResultSource = "REPORT" | "TL_REPORT" | "SBTS";

// The SBTS daily.report parser/materializer lives in the KPI engine — this
// re-export keeps every materialization entry point importable from one module.
export { materializeSbtsReportKpiResults } from "@/lib/kpi-engine";

export interface MaterializeOwner {
  id: string;
  team: string | null;
  department: string;
}

/** Direction-aware achievement % and status label (shortfall convention: <80%). */
export function achievementFor(
  actual: number,
  target: number | null | undefined,
  unit: string,
): { achievement: number | null; statusLabel: string } {
  if (target === null || target === undefined || target === 0) return { achievement: null, statusLabel: "NO_TARGET" };
  const t = target as number;
  let pct: number;
  if (unit === "minutes") {
    // Time budgets: at/under target = 100%+; over target degrades.
    if (actual <= 0) return { achievement: t > 0 ? 0 : null, statusLabel: t > 0 ? "BELOW_TARGET" : "NO_TARGET" };
    pct = Math.round((t / actual) * 10000) / 100;
  } else {
    pct = Math.round((actual / t) * 10000) / 100;
  }
  if (!Number.isFinite(pct)) return { achievement: null, statusLabel: "NO_TARGET" };
  const status = pct >= 100 ? "MET" : pct >= 80 ? "ON_TRACK" : "BELOW_TARGET";
  return { achievement: pct, statusLabel: status };
}

type KpiResultUpsert = {
  dedupeKey: string;
  userId: string;
  team: string | null;
  department: string;
  kpiKey: string;
  label: string;
  unit: string;
  target: number | null;
  actual: number;
  achievement: number | null;
  statusLabel: string;
  source: KpiResultSource;
  reportId: string | null;
  sbtsEventId: string | null;
  reportDate: Date;
  periodMonth: string;
  verification: string;
};

const monthKey = (d: Date) => d.toISOString().slice(0, 7);

async function upsertKpiResult(row: KpiResultUpsert): Promise<"created" | "updated" | "unchanged"> {
  const existing = await db.kpiResult.findUnique({ where: { dedupeKey: row.dedupeKey } });
  if (!existing) {
    try {
      await db.kpiResult.create({ data: row });
      return "created";
    } catch (err) {
      if (isUniqueViolation(err)) return "unchanged"; // concurrent write won — idempotent
      throw err;
    }
  }
  const changed =
    existing.actual !== row.actual ||
    existing.target !== row.target ||
    existing.verification !== row.verification ||
    existing.achievement !== row.achievement ||
    existing.statusLabel !== row.statusLabel;
  if (!changed) return "unchanged";
  await db.kpiResult.update({
    where: { dedupeKey: row.dedupeKey },
    data: {
      target: row.target,
      actual: row.actual,
      achievement: row.achievement,
      statusLabel: row.statusLabel,
      label: row.label,
      unit: row.unit,
      verification: row.verification,
      revision: { increment: 1 },
      previousActual: existing.actual,
    },
  });
  return "updated";
}

/** Effective target priority: approved member override → catalogue value → report row target. */
async function effectiveTarget(
  owner: MaterializeOwner,
  key: string,
  reportTarget: number | null,
): Promise<number | null> {
  const override = await db.memberKpiConfig.findFirst({
    where: { userId: owner.id, department: owner.department, key, status: "APPROVED", target: { not: null } },
    select: { target: true },
  });
  if (override?.target != null) return override.target;
  return reportTarget ?? null;
}

/** KpiConfig catalogue direction per department+key (quality/response-time KPIs
 *  are LOWER_BETTER — 5h against a 4h budget must grade below target, not above). */
async function catalogueDirections(department: string): Promise<Map<string, string>> {
  const rows = await db.kpiConfig.findMany({
    where: { department, active: true },
    select: { key: true, direction: true },
  });
  return new Map(rows.map((r) => [r.key, r.direction]));
}

/**
 * Materialize KpiResult rows from an agent/social/tech report's kpiMetrics.
 * Called at SUBMIT time (and on corrections of already-submitted reports).
 * Drafts must never call this.
 */
export async function materializeReportKpiResults(report: Report, owner: MaterializeOwner): Promise<number> {
  if (!["SUBMITTED", "APPROVED"].includes(report.status)) return 0;
  let metrics: KpiMetric[] = [];
  try {
    metrics = report.kpiMetrics ? (JSON.parse(report.kpiMetrics) as KpiMetric[]) : [];
  } catch {
    return 0;
  }
  const reportDate = new Date(report.reportDate);
  const base = {
    userId: owner.id,
    team: owner.team,
    department: owner.department,
    source: "REPORT" as const,
    reportId: report.id,
    sbtsEventId: null,
    reportDate,
    periodMonth: monthKey(reportDate),
    verification: report.status,
  };
  const directions = await catalogueDirections(owner.department);
  let n = 0;
  for (const m of metrics) {
    if (m.actual === null || m.actual === undefined || Number.isNaN(Number(m.actual))) continue;
    const actual = Number(m.actual);
    const target = await effectiveTarget(owner, m.key, m.target ?? null);
    const direction = resolveKpiDirection(directions, m.key, m.unit || "count");
    const { achievement, statusLabel } = rowAchievement(actual, target, m.unit || "count", direction);
    n += (await upsertKpiResult({
      ...base,
      dedupeKey: `report:${report.id}:${m.key}`,
      kpiKey: m.key,
      label: m.label || m.key,
      unit: m.unit || "count",
      target,
      actual,
      achievement,
      statusLabel,
    }) === "unchanged" ? 0 : 1);
  }
  return n;
}

/**
 * Materialize KpiResult rows from a TEAM_LEAD report's payload metrics
 * sections — the lead's own performance record (their reported team KPI
 * summary + any personal metrics their template carries). Clearly sourced as
 * TL_REPORT so the lead's personal dashboard never mixes with team aggregates.
 */
export async function materializeTeamLeadKpiResults(report: Report, owner: MaterializeOwner): Promise<number> {
  if (!["SUBMITTED", "APPROVED"].includes(report.status) || !report.payload) return 0;
  let sections: Record<string, unknown>;
  try {
    const payload = JSON.parse(report.payload) as { sections?: Record<string, unknown> };
    sections = payload.sections ?? {};
  } catch {
    return 0;
  }
  const reportDate = new Date(report.reportDate);
  const base = {
    userId: owner.id,
    team: owner.team,
    department: owner.department,
    source: "TL_REPORT" as const,
    reportId: report.id,
    sbtsEventId: null,
    reportDate,
    periodMonth: monthKey(reportDate),
    verification: report.status,
  };
  let n = 0;
  for (const [sectionId, value] of Object.entries(sections)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      const num = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
      if (num === null) continue;
      const pretty = key
        .replace(/^(team|tl)/, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase());
      const { achievement, statusLabel } = achievementFor(num, null, "count");
      n += (await upsertKpiResult({
        ...base,
        dedupeKey: `tl:${report.id}:${sectionId}:${key}`,
        kpiKey: `${sectionId}.${key}`,
        label: pretty,
        unit: /rate|pct|percent/i.test(key) ? "percent" : "count",
        target: null,
        actual: num,
        achievement,
        statusLabel,
      }) === "unchanged" ? 0 : 1);
    }
  }
  return n;
}

/**
 * Materialize KpiResult rows from a matched SBTS event: the headline score
 * (kpiKey sbts_score) plus one row per score component. Idempotent per eventId
 * — a replayed event can never inflate results. Targets come from the
 * configured catalogue when present (SOCIAL_MEDIA / sbts_score*), otherwise
 * the record honestly shows NO_TARGET — SBTS owns the scoring, Kallmania
 * stores it as a KPI record without inventing targets.
 */
export async function materializeSbtsKpiResults(event: SbtsEvent, owner: MaterializeOwner): Promise<number> {
  if (!event.matched || !event.userId) return 0;
  const eventDate = new Date(event.eventDate + "T00:00:00.000Z");
  const base = {
    userId: owner.id,
    team: owner.team,
    department: owner.department,
    source: "SBTS" as const,
    reportId: null,
    sbtsEventId: event.id,
    reportDate: eventDate,
    periodMonth: monthKey(eventDate),
    verification: "SUBMITTED",
  };
  let n = 0;
  if (event.type === "performance.score" && event.score !== null) {
    const cfg = await db.kpiConfig.findFirst({
      where: { department: "SOCIAL_MEDIA", key: "sbts_score", active: true },
      select: { defaultTarget: true, label: true },
    });
    const override = await db.memberKpiConfig.findFirst({
      where: { userId: owner.id, department: "SOCIAL_MEDIA", key: "sbts_score", status: "APPROVED", target: { not: null } },
      select: { target: true },
    });
    const target = override?.target ?? cfg?.defaultTarget ?? null;
    const { achievement, statusLabel } = rowAchievement(event.score, target, "score");
    n += (await upsertKpiResult({
      ...base,
      dedupeKey: `sbts:${event.eventId}`,
      kpiKey: "sbts_score",
      label: "SBTS Media Score",
      unit: "score",
      target,
      actual: event.score,
      achievement,
      statusLabel,
    }) === "unchanged" ? 0 : 1);
    if (event.components) {
      try {
        const comps = JSON.parse(event.components) as Record<string, number>;
        for (const [k, v] of Object.entries(comps)) {
          if (typeof v !== "number" || !Number.isFinite(v)) continue;
          const compCfg = await db.kpiConfig.findFirst({
            where: { department: "SOCIAL_MEDIA", key: `sbts_${k}`, active: true },
            select: { defaultTarget: true },
          });
          const { achievement: ach, statusLabel: st } = achievementFor(v, compCfg?.defaultTarget ?? null, "score");
          n += (await upsertKpiResult({
            ...base,
            dedupeKey: `sbts:${event.eventId}:${k}`,
            kpiKey: `sbts_${k}`,
            label: `SBTS ${k.replace(/_/g, " ")}`,
            unit: "score",
            target: compCfg?.defaultTarget ?? null,
            actual: v,
            achievement: ach,
            statusLabel: st,
          }) === "unchanged" ? 0 : 1);
        }
      } catch { /* malformed components — headline row already recorded */ }
    }
  }
  return n;
}

/** Sync verification state on every row of a report (approve / reject). */
export async function markReportKpiResults(reportId: string, verification: string): Promise<number> {
  const res = await db.kpiResult.updateMany({ where: { reportId }, data: { verification } });
  return res.count;
}

/** Archive helper: per-report KPI record counts for a set of reports. */
export async function kpiRecordCounts(reportIds: string[]): Promise<Map<string, number>> {
  if (!reportIds.length) return new Map();
  const rows = await db.kpiResult.groupBy({
    by: ["reportId"],
    where: { reportId: { in: reportIds } },
    _count: { id: true },
  });
  return new Map(rows.filter((r) => r.reportId).map((r) => [r.reportId as string, r._count.id]));
}
