// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT INTELLIGENCE — shared types
//
// Pipeline (adapted from the agent patterns in nirdiamant/genai_agents —
// Document Intake Agent, Human-in-the-Loop Approval Agent, One-Step Decision
// Router — reimplemented natively for this TypeScript/Next.js stack):
//
//   Upload → detect type → parse (structure-preserving) → understand (LLM,
//   chunked full read) → extract findings (evidence-backed) → route KPIs
//   (deterministic engine, confidence-gated) → validate (code, not LLM) →
//   human review → confirm → report generated from the existing template.
//
// The AI interprets content; the routing engine decides destinations; the
// existing template decides final structure.
// ─────────────────────────────────────────────────────────────────────────────

/** One structural block of the source document, in original reading order. */
export type DocBlock =
  | { kind: "heading"; level: number; text: string; ref: string }
  | { kind: "paragraph"; text: string; ref: string }
  | { kind: "list"; items: string[]; ref: string }
  | {
      kind: "table";
      header: string[];
      rows: string[][];
      /** 1-based data-row count (rows excluding header) */
      rowCount: number;
      caption?: string;
      ref: string;
    };

/** Structural representation of the whole source document (Stage A output). */
export interface DocumentIR {
  format: "docx" | "xlsx" | "csv" | "pdf" | "image" | "text";
  /** Format routing was deterministic (capability lookup), not an LLM guess */
  routeNote: string;
  blocks: DocBlock[];
  /** Canonical markdown rendering — tables stay tables, headings stay headings */
  markdown: string;
  pages?: number;
  sheets?: string[];
  stats: { headings: number; tables: number; paragraphs: number; chars: number };
}

/** What the document is — understood BEFORE any field extraction. */
export interface DocumentMeta {
  docType: string;
  /** One of AGENT_BPO | TECH | SOCIAL | SUPERVISOR | TEAM_LEAD | UNKNOWN */
  reportTypeGuess: string;
  reportingPeriod?: string | null;
  agentName?: string | null;
  team?: string | null;
  campaign?: string | null;
  attendance?: {
    shiftTime?: string | null;
    clockIn?: string | null;
    clockOut?: string | null;
    attendanceStatus?: string | null;
    latenessMins?: number | null;
  } | null;
  /** Non-empty when the document type conflicts with the department the user selected */
  departmentMismatch?: string | null;
}

/** Value kind — never confuse targets, actuals and variances. */
export type FindingKind = "ACTUAL" | "TARGET" | "VARIANCE" | "UNKNOWN";

/** One metric-like value found in the document, with exact evidence. */
export interface KpiFinding {
  /** The label EXACTLY as printed in the document (e.g. "Calls Answered") */
  rawLabel: string;
  value: number | string | null;
  kind: FindingKind;
  unit?: string | null;
  /** Verbatim snippet (≤160 chars) that supports the value */
  evidence: string;
  /** Where it came from: "Table 2 row 3", "Section: CHALLENGES", "page 2", "Sheet: Daily" */
  sourceRef: string;
  /** 0..1 model confidence that this label+value pair is what the document states */
  confidence: number;
  /** Seen in more than one place — dedupe/conflict detection */
  duplicateOf?: boolean;
}

/** A narrative section preserved in full (even when no template field fits). */
export interface NarrativeSection {
  heading: string;
  /** Verbatim document text (trimmed of page furniture) */
  content: string;
  sourceRef: string;
}

/** Content with no confident template destination — preserved, never dropped. */
export interface UnmappedItem {
  label: string;
  content: string;
  sourceRef: string;
  /** Why it was not auto-mapped */
  reason: string;
}

/** Result of routing one finding to a template destination (Stage D). */
export interface RoutedKpi {
  key: string;
  label: string;
  value: number | null;
  kind: FindingKind;
  unit: string;
  confidence: number;
  evidence: string;
  sourceRef: string;
  needsReview: boolean;
  reviewReason?: string;
  /** Extra occurrences of the same metric elsewhere in the document */
  duplicates: number;
  /** Reported variance, when the document states one */
  reportedVariance?: number | null;
  /** Reported target, when the document states one */
  reportedTarget?: number | null;
}

/** Code-side validation issue (Stage E — validation is code, never an LLM judgement). */
export interface ValidationIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  field: string;
  message: string;
}

/** Full two-layer extraction (Stage B..E output). */
export interface FullExtraction {
  meta: DocumentMeta;
  /** Every narrative section found in the document */
  sections: NarrativeSection[];
  /** Raw findings as printed in the document (pre-routing) */
  findings: KpiFinding[];
  /** Findings after deterministic routing to the real template fields */
  routed: RoutedKpi[];
  /** Sections that matched template narrative fields (already destination-assigned) */
  sectionText: {
    challenges?: string | null;
    escalations?: string | null;
    additionalActivities?: string | null;
    qaObservations?: string | null;
    coaching?: string | null;
    highlights?: string | null;
    lowlights?: string | null;
    actionPlan?: string | null;
  };
  /** Sections/content that did not fit any template field — preserved */
  unmapped: UnmappedItem[];
  validation: ValidationIssue[];
  coverage: {
    fieldsMapped: number;
    fieldsTotal: number;
    sectionsCaptured: number;
    unmappedCount: number;
    chunksRead: number;
    aiStagesCompleted: number;
  };
  warnings: string[];
}

export type DocIntelDepartment = "BPO" | "WEB_DEV" | "SOCIAL_MEDIA" | "MANAGEMENT";
