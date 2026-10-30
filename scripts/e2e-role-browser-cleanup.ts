// Remove browser-E2E artifacts: the role-routed escalation (admin cascade also
// clears every notification pointing at it, incl. real supervisors') + the synthetic user.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();
const escs = await db.escalation.findMany({ where: { subject: "Shift handover sheet update" }, select: { id: true } });
for (const e of escs) {
  await db.notification.deleteMany({ where: { linkData: { contains: e.id } } });
  await db.escalation.delete({ where: { id: e.id } });
}
const u = await db.user.findUnique({ where: { email: "esc-role-e2e-sup-b1@kallmania.test" } });
if (u) {
  await db.notification.deleteMany({ where: { userId: u.id } });
  await db.escalationRead.deleteMany({ where: { userId: u.id } });
  await db.auditLog.deleteMany({ where: { userId: u.id } });
  await db.user.delete({ where: { id: u.id } });
}
const leftEsc = await db.escalation.count({ where: { subject: { contains: "handover sheet update" } } });
const leftUsers = await db.user.count({ where: { email: { contains: "esc-role-e2e" } } });
console.log(`cleanup done — escalations left: ${leftEsc}, test users left: ${leftUsers}`);
await db.$disconnect();
