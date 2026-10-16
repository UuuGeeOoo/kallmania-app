import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import { type KpiMetric } from "@/lib/kpi";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS, AGENT_KPI_DEFS } from "@/lib/template-config";

/**
 * GET /api/kpi/summary?period=day|week|month&date=YYYY-MM-DD
 *
 * Multi-period cumulative KPI aggregation:
 *  - day   → the single calendar date
 *  - week  → Monday–Sunday ISO week containing the date
 *  - month → calendar month containing the date
 *
 * Count metrics are summed across all submitted/approved reports in the period;
 * targets for count metrics scale by the number of distinct report days, while
 * percent targets stay fixed and percent metrics are recomputed from summed raw
 * components (never averaged blindly). Minutes metrics are averaged. Missing
 * data never becomes zero — rows without data stay null.
 */

const MS_DAY = 86_400_000;

function periodRange(period: string, dateStr: string): { start: Date; end: Date; label: string; periodDays: number } {
  const d = new Date(dateStr + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) d.setTime(Date.now());
  if (period === "week") {
    const dow = d.getUTCDay(); // 0 Sun … 6 Sat
    const diffToMon = (dow + 6) % 7;
    const start = new Date(d.getTime() - diffToMon * MS_DAY);
    const endExclusive = new Date(start.getTime() + 7 * MS_DAY);
    return {
      start,
      end: new Date(endExclusive.getTime() - 1),
      label: `Week of ${start.toISOString().slice(0, 10)} → ${new Date(endExclusive.getTime() - MS_DAY).toISOString().slice(0, 10)}`,
      periodDays: 7,
    };
  }
  if (period === "month") {
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return {
      start,
      end,
      label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      periodDays: end.getUTCDate(),
    };
  }
  return { start: d, end: new Date(d.getTime() + MS_DAY - 1), label: dateStr, periodDays: 1 };
}

interface CumRow {
  key: string;
  label: string;
  unit: string;
  category: string;
  dailyTarget: number | null;
  target: number | null; // period-scaled target
  targetLabel: string;
  actual: number | null;
  pct: number | null; // achievement vs period target
}

/** Derived metrics recomputed from raw component sums */
function deriveFromSums(key: string, sums: Record<string, number>): number | null {
  if (key === "contactRate") {
    if (!sums.totalCallsMade) return null;
    return Math.round((sums.callsConnected / sums.totalCallsMade) * 10000) / 100;
  }
  if (key === "conversionRate") {
    if (!sums.callsConnected) return null;
    return Math.round(((sums.hotLeads + sums.warmLeads) / sums.callsConnected) * 10000) / 100;
  }
  if (key === "leadsGenerated") {
    if (!sums.hotLeads && !sums.warmLeads) return null;
    return sums.hotLeads + sums.warmLeads;
  }
  return null;
}

const DERIVED_KEYS = new Set(["contactRate", "conversionRate", "leadsGenerated"]);

/** Build cumulative BPO KPI rows from a list of report kpiMetrics JSON blobs */
function cumulativeKpiRows(kpiBlobs: (string | null)[], distinctDates: number): CumRow[] {
  const sums: Record<string, number> = {}; // count sums
  const minSum: Record<string, { sum: number; n: number }> = {}; // minutes
  const pctVals: Record<string, number[]> = {}; // percent fallback

  for (const blob of kpiBlobs) {
    const metrics = safeParse<KpiMetric[]>(blob, []);
    for (const m of metrics) {
      if (m.actual === null || m.actual === undefined || Number.isNaN(m.actual)) continue;
      if (m.unit === "minutes") {
        const acc = (minSum[m.key] ??= { sum: 0, n: 0 });
        acc.sum += m.actual;
        acc.n += 1;
      } else if (m.unit === "percent") {
        (pctVals[m.key] ??= []).push(m.actual);
      } else {
        sums[m.key] = (sums[m.key] || 0) + m.actual;
      }
    }
  }

  return AGENT_KPI_DEFS.map((def): CumRow => {
    let actual: number | null = null;
    if (def.unit === "percent") {
      const derived = deriveFromSums(def.key, sums);
      actual = derived ?? (pctVals[def.key]?.length ? Math.round((pctVals[def.key].reduce((s, v) => s + v, 0) / pctVals[def.key].length) * 100) / 100 : null);
    } else if (def.unit === "minutes") {
      const acc = minSum[def.key];
      actual = acc && acc.n ? Math.round((acc.sum / acc.n) * 100) / 100 : null;
    } else {
      const derived = DERIVED_KEYS.has(def.key) ? deriveFromSums(def.key, sums) : null;
      actual = derived ?? (sums[def.key] !== undefined ? Math.round(sums[def.key] * 100) / 100 : null);
    }

    // Targets: counts scale by days with data; percent/minutes targets stay fixed
    const scale = def.unit === "count" && def.target !== null ? distinctDates : 1;
    const target = def.target !== null ? Math.round(def.target * scale * 100) / 100 : null;
    const pct = actual !== null && target !== null && target !== 0 ? Math.round((actual / target) * 10000) / 100 : null;

    const targetLabel =
      def.target !== null
        ? `${Math.round(def.target * scale * 100) / 100}${def.unit === "percent" ? "%" : def.unit === "minutes" ? "mins" : ""}${scale > 1 ? ` (${def.target}/day × ${scale}d)` : ""}`
        : def.targetLabel ?? "-";

    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      category: def.category,
      dailyTarget: def.target,
      target,
      targetLabel,
      actual,
      pct,
    };
  });
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "day";
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const { start, end, label, periodDays } = periodRange(period, date);
    const supervisor = isSupervisorLike(me);

    const where: Record<string, unknown> = {
      reportDate: { gte: start, lte: end },
      status: { in: ["SUBMITTED", "APPROVED"] },
    };
    if (supervisor) {
      where.type = { not: "SUPERVISOR" };
      if (me.role === "SUPERVISOR" && me.department !== "MANAGEMENT") where.department = me.department;
    } else {
      where.userId = me.id;
    }

    const reports = await db.report.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, role: true, department: true, employeeId: true } } },
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

    // KPI rows: BPO cumulative (own for agents, team for supervisors).
    // Tech/social employees see their summary metrics via techTotals/socialTotals.
    const rows = bpoReports.length ? cumulativeKpiRows(bpoReports.map((r) => r.kpiMetrics), distinctDates) : [];

    // Supervisor per-employee breakdown
    const byEmployee = supervisor
      ? Object.values(
          reports.reduce<Record<string, { userId: string; userName: string; department: string; reports: number; callsMade: number; callsConnected: number; mailsSent: number; leads: number; tasksCompleted: number; postsPublished: number }>>((acc, r) => {
            const e = (acc[r.userId] ??= {
              userId: r.userId,
              userName: r.user.fullName,
              department: r.department,
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
