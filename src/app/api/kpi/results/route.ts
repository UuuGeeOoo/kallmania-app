import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";

/**
 * GET /api/kpi/results — normalized KPI result records.
 *
 * ?userId=   whose records (default: me)      ?period=day|week|month|year
 * ?date=     anchor date (YYYY-MM-DD)        ?source=REPORT|TL_REPORT|SBTS
 * ?reportId= records of one report (review/archive detail)
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
    const period = (searchParams.get("period") || "month") as "day" | "week" | "month" | "year";
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

    // ── Period window (mirrors /api/kpi/summary semantics) ──
    const anchor = new Date(date + "T00:00:00.000Z");
    let start = new Date(anchor);
    let end = new Date(anchor);
    if (period === "day") end = new Date(anchor.getTime() + 86_399_999);
    else if (period === "week") { const dow = (anchor.getUTCDay() + 6) % 7; start = new Date(anchor.getTime() - dow * 86_400_000); end = new Date(start.getTime() + 6 * 86_400_000 + 86_399_999); }
    else if (period === "month") { start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)); end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999)); }
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

    // Compact per-KPI roll-up across the period: actuals sum, achievements
    // average only over rows that have one — missing data is never zero.
    const rollup = new Map<string, { kpiKey: string; label: string; unit: string; targetSum: number | null; actualSum: number; days: number; achievements: number[]; worst: number | null }>();
    for (const r of [...records].sort((a, b) => a.reportDate.getTime() - b.reportDate.getTime())) {
      const cur = rollup.get(r.kpiKey) ?? { kpiKey: r.kpiKey, label: r.label, unit: r.unit, targetSum: null, actualSum: 0, days: 0, achievements: [] as number[], worst: null as number | null };
      cur.actualSum += r.actual ?? 0;
      cur.days += 1;
      if (r.target !== null) cur.targetSum = (cur.targetSum ?? 0) + r.target;
      if (r.achievement !== null) {
        cur.achievements.push(r.achievement);
        if (cur.worst === null || r.achievement < cur.worst) cur.worst = r.achievement;
      }
      rollup.set(r.kpiKey, cur);
    }
    const summary = [...rollup.values()].map((s) => {
      const avgAch = s.achievements.length ? Math.round((s.achievements.reduce((x, y) => x + y, 0) / s.achievements.length) * 100) / 100 : null;
      const status = avgAch === null ? "NO_TARGET" : avgAch >= 100 ? "MET" : avgAch >= 80 ? "ON_TRACK" : "BELOW_TARGET";
      return { kpiKey: s.kpiKey, label: s.label, unit: s.unit, targetTotal: s.targetSum, actualTotal: Math.round(s.actualSum * 100) / 100, days: s.days, avgAchievement: avgAch, worstAchievement: s.worst, status };
    }).sort((a, b) => (b.avgAchievement ?? -1) - (a.avgAchievement ?? -1));

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
        report: r.report ? { id: r.report.id, ref: r.report.ref, type: r.report.type, status: r.report.status, sourceType: r.report.sourceType } : null,
        sbtsEvent: r.sbtsEvent ? { eventId: r.sbtsEvent.eventId, eventDate: r.sbtsEvent.eventDate, type: r.sbtsEvent.type } : null,
        updatedAt: r.updatedAt,
      })),
      summary,
    });
  });
}
