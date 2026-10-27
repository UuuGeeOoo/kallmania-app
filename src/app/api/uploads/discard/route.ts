import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";
import { unlink } from "fs/promises";
import path from "path";

const STORAGE_DIR = "/home/z/my-project/uploads-storage";

/**
 * POST /api/uploads/discard  { id }
 * Text-only mode: permanently deletes the stored original file while keeping
 * the uploaded-file record, the full extracted text draft (rawText) and the
 * mapped fields (extractedData). Requires that a text draft exists — otherwise
 * discarding would leave nothing behind. Cannot be undone: the physical file
 * is removed from storage, so preview / download / re-extraction of the
 * original are no longer possible.
 * Permission: the uploader, or a supervisor/admin.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await req.json();
    if (!id) return fail("Upload id is required");
    const upload = await db.uploadedFile.findUnique({ where: { id } });
    if (!upload) return fail("Upload not found", 404);
    if (upload.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);

    if (upload.fileDiscarded) {
      // Idempotent — the file is already gone, the text draft remains.
      return ok({ discarded: true, alreadyDiscarded: true, message: "The original file was already discarded — only the text draft remains." });
    }
    if (!upload.rawText || !upload.extractedData) {
      return fail("No text draft exists yet. Run extraction first — discarding now would leave nothing behind.", 400);
    }

    try {
      await unlink(path.join(STORAGE_DIR, upload.storedName));
    } catch {
      // File already missing from storage — still mark the record so the UI
      // stops offering preview/download of a non-existent file.
    }

    await db.uploadedFile.update({
      where: { id },
      data: { fileDiscarded: true, discardedAt: new Date() },
    });
    await audit({
      userId: me.id,
      actorName: me.fullName,
      action: "DISCARD_UPLOAD_FILE",
      entity: "UploadedFile",
      entityId: id,
      details: `Original file "${upload.originalName}" permanently discarded — extracted text draft retained`,
    });
    return ok({ discarded: true, message: "Original file discarded — the text draft and extracted fields are kept." });
  });
}
