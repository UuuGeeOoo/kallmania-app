import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { worksOn } from "@/lib/schedule";

/**
 * GET /api/sbts/tl-performance — "My Team Lead Performance" (Media Scoreboard).
 *
 * The Team Lead's PERSONAL record, retrieved strictly by their authenticated
 * user id — never by name, never another lead's record. It does NOT mix the
 * lead's personal score with the team's overall score: the team view lives in
 * the existing scoreboard grid; this panel is the lead's own KPI breakdown:
 *   - personal KPI records materialized from their own submitted lead reports
 *     (TL_REPORT rows — the metrics their template captures) and any SBTS
 *     records mapped to their own account,
 *   - reporting compliance (submitted days vs scheduled working days),
 *   - strongest / weakest KPI by average achievement, period comparison,
 *   - their own report submission history.
 *
 * Access: TEAM_LEAD only (any team — the panel shows only the caller's own
 * data). Agents, supervisors and admins get 403 — agents must never see a
 * lead's private performance report.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (me.role !== "TEAM_LEAD") {
      throw new AuthError("My Team Lead Performance is only available to team leads", 403);
    }
    const leadRow = await db.user.findUnique({ where: { id: me.id }, select: { workDays: true, team: true, department: true } });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const anchor = new Date(date + "T00:00:00.000Z");

    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const prevStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
    const prevEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0, 23, 59, 59, 999));

    const [myReports, curRecords, prevRecords, sbtsRecords] = await Promise.all([
      db.report.findMany({
        where: { userId: me.id, type: "TEAM_LEAD", status: { in: ["SUBMITTED", "APPROVED"] } },
        orderBy: { reportDate: "desc" },
        take: 31,
        select: { id: true, ref: true, status: true, reportDate: true, sourceType: true, reviewedAt: true, reviewer: { select: { fullName: true } } },
      }),
      db.kpiResult.findMany({
        where: { userId: me.id, source: "TL_REPORT", reportDate: { gte: monthStart, lte: monthEnd } },
        orderBy: { reportDate: "asc" },
      }),
      db.kpiResult.findMany({
        where: { userId: me.id, source: "TL_REPORT", reportDate: { gte: prevStart, lte: prevEnd } },
        orderBy: { reportDate: "asc" },
      }),
      db.kpiResult.findMany({
        where: { userId: me.id, source: "SBTS" },
        orderBy: { reportDate: "desc" },
        take: 12,
      }),
    ]);

    // Per-KPI roll-up for a set of records (latest revision wins per key+day).
    const roll = (rows: typeof curRecords) => {
      const map = new Map<string, { kpiKey: string; label: string; unit: string; actualTotal: number; days: number; achievements: number[] }>();
      for (const r of rows) {
        const cur = map.get(r.kpiKey) ?? { kpiKey: r.kpiKey, label: r.label, unit: r.unit, actualTotal: 0, days: 0, achievements: [] as number[] };
        cur.actualTotal += r.actual ?? 0;
        cur.days += 1;
        if (r.achievement !== null) cur.achievements.push(r.achievement);
        map.set(r.kpiKey, cur);
      }
      return [...map.values()].map((s) => ({
        kpiKey: s.kpiKey, label: s.label, unit: s.unit,
        actualTotal: Math.round(s.actualTotal * 100) / 100, days: s.days,
        avgAchievement: s.achievements.length ? Math.round((s.achievements.reduce((x, y) => x + y, 0) / s.achievements.length) * 100) / 100 : null,
      })).sort((a, b) => (b.avgAchievement ?? -1) - (a.avgAchievement ?? -1));
    };

    const current = roll(curRecords);
    const previous = roll(prevRecords);
    const prevBy = new Map(previous.map((p) => [p.kpiKey, p.avgAchievement]));
    const kpiBreakdown = current.map((c) => ({ ...c, prevAvgAchievement: prevBy.get(c.kpiKey) ?? null }));

    const strongest = kpiBreakdown.find((k) => k.avgAchievement !== null) ?? null;
    const weakest = [...kpiBreakdown].reverse().find((k) => k.avgAchievement !== null) ?? null;

    // Reporting compliance: scheduled working days this month (up to today)
    // vs days with a submitted lead report.
    const todayUTC = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    let scheduledDays = 0;
    for (let d = new Date(monthStart); d <= todayUTC && d <= monthEnd; d = new Date(d.getTime() + 86_400_000)) {
      if (worksOn(leadRow?.workDays ?? null, d.toISOString().slice(0, 10))) scheduledDays += 1;
    }
    const submittedDates = new Set(myReports.map((r) => new Date(r.reportDate).toISOString().slice(0, 10)));
    const todayISO = todayUTC.toISOString().slice(0, 10);

    return ok({
      lead: { id: me.id, fullName: me.fullName, team: me.team, department: me.department },
      period: { label: anchor.toISOString().slice(0, 7), monthStart, monthEnd },
      todayStatus: submittedDates.has(todayISO) ? "SUBMITTED" : (worksOn(leadRow?.workDays ?? null, todayISO) ? "OUTSTANDING" : "NOT_SCHEDULED"),
      compliance: { scheduledDays, submittedDays: submittedDates.size, pct: scheduledDays ? Math.round((submittedDates.size / scheduledDays) * 10000) / 100 : null },
      kpiBreakdown,
      strongest: strongest ? { kpiKey: strongest.kpiKey, label: strongest.label, avgAchievement: strongest.avgAchievement } : null,
      weakest: weakest ? { kpiKey: weakest.kpiKey, label: weakest.label, avgAchievement: weakest.avgAchievement } : null,
      sbtsRecords: sbtsRecords.map((r) => ({ kpiKey: r.kpiKey, label: r.label, actual: r.actual, reportDate: r.reportDate })),
      history: myReports.map((r) => ({ id: r.id, ref: r.ref, status: r.status, reportDate: r.reportDate, sourceType: r.sourceType, reviewedAt: r.reviewedAt, reviewer: r.reviewer?.fullName ?? null })),
    });
  });
}
