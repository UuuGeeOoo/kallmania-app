// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT INTELLIGENCE PIPELINE — orchestrator
//
// Upload → detect file type (deterministic) → parse (structure-preserving)
//       → understand + extract (LLM, chunked full read, evidence-backed)
//       → route KPIs (deterministic engine, confidence-gated)
//       → validate (code) → [human review in the UI] → confirm.
//
// Techniques adapted from nirdiamant/genai_agents (Document Intake Agent,
// One-Step Decision Router, Human-in-the-Loop Approval Agent); reimplemented
// natively for this TypeScript/Next.js/z-ai stack. No repository code is
// copied — the repository is licensed for non-commercial use only.
// ─────────────────────────────────────────────────────────────────────────────
import { parseDocx, parseImage, parsePdf, parseSheet, parseText } from "./parse";
import { understandDocument } from "./understand";
import { routeKpis } from "./routing";
import { runValidation } from "./validate";
import type { DocumentIR, DocIntelDepartment, FullExtraction } from "./types";

export type { DocumentIR, DocIntelDepartment, FullExtraction } from "./types";

export interface PipelineOutput {
  ok: boolean;
  error?: string;
  ir: DocumentIR | null;
  full: FullExtraction | null;
}

const IMAGE_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/** Deterministic format routing — a capability lookup, not a model judgement. */
export async function runDocumentIntelligence(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  departmentRaw: string,
  opts?: { skipAi?: boolean }
): Promise<PipelineOutput> {
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  const department: DocIntelDepartment =
    departmentRaw === "WEB_DEV" || departmentRaw === "SOCIAL_MEDIA" || departmentRaw === "MANAGEMENT"
      ? departmentRaw
      : "BPO";

  // ── Stage A: parse ──
  let ir: DocumentIR;
  try {
    if (ext === "docx" || mimeType.includes("wordprocessingml")) {
      ir = await parseDocx(buffer);
    } else if (ext === "xlsx" || ext === "xls" || mimeType.includes("spreadsheetml") || mimeType.includes("ms-excel")) {
      ir = await parseSheet(buffer, "xlsx");
    } else if (ext === "csv" || mimeType.includes("csv")) {
      ir = await parseSheet(buffer, "csv");
    } else if (ext === "pdf" || mimeType === "application/pdf") {
      ir = await parsePdf(buffer);
      const noText = ir.markdown.replace(/\s/g, "").length < 40;
      if (noText) {
        return {
          ok: false,
          error:
            "This PDF has no selectable text — it looks like a scan. Export the report as DOCX/XLSX, or upload the pages as PNG/JPG images (those are OCR-read), or use manual entry.",
          ir,
          full: null,
        };
      }
    } else if (ext === "txt" || ext === "md" || mimeType.startsWith("text/")) {
      ir = parseText(buffer);
    } else if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) {
      const mime = IMAGE_MIMES.includes(mimeType) ? mimeType : ext === "png" ? "image/png" : "image/jpeg";
      ir = await parseImage(buffer, mime);
    } else {
      return {
        ok: false,
        error: `Unsupported file type: .${ext || mimeType}. Supported: PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG.`,
        ir: null,
        full: null,
      };
    }
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message?.slice(0, 300) || "Could not read the document. The file may be corrupted or an unsupported variant — please use manual entry.",
      ir: null,
      full: null,
    };
  }

  // ── Stage B+C: understand + evidence-backed extraction (chunked full read) ──
  const understood = await understandDocument(ir.markdown, department, { skipAi: opts?.skipAi });

  // Department mismatch check — the router needs the right destination table
  const guess = understood.meta.reportTypeGuess || "UNKNOWN";
  const deptByType: Record<string, DocIntelDepartment> = {
    AGENT_BPO: "BPO",
    TECH: "WEB_DEV",
    SOCIAL: "SOCIAL_MEDIA",
    SUPERVISOR: "MANAGEMENT",
    TEAM_LEAD: "SOCIAL_MEDIA",
  };
  const guessedDept = deptByType[guess];
  let mismatch: string | null = null;
  if (guessedDept && guessedDept !== department) {
    const label: Record<DocIntelDepartment, string> = { BPO: "Call Centre (BPO)", WEB_DEV: "Web Development & Technical", SOCIAL_MEDIA: "Social Media", MANAGEMENT: "Management / Supervisor" };
    mismatch = `This document looks like a ${understood.meta.docType || guess} report, but it was uploaded under the ${label[department]} department. Verify the department selection — the KPI destinations below follow the selected department.`;
  }

  // ── Stage D: deterministic KPI routing ──
  const routing = routeKpis(department, understood.findings, understood.sections, understood.meta, mismatch);

  const full: FullExtraction = {
    meta: { ...understood.meta, departmentMismatch: mismatch },
    sections: understood.sections,
    findings: understood.findings,
    routed: routing.routed,
    sectionText: routing.sectionText,
    unmapped: routing.unmapped,
    validation: [],
    coverage: {
      fieldsMapped: routing.routed.filter((r) => r.value !== null).length,
      fieldsTotal: ir.markdown.length > 0 ? Math.max(routing.routed.length, 1) : 0,
      sectionsCaptured: understood.sections.length,
      unmappedCount: routing.unmapped.length,
      chunksRead: understood.chunksRead,
      aiStagesCompleted: understood.aiStageFailures.length === 0 ? 1 : 0,
    },
    warnings: understood.aiStageFailures,
  };

  // ── Stage E: code validation ──
  full.validation = runValidation(department, routing.routed, { coverage: full.coverage });

  return { ok: true, ir, full };
}
