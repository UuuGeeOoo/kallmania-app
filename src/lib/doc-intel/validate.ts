// ─────────────────────────────────────────────────────────────────────────────
// STAGE E — VALIDATION (code, never an LLM judgement)
//
// Pattern adapted from the genai_agents "Human-in-the-Loop Approval Agent":
// validation of proposed mutations is deterministic code, so invalid values
// cannot be smuggled through a reviewer; the reviewer (agent/supervisor) sees
// explicit issues and must confirm before anything becomes a report.
// ─────────────────────────────────────────────────────────────────────────────
import { getKpiDef } from "@/lib/template-config";
import type { DocIntelDepartment, FullExtraction, RoutedKpi, ValidationIssue } from "./types";

const PERCENT_KEYS = new Set(["contactRate", "conversionRate", "slaAdherence", "scheduleAdherence", "engagementRate", "calendarAdherence"]);
const REASONABLE_MAX = 1_000_000;

function validateValue(r: RoutedKpi): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (r.value === null) return issues;
  if (!Number.isFinite(r.value)) {
    issues.push({ severity: "ERROR", field: r.key, message: `${r.label}: value is not a finite number.` });
    return issues;
  }
  if (r.value < 0) {
    issues.push({ severity: "WARNING", field: r.key, message: `${r.label}: negative value (${r.value}). Preserved as reported — confirm it is genuinely negative (e.g. a variance), not a misread minus sign.` });
  }
  if (PERCENT_KEYS.has(r.key) && r.value > 100) {
    issues.push({ severity: "WARNING", field: r.key, message: `${r.label}: percent value above 100 (${r.value}%). Preserved as reported — verify.` });
  }
  if (r.value > REASONABLE_MAX) {
    issues.push({ severity: "WARNING", field: r.key, message: `${r.label}: unusually large value (${r.value}). Verify it is not a misread total.` });
  }
  const def = getKpiDef(r.key);
  if (def?.target !== null && def?.target !== undefined && typeof r.value === "number") {
    if (def.unit === "count" && r.value > def.target * 20 + 100) {
      issues.push({ severity: "INFO", field: r.key, message: `${r.label}: reported ${r.value} vs configured target ${def.target} — far above target; verify the value was read from the correct row.` });
    }
  }
  return issues;
}

/** Formula consistency: reported variance vs target − actual, and reported target vs configured target. */
function validateFormulaConsistency(routed: RoutedKpi[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const r of routed) {
    const def = getKpiDef(r.key);
    if (r.reportedVariance !== null && r.reportedVariance !== undefined && def && def.target !== null) {
      // actual may live on the ACTUAL row of the same key
      const actualRow = routed.find((x) => x.key === r.key && x.kind === "ACTUAL" && x.value !== null);
      if (actualRow && typeof actualRow.value === "number") {
        const expected = Math.round(((actualRow.value as number) - (def.target as number)) * 100) / 100;
        if (Math.abs(expected - r.reportedVariance) > 0.01) {
          issues.push({
            severity: "WARNING",
            field: r.key,
            message: `${r.label}: document reports variance ${r.reportedVariance} but target − actual computes to ${expected}. The reported figure is preserved in the source record; the report uses the recalculated value.`,
          });
        }
      }
    }
  }
  return issues;
}

/** Coverage: which template fields the source document never mentioned. */
function coverageIssues(department: DocIntelDepartment, routed: RoutedKpi[], fieldsTotal: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mappedKeys = new Set(routed.filter((r) => r.value !== null).map((r) => r.key));
  if (department === "BPO") {
    for (const def of ["totalCallsMade", "totalMailsSent", "callsConnected", "successfulMailsSent"]) {
      const d = getKpiDef(def);
      if (d?.mandatory && !mappedKeys.has(def)) {
        issues.push({ severity: "INFO", field: def, message: `${d.label}: the source document does not state this mandatory metric — leave it empty rather than inventing a value.` });
      }
    }
  }
  if (mappedKeys.size === 0 && fieldsTotal > 0) {
    issues.push({ severity: "WARNING", field: "extraction", message: "No metric in the document matched a template field. Check the Full extraction tab — the content is preserved there and can be copied into fields manually." });
  }
  return issues;
}

export function runValidation(
  department: DocIntelDepartment,
  routed: RoutedKpi[],
  full: Pick<FullExtraction, "coverage">
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const r of routed) issues.push(...validateValue(r));
  issues.push(...validateFormulaConsistency(routed));
  issues.push(...coverageIssues(department, routed, full.coverage.fieldsTotal));
  return issues;
}
