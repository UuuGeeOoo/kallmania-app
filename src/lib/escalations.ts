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

/** Roles that may be TARGETED by an escalation, per author role.
 *  Management authors can route to the management tiers of their centre;
 *  administrators additionally reach agent roles — and, being global,
 *  their role routes span ALL centres (see isGlobalRoleRoute). */
export function targetableRoles(authorRole: string): string[] {
  if (authorRole === "ADMIN") return [...MANAGEMENT_ROLES, ...AGENT_ROLES];
  if (MANAGEMENT_ROLES.includes(authorRole)) return ["TEAM_LEAD", "SUPERVISOR", "ADMIN"];
  return [];
}

/** Role-routed escalations authored by an ADMIN span every centre — the
 *  recipients are everyone occupying the target role anywhere, not just the
 *  admin's own centre. Supervisors/team leads keep centre-scoped routing. */
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

/**
 * Everyone occupying `targetRole` (APPROVED accounts) within the author's
 * reach: administrators route across ALL centres (the whole point of role
 * escalation for admins); other management route within their own centre
 * (a centre-less author degrades to all centres, mirroring recipientsFor).
 * Returns [] when the role has no active occupants — callers turn that into
 * a clear error instead of creating an escalation nobody could act on.
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

export interface RoleTargetOption {
  role: string;
  label: string;
  scopeLabel: string;
  count: number;
}

/**
 * Role-targeting options for the composer, resolved LIVE (never hardcoded):
 * every targetable role that currently has at least one active occupant,
 * with a human count. Admins see all-centre reach across management AND
 * agent roles; supervisors/team leads see their centre's management tiers.
 */
export async function roleTargetOptions(me: MeLike): Promise<RoleTargetOption[]> {
  const roles = targetableRoles(me.role);
  if (roles.length === 0) return [];
  const global = me.role === "ADMIN" || !(me.country && me.state);
  const centreWhere = global ? {} : { country: me.country, state: me.state };
  // Centre-scoped counting for the leadership tiers…
  const groups = await db.user.groupBy({
    by: ["role"],
    where: { role: { in: roles.filter((r) => r !== "ADMIN") }, status: "APPROVED", ...centreWhere },
    _count: { _all: true },
  });
  const counts = new Map(groups.map((g) => [g.role, g._count._all]));
  // …while administrators are global regardless of the requester's centre.
  if (roles.includes("ADMIN")) {
    counts.set("ADMIN", await db.user.count({ where: { role: "ADMIN", status: "APPROVED" } }));
  }
  return roles
    .filter((r) => (counts.get(r) ?? 0) > 0)
    .map((r) => ({
      role: r,
      label: ROLE_LABELS[r] ?? r,
      scopeLabel: r === "ADMIN" || global ? "all centres" : "your centre",
      count: counts.get(r) ?? 0,
    }));
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrators",
  SUPERVISOR: "Supervisors",
  TEAM_LEAD: "Team Leads",
  AGENT_BPO: "Call Centre Agents",
  DEVELOPER: "Web & Technical Team",
  SOCIAL_MEDIA: "Social Media Team",
};

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
