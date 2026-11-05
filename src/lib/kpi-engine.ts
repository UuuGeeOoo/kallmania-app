import type { SbtsEvent } from "@prisma/client";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/integrations/sbts";
import { worksOn } from "@/lib/schedule";

// ─────────────────────────────────────────────────────────────────────────────
// REPORT-BASED KPI CALCULATION ENGINE — Social Media (SBTS Media Scoreboard)
// and Web Development/Technical teams.
//
// Three responsibilities:
//   1. PARSE the operational reports the way they actually arrive. SBTS
//      daily.report text carries "Target X | Actual Y | Variance Z" KPI rows
//      (role-specific per agent), inline "5 (+4)" rows, and weekly RAG rows —
//      including rows whose Actual was never reported ("Actual -"), which are
//      flagged NO_DATA and never become zeros.
//   2. MATERIALIZE every parsed value into a normalized KpiResult row
//      (idempotent dedupeKey, provenance + extraction confidence), so the
//      dashboards read calculated records instead of raw reports.
//   3. CALCULATE cumulative performance the way the brief demands: cumulative
//      target = Σ daily targets, cumulative actual = Σ daily actuals,
//      achievement = cumulative actual ÷ cumulative target (never an average
//      of daily percentages), with same-day report collapse, missing-day
//      flags from the workDays mask, and a strictly task-based profile for
//      Web Development/Technical agents (assigned vs completed deliverables,
//      overdue/outstanding/blocked, bugs reported ≠ bugs resolved).
//
// The AI-free arithmetic guarantee: this module only parses what the source
// report states and derives targets that are arithmetic inversions of stated
// variances. It never invents a target, an actual, or a completion.
// ─────────────────────────────────────────────────────────────────────────────

export type ExtractionConfidence = "HIGH" | "MEDIUM" | "LOW";
export type SbtsRowFormat = "tv" | "inline" | "rag";

export interface SbtsKpiLine {
  /** 1-based position among the parsed KPI rows of the report. */
  rowIndex: number;
  /** KPI name as written in the report (null when the source line has no name). */
  name: string | null;
  /** Stable key for cumulative grouping (derived from the name, or rowN). */
  slug: string;
  target: number | null;
  actual: number | null;
  variance: number | null;
  unit: "count" | "percent";
  /** daily rows feed the cumulative engine; weekly/RAG rows are kept but excluded. */
  periodKind: "daily" | "weekly";
  confidence: ExtractionConfidence;
  format: SbtsRowFormat;
  /** Human-readable note about where the numbers came from. */
  evidence: string;
}

const MS_DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Normalize a reported KPI name into a stable snake_case key. */
export function slugifyKpi(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[%/]/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return s || "kpi";
}

/** Parse a numeric token the way reports write them: "2", "90%", "≤1",
 *  "4 of 5" → 4, "2/2 shifts covered" → 2, "Same-day" / "-" / "" → null. */
function parseNumericToken(raw: string): number | null {
  if (raw === null || raw === undefined) return null;
  let s = raw.trim();
  if (!s || s === "-" || s === "—" || s === "_" || /^n\/?a$/i.test(s)) return null;
  s = s.replace(/^[≤>=≤]+\s*/, "");
  // "4 of 5" / "2/2 shifts covered" → the achieved count (first number)
  const ofMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:of\s*\d+|\/\s*\d+)/i);
  if (ofMatch) s = ofMatch[1];
  const m = s.match(/-?\d+(?:,\d{3})*(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** "2/2 shifts covered" or "4 of 5" expressed as a percent (N/M × 100) —
 *  used when the row's unit is percent and the actual reads as a fraction. */
function parsePercentFraction(raw: string): number | null {
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(?:of|\/)\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const denom = Number(m[2]);
  if (!denom) return null;
  return Math.round((Number(m[1]) / denom) * 10000) / 100;
}

const isPercentToken = (s: string) => s.includes("%");

/** "On target", "+2", "-5", "+20%", "-" → variance number or null. */
function parseVarianceToken(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.startsWith("on target") || s === "met" || s === "0") return 0;
  const m = s.match(/^([+-]?)\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[2]);
  return m[1] === "-" ? -n : n;
}

// Format A value line: "Target 2 | Actual 3 | Variance +1" (Variance segment
// is optional — weekly RAG rows end with "| RAG Amber").
const TV_LINE =
  /Target\s+([^|]+?)\s*\|\s*Actual\s+([^|]+?)(?:\s*\|\s*(?:Variance\s+)?([^|]+?))?\s*$/i;
// Numbered KPI name line: "1. Platform posts scheduled / published"
const NAME_LINE = /^\s*(\d+)[.)]\s+(.{2,120}?)\s*$/;
// Format B inline row (Chima format): "- 5 (+4) - COMPLETED AND SUBMITTED…"
const INLINE_LINE =
  /^[-•*]\s*(\d+(?:\.\d+)?)\s*(?:\(\s*([^)]*?)\s*\))?\s*-\s*(\S.+)$/;

/**
 * Parse every KPI row out of an SBTS daily/weekly report text.
 * Handles the three real formats on record:
 *   A) "N. Name" + "Target T | Actual A | Variance V"   (role-specific reports)
 *   B) "- A (+V) - description"                          (inline compact rows)
 *   C) weekly summary rows ending in "RAG colour"        (kept, never daily-summed)
 * Missing actuals ("Actual -") parse as null — an incomplete extraction, not a zero.
 */
export function parseSbtsReportKpiLines(text: string | null | undefined): SbtsKpiLine[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const rows: SbtsKpiLine[] = [];
  let lastNamed: { name: string; lineIdx: number } | null = null;
  let occurrence = new Map<string, number>();
  // Inline "- 5 (+4) - …" rows only count inside an explicit "KPIs:" block;
  // the same bullet shape elsewhere ("- FACEBOOK, … / Complete / …") is a task line.
  let inKpiBlock = false;

  const push = (r: Omit<SbtsKpiLine, "rowIndex" | "slug"> & { name: string | null }) => {
    let slug = r.name ? slugifyKpi(r.name) : `row${rows.length + 1}`;
    const seen = occurrence.get(slug) ?? 0;
    occurrence.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}_${seen + 1}`;
    rows.push({ ...r, slug, rowIndex: rows.length + 1 });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track the "KPIs:" … "Tasks:" block for inline rows.
    if (/^kpis?\b\s*:?$/i.test(trimmed)) { inKpiBlock = true; continue; }
    if (/^(tasks?|assignments?|notes?|handoff|work done|escalations?)\b/i.test(trimmed)) inKpiBlock = false;

    // Track the most recent numbered name line so a value line can attach to it.
    const nameMatch = line.match(NAME_LINE);
    if (nameMatch && !TV_LINE.test(line)) {
      const candidate = nameMatch[2].trim();
      // Section titles like "1. Lead today's calendar…" inside TASKS sections
      // are only names if a Target/Actual value line follows within 3 lines.
      const upcoming = lines.slice(i + 1, i + 4).join(" ");
      if (TV_LINE.test(upcoming)) lastNamed = { name: candidate, lineIdx: i };
      continue;
    }

    const tv = line.match(TV_LINE);
    if (tv && /target/i.test(line) && /actual/i.test(line)) {
      const weekly = /RAG\s*(Red|Amber|Green)?/i.test(line) || /\brag\b/i.test(line);
      const targetRaw = tv[1] ?? "";
      const actualRaw = tv[2] ?? "";
      const varianceRaw = (tv[3] ?? "").trim();
      const target = parseNumericToken(targetRaw);
      let actual = parseNumericToken(actualRaw);
      const unit: "count" | "percent" =
        isPercentToken(targetRaw) || isPercentToken(actualRaw) || (lastNamed?.name?.includes("%") ?? false)
          ? "percent"
          : "count";
      // "Target 100% complete | Actual 2/2 shifts covered" — a fraction under a
      // percent unit is a completion rate, not a bare count of 2.
      if (unit === "percent") {
        const frac = parsePercentFraction(actualRaw);
        if (frac !== null) actual = frac;
      }
      const variance = parseVarianceToken(varianceRaw);
      const name = lastNamed && i - lastNamed.lineIdx <= 3 ? lastNamed.name : null;
      const confidence: ExtractionConfidence =
        target !== null && actual !== null ? "HIGH" : name && (target !== null || actual !== null) ? "HIGH" : "MEDIUM";
      push({
        name,
        target,
        actual,
        variance,
        unit,
        periodKind: weekly ? "weekly" : "daily",
        confidence,
        format: weekly ? "rag" : "tv",
        evidence: `Source line ${i + 1}: "${line.trim().slice(0, 120)}"`,
      });
      lastNamed = null;
      continue;
    }

    const inline = line.match(INLINE_LINE);
    if (inline && inKpiBlock) {
      const actual = Number(inline[1]);
      const paren = (inline[2] ?? "").trim();
      const variance = parseVarianceToken(paren || "On target");
      const target = variance !== null ? Math.round((actual - variance) * 100) / 100 : null;
      const desc = inline[3].trim();
      push({
        name: null,
        target,
        actual,
        variance,
        unit: actual > 150 ? "percent" : "count", // an unlabeled 100 row is a rate in practice
        periodKind: "daily",
        confidence: target !== null ? "MEDIUM" : "LOW",
        format: "inline",
        evidence: `Inline "actual (variance)" row ${rows.length + 1}: actual ${actual}, variance ${variance ?? "unstated"} → target = actual − variance${variance === null ? " (not derivable)" : ""}; source line ${i + 1}: "${desc.slice(0, 90)}"`,
      });
    }
  }
  return rows;
}

// ── Direction-aware achievement ──────────────────────────────────────────────

/** Direction-aware achievement % and status label (shortfall convention: <80%).
 *  Time budgets (unit "minutes"): at/under target = 100%+, over degrades. */
export function achievementFor(
  actual: number,
  target: number | null | undefined,
  unit: string,
): { achievement: number | null; statusLabel: string } {
  if (target === null || target === undefined || target === 0) return { achievement: null, statusLabel: "NO_TARGET" };
  const t = target as number;
  let pct: number;
  if (unit === "minutes") {
    if (actual <= 0) return { achievement: t > 0 ? 0 : null, statusLabel: t > 0 ? "BELOW_TARGET" : "NO_TARGET" };
    pct = Math.round((t / actual) * 10000) / 100;
  } else {
    pct = Math.round((actual / t) * 10000) / 100;
  }
  if (!Number.isFinite(pct)) return { achievement: null, statusLabel: "NO_TARGET" };
  const status = pct >= 100 ? "MET" : pct >= 80 ? "ON_TRACK" : "BELOW_TARGET";
  return { achievement: pct, statusLabel: status };
}

const LOWER_BETTER_KEY_RE = /(response.?time|resolution.?time|handle.?time|talk.?time|hold.?time|wrap.?up|avg.*hours|avg.*mins|downtime)/i;

/** Resolve a KPI's direction: configured catalogue value → unit convention →
 *  conservative name heuristic → HIGHER_BETTER. */
export function resolveKpiDirection(
  directions: Map<string, string> | null | undefined,
  key: string,
  unit: string,
): "HIGHER_BETTER" | "LOWER_BETTER" {
  const configured = directions?.get(key);
  if (configured === "LOWER_BETTER") return "LOWER_BETTER";
  if (configured === "HIGHER_BETTER") return "HIGHER_BETTER";
  if (unit === "minutes") return "LOWER_BETTER";
  if (LOWER_BETTER_KEY_RE.test(key)) return "LOWER_BETTER";
  return "HIGHER_BETTER";
}

/** Direction-aware achievement % for one row (delegates to the shared math). */
export function rowAchievement(
  actual: number,
  target: number | null,
  unit: string,
  direction: "HIGHER_BETTER" | "LOWER_BETTER" = "HIGHER_BETTER",
): { achievement: number | null; statusLabel: string } {
  if (direction === "LOWER_BETTER" && unit !== "minutes") {
    // Same convention as minutes: at/under target = 100%+, over degrades.
    if (target === null || target === undefined || target === 0) return { achievement: null, statusLabel: "NO_TARGET" };
    if (actual <= 0) return { achievement: 100, statusLabel: "MET" };
    const pct = Math.round((target / actual) * 10000) / 100;
    return { achievement: pct, statusLabel: pct >= 100 ? "MET" : pct >= 80 ? "ON_TRACK" : "BELOW_TARGET" };
  }
  return achievementFor(actual, target, unit);
}

// ── SBTS daily.report materialization ────────────────────────────────────────

type KpiResultUpsert = {
  dedupeKey: string;
  userId: string;
  team: string | null;
  department: string;
  kpiKey: string;
  label: string;
  unit: string;
  target: number | null;
  actual: number | null;
  achievement: number | null;
  statusLabel: string;
  source: string;
  reportId: string | null;
  sbtsEventId: string | null;
  reportDate: Date;
  periodMonth: string;
  verification: string;
  extractionConfidence: string | null;
  evidence: string | null;
};

const monthKey = (d: Date) => d.toISOString().slice(0, 7);

async function upsertKpiResult(row: KpiResultUpsert): Promise<"created" | "updated" | "unchanged"> {
  const existing = await db.kpiResult.findUnique({ where: { dedupeKey: row.dedupeKey } });
  if (!existing) {
    try {
      await db.kpiResult.create({ data: row });
      return "created";
    } catch (err) {
      if (isUniqueViolation(err)) return "unchanged";
      throw err;
    }
  }
  const changed =
    existing.actual !== row.actual ||
    existing.target !== row.target ||
    existing.verification !== row.verification ||
    existing.extractionConfidence !== row.extractionConfidence ||
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
      extractionConfidence: row.extractionConfidence,
      evidence: row.evidence,
      revision: { increment: 1 },
      previousActual: existing.actual,
    },
  });
  return "updated";
}

/**
 * Materialize KpiResult rows from an SBTS daily.report event by parsing its
 * embedded KPI rows. Values are stored exactly as reported — targets come
 * from the scoreboard report itself (the configured daily target per §2.C),
 * missing actuals become flagged NO_DATA rows (never zeros), weekly RAG rows
 * are stored under weekly_ keys that the cumulative engine excludes from
 * daily math. Idempotent per eventId.
 */
export async function materializeSbtsReportKpiResults(event: SbtsEvent, owner: { id: string; team: string | null; department: string }): Promise<number> {
  if (!event.report) return 0;
  const parsed = parseSbtsReportKpiLines(event.report);
  if (!parsed.length) return 0;
  const eventDate = new Date(event.eventDate + "T00:00:00.000Z");
  let n = 0;
  for (const row of parsed) {
    const kpiKey = (row.periodKind === "weekly" ? "weekly_" : "") + row.slug;
    const hasAnyValue = row.target !== null || row.actual !== null || row.variance !== null;
    if (!hasAnyValue && !row.name) continue; // fully unparseable junk line
    const { achievement, statusLabel } =
      row.actual === null
        ? { achievement: null, statusLabel: "NO_DATA" }
        : row.target === null
          ? { achievement: null, statusLabel: "NO_TARGET" }
          : rowAchievement(row.actual, row.target, row.unit);
    const label = row.name ?? `SBTS KPI row ${row.rowIndex}`;
    const evidence = JSON.stringify({
      format: row.format,
      periodKind: row.periodKind,
      reportedName: row.name,
      targetReported: row.target,
      actualReported: row.actual,
      varianceReported: row.variance,
      note:
        row.actual === null
          ? "Actual was not reported in the source row — incomplete extraction, flagged for review; never counted as zero."
          : row.format === "inline"
            ? "Target derived arithmetically as actual − stated variance."
            : "Values read directly from the reported Target | Actual | Variance row.",
      source: row.evidence,
    });
    n += (await upsertKpiResult({
      dedupeKey: `sbts-report:${event.eventId}:${row.slug}`,
      userId: owner.id,
      team: owner.team,
      department: owner.department,
      kpiKey,
      label,
      unit: row.unit,
      target: row.target,
      actual: row.actual,
      achievement,
      statusLabel,
      source: "SBTS",
      reportId: null,
      sbtsEventId: event.id,
      reportDate: eventDate,
      periodMonth: monthKey(eventDate),
      verification: "SUBMITTED",
      extractionConfidence: row.confidence,
      evidence,
    }) === "unchanged" ? 0 : 1);
  }
  return n;
}

// ── Cumulative KPI engine (§2.F) ─────────────────────────────────────────────

export interface CumulativeKpi {
  kpiKey: string;
  label: string;
  unit: string;
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
  /** Most recent non-null daily target — the configured daily bar. */
  dailyTarget: number | null;
  cumulativeTarget: number | null;
  cumulativeActual: number | null;
  cumulativeVariance: number | null;
  /** cumulative actual ÷ cumulative target — never an average of daily %s. */
  achievementPct: number | null;
  status: "MET" | "ON_TRACK" | "BELOW_TARGET" | "NO_TARGET" | "NO_DATA";
  days: { reported: number; met: number; exceeded: number; missed: number; noData: number };
  firstDate: string | null;
  lastDate: string | null;
  sources: Record<string, number>;
  /** Provenance: report refs / SBTS event ids backing this KPI. */
  evidence: string[];
}

export interface CumulativeReporting {
  expectedDays: number;
  reportedDays: number;
  missingDates: string[];
  missingCount: number;
  consistencyPct: number | null;
  /** Days flagged NO_DATA inside otherwise-filed reports (incomplete extraction). */
  incompleteExtractionDays: number;
  /** Same-day duplicate records collapsed (latest wins) so nothing double-counts. */
  supersededSameDay: number;
  note: string;
}

export interface CumulativeResult {
  kpis: CumulativeKpi[];
  /** Weekly RAG rows — displayed separately, never mixed into daily cumulative. */
  weekly: CumulativeKpi[];
  reporting: CumulativeReporting;
  overall: { achievementPct: number | null; basis: string; cumulativeTarget: number | null; cumulativeActual: number | null };
}

export interface RawKpiRecord {
  kpiKey: string;
  label: string;
  unit: string;
  target: number | null;
  actual: number | null;
  achievement: number | null;
  statusLabel: string | null;
  source: string;
  reportDate: Date;
  updatedAt: Date;
  reportRef?: string | null;
  sbtsEventId?: string | null;
}

function statusOfPct(pct: number | null, hasTarget: boolean, hasActual: boolean): CumulativeKpi["status"] {
  if (!hasActual) return "NO_DATA";
  if (!hasTarget || pct === null) return "NO_TARGET";
  if (pct >= 100) return "MET";
  if (pct >= 80) return "ON_TRACK";
  return "BELOW_TARGET";
}

/**
 * Compute sum-based cumulative KPIs from raw records (one user, one window).
 * Same-day duplicates collapse to the latest record (an agent's second
 * daily.report of a day supersedes the first — no double counting).
 * Lower-better KPIs invert the ratio (target ÷ actual). Rows whose actual was
 * never reported stay out of the sums and are counted as noData days.
 */
export function computeCumulativeKpi(
  records: RawKpiRecord[],
  directions: Map<string, string> | null | undefined,
  opts: { expectedDays?: number; reportedDates?: Set<string>; windowLabel?: string } = {},
): CumulativeResult {
  // 1. Collapse same-day duplicates per KPI (latest record wins).
  const byKeyDate = new Map<string, RawKpiRecord>();
  let superseded = 0;
  for (const r of records) {
    const d = isoDay(new Date(r.reportDate));
    const k = `${r.kpiKey}|${d}`;
    const cur = byKeyDate.get(k);
    if (!cur) byKeyDate.set(k, r);
    else {
      superseded += 1;
      if (new Date(r.updatedAt).getTime() >= new Date(cur.updatedAt).getTime()) byKeyDate.set(k, r);
    }
  }
  const kept = [...byKeyDate.values()];

  // 2. Group by KPI key.
  const groups = new Map<string, RawKpiRecord[]>();
  for (const r of kept) {
    const arr = groups.get(r.kpiKey) ?? [];
    arr.push(r);
    groups.set(r.kpiKey, arr);
  }

  const build = (key: string, rows: RawKpiRecord[]): CumulativeKpi => {
    const sorted = [...rows].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
    const unit = sorted[0]?.unit ?? "count";
    const direction = resolveKpiDirection(directions, key, unit);
    let targetSum: number | null = null;
    let actualSum: number | null = null;
    let varianceSum: number | null = null;
    let met = 0, exceeded = 0, missed = 0, noData = 0;
    const sources: Record<string, number> = {};
    const evidence: string[] = [];
    for (const r of sorted) {
      sources[r.source] = (sources[r.source] ?? 0) + 1;
      if (r.reportRef) evidence.push(r.reportRef);
      else if (r.sbtsEventId) evidence.push(r.sbtsEventId);
      if (r.actual === null || r.actual === undefined) { noData += 1; continue; }
      actualSum = (actualSum ?? 0) + r.actual;
      if (r.target !== null && r.target !== undefined) {
        targetSum = (targetSum ?? 0) + r.target;
        varianceSum = (varianceSum ?? 0) + (r.actual - r.target);
      }
      const d = direction === "LOWER_BETTER"
        ? r.target ? Math.round((r.target / Math.max(r.actual, Number.EPSILON)) * 10000) / 100 : null
        : r.target ? Math.round((r.actual / r.target) * 10000) / 100 : null;
      if (d === null) continue;
      if (d > 100) exceeded += 1;
      else if (d >= 100) met += 1;
      else missed += 1;
    }
    let achievementPct: number | null = null;
    if (actualSum !== null && targetSum !== null && targetSum !== 0) {
      achievementPct = direction === "LOWER_BETTER"
        ? Math.round((targetSum / Math.max(actualSum, Number.EPSILON)) * 10000) / 100
        : Math.round((actualSum / targetSum) * 10000) / 100;
    }
    const dailyTarget = [...sorted].reverse().find((r) => r.target !== null)?.target ?? null;
    return {
      kpiKey: key,
      label: sorted[0]?.label ?? key,
      unit,
      direction,
      dailyTarget,
      cumulativeTarget: targetSum,
      cumulativeActual: actualSum,
      cumulativeVariance: varianceSum,
      achievementPct,
      status: statusOfPct(achievementPct, targetSum !== null, actualSum !== null),
      days: { reported: sorted.filter((r) => r.actual !== null).length, met, exceeded, missed, noData },
      firstDate: sorted.length ? isoDay(new Date(sorted[0].reportDate)) : null,
      lastDate: sorted.length ? isoDay(new Date(sorted[sorted.length - 1].reportDate)) : null,
      sources,
      evidence: [...new Set(evidence)].slice(0, 8),
    };
  };

  const dailyKeys = [...groups.keys()].filter((k) => !k.startsWith("weekly_"));
  const weeklyKeys = [...groups.keys()].filter((k) => k.startsWith("weekly_"));
  const kpis = dailyKeys.map((k) => build(k, groups.get(k) as RawKpiRecord[])).sort((a, b) => a.kpiKey.localeCompare(b.kpiKey));
  const weekly = weeklyKeys.map((k) => build(k, groups.get(k) as RawKpiRecord[])).sort((a, b) => a.kpiKey.localeCompare(b.kpiKey));

  // 3. Overall — the honest sum: Σ cumulative actuals ÷ Σ cumulative targets
  //    across higher-better KPIs that carry targets (lower-better KPIs are
  //    graded individually; mixing directions in one ratio would lie).
  const eligible = kpis.filter((k) => k.direction === "HIGHER_BETTER" && k.cumulativeTarget !== null && k.cumulativeActual !== null);
  const oTarget = eligible.reduce((s, k) => s + (k.cumulativeTarget as number), 0);
  const oActual = eligible.reduce((s, k) => s + (k.cumulativeActual as number), 0);
  const overallPct = oTarget > 0 ? Math.round((oActual / oTarget) * 10000) / 100 : null;

  // 4. Reporting coverage — expected working days from the mask vs days with
  //    any filed record. A day with no report is MISSING, never a zero.
  const reportedDates = opts.reportedDates ?? new Set(kept.map((r) => isoDay(new Date(r.reportDate))));
  const expectedDays = opts.expectedDays ?? 0;
  const incompleteDays = kept.filter((r) => r.actual === null).length;

  return {
    kpis,
    weekly,
    reporting: {
      expectedDays,
      reportedDays: reportedDates.size,
      missingDates: [],
      missingCount: Math.max(0, expectedDays - reportedDates.size),
      consistencyPct: expectedDays > 0 ? Math.round((Math.min(reportedDates.size, expectedDays) / expectedDays) * 10000) / 100 : null,
      incompleteExtractionDays: incompleteDays,
      supersededSameDay: superseded,
      note:
        "Cumulative achievement = Σ actuals ÷ Σ targets over reported days. Days without a report are flagged as missing (never counted as zero); a working day with no report does not inflate achievement.",
    },
    overall: {
      achievementPct: overallPct,
      basis: "Σ cumulative actuals ÷ Σ cumulative targets across higher-is-better KPIs with configured targets",
      cumulativeTarget: oTarget > 0 ? Math.round(oTarget * 100) / 100 : null,
      cumulativeActual: Math.round(oActual * 100) / 100,
    },
  };
}

/** Working days for a user inside [start,end] — workDays mask, capped by
 *  account creation and today (future days are never "missed"). */
export function expectedWorkingDays(
  workDays: string | null | undefined,
  start: Date,
  end: Date,
  createdAt: Date,
  today = new Date(),
): { count: number; dates: string[] } {
  const dates: string[] = [];
  const begin = Math.max(start.getTime(), new Date(new Date(createdAt).toISOString().slice(0, 10) + "T00:00:00.000Z").getTime());
  const finish = Math.min(end.getTime(), new Date(isoDay(today) + "T23:59:59.999Z").getTime());
  for (let t = begin; t <= finish; t += MS_DAY) {
    const d = new Date(t);
    if (worksOn(workDays, isoDay(d))) dates.push(isoDay(d));
  }
  return { count: dates.length, dates };
}

// ── Web Development / Technical task-based profile (§3, §5) ──────────────────

export interface TechWorkEntry {
  task: string;
  project?: string;
  status?: string;
  deliverable?: string;
  [k: string]: unknown;
}

export interface TechTaskProfile {
  assignedDeliverables: number;
  completedDeliverables: number;
  outstandingDeliverables: number;
  overdueDeliverables: number;
  completionRatePct: number | null;
  onTimeCompletionRatePct: number | null;
  tasksCompletedBeyondExpectation: number;
  carriedIn: number;
  blocked: number;
  bugsReported: number;
  bugsResolved: number;
  ticketsHandled: number | null;
  entries: { reportRef: string; date: string; task: string; project: string | null; status: string; deliverable: string | null; duplicate: boolean }[];
  outstandingWork: { label: string; kind: "OUTSTANDING" | "OVERDUE" | "BLOCKED"; detail: string }[];
  notes: string[];
  basis: Record<string, string>;
}

interface TaskLike {
  title: string;
  status: string;
  priority: string;
  dateAssigned: Date;
  deadline: Date | null;
  blocker: string | null;
  category: string | null;
  updatedAt: Date;
}

const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function entryStatus(status: string | undefined): "COMPLETED" | "BLOCKED" | "OUTSTANDING" {
  const s = (status ?? "").toLowerCase();
  if (s.includes("complet") || s.includes("done") || s.includes("closed") || s.includes("resolved")) return "COMPLETED";
  if (s.includes("block") || s.includes("pending_approval") || s.includes("await")) return "BLOCKED";
  return "OUTSTANDING";
}

/**
 * Task-based analysis for one WEB_DEV/TECH agent over a period.
 * Deliverable counts come from the reports' own assigned/completed metric rows
 * (the agent's declared assignment scope per §3.B — never a universal target);
 * work entries are deduped by normalized title per report (the same handoff
 * logged three times is one deliverable); Task records contribute deadline
 * discipline (on-time %, overdue, blocked) and carried-in preservation.
 */
export function buildTechTaskProfile(
  reports: { id: string; ref: string; reportDate: Date; status: string; kpiMetrics: string | null; workEntries: string | null }[],
  tasks: TaskLike[],
  now = new Date(),
): TechTaskProfile {
  const notes: string[] = [];
  const basis: Record<string, string> = {};

  // 1. Report-level deliverables — dedupe same-day reports (latest wins).
  const byDate = new Map<string, { id: string; ref: string; reportDate: Date; status: string; kpiMetrics: string | null; workEntries: string | null }>();
  let supersededReports = 0;
  for (const r of reports) {
    if (!["SUBMITTED", "APPROVED"].includes(r.status)) continue;
    const d = isoDay(new Date(r.reportDate));
    const cur = byDate.get(d);
    if (!cur) byDate.set(d, r);
    else { supersededReports += 1; if (new Date(r.reportDate).getTime() >= new Date(cur.reportDate).getTime()) byDate.set(d, r); }
  }
  if (supersededReports > 0) notes.push(`${supersededReports} same-day duplicate report(s) collapsed — only the latest report of each day counts.`);

  let assigned = 0;
  let completed = 0;
  let bugsReported = 0;
  let bugsResolved = 0;
  const entries: TechTaskProfile["entries"] = [];

  const metricSum = (metrics: { key: string; actual: number | null }[], keys: string[]) =>
    metrics.filter((m) => keys.includes(m.key) && m.actual !== null && Number.isFinite(Number(m.actual))).reduce((s, m) => s + Number(m.actual), 0);

  for (const r of byDate.values()) {
    let km: { key: string; actual: number | null }[] = [];
    try { km = r.kpiMetrics ? JSON.parse(r.kpiMetrics) : []; } catch { /* malformed rows carry no numbers */ }
    assigned += metricSum(km, ["ticketsAssigned", "tasksAssigned"]);
    completed += metricSum(km, ["ticketsCompleted", "tasksCompleted"]);
    // Bugs reported and bugs resolved are strictly separate counters (§5).
    bugsReported += metricSum(km, ["bugsReported"]);
    bugsResolved += metricSum(km, ["bugsResolved"]);

    let we: TechWorkEntry[] = [];
    try { we = r.workEntries ? JSON.parse(r.workEntries) : []; } catch { /* ignore malformed */ }
    const seen = new Set<string>();
    for (const e of we) {
      if (!e || typeof e.task !== "string" || !e.task.trim()) continue;
      const key = normTitle(e.task);
      const duplicate = seen.has(key);
      seen.add(key);
      entries.push({
        reportRef: r.ref,
        date: isoDay(new Date(r.reportDate)),
        task: e.task.trim(),
        project: typeof e.project === "string" ? e.project : null,
        status: entryStatus(e.status),
        deliverable: typeof e.deliverable === "string" && e.deliverable.trim() ? e.deliverable.trim() : null,
        duplicate,
      });
    }
  }
  const uniqueEntries = entries.filter((e) => !e.duplicate);
  if (entries.some((e) => e.duplicate)) notes.push("Repeated work entries within a report (same normalized title) are counted once — no double-counted deliverables.");

  // 2. Task-record discipline: on-time %, overdue, blocked, carried-in.
  let doneWithDeadline = 0, doneOnTime = 0, overdue = 0, blocked = 0, carriedIn = 0;
  for (const t of tasks) {
    const isDone = ["COMPLETED", "UNDER_REVIEW", "PENDING_DEPLOYMENT", "AWAITING_APPROVAL"].includes(t.status);
    if (t.status === "BLOCKED" || (t.blocker && t.blocker.trim())) blocked += 1;
    if (isDone && t.deadline) {
      doneWithDeadline += 1;
      if (new Date(t.updatedAt).getTime() <= new Date(t.deadline).getTime()) doneOnTime += 1;
    }
    if (!isDone && t.status !== "CANCELLED" && t.deadline && new Date(t.deadline).getTime() < now.getTime()) overdue += 1;
    if (new Date(t.dateAssigned).getTime() < new Date(now.getTime() - 30 * MS_DAY).getTime() && !isDone) carriedIn += 1;
  }
  const completionRatePct = assigned > 0 ? Math.round((completed / assigned) * 10000) / 100 : null;
  const onTime = doneWithDeadline > 0 ? Math.round((doneOnTime / doneWithDeadline) * 10000) / 100 : null;

  // 3. Outstanding work register (evidence-based, no invented defaults).
  const outstandingWork: TechTaskProfile["outstandingWork"] = [];
  for (const t of tasks) {
    const isDone = ["COMPLETED", "UNDER_REVIEW", "PENDING_DEPLOYMENT", "AWAITING_APPROVAL"].includes(t.status);
    if (isDone || t.status === "CANCELLED") continue;
    const isOverdue = t.deadline ? new Date(t.deadline).getTime() < now.getTime() : false;
    if (t.status === "BLOCKED" || (t.blocker && t.blocker.trim())) {
      outstandingWork.push({ label: t.title, kind: "BLOCKED", detail: `Documented blocker: ${t.blocker ?? "status BLOCKED"} — external dependency shown separately, not attributed to the agent.` });
    } else if (isOverdue) {
      outstandingWork.push({ label: t.title, kind: "OVERDUE", detail: `Deadline ${t.deadline ? isoDay(new Date(t.deadline)) : "?"} passed without completion — Overdue / Defaulted Assignment.` });
    } else {
      outstandingWork.push({ label: t.title, kind: "OUTSTANDING", detail: `Assigned ${isoDay(new Date(t.dateAssigned))}${t.deadline ? `, due ${isoDay(new Date(t.deadline))}` : ""} — Below Target / Outstanding Deliverable.` });
    }
  }
  for (const e of uniqueEntries.filter((x) => x.status !== "COMPLETED")) {
    outstandingWork.push({ label: e.task, kind: e.status === "BLOCKED" ? "BLOCKED" : "OUTSTANDING", detail: `Reported ${e.date} in ${e.reportRef} — status "${e.status}" without completion evidence.` });
  }

  basis.assignedDeliverables = "Σ 'Tickets / Tasks Assigned' target rows from the agent's own submitted reports (the assignment scope each report declares)";
  basis.completedDeliverables = "Σ 'Tickets / Tasks Completed' actual rows — an entry without completion evidence is never counted";
  basis.completionRate = "completed ÷ assigned × 100";
  basis.bugs = "bugsReported and bugsResolved summed from separate metric rows — a reported bug is never a resolved bug";
  basis.onTime = "Task records with deadlines: completed by deadline ÷ deadline-bearing completions (Task.updatedAt as completion proxy)";
  basis.overdue = "Task records past deadline and not completed — cancelled assignments excluded";

  if (doneWithDeadline === 0) notes.push("No deadline-bearing task completions on record — on-time completion rate is not computable and is reported as null, never guessed.");

  return {
    assignedDeliverables: assigned,
    completedDeliverables: completed,
    outstandingDeliverables: Math.max(0, assigned - completed),
    overdueDeliverables: overdue,
    completionRatePct,
    onTimeCompletionRatePct: onTime,
    tasksCompletedBeyondExpectation: Math.max(0, completed - assigned),
    carriedIn,
    blocked,
    bugsReported,
    bugsResolved,
    ticketsHandled: completed + assigned > 0 ? completed : null,
    entries,
    outstandingWork,
    notes,
    basis,
  };
}
