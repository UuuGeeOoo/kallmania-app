import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import {
  computeCumulativeKpi,
  expectedWorkingDays,
  type RawKpiRecord,
  type CumulativeResult,
} from "@/lib/kpi-engine";

/**
 * GET /api/kpi/cumulative — the report-based cumulative KPI engine (read side).
 *
 * Reads the normalized KpiResult records (written from submitted reports and
 * parsed SBTS Media Scoreboard reports) and computes, per KPI:
 *   cumulative target = Σ daily targets, cumulative actual = Σ daily actuals,
 *   cumulative variance, achievement = cumulative actual ÷ cumulative target
 *   (never an average of daily percentages),
 * plus day counts (met / exceeded / missed / no-data), reporting coverage from
 * the agent's workDays mask (a working day with no report is flagged MISSING,
 * never counted as zero) and the same-day collapse that stops a second
 * daily.report of one day from double-counting.
 *
 * Query:
 *   userId=  whose records (default: me)
 *   period=  day | week | month | quarter | custom   (default month)
 *   date=    anchor date YYYY-MM-DD (default today)
 *   from/to= required for period=custom
 *   roster=  "social" → every SOCIAL team member (management-gated)
 *
 * Access mirrors /api/kpi/results: self for everyone; TEAM_LEAD → staff in
 * their centre; SUPERVISOR → their centre; ADMIN → everyone.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "month") as "day" | "week" | "month" | "quarter" | "custom";
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const roster = searchParams.get("roster");

    const anchor = new Date(date + "T00:00:00.000Z");
    const windowOf = (): { start: Date; end: Date; label: string } => {
      if (period === "custom" && from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to) {
        return { start: new Date(from + "T00:00:00.000Z"), end: new Date(to + "T23:59:59.999Z"), label: `${from} → ${to}` };
      }
      if (period === "day") return { start: anchor, end: new Date(anchor.getTime() + 86_399_999), label: date };
      if (period === "week") {
        const dow = (anchor.getUTCDay() + 6) % 7;
        const start = new Date(anchor.getTime() - dow * 86_400_000);
        const end = new Date(start.getTime() + 6 * 86_400_000 + 86_399_999);
        return { start, end, label: `Week of ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}` };
      }
      if (period === "quarter") {
        const q = Math.floor(anchor.getUTCMonth() / 3);
        const start = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3, 1));
        const end = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999));
        return { start, end, label: `Q${q + 1} ${anchor.getUTCFullYear()}` };
      }
      return {
        start: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)),
        end: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
        label: anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      };
    };

    // ── Roster mode: the whole SOCIAL team, one cumulative result per member ──
    if (roster === "social") {
      if (me.role !== "TEAM_LEAD" && me.role !== "SUPERVISOR" && !isSupervisorLike(me)) {
        throw new AuthError("Not authorized", 403);
      }
      const members = await db.user.findMany({
        where: { team: "SOCIAL", status: "APPROVED" },
        select: { id: true, fullName: true, email: true, team: true, department: true, workDays: true, createdAt: true, role: true, country: true, state: true },
        orderBy: { fullName: "asc" },
      });
      // Centre gate: leads/supervisors only see their own centre's members.
      if (me.role === "TEAM_LEAD" || me.role === "SUPERVISOR") {
        const outside = members.filter((m) => !(me.country && me.state && m.country === me.country && m.state === me.state));
        if (outside.length) throw new AuthError("You can only view cumulative KPIs for staff in your centre", 403);
      }
      const w = windowOf();
      const directions = await catalogueMap("SOCIAL_MEDIA");
      const out: { user: { id: string; fullName: string; email: string; role: string }; cumulative: CumulativeResult; dailyRecords: unknown[] }[] = [];
      for (const m of members) {
        const res = await engineFor(m.id, m, w, directions);
        out.push({ user: { id: m.id, fullName: m.fullName, email: m.email, role: m.role }, ...res });
      }
      return ok({ period, window: { start: w.start.toISOString(), end: w.end.toISOString(), label: w.label }, roster: out });
    }

    // ── Single-user mode ──
    const userId = searchParams.get("userId") || me.id;
    if (userId !== me.id) {
      const target = await db.user.findUnique({ where: { id: userId }, select: { country: true, state: true } });
      if (!target) return fail("User not found", 404);
      if (me.role === "SUPERVISOR" || me.role === "TEAM_LEAD") {
        const sameCentre = me.country && me.state && target.country === me.country && target.state === me.state;
        if (!sameCentre) throw new AuthError("You can only view cumulative KPIs for staff in your centre", 403);
      } else if (!isSupervisorLike(me)) {
        throw new AuthError("Not authorized", 403);
      }
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, team: true, department: true, workDays: true, role: true, createdAt: true },
    });
    if (!user) return fail("User not found", 404);
    const w = windowOf();
    const dept = user.team === "SOCIAL" ? "SOCIAL_MEDIA" : user.team === "TECH" ? "WEB_DEV" : user.department;
    const directions = await catalogueMap(dept);
    const res = await engineFor(user.id, user, w, directions);
    return ok({
      user: { id: user.id, fullName: user.fullName, email: user.email, team: user.team, department: user.department, workDays: user.workDays, role: user.role },
      period,
      window: { start: w.start.toISOString(), end: w.end.toISOString(), label: w.label },
      ...res,
    });
  });
}

async function catalogueMap(dept: string): Promise<Map<string, string>> {
  const rows = await db.kpiConfig.findMany({ where: { department: dept, active: true }, select: { key: true, direction: true } });
  return new Map(rows.map((r) => [r.key, r.direction]));
}

/** Records + reports → engine input → CumulativeResult with daily records. */
async function engineFor(
  userId: string,
  user: { workDays: string; createdAt: Date },
  w: { start: Date; end: Date; label: string },
  directions: Map<string, string>,
): Promise<{ cumulative: CumulativeResult; dailyRecords: unknown[] }> {
  const [records, reports] = await Promise.all([
    db.kpiResult.findMany({
      where: { userId, reportDate: { gte: w.start, lte: w.end } },
      orderBy: [{ reportDate: "asc" }, { kpiKey: "asc" }],
      include: { report: { select: { ref: true } } },
    }),
    db.report.findMany({
      where: { userId, reportDate: { gte: w.start, lte: w.end }, status: { in: ["SUBMITTED", "APPROVED"] } },
      select: { ref: true, reportDate: true, type: true },
    }),
  ]);

  const raw: RawKpiRecord[] = records.map((r) => ({
    kpiKey: r.kpiKey,
    label: r.label,
    unit: r.unit,
    target: r.target,
    actual: r.actual,
    achievement: r.achievement,
    statusLabel: r.statusLabel,
    source: r.source,
    reportDate: r.reportDate,
    updatedAt: r.updatedAt,
    reportRef: r.report?.ref ?? null,
    sbtsEventId: r.sbtsEventId,
  }));

  // Coverage: a day counts as "reported" when a KPI record exists OR a
  // submitted/approved report was filed that day (a manual report without
  // numeric rows still proves the person reported for work).
  const reportedDates = new Set<string>([
    ...records.map((r) => new Date(r.reportDate).toISOString().slice(0, 10)),
    ...reports.map((r) => new Date(r.reportDate).toISOString().slice(0, 10)),
  ]);
  const expected = expectedWorkingDays(user.workDays, w.start, w.end, user.createdAt);
  const cumulative = computeCumulativeKpi(raw, directions, {
    expectedDays: expected.count,
    reportedDates,
    windowLabel: w.label,
  });
  cumulative.reporting.missingDates = expected.dates.filter((d) => !reportedDates.has(d)).slice(0, 31);

  const dailyRecords = records
    .slice()
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map((r) => ({
      id: r.id,
      date: new Date(r.reportDate).toISOString().slice(0, 10),
      kpiKey: r.kpiKey,
      label: r.label,
      unit: r.unit,
      target: r.target,
      actual: r.actual,
      variance: r.actual !== null && r.target !== null ? Math.round((r.actual - r.target) * 100) / 100 : null,
      achievement: r.achievement,
      statusLabel: r.statusLabel,
      source: r.source,
      verification: r.verification,
      revision: r.revision,
      extractionConfidence: r.extractionConfidence,
      evidence: r.evidence,
      ref: r.report?.ref ?? (r.sbtsEventId ? `SBTS event ${r.sbtsEventId.slice(0, 18)}…` : null),
    }));

  return { cumulative, dailyRecords };
}
