import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { fail } from "@/lib/api-utils";
import { buildDraftDocxBuffer } from "@/lib/draft-docx";

export interface DraftPreviewPayload {
  kind: "docx";
  html: string;
  extension: "docx";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  viaDraft: boolean;
}

/** GET /api/uploads/draft-preview?id= — server-rendered in-app preview of the
 *  upload's TEXT DRAFT document. Builds the same DOCX as /api/uploads/draft-export
 *  and converts it to HTML (mammoth) — nothing is stored.
 *  Works even after the original file was discarded. Authorization identical
 *  to the file endpoint. */
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    const upload = await db.uploadedFile.findUnique({ where: { id } });
    if (!upload) return fail("Upload not found", 404);
    if (upload.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);
    if (!upload.rawText || !upload.rawText.trim()) {
      return fail("No text draft exists yet — run the extraction first.", 400);
    }

    const buffer = await buildDraftDocxBuffer({
      originalName: upload.originalName,
      text: upload.rawText,
      reportDate: upload.reportDate,
      department: upload.department,
      extractStatus: upload.extractStatus,
      fileDiscarded: upload.fileDiscarded,
      discardedAt: upload.discardedAt,
      exportedBy: me.fullName,
    });

    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });

    const payload: DraftPreviewPayload = {
      kind: "docx",
      html: result.value.slice(0, 900000),
      extension: "docx",
      originalName: upload.originalName,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: buffer.length,
      viaDraft: true,
    };
    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Draft preview failed", 500);
  }
}
