import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { notify, audit } from "@/lib/notify";
import { canPostMessage, canSeeEscalation, ensureThread, markThreadRead, participantsToNotify } from "@/lib/escalations";

/**
 * GET  /api/escalations/[id] — full escalation detail: record + persistent
 *                              message thread (asc) + activity timeline (asc).
 *                              Access-checked on every request; opening the
 *                              thread also marks it read for the caller.
 * POST /api/escalations/[id] — add a message to the thread (participants only:
 *                              author, assigned recipient, acting handler, admin).
 *                              Persists the message, logs a timeline event,
 *                              notifies the other side, never overwrites history.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await params;
    const escalation = await db.escalation.findUnique({
      where: { id },
      include: { from: { select: { id: true, fullName: true, role: true, country: true, state: true, team: true } }, targetUser: { select: { id: true, fullName: true, role: true } } },
    });
    if (!escalation) return fail("Escalation not found", 404);
    if (!canSeeEscalation(me, escalation)) return fail("Escalation not found", 404); // do not leak existence

    // Legacy rows predate threading — seed their thread on first open.
    await ensureThread(id);

    const [messages, events] = await Promise.all([
      db.escalationMessage.findMany({ where: { escalationId: id }, orderBy: { createdAt: "asc" } }),
      db.escalationEvent.findMany({ where: { escalationId: id }, orderBy: { createdAt: "asc" } }),
    ]);
    await markThreadRead(id, me.id);

    return ok({ escalation, messages, events });
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const text = String(body?.body ?? body?.message ?? "").trim();
    if (!text) return fail("Message body is required");

    const escalation = await db.escalation.findUnique({
      where: { id },
      include: { from: { select: { country: true, state: true, team: true } } },
    });
    if (!escalation) return fail("Escalation not found", 404);
    if (!canSeeEscalation(me, escalation)) return fail("Escalation not found", 404);
    if (!canPostMessage(me, escalation)) {
      return fail("Only the sender, the assigned recipient or the current handler can post in this thread", 403);
    }
    await ensureThread(id);

    const message = await db.escalationMessage.create({
      data: { escalationId: id, senderId: me.id, senderName: me.fullName, senderRole: me.role, body: text.slice(0, 4000) },
    });
    await db.$transaction([
      db.escalation.update({ where: { id }, data: { lastMessageAt: message.createdAt, lastMessageSenderId: me.id } }),
      // Sender always counts as having read up to their own message.
      db.escalationRead.upsert({
        where: { escalationId_userId: { escalationId: id, userId: me.id } },
        update: { lastReadAt: message.createdAt },
        create: { escalationId: id, userId: me.id, lastReadAt: message.createdAt },
      }),
    ]);
    await db.escalationEvent.create({
      data: {
        escalationId: id,
        action: "MESSAGE_SENT",
        actorId: me.id,
        actorName: me.fullName,
        actorRole: me.role,
        details: text.slice(0, 140),
      },
    });

    // Notify the other side of the conversation — never the sender, never bystanders.
    const targets = await participantsToNotify(escalation);
    const isAuthor = escalation.fromId === me.id;
    for (const userId of targets) {
      if (userId === me.id) continue;
      await notify({
        userId,
        type: "ESCALATION_MESSAGE",
        severity: escalation.severity === "URGENT" ? "WARNING" : "INFO",
        title: `${isAuthor ? "New reply" : "Update requested"} — ${escalation.subject}`,
        message: `${me.fullName}: ${text.slice(0, 300)}`,
        linkData: { view: "escalations", id: escalation.id },
        dedupeKey: `esc-msg:${message.id}`,
      });
    }
    await audit({ userId: me.id, actorName: me.fullName, action: "ESCALATION_MESSAGE", entity: "Escalation", entityId: id, details: text.slice(0, 200) });

    return ok({ message }, 201);
  });
}
