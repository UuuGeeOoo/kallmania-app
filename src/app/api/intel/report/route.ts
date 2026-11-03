import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { handle, ok } from "@/lib/api-utils";
import { buildReportFromParams } from "@/lib/intel/build";
import { aiEngineLabel } from "@/lib/intel/ai";

export const runtime = "nodejs";

/**
 * GET /api/intel/report?type=agent|team|centre&… — generate an operational
 * report (ADMIN only). Every generation is recorded in the administrative
 * audit log with the administrator, report type, scope and date range.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireAdmin();
    const built = await buildReportFromParams(req);
    if ("error" in built && built.error) return ok({ error: built.error }, 400);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "centre";
    const report = built.report as Record<string, unknown>;
    if (report && typeof report === "object" && "error" in report) return ok({ error: (report as { error: string }).error }, 400);

    const scope = Object.fromEntries([...searchParams.entries()].filter(([k]) => ["country", "state", "team", "agentId", "teamLeadId", "period", "from", "to", "accountStatus"].includes(k)));
    await audit({
      userId: me.id, actorName: me.fullName,
      action: "INTEL_REPORT_GENERATE", entity: "OperationalReport", entityId: type,
      details: JSON.stringify({ type, scope, period: built.period }),
    });
    return ok({ ...report, engine: aiEngineLabel() });
  });
}
