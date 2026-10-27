import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { fail } from "@/lib/api-utils";
import { buildDraftDocxBuffer, draftFileName } from "@/lib/draft-docx";

/** GET /api/uploads/draft-export?id= — the upload's TEXT DRAFT as a clean DOCX,
 *  generated on the fly (nothing is stored).
 *  Default: inline disposition (in-app preview / open in tab).
 *  ?download=1: attachment disposition — saves as "text-draft-<name>.docx".
 *  Works even after the original file was discarded — the draft lives in the
 *  database. Authorization identical to the file endpoint. */
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    const download = searchParams.get("download") === "1";
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

    const safeName = draftFileName(upload.originalName);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Draft export failed", 500);
  }
}
