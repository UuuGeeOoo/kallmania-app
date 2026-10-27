import { safeParse } from "@/lib/api-utils";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { type KpiMetric } from "@/lib/kpi";

/**
 * Multi-period cumulative KPI aggregation for the /api/kpi dashboard
 * (KpiView — daily / weekly / monthly cumulative achievement).
 *
 *  • count metrics  → summed across submitted/approved reports; the period
 *    target scales with the number of elapsed days (daily target × days).
 *  • percent metrics → recomputed from summed raw components where possible
 *    (never averaged blindly), otherwise averaged; targets stay daily.
 *  • minutes metrics → averaged; targets stay daily.
 *
 * Missing data never becomes zero — rows without data stay null.
 */

const MS_DAY = 86_400_000;

export type Period = "daily" | "weekly" | "monthly";
export const PERIODS: readonly Period[] = ["daily", "weekly", "monthly"];

export interface AggReport {
  type: string;
  department: string;
  kpiMetrics: string | null;
  metricsSummary: string | null;
  reportDate: Date | string;
}

export interface AggKpi {
  key: string;
  label: string;
  unit: "count" | "percent" | "minutes";
  kind: "sum" | "rate" | "avg";
  targetDaily: number | null;
  periodTarget: number | null;
  actual: number | null;
  achievement: number | null;
  status: "exceeded" | "on_track" | "at_risk" | "below" | "no_data" | "no_target";
  sampleCount: number;
}

export interface DeptSection {
  department: string;
  reportCount: number;
  daysWithReports: number;
  overall: number | null;
  kpis: AggKpi[];
}

export interface TrendBucket {
  label: string;
  start: string;
  end: string;
  reportCount: number;
  achievement: number | null;
  highlights: Record<string, number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const dayOf = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/** Start/end (inclusive), label and elapsed/total days for the selected period. */
export function periodRange(dateStr: string, period: Period): {
  start: Date; end: Date; label: string; daysElapsed: number; daysTotal: number;
} {
  const d = dayOf(dateStr);
  if (period === "weekly") {
    const dow = d.getUTCDay(); // 0 Sun … 6 Sat
    const diffToMon = (dow + 6) % 7;
    const start = new Date(d.getTime() - diffToMon * MS_DAY);
    const end = new Date(start.getTime() + 7 * MS_DAY - 1);
    return {
      start,
      end,
      label: `Week of ${isoDay(start)} → ${isoDay(new Date(end.getTime() - (MS_DAY - 1)))}`,
      daysElapsed: diffToMon + 1,
      daysTotal: 7,
    };
  }
  if (period === "monthly") {
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return {
      start,
      end,
      label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      daysElapsed: d.getUTCDate(),
      daysTotal: end.getUTCDate(),
    };
  }
  return {
    start: d,
    end: new Date(d.getTime() + MS_DAY - 1),
    label: dateStr,
    daysElapsed: 1,
    daysTotal: 1,
  };
}

/** KPI catalogue row (mirrors the active KpiConfig rows). */
export interface KpiCatalogueRow {
  department: string;
  key: string;
  label: string;
  unit: string;
  defaultTarget: number | null;
  sortOrder: number;
}

interface RowDef { key: string; label: string; unit: "count" | "percent" | "minutes"; target: number | null; sortOrder: number }

/** Template fallback rows for departments without configured KPI rows. */
const DEPT_ROWS: Record<string, RowDef[]> = {
  BPO: AGENT_KPI_DEFS.map((d, i) => ({ key: d.key, label: d.label, unit: d.unit, target: d.target, sortOrder: d.sortOrder ?? i })),
  INBOUND: AGENT_KPI_DEFS.map((d, i) => ({ key: d.key, label: d.label, unit: d.unit, target: d.target, sortOrder: d.sortOrder ?? i })),
  OUTBOUND: AGENT_KPI_DEFS.map((d, i) => ({ key: d.key, label: d.label, unit: d.unit, target: d.target, sortOrder: d.sortOrder ?? i })),
  WEB_DEV: TECH_SUMMARY_METRICS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, target: null, sortOrder: i })),
  SOCIAL_MEDIA: SOCIAL_SUMMARY_METRICS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, target: null, sortOrder: i })),
};
const DEPT_ORDER = ["BPO", "WEB_DEV", "SOCIAL_MEDIA", "INBOUND", "OUTBOUND"];
const asUnit = (u: string): "count" | "percent" | "minutes" => (u === "percent" || u === "minutes" ? u : "count");

/** Derived metrics recomputed from raw component sums */
function deriveFromSums(key: string, sums: Record<string, number>): number | null {
  if (key === "contactRate") {
    if (!sums.totalCallsMade) return null;
    return round2((sums.callsConnected / sums.totalCallsMade) * 100);
  }
  if (key === "conversionRate") {
    if (!sums.callsConnected) return null;
    return round2(((sums.hotLeads + sums.warmLeads) / sums.callsConnected) * 100);
  }
  if (key === "leadsGenerated") {
    if (!sums.hotLeads && !sums.warmLeads) return null;
    return sums.hotLeads + sums.warmLeads;
  }
  return null;
}
const DERIVED_KEYS = new Set(["contactRate", "conversionRate", "leadsGenerated"]);

function statusOf(achievement: number | null, hasTarget: boolean, hasData: boolean): AggKpi["status"] {
  if (!hasTarget) return "no_target";
  if (!hasData || achievement === null) return "no_data";
  if (achievement >= 100) return "exceeded";
  if (achievement >= 85) return "on_track";
  if (achievement >= 70) return "at_risk";
  return "below";
}

/** Aggregate one department's reports into cumulative KPI rows. */
function aggDept(department: string, rows: RowDef[], reports: AggReport[], daysElapsed: number): DeptSection {
  const sums: Record<string, number> = {}; // count sums
  const mins: Record<string, { sum: number; n: number }> = {}; // minutes
  const pcts: Record<string, number[]> = {}; // percent fallback
  const sample: Record<string, number> = {}; // reports contributing data per key
  const days = new Set<string>();

  for (const r of reports) {
    days.add(isoDay(new Date(r.reportDate)));
    let touched = new Set<string>();
    for (const m of safeParse<KpiMetric[]>(r.kpiMetrics, [])) {
      if (m?.key && m.actual !== null && m.actual !== undefined && !Number.isNaN(m.actual)) {
        touched.add(m.key);
        if (m.unit === "minutes") {
          const acc = (mins[m.key] ??= { sum: 0, n: 0 });
          acc.sum += m.actual;
          acc.n += 1;
        } else if (m.unit === "percent") {
          (pcts[m.key] ??= []).push(m.actual);
        } else {
          sums[m.key] = (sums[m.key] || 0) + m.actual;
        }
      }
    }
    for (const [k, v] of Object.entries(safeParse<Record<string, number | null>>(r.metricsSummary, {}))) {
      if (typeof v === "number" && !Number.isNaN(v)) {
        touched.add(k);
        sums[k] = (sums[k] || 0) + v;
      }
    }
    for (const k of touched) sample[k] = (sample[k] || 0) + 1;
  }

  const kpis: AggKpi[] = rows.map((def) => {
    let actual: number | null = null;
    if (def.unit === "percent") {
      const derived = DERIVED_KEYS.has(def.key) ? deriveFromSums(def.key, sums) : null;
      actual = derived ?? (pcts[def.key]?.length ? round2(pcts[def.key].reduce((s, v) => s + v, 0) / pcts[def.key].length) : null);
    } else if (def.unit === "minutes") {
      const acc = mins[def.key];
      actual = acc && acc.n ? round2(acc.sum / acc.n) : null;
    } else {
      const derived = DERIVED_KEYS.has(def.key) ? deriveFromSums(def.key, sums) : null;
      actual = derived ?? (sums[def.key] !== undefined ? round2(sums[def.key]) : null);
    }

    const targetDaily = def.target;

    // Counts accumulate: period target = daily target × elapsed days.
    // Rates (%, talk time) keep the daily target — they don't accumulate.
    const periodTarget =
      targetDaily === null ? null : def.unit === "count" ? round2(targetDaily * daysElapsed) : targetDaily;

    const achievement =
      actual !== null && periodTarget !== null && periodTarget !== 0
        ? round2((actual / periodTarget) * 100)
        : null;

    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      kind: def.unit === "count" ? "sum" : def.unit === "percent" ? "rate" : "avg",
      targetDaily,
      periodTarget,
      actual,
      achievement,
      status: statusOf(achievement, targetDaily !== null, actual !== null),
      sampleCount: sample[def.key] || 0,
    };
  });

  const withData = kpis.filter((k) => k.achievement !== null);
  const overall = withData.length
    ? round2(withData.reduce((s, k) => s + (k.achievement as number), 0) / withData.length)
    : null;

  return {
    department,
    reportCount: reports.length,
    daysWithReports: days.size,
    overall,
    kpis,
  };
}

/** Cumulative per-department KPI sections for a set of reports (one period). */
export function buildDeptSections(
  reports: AggReport[],
  catalogue: KpiCatalogueRow[],
  daysElapsed: number,
): DeptSection[] {
  const byDept = new Map<string, AggReport[]>();
  for (const r of reports) {
    if (!r.department) continue;
    let arr = byDept.get(r.department);
    if (!arr) { arr = []; byDept.set(r.department, arr); }
    arr.push(r);
  }
  // Row source: the active KPI config catalogue (what report forms submit
  // against); template rows only as fallback for departments without config.
  const cfgByDept = new Map<string, RowDef[]>();
  for (const c of catalogue) {
    let arr = cfgByDept.get(c.department);
    if (!arr) { arr = []; cfgByDept.set(c.department, arr); }
    arr.push({ key: c.key, label: c.label, unit: asUnit(c.unit), target: c.defaultTarget, sortOrder: c.sortOrder });
  }
  for (const arr of cfgByDept.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);

  const depts = [...DEPT_ORDER.filter((d) => byDept.has(d)), ...[...byDept.keys()].filter((d) => !DEPT_ORDER.includes(d))];
  return depts.map((d) => {
    const rows = cfgByDept.get(d) ?? DEPT_ROWS[d] ?? [];
    return aggDept(d, rows, byDept.get(d) as AggReport[], daysElapsed);
  });
}

/** Achievement trend buckets ending at the selected period. */
export function buildTrends(
  dateStr: string,
  period: Period,
  reports: AggReport[],
  catalogue: KpiCatalogueRow[],
): TrendBucket[] {
  const d = dayOf(dateStr);
  const buckets: { start: Date; end: Date; label: string; daysElapsed: number }[] = [];

  if (period === "daily") {
    for (let i = 13; i >= 0; i--) {
      const day = new Date(d.getTime() - i * MS_DAY);
      buckets.push({
        start: day,
        end: new Date(day.getTime() + MS_DAY - 1),
        label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        daysElapsed: 1,
      });
    }
  } else if (period === "weekly") {
    const dow = d.getUTCDay();
    const monday = new Date(d.getTime() - ((dow + 6) % 7) * MS_DAY);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(monday.getTime() - i * 7 * MS_DAY);
      buckets.push({
        start,
        end: new Date(start.getTime() + 7 * MS_DAY - 1),
        label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        daysElapsed: i === 0 ? ((dow + 6) % 7) + 1 : 7,
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i + 1, 0, 23, 59, 59, 999));
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
        daysElapsed: i === 0 ? d.getUTCDate() : end.getUTCDate(),
      });
    }
  }

  return buckets.map((b) => {
    const inBucket = reports.filter((r) => {
      const rd = new Date(r.reportDate).getTime();
      return rd >= b.start.getTime() && rd <= b.end.getTime();
    });
    const secs = buildDeptSections(inBucket, catalogue, b.daysElapsed);
    const withData = secs.filter((s) => s.overall !== null);
    const achievement = withData.length
      ? round2(withData.reduce((s, x) => s + (x.overall as number), 0) / withData.length)
      : null;
    const highlights: Record<string, number> = {};
    for (const s of secs) {
      for (const k of s.kpis) {
        if (k.actual === null) continue;
        if (k.key === "totalCallsMade") highlights.calls = (highlights.calls || 0) + k.actual;
        if (k.key === "leadsGenerated") highlights.leads = (highlights.leads || 0) + k.actual;
        if (k.key === "postsPublished" || k.key === "postsCreated") highlights.posts = (highlights.posts || 0) + k.actual;
        if (k.key === "tasksCompleted") highlights.tasks = (highlights.tasks || 0) + k.actual;
      }
    }
    return {
      label: b.label,
      start: isoDay(b.start),
      end: isoDay(b.end),
      reportCount: inBucket.length,
      achievement,
      highlights,
    };
  });
}

/** Tailwind classes for an achievement chip (mirrors the dashboard tones). */
export function achievementTone(v: number | null): string {
  if (v === null) return "border-white/10 bg-white/5 text-zinc-400";
  if (v >= 100) return "border-emerald-400/30 bg-emerald-500/15 text-emerald-300";
  if (v >= 85) return "border-sky-400/30 bg-sky-500/15 text-sky-300";
  if (v >= 70) return "border-amber-400/30 bg-amber-500/15 text-amber-300";
  return "border-rose-400/30 bg-rose-500/15 text-rose-300";
}
