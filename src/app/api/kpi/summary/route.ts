import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import { periodRange, cumulativeKpiRows, type KpiPeriod } from "@/lib/kpi-summary";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { resolveKpiCatalogue, kpiTargetMap, hasCentre } from "@/lib/kpi-resolve";
import { type KpiMetric } from "@/lib/kpi";

/**
 * GET /api/kpi/summary?period=day|week|month|year&date=YYYY-MM-DD[&country=NG&state=Lagos]
 *
 * Multi-period cumulative KPI aggregation:
 *  - day   → the single calendar date
 *  - week  → Monday–Sunday ISO week containing the date
 *  - month → calendar month containing the date
 *  - year  → calendar year containing the date
 *
 * Scoping:
 *  - ADMIN sees every centre; may narrow with country/state query params
 *    (the dashboard country + state selectors).
 *  - SUPERVISOR is always scoped to their own centre (their country+state) —
 *    they can only ever see the agents of their state.
 *  - Everyone else sees their own cumulative numbers.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "day") as KpiPeriod;
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const { start, end, label, periodDays } = periodRange(period, date);
    const supervisor = isSupervisorLike(me);

    const where: Record<string, unknown> = {
      reportDate: { gte: start, lte: end },
      status: { in: ["SUBMITTED", "APPROVED"] },
    };

    if (supervisor) {
      where.type = { not: "SUPERVISOR" };
      if (me.role === "SUPERVISOR") {
        // Centre scoping — a state supervisor only sees their own state's agents.
        if (me.country && me.state) {
          where.user = { country: me.country, state: me.state };
        }
      } else {
        // Admin country/state drill-down from the dashboard selectors.
        const country = searchParams.get("country");
        const state = searchParams.get("state");
        if (country || state) {
          where.user = {
            ...(country ? { country } : {}),
            ...(state ? { state } : {}),
          };
        }
      }
    } else {
      where.userId = me.id;
    }

    const reports = await db.report.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, role: true, department: true, employeeId: true, country: true, state: true } } },
      orderBy: { reportDate: "asc" },
    });

    const distinctDates = new Set(reports.map((r) => new Date(r.reportDate).toISOString().slice(0, 10))).size;
    const bpoReports = reports.filter((r) => r.type === "AGENT_BPO");
    const techReports = reports.filter((r) => r.type === "TECH");
    const socialReports = reports.filter((r) => r.type === "SOCIAL");

    const sumMetricsSummary = (list: typeof techReports) => {
      const out: Record<string, number> = {};
      for (const r of list) {
        const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
        for (const [k, v] of Object.entries(ms)) if (typeof v === "number") out[k] = (out[k] || 0) + v;
      }
      return out;
    };

    const techTotals = sumMetricsSummary(techReports);
    const socialTotals = sumMetricsSummary(socialReports);

    // KPI rows: BPO cumulative (own for agents, team for supervisors). Targets
    // come from the saved KPI configuration of the centre the numbers belong
    // to (supervisor's own centre / admin drill-down / agent's own centre).
    let rows: ReturnType<typeof cumulativeKpiRows> = [];
    if (bpoReports.length) {
      const centre =
        me.role === "SUPERVISOR" && hasCentre(me)
          ? { country: me.country, state: me.state }
          : me.role === "ADMIN" && searchParams.get("country") && searchParams.get("state")
            ? { country: searchParams.get("country"), state: searchParams.get("state") }
            : !isSupervisorLike(me) && hasCentre(me)
              ? { country: me.country, state: me.state }
              : null; // admins without drill-down see the global defaults
      const catalogue = await resolveKpiCatalogue(centre);
      const dominantDept = bpoReports[0]?.department === "INBOUND" ? "INBOUND" : "BPO";
      const targets = kpiTargetMap(catalogue.filter((c) => c.active), [dominantDept, "BPO", "INBOUND"]);
      rows = cumulativeKpiRows(bpoReports.map((r) => r.kpiMetrics), distinctDates, targets);
    }

    // Supervisor per-employee breakdown
    const byEmployee = supervisor
      ? Object.values(
          reports.reduce<Record<string, { userId: string; userName: string; department: string; location: string; reports: number; callsMade: number; callsConnected: number; mailsSent: number; leads: number; tasksCompleted: number; postsPublished: number }>>((acc, r) => {
            const e = (acc[r.userId] ??= {
              userId: r.userId,
              userName: r.user.fullName,
              department: r.department,
              location: [r.user.state, r.user.country].filter(Boolean).join(", "),
              reports: 0,
              callsMade: 0,
              callsConnected: 0,
              mailsSent: 0,
              leads: 0,
              tasksCompleted: 0,
              postsPublished: 0,
            });
            e.reports += 1;
            const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
            if (r.type === "AGENT_BPO") {
              const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []);
              for (const m of metrics) {
                if (m.actual === null) continue;
                if (m.key === "totalCallsMade") e.callsMade += m.actual;
                if (m.key === "callsConnected") e.callsConnected += m.actual;
                if (m.key === "totalMailsSent") e.mailsSent += m.actual;
                if (m.key === "hotLeads" || m.key === "warmLeads") e.leads += m.actual;
              }
            }
            if (typeof ms.tasksCompleted === "number") e.tasksCompleted += ms.tasksCompleted;
            if (typeof ms.postsPublished === "number") e.postsPublished += ms.postsPublished;
            return acc;
          }, {}),
        ).sort((a, b) => a.department.localeCompare(b.department) || b.reports - a.reports)
      : [];

    return ok({
      period,
      label,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      periodDays,
      reportCount: reports.length,
      distinctDates,
      rows,
      techTotals,
      socialTotals,
      byEmployee,
      techLabels: TECH_SUMMARY_METRICS,
      socialLabels: SOCIAL_SUMMARY_METRICS,
    });
  });
}
