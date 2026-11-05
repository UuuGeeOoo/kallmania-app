import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { resolveKpiDirection } from "@/lib/kpi-engine";

/**
 * GET /api/kpi/results — normalized KPI result records.
 *
 * ?userId=   whose records (default: me)      ?period=day|week|month|quarter|year|custom
 * ?date=     anchor date (YYYY-MM-DD)         ?source=REPORT|TL_REPORT|SBTS
 * ?reportId= records of one report (review/archive detail)  ?from=&to= for custom
 *
 * Access: self for everyone; TEAM_LEAD → own centre's staff; SUPERVISOR →
 * own centre; ADMIN → everyone. reportId access follows the report's owner
 * under the same rules. Records are the machine-readable KPI store written
 * automatically from submissions and matched SBTS events — the archive and
 * dashboards read the same rows, never a separate copy.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || me.id;
    const reportId = searchParams.get("reportId");
    const source = searchParams.get("source");
    const period = (searchParams.get("period") || "month") as "day" | "week" | "month" | "quarter" | "year" | "custom";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    // ── Access control (backend, not UI) ──
    let targetUserId = userId;
    if (reportId) {
      const report = await db.report.findUnique({ where: { id: reportId }, select: { userId: true } });
      if (!report) return fail("Report not found", 404);
      targetUserId = report.userId;
    }
    if (targetUserId !== me.id) {
      const target = await db.user.findUnique({ where: { id: targetUserId }, select: { country: true, state: true, team: true } });
      if (!target) return fail("User not found", 404);
      if (me.role === "SUPERVISOR") {
        const sameCentre = me.country && me.state && target.country === me.country && target.state === me.state;
        if (!sameCentre) throw new AuthError("You can only view KPI records for staff in your centre", 403);
      } else if (me.role === "TEAM_LEAD") {
        const sameCentre = me.country && me.state && target.country === me.country && target.state === me.state;
        if (!sameCentre) throw new AuthError("You can only view KPI records for agents in your centre", 403);
      } else if (!isSupervisorLike(me)) {
        throw new AuthError("Not authorized", 403);
      }
    }

    // ── Period window (mirrors /api/kpi/cumulative semantics) ──
    const anchor = new Date(date + "T00:00:00.000Z");
    let start = new Date(anchor);
    let end = new Date(anchor);
    if (period === "custom" && from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to) {
      start = new Date(from + "T00:00:00.000Z");
      end = new Date(to + "T23:59:59.999Z");
    } else if (period === "day") end = new Date(anchor.getTime() + 86_399_999);
    else if (period === "week") { const dow = (anchor.getUTCDay() + 6) % 7; start = new Date(anchor.getTime() - dow * 86_400_000); end = new Date(start.getTime() + 6 * 86_400_000 + 86_399_999); }
    else if (period === "month") { start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)); end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999)); }
    else if (period === "quarter") { const q = Math.floor(anchor.getUTCMonth() / 3); start = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3, 1)); end = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)); }
    else { start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1)); end = new Date(Date.UTC(anchor.getUTCFullYear(), 11, 31, 23, 59, 59, 999)); }

    const where: Record<string, unknown> = {
      userId: targetUserId,
      reportDate: { gte: start, lte: end },
    };
    if (source && ["REPORT", "TL_REPORT", "SBTS"].includes(source)) where.source = source;
    if (reportId) { where.reportId = reportId; delete where.reportDate; }
    const [records, bySource] = await Promise.all([
      db.kpiResult.findMany({
        where,
        orderBy: [{ reportDate: "desc" }, { kpiKey: "asc" }],
        take: 500,
        include: {
          report: { select: { id: true, ref: true, type: true, status: true, sourceType: true } },
          sbtsEvent: { select: { eventId: true, eventDate: true, type: true } },
        },
      }),
      db.kpiResult.groupBy({
        by: ["source"],
        where: { userId: targetUserId, reportDate: { gte: start, lte: end } },
        _count: { id: true },
      }),
    ]);

    // Cumulative per-KPI roll-up — the §2.F math: cumulative target = Σ daily
    // targets, cumulative actual = Σ daily actuals, cumulative variance =
    // Σ (actual − target), achievement = cumulative actual ÷ cumulative target
    // (direction-aware; NEVER an average of daily achievement percentages).
    // Same-day duplicates collapse (latest wins) so a second report of one day
    // can never double-count. Rows without an actual are noData days — they
    // stay out of every sum and are counted, not zero-filled.
    const deptOf = (await db.user.findUnique({ where: { id: targetUserId }, select: { department: true, team: true } }))?.department ?? "";
    const dirRows = await db.kpiConfig.findMany({ where: { department: { in: [deptOf, "SOCIAL_MEDIA", "WEB_DEV"] }, active: true }, select: { key: true, direction: true } });
    const directions = new Map(dirRows.map((r) => [r.key, r.direction]));
    const rollup = new Map<string, {
      kpiKey: string; label: string; unit: string; targetSum: number | null; actualSum: number | null; varianceSum: number | null;
      days: number; noDataDays: number; metDays: number; exceededDays: number; missedDays: number; worst: number | null;
    }>();
    const byDay = new Map<string, typeof records>();
    for (const r of records) {
      const d = new Date(r.reportDate).toISOString().slice(0, 10);
      const arr = byDay.get(`${r.kpiKey}|${d}`) ?? [];
      arr.push(r);
      byDay.set(`${r.kpiKey}|${d}`, arr);
    }
    for (const rowsOfKeyDay of byDay.values()) {
      const latest = [...rowsOfKeyDay].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      const cur = rollup.get(latest.kpiKey) ?? {
        kpiKey: latest.kpiKey, label: latest.label, unit: latest.unit, targetSum: null, actualSum: null, varianceSum: null,
        days: 0, noDataDays: 0, metDays: 0, exceededDays: 0, missedDays: 0, worst: null as number | null,
      };
      cur.days += 1;
      if (latest.actual === null || latest.actual === undefined) {
        cur.noDataDays += 1;
      } else {
        cur.actualSum = (cur.actualSum ?? 0) + latest.actual;
        if (latest.target !== null) {
          cur.targetSum = (cur.targetSum ?? 0) + latest.target;
          cur.varianceSum = (cur.varianceSum ?? 0) + (latest.actual - latest.target);
        }
        const dir = resolveKpiDirection(directions, latest.kpiKey, latest.unit);
        const d = dir === "LOWER_BETTER"
          ? latest.target ? Math.round((latest.target / Math.max(latest.actual, Number.EPSILON)) * 10000) / 100 : null
          : latest.target ? Math.round((latest.actual / latest.target) * 10000) / 100 : null;
        if (d !== null) {
          if (d > 100) { cur.exceededDays += 1; } else if (d >= 100) { cur.metDays += 1; } else { cur.missedDays += 1; }
          if (cur.worst === null || d < cur.worst) cur.worst = d;
        }
      }
      rollup.set(latest.kpiKey, cur);
    }
    const summary = [...rollup.values()].map((s) => {
      const dir = resolveKpiDirection(directions, s.kpiKey, s.unit);
      const ach = s.actualSum !== null && s.targetSum !== null && s.targetSum !== 0
        ? dir === "LOWER_BETTER"
          ? Math.round((s.targetSum / Math.max(s.actualSum, Number.EPSILON)) * 10000) / 100
          : Math.round((s.actualSum / s.targetSum) * 10000) / 100
        : null;
      const status = s.actualSum === null ? "NO_DATA" : ach === null ? "NO_TARGET" : ach >= 100 ? "MET" : ach >= 80 ? "ON_TRACK" : "BELOW_TARGET";
      const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);
      return {
        kpiKey: s.kpiKey, label: s.label, unit: s.unit,
        cumulativeTarget: r2(s.targetSum), cumulativeActual: r2(s.actualSum), cumulativeVariance: r2(s.varianceSum),
        achievementPct: ach, status,
        days: s.days, noDataDays: s.noDataDays, metDays: s.metDays, exceededDays: s.exceededDays, missedDays: s.missedDays,
        worstDayAchievement: s.worst,
      };
    }).sort((a, b) => (b.achievementPct ?? -1) - (a.achievementPct ?? -1));

    return ok({
      userId: targetUserId,
      period, label: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
      bySource: Object.fromEntries(bySource.map((b) => [b.source, b._count.id])),
      count: records.length,
      records: records.map((r) => ({
        id: r.id, kpiKey: r.kpiKey, label: r.label, unit: r.unit,
        target: r.target, actual: r.actual, achievement: r.achievement, statusLabel: r.statusLabel,
        source: r.source, reportDate: r.reportDate, periodMonth: r.periodMonth,
        verification: r.verification, revision: r.revision, previousActual: r.previousActual,
        extractionConfidence: r.extractionConfidence, evidence: r.evidence,
        report: r.report ? { id: r.report.id, ref: r.report.ref, type: r.report.type, status: r.report.status, sourceType: r.report.sourceType } : null,
        sbtsEvent: r.sbtsEvent ? { eventId: r.sbtsEvent.eventId, eventDate: r.sbtsEvent.eventDate, type: r.sbtsEvent.type } : null,
        updatedAt: r.updatedAt,
      })),
      summary,
    });
  });
}
