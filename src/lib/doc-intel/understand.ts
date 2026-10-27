// ─────────────────────────────────────────────────────────────────────────────
// STAGE B + C — UNDERSTAND THE DOCUMENT, THEN EXTRACT WITH EVIDENCE
//
// Adapted from the genai_agents "Document Intake Agent" analyst prompt
// ("answer using only the document; quote figures exactly; say when it is
// absent") and its key insight that converted structure — not scraped text —
// is what the model should read. The document markdown is read IN CHUNKS
// WITH OVERLAP so long reports are read to the very end (sections near the
// end are the classic silent omission). The model returns findings with the
// label EXACTLY as printed — it never assigns template keys. Routing is a
// separate deterministic stage (routing.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { DocumentMeta, KpiFinding, NarrativeSection, UnmappedItem } from "./types";

const MAX_CHUNK = 11000;
const OVERLAP = 700;
const MAX_CHUNKS = 6; // ≈66k chars of coverage
const MAX_NARRATIVE_PER_CHUNK = 16;

export function chunkMarkdown(markdown: string): { text: string; index: number; of: number }[] {
  const total = Math.max(1, Math.ceil(markdown.length / (MAX_CHUNK - OVERLAP)));
  const of = Math.min(MAX_CHUNKS, total);
  if (markdown.length <= MAX_CHUNK) return [{ text: markdown, index: 1, of: 1 }];
  const chunks: { text: string; index: number; of: number }[] = [];
  let cursor = 0;
  for (let i = 0; i < of; i++) {
    const isLast = i === of - 1;
    const end = isLast ? markdown.length : Math.min(markdown.length, cursor + MAX_CHUNK);
    chunks.push({ text: markdown.slice(cursor, end), index: i + 1, of });
    if (isLast) break;
    // Advance into fresh territory; re-read the overlap for context continuity
    let next = cursor + MAX_CHUNK - OVERLAP;
    if (next <= cursor) next = cursor + MAX_CHUNK;
    cursor = next;
  }
  return chunks;
}

interface ChunkExtraction {
  documentType?: string;
  reportTypeGuess?: string;
  reportingPeriod?: string | null;
  agentName?: string | null;
  team?: string | null;
  campaign?: string | null;
  attendance?: DocumentMeta["attendance"];
  findings?: {
    label?: string;
    value?: number | string | null;
    kind?: string;
    unit?: string | null;
    evidence?: string;
    sourceRef?: string;
    confidence?: number;
  }[];
  sections?: { heading?: string; content?: string; sourceRef?: string }[];
  unmapped?: { label?: string; content?: string; sourceRef?: string }[];
  partial?: boolean;
}

const SYSTEM_PROMPT = [
  "You are a meticulous document-understanding engine for workplace daily reports.",
  "You read the WHOLE document and describe what is actually in it — you never invent content.",
  "Rules:",
  "1. First understand the document: what type of report it is, the reporting period, the person/team it belongs to, the campaign if any, and attendance details (shift time, clock-in, clock-out, attendance status, lateness minutes) when present.",
  "2. Then inventory EVERY heading/section the document contains with its verbatim content (trim only page furniture). Include sections at the very end of the document — they matter.",
  "3. Then find EVERY metric-like value: KPI table cells, targets, actuals, variances, percentages, counts, durations. For each one report:",
   "   - label: the metric name EXACTLY as printed (do not translate, do not rename, do not guess a canonical name)",
   "   - value: the number exactly as printed (strip thousands separators; keep negatives and zeros)",
   "   - kind: TARGET when the column/row context says target/plan/goal; VARIANCE when it says variance/difference/delta; ACTUAL for reported results; UNKNOWN when unclear",
   "   - unit: count | percent | minutes | other text next to the number",
   "   - evidence: the exact snippet (≤160 chars) containing label and value together",
   "   - sourceRef: the table (e.g. 'Table 2 row 3'), section heading, page or sheet where it appears",
   "   - confidence: 0..1 — how sure you are this label+value pair is stated by the document (1 = explicit label+value pair in a summary/KPI table)",
  "4. NEVER treat call-log / activity-log rows as metrics: leading row indexes, phone numbers, page numbers and dates are NOT metric values. A row like '2 | Florida Dept of Health - 813-307-8000 | Not Interested | No' contributes NO finding.",
  "5. NEVER confuse similar metrics: 'Calls Made'/'Dialled' and 'Calls Answered'/'Connected' are different metrics; 'Reach' and 'Impressions' are different; 'Posts Planned' and 'Posts Published' are different. Copy the printed label verbatim so the downstream router can distinguish them.",
  "6. Values that are clearly narrative content rather than a labelled metric (task lists, remarks, explanations, supervisor observations, recommendations) belong in 'sections' or 'unmapped', NOT in findings.",
  "7. If a value or section genuinely does not exist, omit it. NEVER guess, never compute, never reuse another field's value.",
  "Respond with STRICT JSON only (no markdown fences):",
  '{"documentType":"...","reportTypeGuess":"AGENT_BPO|TECH|SOCIAL|SUPERVISOR|TEAM_LEAD|UNKNOWN","reportingPeriod":"... or null","agentName":"... or null","team":"... or null","campaign":"... or null","attendance":{"shiftTime":"... or null","clockIn":"... or null","clockOut":"... or null","attendanceStatus":"Present|Late|Absent or null","latenessMins":0 or null},"findings":[{"label":"...","value":123,"kind":"ACTUAL","unit":"count","evidence":"...","sourceRef":"Table 1 row 2","confidence":0.95}],"sections":[{"heading":"...","content":"verbatim ≤1200 chars","sourceRef":"..."}],"unmapped":[{"label":"...","content":"≤600 chars","sourceRef":"..."}]}',
].join("\n");

function userPrompt(chunkText: string, index: number, of: number, department: string): string {
  return [
    `The user selected department "${department}" — note when the document looks like a different report type.`,
    of > 1
      ? `This is part ${index} of ${of} of the SAME document (chunks overlap slightly). Extract everything visible in THIS part; earlier parts already covered preceding content.`
      : "Read the entire document below.",
    "Document markdown:",
    chunkText,
  ].join("\n\n");
}

async function callLlm(system: string, user: string): Promise<ChunkExtraction | null> {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();
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
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as ChunkExtraction;
  } catch {
    return null;
  }
}

const cleanText = (s: unknown, max: number): string =>
  typeof s === "string" ? s.replace(/\s+\n/g, "\n").trim().slice(0, max) : "";

function parseNum(v: unknown): number | string | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(/,/g, "").replace(/(\d)%$/, "$1"));
    return Number.isNaN(n) ? t.slice(0, 120) : n;
  }
  return null;
}

const KINDS = new Set(["ACTUAL", "TARGET", "VARIANCE", "UNKNOWN"]);
const normKind = (k: unknown): KpiFinding["kind"] => {
  const t = String(k ?? "").toUpperCase();
  if (KINDS.has(t)) return t as KpiFinding["kind"];
  if (t.includes("TARGET") || t.includes("PLAN") || t.includes("GOAL")) return "TARGET";
  if (t.includes("VARIANCE") || t.includes("DELTA") || t.includes("DIFF")) return "VARIANCE";
  return "ACTUAL";
};

export interface UnderstandResult {
  meta: DocumentMeta;
  findings: KpiFinding[];
  sections: NarrativeSection[];
  unmapped: UnmappedItem[];
  chunksRead: number;
  aiStageFailures: string[];
}

/** Read the full document in overlapping chunks and merge a complete picture. */
export async function understandDocument(
  markdown: string,
  department: string,
  opts?: { skipAi?: boolean }
): Promise<UnderstandResult> {
  const chunks = chunkMarkdown(markdown);
  const failures: string[] = [];
  const meta: DocumentMeta = { docType: "", reportTypeGuess: "UNKNOWN" };
  const findings: KpiFinding[] = [];
  const sections: NarrativeSection[] = [];
  const unmapped: UnmappedItem[] = [];

  if (opts?.skipAi) return { meta, findings, sections, unmapped, chunksRead: 0, aiStageFailures: ["AI unavailable — structural parse only"] };

  for (const chunk of chunks) {
    try {
      const parsed = await callLlm(SYSTEM_PROMPT, userPrompt(chunk.text, chunk.index, chunk.of, department));
      if (!parsed) {
        failures.push(`AI part ${chunk.index}/${chunk.of} returned unparseable output`);
        continue;
      }
      // meta: first chunk that reports a docType wins
      if (!meta.docType && parsed.documentType) {
        meta.docType = cleanText(parsed.documentType, 200);
        meta.reportTypeGuess = cleanText(parsed.reportTypeGuess, 40).toUpperCase() || "UNKNOWN";
        meta.reportingPeriod = cleanText(parsed.reportingPeriod, 80) || null;
        meta.agentName = cleanText(parsed.agentName, 120) || null;
        meta.team = cleanText(parsed.team, 120) || null;
        meta.campaign = cleanText(parsed.campaign, 120) || null;
        if (parsed.attendance && typeof parsed.attendance === "object") {
          const a = parsed.attendance as Record<string, unknown>;
          meta.attendance = {
            shiftTime: cleanText(a.shiftTime, 40) || null,
            clockIn: cleanText(a.clockIn, 20) || null,
            clockOut: cleanText(a.clockOut, 20) || null,
            attendanceStatus: cleanText(a.attendanceStatus, 20) || null,
            latenessMins: typeof a.latenessMins === "number" ? a.latenessMins : null,
          };
        }
      }
      for (const f of parsed.findings ?? []) {
        if (!f || cleanText(f.label, 160) === "") continue;
        const value = parseNum(f.value);
        if (value === null) continue;
        findings.push({
          rawLabel: cleanText(f.label, 160),
          value,
          kind: normKind(f.kind),
          unit: cleanText(f.unit, 30) || null,
          evidence: cleanText(f.evidence, 160),
          sourceRef: cleanText(f.sourceRef, 120) || "document body",
          confidence: typeof f.confidence === "number" ? Math.min(1, Math.max(0, f.confidence)) : 0.6,
        });
      }
      for (const s of (parsed.sections ?? []).slice(0, MAX_NARRATIVE_PER_CHUNK)) {
        const heading = cleanText(s.heading, 160);
        const content = cleanText(s.content, 1200);
        if (!heading || !content) continue;
        sections.push({ heading, content, sourceRef: cleanText(s.sourceRef, 120) || "document body" });
      }
      for (const u of (parsed.unmapped ?? []).slice(0, 12)) {
        const label = cleanText(u.label, 160);
        const content = cleanText(u.content, 600);
        if (!label || !content) continue;
        unmapped.push({ label, content, sourceRef: cleanText(u.sourceRef, 120) || "document body", reason: "no matching template field detected yet" });
      }
    } catch (e) {
      failures.push(`AI part ${chunk.index}/${chunk.of} failed: ${(e as Error).message?.slice(0, 120)}`);
    }
  }

  // ── Merge across chunks: dedupe identical findings, flag conflicts ──
  const key = (f: KpiFinding) => `${f.rawLabel.toLowerCase().replace(/[^a-z0-9%]/g, "")}|${f.kind}`;
  const byKey = new Map<string, KpiFinding>();
  for (const f of findings) {
    const k = key(f);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, { ...f });
      continue;
    }
    // Same label+kind: identical value → keep the higher-confidence copy, note duplicate
    const sameValue = typeof prev.value === "number" && typeof f.value === "number" && Math.abs(prev.value - f.value) < 1e-9;
    if (sameValue) {
      if (f.confidence > prev.confidence) {
        byKey.set(k, { ...f, duplicateOf: true });
      } else {
        prev.duplicateOf = true;
      }
      continue;
    }
    // Conflicting values for the same printed label — keep both, mark the later as conflicting
    const conflictCopy: KpiFinding = { ...f, duplicateOf: true, confidence: Math.min(f.confidence, 0.55) };
    if (f.confidence > prev.confidence) byKey.set(k, { ...f });
    byKey.set(k + `#${byKey.size}`, conflictCopy);
  }
  const mergedFindings = [...byKey.values()];

  // Merge duplicate narrative sections with the same heading (long sections spanning chunks)
  const mergedSections: NarrativeSection[] = [];
  for (const s of sections) {
    const k = s.heading.toLowerCase().replace(/[^a-z0-9]/g, "");
    const prev = mergedSections.find((x) => x.heading.toLowerCase().replace(/[^a-z0-9]/g, "") === k);
    if (!prev) {
      mergedSections.push({ ...s });
    } else if (s.content.length > prev.content.length) {
      prev.content = s.content; // overlapping chunks — keep the fuller verbatim text
    }
  }
  const mergedUnmapped: UnmappedItem[] = [];
  for (const u of unmapped) {
    const k = (u.label + "|" + u.content).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
    if (!mergedUnmapped.some((x) => (x.label + "|" + x.content).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80) === k)) {
      mergedUnmapped.push(u);
    }
  }

  return {
    meta,
    findings: mergedFindings,
    sections: mergedSections,
    unmapped: mergedUnmapped,
    chunksRead: chunks.length,
    aiStageFailures: failures,
  };
}
