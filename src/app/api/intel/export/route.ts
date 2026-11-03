import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { handle, fail } from "@/lib/api-utils";
import { buildReportFromParams, reportFileName } from "@/lib/intel/build";
import { agentWorkbook, teamWorkbook, centreWorkbook } from "@/lib/intel/excel";

export const runtime = "nodejs";

/**
 * GET /api/intel/export?format=xlsx&type=agent|team|centre&… — download the
 * professionally formatted Excel workbook (ADMIN only, primary export).
 * The export action is audited with the administrator, type, scope and range.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireAdmin();
    const built = await buildReportFromParams(req);
    if ("error" in built && built.error) return fail(built.error, 400);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "centre";
    const report = built.report as Record<string, unknown>;
    if (report && typeof report === "object" && "error" in report) return fail((report as { error: string }).error, 400);

    const by = `${me.fullName} (${me.role})`;
    let buffer: ArrayBuffer;
    try {
      if (type === "agent") buffer = await agentWorkbook(report as never, by);
      else if (type === "team") buffer = await teamWorkbook(report as never, by);
      else buffer = await centreWorkbook(report as never, by);
    } catch (e) {
      console.error("intel export error:", e);
      return fail("Report workbook could not be generated — check the report parameters.", 500);
    }

    const scope = Object.fromEntries([...searchParams.entries()].filter(([k]) => ["country", "state", "team", "agentId", "teamLeadId", "period", "from", "to", "accountStatus"].includes(k)));
    await audit({
      userId: me.id, actorName: me.fullName,
      action: "INTEL_REPORT_EXPORT", entity: "OperationalReport", entityId: type,
      details: JSON.stringify({ type, format: "xlsx", scope, period: built.period }),
    });

    const name = reportFileName(type, report);
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
