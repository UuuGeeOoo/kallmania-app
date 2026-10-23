import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { notify, audit } from "@/lib/notify";

/**
 * Notify / escalate bar.
 *
 * GET    /api/escalations   — role-aware escalation feed (privacy-filtered)
 * POST   /api/escalations   — staff escalate to TEAM_LEAD / SUPERVISOR / ADMIN;
 *                             management can notify any agent of their choice.
 * PATCH  /api/escalations   — acknowledge / resolve (management)
 * DELETE /api/escalations   — administrator removes escalations of ANY status
 *                             (single ?id= or bulk { ids: [...] }), cascading
 *                             to their inbox notification copies
 *
 * Visibility rules (who sees what in the feed):
 *  - ADMIN: everything.
 *  - SUPERVISOR: own sent + targeted at them + role-routed to SUPERVISOR +
 *    ALL_MANAGEMENT + anything sent by team leads (their centre) + anything
 *    sent by agents (their centre). NOT what others routed to ADMIN only.
 *  - TEAM_LEAD: own sent + targeted at them + role-routed to TEAM_LEAD +
 *    escalations sent by their own team members. NOT agent→supervisor/admin
 *    escalations of other teams, NOT management→agent notices of others.
 *  - Agents: only what they sent and what was sent directly to them.
 */

const MANAGEMENT_ROLES = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"];
const AGENT_ROLES = ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"];

/** Users allowed to see an escalation authored by `from` when routed to their role. */
async function recipientsFor(from: { id: string; country: string | null; state: string | null; role: string }, targetType: string, targetRole: string | null): Promise<{ id: string; fullName: string }[]> {
  const centreWhere = from.country && from.state ? { country: from.country, state: from.state } : {};
  if (targetType === "TARGET_USER") return [];
  if (targetType === "ALL_MANAGEMENT") {
    const users = await db.user.findMany({
      where: { status: "APPROVED", role: { in: MANAGEMENT_ROLES }, ...centreWhere },
      select: { id: true, fullName: true },
    });
    // Always make sure admins hear it even if they sit outside the centre.
    const admins = await db.user.findMany({ where: { status: "APPROVED", role: "ADMIN" }, select: { id: true, fullName: true } });
    const map = new Map<string, { id: string; fullName: string }>();
    for (const u of [...users, ...admins]) map.set(u.id, u);
    return [...map.values()];
  }
  // TARGET_ROLE
  const role = targetRole || "SUPERVISOR";
  const users = await db.user.findMany({
    where: { status: "APPROVED", role, ...centreWhere },
    select: { id: true, fullName: true },
  });
  if (role !== "ADMIN") {
    // The administrator sees every notice too.
    const admins = await db.user.findMany({ where: { status: "APPROVED", role: "ADMIN" }, select: { id: true, fullName: true } });
    const map = new Map<string, { id: string; fullName: string }>();
    for (const u of [...users, ...admins]) map.set(u.id, u);
    return [...map.values()];
  }
  return users;
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let where: Record<string, unknown> = {};
    if (me.role === "ADMIN") {
      where = {}; // administrators see every notice in every centre
    } else {
      const centre = me.country && me.state ? { country: me.country, state: me.state } : null;
      const or: Record<string, unknown>[] = [{ fromId: me.id }, { targetUserId: me.id }];

      if (me.role === "SUPERVISOR") {
        // Routed to the supervisor's role or broadcast to management.
        or.push({ targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
        or.push({ targetType: "ALL_MANAGEMENT" });
        // Everything team leads send (supervisors oversee their leads)…
        or.push({ fromRole: "TEAM_LEAD", ...(centre ? { from: centre } : {}) });
        // …and everything agents send (agent notices are for supervisor + admin).
        or.push({ fromRole: { in: AGENT_ROLES }, ...(centre ? { from: centre } : {}) });
      } else if (me.role === "TEAM_LEAD") {
        // Routed to team leads (centre-scoped when the lead has a centre).
        or.push({ targetType: "TARGET_ROLE", targetRole: "TEAM_LEAD", ...(centre ? { from: centre } : {}) });
        // A lead only sees escalations sent by members of their own team —
        // agent→supervisor/admin escalations of other teams stay private.
        or.push({
          fromRole: { in: AGENT_ROLES },
          ...(centre ? { from: { country: me.country, state: me.state, team: me.team } } : {}),
        });
      }
      // Agents: nothing beyond own sent + directly targeted (already in `or`).

      where = { OR: or };
    }
    if (status) where.status = status;

    const escalations = await db.escalation.findMany({
      where,
      include: {
        from: { select: { id: true, fullName: true, role: true, country: true, state: true, team: true } },
        targetUser: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    });
    return ok({ escalations });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { subject, message, severity, targetType, targetRole, targetUserId } = body;
    if (!subject || !message) return fail("Subject and message are required");

    const type = targetType || (isSupervisorLike(me) || me.role === "TEAM_LEAD" ? "TARGET_USER" : "TARGET_ROLE");
    if (!["TARGET_ROLE", "TARGET_USER", "ALL_MANAGEMENT"].includes(type)) return fail("Invalid targetType");

    let targetUser: { id: string; fullName: string } | null = null;
    if (type === "TARGET_USER") {
      // Management notifying an agent of their choice.
      if (!MANAGEMENT_ROLES.includes(me.role)) return fail("Not authorized to send direct notices", 403);
      if (!targetUserId) return fail("Choose the person to notify");
      const target = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true, fullName: true, role: true, country: true, state: true } });
      if (!target) return fail("Target user not found", 404);
      if (me.role === "TEAM_LEAD" || me.role === "SUPERVISOR") {
        const sameCentre = me.country && me.state && target.country === me.country && target.state === me.state;
        if (!sameCentre) return fail("You can only notify people in your own centre", 403);
      }
      targetUser = target;
    }

    if (type === "TARGET_ROLE" && targetRole && !["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(targetRole)) {
      return fail("Invalid target role");
    }

    const escalation = await db.escalation.create({
      data: {
        fromId: me.id,
        fromName: me.fullName,
        fromRole: me.role,
        targetType: type,
        targetRole: type === "TARGET_ROLE" ? targetRole || "SUPERVISOR" : null,
        targetUserId: targetUser?.id || null,
        targetName: targetUser?.fullName || null,
        subject: String(subject).trim(),
        message: String(message).trim(),
        severity: severity === "URGENT" ? "URGENT" : "NORMAL",
      },
      include: { from: { select: { id: true, fullName: true, role: true } }, targetUser: { select: { id: true, fullName: true, role: true } } },
    });

    // Route notifications to the recipients (role-routed, centre-scoped).
    const recipients = type === "TARGET_USER" && targetUser ? [targetUser] : await recipientsFor(me, type, type === "TARGET_ROLE" ? targetRole || "SUPERVISOR" : null);
    for (const r of recipients) {
      if (r.id === me.id) continue;
      await notify({
        userId: r.id,
        type: "ESCALATION",
        severity: escalation.severity === "URGENT" ? "CRITICAL" : "WARNING",
        title: `${escalation.severity === "URGENT" ? "URGENT — " : ""}${escalation.subject}`,
        message: `${me.fullName}: ${escalation.message}`.slice(0, 400),
        linkData: { view: "notifications", escalationId: escalation.id },
      });
    }

    await audit({ userId: me.id, actorName: me.fullName, action: "CREATE_ESCALATION", entity: "Escalation", entityId: escalation.id, details: `${type}${targetRole ? `:${targetRole}` : ""} — ${escalation.subject}` });
    return ok({ escalation }, 201);
  });
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { id, action, ackNote } = body;
    if (!id || !action) return fail("id and action are required");
    const escalation = await db.escalation.findUnique({ where: { id } });
    if (!escalation) return fail("Escalation not found", 404);

    const canManage = me.role === "ADMIN" || me.role === "SUPERVISOR" || (me.role === "TEAM_LEAD" && escalation.targetRole === "TEAM_LEAD");
    if (!canManage) return fail("Not authorized to manage this escalation", 403);

    if (action === "ack") {
      const updated = await db.escalation.update({
        where: { id },
        data: { status: "ACKNOWLEDGED", ackById: me.id, ackByName: me.fullName, ackNote: ackNote || null },
      });
      await notify({
        userId: escalation.fromId,
        type: "ESCALATION_ACK",
        severity: "INFO",
        title: `Your escalation was acknowledged: ${escalation.subject}`,
        message: `${me.fullName} acknowledged it${ackNote ? ` — ${ackNote}` : "."}`,
        linkData: { view: "notifications", escalationId: id },
      });
      return ok({ escalation: updated });
    }
    if (action === "resolve") {
      const updated = await db.escalation.update({
        where: { id },
        data: { status: "RESOLVED", resolvedAt: new Date(), ackById: escalation.ackById || me.id, ackByName: escalation.ackByName || me.fullName },
      });
      await notify({
        userId: escalation.fromId,
        type: "ESCALATION_RESOLVED",
        severity: "INFO",
        title: `Your escalation was resolved: ${escalation.subject}`,
        message: `${me.fullName} marked it resolved.`,
        linkData: { view: "notifications", escalationId: id },
      });
      await audit({ userId: me.id, actorName: me.fullName, action: "RESOLVE_ESCALATION", entity: "Escalation", entityId: id });
      return ok({ escalation: updated });
    }
    return fail("Unknown action");
  });
}

/**
 * Administrator housekeeping: remove escalations — any status (OPEN included).
 * Supports a single ?id= or a JSON body { ids: [...] } for bulk removal.
 * Every removal cascades to the inbox notifications pointing at the escalation.
 */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (me.role !== "ADMIN") throw new AuthError("Only administrators can delete escalations", 403);
    const { searchParams } = new URL(req.url);
    let ids: string[] = [];
    const idParam = searchParams.get("id");
    if (idParam) ids = [idParam];
    else {
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) ids = body.ids.map(String);
      } catch { /* no body */ }
    }
    ids = ids.filter(Boolean).slice(0, 200);
    if (ids.length === 0) return fail("id (or ids) is required");

    let deleted = 0;
    for (const id of ids) {
      const escalation = await db.escalation.findUnique({ where: { id } });
      if (!escalation) continue;
      // Cascade: drop the inbox notifications that point at this escalation.
      await db.notification.deleteMany({ where: { linkData: { contains: escalation.id } } });
      await db.escalation.delete({ where: { id } });
      deleted++;
      await audit({
        userId: me.id, actorName: me.fullName, action: "DELETE_ESCALATION", entity: "Escalation", entityId: id,
        details: `${escalation.status} — ${escalation.subject} (from ${escalation.fromName})`,
      });
    }
    if (deleted === 0) return fail("Escalation not found", 404);
    return ok({ success: true, deleted });
  });
}
