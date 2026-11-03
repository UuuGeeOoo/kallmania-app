import { safeParse } from "@/lib/api-utils";
import { type KpiMetric } from "@/lib/kpi";
import { teamPeriodTargets, teamDept, cumulativeKpiRows, type KpiRowDef, type RosterMember } from "@/lib/kpi-summary";
import { resolveKpiCatalogue, type ResolvedKpiConfig } from "@/lib/kpi-resolve";
import { worksOn } from "@/lib/schedule";
import { SOCIAL_TEMPLATE_KPIS, TECH_SUMMARY_METRICS } from "@/lib/template-config";
import { analyseKpiRows, type KpiTargetActual } from "./scoring";
import type { IntelKpiRow } from "./types";
import { dayStart, dayEnd, iso, type IntelPeriod, type IntelReportRow } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// KPI analysis for the intelligence module.
// Period targets follow the SAME roster method as the dashboard (per-agent
// effective daily target × the days that agent actually works), so an agent is
// graded against exactly the bar management configured for them — centre
// overrides and approved per-member overrides honoured.
// ─────────────────────────────────────────────────────────────────────────────

/** Direction fallback when a key is not in the configured catalogue. */
function fallbackDirection(key: string, unit: string): string {
  if (unit === "minutes") return "LOWER_BETTER"; // talk/hold/wrap-up are maximum thresholds
  return "HIGHER_BETTER";
}

export interface MemberOverrides { map: Map<string, number> }

export async function loadMemberOverrides(userIds: string[]): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>();
  if (!userIds.length) return out;
  const cfgs = await (await import("@/lib/db")).db.memberKpiConfig.findMany({
    where: { userId: { in: userIds }, status: "APPROVED", target: { not: null } },
    select: { userId: true, department: true, key: true, target: true },
  });
  for (const cfg of cfgs) {
    if (cfg.target === null) continue;
    const m = out.get(cfg.userId) ?? new Map<string, number>();
    m.set(cfg.key, cfg.target);
    out.set(cfg.userId, m);
  }
  return out;
}

/** The user's KPI department (outbound/inbound/email → BPO/INBOUND, social, tech). */
export function deptOfUser(u: { team: string | null; department: string; role: string }): string {
  return teamDept(u.team);
}

/** Row definitions for a department: configured catalogue first, template fallback. */
function deptRowDefs(catalogue: ResolvedKpiConfig[], dept: string): KpiRowDef[] {
  const configured = catalogue.filter((c) => c.active && c.department === dept);
  if (configured.length) {
    return configured
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        key: c.key, label: c.label,
        unit: (c.unit === "percent" || c.unit === "minutes" ? c.unit : "count") as KpiRowDef["unit"],
        category: "DEPT_CATALOGUE", target: c.defaultTarget, sortOrder: c.sortOrder,
      }));
  }
  if (dept === "SOCIAL_MEDIA") {
    return SOCIAL_TEMPLATE_KPIS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, category: "SOCIAL_TEMPLATE", target: null, sortOrder: i }));
  }
  if (dept === "WEB_DEV") {
    return TECH_SUMMARY_METRICS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, category: "TECH_TEMPLATE", target: null, sortOrder: i }));
  }
  return [];
}

export interface UserKpiResult {
  rows: IntelKpiRow[];          // one row per KPI with target or actual data
  submittedCount: number;
  distinctReportDates: string[];
  /** Distinct dates with a SUBMITTED/APPROVED report. */
  submittedDates: string[];
  /** mean achievement across rows with data (each capped at 100) */
  meanAchPct: number | null;
  exceeded: number; met: number; approaching: number; below: number; critical: number; insufficient: number;
}

/** Effective daily-target lookup per key (override → catalogue → null). */
function effectiveTargetMap(member: RosterMember, dept: string, catalogue: ResolvedKpiConfig[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const c of catalogue.filter((x) => x.active && x.department === dept)) {
    if (!map.has(c.key)) map.set(c.key, c.defaultTarget);
  }
  return map;
}

/**
 * Aggregate ONE member's KPI actuals across their submitted reports in the
 * period and grade them against their roster-method period target.
 */
export async function userKpiAnalysis(
  user: { id: string; team: string | null; workDays: string; department: string; role: string },
  reports: IntelReportRow[],
  catalogue: ResolvedKpiConfig[],
  overrides: MemberOverrides | undefined,
  period: IntelPeriod,
): Promise<UserKpiResult> {
  const dept = deptOfUser(user);
  const submitted = reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
  const submittedDates = [...new Set(submitted.map((r) => iso(new Date(r.reportDate))))].sort();
  const empty: UserKpiResult = { rows: [], submittedCount: submitted.length, distinctReportDates: submittedDates, submittedDates, meanAchPct: null, exceeded: 0, met: 0, approaching: 0, below: 0, critical: 0, insufficient: 0 };

  // TECH reports carry metricsSummary roll-ups; merge them into the blob list
  const deptRows = deptRowDefs(catalogue, dept);
  if (!deptRows.length || !submitted.length) return empty;

  const member: RosterMember = { id: user.id, team: user.team, workDays: user.workDays, overrides: overrides?.map };
  const periodTargets = teamPeriodTargets([member], new Map([[dept, deptRows]]), submittedDates);
  const targets = effectiveTargetMap(member, dept, catalogue);

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

  const rows = cumulativeKpiRows(blobs, submittedDates.length, targets, deptRows, periodTargets)
    .filter((r) => r.actual !== null || r.target !== null);

  const directionByKey = new Map(catalogue.filter((c) => c.active).map((c) => [c.key, c.direction]));
  const analysed = analyseKpiRows(rows.map((r): KpiTargetActual => ({
    key: r.key,
    label: r.label,
    unit: r.unit,
    direction: directionByKey.get(r.key) ?? fallbackDirection(r.key, r.unit),
    target: r.target,
    actual: r.actual,
    notes: r.target !== null ? undefined : "No target configured for this metric in the period",
  })));

  const mean = (() => {
    // Number.isFinite keeps a stray NaN out of the mean (a NaN mean would
    // serialize to null and read as "no data" downstream).
    const vals = analysed.filter((r) => r.achievementPct !== null && Number.isFinite(r.achievementPct)).map((r) => Math.min(100, r.achievementPct as number));
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null;
  })();

  return {
    rows: analysed,
    submittedCount: submitted.length,
    distinctReportDates: submittedDates,
    submittedDates,
    meanAchPct: mean,
    exceeded: analysed.filter((r) => r.status === "EXCEEDED").length,
    met: analysed.filter((r) => r.status === "MET").length,
    approaching: analysed.filter((r) => r.status === "APPROACHING").length,
    below: analysed.filter((r) => r.status === "BELOW").length,
    critical: analysed.filter((r) => r.status === "CRITICAL").length,
    insufficient: analysed.filter((r) => r.status === "INSUFFICIENT_DATA").length,
  };
}

/** Scheduled (expected) report days for a user in a period — workDays mask,
 *  capped by tenure and by today (future days are never "missed"). */
export function expectedReportDays(user: { workDays: string; createdAt: Date; status: string }, period: IntelPeriod): number {
  const start = dayStart(period.from).getTime();
  const end = dayEnd(period.to).getTime();
  const created = new Date(user.createdAt).getTime();
  const todayEnd = dayEnd(iso(new Date())).getTime();
  let days = 0;
  for (let t = start; t <= end; t += 86_400_000) {
    const d = new Date(t);
    if (created > t) continue;
    if (t > todayEnd) continue;
    if (worksOn(user.workDays, iso(d))) days++;
  }
  return days;
}