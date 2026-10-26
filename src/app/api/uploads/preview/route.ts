import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { fail } from "@/lib/api-utils";
import { readFile } from "fs/promises";
import path from "path";

const STORAGE_DIR = "/home/z/my-project/uploads-storage";

export interface PreviewSheet {
  name: string;
  rows: string[][]; // first row is usually the header
}
export interface PreviewPayload {
  kind: "pdf" | "image" | "text" | "docx" | "sheet" | "unsupported";
  /** docx: rendered HTML; text: plain text; sheet: workbook sheets; pdf/image: use /api/uploads/file directly */
  html?: string;
  text?: string;
  sheets?: PreviewSheet[];
  extension: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /** browsers cannot natively render these — offer download instead */
  unsupportedMessage?: string;
}

const okJson = (payload: PreviewPayload) =>
  new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });

/** GET /api/uploads/preview?id= — server-rendered preview payload for the in-app document viewer.
 *  PDF and images stream straight from /api/uploads/file (native browser rendering);
 *  DOCX is converted to HTML (mammoth), spreadsheets to JSON sheets (SheetJS),
 *  text/CSV returned as-is. Authorization identical to the file endpoint. */
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    const upload = await db.uploadedFile.findUnique({ where: { id } });
    if (!upload) return fail("Upload not found", 404);
    if (upload.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);

    const ext = (upload.storedName.split(".").pop() || "").toLowerCase();
    const base: PreviewPayload = {
      extension: ext,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      kind: "unsupported",
    };

    let buffer: Buffer;
    try {
      buffer = await readFile(path.join(STORAGE_DIR, upload.storedName));
    } catch {
      return fail("File could not be read from storage", 500);
    }

    // Native browser rendering — the client embeds /api/uploads/file?id= directly
    if (ext === "pdf" || upload.mimeType === "application/pdf") {
      return okJson({ ...base, kind: "pdf" });
    }
    if (upload.mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return okJson({ ...base, kind: "image" });
    }

    // Plain text / CSV — render as text
    if (ext === "txt" || ext === "csv" || ext === "md" || upload.mimeType.startsWith("text/")) {
      const text = buffer.toString("utf8").slice(0, 200000);
      return okJson({ ...base, kind: "text", text });
    }

    // DOCX — mammoth converts to simple semantic HTML (server-side)
    if (ext === "docx" || upload.mimeType.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ buffer });
      return okJson({
        ...base,
        kind: "docx",
        html: result.value.slice(0, 900000),
        unsupportedMessage: result.value ? undefined : "This document appears to be empty.",
      });
    }

    // XLSX / XLS — SheetJS parses sheets (server-side)
    if (ext === "xlsx" || ext === "xls" || upload.mimeType.includes("spreadsheetml") || upload.mimeType.includes("ms-excel")) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheets: PreviewSheet[] = wb.SheetNames.slice(0, 20).map((name) => {
        const rows: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" });
        return { name, rows: rows.slice(0, 500).map((r) => r.map((c) => String(c ?? ""))) };
      });
      return okJson({ ...base, kind: "sheet", sheets });
    }

    // Legacy/other formats — no in-app renderer; offer download
    return okJson({
      ...base,
      kind: "unsupported",
      unsupportedMessage: `In-app preview is not available for .${ext || "?"} files. You can still download the original document.`,
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Preview could not be generated", 500);
  }
}
