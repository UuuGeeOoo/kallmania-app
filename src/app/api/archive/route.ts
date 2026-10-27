import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { storeReportFiles, type StoreFormat } from "@/lib/report-files";
import { audit } from "@/lib/notify";

const VALID_FORMATS: StoreFormat[] = ["docx", "xlsx", "csv"];

/**
 * GET /api/archive — online report storage browser (supervisor/admin).
 * Every submitted & approved report is stored online here, together with any
 * generated Word/Excel/CSV file snapshots available for download anytime.
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
        storedFiles: {
          select: { id: true, format: true, fileName: true, sizeBytes: true, auto: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { reportDate: "desc" },
      take: 400,
    });

    const filtered = q
      ? reports.filter((r) =>
          r.ref.toLowerCase().includes(q) ||
          r.user.fullName.toLowerCase().includes(q) ||
          (r.user.employeeId || "").toLowerCase().includes(q))
      : reports;

    // Storage stats
    const agg = await db.storedReport.aggregate({ _count: { id: true }, _sum: { sizeBytes: true } });
    const [totalOnline, approvedCount] = await Promise.all([
      db.report.count({ where: { status: { in: ["SUBMITTED", "APPROVED"] } } }),
      db.report.count({ where: { status: "APPROVED" } }),
    ]);

    return ok({
      reports: filtered,
      stats: {
        reportsOnline: totalOnline,
        approved: approvedCount,
        archivedFiles: agg._count.id,
        storageBytes: agg._sum.sizeBytes || 0,
      },
    });
  });
}

/**
 * POST /api/archive — generate & store file snapshots online.
 * Body: { reportId, formats?: ["docx","xlsx","csv"] } (defaults to docx + xlsx)
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);
    const body = await req.json();
    const { reportId, formats } = body as { reportId?: string; formats?: string[] };
    if (!reportId) return fail("reportId is required");

    const report = await db.report.findUnique({ where: { id: reportId }, select: { id: true, ref: true, status: true } });
    if (!report) return fail("Report not found", 404);
    if (!["SUBMITTED", "APPROVED"].includes(report.status))
      return fail("Only submitted or approved reports can be stored online");

    const wanted = (formats && formats.length ? formats : ["docx", "xlsx"])
      .map((f) => f.toLowerCase())
      .filter((f): f is StoreFormat => VALID_FORMATS.includes(f as StoreFormat));
    if (!wanted.length) return fail("No valid formats requested");

    const stored = await storeReportFiles(reportId, wanted, me.id, false);
    await audit({
      userId: me.id, actorName: me.fullName, action: "STORE_REPORT_ONLINE",
      entity: "Report", entityId: reportId,
      details: `${report.ref} → ${wanted.join(", ")} stored in online archive`,
    });
    return ok({ stored });
  });
}
