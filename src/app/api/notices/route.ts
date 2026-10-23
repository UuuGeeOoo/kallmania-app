import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit, notify } from "@/lib/notify";
import { TEAM_META } from "@/lib/auth";

/**
 * Notice Board.
 *
 * GET    /api/notices  — audience-filtered feed (+ centres for composers)
 * POST   /api/notices  — post: administrator (any audience incl. broadcast),
 *                        supervisor (their centre, optional teams),
 *                        team lead (their own team in their centre)
 * PATCH  /api/notices  — edit (author or administrator)
 * DELETE /api/notices  — delete (author or administrator). Deleting removes the
 *                        notice for EVERYONE — recipients' boards and their
 *                        inbox notifications are cleaned up automatically.
 *
 * Audience model on each notice:
 *  - centreCountry/centreState null & allCentres=false → company-wide (everyone)
 *  - centreCountry+centreState set                     → that centre
 *  - teams (JSON array) set                            → only those teams within the centre
 *  - allCentres=true                                   → broadcast to every centre (admin)
 * Agents never see other centres' notices; management keeps oversight.
 */

interface Me {
  id: string;
  fullName: string;
  role: string;
  team: string | null;
  country: string | null;
  state: string | null;
}

function parseTeams(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string" && TEAM_META[t]) : [];
  } catch {
    return [];
  }
}

/** Is this notice visible to `me`? Administrators see everything. */
function visibleTo(notice: { centreCountry: string | null; centreState: string | null; teams: string | null; allCentres: boolean }, me: Me): boolean {
  if (me.role === "ADMIN") return true;
  const isGlobal = !notice.allCentres && !notice.centreCountry && !notice.centreState;
  if (isGlobal || notice.allCentres) return true; // company-wide & broadcasts reach everyone
  const inCentre = !!me.country && !!me.state && notice.centreCountry === me.country && notice.centreState === me.state;
  if (!inCentre) {
    // Supervisors keep oversight of every centre they manage — none for now,
    // so centre-targeted notices stay inside their centre.
    return false;
  }
  const teams = parseTeams(notice.teams);
  if (!teams.length) return true; // whole centre
  return !!me.team && teams.includes(me.team);
}

/** Resolve the recipients of an audience spec (users who should receive it). */
async function audienceUsers(me: Me, audience: { allCentres: boolean; centreCountry?: string | null; centreState?: string | null; teams?: string[] }): Promise<{ id: string; fullName: string }[]> {
  const where: Record<string, unknown> = { status: "APPROVED" };
  if (audience.allCentres) {
    // Everyone, everywhere.
  } else if (audience.centreCountry && audience.centreState) {
    where.country = audience.centreCountry;
    where.state = audience.centreState;
    if (audience.teams && audience.teams.length) where.team = { in: audience.teams };
  } else {
    return [];
  }
  return db.user.findMany({ where, select: { id: true, fullName: true } });
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me: Me = await requireUser();
    const notices = await db.notice.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    const visible = notices.filter((n) => visibleTo(n, me));

    // Centres for the audience composer (admins: every centre; supervisors: theirs).
    let centres: { country: string; state: string; agents: number }[] = [];
    if (me.role === "ADMIN" || me.role === "SUPERVISOR") {
      const where = me.role === "SUPERVISOR" ? { status: "APPROVED", country: me.country, state: me.state } : { status: "APPROVED", country: { not: null }, state: { not: null } };
      const rows = await db.user.groupBy({ by: ["country", "state"], where, _count: { _all: true } });
      centres = rows
        .filter((r) => r.country && r.state)
        .map((r) => ({ country: r.country as string, state: r.state as string, agents: r._count._all }))
        .sort((a, b) => a.country.localeCompare(b.country) || a.state.localeCompare(b.state));
    }
    return ok({ notices: visible, centres, teams: TEAM_META });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const me: Me = await requireUser();
    if (!["ADMIN", "SUPERVISOR", "TEAM_LEAD"].includes(me.role)) {
      throw new AuthError("Only administrators, supervisors and team leads can post notices", 403);
    }
    const body = await req.json();
    const { title, body: noticeBody, pinned, allCentres, centreCountry, centreState, teams } = body;
    if (!title || !String(title).trim()) return fail("A notice title is required");
    if (!noticeBody || !String(noticeBody).trim()) return fail("The notice body is required");
    if (String(title).trim().length > 120) return fail("Title is too long (maximum 120 characters)");
    if (String(noticeBody).length > 5000) return fail("Notice body is too long (maximum 5000 characters)");

    // ── Resolve the audience by role ──────────────────────────────────────
    let audience: { allCentres: boolean; centreCountry: string | null; centreState: string | null; teams: string[] | null };

    if (me.role === "ADMIN") {
      const wantsAllCentres = allCentres === true;
      const hasCentre = !!centreCountry && !!centreState;
      if (!wantsAllCentres && hasCentre) {
        const teamList: string[] = Array.isArray(teams) ? teams.filter((t: string) => TEAM_META[t]) : [];
        audience = { allCentres: false, centreCountry: String(centreCountry).toUpperCase(), centreState: String(centreState), teams: teamList.length ? teamList : null };
      } else {
        // Broadcast to all centres / company-wide.
        audience = { allCentres: wantsAllCentres, centreCountry: null, centreState: null, teams: null };
      }
    } else if (me.role === "SUPERVISOR") {
      if (!me.country || !me.state) throw new AuthError("Your account has no centre location — ask an administrator to set your country and state", 403);
      const teamList: string[] = Array.isArray(teams) ? teams.filter((t: string) => TEAM_META[t]) : [];
      audience = { allCentres: false, centreCountry: me.country, centreState: me.state, teams: teamList.length ? teamList : null };
    } else {
      // TEAM_LEAD — own team in own centre only.
      if (!me.country || !me.state || !me.team) throw new AuthError("Your account has no centre or team — ask an administrator to set them", 403);
      audience = { allCentres: false, centreCountry: me.country, centreState: me.state, teams: [me.team] };
    }

    const notice = await db.notice.create({
      data: {
        title: String(title).trim(),
        body: String(noticeBody).trim(),
        pinned: me.role === "ADMIN" ? pinned === true : false,
        authorId: me.id,
        authorName: me.fullName,
        authorRole: me.role,
        centreCountry: audience.centreCountry,
        centreState: audience.centreState,
        teams: audience.teams ? JSON.stringify(audience.teams) : null,
        allCentres: audience.allCentres,
      },
    });

    // Notify the audience so targeted messages actually reach inboxes.
    const recipients = await audienceUsers(me, { allCentres: audience.allCentres, centreCountry: audience.centreCountry, centreState: audience.centreState, teams: audience.teams || undefined });
    for (const r of recipients) {
      if (r.id === me.id) continue;
      await notify({
        userId: r.id,
        type: "NOTICE",
        severity: "INFO",
        title: `Notice: ${notice.title}`,
        message: `${me.fullName}: ${notice.body.slice(0, 180)}`,
        linkData: { view: "notice-board", noticeId: notice.id },
        dedupeKey: `notice:${notice.id}`,
      });
    }

    const scopeLabel = audience.allCentres ? "broadcast — all centres" : audience.centreCountry ? `${audience.centreCountry}/${audience.centreState}${audience.teams ? ` · ${audience.teams.join(", ")}` : ""}` : "company-wide";
    await audit({
      userId: me.id, actorName: me.fullName, action: "CREATE_NOTICE", entity: "Notice", entityId: notice.id,
      details: `Posted notice [${scopeLabel}]: ${notice.title}`,
    });
    return ok({ notice }, 201);
  });
}

/** Edit a notice — title, body and/or pinned flag (author or administrator). */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me: Me = await requireUser();
    const { noticeId, title, body, pinned } = await req.json();
    if (!noticeId) return fail("noticeId is required");
    const existing = await db.notice.findUnique({ where: { id: noticeId } });
    if (!existing) return fail("Notice not found", 404);
    if (me.role !== "ADMIN" && existing.authorId !== me.id) {
      throw new AuthError("You can only edit notices you posted", 403);
    }
    if (title !== undefined && !String(title).trim()) return fail("A notice title is required");
    if (body !== undefined && !String(body).trim()) return fail("The notice body is required");
    if (title !== undefined && String(title).trim().length > 120) return fail("Title is too long (maximum 120 characters)");
    if (body !== undefined && String(body).length > 5000) return fail("Notice body is too long (maximum 5000 characters)");
    const notice = await db.notice.update({
      where: { id: noticeId },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(body !== undefined ? { body: String(body).trim() } : {}),
        ...(pinned !== undefined && me.role === "ADMIN" ? { pinned: pinned === true } : {}),
      },
    });
    await audit({
      userId: me.id, actorName: me.fullName, action: "UPDATE_NOTICE", entity: "Notice", entityId: noticeId,
      details: `Updated notice: ${notice.title}`,
    });
    return ok({ notice });
  });
}

/**
 * Delete a notice (author or administrator). The deletion is absolute: it
 * disappears from every recipient's Notice Board and their inbox copies of
 * the announcement are removed automatically. Agents can never delete a
 * notice from the administration, team leads or supervisors — only the
 * author (or an administrator) can take it down.
 */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const me: Me = await requireUser();
    const { searchParams } = new URL(req.url);
    const noticeId = searchParams.get("noticeId");
    if (!noticeId) return fail("noticeId is required");
    const existing = await db.notice.findUnique({ where: { id: noticeId } });
    if (!existing) return fail("Notice not found", 404);
    if (me.role !== "ADMIN" && existing.authorId !== me.id) {
      throw new AuthError("You can only delete notices you posted — the author or an administrator removes it for everyone", 403);
    }
    await db.notification.deleteMany({ where: { linkData: { contains: noticeId } } });
    await db.notice.delete({ where: { id: noticeId } });
    await audit({
      userId: me.id, actorName: me.fullName, action: "DELETE_NOTICE", entity: "Notice", entityId: noticeId,
      details: `Deleted notice: ${existing.title} (removed for every recipient)`,
    });
    return ok({ success: true });
  });
}
