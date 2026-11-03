import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, TEAM_META } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";

export const runtime = "nodejs";

/** GET /api/intel/meta — picker data for the intelligence module (ADMIN only). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const state = searchParams.get("state");

    const staffWhere: Record<string, unknown> = { status: "APPROVED", role: { in: ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "TEAM_LEAD", "SUPERVISOR"] } };
    if (country) staffWhere.country = country;
    if (state) staffWhere.state = state;

    const [staff, centres] = await Promise.all([
      db.user.findMany({
        where: staffWhere,
        select: { id: true, fullName: true, role: true, department: true, team: true, country: true, state: true },
        orderBy: { fullName: "asc" },
        take: 2000,
      }),
      db.user.groupBy({
        by: ["country", "state"],
        where: { status: "APPROVED", country: { not: null }, state: { not: null }, role: { not: "ADMIN" } },
        _count: { id: true },
      }),
    ]);

    const teams = Object.entries(TEAM_META).map(([key, meta]) => ({
      key,
      label: meta.label,
      department: meta.department,
      agents: staff.filter((s) => s.team === key && s.role !== "SUPERVISOR").length,
    })).filter((t) => t.agents > 0 || !country); // show all teams globally; only staffed teams when centre-filtered

    return ok({
      centres: centres.map((c) => ({ country: c.country, state: c.state, staff: c._count.id })).sort((a, b) => `${a.state}`.localeCompare(`${b.state}`)),
      teams,
      supervisors: staff.filter((s) => s.role === "SUPERVISOR").map((s) => ({ id: s.id, name: s.fullName })),
      teamLeads: staff.filter((s) => s.role === "TEAM_LEAD").map((s) => ({ id: s.id, name: s.fullName, team: s.team, country: s.country, state: s.state })),
      agents: staff.filter((s) => s.role !== "SUPERVISOR").map((s) => ({ id: s.id, name: s.fullName, role: s.role, team: s.team, department: s.department, country: s.country, state: s.state })),
    });
  });
}
