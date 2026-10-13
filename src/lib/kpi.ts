import { AGENT_KPI_DEFS, getKpiDef } from "@/lib/template-config";

export interface KpiMetric {
  key: string;
  label: string;
  target: number | null;
  targetLabel: string;
  actual: number | null;
  variance: number | null;
  unit: "count" | "percent" | "minutes";
  category: string;
  auto: boolean;
  notes: string;
  mandatory?: boolean;
}

/** Safe division — returns null when denominator is 0/missing */
export function safeDiv(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined || denominator === 0) return null;
  const v = (numerator / denominator) * 100;
  return Math.round(v * 100) / 100;
}

export function getNumeric(metrics: KpiMetric[], key: string): number | null {
  const m = metrics.find((x) => x.key === key);
  if (!m || m.actual === null || m.actual === undefined || Number.isNaN(m.actual)) return null;
  return m.actual;
}

/** Evaluate a derived formula like "a/b*100", "a+b", or "(a+b)/c*100" against metric values. */
function evalFormula(formula: string, metrics: KpiMetric[]): number | null {
  // Pattern: "(a+b)/c*100" — sum of two metrics divided by a third
  const sumDivMatch = formula.match(/^\(?(\w+)\+(\w+)\)?\/(\w+)\*(\d+)$/);
  if (sumDivMatch) {
    const a = getNumeric(metrics, sumDivMatch[1]);
    const b = getNumeric(metrics, sumDivMatch[2]);
    const c = getNumeric(metrics, sumDivMatch[3]);
    const mult = parseFloat(sumDivMatch[4]);
    if (a === null || b === null || c === null || c === 0) return null;
    return Math.round(((a + b) / c) * mult * 100) / 100;
  }
  // Pattern: "a+b"
  const addMatch = formula.match(/^(\w+)\+(\w+)$/);
  if (addMatch) {
    const a = getNumeric(metrics, addMatch[1]);
    const b = getNumeric(metrics, addMatch[2]);
    if (a === null || b === null) return null;
    return a + b;
  }
  // Pattern: "a/b*100"
  const divMatch = formula.match(/^(\w+)\/(\w+)\*?(\d*)$/);
  if (divMatch) {
    const a = getNumeric(metrics, divMatch[1]);
    const b = getNumeric(metrics, divMatch[2]);
    const mult = divMatch[3] ? parseFloat(divMatch[3]) : 1;
    if (a === null || b === null || b === 0) return null;
    return Math.round(a / b * mult * 100) / 100;
  }
  return null;
}

/**
 * Recompute derived KPIs and variances.
 * Missing data is never treated as zero — derived values stay null when inputs are missing.
 */
export function recalcKpis(metrics: KpiMetric[]): KpiMetric[] {
  const out = metrics.map((m) => ({ ...m }));
  for (const m of out) {
    const def = getKpiDef(m.key);
    if (def?.derivedFrom) {
      const manual = m.actual !== null && !m.auto;
      if (!manual) {
        const v = evalFormula(def.derivedFrom, out);
        if (v !== null) {
          m.actual = v;
          m.auto = true;
        } else if (m.auto) {
          m.actual = null; // inputs missing — do not fake zero
          m.auto = false;
        }
      }
    }
    if (m.actual !== null && m.target !== null && m.target !== 0) {
      m.variance = Math.round((m.actual - m.target) * 100) / 100;
    } else if (m.actual !== null && m.target === 0) {
      m.variance = m.actual; // zero target: variance = actual
    } else {
      m.variance = null;
    }
  }
  return out;
}

/** achievement % = actual / target * 100 (higher is better) */
export function achievementPct(m: KpiMetric): number | null {
  if (m.actual === null || m.target === null || m.target === 0) return null;
  return Math.round((m.actual / m.target) * 10000) / 100;
}

export function isShortfall(m: KpiMetric): boolean {
  const ach = achievementPct(m);
  if (ach === null) return false;
  if (m.unit === "minutes") {
    // Wrap-up / talk-time style: treat >150% of target as concern only for LOWER_BETTER style metrics
    return false;
  }
  return ach < 80; // below 80% of target = shortfall
}

export function formatMetricValue(v: number | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "percent") return `${v}%`;
  return String(v);
}

/** Aggregate agent KPI metrics into supervisor team averages / best / lowest performer rows */
export function aggregateTeamKpis(
  agentReports: { userName: string; kpiMetrics: string | null }[]
): { key: string; label: string; teamTarget: number | null; teamAvg: number | null; best: string | null; bestVal: number | null; lowest: string | null; lowestVal: number | null }[] {
  const perUser = agentReports
    .map((r) => {
      let metrics: KpiMetric[] = [];
      try {
        metrics = r.kpiMetrics ? JSON.parse(r.kpiMetrics) : [];
      } catch {}
      return { userName: r.userName, map: new Map(metrics.map((m) => [m.key, m.actual])) };
    })
    .filter((x) => x.map.size > 0);

  return AGENT_KPI_DEFS.filter((d) => d.category === "CORE_TEMPLATE").map((def) => {
    const vals = perUser
      .map((u) => ({ name: u.userName, v: u.map.get(def.key) ?? null }))
      .filter((x): x is { name: string; v: number } => x.v !== null);
    const teamTarget = def.target;
    const avg = vals.length ? Math.round((vals.reduce((s, x) => s + x.v, 0) / vals.length) * 100) / 100 : null;
    let best = null as null | { name: string; v: number };
    let lowest = null as null | { name: string; v: number };
    for (const x of vals) {
      if (!best || x.v > best.v) best = x;
      if (!lowest || x.v < lowest.v) lowest = x;
    }
    let avgFinal = avg;
    if (def.key === "avgCallsPerAgent") {
      const calls = vals.reduce((s, x) => s + x.v, 0);
      avgFinal = vals.length ? Math.round((calls / vals.length) * 100) / 100 : null;
    }
    return {
      key: def.key,
      label: def.key === "avgCallsPerAgent" ? "Avg. Calls Per Agent" : def.label,
      teamTarget,
      teamAvg: avgFinal,
      best: best?.name ?? null,
      bestVal: best?.v ?? null,
      lowest: lowest?.name ?? null,
      lowestVal: lowest?.v ?? null,
    };
  });
}
