import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { extractReport } from "@/lib/extraction";
import { audit, notify, notifySupervisors } from "@/lib/notify";
import { readFile } from "fs/promises";
import path from "path";

const STORAGE_DIR = "/home/z/my-project/uploads-storage";

/** POST /api/uploads/extract  { id } — run text extraction + template field mapping */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await req.json();
    if (!id) return fail("Upload id is required");
    const upload = await db.uploadedFile.findUnique({ where: { id }, include: { user: true } });
    if (!upload) return fail("Upload not found", 404);
    if (upload.userId !== me.id && !["SUPERVISOR", "ADMIN"].includes(me.role)) return fail("Not authorized", 403);
    if (upload.extractStatus === "SUBMITTED") return fail("This upload has already been confirmed and submitted");
    if (upload.fileDiscarded) return fail("The original file was already discarded — re-upload the document if you need to extract again.", 410);

    await db.uploadedFile.update({ where: { id }, data: { extractStatus: "PROCESSING", extractError: null } });

    let buffer: Buffer;
    try {
      buffer = await readFile(path.join(STORAGE_DIR, upload.storedName));
    } catch {
      await db.uploadedFile.update({ where: { id }, data: { extractStatus: "FAILED", extractError: "Stored file could not be read from secure storage." } });
      return fail("Stored file could not be read", 500);
    }

    const department = upload.department || "BPO";
    const result = await extractReport(buffer, upload.mimeType, upload.originalName, department);

    if (!result.ok) {
      await db.uploadedFile.update({
        where: { id },
        data: { extractStatus: "FAILED", extractError: result.error || "Extraction failed" },
      });
      await notifySupervisors({
        type: "UPLOAD_FAILED",
        severity: "WARNING",
        title: "Report upload could not be processed",
        message: `${upload.originalName} uploaded by ${upload.user.fullName} failed extraction: ${result.error}`,
        linkData: { view: "uploads", id },
        dedupeKey: `upload-failed:${id}`,
      }, { includeAdmins: true });
      await notify({
        userId: upload.userId,
        type: "UPLOAD_FAILED",
        severity: "WARNING",
        title: "Your upload could not be processed",
        message: `${upload.originalName}: ${result.error} The original file is preserved — please use the manual entry form.`,
        linkData: { view: "upload", id },
        dedupeKey: `upload-failed-user:${id}`,
      });
      await audit({ userId: me.id, actorName: me.fullName, action: "EXTRACT_FAILED", entity: "UploadedFile", entityId: id, details: result.error });
      return ok({ status: "FAILED", error: result.error });
    }

    await db.uploadedFile.update({
      where: { id },
      data: {
        extractStatus: "AWAITING_CONFIRMATION",
        rawText: result.rawText,
        extractedData: JSON.stringify({
          fields: result.fields,
          sections: result.sections,
          stats: result.stats,
          extractedAt: new Date().toISOString(),
          source: upload.originalName,
        }),
      },
    });
    await audit({ userId: me.id, actorName: me.fullName, action: "EXTRACT_REPORT", entity: "UploadedFile", entityId: id, details: `${result.stats.fieldsFound} fields mapped from ${upload.originalName}` });
    return ok({
      status: "AWAITING_CONFIRMATION",
      fields: result.fields,
      sections: result.sections,
      stats: result.stats,
      rawTextPreview: result.rawText.slice(0, 3000),
    });
  });
}
