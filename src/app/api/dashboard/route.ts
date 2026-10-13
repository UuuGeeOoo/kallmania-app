import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import { checkOverdueReports } from "@/lib/notify";
import { aggregateTeamKpis, type KpiMetric } from "@/lib/kpi";

/**
 * GET /api/dashboard?date=YYYY-MM-DD
 * Role-aware stats: employees see their own day; supervisors/admins see department aggregates.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");
    const supervisor = isSupervisorLike(me);

    // Lazy overdue check (deduped internally)
    checkOverdueReports(date).catch(() => {});

    const myTasks = await db.task.findMany({
      where: { assigneeId: me.id, status: { in: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "PENDING_DEPLOYMENT", "AWAITING_APPROVAL"] } },
      orderBy: { deadline: "asc" },
      take: 20,
    });
    const myNotifications = await db.notification.count({ where: { userId: me.id, read: false } });

    if (!supervisor) {
      const myReportsToday = await db.report.findMany({
        where: { userId: me.id, reportDate: { gte: dayStart, lte: dayEnd } },
      });
      const myTasksAll = await db.task.findMany({ where: { assigneeId: me.id } });
      const completedToday = myReportsToday.find((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
      // Personal KPI achievement from latest submitted report
      let kpiAchievement: { label: string; actual: number | null; target: number | null; pct: number | null }[] = [];
      const latest = myReportsToday.find((r) => r.status === "APPROVED") || myReportsToday.find((r) => r.status === "SUBMITTED") || myReportsToday[0];
      if (latest?.kpiMetrics) {
        const metrics = safeParse<KpiMetric[]>(latest.kpiMetrics, []).filter((m) => m.target !== null && m.actual !== null);
        kpiAchievement = metrics.map((m) => ({
          label: m.label,
          actual: m.actual,
          target: m.target,
          pct: m.target ? Math.round(((m.actual || 0) / m.target) * 100) : null,
        }));
      }
      return ok({
        role: me.role,
        date,
        employee: {
          reportSubmittedToday: !!completedToday,
          myReportStatus: latest?.status || null,
          myReportRef: latest?.ref || null,
          openTasks: myTasksAll.filter((t) => !["COMPLETED"].includes(t.status)).length,
          tasksCompleted: myTasksAll.filter((t) => t.status === "COMPLETED").length,
          tasksDueToday: myTasksAll.filter((t) => t.deadline && new Date(t.deadline) >= dayStart && new Date(t.deadline) <= dayEnd).length,
          upcomingTasks: myTasks.slice(0, 8),
          kpiAchievement,
          unreadNotifications: myNotifications,
          myRecentReports: (await db.report.findMany({ where: { userId: me.id }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, ref: true, type: true, status: true, reportDate: true } })),
        },
      });
    }

    // ── Supervisor / Admin dashboard ──
    // Supervisors/Admins oversee all departments (their own dept is MANAGEMENT)
    const whereDept = me.role === "SUPERVISOR" && me.department !== "MANAGEMENT" ? { department: me.department } : {};
    const staff = await db.user.findMany({
      where: { status: "APPROVED", role: { in: ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "SUPERVISOR"] }, ...whereDept },
      select: { id: true, fullName: true, role: true, department: true, employeeId: true },
    });
    const staffIds = staff.map((s) => s.id);

    const reportsToday = await db.report.findMany({
      where: { reportDate: { gte: dayStart, lte: dayEnd }, ...whereDept, type: { not: "SUPERVISOR" } },
      include: { user: { select: { id: true, fullName: true, role: true, department: true, employeeId: true } } },
    });
    const submittedReports = reportsToday.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
    const pendingReports = reportsToday.filter((r) => r.status === "DRAFT" || r.status === "REJECTED");

    const tasksAll = await db.task.findMany({ where: { ...whereDept, dateAssigned: { lte: dayEnd } } });
    const tasksAssigned = tasksAll.length;
    const tasksCompleted = tasksAll.filter((t) => t.status === "COMPLETED").length;
    const tasksOverdue = tasksAll.filter((t) => t.deadline && new Date(t.deadline) < dayStart && !["COMPLETED"].includes(t.status)).length;
    const tasksBlocked = tasksAll.filter((t) => t.status === "BLOCKED").length;

    const escalations = await db.notification.findMany({
      where: { type: { in: ["ESCALATION", "KPI_SHORTFALL", "TASK_BLOCKED", "REPORT_OVERDUE", "UPLOAD_FAILED", "TASK_INCOMPLETE"] }, createdAt: { gte: dayStart }, ...(me.role === "SUPERVISOR" ? { userId: me.id } : {}) },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // Aggregate BPO metrics across submitted agent reports
    let bpoTotals: Record<string, number> = {};
    let teamKpiRows: ReturnType<typeof aggregateTeamKpis> = [];
    const agentReports = submittedReports.filter((r) => r.type === "AGENT_BPO");
    for (const r of agentReports) {
      const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []);
      for (const m of metrics) {
        if (m.actual !== null) bpoTotals[m.key] = (bpoTotals[m.key] || 0) + m.actual;
      }
    }
    if (agentReports.length) {
      teamKpiRows = aggregateTeamKpis(agentReports.map((r) => ({ userName: r.user.fullName, kpiMetrics: r.kpiMetrics })));
    }

    // Tech & Social aggregates
    const techReports = submittedReports.filter((r) => r.type === "TECH");
    const socialReports = submittedReports.filter((r) => r.type === "SOCIAL");
    const sumMetrics = (reports: { metricsSummary: string | null }[]) => {
      const out: Record<string, number> = {};
      for (const r of reports) {
        const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
        for (const [k, v] of Object.entries(ms)) if (typeof v === "number") out[k] = (out[k] || 0) + v;
      }
      return out;
    };
    const techTotals = sumMetrics(techReports);
    const socialTotals = sumMetrics(socialReports);

    const deptTable = ["BPO", "WEB_DEV", "SOCIAL_MEDIA"].map((dept) => {
      const deptStaff = staff.filter((s) => s.department === dept);
      const deptReports = reportsToday.filter((r) => r.department === dept);
      const deptSubmitted = deptReports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
      const deptTasks = tasksAll.filter((t) => t.department === dept);
      return {
        department: dept,
        expected: deptStaff.length,
        submitted: deptSubmitted.length,
        pending: deptReports.length - deptSubmitted.length,
        tasksAssigned: deptTasks.length,
        tasksCompleted: deptTasks.filter((t) => t.status === "COMPLETED").length,
        tasksOverdue: deptTasks.filter((t) => t.deadline && new Date(t.deadline) < dayStart && !["COMPLETED"].includes(t.status)).length,
      };
    });

    const pendingUsers = await db.user.count({ where: { status: "PENDING" } });

    return ok({
      role: me.role,
      date,
      supervisor: {
        totalActiveEmployees: staff.length,
        expectedToReport: staff.filter((s) => s.role !== "SUPERVISOR").length,
        reportsSubmitted: submittedReports.length,
        outstandingReports: Math.max(0, staff.filter((s) => s.role !== "SUPERVISOR").length - submittedReports.length),
        tasksAssigned,
        tasksCompleted,
        tasksOverdue,
        tasksBlocked,
        kpiShortfalls: escalations.filter((e) => e.type === "KPI_SHORTFALL").length,
        openEscalations: escalations.filter((e) => e.type === "ESCALATION").length,
        bpoTotals,
        teamKpiRows,
        techTotals,
        socialTotals,
        deptTable,
        recentAlerts: escalations.slice(0, 10),
        pendingUserApprovals: pendingUsers,
        submittedReportList: submittedReports.map((r) => ({ id: r.id, ref: r.ref, userName: r.user.fullName, type: r.type, status: r.status, department: r.department, updatedAt: r.updatedAt })),
        pendingReportList: pendingReports.map((r) => ({ id: r.id, ref: r.ref, userName: r.user.fullName, type: r.type, status: r.status, department: r.department, updatedAt: r.updatedAt })),
      },
    });
  });
}
