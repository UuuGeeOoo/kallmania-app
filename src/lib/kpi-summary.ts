import { safeParse } from "@/lib/api-utils";
import { AGENT_KPI_DEFS } from "@/lib/template-config";
import { type KpiMetric } from "@/lib/kpi";

/**
 * Shared multi-period cumulative KPI aggregation.
 * Used by /api/kpi/summary (team + own) and /api/users/[id]/kpi (per-user drill-down).
 *
 * Count metrics are summed across submitted/approved reports in the period; targets
 * for count metrics scale by the number of distinct report days, percent targets stay
 * fixed and percent metrics are recomputed from summed raw components. Minutes are
 * averaged. Missing data never becomes zero.
 *
 * TEAM CUMULATIVE METHOD (dashboard): a team's count target is NOT one agent's
 * daily target — it is the sum over the team's ACTIVE roster of each agent's
 * effective daily target, counted only on the report days that agent actually
 * works (per-agent workDays mask), i.e.  Enugu outbound: 5 agents × 25/day = 125
 * for the day; actuals are summed across every agent and compared to 125.
 * teamPeriodTargets() computes that roster-scaled period target.
 */

const MS_DAY = 86_400_000;

export type KpiPeriod = "day" | "week" | "month" | "year";

export function periodRange(period: KpiPeriod | string, dateStr: string): { start: Date; end: Date; label: string; periodDays: number } {
  const d = new Date(dateStr + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) d.setTime(Date.now());
  if (period === "week") {
    const dow = d.getUTCDay(); // 0 Sun … 6 Sat
    const diffToMon = (dow + 6) % 7;
    const start = new Date(d.getTime() - diffToMon * MS_DAY);
    const endExclusive = new Date(start.getTime() + 7 * MS_DAY);
    return {
      start,
      end: new Date(endExclusive.getTime() - 1),
      label: `Week of ${start.toISOString().slice(0, 10)} → ${new Date(endExclusive.getTime() - MS_DAY).toISOString().slice(0, 10)}`,
      periodDays: 7,
    };
  }
  if (period === "month") {
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return {
      start,
      end,
      label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      periodDays: end.getUTCDate(),
    };
  }
  if (period === "year") {
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    return {
      start,
      end,
      label: `Year ${d.getUTCFullYear()}`,
      periodDays: Math.round((end.getTime() - start.getTime()) / MS_DAY) + 1,
    };
  }
  return { start: d, end: new Date(d.getTime() + MS_DAY - 1), label: dateStr, periodDays: 1 };
}

export interface CumRow {
  key: string;
  label: string;
  unit: string;
  category: string;
  dailyTarget: number | null;
  target: number | null; // period-scaled target
  targetLabel: string;
  actual: number | null;
  pct: number | null; // achievement vs period target
  // dashboard grouping (set by the caller): "call" | "social" | "tech"
  group?: string;
  groupLabel?: string;
}

/** One KPI row definition (mirrors a KpiConfig catalogue row / template row). */
export interface KpiRowDef {
  key: string;
  label: string;
  unit: "count" | "percent" | "minutes";
  category: string;
  target: number | null;
  sortOrder: number;
  targetLabel?: string; // template fallback label for rows without a configured target
}

/** A roster member feeding the team-target computation. */
export interface RosterMember {
  id: string;
  team: string | null; // OUTBOUND | INBOUND | EMAIL | SOCIAL | TECH
  workDays: string | null; // 7-char Mon..Sun mask, "1" = works
  overrides?: Map<string, number>; // approved per-member target overrides by key
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const DEFAULT_WORKDAYS = "1111111";

/** Does the member work the given date? A missing/invalid mask counts as
 *  working every day — a broken workDays value must never silently zero a
 *  team's target. */
export function worksOn(workDays: string | null | undefined, d: Date): boolean {
  const mask = workDays && workDays.length === 7 ? workDays : DEFAULT_WORKDAYS;
  const idx = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return mask[idx] === "1";
}

/** KPI department a team reports under (OUTBOUND/EMAIL → BPO, INBOUND → INBOUND, …). */
export function teamDept(team: string | null | undefined): string {
  if (team === "INBOUND") return "INBOUND";
  if (team === "SOCIAL") return "SOCIAL_MEDIA";
  if (team === "TECH") return "WEB_DEV";
  return "BPO";
}

/**
 * TEAM period targets for COUNT metrics — the roster method:
 *   target(key) = Σ over roster members × over report dates of
 *                 (agent's effective daily target when the agent works that date)
 *
 * Effective target = approved per-member override → the agent's team department
 * catalogue target. Agents without a configured target for a key contribute
 * nothing to it (a key no team configures gets no target at all). Percent and
 * minutes keys are rate/average metrics — they are deliberately NOT multiplied
 * by headcount and stay as configured.
 *
 * Returns key → { target (period total), label (human breakdown) }.
 */
export function teamPeriodTargets(
  members: RosterMember[],
  deptRows: Map<string, KpiRowDef[]>,
  reportDates: string[], // distinct ISO dates with submitted data, e.g. ["2026-11-02"]
): Map<string, { target: number; label: string }> {
  const out = new Map<string, { target: number; label: string }>();
  if (!members.length || !reportDates.length) return out;
  const dates = reportDates.map((s) => new Date(s + "T00:00:00.000Z")).filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return out;

  interface Acc { total: number; uniform: number | null; mixed: boolean; agentDays: number; agents: number }
  const accs = new Map<string, Acc>();
  for (const a of members) {
    const rows = deptRows.get(teamDept(a.team)) ?? [];
    const worked = dates.filter((d) => worksOn(a.workDays, d));
    if (!worked.length) continue; // agent works none of the report days
    for (const row of rows) {
      if (row.unit !== "count") continue;
      const t = a.overrides?.get(row.key) ?? row.target;
      if (t === null || t === undefined || Number.isNaN(t)) continue;
      let acc = accs.get(row.key);
      if (!acc) {
        acc = { total: 0, uniform: t, mixed: false, agentDays: 0, agents: 0 };
        accs.set(row.key, acc);
      }
      if (acc.uniform !== t) { acc.mixed = true; acc.uniform = null; }
      acc.total += t * worked.length;
      acc.agentDays += worked.length;
      acc.agents += 1;
    }
  }
  for (const [key, acc] of accs) {
    const label =
      !acc.mixed && acc.uniform !== null
        ? `${acc.uniform}/agent × ${acc.agents} agent${acc.agents === 1 ? "" : "s"} × ${acc.agentDays} agent-day${acc.agentDays === 1 ? "" : "s"}`
        : `roster total across ${acc.agents} agent${acc.agents === 1 ? "" : "s"}`;
    out.set(key, { target: round2(acc.total), label });
  }
  return out;
}

/** Derived metrics recomputed from raw component sums */
function deriveFromSums(key: string, sums: Record<string, number>): number | null {
  if (key === "contactRate") {
    if (!sums.totalCallsMade) return null;
    return Math.round((sums.callsConnected / sums.totalCallsMade) * 10000) / 100;
  }
  if (key === "conversionRate") {
    if (!sums.callsConnected) return null;
    return Math.round(((sums.hotLeads + sums.warmLeads) / sums.callsConnected) * 10000) / 100;
  }
  if (key === "leadsGenerated") {
    if (!sums.hotLeads && !sums.warmLeads) return null;
    return sums.hotLeads + sums.warmLeads;
  }
  return null;
}

const DERIVED_KEYS = new Set(["contactRate", "conversionRate", "leadsGenerated"]);

/** Build cumulative BPO KPI rows from a list of report kpiMetrics JSON blobs.
 *  `targets` (key → effective daily target) comes from the centre-aware KPI
 *  catalogue so configured centre overrides drive period targets; when omitted
 *  the template defaults are used.
 *  `defs` picks the row catalogue (default: the BPO agent rows); social/tech
 *  groups pass their own department rows.
 *  `periodTargets` (key → pre-computed period target + label) overrides the
 *  daily × days scaling — the dashboard team view passes the roster-scaled
 *  team targets here. */
export function cumulativeKpiRows(
  kpiBlobs: (string | null)[],
  distinctDates: number,
  targets?: Map<string, number | null> | null,
  defs?: KpiRowDef[],
  periodTargets?: Map<string, { target: number; label: string }> | null,
): CumRow[] {
  const rowDefs: KpiRowDef[] =
    defs ?? AGENT_KPI_DEFS.map((d, i) => ({ key: d.key, label: d.label, unit: d.unit, category: d.category, target: d.target, sortOrder: d.sortOrder ?? i, targetLabel: d.targetLabel }));
  const sums: Record<string, number> = {}; // count sums
  const minSum: Record<string, { sum: number; n: number }> = {}; // minutes
  const pctVals: Record<string, number[]> = {}; // percent fallback

  for (const blob of kpiBlobs) {
    const metrics = safeParse<KpiMetric[]>(blob, []);
    for (const m of metrics) {
      if (m.actual === null || m.actual === undefined || Number.isNaN(m.actual)) continue;
      if (m.unit === "minutes") {
        const acc = (minSum[m.key] ??= { sum: 0, n: 0 });
        acc.sum += m.actual;
        acc.n += 1;
      } else if (m.unit === "percent") {
        (pctVals[m.key] ??= []).push(m.actual);
      } else {
        sums[m.key] = (sums[m.key] || 0) + m.actual;
      }
    }
  }

  return rowDefs.map((def): CumRow => {
    const baseTarget = targets && targets.has(def.key) ? (targets.get(def.key) ?? null) : def.target;
    let actual: number | null = null;
    if (def.unit === "percent") {
      const derived = deriveFromSums(def.key, sums);
      actual = derived ?? (pctVals[def.key]?.length ? Math.round((pctVals[def.key].reduce((s, v) => s + v, 0) / pctVals[def.key].length) * 100) / 100 : null);
    } else if (def.unit === "minutes") {
      const acc = minSum[def.key];
      actual = acc && acc.n ? Math.round((acc.sum / acc.n) * 100) / 100 : null;
    } else {
      const derived = DERIVED_KEYS.has(def.key) ? deriveFromSums(def.key, sums) : null;
      actual = derived ?? (sums[def.key] !== undefined ? Math.round(sums[def.key] * 100) / 100 : null);
    }

    // Targets: counts scale by days with data; percent/minutes targets stay fixed.
    // Roster-scaled team targets (dashboard) arrive pre-computed and win.
    const pt = def.unit === "count" ? periodTargets?.get(def.key) : undefined;
    const scale = pt ? 1 : def.unit === "count" && baseTarget !== null ? distinctDates : 1;
    const target = pt ? pt.target : baseTarget !== null ? Math.round(baseTarget * scale * 100) / 100 : null;
    const pct = actual !== null && target !== null && target !== 0 ? Math.round((actual / target) * 10000) / 100 : null;

    const suffix = def.unit === "percent" ? "%" : def.unit === "minutes" ? "mins" : "";
    const targetLabel =
      pt
        ? `${pt.target}${suffix} (${pt.label})`
        : baseTarget !== null
          ? `${Math.round(baseTarget * scale * 100) / 100}${suffix}${scale > 1 ? ` (${baseTarget}/day × ${scale}d)` : ""}`
          : def.targetLabel ?? "-";

    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      category: def.category,
      dailyTarget: baseTarget,
      target,
      targetLabel,
      actual,
      pct,
    };
  });
}
