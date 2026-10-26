import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { fail } from "@/lib/api-utils";
import { readFile } from "fs/promises";
import path from "path";

const STORAGE_DIR = "/home/z/my-project/uploads-storage";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** GET /api/uploads/file?id= — authorized file serving.
 *  Default: inline disposition (used by the in-app previewer).
 *  ?download=1: attachment disposition — forces a device download with the
 *  original filename. */
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
    try {
      const buffer = await readFile(path.join(STORAGE_DIR, upload.storedName));
      const ext = (upload.storedName.split(".").pop() || "").toLowerCase();
      // Sanitize the filename for the Content-Disposition header
      const safeName = upload.originalName.replace(/[\r\n"\\]/g, "").replace(/[^\w\s.()\-,]/g, "_") || "document";
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return fail("File could not be read from storage", 500);
    }
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "File could not be served", 500);
  }
}
