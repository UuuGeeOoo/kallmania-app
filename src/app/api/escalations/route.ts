import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { notify, audit } from "@/lib/notify";

/**
 * Notify / escalate bar.
 *
 * GET  /api/escalations          — role-aware escalation feed
 * POST /api/escalations          — staff escalate to TEAM_LEAD / SUPERVISOR / ADMIN
 *                                  (admins always see everything); management can
 *                                  notify any agent of their choice.
 * PATCH /api/escalations         — acknowledge / resolve (management)
 */

const MANAGEMENT_ROLES = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"];

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
      const or: Record<string, unknown>[] = [{ fromId: me.id }, { targetUserId: me.id }];
      if (me.role === "SUPERVISOR") {
        or.push({ targetRole: { in: ["SUPERVISOR", "ADMIN"] } });
        or.push({ targetType: "ALL_MANAGEMENT" });
        if (me.country && me.state) or.push({ from: { country: me.country, state: me.state }, targetType: { in: ["TARGET_ROLE", "ALL_MANAGEMENT"] } });
      } else if (me.role === "TEAM_LEAD") {
        or.push({ targetRole: "TEAM_LEAD" });
        if (me.country && me.state) or.push({ from: { country: me.country, state: me.state }, targetType: { in: ["TARGET_ROLE", "ALL_MANAGEMENT"] } });
      }
      where = { OR: or };
    }
    if (status) where.status = status;

    const escalations = await db.escalation.findMany({
      where,
      include: {
        from: { select: { id: true, fullName: true, role: true, country: true, state: true } },
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
