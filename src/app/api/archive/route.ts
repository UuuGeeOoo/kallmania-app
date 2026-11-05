import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { kpiRecordCounts } from "@/lib/kpi-results";

/**
 * GET /api/archive — report archive browser (supervisor/admin).
 *
 * The central historical record: every submitted & approved report with its
 * linked original upload (Report.sourceFileId → UploadedFile), its associated
 * template (team-lead templateKey / SBTS supplied template), its normalized
 * KPI record count (KpiResult rows written at submit/ingest time), and its
 * pipeline provenance (source + verification status). External-site reports
 * arrive as SBTS_IMPORT rows with the template text preserved in the payload.
 *
 * Filters: department, status, type, userId (owner), sourceType, from, to, q.
 * Original files download via /api/uploads/file; exports via /api/export.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");
    const sourceType = searchParams.get("sourceType");
    const from = toDateOrNull(searchParams.get("from"));
    const to = toDateOrNull(searchParams.get("to"));
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const where: Record<string, unknown> = { status: { in: ["SUBMITTED", "APPROVED"] } };
    if (department && department !== "ALL") where.department = department;
    if (status && status !== "ALL") where.status = status;
    if (type && type !== "ALL") where.type = type;
    if (userId) where.userId = userId;
    if (sourceType && sourceType !== "ALL") where.sourceType = sourceType;
    if (from || to) {
      where.reportDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: new Date(to.getTime() + 86399999) } : {}),
      };
    }

    const reports = await db.report.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, employeeId: true, department: true, role: true, team: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
      orderBy: { reportDate: "desc" },
      take: 400,
    });

    // Attach the original uploaded document for each report that has one.
    const sourceFileIds = [...new Set(reports.map((r) => r.sourceFileId).filter((v): v is string => !!v))];
    const uploads = sourceFileIds.length
      ? await db.uploadedFile.findMany({
          where: { id: { in: sourceFileIds } },
          select: { id: true, originalName: true, sizeBytes: true, mimeType: true, createdAt: true, fileDiscarded: true },
        })
      : [];
    const uploadById = new Map(uploads.map((u) => [u.id, u]));

    // Normalized KPI record counts — proves the archive row is linked to the
    // actual KPI records generated from it (not just a stored document).
    const kpiCounts = await kpiRecordCounts(reports.map((r) => r.id));

    const filtered = q
      ? reports.filter((r) =>
          r.ref.toLowerCase().includes(q) ||
          r.user.fullName.toLowerCase().includes(q) ||
          (r.user.employeeId || "").toLowerCase().includes(q))
      : reports;

    const withFiles = filtered.map((r) => {
      const f = r.sourceFileId ? uploadById.get(r.sourceFileId) : null;
      // Template association: team-lead template key, SBTS supplied template,
      // or the uploaded document that backed an upload-extracted report.
      let template: string | null = null;
      if (r.payload) {
        try {
          const p = JSON.parse(r.payload) as { templateName?: string; templateKey?: string };
          template = p.templateName || (p.templateKey === "SBTS_EXTERNAL" ? "SBTS external template" : p.templateKey ? `Lead template ${p.templateKey}` : null);
        } catch { /* not a template payload */ }
      }
      if (!template && r.sourceType === "UPLOAD_EXTRACTED" && f) template = `From document: ${f.originalName}`;
      return {
        ...r,
        sourceFile: f
          ? { id: f.id, fileName: f.originalName, sizeBytes: f.sizeBytes, mimeType: f.mimeType, createdAt: f.createdAt, discarded: f.fileDiscarded }
          : null,
        kpiRecordCount: kpiCounts.get(r.id) ?? 0,
        template,
        // Pipeline status: verification drives the review state; SBTS imports
        // arrive EXTRACTED_UNCONFIRMED until a reviewer confirms the mapping.
        pipelineStatus: r.status === "APPROVED" ? "APPROVED" : r.verificationStatus === "EXTRACTED_UNCONFIRMED" ? "AWAITING_VERIFICATION" : "SUBMITTED",
      };
    });

    // Storage stats — reports plus the retained original uploads backing them.
    const [totalOnline, approvedCount, uploadAgg] = await Promise.all([
      db.report.count({ where: { status: { in: ["SUBMITTED", "APPROVED"] } } }),
      db.report.count({ where: { status: "APPROVED" } }),
      db.uploadedFile.aggregate({ where: { fileDiscarded: false }, _count: { id: true }, _sum: { sizeBytes: true } }),
    ]);

    return ok({
      reports: withFiles,
      stats: {
        reportsOnline: totalOnline,
        approved: approvedCount,
        archivedFiles: uploadAgg._count.id,
        storageBytes: uploadAgg._sum.sizeBytes || 0,
        kpiRecords: [...kpiCounts.values()].reduce((s, n) => s + n, 0),
      },
    });
  });
}
