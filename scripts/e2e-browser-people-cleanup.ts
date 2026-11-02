// Browser-E2E cleanup: remove the synthetic users, their escalation(s),
// thread rows, notifications (incl. those sent to REAL users pointing at
// the test escalation), audit logs and read-state.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const EMAILS = ["esc-browser-admin@kallmania.test", "esc-browser-sup@kallmania.test"];
const users = await db.user.findMany({ where: { email: { in: EMAILS } }, select: { id: true } });
const ids = users.map((u) => u.id);

// Test escalations authored by / targeted at the synthetic users.
const escs = await db.escalation.findMany({
  where: { OR: [{ fromId: { in: ids } }, { targetUserId: { in: ids } }, { ackById: { in: ids } }] },
  select: { id: true, subject: true },
});
for (const e of escs) {
  // Drop inbox notifications pointing at the escalation — including those
  // delivered to REAL users (e.g. the cross-centre supervisor).
  await db.notification.deleteMany({ where: { linkData: { contains: e.id } } });
}
const escIds = escs.map((e) => e.id);
await db.escalation.deleteMany({ where: { id: { in: escIds } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
await db.escalationRead.deleteMany({ where: { userId: { in: ids } } });
await db.user.deleteMany({ where: { id: { in: ids } } });

console.log(`cleanup ok — ${ids.length} browser test users removed, ${escIds.length} test escalation(s) removed (${escs.map((e) => e.subject).join(", ") || "none"}), related notifications purged`);

// Post-cleanup integrity report.
const [usersTotal, reports, escTotal, masters] = await Promise.all([
  db.user.count(),
  db.report.count(),
  db.escalation.count(),
  db.reportMasterTemplate.count(),
]);
const legacy = await db.escalation.count({ where: { targetType: "TARGET_ROLE" } });
console.log(`integrity — users=${usersTotal} reports=${reports} escalations=${escTotal} (legacy TARGET_ROLE=${legacy}) masters=${masters}`);
await db.$disconnect();
