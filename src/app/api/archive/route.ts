import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";

/**
 * GET /api/archive — report archive browser (supervisor/admin).
 * Lists every submitted & approved report with its linked original upload
 * (Report.sourceFileId → UploadedFile). Original files live in uploads-storage
 * and are downloadable via /api/uploads/file; file snapshots generate
 * on-demand via /api/export?format=docx|xlsx.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const from = toDateOrNull(searchParams.get("from"));
    const to = toDateOrNull(searchParams.get("to"));
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const where: Record<string, unknown> = { status: { in: ["SUBMITTED", "APPROVED"] } };
    if (department && department !== "ALL") where.department = department;
    if (status && status !== "ALL") where.status = status;
    if (type && type !== "ALL") where.type = type;
    if (from || to) {
      where.reportDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: new Date(to.getTime() + 86399999) } : {}),
      };
    }

    const reports = await db.report.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, employeeId: true, department: true, role: true } },
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

    const filtered = q
      ? reports.filter((r) =>
          r.ref.toLowerCase().includes(q) ||
          r.user.fullName.toLowerCase().includes(q) ||
          (r.user.employeeId || "").toLowerCase().includes(q))
      : reports;

    const withFiles = filtered.map((r) => {
      const f = r.sourceFileId ? uploadById.get(r.sourceFileId) : null;
      return {
        ...r,
        sourceFile: f
          ? { id: f.id, fileName: f.originalName, sizeBytes: f.sizeBytes, mimeType: f.mimeType, createdAt: f.createdAt, discarded: f.fileDiscarded }
          : null,
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
      },
    });
  });
}
