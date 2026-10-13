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
  stats: { fieldsFound: number; fieldsNeedingReview: number };
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
  return typeof text === "string" ? text : Array.isArray(text) ? text.join("\n") : "";
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
              text: "Transcribe ALL text visible in this document image, preserving table structure line by line. Output only the transcribed text, no commentary.",
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

/**
 * Map raw text onto template fields.
 * Strategy: for each KPI definition, scan alias labels; take the nearest number after the label.
 * Confidence high when label + number on same line; medium across lines; flagged otherwise.
 */
export function mapTextToFields(rawText: string, department: string): { fields: ExtractedField[]; sections: ExtractionResult["sections"] } {
  const lines = rawText.split(/\r?\n/);
  const normLines = lines.map((l) => normalize(l));
  const flatNorm = normalize(rawText);
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
      return { ok: false, error: `Unsupported file type: .${ext || mimeType}. Supported: PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG.`, rawText: "", fields: [], sections: {}, stats: { fieldsFound: 0, fieldsNeedingReview: 0 } };
    }
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message || "Could not read the document. The file may be corrupted, handwritten, or a poor-quality scan — please use manual entry.",
      rawText: "",
      fields: [],
      sections: {},
      stats: { fieldsFound: 0, fieldsNeedingReview: 0 },
    };
  }

  const { fields, sections } = mapTextToFields(rawText || "", department);
  return {
    ok: true,
    rawText: (rawText || "").slice(0, 30000),
    fields,
    sections,
    stats: {
      fieldsFound: fields.length,
      fieldsNeedingReview: fields.filter((f) => f.needsReview).length,
    },
  };
}
