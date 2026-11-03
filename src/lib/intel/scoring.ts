import type { IntelKpiRow, PerformanceScore, ScoreComponent } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE SCORING FRAMEWORK (transparent & configurable).
//
// Components and default weights (SystemFlag `intel:scoring` overrides):
//   kpi          40 — mean KPI achievement (capped at 100 per KPI)
//   tasks        20 — task completion rate
//   punctuality  15 — on-time completion rate (excluded when no deadlines exist)
//   reporting    15 — daily-report compliance (submitted vs scheduled days)
//   attendance   10 — recorded attendance (excluded when not reliably recorded)
//
// Rules:
//  - A component without data is EXCLUDED and the remaining weights are
//    re-normalised — missing data never counts against an agent.
//  - Task completion and punctuality measure different aspects (volume vs
//    timeliness) and are kept as separate components; app engagement is
//    deliberately NOT scored (it measures activity, not productivity) and is
//    reported separately.
//  - The full component breakdown always accompanies a score.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  kpi: number;
  tasks: number;
  punctuality: number;
  reporting: number;
  attendance: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = { kpi: 40, tasks: 20, punctuality: 15, reporting: 15, attendance: 10 };

export async function loadScoringWeights(): Promise<ScoringWeights> {
  try {
    const { db } = await import("@/lib/db");
    const flag = await db.systemFlag.findUnique({ where: { key: "intel:scoring" } });
    if (!flag) return DEFAULT_WEIGHTS;
    const parsed = JSON.parse(flag.value) as Partial<ScoringWeights>;
    const clamp = (v: unknown, dflt: number) => (typeof v === "number" && v >= 0 && v <= 100 ? v : dflt);
    return {
      kpi: clamp(parsed.kpi, DEFAULT_WEIGHTS.kpi),
      tasks: clamp(parsed.tasks, DEFAULT_WEIGHTS.tasks),
      punctuality: clamp(parsed.punctuality, DEFAULT_WEIGHTS.punctuality),
      reporting: clamp(parsed.reporting, DEFAULT_WEIGHTS.reporting),
      attendance: clamp(parsed.attendance, DEFAULT_WEIGHTS.attendance),
    };
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

import { CLASSIFICATION_LABELS } from "./labels";
import { KPI_STATUS_LABELS as _KPI_STATUS_LABELS } from "./labels";
void _KPI_STATUS_LABELS;
export { CLASSIFICATION_LABELS };

function classify(score: number): string {
  if (score >= 90) return "OUTSTANDING";
  if (score >= 75) return "EXCEEDS_EXPECTATIONS";
  if (score >= 60) return "MEETS_EXPECTATIONS";
  if (score >= 45) return "NEEDS_IMPROVEMENT";
  return "UNSATISFACTORY";
}

export interface ScoreInputs {
  kpiAchPct: number | null;       // mean achievement across KPIs with data (each capped at 100)
  taskCompletionPct: number | null;
  taskPunctualityPct: number | null;
  reportingCompliancePct: number | null; // submitted / scheduled report days
  attendancePct: number | null;
  attendanceReliable: boolean;    // false → attendance component excluded
}

export function performanceScore(inputs: ScoreInputs, weights: ScoringWeights): PerformanceScore {
  const mk = (key: string, label: string, weight: number, pct: number | null, basis: string): ScoreComponent => ({
    key,
    label,
    weight,
    earned: pct === null ? null : Math.round((Math.min(100, Math.max(0, pct)) / 100) * weight * 100) / 100,
    basis,
    included: pct !== null && weight > 0,
  });
  const components: ScoreComponent[] = [
    mk("kpi", "KPI achievement", weights.kpi, inputs.kpiAchPct, "Mean achievement % across KPIs with target & actual data, each capped at 100%"),
    mk("tasks", "Task completion", weights.tasks, inputs.taskCompletionPct, "Completed tasks ÷ tasks assigned in the period"),
    mk("punctuality", "Task punctuality", weights.punctuality, inputs.taskPunctualityPct, "On-time completions ÷ completed tasks that had a deadline"),
    mk("reporting", "Reporting compliance", weights.reporting, inputs.reportingCompliancePct, "Distinct days with a submitted/approved report ÷ scheduled working days"),
    mk("attendance", "Attendance (recorded)", weights.attendance, inputs.attendanceReliable ? inputs.attendancePct : null, "Present or Late ÷ days with an attendance record — missing records are never counted as absence"),
  ];
  const included = components.filter((c) => c.included && c.earned !== null);
  const includedWeights = included.reduce((s, c) => s + c.weight, 0);
  const score = includedWeights > 0
    ? Math.round((included.reduce((s, c) => s + (c.earned as number), 0) / includedWeights) * 10000) / 100
    : null;
  return {
    score,
    components,
    includedWeights,
    classification: score === null ? "INSUFFICIENT_DATA" : classify(score),
  };
}

// ── KPI achievement (direction-aware) ───────────────────────────────────────

export interface KpiTargetActual {
  key: string;
  label: string;
  unit: string;
  direction: string;
  target: number | null;
  actual: number | null;
  notes?: string;
}

/**
 * Direction-aware achievement %.
 *  HIGHER_BETTER: actual ÷ target × 100 (capped at 200 for display sanity).
 *  LOWER_BETTER (error rates, hold times — maximum thresholds): the inverse —
 *  target ÷ actual × 100, so coming in UNDER target reads as ≥100%, never as
 *  a failure. actual = 0 with a positive target is a perfect result.
 */
export function kpiAchievementPct(row: KpiTargetActual): number | null {
  if (row.actual === null || row.target === null) return null;
  if (row.direction === "LOWER_BETTER") {
    if (row.target === 0) return null; // zero target on a lower-is-better metric is not measurable
    if (row.actual === 0) return 200;  // perfect — nothing to reduce
    return Math.min(200, Math.round((row.target / row.actual) * 10000) / 100);
  }
  if (row.target === 0) return null;
  return Math.min(200, Math.round((row.actual / row.target) * 10000) / 100);
}

/** Performance status with clear, explained bands. */
export function kpiStatus(row: KpiTargetActual, ach: number | null): string {
  if (row.actual === null || row.target === null) return "INSUFFICIENT_DATA";
  if (ach === null) return "INSUFFICIENT_DATA";
  if (ach >= 110) return "EXCEEDED";
  if (ach >= 95) return "MET";
  if (ach >= 80) return "APPROACHING";
  if (ach >= 50) return "BELOW";
  return "CRITICAL";
}

export { KPI_STATUS_LABELS } from "./labels";

export function analyseKpiRows(rows: KpiTargetActual[]): IntelKpiRow[] {
  return rows.map((r) => {
    const ach = kpiAchievementPct(r);
    const variance = r.actual !== null && r.target !== null
      ? Math.round((r.actual - r.target) * 100) / 100
      : null;
    return {
      key: r.key,
      label: r.label,
      unit: r.unit,
      direction: r.direction,
      target: r.target,
      actual: r.actual,
      variance,
      achievementPct: ach,
      status: kpiStatus(r, ach),
      notes: r.notes,
    };
  });
}

/** Mean KPI achievement for the score (each KPI capped at 100). */
export function meanKpiAchievement(rows: IntelKpiRow[]): number | null {
  const vals = rows.filter((r) => r.achievementPct !== null).map((r) => Math.min(100, r.achievementPct as number));
  if (!vals.length) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
}
