import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";

/**
 * Builds a clean, readable DOCX for an upload's TEXT DRAFT — used by the
 * export/preview endpoints. This is intentionally a simple standalone
 * document: when the original file was discarded there is no template left
 * to preserve, so the export prioritises legibility and auditability.
 */

export interface DraftDocxMeta {
  /** Original uploaded file name, e.g. "daily-report.docx" */
  originalName: string;
  /** Full extracted text (rawText) */
  text: string;
  reportDate?: Date | null;
  department?: string | null;
  extractStatus: string;
  fileDiscarded: boolean;
  discardedAt?: Date | null;
  /** Human name of who requested the export (audit line) */
  exportedBy?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  EXTRACTION_COMPLETED: "Extraction completed",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  SUBMITTED: "Submitted",
  FAILED: "Extraction failed",
};

const fmtDate = (d?: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "—");

export async function buildDraftDocxBuffer(meta: DraftDocxMeta): Promise<Buffer> {
  const bodyLines = (meta.text || "").replace(/\r\n/g, "\n").split("\n");

  const children: Paragraph[] = [];

  // ── Header ──
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: "TEXT DRAFT", bold: true, size: 16, color: "7C6FF0", font: "Calibri", characterSpacing: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: meta.originalName, bold: true, size: 32, color: "111827", font: "Calibri" })],
    })
  );

  // ── Meta block ──
  const metaRows: [string, string][] = [
    ["Report date", fmtDate(meta.reportDate)],
    ["Department", meta.department || "—"],
    ["Extraction status", STATUS_LABEL[meta.extractStatus] || meta.extractStatus],
    ["Source file", meta.fileDiscarded ? "Discarded — text-only copy retained" : "Retained in the app"],
  ];
  if (meta.fileDiscarded && meta.discardedAt) {
    metaRows.push(["File discarded on", new Date(meta.discardedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"]);
  }
  for (const [label, value] of metaRows) {
    children.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({ text: `${label}:  `, bold: true, size: 18, color: "4B5563", font: "Calibri" }),
          new TextRun({ text: value, size: 18, color: "4B5563", font: "Calibri" }),
        ],
      })
    );
  }

  // ── Divider ──
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" } },
      children: [new TextRun({ text: "", size: 2 })],
    })
  );

  // ── Body — monospace so column-style raw text (label | value rows) stays aligned ──
  for (const line of bodyLines) {
    children.push(
      new Paragraph({
        spacing: { after: 0, line: 276 },
        children: [new TextRun({ text: line.length ? line : " ", size: 19, color: "111827", font: "Consolas" })],
      })
    );
  }

  // ── Footer note ──
  const note = meta.fileDiscarded
    ? "The original document was permanently discarded after extraction — this text draft is the retained copy."
    : "This is the extracted text of the uploaded document.";
  children.push(
    new Paragraph({
      spacing: { before: 320 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" } },
      children: [
        new TextRun({
          text: `${note} Exported from Kallmania on ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC${meta.exportedBy ? ` by ${meta.exportedBy}` : ""}.`,
          italics: true,
          size: 16,
          color: "9CA3AF",
          font: "Calibri",
        }),
      ],
    })
  );

  const doc = new Document({
    creator: "Kallmania",
    title: `Text draft — ${meta.originalName}`,
    description: "Extracted text draft exported from Kallmania",
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/** Sanitized download filename for the draft export. */
export function draftFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "").replace(/[\r\n"\\]/g, "").replace(/[^\w\s.()\-,]/g, "_").trim() || "document";
  return `text-draft-${base}.docx`;
}
