import { db } from "@/lib/db";

/**
 * Shared escalation domain logic — visibility, permissions, threading and
 * named-recipient resolution. Used by /api/escalations, /api/escalations/[id]
 * and /api/escalations/recipients so every route enforces the SAME rules.
 *
 * Lifecycle: OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
 * with REOPENED returning a resolved/closed escalation to the handler.
 * Acknowledgement never implies resolution — resolving REQUIRES a note.
 */

export const ESCALATION_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REOPENED", "CLOSED"] as const;

const MANAGEMENT_ROLES = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"];
const AGENT_ROLES = ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"];

/** Role-routed LEGACY rows authored by an ADMIN span every centre — the
 *  recipients were everyone occupying the target role anywhere, not just the
 *  admin's own centre. Supervisors/team leads kept centre-scoped routing.
 *  Role routing is no longer creatable; this exists only so historical rows
 *  keep rendering and notifying correctly. */
export function isGlobalRoleRoute(esc: { targetType: string; fromRole: string }): boolean {
  return esc.targetType === "TARGET_ROLE" && esc.fromRole === "ADMIN";
}

/** Minimal shape needed for permission checks (escalation + author centre). */
export interface EscalationLike {
  id: string;
  fromId: string;
  fromRole: string;
  targetType: string;
  targetRole: string | null;
  targetUserId: string | null;
  ackById?: string | null;
  centreCountry?: string | null;
  centreState?: string | null;
  team?: string | null;
  from?: { country: string | null; state: string | null; team: string | null } | null;
}

interface MeLike {
  id: string;
  role: string;
  country: string | null;
  state: string | null;
  team: string | null;
}

/** Author's centre — prefers the snapshot taken at creation, falls back to the author's current centre (legacy rows). */
function authorCentre(esc: EscalationLike): { country: string | null; state: string | null; team: string | null } {
  if (esc.centreCountry) return { country: esc.centreCountry, state: esc.centreState ?? null, team: esc.team ?? null };
  return { country: esc.from?.country ?? null, state: esc.from?.state ?? null, team: esc.from?.team ?? null };
}

function sameCentre(me: MeLike, centre: { country: string | null; state: string | null }): boolean {
  return !!(me.country && me.state && centre.country === me.country && centre.state === me.state);
}

/**
 * Can `me` SEE this escalation? Mirrors the role-aware feed rules:
 *  - ADMIN: everything
 *  - everyone: own sent + directly targeted at them (+ handler once acked... handler
 *    is derived from targetUserId/ack which are already covered)
 *  - SUPERVISOR: role-routed SUPERVISOR, ALL_MANAGEMENT, and anything authored
 *    by team leads or agents of their centre
 *  - TEAM_LEAD: role-routed TEAM_LEAD (centre-scoped, or global when the
 *    route came from an administrator) and escalations authored by members
 *    of their own team
 *  - agents: own sent + directly targeted + role-routed to their own role
 *    (admin-authored routes are global; centre-scoped ones need same centre)
 */
export function canSeeEscalation(me: MeLike, esc: EscalationLike): boolean {
  if (me.role === "ADMIN") return true;
  if (esc.fromId === me.id || esc.targetUserId === me.id) return true;
  const from = authorCentre(esc);
  const globalRoute = isGlobalRoleRoute(esc);
  if (me.role === "SUPERVISOR") {
    if ((esc.targetType === "TARGET_ROLE" && esc.targetRole === "SUPERVISOR") || esc.targetType === "ALL_MANAGEMENT") return true;
    if (["TEAM_LEAD", ...AGENT_ROLES].includes(esc.fromRole) && sameCentre(me, from)) return true;
    return false;
  }
  if (me.role === "TEAM_LEAD") {
    if (esc.targetType === "TARGET_ROLE" && esc.targetRole === "TEAM_LEAD" && (globalRoute || sameCentre(me, from))) return true;
    if (AGENT_ROLES.includes(esc.fromRole) && sameCentre(me, from) && (from.team ?? null) === (me.team ?? null)) return true;
    return false;
  }
  // Agents: an escalation routed to THEIR role is addressed to them.
  if (esc.targetType === "TARGET_ROLE" && esc.targetRole === me.role) {
    return globalRoute || sameCentre(me, from);
  }
  return false;
}

/**
 * Can `me` post into the thread? Only the conversation participants:
 * the author, the assigned recipient, the acting handler, or an administrator.
 * Role-routed bystanders can read (and acknowledge to take ownership) but not inject.
 */
export function canPostMessage(me: MeLike, esc: EscalationLike): boolean {
  if (esc.fromId === me.id || esc.targetUserId === me.id) return true;
  if (esc.ackById && esc.ackById === me.id) return true;
  if (me.role === "ADMIN") return true;
  return false;
}

/**
 * Can `me` drive the status lifecycle (ack / in progress / resolve / close /
 * reassign / priority)? Scoped fixes the legacy hole where ANY supervisor could
 * resolve ANY visible escalation: only the assigned recipient, the current
 * handler, a matching role within the author's centre, or an administrator.
 */
export function canManageStatus(me: MeLike, esc: EscalationLike): boolean {
  if (me.role === "ADMIN") return true;
  if (esc.targetUserId === me.id) return true;
  if (esc.ackById && esc.ackById === me.id) return true;
  const from = authorCentre(esc);
  if (esc.targetType === "TARGET_ROLE" && esc.targetRole === me.role) {
    // Admin-authored role routes span all centres — any occupant of the role
    // may take ownership; centre-scoped routes stay centre-limited.
    if (isGlobalRoleRoute(esc)) return true;
    if (!sameCentre(me, from)) return false;
    // Centre-scoped team-lead routes additionally must match the author's team.
    if (me.role === "TEAM_LEAD" && (from.team ?? null) !== (me.team ?? null)) return false;
    return true;
  }
  if (esc.targetType === "ALL_MANAGEMENT" && me.role === "SUPERVISOR" && sameCentre(me, from)) return true;
  return false;
}

/** Can `me` reopen a resolved/closed escalation? Author always; management who can see it; admins. */
export function canReopen(me: MeLike, esc: EscalationLike): boolean {
  if (esc.fromId === me.id) return true;
  if (me.role === "ADMIN") return true;
  return canSeeEscalation(me, esc) && ["TEAM_LEAD", "SUPERVISOR"].includes(me.role);
}

/** One pickable person in the escalation composer — carries the centre
 *  (country/state) so cross-centre leaders can be shown WITH their centre. */
export interface EscalationPerson {
  id: string;
  fullName: string;
  role: string;
  team: string | null;
  country: string | null;
  state: string | null;
}

/**
 * Named escalation recipients for the composer, resolved LIVE from user
 * records (never hardcoded): the requester's team lead, every eligible
 * supervisor of their centre (multi-supervisor centres supported), and all
 * eligible administrators. Inactive / unauthorized users never appear.
 *
 * ADMIN authors are the exception: their escalation view lists the leaders
 * of EVERY centre — all team leads (`teamLeads`) and every supervisor, each
 * carrying their centre so cross-centre names are identifiable. Everyone
 * else stays strictly within their own centre.
 */
export async function namedRecipients(me: MeLike): Promise<{
  teamLead: EscalationPerson | null;
  teamLeads: EscalationPerson[];
  supervisors: EscalationPerson[];
  admins: EscalationPerson[];
}> {
  const select = { id: true, fullName: true, role: true, team: true, country: true, state: true } as const;
  const centreWhere = me.country && me.state ? { country: me.country, state: me.state } : {};
  const isAdmin = me.role === "ADMIN";

  // Administrators reach the leadership of ALL centres; every other author
  // is scoped to their own centre only.
  const teamLeads = isAdmin
    ? await db.user.findMany({ where: { role: "TEAM_LEAD", status: "APPROVED" }, select, orderBy: { fullName: "asc" } })
    : [];

  let teamLead: EscalationPerson | null = null;
  if (!isAdmin) {
    teamLead = me.team
      ? await db.user.findFirst({ where: { role: "TEAM_LEAD", status: "APPROVED", ...centreWhere, team: me.team }, select })
      : null;
    if (!teamLead) {
      // Fall back to any team lead of the requester's centre (agent without team match).
      teamLead = await db.user.findFirst({ where: { role: "TEAM_LEAD", status: "APPROVED", ...centreWhere }, select });
    }
    if (!teamLead && me.country && me.state === null) {
      teamLead = await db.user.findFirst({ where: { role: "TEAM_LEAD", status: "APPROVED", country: me.country }, select });
    }
  }

  const supervisors = await db.user.findMany({
    where: { role: "SUPERVISOR", status: "APPROVED", ...(isAdmin ? {} : centreWhere) },
    select,
    orderBy: { fullName: "asc" },
  });
  const admins = await db.user.findMany({
    where: { role: "ADMIN", status: "APPROVED" },
    select,
    orderBy: { fullName: "asc" },
  });

  return { teamLead, teamLeads, supervisors, admins };
}

/**
 * Everyone occupying `targetRole` (APPROVED accounts) within the author's
 * reach. LEGACY SUPPORT ONLY — role-routed escalations can no longer be
 * created, but historical rows still resolve their participants through
 * here so pre-existing threads keep notifying the right people.
 * Returns [] when the role has no active occupants.
 */
export async function roleRecipients(
  author: MeLike,
  targetRole: string
): Promise<{ id: string; fullName: string; role: string }[]> {
  // Admins are centre-hopping by design (namedRecipients lists them globally),
  // so routing to the ADMIN role always reaches every administrator.
  const global = author.role === "ADMIN" || !(author.country && author.state) || targetRole === "ADMIN";
  const centreWhere = global ? {} : { country: author.country, state: author.state };
  return db.user.findMany({
    where: { role: targetRole, status: "APPROVED", ...centreWhere },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });
}

/** Is `candidateId` an eligible named recipient for `me` (used to validate composer submissions server-side)?
 *  For administrators this spans every centre's leaders (teamLeads + all supervisors + admins);
 *  for everyone else it is strictly their own centre's leadership. */
export async function isEligibleRecipient(me: MeLike, candidateId: string): Promise<EscalationPerson | null> {
  const groups = await namedRecipients(me);
  const all = [groups.teamLead, ...groups.teamLeads, ...groups.supervisors, ...groups.admins].filter(Boolean) as EscalationPerson[];
  return all.find((u) => u.id === candidateId) || null;
}

/** Append an immutable activity-timeline event. */
export async function addEvent(
  escalationId: string,
  action: string,
  actor: { id?: string | null; fullName: string; role?: string | null },
  details?: string | null
): Promise<void> {
  await db.escalationEvent.create({
    data: {
      escalationId,
      action,
      actorId: actor.id ?? null,
      actorName: actor.fullName,
      actorRole: actor.role ?? null,
      details: details ?? null,
    },
  });
}

/**
 * Seed the conversation thread for escalations that predate threading:
 * the original `message` becomes the first EscalationMessage and a CREATED
 * event records the origin. Idempotent — skips anything that already has
 * messages, so the migration script and lazy GET detail can both call it.
 */
export async function ensureThread(escalationId: string): Promise<void> {
  const esc = await db.escalation.findUnique({
    where: { id: escalationId },
    include: { _count: { select: { messages: true } } },
  });
  if (!esc || esc._count.messages > 0) return;
  await db.$transaction([
    db.escalationMessage.create({
      data: {
        escalationId: esc.id,
        senderId: esc.fromId,
        senderName: esc.fromName,
        senderRole: esc.fromRole,
        body: esc.message,
      },
    }),
    db.escalationEvent.create({
      data: {
        escalationId: esc.id,
        action: "CREATED",
        actorId: esc.fromId,
        actorName: esc.fromName,
        actorRole: esc.fromRole,
        details: esc.subject,
      },
    }),
    db.escalation.update({
      where: { id: esc.id },
      data: { lastMessageAt: esc.createdAt, lastMessageSenderId: esc.fromId },
    }),
  ]);
}

/** Record that `userId` has read the thread up to now (drives unread badges). */
export async function markThreadRead(escalationId: string, userId: string): Promise<void> {
  const now = new Date();
  const existing = await db.escalationRead.findUnique({ where: { escalationId_userId: { escalationId, userId } } });
  if (existing) {
    if (existing.lastReadAt < now) await db.escalationRead.update({ where: { id: existing.id }, data: { lastReadAt: now } });
  } else {
    await db.escalationRead.create({ data: { escalationId, userId, lastReadAt: now } });
  }
}

/**
 * Users who should hear about activity on this escalation, EXCLUDING the actor:
 * the author, the assigned recipient, and the current handler. For role-routed
 * escalations without a named recipient/handler, falls back to the eligible
 * role recipients (centre-scoped) — admins always included for broadcasts.
 */
export async function participantsToNotify(esc: EscalationLike & { severity?: string }): Promise<string[]> {
  const ids = new Set<string>();
  if (esc.fromId) ids.add(esc.fromId);
  if (esc.targetUserId) ids.add(esc.targetUserId);
  if (esc.ackById) ids.add(esc.ackById);
  if (ids.size <= 1 && esc.targetType === "TARGET_ROLE" && esc.targetRole) {
    // Role-routed escalation with no assigned handler yet: the whole role is
    // the conversation's other side, so author messages reach every occupant.
    // (Once someone acknowledges, ids contains the handler and notifications
    // narrow back to the author ↔ handler pair.)
    const author: MeLike = {
      id: esc.fromId,
      role: esc.fromRole,
      country: esc.centreCountry ?? esc.from?.country ?? null,
      state: esc.centreState ?? esc.from?.state ?? null,
      team: esc.team ?? esc.from?.team ?? null,
    };
    const occupants = await roleRecipients(author, esc.targetRole);
    occupants.forEach((u) => ids.add(u.id));
  }
  if (ids.size === 0) {
    // Legacy role-routed row with no named participant: resolve role recipients.
    const centreWhere = esc.centreCountry ? { country: esc.centreCountry, state: esc.centreState ?? undefined } : {};
    if (esc.targetType === "TARGET_ROLE" && esc.targetRole) {
      const users = await db.user.findMany({ where: { role: esc.targetRole, status: "APPROVED", ...centreWhere }, select: { id: true } });
      users.forEach((u) => ids.add(u.id));
      if (esc.targetRole !== "ADMIN") {
        const admins = await db.user.findMany({ where: { role: "ADMIN", status: "APPROVED" }, select: { id: true } });
        admins.forEach((u) => ids.add(u.id));
      }
    } else if (esc.targetType === "ALL_MANAGEMENT") {
      const users = await db.user.findMany({ where: { role: { in: MANAGEMENT_ROLES }, status: "APPROVED" }, select: { id: true } });
      users.forEach((u) => ids.add(u.id));
    }
  }
  return [...ids];
}
