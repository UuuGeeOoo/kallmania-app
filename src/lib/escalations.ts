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
 *  - TEAM_LEAD: role-routed TEAM_LEAD (centre-scoped) and escalations authored
 *    by members of their own team
 *  - agents: only own sent + directly targeted
 */
export function canSeeEscalation(me: MeLike, esc: EscalationLike): boolean {
  if (me.role === "ADMIN") return true;
  if (esc.fromId === me.id || esc.targetUserId === me.id) return true;
  const from = authorCentre(esc);
  if (me.role === "SUPERVISOR") {
    if ((esc.targetType === "TARGET_ROLE" && esc.targetRole === "SUPERVISOR") || esc.targetType === "ALL_MANAGEMENT") return true;
    if (["TEAM_LEAD", ...AGENT_ROLES].includes(esc.fromRole) && sameCentre(me, from)) return true;
    return false;
  }
  if (me.role === "TEAM_LEAD") {
    if (esc.targetType === "TARGET_ROLE" && esc.targetRole === "TEAM_LEAD" && sameCentre(me, from)) return true;
    if (AGENT_ROLES.includes(esc.fromRole) && sameCentre(me, from) && (from.team ?? null) === (me.team ?? null)) return true;
    return false;
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
  if (esc.targetType === "TARGET_ROLE" && esc.targetRole === me.role && sameCentre(me, from)) {
    // Team leads additionally must match the author's team.
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

/**
 * Named escalation recipients for the composer, resolved LIVE from user
 * records (never hardcoded): the requester's team lead, every eligible
 * supervisor of their centre (multi-supervisor centres supported), and all
 * eligible administrators. Inactive / unauthorized users never appear.
 */
export async function namedRecipients(me: MeLike): Promise<{
  teamLead: { id: string; fullName: string; role: string; team: string | null } | null;
  supervisors: { id: string; fullName: string; role: string; team: string | null }[];
  admins: { id: string; fullName: string; role: string; team: string | null }[];
}> {
  const select = { id: true, fullName: true, role: true, team: true } as const;
  const centreWhere = me.country && me.state ? { country: me.country, state: me.state } : {};

  let teamLead = me.team
    ? await db.user.findFirst({ where: { role: "TEAM_LEAD", status: "APPROVED", ...centreWhere, team: me.team }, select })
    : null;
  if (!teamLead) {
    // Fall back to any team lead of the requester's centre (agent without team match).
    teamLead = await db.user.findFirst({ where: { role: "TEAM_LEAD", status: "APPROVED", ...centreWhere }, select });
  }
  if (!teamLead && me.country && me.state === null) {
    teamLead = await db.user.findFirst({ where: { role: "TEAM_LEAD", status: "APPROVED", country: me.country }, select });
  }

  const supervisors = await db.user.findMany({
    where: { role: "SUPERVISOR", status: "APPROVED", ...centreWhere },
    select,
    orderBy: { fullName: "asc" },
  });
  const admins = await db.user.findMany({
    where: { role: "ADMIN", status: "APPROVED" },
    select,
    orderBy: { fullName: "asc" },
  });

  return { teamLead, supervisors, admins };
}

/** Is `candidateId` an eligible named recipient for `me` (used to validate composer submissions server-side)? */
export async function isEligibleRecipient(me: MeLike, candidateId: string): Promise<{ id: string; fullName: string; role: string } | null> {
  const groups = await namedRecipients(me);
  const all = [groups.teamLead, ...groups.supervisors, ...groups.admins].filter(Boolean) as { id: string; fullName: string; role: string }[];
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
