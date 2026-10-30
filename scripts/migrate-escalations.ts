/**
 * One-time migration: give escalations that predate threading their persistent
 * conversation thread + activity timeline. Idempotent — uses the shared
 * ensureThread() which skips anything that already has messages.
 *
 * Run: DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' .env) bun scripts/migrate-escalations.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const rows = await db.escalation.findMany({ select: { id: true, subject: true } });
  console.log(`escalations: ${rows.length}`);
  let seeded = 0;
  for (const r of rows) {
    const count = await db.escalationMessage.count({ where: { escalationId: r.id } });
    if (count > 0) {
      console.log(`  ${r.id} — thread already exists (${count} messages)`);
      continue;
    }
    const esc = await db.escalation.findUnique({ where: { id: r.id } });
    if (!esc) continue;
    await db.$transaction([
      db.escalationMessage.create({
        data: { escalationId: esc.id, senderId: esc.fromId, senderName: esc.fromName, senderRole: esc.fromRole, body: esc.message },
      }),
      db.escalationEvent.create({
        data: { escalationId: esc.id, action: "CREATED", actorId: esc.fromId, actorName: esc.fromName, actorRole: esc.fromRole, details: esc.subject },
      }),
      db.escalation.update({ where: { id: esc.id }, data: { lastMessageAt: esc.createdAt, lastMessageSenderId: esc.fromId } }),
    ]);
    // Seed read-cursors so history doesn't show as unread for everyone retroactively:
    // the author has read it; the assigned recipient (if any) has read it.
    const readIds = [esc.fromId, esc.targetUserId].filter(Boolean) as string[];
    for (const userId of [...new Set(readIds)]) {
      await db.escalationRead.create({ data: { escalationId: esc.id, userId, lastReadAt: esc.updatedAt } });
    }
    seeded++;
    console.log(`  ${r.id} — seeded thread + CREATED event (${esc.subject.slice(0, 40)})`);
  }
  const msgs = await db.escalationMessage.count();
  const events = await db.escalationEvent.count();
  console.log(`done — seeded ${seeded}; totals: ${msgs} messages, ${events} events`);
}

main().finally(() => db.$disconnect());
