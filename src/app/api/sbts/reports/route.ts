import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { sbtsScopeFor, sbtsVisibleEmails } from "@/lib/integrations/sbts";

/**
 * SBTS daily reports — session-authenticated, visibility-scoped.
 * GET /api/sbts/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&email=a@b.c
 *
 * A logged-in agent matches reports by THEIR OWN account email only — the
 * email parameter is ignored for them (server-side enforcement, never trusted
 * from the client). Team leads see their team's reports; supervisors and
 * administrators see all divisions, optionally filtered by email/date.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const scope = sbtsScopeFor(user);
    if (!scope) return fail("SBTS reports are available to media staff, team leads and supervisors", 403);

    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const emailParam = (url.searchParams.get("email") ?? "").trim().toLowerCase();

    const visible = await sbtsVisibleEmails(user);
    let targetEmails: string[];

    if (scope === "own") {
      targetEmails = [user.email.toLowerCase()]; // param ignored — enforced self-scope
    } else {
      if (emailParam) {
        if (!visible.includes(emailParam)) return fail("No visibility over this account's reports", 403);
        targetEmails = [emailParam];
      } else {
        targetEmails = visible;
      }
    }

    const dateWhere: { gte?: string; lte?: string } = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) dateWhere.gte = from;
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) dateWhere.lte = to;

    const rows = await db.sbtsEvent.findMany({
      where: {
        type: "daily.report",
        agentEmail: { in: targetEmails.length ? targetEmails : ["__none__"] },
        ...(dateWhere.gte || dateWhere.lte ? { eventDate: dateWhere } : {}),
      },
      orderBy: [{ eventDate: "desc" }, { receivedAt: "desc" }],
      take: 200,
      select: { eventId: true, agentEmail: true, eventDate: true, report: true, receivedAt: true, userId: true },
    });

    const userIds = [...new Set(rows.map((r) => r.userId).filter((id): id is string => !!id))];
    const users = userIds.length
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    // Fallback: resolve names by email for events stored before mapping existed
    const unmatchedEmails = [...new Set(rows.filter((r) => !r.userId).map((r) => r.agentEmail))];
    const usersByEmail = unmatchedEmails.length
      ? await db.user.findMany({ where: { email: { in: unmatchedEmails } }, select: { email: true, fullName: true } })
      : [];
    const nameByEmail = new Map(usersByEmail.map((u) => [u.email.toLowerCase(), u.fullName]));

    return ok({
      scope,
      version: "v1",
      reports: rows.map((r) => ({
        eventId: r.eventId,
        agentEmail: r.agentEmail,
        agentName: (r.userId ? nameById.get(r.userId) : nameByEmail.get(r.agentEmail)) ?? null,
        date: r.eventDate,
        report: r.report,
        receivedAt: r.receivedAt,
      })),
    });
  });
}
