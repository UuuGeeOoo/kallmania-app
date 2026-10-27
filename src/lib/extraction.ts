// ─────────────────────────────────────────────────────────────────────────────
// INTELLIGENT REPORT EXTRACTION ENGINE (v2 — Document Intelligence pipeline)
//
// Upload → detect file type → parse (structure-preserving: tables, headings,
// reading order) → understand (LLM, chunked full-document read) → extract
// evidence-backed findings → route KPIs (deterministic engine, confidence-
// gated) → validate (code) → human review → confirm.
//
// Patterns adapted from nirdiamant/genai_agents (Document Intake Agent:
// "route deterministically, convert do not scrape, ground every answer";
// One-Step Decision Router: confidence gates; Human-in-the-Loop Approval
// Agent: code-side validation + reviewer gate). Reimplemented natively in
// TypeScript for this stack — no repository code copied (non-commercial
// license).
//
// Uncertain values are flagged — values are NEVER invented. Source location
// (table/row/section/page/sheet) is recorded for verification. Content that
// does not fit the template is PRESERVED in the full extraction instead of
// being silently dropped.
// ─────────────────────────────────────────────────────────────────────────────
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { runDocumentIntelligence } from "./doc-intel/pipeline";
import type { FullExtraction, DocumentIR } from "./doc-intel/types";

export interface ExtractedField {
  key: string;
  label: string;
  value: number | string | null;
  confidence: "high" | "medium" | "low";
  /** e.g. "Table 2 row 3 — "Calls Made | 45" (router: exact match for "Total Calls Made")" */
  source: string;
  needsReview: boolean;
}

export interface ExtractionResult {
  ok: boolean;
  error?: string;
  rawText: string;
  fields: ExtractedField[];
  sections: {
    challenges?: string | null;
    escalations?: string | null;
    additionalActivities?: string | null;
  };
  stats: { fieldsFound: number; fieldsNeedingReview: number; aiChecked: boolean; aiNote?: string };
  /** Full document-intelligence payload (structure + findings + routing + validation) */
  doc?: {
    markdown: string;
    ir: Pick<DocumentIR, "format" | "routeNote" | "stats" | "pages" | "sheets">;
    full: FullExtraction;
  } | null;
}

// ── Legacy flat-text extractors (kept for backward compatibility & fallbacks) ──

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function extractTextFromXlsx(buffer: Buffer): Promise<{ text: string; sheetNames: string[] }> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    parts.push(`[Sheet: ${name}]`);
    for (const row of rows) {
      const line = row.map((c) => String(c).trim()).filter(Boolean).join(" | ");
      if (line) parts.push(line);
    }
  }
  return { text: parts.join("\n"), sheetNames: wb.SheetNames };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return typeof text === "string" ? text : Array.isArray(text) ? (text as string[]).join("\n") : "";
}

// ── Deterministic label-matching fallback (runs on structured markdown) ──

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9%()/\s-]/g, " ").replace(/\s+/g, " ").trim();

/** label aliases → template keys (deterministic belt-and-braces pass) */
const LABEL_ALIASES: Record<string, string[]> = {
  totalCallsMade: ["total calls made", "total calls", "calls made", "outbound calls", "total outbound calls attempted"],
  totalMailsSent: ["total mails sent", "total emails sent", "emails sent", "mails sent"],
  callsConnected: ["calls connected", "connected calls", "calls answered"],
  successfulMailsSent: ["successful mails sent", "successful email deliveries", "delivered emails", "successful emails"],
  contactRate: ["contact rate"],
  conversionRate: ["conversion rate"],
  avgTalkTime: ["avg talk time", "average talk time", "avg. talk time"],
  avgHoldTime: ["avg hold time", "average hold time", "avg. hold time"],
  callbacksScheduled: ["callbacks scheduled", "callback scheduled"],
  leadsGenerated: ["leads generated", "leads generated hot warm", "total leads"],
  hotLeads: ["hot leads"],
  warmLeads: ["warm leads"],
  positiveDispositions: ["positive dispositions", "positive disposition"],
  notInterested: ["not interested declined", "not interested", "declined"],
  wrapUpTime: ["wrap up after call work", "wrap-up", "after call work", "wrap up time"],
  bouncedEmails: ["bounced emails", "total bounced emails", "bounce", "bounces"],
  failedSends: ["failed sending attempts", "failed sends", "failed emails"],
  followUpEmails: ["follow up emails sent", "total follow up emails", "follow-up emails"],
  personalizedOutreach: ["personalized outreach emails", "personalized emails"],
  campaignEmails: ["campaign emails sent", "total campaign emails"],
  repliesReceived: ["replies received", "total replies received", "email replies"],
  positiveReplies: ["positive replies", "total positive replies"],
  negativeReplies: ["negative replies", "total negative replies"],
  interestedProspects: ["interested prospects", "total interested prospects"],
  emailHotLeads: ["hot leads generated through email", "hot leads via email", "email hot leads"],
  emailWarmLeads: ["warm leads generated through email", "warm leads via email", "email warm leads"],
  meetingsBookedEmail: ["meetings or appointments booked through email", "meetings booked via email", "appointments booked through email", "meetings booked"],
  emailTasksCompleted: ["email related tasks completed", "email tasks completed"],
  outstandingFollowUps: ["outstanding email follow ups", "outstanding follow-ups", "outstanding followups"],
  appointmentsBooked: ["appointments booked", "meetings booked"],
  prospectsContacted: ["prospects contacted"],
  followUpCalls: ["follow up calls completed", "follow-up calls"],
  tasksCompleted: ["tasks completed", "technical tasks completed"],
  bugsResolved: ["bugs resolved", "bug fixes", "bugs fixed"],
  supportTicketsResolved: ["support tickets resolved", "tickets resolved"],
  deploymentsCompleted: ["deployments completed", "deployments"],
  testCasesPassed: ["test cases passed"],
  milestonesDelivered: ["milestones delivered"],
  codeReviewsDone: ["code reviews done"],
  postsPlanned: ["posts planned"],
  postsPublished: ["posts published"],
  reelsPublished: ["reels published", "reels videos published", "videos published"],
  storiesPublished: ["stories published"],
  reach: ["reach"],
  impressions: ["impressions"],
  likes: ["likes"],
  commentsHandled: ["comments handled", "comments"],
  shares: ["shares"],
  saves: ["saves"],
  linkClicks: ["link clicks"],
  messagesHandled: ["messages responded to", "messages handled", "messages"],
  followerGrowth: ["follower growth", "new followers"],
  campaignLeads: ["campaign leads conversions", "campaign leads"],
};

const SECTION_HEADINGS: { key: "challenges" | "escalations" | "additionalActivities"; aliases: string[] }[] = [
  { key: "challenges", aliases: ["challenges / blockers", "challenges/blockers", "challenges and blockers", "challenges", "blockers", "challenges encountered"] },
  { key: "escalations", aliases: ["escalations", "escalation", "issues escalated"] },
  { key: "additionalActivities", aliases: ["additional activities", "other activities", "additional work"] },
];

function findNumberAfter(text: string, idx: number): { value: number; end: number } | null {
  const window = text.slice(idx, idx + 160);
  const m = window.match(/(:|\||\t|—|–|-|=|\s)\s*(-?\d[\d,]*(?:\.\d+)?)\s*(%|mins?|minutes)?/i);
  if (m) {
    const raw = m[2].replace(/,/g, "");
    const v = parseFloat(raw);
    if (!Number.isNaN(v)) return { value: v, end: idx + (m.index || 0) + m[0].length };
  }
  return null;
}

/**
 * Deterministic fallback mapping on structured markdown (pipe tables keep
 * "label | value" pairs on one line, so same-line matching is reliable).
 * TABLE-AWARE: markdown tables are parsed as matrices and matched in two
 * layouts — metrics-as-columns (XLSX exports) and metrics-as-rows with
 * Target/Actual/Variance headers (the master template's own KPI table).
 * Targets/actuals/variances are never confused with each other.
 */
export function mapTextToFields(rawText: string, department: string): { fields: ExtractedField[]; sections: ExtractionResult["sections"] } {
  const lines = rawText.split(/\r?\n/);
  const normLines = lines.map((l) => normalize(l));
  const relevantDefs =
    department === "WEB_DEV"
      ? TECH_SUMMARY_METRICS.map((m) => ({ key: m.key, label: m.label }))
      : department === "SOCIAL_MEDIA"
        ? SOCIAL_SUMMARY_METRICS.map((m) => ({ key: m.key, label: m.label }))
        : AGENT_KPI_DEFS.map((d) => ({ key: d.key, label: d.label }));

  const fields: ExtractedField[] = [];
  const claimedKeys = new Set<string>();

  const pushField = (f: ExtractedField) => {
    if (claimedKeys.has(f.key)) return;
    claimedKeys.add(f.key);
    fields.push(f);
  };

  const parseNumCell = (s: string): number | null => {
    const t = s.replace(/,/g, "").trim();
    const m = /^(-?\d+(?:\.\d+)?)\s*(%|mins?|minutes)?$/i.exec(t);
    if (!m) return null;
    const v = parseFloat(m[1]);
    return Number.isNaN(v) ? null : v;
  };

  type MdTable = { header: string[]; rows: string[][]; ref: string };
  const tables: MdTable[] = [];
  let i = 0;
  let tableNo = 0;
  while (i < lines.length) {
    if (/^\s*\|.*\|\s*$/.test(lines[i])) {
      const block: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) block.push(lines[i].trim()), i++;
      const cells = (l: string) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const header = cells(block[0]);
      const body = block.slice(1).filter((l) => !/^\|(\s*:?-+:?\s*\|)+$/.test(l));
      if (header.length >= 2) {
        tableNo++;
        tables.push({ header, rows: body.map(cells), ref: `Table ${tableNo}` });
      }
      continue;
    }
    i++;
  }

  const SOFT_EXTRA = new Set(["total", "the", "of", "and", "for", "to", "in", "per", "a", "an", "your", "all", "overall", "no", "of"]);
  const aliasHit = (cellText: string, alias: string): number => {
    const c = normalize(cellText);
    const a = normalize(alias);
    if (!c || !a) return 0;
    if (c === a) return 1;
    if (c.includes(a)) return 0.85; // cell is a more specific phrase containing the alias
    if (a.includes(c)) {
      // alias contains the cell — only acceptable when the extra alias words are
      // soft qualifiers ("total", "no"). A distinguishing qualifier (e.g. "via
      // email" in "hot leads via email" vs cell "Hot Leads") must NOT match.
      const extra = a.replace(c, " ").split(/\s+/).filter(Boolean);
      if (extra.length && extra.every((t) => SOFT_EXTRA.has(t))) return 0.85;
      return 0;
    }
    return 0;
  };

  for (const table of tables) {
    const normHeader = table.header.map((h) => normalize(h));
    const targetCol = normHeader.findIndex((h) => /^target\b/.test(h) || h === "target");
    const varianceCol = normHeader.findIndex((h) => h.includes("variance") || h.includes("var."));
    const actualCol =
      normHeader.findIndex((h) => /^actual/.test(h) || h === "achieved" || h === "result" || h === "value");
    const metricsAsRows = targetCol >= 0 || varianceCol >= 0 || actualCol >= 0;
    const claimedCols = new Set<number>();
    const claimedRows = new Set<number>();

    for (const def of relevantDefs) {
      const aliases = LABEL_ALIASES[def.key] || [normalize(def.label)];
      let best: { field: ExtractedField; score: number; row?: number; col?: number } | null = null;

      if (metricsAsRows) {
        // Layout B: first column holds metric names; Target/Actual/Variance columns hold values
        const labelCol = 0;
        for (let r = 0; r < table.rows.length; r++) {
          if (claimedRows.has(r)) continue;
          const rowCells = table.rows[r];
          const rowLabel = rowCells[labelCol] || "";
          for (const alias of aliases) {
            const hit = aliasHit(rowLabel, alias);
            if (hit <= 0) continue;
            const aCol = actualCol >= 0 ? actualCol : rowCells.length - 1;
            const aRaw = parseNumCell(rowCells[aCol] ?? "");
            if (aRaw === null) continue;
            const tRaw = targetCol >= 0 ? parseNumCell(rowCells[targetCol] ?? "") : null;
            const vRaw = varianceCol >= 0 ? parseNumCell(rowCells[varianceCol] ?? "") : null;
            const bits = [`${table.ref} row ${r + 1} ("${rowLabel.slice(0, 40)}")`, `Actual column "${table.header[aCol]}"`];
            if (tRaw !== null) bits.push(`document target: ${tRaw}`);
            if (vRaw !== null) bits.push(`document variance: ${vRaw}`);
            const field: ExtractedField = {
              key: def.key,
              label: def.label,
              value: aRaw,
              confidence: hit === 1 ? "high" : "medium",
              source: bits.join(" · "),
              needsReview: hit !== 1,
            };
            if (!best || hit > best.score) best = { field, score: hit, row: r };
            break;
          }
        }
      } else {
        // Layout A: header cells hold metric names; data rows hold values
        for (let c = 0; c < table.header.length; c++) {
          if (claimedCols.has(c)) continue;
          for (const alias of aliases) {
            const hit = aliasHit(table.header[c], alias);
            if (hit <= 0) continue;
            for (const rowCells of table.rows) {
              const vRaw = parseNumCell(rowCells[c] ?? "");
              if (vRaw === null) continue;
              const field: ExtractedField = {
                key: def.key,
                label: def.label,
                value: vRaw,
                confidence: hit === 1 ? "high" : "medium",
                source: `${table.ref}, column "${table.header[c].slice(0, 40)}"`,
                needsReview: hit !== 1,
              };
              if (!best || hit > best.score) best = { field, score: hit, col: c };
              break;
            }
            break;
          }
        }
      }

      // Claim the winning row/column even when this def was already covered by
      // the AI-routed pass — otherwise a later alias (e.g. "hot leads via email")
      // steals the same row and produces a false duplicate field.
      if (best) {
        if (metricsAsRows && best.row !== undefined) claimedRows.add(best.row);
        else if (best.col !== undefined) claimedCols.add(best.col);
        if (!claimedKeys.has(def.key)) pushField(best.field);
      }
    }
  }

  // ── Pass 2: same-line matching on non-table lines ──
  const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isCallLogRow = (l: string) =>
    /^\s*\d+\s*\|/.test(l) &&
    (/\d{3}[-\s]\d{3}[-\s]\d{4}/.test(l) || /(interested|callback|no answer|busy|wrong number|voicemail|meeting booked|hot lead|warm lead|requested for email)/i.test(l));
  const contextText = lines.filter((l) => !isCallLogRow(l) && !isTableLine(l)).join("\n");
  const flatNorm = normalize(contextText);
  const claimed: [number, number][] = [];

  for (const def of relevantDefs) {
    if (claimedKeys.has(def.key)) continue;
    const aliases = LABEL_ALIASES[def.key] || [normalize(def.label)];
    let found: ExtractedField | null = null;
    for (const alias of aliases) {
      for (let li = 0; li < lines.length; li++) {
        if (isTableLine(lines[li]) || isCallLogRow(lines[li])) continue;
        const nl = normLines[li];
        if (!nl.includes(alias)) continue;
        const numMatch = lines[li].match(/(-?\d[\d,]*(?:\.\d+)?)\s*(%|mins?|minutes)?\s*$/i) ||
          lines[li].match(/[:|\t]\s*(-?\d[\d,]*(?:\.\d+)?)/);
        if (numMatch) {
          const v = parseFloat(numMatch[1].replace(/,/g, ""));
          if (!Number.isNaN(v)) {
            found = {
              key: def.key,
              label: def.label,
              value: v,
              confidence: "high",
              source: `Line ${li + 1}: "${lines[li].trim().slice(0, 80)}"`,
              needsReview: false,
            };
            break;
          }
        }
      }
      if (found) break;
      const idx = flatNorm.indexOf(alias);
      if (idx >= 0) {
        const overlap = claimed.some(([s, e]) => idx >= s && idx < e);
        if (!overlap) {
          const num = findNumberAfter(flatNorm, idx + alias.length);
          if (num) {
            claimed.push([idx, num.end]);
            found = {
              key: def.key,
              label: def.label,
              value: num.value,
              confidence: "medium",
              source: "Document body (context match)",
              needsReview: true,
            };
            break;
          }
        }
      }
    }
    if (found) pushField(found);
  }

  // ── Pass 3: narrative sections ──
  const sections: ExtractionResult["sections"] = {};
  for (const heading of SECTION_HEADINGS) {
    for (let li = 0; li < lines.length; li++) {
      const nl = normLines[li];
      const hit = heading.aliases.some((a) => nl.includes(normalize(a)));
      if (!hit) continue;
      const buf: string[] = [];
      for (let j = li + 1; j < Math.min(li + 15, lines.length); j++) {
        const line = lines[j].trim();
        if (!line) {
          if (buf.length) break;
          continue;
        }
        if (/^(▸|【)|(summary|information|kpi|log|review|plan|observations|highlights)/i.test(normalize(line)) && buf.length) break;
        buf.push(line);
      }
      if (buf.length) {
        sections[heading.key] = buf.join("\n").slice(0, 2000);
        break;
      }
    }
  }

  return { fields, sections };
}

// ── Main entry: the document-intelligence pipeline ──

const confBand = (c: number): ExtractedField["confidence"] => (c >= 0.85 ? "high" : c >= 0.6 ? "medium" : "low");

export async function extractReport(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  department: string
): Promise<ExtractionResult> {
  const empty = (error?: string): ExtractionResult => ({
    ok: false,
    error,
    rawText: "",
    fields: [],
    sections: {},
    stats: { fieldsFound: 0, fieldsNeedingReview: 0, aiChecked: false },
    doc: null,
  });

  const { ok, error, ir, full } = await runDocumentIntelligence(buffer, mimeType, originalName, department);
  if (!ok || !ir || !full) return empty(error);

  const markdown = ir.markdown.slice(0, 60000);

  // Routed ACTUAL values → template fields (TARGET/VARIANCE kinds stay informational)
  const routedFields: ExtractedField[] = full.routed
    .filter((r) => r.kind === "ACTUAL" && r.value !== null)
    .map((r) => {
      const bits: string[] = [r.sourceRef];
      if (r.evidence) bits.push(`"${r.evidence.slice(0, 80)}"`);
      bits.push(`router: ${r.confidence >= 0.85 ? "confident" : "needs verification"} match`);
      if (r.reportedTarget !== null && r.reportedTarget !== undefined) bits.push(`document target: ${r.reportedTarget}`);
      if (r.reportedVariance !== null && r.reportedVariance !== undefined) bits.push(`document variance: ${r.reportedVariance}`);
      if (r.duplicates > 0) bits.push(`seen ${r.duplicates + 1}× in document`);
      return {
        key: r.key,
        label: r.label,
        value: r.value,
        confidence: confBand(r.confidence),
        source: bits.join(" · "),
        needsReview: r.needsReview,
      } satisfies ExtractedField;
    });

  // Deterministic fallback for keys the AI/routing pass did not cover
  const det = mapTextToFields(markdown, department);
  const coveredKeys = new Set(routedFields.map((f) => f.key));
  const mergedFields = [...routedFields];
  for (const f of det.fields) {
    if (coveredKeys.has(f.key)) continue;
    mergedFields.push({ ...f, needsReview: true, source: `${f.source} · deterministic fallback` });
  }

  // Validation issues surface on the matching field's source line
  for (const issue of full.validation) {
    const f = mergedFields.find((x) => x.key === issue.field);
    if (f) {
      f.needsReview = f.needsReview || issue.severity !== "INFO";
      f.source = `${f.source} · ${issue.severity.toLowerCase()}: ${issue.message.slice(0, 140)}`;
    }
  }

  const aiChecked = full.coverage.aiStagesCompleted > 0;
  const aiNote = !aiChecked && full.warnings.length
    ? `AI stages unavailable (${full.warnings[0].slice(0, 120)}) — values above come from the deterministic pass`
    : full.meta.departmentMismatch || undefined;

  return {
    ok: true,
    rawText: markdown,
    fields: mergedFields,
    sections: {
      challenges: det.sections.challenges || null,
      escalations: det.sections.escalations || null,
      additionalActivities: det.sections.additionalActivities || null,
    },
    stats: {
      fieldsFound: mergedFields.length,
      fieldsNeedingReview: mergedFields.filter((f) => f.needsReview).length,
      aiChecked,
      aiNote,
    },
    doc: {
      markdown: ir.markdown.slice(0, 60000),
      ir: { format: ir.format, routeNote: ir.routeNote, stats: ir.stats, pages: ir.pages, sheets: ir.sheets },
      full,
    },
  };
}
