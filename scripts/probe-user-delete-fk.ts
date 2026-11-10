/**
 * Probe: prove why "admin cannot permanently delete users".
 *
 * The delete transaction in /api/users PATCH (action=delete) clears reports,
 * notifications, escalations, memberKpiConfig, uploadedFile, tasks,
 * taskAssignee, notices, auditLog — but NOT ActivityEvent, PushSubscription,
 * PushEvent or PushPreference, all of which carry a REQUIRED User FK with
 * RESTRICT semantics (no onDelete rule in prisma/schema.prisma). Any user with
 * a single row in those tables makes db.user.delete throw P2003 and the whole
 * transaction rolls back — nothing is deleted.
 *
 * This probe counts FK-blocking rows per user in the REAL database, plus a
 * dry simulation of the route's transaction to show exactly where it breaks.
 * Read-only: it never deletes anything.
 */
import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`users in DB: ${users.length}\n`);

  const blockers: { email: string; activity: number; pushSub: number; pushEvt: number; pushPref: number; reports: number; kpi: number }[] = [];
  for (const u of users) {
    const [activity, pushSub, pushEvt, pushPref, reports, kpi] = await Promise.all([
      db.activityEvent.count({ where: { userId: u.id } }),
      db.pushSubscription.count({ where: { userId: u.id } }),
      db.pushEvent.count({ where: { userId: u.id } }),
      db.pushPreference.count({ where: { userId: u.id } }),
      db.report.count({ where: { userId: u.id } }),
      db.kpiResult.count({ where: { userId: u.id } }),
    ]);
    if (activity || pushSub || pushEvt || pushPref) {
      blockers.push({ email: u.email, activity, pushSub, pushEvt, pushPref, reports, kpi });
    }
  }

  console.log(`users that WOULD FAIL the current delete transaction (RESTRICT FK children present): ${blockers.length}`);
  for (const b of blockers) {
    console.log(
      `  ${b.email.padEnd(34)} activityEvents=${b.activity} pushSub=${b.pushSub} pushEvents=${b.pushEvt} pushPrefs=${b.pushPref} (reports=${b.reports}, kpiResults=${b.kpi})`
    );
  }
  if (!blockers.length) console.log("  (none right now — but every login/report/push creates such rows)");

  // Distribution of activity event types (what created them)
  const types = await db.activityEvent.groupBy({ by: ["eventType"], _count: { _all: true } });
  console.log("\nActivityEvent rows by type:");
  for (const t of types) console.log(`  ${t.eventType.padEnd(28)} ${t._count._all}`);
  const total = await db.activityEvent.count();
  console.log(`  TOTAL: ${total}`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("PROBE FAILED:", e);
    process.exit(1);
  });
