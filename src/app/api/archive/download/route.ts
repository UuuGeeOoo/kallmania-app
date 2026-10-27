import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";

/**
 * GET /api/archive/download?id=<storedReportId>
 * Downloads a stored file snapshot from the online archive (supervisor/admin).
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("id is required");

    const file = await db.storedReport.findUnique({
      where: { id },
      include: { report: { select: { ref: true, status: true } } },
    });
    if (!file) return fail("Stored file not found", 404);

    const bytes = Buffer.from(file.data, "base64");
    await audit({
      userId: me.id, actorName: me.fullName, action: "DOWNLOAD_STORED_REPORT",
      entity: "StoredReport", entityId: file.id,
      details: `${file.report.ref} (${file.format}) from online archive`,
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
      },
    });
  });
}
