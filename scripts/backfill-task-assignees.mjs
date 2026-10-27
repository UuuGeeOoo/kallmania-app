// Backfill: ensure every task with an assigneeId has a matching TaskAssignee row.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const tasks = await db.task.findMany({
  where: { assigneeId: { not: null } },
  select: { id: true, assigneeId: true, assignees: { select: { userId: true } } },
});

let created = 0;
for (const t of tasks) {
  if (t.assigneeId && !t.assignees.some((a) => a.userId === t.assigneeId)) {
    await db.taskAssignee.create({ data: { taskId: t.id, userId: t.assigneeId } });
    created++;
  }
}
console.log(`Backfill complete — ${tasks.length} tasks with a primary assignee checked, ${created} junction rows created.`);
await db.$disconnect();
