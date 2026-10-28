// Remove the E2E test reports so browser E2E can run the full UI flow fresh.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.user.findMany({ where: { email: { in: ["e2e-agent@kallmania.test", "e2e-sup@kallmania.test"] } }, select: { id: true } });
const ids = users.map((u) => u.id);
const del = await db.report.deleteMany({ where: { userId: { in: ids } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
console.log("deleted reports:", del.count);
await db.$disconnect();
