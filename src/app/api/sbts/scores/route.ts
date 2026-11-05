import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { sbtsScopeFor, sbtsVisibleEmails } from "@/lib/integrations/sbts";

/**
 * SBTS scoreboard data — session-authenticated, visibility-scoped.
 * GET /api/sbts/scores
 *
 * Agents see only their own entry (match by account email); a team lead sees
 * the members of their team; supervisors/administrators see every media agent
 * plus any unmapped event emails (so roster mismatches surface instead of
 * silently disappearing).
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const scope = sbtsScopeFor(user);
    if (!scope) return fail("SBTS scoreboard is available to media staff, team leads and supervisors", 403);

    const emails = await sbtsVisibleEmails(user);
    const roster = await db.user.findMany({
      where: { email: { in: emails.length ? emails : ["__none__"] } },
      select: { id: true, email: true, fullName: true, role: true, department: true, team: true, status: true },
    });
    const rosterEmails = roster.map((r) => r.email.toLowerCase());

    const [scoreEvents, reportEvents, unmappedGroups] = await Promise.all([
      db.sbtsEvent.findMany({
        where: { type: "performance.score", agentEmail: { in: rosterEmails.length ? rosterEmails : ["__none__"] } },
        orderBy: [{ receivedAt: "desc" }],
        take: 3000,
        select: { agentEmail: true, eventDate: true, score: true, delta: true, components: true, eventId: true, receivedAt: true },
      }),
      db.sbtsEvent.findMany({
        where: { type: "daily.report", agentEmail: { in: rosterEmails.length ? rosterEmails : ["__none__"] } },
        orderBy: [{ receivedAt: "desc" }],
        take: 3000,
        select: { agentEmail: true, eventDate: true, report: true, receivedAt: true },
      }),
      scope === "all"
        ? db.sbtsEvent.groupBy({
            by: ["agentEmail"],
            where: { matched: false },
            _max: { receivedAt: true },
          })
        : Promise.resolve([] as { agentEmail: string; _max: { receivedAt: Date | null } }[]),
    ]);

    const weekAgoISO = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);

    const pickLatest = <T extends { eventDate: string; receivedAt: Date }>(rows: T[]): { latest: T | null; previous: T | null } => {
      // Events arrive ordered by receivedAt desc; business "latest" = highest
      // eventDate, tie-break most recently received.
      const sorted = [...rows].sort((a, b) => (a.eventDate === b.eventDate
        ? b.receivedAt.getTime() - a.receivedAt.getTime()
        : a.eventDate < b.eventDate ? 1 : -1));
      return { latest: sorted[0] ?? null, previous: sorted[1] ?? null };
    };

    const agents = roster.map((r) => {
      const email = r.email.toLowerCase();
      const ownScores = scoreEvents.filter((e) => e.agentEmail === email);
      const { latest, previous } = pickLatest(ownScores);
      const ownReports = reportEvents.filter((e) => e.agentEmail === email);
      const lastReport = ownReports[0] ?? null;
      return {
        email: r.email,
        fullName: r.fullName,
        role: r.role,
        division: r.department,
        team: r.team,
        status: r.status,
        latest: latest
          ? { eventId: latest.eventId, date: latest.eventDate, score: latest.score, delta: latest.delta, components: latest.components, receivedAt: latest.receivedAt }
          : null,
        previous: previous
          ? { eventId: previous.eventId, date: previous.eventDate, score: previous.score, delta: previous.delta, receivedAt: previous.receivedAt }
          : null,
        lastReportAt: lastReport ? lastReport.receivedAt : null,
        lastReportDate: lastReport ? lastReport.eventDate : null,
        latestReportExcerpt: lastReport ? (lastReport.report ?? "").slice(0, 240) : null,
        reports7d: ownReports.filter((e) => e.eventDate >= weekAgoISO).length,
      };
    }).sort((a, b) => (b.latest?.score ?? -1) - (a.latest?.score ?? -1));

    // Unmapped event emails — only management sees these (roster reconciliation).
    const unmapped = scope === "all"
      ? await Promise.all(unmappedGroups.map(async (g) => {
          const ev = await db.sbtsEvent.findFirst({
            where: { agentEmail: g.agentEmail, type: "performance.score" },
            orderBy: [{ receivedAt: "desc" }],
            select: { eventId: true, eventDate: true, score: true, delta: true, components: true, receivedAt: true },
          });
          return {
            email: g.agentEmail,
            latest: ev ? { eventId: ev.eventId, date: ev.eventDate, score: ev.score, delta: ev.delta, components: ev.components, receivedAt: ev.receivedAt } : null,
            lastEventAt: g._max.receivedAt,
          };
        }))
      : [];

    return ok({ scope, version: "v1", agents, unmapped });
  });
}
