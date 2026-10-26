// ─────────────────────────────────────────────────────────────────────────────
// INTELLIGENT REPORT EXTRACTION ENGINE
// Extracts text from uploaded reports (PDF / DOCX / XLSX / CSV / TXT / images)
// and maps content onto the master template fields. Uncertain values are
// flagged — values are NEVER invented. Source location (page/sheet/section)
// is recorded for supervisor verification.
// ─────────────────────────────────────────────────────────────────────────────
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { AGENT_KPI_DEFS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";

export interface ExtractedField {
  key: string;
  label: string;
  value: number | string | null;
  confidence: "high" | "medium" | "low";
  source: string; // e.g. "KPI table", "Section: CHALLENGES", "Sheet: Sheet1", "page 2"
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
}

// ── Text extractors per format ──

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

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  // OCR via z-ai-web-dev-sdk vision model — untrusted content treated as data only.
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const b64 = buffer.toString("base64");
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe ALL text visible in this document image, preserving the reading order and table structure line by line. Keep every label and its value on the SAME line separated by ' | ' (e.g. 'Total Calls Made | 30'). Transcribe numbers exactly as printed — do not compute, round or infer anything. Output only the transcribed text, no commentary.",
            },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
          ],
        },
      ] as never,
    });
    const content = (completion as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
    return content || "";
  } catch (e) {
    throw new Error("Image OCR unavailable for this file. Please use manual entry instead.");
  }
}

// ── Field mapping ──

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9%()/\s-]/g, " ").replace(/\s+/g, " ").trim();

/** label aliases → template keys (supports the supervisor excel/csv originals + docx wording) */
const LABEL_ALIASES: Record<string, string[]> = {
  totalCallsMade: ["total calls made", "total calls", "calls made", "outbound calls", "total outbound calls attempted"],
  totalMailsSent: ["total mails sent", "total emails sent", "emails sent", "mails sent"],
  callsConnected: ["calls connected", "connected calls"],
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
  // tech summary
  tasksCompleted: ["tasks completed", "technical tasks completed"],
  bugsResolved: ["bugs resolved", "bug fixes", "bugs fixed"],
  supportTicketsResolved: ["support tickets resolved", "tickets resolved"],
  deploymentsCompleted: ["deployments completed", "deployments"],
  testCasesPassed: ["test cases passed"],
  milestonesDelivered: ["milestones delivered"],
  codeReviewsDone: ["code reviews done"],
  // social summary
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
  // Look for the first plausible number within ~120 chars after the label match
  const window = text.slice(idx, idx + 160);
  // skip the label itself (may contain digits like "HOT / WARM")
  const m = window.match(/(:|\||\t|—|–|-|=|\s)\s*(-?\d[\d,]*(?:\.\d+)?)\s*(%|mins?|minutes)?/i);
  if (m) {
    const raw = m[2].replace(/,/g, "");
    const v = parseFloat(raw);
    if (!Number.isNaN(v)) return { value: v, end: idx + (m.index || 0) + m[0].length };
  }
  return null;
}

// ── Validation ──

const PERCENT_KEYS = new Set(["contactRate", "conversionRate", "slaAdherence", "scheduleAdherence"]);

/** Field-level sanity checks. Never alters a source value — flags it for review instead. */
function validateField(key: string, value: number): { ok: boolean; note?: string } {
  if (value < 0) return { ok: false, note: "negative value" };
  if (PERCENT_KEYS.has(key) && value > 100) return { ok: false, note: "percent value above 100" };
  if (!Number.isFinite(value)) return { ok: false, note: "not a finite number" };
  return { ok: true };
}

// ── LLM-assisted extraction (context-aware, evidence-based) ──

interface LlmField {
  key: string;
  value: number | string | null;
  confidence: "high" | "medium" | "low";
  evidence: string;
}

interface LlmExtraction {
  documentType: string;
  fields: LlmField[];
  sections: { challenges?: string | null; escalations?: string | null; additionalActivities?: string | null };
}

/**
 * Second extraction stage: an LLM reads the whole document with the target
 * field list and returns evidence-backed values (or null). This catches values
 * the deterministic label-matching pass misses (different wording, tables,
 * numbers positioned before labels) and cross-checks the ones it found.
 * NEVER invents values — null means "not in the document". Failures are
 * non-fatal: the deterministic result stands on its own.
 */
async function llmRefine(
  rawText: string,
  department: string,
  defs: { key: string; label: string; unit?: string }[],
  deterministic: Record<string, number>
): Promise<{ llm: LlmExtraction | null; error?: string }> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const fieldList = defs.map((d) => `- ${d.key} ("${d.label}"${d.unit ? `, unit: ${d.unit}` : ""})`).join("\n");
    const detNotes = Object.entries(deterministic).map(([k, v]) => `${k}=${v}`).join(", ") || "none";
    const system = [
      "You are a precise data-extraction engine for daily staff reports.",
      "Rules:",
      "1. First determine the document type and its purpose (e.g. BPO outbound agent daily report, technical team report, social media report, supervisor report).",
      "2. For EACH requested field, find its value in the document using the field's meaning, the labels/headings around it, and the table structure — never just because a number exists.",
      "3. Distinguish the KPI summary table from other sections. Call-log rows like '2 | Florida Dept of Health - 813-307-8000 | Not Interested | No | said not interested' contain a ROW INDEX (the leading 2) and a call OUTCOME — neither is a KPI value. Phone numbers, example rows, page numbers and dates are NOT metric values.",
      "4. Prefer a value stated in the KPI/summary table for that exact metric. When a metric is derived (e.g. a rate), extract it only if explicitly stated — do not calculate it.",
      "5. If a value is genuinely absent, return null. NEVER guess or invent. Never reuse another field's value.",
      "6. evidence = the exact text snippet (≤120 chars) that supports the value.",
      "7. confidence: high = explicit label+value pair in a summary/KPI table; medium = clear contextual match; low = ambiguous.",
      "Respond with STRICT JSON only, no markdown fences, in this exact shape:",
      '{"documentType":"...","fields":[{"key":"...","value":123,"confidence":"high","evidence":"..."}],"sections":{"challenges":"... or null","escalations":"... or null","additionalActivities":"... or null"}}',
      "sections text must be verbatim from the document (≤600 chars each), null when the section does not exist.",
    ].join("\n");
    const user = [
      `Department context: ${department}`,
      `A deterministic pass already extracted (may contain mistakes): ${detNotes}`,
      `Requested fields:\n${fieldList}`,
      "Document text:",
      rawText.slice(0, 14000),
    ].join("\n\n");

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ] as never,
      thinking: { type: "disabled" },
    });
    const content = (completion as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || "";
    const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return { llm: null, error: "AI response was not JSON" };
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as LlmExtraction;
    if (!parsed || !Array.isArray(parsed.fields)) return { llm: null, error: "AI response had no fields" };
    return { llm: parsed };
  } catch (e) {
    if (process.env.KALLMANIA_EXTRACT_DEBUG) console.error("[extract] llmRefine failed:", (e as Error).message);
    return { llm: null, error: (e as Error).message };
  }
}

/**
 * Map raw text onto template fields.
 * Strategy: for each KPI definition, scan alias labels; take the nearest number after the label.
 * Confidence high when label + number on same line; medium across lines; flagged otherwise.
 */
export function mapTextToFields(rawText: string, department: string): { fields: ExtractedField[]; sections: ExtractionResult["sections"] } {
  const lines = rawText.split(/\r?\n/);
  const normLines = lines.map((l) => normalize(l));
  // Call-log rows (leading row index + pipes + phone numbers / disposition
  // wording) poison the flat-text CONTEXT pass — the next row's index looks
  // like the metric value (e.g. "... | Not Interested | No | ..." followed by
  // "3 | East Lake Dental" reads as notInterested=3). They are excluded from
  // the context text; the SAME-LINE pass above still reads every line, so real
  // KPI tables in pipe format keep working.
  const isCallLogRow = (l: string) =>
    /^\s*\d+\s*\|/.test(l) &&
    (/\d{3}[-\s]\d{3}[-\s]\d{4}/.test(l) || /(interested|callback|no answer|busy|wrong number|voicemail|meeting booked|hot lead|warm lead|requested for email)/i.test(l));
  const contextText = lines.filter((l) => !isCallLogRow(l)).join("\n");
  const flatNorm = normalize(contextText);
  const fields: ExtractedField[] = [];
  const claimed: [number, number][] = []; // char ranges consumed

  const relevantDefs =
    department === "WEB_DEV"
      ? TECH_SUMMARY_METRICS.map((m) => ({ key: m.key, label: m.label }))
      : department === "SOCIAL_MEDIA"
        ? SOCIAL_SUMMARY_METRICS.map((m) => ({ key: m.key, label: m.label }))
        : AGENT_KPI_DEFS.map((d) => ({ key: d.key, label: d.label }));

  for (const def of relevantDefs) {
    const aliases = LABEL_ALIASES[def.key] || [normalize(def.label)];
    let found: ExtractedField | null = null;
    for (const alias of aliases) {
      // 1) same-line match: "label ... number" within one line
      for (let i = 0; i < lines.length; i++) {
        const nl = normLines[i];
        if (!nl.includes(alias)) continue;
        const numMatch = lines[i].match(/(-?\d[\d,]*(?:\.\d+)?)\s*(%|mins?|minutes)?\s*$/i) ||
          lines[i].match(/[:|\t]\s*(-?\d[\d,]*(?:\.\d+)?)/);
        if (numMatch) {
          const v = parseFloat(numMatch[1].replace(/,/g, ""));
          if (!Number.isNaN(v)) {
            found = {
              key: def.key,
              label: def.label,
              value: v,
              confidence: "high",
              source: `Line ${i + 1}: "${lines[i].trim().slice(0, 80)}"`,
              needsReview: false,
            };
            break;
          }
        }
      }
      if (found) break;
      // 2) flat-text match: label followed by a number
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
    if (found) fields.push(found);
  }

  // Sections: challenges / escalations / additional activities
  const sections: ExtractionResult["sections"] = {};
  for (const heading of SECTION_HEADINGS) {
    for (let i = 0; i < lines.length; i++) {
      const nl = normLines[i];
      const hit = heading.aliases.some((a) => nl.includes(normalize(a)));
      if (!hit) continue;
      // capture following non-empty lines until next section-like heading or blank gap
      const buf: string[] = [];
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
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

export async function extractReport(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  department: string
): Promise<ExtractionResult> {
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  let rawText = "";
  let sourceNote = "file";

  try {
    if (ext === "docx" || mimeType.includes("wordprocessingml")) {
      rawText = await extractTextFromDocx(buffer);
      sourceNote = "DOCX document";
    } else if (ext === "xlsx" || ext === "xls" || ext === "csv" || mimeType.includes("spreadsheetml") || mimeType.includes("excel") || mimeType.includes("csv")) {
      const r = await extractTextFromXlsx(buffer);
      rawText = r.text;
      sourceNote = `Excel workbook (${r.sheetNames.join(", ")})`;
    } else if (ext === "pdf" || mimeType === "application/pdf") {
      rawText = await extractTextFromPdf(buffer);
      sourceNote = "PDF document";
    } else if (ext === "txt" || ext === "md" || mimeType.startsWith("text/")) {
      rawText = buffer.toString("utf8");
      sourceNote = "Text file";
    } else if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) {
      rawText = await extractTextFromImage(buffer, mimeType || "image/png");
      sourceNote = "Image document (OCR)";
    } else {
      return { ok: false, error: `Unsupported file type: .${ext || mimeType}. Supported: PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG.`, rawText: "", fields: [], sections: {}, stats: { fieldsFound: 0, fieldsNeedingReview: 0, aiChecked: false } };
    }
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message || "Could not read the document. The file may be corrupted, handwritten, or a poor-quality scan — please use manual entry.",
      rawText: "",
      fields: [],
      sections: {},
      stats: { fieldsFound: 0, fieldsNeedingReview: 0, aiChecked: false },
    };
  }

  const { fields, sections } = mapTextToFields(rawText || "", department);

  // ── Stage 2: LLM cross-check + gap-fill (non-fatal) ──
  // Deterministic high-confidence values stay unless contradicted by the AI
  // cross-check (then flagged for review, value kept). Missing fields are
  // filled from the AI only with real evidence; validation flags outliers.
  let fieldsMerged = fields;
  let sectionsMerged = sections;
  let documentTypeNote = "";
  let aiChecked = false;
  let aiNote: string | undefined;
  try {
    const relevantDefs =
      department === "WEB_DEV"
        ? TECH_SUMMARY_METRICS.map((m) => ({ key: m.key, label: m.label }))
        : department === "SOCIAL_MEDIA"
          ? SOCIAL_SUMMARY_METRICS.map((m) => ({ key: m.key, label: m.label }))
          : AGENT_KPI_DEFS.map((d) => ({ key: d.key, label: d.label, unit: d.unit }));
    const detMap: Record<string, number> = {};
    for (const f of fields) if (typeof f.value === "number") detMap[f.key] = f.value;
    const { llm, error } = await llmRefine(rawText || "", department, relevantDefs, detMap);
    if (!llm) {
      aiChecked = false;
      aiNote = error ? `AI cross-check unavailable (${error}) — values above come from the deterministic pass` : undefined;
    }
    if (llm) {
      aiChecked = true;
      documentTypeNote = llm.documentType || "";
      const llmByKey = new Map<string, LlmField>();
      for (const lf of llm.fields || []) {
        if (!lf || !lf.key) continue;
        if (relevantDefs.some((d) => d.key === lf.key)) llmByKey.set(lf.key, lf);
      }
      const merged: ExtractedField[] = [];
      for (const f of fields) {
        const ai = llmByKey.get(f.key);
        if (typeof f.value === "number") {
          const v = validateField(f.key, f.value);
          if (!v.ok) {
            f.needsReview = true;
            f.source = `${f.source} · validation: ${v.note}`;
          }
          if (ai && typeof ai.value === "number" && Math.abs(ai.value - f.value) > 1e-9) {
            f.needsReview = true;
            f.source = `${f.source} · AI cross-check suggests ${ai.value} ("${String(ai.evidence || "").slice(0, 60)}")`;
          } else if (f.confidence !== "high" && ai && (ai.value === null || ai.value === undefined || ai.value === "")) {
            // Deterministic guess (context match) the AI could not confirm anywhere
            // in the document — almost always a false-positive label collision
            // (e.g. a call-log row matching a KPI alias). Flag, keep the value.
            f.needsReview = true;
            f.source = `${f.source} · AI cross-check: value not found in document — verify or clear`;
          }
          merged.push(f);
        } else {
          merged.push(f);
        }
      }
      // Gap-fill: fields the deterministic pass missed entirely
      for (const def of relevantDefs) {
        if (merged.some((f) => f.key === def.key)) continue;
        const ai = llmByKey.get(def.key);
        if (!ai || ai.value === null || ai.value === undefined || ai.value === "") continue;
        const num = typeof ai.value === "number" ? ai.value : parseFloat(String(ai.value).replace(/,/g, ""));
        if (Number.isNaN(num)) continue;
        const v = validateField(def.key, num);
        const conf = ai.confidence === "high" ? "medium" : "low"; // AI-only findings never claim high
        merged.push({
          key: def.key,
          label: def.label,
          value: num,
          confidence: conf,
          source: `AI extraction${documentTypeNote ? ` (${documentTypeNote})` : ""}: "${String(ai.evidence || "").slice(0, 80)}"${v.ok ? "" : ` · validation: ${v.note}`}`,
          needsReview: true,
        });
      }
      fieldsMerged = merged;
      // Sections: deterministic wins when present, AI fills the gaps
      sectionsMerged = {
        challenges: sections.challenges || (llm.sections?.challenges || null),
        escalations: sections.escalations || (llm.sections?.escalations || null),
        additionalActivities: sections.additionalActivities || (llm.sections?.additionalActivities || null),
      };
    }
  } catch {
    // AI stage is best-effort — deterministic result already usable
  }

  return {
    ok: true,
    rawText: (rawText || "").slice(0, 30000),
    fields: fieldsMerged,
    sections: sectionsMerged,
    stats: {
      fieldsFound: fieldsMerged.length,
      fieldsNeedingReview: fieldsMerged.filter((f) => f.needsReview).length,
      aiChecked,
      aiNote,
    },
  };
}
