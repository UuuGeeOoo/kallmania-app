import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { fail } from "@/lib/api-utils";
import { generateReportDocx } from "@/lib/report-docx";

/**
 * GET /api/export/preview?id=<reportId>
 *
 * In-app preview of the COMPLETED report — the exact same document that the
 * download produces (original master template filled with the report data),
 * converted to HTML with mammoth so it renders inside the document viewer.
 * No download happens here; download stays a separate explicit action
 * (GET /api/export?format=docx&id=…).
 */
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("Report id is required");

    const report = await db.report.findUnique({
      where: { id },
      include: { user: true, reviewer: { select: { fullName: true } } },
    });
    if (!report) return fail("Report not found", 404);
    if (report.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);

    const { buffer, filename, viaMaster } = await generateReportDocx(report);

    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml({ buffer });

    return Response.json({
      kind: "docx",
      html,
      filename,
      viaMaster,
      originalName: filename,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: buffer.length,
      extension: "docx",
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    console.error("Export preview error:", e);
    return fail(e instanceof Error ? e.message : "Preview failed", 500);
  }
}
