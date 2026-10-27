import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";
import { listMasters, replaceMaster, MASTER_REPORT_TYPES } from "@/lib/report-masters";
import JSZip from "jszip";

/**
 * Master report template management.
 *
 * GET  /api/report-templates/master          — list every report type's active master
 * POST /api/report-templates/master          — replace a master (ADMIN only, multipart form:
 *                                              reportType + file [.docx])
 *
 * The uploaded document becomes the design foundation for generated reports of
 * that type; generating a report always works on a COPY, the master itself is
 * never modified (its sha256 is recorded for verification).
 */
export async function GET() {
  return handle(async () => {
    const me = await requireUser();
    if (me.role !== "ADMIN" && me.role !== "SUPERVISOR") throw new AuthError("Not authorized", 403);
    return ok({ masters: await listMasters() });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (me.role !== "ADMIN") throw new AuthError("Only administrators can replace master templates", 403);

    const form = await req.formData();
    const reportType = String(form.get("reportType") || "");
    const file = form.get("file");
    if (!MASTER_REPORT_TYPES.includes(reportType as never)) {
      return fail("Invalid report type");
    }
    if (!(file instanceof File)) return fail("A .docx template file is required");
    const name = file.name || "master.docx";
    if (!name.toLowerCase().endsWith(".docx")) return fail("The master template must be a Word .docx file");
    const buffer = Buffer.from(await file.arrayBuffer());

    // validate: a real DOCX package with a word/document.xml part
    try {
      const zip = await JSZip.loadAsync(buffer);
      const doc = zip.file("word/document.xml");
      if (!doc) return fail("This file is not a valid Word document (missing word/document.xml)");
    } catch {
      return fail("This file could not be read as a Word .docx document");
    }

    await replaceMaster(reportType, buffer, name, { id: me.id, fullName: me.fullName });
    await audit({
      userId: me.id, actorName: me.fullName, action: "REPLACE_MASTER_TEMPLATE", entity: "ReportMasterTemplate", entityId: reportType,
      details: `${reportType} master set to ${name} (${(buffer.length / 1024).toFixed(0)} KB)`,
    });
    return ok({ masters: await listMasters() }, 201);
  });
}
