import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import { periodRange, cumulativeKpiRows, type KpiPeriod } from "@/lib/kpi-summary";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { resolveKpiCatalogue, kpiTargetMap } from "@/lib/kpi-resolve";
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
    let rows: ReturnType<typeof cumulativeKpiRows> = [];
    if (bpoReports.length) {
      // Base targets: the saved KPI configuration of the staff member's centre
      // (centre overrides over global defaults).
      const catalogue = await resolveKpiCatalogue(
        user.country && user.state ? { country: user.country, state: user.state } : null,
      );
      const dominantDept = user.team === "INBOUND" ? "INBOUND" : "BPO";
      const targets = kpiTargetMap(catalogue.filter((c) => c.active), [dominantDept, "BPO", "INBOUND"]);
      rows = cumulativeKpiRows(bpoReports.map((r) => r.kpiMetrics), distinctDates, targets);
    }

    // Individual (per-member) KPI overrides — APPROVED ones become the member's
    // effective targets (daily target, scaled by report days like the defaults).
    const memberConfigsAll = await db.memberKpiConfig.findMany({
      where: { userId: id },
      orderBy: [{ department: "asc" }, { label: "asc" }],
    });
    const memberOverrides = new Map(memberConfigsAll.filter((c) => c.status === "APPROVED" && c.target !== null).map((c) => [c.key, c]));
    for (const row of rows) {
      const o = memberOverrides.get(row.key);
      if (!o || o.target === null) continue;
      const scale = row.unit === "count" ? distinctDates : 1;
      const target = Math.round((o.target as number) * scale * 100) / 100;
      row.dailyTarget = o.target;
      row.target = target;
      row.targetLabel = `${target}${o.unit === "percent" ? "%" : o.unit === "minutes" ? "mins" : ""}${scale > 1 ? ` (${o.target}/day × ${scale}d — individual)` : " (individual)"}`;
      row.pct = row.actual !== null && target !== 0 ? Math.round(((row.actual as number) / target) * 10000) / 100 : null;
    }

    const deptTotals: Record<string, number> = {};
    for (const r of reports.filter((x) => x.type !== "AGENT_BPO")) {
      const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
      for (const [k, v] of Object.entries(ms)) if (typeof v === "number") deptTotals[k] = (deptTotals[k] || 0) + v;
    }

    // Normalized KPI records for the same period — the machine-readable store
    // written automatically from submissions and matched SBTS events. Surfaced
    // here so a KPI value can always be traced to its source (report ref or
    // Media Scoreboard event) directly from the drill-down.
    const kpiRecords = await db.kpiResult.findMany({
      where: { userId: id, reportDate: { gte: ps, lte: pe } },
      orderBy: [{ reportDate: "desc" }, { kpiKey: "asc" }],
      take: 200,
      select: {
        id: true, kpiKey: true, label: true, unit: true, target: true, actual: true,
        achievement: true, statusLabel: true, source: true, reportDate: true,
        verification: true, revision: true, previousActual: true,
        report: { select: { id: true, ref: true, type: true } },
        sbtsEvent: { select: { eventId: true, eventDate: true } },
      },
    });
    const recordSummary = new Map<string, { kpiKey: string; label: string; actualTotal: number; achievements: number[] }>();
    for (const r of kpiRecords) {
      const cur = recordSummary.get(r.kpiKey) ?? { kpiKey: r.kpiKey, label: r.label, actualTotal: 0, achievements: [] as number[] };
      cur.actualTotal += r.actual ?? 0;
      if (r.achievement !== null) cur.achievements.push(r.achievement);
      recordSummary.set(r.kpiKey, cur);
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
      kpiRecords: kpiRecords.map((r) => ({
        id: r.id, kpiKey: r.kpiKey, label: r.label, unit: r.unit, target: r.target, actual: r.actual,
        achievement: r.achievement, statusLabel: r.statusLabel, source: r.source, reportDate: r.reportDate,
        verification: r.verification, revision: r.revision, previousActual: r.previousActual,
        reportRef: r.report?.ref ?? null, reportType: r.report?.type ?? null,
        sbtsEventId: r.sbtsEvent?.eventId ?? null,
      })),
      kpiRecordSummary: [...recordSummary.values()].map((s) => {
        const avg = s.achievements.length ? Math.round((s.achievements.reduce((x, y) => x + y, 0) / s.achievements.length) * 100) / 100 : null;
        return { kpiKey: s.kpiKey, label: s.label, actualTotal: Math.round(s.actualTotal * 100) / 100, avgAchievement: avg, status: avg === null ? "NO_TARGET" : avg >= 100 ? "MET" : avg >= 80 ? "ON_TRACK" : "BELOW_TARGET" };
      }).sort((a, b) => (b.avgAchievement ?? -1) - (a.avgAchievement ?? -1)),
      recentReports: reports.slice(-8).reverse().map((r) => ({ id: r.id, ref: r.ref, type: r.type, status: r.status, reportDate: r.reportDate })),
      techLabels: TECH_SUMMARY_METRICS,
      socialLabels: SOCIAL_SUMMARY_METRICS,
      memberConfigs: memberConfigsAll,
      pendingMemberKpi: memberConfigsAll.filter((c) => c.status === "PENDING").length,
      viewerCanEditMemberKpi: isSelf ? false : me.role === "ADMIN" || me.role === "SUPERVISOR" || me.role === "TEAM_LEAD",
      viewerCanApproveMemberKpi: !isSelf && (me.role === "ADMIN" || me.role === "SUPERVISOR"),
    });
  });
}
