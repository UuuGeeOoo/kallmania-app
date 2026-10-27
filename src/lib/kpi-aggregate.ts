import { safeParse } from "@/lib/api-utils";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { type KpiMetric } from "@/lib/kpi";

/**
 * Shared multi-period cumulative KPI aggregation.
 *  - day   → the single calendar date
 *  - week  → Monday–Sunday ISO week containing the date
 *  - month → calendar month containing the date
 *  - year  → calendar year containing the date
 *
 * Count metrics are summed across all submitted/approved reports in the period;
 * targets for count metrics scale by the number of distinct report days, while
 * percent targets stay fixed and percent metrics are recomputed from summed raw
 * components (never averaged blindly). Minutes metrics are averaged. Missing
 * data never becomes zero — rows without data stay null.
 */

const MS_DAY = 86_400_000;

export function periodRange(period: string, dateStr: string): { start: Date; end: Date; label: string; periodDays: number } {
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
    const end = new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 0, 23, 59, 59, 999));
    const days = Math.round((end.getTime() - start.getTime() + 1) / MS_DAY);
    return {
      start,
      end,
      label: `Year ${start.getUTCFullYear()}`,
      periodDays: days,
    };
  }
  return { start: d, end: new Date(d.getTime() + MS_DAY - 1), label: dateStr, periodDays: 1 };
}

export const PERIODS = ["day", "week", "month", "year"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(p: string): p is Period {
  return (PERIODS as readonly string[]).includes(p);
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

/** Build cumulative BPO KPI rows from a list of report kpiMetrics JSON blobs */
export function cumulativeKpiRows(kpiBlobs: (string | null)[], distinctDates: number): CumRow[] {
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

  return AGENT_KPI_DEFS.map((def): CumRow => {
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

    // Targets: counts scale by days with data; percent/minutes targets stay fixed
    const scale = def.unit === "count" && def.target !== null ? distinctDates : 1;
    const target = def.target !== null ? Math.round(def.target * scale * 100) / 100 : null;
    const pct = actual !== null && target !== null && target !== 0 ? Math.round((actual / target) * 10000) / 100 : null;

    const targetLabel =
      def.target !== null
        ? `${Math.round(def.target * scale * 100) / 100}${def.unit === "percent" ? "%" : def.unit === "minutes" ? "mins" : ""}${scale > 1 ? ` (${def.target}/day × ${scale}d)` : ""}`
        : def.targetLabel ?? "-";

    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      category: def.category,
      dailyTarget: def.target,
      target,
      targetLabel,
      actual,
      pct,
    };
  });
}

export function sumMetricsSummary(reports: { metricsSummary: string | null }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of reports) {
    const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
    for (const [k, v] of Object.entries(ms)) if (typeof v === "number") out[k] = (out[k] || 0) + v;
  }
  return out;
}

export { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS };
