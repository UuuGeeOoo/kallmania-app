/** One-off: list remaining .test temp users and FK-purge any leftovers. */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

let url = process.env.DATABASE_URL || "";
if (!url.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) url = m[1];
  process.env.DATABASE_URL = url;
}
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ where: { AND: [{ email: { endsWith: "kallmania.test" } }, { email: { not: "verify-admin@kallmania.test" } }] }, select: { id: true, email: true } });
  console.log("temp .test users present:", users.length);
  for (const u of users) console.log("  ", u.email);
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.kpiResult.deleteMany({ where: { userId: { in: ids } } });
    await db.report.deleteMany({ where: { userId: { in: ids } } });
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.pushDelivery.deleteMany({ where: { OR: [{ event: { userId: { in: ids } } }, { subscription: { userId: { in: ids } } }] } }).catch(() => {});
    await db.pushEvent.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.memberKpiConfig.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.taskAssignee.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    // Tasks the temp users created — e2e artefacts, safe to remove entirely
    await db.task.deleteMany({ where: { createdById: { in: ids } } }).catch(() => {});
    await db.task.updateMany({ where: { assigneeId: { in: ids } }, data: { assigneeId: null } }).catch(() => {});
    await db.escalation.deleteMany({ where: { fromId: { in: ids } } }).catch(() => {});
    await db.escalation.updateMany({ where: { targetUserId: { in: ids } }, data: { targetUserId: null } }).catch(() => {});
    await db.uploadedFile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.notice.updateMany({ where: { authorId: { in: ids } }, data: { authorId: null } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  }
  // report what survived so a silent FK block can never hide again
  const survivors = await db.user.findMany({ where: { email: { endsWith: "kallmania.test" } }, select: { id: true, email: true } });
  console.log("survivors after purge:", survivors.map((s) => s.email));
  console.log("purged:", ids.length);
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
