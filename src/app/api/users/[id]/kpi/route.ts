import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import { periodRange, cumulativeKpiRows, type KpiPeriod } from "@/lib/kpi-summary";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { type KpiMetric } from "@/lib/kpi";

/**
 * GET /api/users/[id]/kpi?period=day|week|month|year&date=YYYY-MM-DD
 *
 * Per-staff KPI performance drill-down (user management → click a user).
 *  - ADMIN: any staff member
 *  - SUPERVISOR: staff in their centre (same country + state), or themselves
 *  - TEAM_LEAD: agents in their centre, or themselves
 *  - Everyone else: themselves only
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "month") as KpiPeriod;
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const { start, end, label, periodDays } = periodRange(period, date);

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true, department: true, team: true, employeeId: true, country: true, state: true, city: true, status: true, createdAt: true },
    });
    if (!user) throw new AuthError("User not found", 404);

    const isSelf = me.id === id;
    if (!isSelf) {
      if (me.role === "SUPERVISOR") {
        const sameCentre = me.country && me.state && user.country === me.country && user.state === me.state;
        if (!sameCentre) throw new AuthError("You can only view KPI performance for staff in your centre", 403);
      } else if (me.role === "TEAM_LEAD") {
        const sameCentre = me.country && me.state && user.country === me.country && user.state === me.state;
        if (!sameCentre) throw new AuthError("You can only view KPI performance for agents in your centre", 403);
      } else if (!isSupervisorLike(me)) {
        throw new AuthError("Not authorized", 403);
      }
    }

    const { start: ps, end: pe } = periodRange(period, date);
    const reports = await db.report.findMany({
      where: { userId: id, reportDate: { gte: ps, lte: pe }, status: { in: ["SUBMITTED", "APPROVED"] } },
      orderBy: { reportDate: "asc" },
      select: { id: true, ref: true, type: true, reportDate: true, status: true, kpiMetrics: true, metricsSummary: true },
    });

    const distinctDates = new Set(reports.map((r) => new Date(r.reportDate).toISOString().slice(0, 10))).size;
    const bpoReports = reports.filter((r) => r.type === "AGENT_BPO");
    const rows = bpoReports.length ? cumulativeKpiRows(bpoReports.map((r) => r.kpiMetrics), distinctDates) : [];

    const deptTotals: Record<string, number> = {};
    for (const r of reports.filter((x) => x.type !== "AGENT_BPO")) {
      const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
      for (const [k, v] of Object.entries(ms)) if (typeof v === "number") deptTotals[k] = (deptTotals[k] || 0) + v;
    }

    // Task performance for the same period
    const tasks = await db.task.findMany({
      where: {
        OR: [{ assigneeId: id }, { assignees: { some: { userId: id } } }],
        dateAssigned: { lte: pe },
      },
      select: { status: true, deadline: true, dateAssigned: true },
    });
    const openStatuses = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "PENDING_DEPLOYMENT", "AWAITING_APPROVAL", "UNDER_REVIEW"];
    const taskStats = {
      assigned: tasks.length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      open: tasks.filter((t) => openStatuses.includes(t.status)).length,
      overdue: tasks.filter((t) => t.deadline && new Date(t.deadline) < ps && t.status !== "COMPLETED").length,
    };

    return ok({
      user: {
        id: user.id, fullName: user.fullName, email: user.email, role: user.role,
        department: user.department, team: user.team, employeeId: user.employeeId,
        country: user.country, state: user.state, city: user.city, status: user.status,
      },
      period,
      label,
      periodDays,
      reportCount: reports.length,
      distinctDates,
      rows,
      deptTotals,
      taskStats,
      recentReports: reports.slice(-8).reverse().map((r) => ({ id: r.id, ref: r.ref, type: r.type, status: r.status, reportDate: r.reportDate })),
      techLabels: TECH_SUMMARY_METRICS,
      socialLabels: SOCIAL_SUMMARY_METRICS,
    });
  });
}
