import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { notify, audit } from "@/lib/notify";
import {
  canManageStatus,
  canReopen,
  canSeeEscalation,
  addEvent,
  isEligibleRecipient,
  participantsToNotify,
} from "@/lib/escalations";

/**
 * Notify / escalate — tracked issues with persistent conversation threads.
 *
 * GET    /api/escalations                — role-aware escalation feed (privacy-filtered,
 *                                          filters: status, severity, mine, assigned, q,
 *                                          centre/team for admins) + per-item unread badges
 * POST   /api/escalations                — raise an escalation to a NAMED team lead /
 *                                          supervisor / administrator (validated against
 *                                          the requester's scope — admins may pick the
 *                                          leaders of ANY centre) or notify a person
 *                                          directly; creates the thread's first message
 *                                          + CREATED event and notifies the recipient.
 *                                          (Role-based routing is removed — legacy
 *                                          TARGET_ROLE rows still render.)
 * PATCH  /api/escalations                — lifecycle transitions on one escalation:
 *                                          ack | in_progress | resolve (note REQUIRED) |
 *                                          close | reopen | assign (admin) | priority;
 *                                          every transition is event-logged, audited and
 *                                          notifies the counterpart
 * DELETE /api/escalations                — administrator removes escalations of ANY status
 *                                          (single ?id= or bulk { ids: [...] }), cascading
 *                                          to thread, timeline, read-state and inbox copies
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

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const mine = searchParams.get("mine") === "1";
    const assigned = searchParams.get("assigned") === "1";
    const q = (searchParams.get("q") || "").trim();
    const centre = searchParams.get("centre");
    const team = searchParams.get("team");

    let where: Record<string, unknown> = {};
    if (me.role === "ADMIN") {
      where = {}; // administrators see every notice in every centre
    } else {
      const myCentre = me.country && me.state ? { country: me.country, state: me.state } : null;
      const or: Record<string, unknown>[] = [{ fromId: me.id }, { targetUserId: me.id }];

      if (me.role === "SUPERVISOR") {
        // Routed to the supervisor's role or broadcast to management.
        or.push({ targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
        or.push({ targetType: "ALL_MANAGEMENT" });
        // Everything team leads send (supervisors oversee their leads)…
        or.push({ fromRole: "TEAM_LEAD", ...(myCentre ? { from: myCentre } : {}) });
        // …and everything agents send (agent notices are for supervisor + admin).
        or.push({ fromRole: { in: AGENT_ROLES }, ...(myCentre ? { from: myCentre } : {}) });
      } else if (me.role === "TEAM_LEAD") {
        // Routed to team leads: centre-scoped when the lead has a centre, and
        // admin-authored role routes (which span every centre) always show up.
        or.push({
          targetType: "TARGET_ROLE",
          targetRole: "TEAM_LEAD",
          ...(myCentre ? { OR: [{ fromRole: "ADMIN" }, { from: myCentre }] } : {}),
        });
        // A lead only sees escalations sent by members of their own team —
        // agent→supervisor/admin escalations of other teams stay private.
        or.push({
          fromRole: { in: AGENT_ROLES },
          ...(myCentre ? { from: { country: me.country, state: me.state, team: me.team } } : {}),
        });
      } else {
        // Agents: own sent + directly targeted + role-routed to their own role
        // (only administrators can target agent roles, and their routes are global).
        or.push({ targetType: "TARGET_ROLE", targetRole: me.role, fromRole: "ADMIN" });
      }

      where = { OR: or };
    }
    if (mine) where.fromId = me.id;
    if (assigned) where.OR = [...((where.OR as Record<string, unknown>[]) || []), { targetUserId: me.id }, { ackById: me.id }];
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (q) where.OR = [...((where.OR as Record<string, unknown>[]) || []), { subject: { contains: q, mode: "insensitive" as const } }];
    if (me.role === "ADMIN") {
      if (centre) {
        const [c, s] = centre.split("|");
        where.OR = [...((where.OR as Record<string, unknown>[]) || []), { centreCountry: c, centreState: s || null }, { from: { country: c, state: s || null } }];
      }
      if (team) where.OR = [...((where.OR as Record<string, unknown>[]) || []), { team }, { from: { team } }];
    }

    const escalations = await db.escalation.findMany({
      where,
      include: {
        from: { select: { id: true, fullName: true, role: true, country: true, state: true, team: true } },
        targetUser: { select: { id: true, fullName: true, role: true } },
        _count: { select: { messages: true, events: true } },
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 150,
    });

    // Per-item unread badges: last thread message newer than my read cursor and not mine.
    const ids = escalations.map((e) => e.id);
    const reads = await db.escalationRead.findMany({ where: { userId: me.id, escalationId: { in: ids } }, select: { escalationId: true, lastReadAt: true } });
    const readMap = new Map(reads.map((r) => [r.escalationId, r.lastReadAt.getTime()]));
    let unread = 0;
    const items = escalations.map((e) => {
      const lastRead = readMap.get(e.id) ?? 0;
      const hasUnread = !!(e.lastMessageAt && e.lastMessageAt.getTime() > lastRead && e.lastMessageSenderId && e.lastMessageSenderId !== me.id);
      if (hasUnread) unread++;
      return { ...e, unread: hasUnread };
    });

    return ok({ escalations: items, unread });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { subject, message, severity, recipientId, targetType, targetUserId } = body;
    if (!subject || !message) return fail("Subject and message are required");

    let type: string;
    let targetUser: { id: string; fullName: string; role: string } | null = null;

    if (recipientId) {
      // NAMED recipient — validated live against the requester's scope
      // (their team lead, their centre's supervisors, or any administrator;
      // administrators may pick the leaders of EVERY centre).
      const eligible = await isEligibleRecipient(me, String(recipientId));
      if (!eligible) return fail("The selected recipient is not an eligible team lead, supervisor or administrator for you", 403);
      type = "TARGET_USER";
      targetUser = eligible;
    } else {
      // Management notifying a person of their choice directly.
      type = targetType || (MANAGEMENT_ROLES.includes(me.role) ? "TARGET_USER" : "");
      if (type === "TARGET_ROLE" || type === "ALL_MANAGEMENT" || !type) {
        return fail("Role-based escalation routing has been removed — pick the person who should handle this", 400);
      }
      if (type !== "TARGET_USER") return fail("Invalid targetType");
      // Management notifying an agent (or anyone) of their choice.
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

    const severityValue = severity === "URGENT" ? "URGENT" : "NORMAL";
    const now = new Date();

    // Escalation + first thread message + CREATED event land atomically.
    const escalation = await db.$transaction(async (tx) => {
      const created = await tx.escalation.create({
        data: {
          fromId: me.id,
          fromName: me.fullName,
          fromRole: me.role,
          targetType: type,
          targetRole: targetUser?.role ?? null,
          targetUserId: targetUser?.id || null,
          targetName: targetUser?.fullName || null,
          subject: String(subject).trim(),
          message: String(message).trim(),
          severity: severityValue,
          centreCountry: me.country,
          centreState: me.state,
          team: me.team,
          lastMessageAt: now,
          lastMessageSenderId: me.id,
        },
      });
      await tx.escalationMessage.create({
        data: {
          escalationId: created.id,
          senderId: me.id,
          senderName: me.fullName,
          senderRole: me.role,
          body: String(message).trim(),
        },
      });
      await tx.escalationEvent.create({
        data: {
          escalationId: created.id,
          action: "CREATED",
          actorId: me.id,
          actorName: me.fullName,
          actorRole: me.role,
          details: created.subject,
        },
      });
      // The author has obviously read their own opening message.
      await tx.escalationRead.create({ data: { escalationId: created.id, userId: me.id, lastReadAt: now } });
      return created;
    });

    // Notify the named recipient (the author is skipped implicitly — you
    // cannot pick yourself from the composer).
    const recipients = targetUser ? [targetUser] : [];
    for (const r of recipients) {
      if (r.id === me.id) continue;
      await notify({
        userId: r.id,
        type: "ESCALATION",
        severity: escalation.severity === "URGENT" ? "CRITICAL" : "WARNING",
        title: `${escalation.severity === "URGENT" ? "URGENT — " : ""}${escalation.subject}`,
        message: `${me.fullName}: ${escalation.message}`.slice(0, 400),
        linkData: { view: "escalations", id: escalation.id },
        dedupeKey: `esc-created:${escalation.id}`,
      });
    }

    await audit({ userId: me.id, actorName: me.fullName, action: "CREATE_ESCALATION", entity: "Escalation", entityId: escalation.id, details: `${type}${targetUser ? `:${targetUser.fullName}` : ""} — ${escalation.subject}` });
    return ok({ escalation: { ...escalation, unread: false, _count: { messages: 1, events: 1 } } }, 201);
  });
}

const TRANSITIONS: Record<string, { from: string[]; to: string; requiresNote?: boolean; event: string }> = {
  ack: { from: ["OPEN", "REOPENED"], to: "ACKNOWLEDGED", event: "ACKNOWLEDGED" },
  in_progress: { from: ["OPEN", "REOPENED", "ACKNOWLEDGED"], to: "IN_PROGRESS", event: "IN_PROGRESS" },
  resolve: { from: ["OPEN", "REOPENED", "ACKNOWLEDGED", "IN_PROGRESS"], to: "RESOLVED", requiresNote: true, event: "RESOLVED" },
  close: { from: ["RESOLVED"], to: "CLOSED", event: "CLOSED" },
};

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { id, action, note, resolutionNote, targetUserId, severity } = body;
    if (!id || !action) return fail("id and action are required");
    const escalation = await db.escalation.findUnique({
      where: { id },
      include: { from: { select: { country: true, state: true, team: true } } },
    });
    if (!escalation) return fail("Escalation not found", 404);
    if (!canSeeEscalation(me, escalation)) return fail("Escalation not found", 404); // do not leak existence

    const notifyAuthor = async (type: string, title: string, message: string, dedupe?: string | null) => {
      await notify({
        userId: escalation.fromId,
        type,
        severity: "INFO",
        title,
        message,
        linkData: { view: "escalations", id: escalation.id },
        dedupeKey: dedupe ?? null,
      });
    };

    // ── Lifecycle transitions (assigned recipient / matching role in scope / admin) ──
    if (action in TRANSITIONS) {
      const t = TRANSITIONS[action];
      if (!canManageStatus(me, escalation)) return fail("Not authorized to update this escalation", 403);
      if (!t.from.includes(escalation.status)) {
        return fail(`Cannot ${action.replace("_", " ")} an escalation that is ${escalation.status}`);
      }
      const finalNote = (resolutionNote ?? note ?? "") as string;
      if (t.requiresNote && !String(finalNote).trim()) {
        return fail("A resolution note is required — explain how the issue was addressed");
      }
      const now = new Date();
      const data: Record<string, unknown> = { status: t.to };
      if (action === "ack") {
        data.ackById = me.id;
        data.ackByName = me.fullName;
        if (finalNote) data.ackNote = finalNote;
      }
      if (action === "resolve") {
        data.resolvedAt = now;
        data.resolutionNote = String(finalNote).trim();
        data.resolvedById = me.id;
        data.resolvedByName = me.fullName;
        data.ackById = escalation.ackById || me.id;
        data.ackByName = escalation.ackByName || me.fullName;
      }
      if (action === "close") data.closedAt = now;
      const [updated] = await db.$transaction([
        db.escalation.update({ where: { id }, data }),
        db.escalationEvent.create({
          data: {
            escalationId: id,
            action: t.event,
            actorId: me.id,
            actorName: me.fullName,
            actorRole: me.role,
            details: finalNote ? String(finalNote).trim() : null,
          },
        }),
      ]);
      const labels: Record<string, string> = {
        ack: "acknowledged",
        in_progress: "moved to In Progress",
        resolve: "resolved",
        close: "closed",
      };
      await notifyAuthor(
        action === "ack" ? "ESCALATION_ACK" : action === "resolve" ? "ESCALATION_RESOLVED" : "ESCALATION_STATUS",
        `${escalation.subject} — ${labels[action]}`,
        `${me.fullName} ${labels[action]} it${finalNote ? ` — ${String(finalNote).trim().slice(0, 200)}` : "."}`,
        action === "ack" || action === "resolve" ? `esc-${action}:${id}` : null
      );
      await audit({ userId: me.id, actorName: me.fullName, action: `ESCALATION_${t.event}`, entity: "Escalation", entityId: id, details: finalNote ? String(finalNote).trim().slice(0, 200) : null });
      return ok({ escalation: updated });
    }

    // ── Reopen: the author (or management) sends a resolved/closed issue back ──
    if (action === "reopen") {
      if (!canReopen(me, escalation)) return fail("Not authorized to reopen this escalation", 403);
      if (!["RESOLVED", "CLOSED"].includes(escalation.status)) {
        return fail(`Cannot reopen an escalation that is ${escalation.status}`);
      }
      const [updated] = await db.$transaction([
        db.escalation.update({ where: { id }, data: { status: "REOPENED", closedAt: null } }),
        db.escalationEvent.create({
          data: {
            escalationId: id,
            action: "REOPENED",
            actorId: me.id,
            actorName: me.fullName,
            actorRole: me.role,
            details: (note as string)?.trim() || null,
          },
        }),
      ]);
      // Notify everyone on the thread except the actor.
      const targets = await participantsToNotify(escalation);
      for (const userId of targets) {
        if (userId === me.id) continue;
        await notify({
          userId,
          type: "ESCALATION_REOPENED",
          severity: escalation.severity === "URGENT" ? "WARNING" : "INFO",
          title: `Reopened: ${escalation.subject}`,
          message: `${me.fullName} reopened this escalation${note ? ` — ${String(note).trim().slice(0, 200)}` : "."}`,
          linkData: { view: "escalations", id: escalation.id },
        });
      }
      await audit({ userId: me.id, actorName: me.fullName, action: "ESCALATION_REOPENED", entity: "Escalation", entityId: id });
      return ok({ escalation: updated });
    }

    // ── Reassign (admin): move the escalation to another eligible handler ──
    if (action === "assign") {
      if (me.role !== "ADMIN") return fail("Only administrators can reassign escalations", 403);
      if (!targetUserId) return fail("Choose the new handler");
      const user = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true, fullName: true, role: true, status: true } });
      if (!user || user.status !== "APPROVED") return fail("New handler not found or not active", 404);
      const [updated] = await db.$transaction([
        db.escalation.update({ where: { id }, data: { targetUserId: user.id, targetName: user.fullName, targetRole: user.role, targetType: "TARGET_USER" } }),
        db.escalationEvent.create({
          data: {
            escalationId: id,
            action: "REASSIGNED",
            actorId: me.id,
            actorName: me.fullName,
            actorRole: me.role,
            details: `Assigned to ${user.fullName} (${user.role})`,
          },
        }),
      ]);
      await notify({
        userId: user.id,
        type: "ESCALATION",
        severity: escalation.severity === "URGENT" ? "CRITICAL" : "WARNING",
        title: `Assigned to you: ${escalation.subject}`,
        message: `${me.fullName} assigned you this escalation from ${escalation.fromName}.`,
        linkData: { view: "escalations", id: escalation.id },
      });
      await audit({ userId: me.id, actorName: me.fullName, action: "ESCALATION_REASSIGNED", entity: "Escalation", entityId: id, details: `→ ${user.fullName}` });
      return ok({ escalation: updated });
    }

    // ── Priority change (assigned handler or admin) ──
    if (action === "priority") {
      if (!canManageStatus(me, escalation)) return fail("Not authorized to update this escalation", 403);
      const next = severity === "URGENT" ? "URGENT" : "NORMAL";
      if (next === escalation.severity) return ok({ escalation });
      const [updated] = await db.$transaction([
        db.escalation.update({ where: { id }, data: { severity: next } }),
        db.escalationEvent.create({
          data: {
            escalationId: id,
            action: "PRIORITY_CHANGED",
            actorId: me.id,
            actorName: me.fullName,
            actorRole: me.role,
            details: `${escalation.severity} → ${next}`,
          },
        }),
      ]);
      await notifyAuthor("ESCALATION_STATUS", `${escalation.subject} — priority changed`, `${me.fullName} changed the priority to ${next}.`);
      return ok({ escalation: updated });
    }

    return fail("Unknown action");
  });
}

/**
 * Administrator housekeeping: remove escalations — any status (OPEN included).
 * Supports a single ?id= or a JSON body { ids: [...] } for bulk removal.
 * Thread messages, timeline events and read-state cascade via the schema;
 * every removal also drops the inbox notifications pointing at the escalation.
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
