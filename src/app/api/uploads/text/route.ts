import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";

/** GET /api/uploads/text?id= — full extracted text draft for an upload.
 *  Works even after the original file has been discarded (text-only mode):
 *  the draft lives in the database, not in the file. Authorization identical
 *  to the file endpoint: the uploader, or a supervisor/admin. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");
    const upload = await db.uploadedFile.findUnique({ where: { id } });
    if (!upload) return fail("Upload not found", 404);
    if (upload.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);

    return ok({
      id: upload.id,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      extractStatus: upload.extractStatus,
      fileDiscarded: upload.fileDiscarded,
      discardedAt: upload.discardedAt,
      reportDate: upload.reportDate,
      text: upload.rawText || "",
    });
  });
}
