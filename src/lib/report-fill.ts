// ─────────────────────────────────────────────────────────────────────────────
// REPORT → MASTER TEMPLATE FILL MAPPING
//
// Turns a Report record (with its JSON payload columns) into typed fill data
// and runs the template-preserving DOCX engine against the correct master.
//
// Principles (from the report brief):
//  - The master template is the design foundation — a COPY is edited, the
//    master file is never touched (sha256-verified in report-masters.ts).
//  - Data goes into the EXISTING sections/cells; nothing is re-styled.
//  - Missing data → the template's own empty-field convention (cell stays
//    empty). Nothing is invented.
//  - Metrics without a template row are appended as clones of the last data
//    row so longer reports extend the template's own design conventions.
// ─────────────────────────────────────────────────────────────────────────────

import {
  editDocxCopy, bodyTables, rowsOf, cellsOf, cellText, norm, setCellText,
  fillLabeledPairs, fillKpiTable, fillNumberedTable, fillTextSection, clearCell,
  fmtValue, cloneRowAfter, fillParaAfterHeading,
  type TemplateKpiRow, type Doc, type Table, type Row,
} from "@/lib/docx-template-fill";
import { getMasterBuffer } from "@/lib/report-masters";
import { ATTENDANCE_ROWS } from "@/lib/template-config";
import { tlTemplateKeyFor, type TlPayload } from "@/lib/team-lead-template";
import { db } from "@/lib/db";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function jparse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

const ROLE_TITLES: Record<string, string> = {
  ADMIN: "Administrator",
  SUPERVISOR: "Supervisor",
  TEAM_LEAD: "Team Lead",
  AGENT_BPO: "Call Centre Agent",
  DEVELOPER: "Developer / Technical",
  SOCIAL_MEDIA: "Social Media Specialist",
};

export interface ReportLike {
  type?: string;
  reportDate: Date | string;
  department?: string | null;
  shiftTime?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  attendanceStatus?: string | null;
  latenessMins?: number | null;
  kpiMetrics?: string | null;
  callLogs?: string | null;
  challenges?: string | null;
  escalations?: string | null;
  additionalActivities?: string | null;
  workEntries?: string | null;
  metricsSummary?: string | null;
  teamName?: string | null;
  campusLocation?: string | null;
  agentsManaged?: number | null;
  attendanceSummary?: string | null;
  teamKpiAverages?: string | null;
  coachingEntries?: string | null;
  qaObservations?: string | null;
  escalatedIssues?: string | null;
  highlights?: string | null;
  lowlights?: string | null;
  actionPlan?: string | null;
  status?: string | null;
  payload?: string | null;
  userId?: string | null;
  supervisorFeedback?: string | null;
  user?: { fullName: string; employeeId?: string | null; role?: string; email?: string | null; team?: string | null } | null;
  reviewer?: { fullName?: string | null } | null;
  reviewedAt?: Date | string | null;
}

interface MetricLike {
  key?: string; label?: string; target?: number | null; targetLabel?: string | null;
  actual?: number | null; variance?: number | null; unit?: string; notes?: string | null; category?: string;
}

/** Label → item resolution with prefix fallback ("Avg Talk Time (min)" ≈ "(mins)"). */
function makeResolver<T extends { key?: string; label?: string }>(items: T[]) {
  const byLabel = new Map<string, T>();
  for (const m of items) {
    if (m.label) byLabel.set(norm(m.label), m);
    if (m.key) byLabel.set(norm(m.key), m);
  }
  const entries = [...byLabel.entries()];
  return (label: string): T | undefined => {
    const n = norm(label);
    if (!n) return undefined;
    const exact = byLabel.get(n);
    if (exact) return exact;
    return entries.find(([k]) => k.length >= 6 && (n.startsWith(k) || k.startsWith(n)))?.[1];
  };
}

function metricRow(m: MetricLike): TemplateKpiRow {
  return {
    target: m.target !== null && m.target !== undefined
      ? (m.targetLabel && m.targetLabel !== "-" ? m.targetLabel : fmtValue(m.target, m.unit || "count"))
      : undefined,
    actual: m.actual !== null && m.actual !== undefined ? fmtValue(m.actual, m.unit || "count") : undefined,
    variance: m.variance !== null && m.variance !== undefined ? String(m.variance) : undefined,
    notes: m.notes || undefined,
  };
}

/** Normalised title of a table's first row (section headings live there). */
function tableTitle(tbl: Table): string {
  const rows = rowsOf(tbl);
  if (rows.length === 0) return "";
  const cells = cellsOf(rows[0]);
  return norm(cellText(cells[0] || rows[0]));
}

/** Find a top-level table by its section-title row (normalised contains). */
function findTable(tables: Table[], needle: string): Table | undefined {
  const n = norm(needle);
  return tables.find((t) => tableTitle(t).includes(n));
}

/**
 * Fill a table where each data row's first cell is a label and the remaining
 * cells are values (col 1..n). Appended rows clone the last data row so the
 * template's borders/shading/fonts carry over; `appendWithLabels` also writes
 * the label cell.
 */
function fillGrid(
  doc: Doc, tbl: Table,
  resolve: (label: string) => (string | number | null)[] | null,
  headerRows: number,
  appendWithLabels?: { label: string; values: (string | number | null)[] }[],
): void {
  const rows = rowsOf(tbl).slice(headerRows);
  for (const tr of rows) {
    const cells = cellsOf(tr);
    if (cells.length < 2) continue;
    const label = norm(cellText(cells[0]));
    if (!label) continue;
    const values = resolve(label);
    if (!values) continue;
    for (let i = 0; i < values.length && 1 + i < cells.length; i++) setCellText(doc, cells[1 + i], values[i]);
  }
  if (appendWithLabels && appendWithLabels.length > 0 && rows.length > 0) {
    let anchor = rows[rows.length - 1];
    for (const item of appendWithLabels) {
      const clone = cloneRowAfter(doc, anchor);
      anchor = clone;
      const cells = cellsOf(clone);
      for (const c of cells) clearCell(c); // fresh clone — no inherited values
      setCellText(doc, cells[0], item.label);
      for (let i = 0; i < item.values.length && 1 + i < cells.length; i++) setCellText(doc, cells[1 + i], item.values[i]);
    }
  }
}

/** Generic pass: every 1-row, ≥3-cell top-level table is a "label | value | label | value" row. */
function fillFieldRowTables(doc: Doc, tables: Table[], values: Record<string, string | number | null>): void {
  for (const tbl of tables) {
    const rows = rowsOf(tbl);
    if (rows.length !== 1) continue;
    const cells = cellsOf(rows[0]);
    if (cells.length < 3) continue;
    fillLabeledPairs(doc, tbl, values, 0);
  }
}

// ─────────────────────────── AGENT (BPO call centre) ───────────────────────────

export async function fillAgentBpoDocx(report: ReportLike): Promise<Buffer> {
  const master = await getMasterBuffer("AGENT_BPO");
  if (!master) throw new Error("No master template for AGENT_BPO");

  const metrics = jparse<MetricLike[]>(report.kpiMetrics, []);
  const callLogs = jparse<{ leadName?: string; disposition?: string; followUp?: string; notes?: string }[]>(report.callLogs, []);
  const user = report.user;

  return editDocxCopy(master.buffer, (doc) => {
    const tables = bodyTables(doc);

    // ▸ AGENT INFORMATION
    const info = findTable(tables, "agent information");
    if (info) {
      fillLabeledPairs(doc, info, {
        agentname: user?.fullName || "",
        date: fmtDate(report.reportDate),
        agentid: user?.employeeId || "",
        shifttime: report.shiftTime || "",
        clockintime: report.clockIn || "",
        clockouttime: report.clockOut || "",
        attendancestatus: report.attendanceStatus || "",
        latenessmins: report.latenessMins !== null && report.latenessMins !== undefined ? `${report.latenessMins} min${report.latenessMins === 1 ? "" : "s"}` : "",
      }, 1);
    }

    // ▸ KEY PERFORMANCE METRICS (KPIs) — template rows matched by label
    const kpiTbl = findTable(tables, "key performance metrics");
    if (kpiTbl) {
      const resolveMetric = makeResolver(metrics);
      const resolve = (templateLabel: string): TemplateKpiRow | null => {
        const m = resolveMetric(templateLabel);
        return m ? metricRow(m) : null;
      };
      // metrics that matched NO template row → appended as design-consistent rows
      const templateLabels = rowsOf(kpiTbl).slice(2).map((tr) => norm(cellText(cellsOf(tr)[0] || tr)));
      const append: TemplateKpiRow[] = [];
      for (const m of metrics) {
        const n = norm(m.label || m.key || "");
        if (!n) continue;
        const matched = templateLabels.some((t) => t === n || (t.length >= 6 && (t.startsWith(n) || n.startsWith(t))));
        const hasData = (m.actual !== null && m.actual !== undefined) || !!m.notes;
        if (!matched && hasData) append.push({ label: m.label || m.key || "Metric", ...metricRow(m) });
      }
      fillKpiTable(doc, kpiTbl, resolve, { headerRows: 2, append });
    }

    // ▸ CALL LOG SUMMARY — 8 numbered rows, cloned if the agent logged more
    const callTbl = findTable(tables, "call log summary");
    if (callTbl) {
      const entries = callLogs
        .filter((l) => l.leadName || l.disposition || l.followUp || l.notes)
        .map((l) => ({ cells: [l.leadName || "", l.disposition || "", l.followUp || "", l.notes || ""] }));
      if (entries.length > 0) fillNumberedTable(doc, callTbl, entries, 1, 2);
    }

    // ▸ CHALLENGES / BLOCKERS · ▸ ESCALATIONS
    const chal = findTable(tables, "challenges");
    if (chal) fillTextSection(chal, report.challenges, 1);
    const esc = findTable(tables, "escalations");
    if (esc) fillTextSection(esc, report.escalations, 1);
    // Note: the original SBTS master has no "Additional Activities" section —
    // that data stays available in the app and the xlsx/csv exports.
  });
}

// ─────────────────────────── SUPERVISOR ───────────────────────────

export async function fillSupervisorDocx(report: ReportLike): Promise<Buffer> {
  const master = await getMasterBuffer("SUPERVISOR");
  if (!master) throw new Error("No master template for SUPERVISOR");

  const attendance = jparse<Record<string, { count?: string; details?: string }>>(report.attendanceSummary, {});
  const teamKpis = jparse<{ key?: string; label?: string; teamTarget?: string; teamAvg?: string; best?: string; lowest?: string; notes?: string }[]>(report.teamKpiAverages, []);
  const coaching = jparse<{ agentName?: string; type?: string; details?: string }[]>(report.coachingEntries, []);
  const escalated = jparse<{ description?: string; priority?: string; status?: string; action?: string }[]>(report.escalatedIssues, []);
  const plan = jparse<{ action?: string; owner?: string; priority?: string; deadline?: string }[]>(report.actionPlan, []);
  const user = report.user;

  return editDocxCopy(master.buffer, (doc) => {
    const tables = bodyTables(doc);

    const info = findTable(tables, "supervisors information");
    if (info) {
      fillLabeledPairs(doc, info, {
        supervisorname: user?.fullName || "",
        date: fmtDate(report.reportDate),
        teamname: report.teamName || "",
        shifttime: report.shiftTime || "",
        campuslocation: report.campusLocation || "",
        noofagentsmanaged: report.agentsManaged !== null && report.agentsManaged !== undefined ? String(report.agentsManaged) : "",
        clockintime: report.clockIn || "",
        clockouttime: report.clockOut || "",
      }, 1);
    }

    // ▸ TEAM ATTENDANCE SUMMARY (Metric | Count | Names / Details)
    const att = findTable(tables, "team attendance");
    if (att) {
      const resolveKey = makeResolver(ATTENDANCE_ROWS.map((r) => ({ key: r.key, label: r.label })));
      fillGrid(doc, att, (label) => {
        const row = resolveKey(label);
        if (!row) return null;
        const a = attendance[row.key];
        if (!a) return null;
        return [a.count || "", a.details || ""];
      }, 2);
    }

    // ▸ TEAM PERFORMANCE SUMMARY (KPI | Team Target | Team Average | Best | Lowest | Notes)
    const perf = findTable(tables, "team performance");
    if (perf) {
      const resolveKpi = makeResolver(teamKpis);
      fillGrid(doc, perf, (label) => {
        const k = resolveKpi(label);
        if (!k) return null;
        return [k.teamTarget || "", k.teamAvg || "", k.best || "", k.lowest || "", k.notes || ""];
      }, 2);
    }

    // ▸ COACHING & FEEDBACK PROVIDED
    const coach = findTable(tables, "coaching");
    if (coach) {
      const entries = coaching.filter((c) => c.agentName || c.details).map((c) => ({ cells: [c.agentName || "", c.type || "", c.details || ""] }));
      if (entries.length > 0) fillNumberedTable(doc, coach, entries, 1, 2);
    }

    // ▸ QUALITY ASSURANCE OBSERVATIONS
    const qa = findTable(tables, "quality assurance");
    if (qa) fillTextSection(qa, report.qaObservations, 1);

    // ▸ ISSUES ESCALATED TO MANAGEMENT
    const esc = findTable(tables, "issues escalated");
    if (esc) {
      const entries = escalated.filter((e) => e.description).map((e) => ({ cells: [e.description || "", e.priority || "", e.status || "", e.action || ""] }));
      if (entries.length > 0) fillNumberedTable(doc, esc, entries, 1, 2);
    }

    // ▸ SHIFT HIGHLIGHTS & LOWLIGHTS (label | value rows inside one table)
    const hl = findTable(tables, "highlights");
    if (hl) {
      for (const tr of rowsOf(hl).slice(1)) {
        const cells = cellsOf(tr);
        if (cells.length < 2) continue;
        const label = norm(cellText(cells[0]));
        if (label === "highlights") setCellText(doc, cells[1], report.highlights || "");
        if (label === "lowlights") setCellText(doc, cells[1], report.lowlights || "");
      }
    }

    // ▸ ACTION PLAN FOR NEXT DAY
    const ap = findTable(tables, "action plan");
    if (ap) {
      const entries = plan.filter((p) => p.action).map((p) => ({ cells: [p.action || "", p.owner || "", p.priority || "", p.deadline || ""] }));
      if (entries.length > 0) fillNumberedTable(doc, ap, entries, 1, 2);
    }
    // Note: manager review comments live in the app workflow; the printed
    // SBTS supervisor master has no dedicated section for them.
  });
}

// ─────────────────────────── TECH & SOCIAL (shared skeleton) ───────────────────────────

interface GridSpec {
  /** normalised template row label → value array for columns 1..n */
  rows: Record<string, (string | number | null)[]>;
  /** metrics with no template row — appended as cloned rows (label + values) */
  append?: { label: string; values: (string | number | null)[] }[];
}

function fillDeptReport(
  masterBuffer: Buffer,
  report: ReportLike,
  kpiSpec: GridSpec,
  taskEntries: { cells: (string | number | null)[] }[],
  extra: { challenges?: string | null; escalations?: string | null; supervisorComments?: string | null },
): Promise<Buffer> {
  return editDocxCopy(masterBuffer, (doc) => {
    const tables = bodyTables(doc);
    const user = report.user;
    const reviewed = report.reviewedAt ? fmtDate(report.reviewedAt) : "";

    // staff information rows (separate 1-row tables in these masters) + signature row
    fillFieldRowTables(doc, tables, {
      staffname: user?.fullName || "",
      agentname: user?.fullName || "",
      date: fmtDate(report.reportDate),
      roledesignation: ROLE_TITLES[user?.role || ""] || user?.role || "",
      shifttime: report.shiftTime || "",
      clockintime: report.clockIn || "",
      clockouttime: report.clockOut || "",
      attendancestatus: report.attendanceStatus || "",
      latenessmins: report.latenessMins !== null && report.latenessMins !== undefined ? `${report.latenessMins} min${report.latenessMins === 1 ? "" : "s"}` : "",
      supervisorname: report.reviewer?.fullName || "",
      signaturedate: reviewed,
    });

    // KPI table: first table whose header row starts with KPI/Metric
    const kpiTbl = tables.find((t) => {
      const rows = rowsOf(t);
      if (rows.length === 0) return false;
      const first = norm(cellText(cellsOf(rows[0])[0] || rows[0]));
      return first === "kpi" || first === "metric";
    });
    if (kpiTbl) {
      fillGrid(doc, kpiTbl, (label) => kpiSpec.rows[label] ?? null, 1, kpiSpec.append);
    }

    // Tasks table: header's second column starts with "Task…"
    const tasks = tables.find((t) => {
      const rows = rowsOf(t);
      if (rows.length < 2) return false;
      const headCells = cellsOf(rows[0]);
      if (headCells.length < 4) return false;
      return norm(cellText(headCells[1])).startsWith("task");
    });
    if (tasks && taskEntries.length > 0) fillNumberedTable(doc, tasks, taskEntries, 1, 1);

    // "▸ HEADING" 1-cell tables are followed by their body table
    fillSectionBodyAfterHeading(doc, tables, "challenges", extra.challenges);
    fillSectionBodyAfterHeading(doc, tables, "escalations", extra.escalations);
    if (extra.supervisorComments) fillSectionBodyAfterHeading(doc, tables, "supervisor comments", extra.supervisorComments);
  });
}

/** The tech/social masters place a "▸ HEADING" 1-cell table before the body table. */
function fillSectionBodyAfterHeading(doc: Doc, tables: Table[], heading: string, text: string | null | undefined): void {
  if (!text || !String(text).trim()) return;
  const idx = tables.findIndex((t) => {
    const rows = rowsOf(t);
    return rows.length === 1 && cellsOf(rows[0]).length === 1 && tableTitle(t).includes(norm(heading));
  });
  if (idx === -1) {
    // heading + body share one table (call-centre layout) — fall back
    const combined = tables.find((t) => tableTitle(t).includes(norm(heading)));
    if (combined) fillTextSection(combined, text, 1);
    return;
  }
  for (let i = idx + 1; i < tables.length; i++) {
    const rows = rowsOf(tables[i]);
    if (rows.length === 0) continue;
    const cells = cellsOf(rows[0]);
    if (cells.length === 1) { fillTextSection(tables[i], text, 0); return; }
  }
}

export async function fillTechDocx(report: ReportLike): Promise<Buffer> {
  const master = await getMasterBuffer("TECH");
  if (!master) throw new Error("No master template for TECH");

  const ms = jparse<Record<string, number>>(report.metricsSummary, {});
  const entries = jparse<Record<string, string>[]>(report.workEntries, []);
  const v = (n: unknown) => (n === null || n === undefined || n === "" ? "" : String(n));

  // Template KPI rows ← app metrics (only where a real source exists).
  // Column 1 is the template's Target column — these masters ship it EMPTY and
  // metricsSummary has no targets, so values start with "" (untouched) and land
  // in the Actual column, keeping the template's own convention.
  const val = (n: unknown) => ["", v(n)];
  const rows: Record<string, (string | number | null)[]> = {
    ticketstasksassigned: val(entries.length > 0 ? String(entries.length) : ""),
    ticketstaskscompleted: val(ms.tasksCompleted),
    bugsreported: [""],
    bugsresolved: val(ms.bugsResolved),
    pagessitesupdated: [""],
    websiteuptime: [""],
    avgresponsetimetotickethrs: [""],
    codereviewscompleted: val(ms.codeReviewsDone),
    deploymentsmade: val(ms.deploymentsCompleted),
  };
  const append: { label: string; values: (string | number | null)[] }[] = [];
  const extraMetrics: [string, unknown][] = [
    ["Support Tickets Resolved", ms.supportTicketsResolved],
    ["Test Cases Passed", ms.testCasesPassed],
    ["Milestones Delivered", ms.milestonesDelivered],
  ];
  for (const [label, v2] of extraMetrics) {
    if (v2 !== null && v2 !== undefined && v2 !== "") append.push({ label, values: ["", String(v2)] });
  }

  const taskEntries = entries
    .filter((e) => Object.values(e).some((x) => x && String(x).trim() !== ""))
    .map((e) => ({ cells: [e.task || e.title || "", e.project || "", e.status || "", e.deliverable || ""] }));

  return fillDeptReport(master.buffer, report, { rows, append }, taskEntries, {
    challenges: report.challenges,
    escalations: report.escalations,
    supervisorComments: report.supervisorFeedback,
  });
}

export async function fillSocialDocx(report: ReportLike): Promise<Buffer> {
  const master = await getMasterBuffer("SOCIAL");
  if (!master) throw new Error("No master template for SOCIAL");

  const ms = jparse<Record<string, number>>(report.metricsSummary, {});
  const entries = jparse<{ task?: string; platform?: string; status?: string; deliverable?: string }[]>(report.workEntries, []);
  const v = (n: unknown) => (n === null || n === undefined || n === "" ? "" : String(n));
  const pair = (a: unknown, b: unknown) => (a && b ? `${a} / ${b}` : a ? String(a) : b ? String(b) : "");

  const val = (n: unknown) => ["", v(n)];
  const rows: Record<string, (string | number | null)[]> = {
    postscreatedpublished: val(ms.postsPublished),
    storiesreelscreated: val(ms.reelsPublished ?? ms.storiesPublished),
    contentengagementrate: [""],
    reachimpressions: ["", pair(ms.reach, ms.impressions)],
    followergrowthnet: val(ms.followerGrowth),
    commentsdmsrespondedto: ["", pair(ms.commentsHandled, ms.messagesHandled)],
    contentcalendaradherence: [""],
    graphicsvisualsdesigned: [""],
  };
  const append: { label: string; values: (string | number | null)[] }[] = [];
  const extraMetrics: [string, unknown][] = [
    ["Posts Planned", ms.postsPlanned],
    ["Likes", ms.likes],
    ["Shares", ms.shares],
    ["Saves", ms.saves],
    ["Link Clicks", ms.linkClicks],
    ["Campaign Leads / Conversions", ms.campaignLeads],
  ];
  for (const [label, v2] of extraMetrics) {
    if (v2 !== null && v2 !== undefined && v2 !== "") append.push({ label, values: ["", String(v2)] });
  }

  const taskEntries = entries
    .filter((e) => Object.values(e).some((x) => x && String(x).trim() !== ""))
    .map((e) => ({ cells: [e.task || "", e.platform || "", e.status || "", e.deliverable || ""] }));

  return fillDeptReport(master.buffer, report, { rows, append }, taskEntries, {
    challenges: report.challenges,
    escalations: report.escalations,
    supervisorComments: report.supervisorFeedback,
  });
}

// ───────────────── SOCIAL MEDIA TEAM LEAD (uploaded SBTS master) ─────────────────

interface TlRow { [key: string]: unknown }

/** Rows of a dynamic-template table section (only when the payload stored an array). */
function tlRows(sections: TlPayload["sections"], id: string): TlRow[] {
  const v = sections[id];
  return Array.isArray(v) ? (v as TlRow[]) : [];
}

/** Free-text value of a dynamic-template textarea section. */
function tlText(sections: TlPayload["sections"], id: string): string {
  const v = sections[id];
  return typeof v === "string" ? v : "";
}

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** Humanise a Task status enum: AWAITING_APPROVAL → "Awaiting Approval". */
function humanStatus(st: string | null | undefined): string {
  if (!st) return "";
  return st.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Fill a header + empty-rows table (no "#" column) with positional entries. */
function fillPlainRows(doc: Doc, tbl: Table, entries: (string | number | null)[][], headerRows = 1): void {
  const rows = rowsOf(tbl).slice(headerRows);
  if (rows.length === 0 || entries.length === 0) return;
  let anchor: Row | null = null;
  for (let i = 0; i < entries.length; i++) {
    let tr: Row;
    if (i < rows.length) tr = rows[i];
    else {
      tr = cloneRowAfter(doc, anchor || rows[rows.length - 1]);
      for (const c of cellsOf(tr)) clearCell(c); // fresh clone — no inherited values
    }
    anchor = tr;
    const cells = cellsOf(tr);
    for (let c = 0; c < entries[i].length && c < cells.length; c++) {
      setCellText(doc, cells[c], entries[i][c]);
    }
  }
}

/**
 * The uploaded "SBTS-Daily-Report-Social Media Team-Lead" master places a
 * "▸ HEADING" 1-cell table before each section's body table — resolve a
 * section by its heading and return the table that follows it.
 */
function tableAfterHeading(tables: Table[], heading: string): Table | undefined {
  const n = norm(heading);
  const idx = tables.findIndex((t) => tableTitle(t).includes(n));
  return idx >= 0 ? tables[idx + 1] : undefined;
}

export async function fillSocialLeadDocx(report: ReportLike): Promise<Buffer> {
  const master = await getMasterBuffer("TL_SOCIAL");
  if (!master) throw new Error("No master template for TL_SOCIAL");

  const payload = jparse<TlPayload>(report.payload, { sections: {} });
  const sections = payload.sections || {};
  const user = report.user;
  const lateness = report.latenessMins !== null && report.latenessMins !== undefined
    ? `${report.latenessMins} min${report.latenessMins === 1 ? "" : "s"}`
    : "";

  // ── WORK DONE FROM MY DAY (AUTO-FILLED) — payload wins, else the Tasks module.
  const mydayPayload = tlRows(sections, "myday").filter((r) => Object.values(r).some((x) => s(x).trim() !== ""));
  let mydayEntries: (string | number | null)[][] = mydayPayload.map((r) => [s(r.task), s(r.timeDue), s(r.status)]);
  if (mydayEntries.length === 0 && report.userId) {
    const day = new Date(report.reportDate);
    if (!Number.isNaN(day.getTime())) {
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const tasks = await db.task.findMany({
        where: {
          assigneeId: report.userId,
          OR: [{ dateAssigned: { gte: dayStart, lt: dayEnd } }, { deadline: { gte: dayStart, lt: dayEnd } }],
        },
        orderBy: { deadline: "asc" },
        take: 12,
      });
      mydayEntries = tasks.map((t) => {
        const dl = t.deadline ? new Date(t.deadline) : null;
        let due = "";
        if (dl && !Number.isNaN(dl.getTime())) {
          const sameDay = dl >= dayStart && dl < dayEnd;
          const hh = `${String(dl.getHours()).padStart(2, "0")}:${String(dl.getMinutes()).padStart(2, "0")}`;
          due = sameDay ? hh : `${dl.getDate()} ${MONTHS[dl.getMonth()]} ${hh}`;
        } else if (t.target) due = t.target;
        return [t.title, due, humanStatus(t.status)];
      });
    }
  }

  return editDocxCopy(master.buffer, (doc) => {
    const tables = bodyTables(doc);

    // ▸ STAFF INFORMATION — labels row with the value row directly beneath it
    const info = tableAfterHeading(tables, "staff information");
    if (info) {
      const rows = rowsOf(info);
      if (rows.length >= 2) {
        const labels = cellsOf(rows[0]);
        const values = cellsOf(rows[1]);
        const map: Record<string, string> = {
          staffname: user?.fullName || "",
          date: fmtDate(report.reportDate),
          roledesignation: ROLE_TITLES[user?.role || ""] || "Team Lead",
          shifttime: report.shiftTime || "",
          clockintime: report.clockIn || "",
          clockouttime: report.clockOut || "",
        };
        labels.forEach((lc, i) => {
          const key = norm(cellText(lc));
          if (key in map && values[i]) setCellText(doc, values[i], map[key]);
        });
        // third row: Attendance status | value | Lateness (mins) | value | Email | value
        fillLabeledPairs(doc, info, {
          attendancestatus: report.attendanceStatus || s(tlRows(sections, "staff-info")[0]?.attendanceStatus) || "",
          latenessmins: lateness,
          email: user?.email || "",
        }, 2);
      }
    }

    // ▸ ROLE FOCUS FOR TODAY — free-paragraph body after the heading
    fillParaAfterHeading(doc, "role focus for today", tlText(sections, "role-focus"));

    // ▸ KEY PERFORMANCE METRICS (KPIS) — labels match the dynamic template 1:1
    const kpiTbl = tableAfterHeading(tables, "key performance metrics");
    if (kpiTbl) {
      const metrics = tlRows(sections, "team-kpis") as unknown as MetricLike[];
      const resolveMetric = makeResolver(metrics);
      const resolve = (templateLabel: string): TemplateKpiRow | null => {
        const m = resolveMetric(templateLabel);
        return m ? metricRow(m) : null;
      };
      const templateLabels = rowsOf(kpiTbl).slice(1).map((tr) => norm(cellText(cellsOf(tr)[0] || tr)));
      const append: TemplateKpiRow[] = [];
      for (const m of metrics) {
        const n = norm(m.label || m.key || "");
        if (!n) continue;
        const matched = templateLabels.some((t) => t === n || (t.length >= 6 && (t.startsWith(n) || n.startsWith(t))));
        const hasData = (m.actual !== null && m.actual !== undefined) || !!m.notes;
        if (!matched && hasData) append.push({ label: m.label || m.key || "Metric", ...metricRow(m) });
      }
      fillKpiTable(doc, kpiTbl, resolve, { headerRows: 1, append });
    }

    // ▸ TASKS ASSIGNED & COMPLETED — numbered rows, cloned beyond the template's six
    const tasksTbl = tableAfterHeading(tables, "tasks assigned");
    if (tasksTbl) {
      const entries = tlRows(sections, "tasks")
        .filter((r) => Object.values(r).some((x) => s(x).trim() !== ""))
        .map((r) => [s(r.task), s(r.platform), s(r.status), s(r.deliverable)]);
      if (entries.length > 0) fillNumberedTable(doc, tasksTbl, entries.map((cells) => ({ cells })), 1, 1);
    }

    // ▸ WORK DONE FROM MY DAY (AUTO-FILLED) — numbered rows from the Tasks module
    const mydayTbl = tableAfterHeading(tables, "work done from my day");
    if (mydayTbl && mydayEntries.length > 0) {
      fillNumberedTable(doc, mydayTbl, mydayEntries.map((cells) => ({ cells })), 1, 1);
    }

    // ▸ CHALLENGES / BLOCKERS · ▸ ESCALATIONS AND APPROVALS · ▸ END-OF-DAY HANDOFF
    const chalTbl = tableAfterHeading(tables, "challenges");
    if (chalTbl) {
      const entries = tlRows(sections, "challenges")
        .filter((r) => Object.values(r).some((x) => s(x).trim() !== ""))
        .map((r) => [s(r.blocker), s(r.impact), s(r.support), s(r.owner)]);
      fillPlainRows(doc, chalTbl, entries);
    }
    const escTbl = tableAfterHeading(tables, "escalations and approvals");
    if (escTbl) {
      const entries = tlRows(sections, "escalations")
        .filter((r) => Object.values(r).some((x) => s(x).trim() !== ""))
        .map((r) => [s(r.item), s(r.reason), s(r.escalatedTo), s(r.status)]);
      fillPlainRows(doc, escTbl, entries);
    }
    const handoffTbl = tableAfterHeading(tables, "end-of-day handoff");
    if (handoffTbl) {
      const entries = tlRows(sections, "handoff")
        .filter((r) => Object.values(r).some((x) => s(x).trim() !== ""))
        .map((r) => [s(r.completed), s(r.pending), s(r.blocked), s(r.nextAction)]);
      fillPlainRows(doc, handoffTbl, entries);
    }

    // ▸ SUPERVISOR COMMENTS — filled from the review workflow
    const supTbl = tableAfterHeading(tables, "supervisor comments");
    if (supTbl) {
      const rows = rowsOf(supTbl);
      if (rows.length >= 2) {
        const cells = cellsOf(rows[1]);
        setCellText(doc, cells[0], report.reviewer?.fullName || "");
        setCellText(doc, cells[1], report.supervisorFeedback || "");
        setCellText(doc, cells[2], report.reviewedAt ? fmtDate(report.reviewedAt) : "");
      }
    }
  });
}

/** Generate the template-filled DOCX for a report, or null when no master applies. */
export async function tryFillFromMaster(report: ReportLike): Promise<Buffer | null> {
  try {
    switch (report.type) {
      case "AGENT_BPO": return await fillAgentBpoDocx(report);
      case "SUPERVISOR": return await fillSupervisorDocx(report);
      case "TECH": return await fillTechDocx(report);
      case "SOCIAL": return await fillSocialDocx(report);
      case "TEAM_LEAD": {
        // Team leads fill the dynamic template resolved for THEIR team; only
        // teams whose dedicated master exists take the template-preserving path.
        if (tlTemplateKeyFor(report.department, report.user?.team) !== "TL_SOCIAL") return null;
        // old-shape payloads (pre-dating the SBTS social master) keep the
        // dynamic builder — the master needs the mirrored section structure
        const secs = jparse<TlPayload>(report.payload, { sections: {} }).sections || {};
        const hasSocialShape = "role-focus" in secs || "myday" in secs || "handoff" in secs || "team-kpis" in secs;
        if (!hasSocialShape) return null;
        return await fillSocialLeadDocx(report);
      }
      default: return null;
    }
  } catch {
    return null; // caller falls back to the existing builders
  }
}
