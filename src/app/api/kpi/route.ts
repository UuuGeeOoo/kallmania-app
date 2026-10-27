import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import {
  PERIODS, periodRange, buildDeptSections, buildTrends,
  type Period, type AggReport,
} from "@/lib/kpi-aggregate";

/**
 * GET /api/kpi?period=daily|weekly|monthly&date=YYYY-MM-DD&department=BPO|WEB_DEV|SOCIAL_MEDIA|ALL
 *
 * Cumulative KPI performance across Day / Week / Month:
 *  • overview  — overall achievement % for all three periods (headline cards)
 *  • sections  — per-department cumulative KPI table for the selected period
 *  • trends    — achievement trend buckets (14 days / 8 weeks / 6 months)
 *
 * Employees see their own reports; supervisors & admins see the whole team
 * (optionally filtered by department).
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get("period") || "daily").toLowerCase() as Period;
    const period: Period = PERIODS.includes(periodParam) ? periodParam : "daily";
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const department = searchParams.get("department") || "ALL";
    const supervisor = isSupervisorLike(me);

    // Scope: employees are limited to their own submissions
    const baseWhere: Record<string, unknown> = {
      status: { in: ["SUBMITTED", "APPROVED"] },
      type: { not: "SUPERVISOR" },
    };
    if (!supervisor) baseWhere.userId = me.id;

    // Active KPI catalogue per department — the rows report forms submit
    // against (also carries each row's default daily target)
    const configs = await db.kpiConfig.findMany({ where: { active: true } });

    const fmt = (d: Date) => d.toISOString();

    // ── Overview: achievement for all three periods (unfiltered by department) ──
    const dayR = periodRange(date, "daily");
    const weekR = periodRange(date, "weekly");
    const monthR = periodRange(date, "monthly");
    const overviewStart = new Date(Math.min(dayR.start.getTime(), weekR.start.getTime(), monthR.start.getTime()));
    const overviewEnd = new Date(Math.max(dayR.end.getTime(), weekR.end.getTime(), monthR.end.getTime()));

    const overviewReportsRaw = await db.report.findMany({
      where: { ...baseWhere, reportDate: { gte: overviewStart, lte: overviewEnd } },
      select: { type: true, department: true, kpiMetrics: true, metricsSummary: true, reportDate: true },
    });
    const overviewReports: AggReport[] = overviewReportsRaw;
    const inRange = (r: AggReport, s: Date, e: Date) => {
      const rd = new Date(r.reportDate);
      return rd >= s && rd <= e;
    };
    const overview = (["daily", "weekly", "monthly"] as Period[]).map((p) => {
      const r = periodRange(date, p);
      const reports = overviewReports.filter((x) => inRange(x, r.start, r.end));
      const secs = buildDeptSections(reports, configs, r.daysElapsed);
      const withData = secs.filter((s) => s.overall !== null);
      const totalKpis = secs.reduce((n, s) => n + s.kpis.length, 0);
      const tracked = secs.reduce((n, s) => n + s.kpis.filter((k) => k.achievement !== null).length, 0);
      return {
        period: p,
        label: r.label,
        daysElapsed: r.daysElapsed,
        daysTotal: r.daysTotal,
        reportCount: reports.length,
        achievement: withData.length
          ? Math.round((withData.reduce((s, x) => s + (x.overall as number), 0) / withData.length) * 100) / 100
          : null,
        kpisTracked: totalKpis,
        kpisWithData: tracked,
      };
    });

    // ── Department sections for the selected period (honours department filter) ──
    const range = periodRange(date, period);
    const periodWhere: Record<string, unknown> = { ...baseWhere, reportDate: { gte: range.start, lte: range.end } };
    if (supervisor && department !== "ALL") periodWhere.department = department;
    const periodReportsRaw = await db.report.findMany({
      where: periodWhere,
      select: { type: true, department: true, kpiMetrics: true, metricsSummary: true, reportDate: true },
    });
    const periodReports: AggReport[] = periodReportsRaw;
    const sections = buildDeptSections(periodReports, configs, range.daysElapsed);

    // ── Trends (extended window ending at the selected period) ──
    const trendStart =
      period === "daily" ? addDays(date, -13)
      : period === "weekly" ? addDays(date, -7 * 7)
      : monthShift(date, -5);
    const trendReportsRaw = await db.report.findMany({
      where: { ...baseWhere, reportDate: { gte: new Date(trendStart + "T00:00:00.000Z") } },
      select: { type: true, department: true, kpiMetrics: true, metricsSummary: true, reportDate: true },
    });
    const trends = buildTrends(date, period, trendReportsRaw as AggReport[], configs);

    return ok({
      role: me.role,
      scope: supervisor ? "team" : "mine",
      period,
      date,
      department: supervisor ? department : "ALL",
      range: { start: fmt(range.start), end: fmt(range.end), label: range.label, daysElapsed: range.daysElapsed, daysTotal: range.daysTotal },
      overview,
      sections: sections.map((s) => ({
        ...s,
        kpis: s.kpis.filter((k) => k.actual !== null || k.targetDaily !== null),
      })),
      trends,
    });
  });
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthShift(dateISO: string, months: number): string {
  const d = new Date(dateISO + "T00:00:00.000Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)).toISOString().slice(0, 10);
}
