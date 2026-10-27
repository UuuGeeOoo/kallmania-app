// One-off migration: Task.department "BPO" → "OUTBOUND" (Outbound Call Centre).
// Tasks & Assignments now use OUTBOUND / INBOUND instead of a single BPO bucket.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const map = { BPO: "OUTBOUND" };

const res = await db.task.updateMany({ where: { department: "BPO" }, data: { department: "OUTBOUND" } });
console.log(`tasks BPO→OUTBOUND: ${res.count}`);
console.log("remaining departments:", JSON.stringify(await db.task.groupBy({ by: ["department"], _count: true })));

await db.$disconnect();
