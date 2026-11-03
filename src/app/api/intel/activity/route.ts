import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";

export const runtime = "nodejs";

/** GET /api/intel/activity — recent tracked activity + intelligence audit trail (ADMIN only). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("take") || "60", 10), 200);

    const [events, reportLog] = await Promise.all([
      db.activityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: { user: { select: { fullName: true, role: true, team: true } } },
      }),
      db.auditLog.findMany({
        where: { action: { in: ["INTEL_REPORT_GENERATE", "INTEL_REPORT_EXPORT"] } },
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

    return ok({
      events: events.map((e) => ({
        id: e.id,
        at: e.createdAt,
        user: e.user?.fullName ?? "—",
        role: e.user?.role ?? "—",
        team: e.user?.team,
        eventType: e.eventType,
        relatedType: e.relatedType,
        centre: [e.centreState, e.centreCountry].filter(Boolean).join(", ") || null,
      })),
      reportLog: reportLog.map((l) => ({
        id: l.id, at: l.createdAt, actor: l.actorName, action: l.action, details: l.details,
      })),
    });
  });
}
