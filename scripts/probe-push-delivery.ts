/**
 * Probe: PushDelivery is a GRANDCHILD table (PushDelivery.eventId → PushEvent,
 * PushDelivery.subscriptionId → PushSubscription) with REQUIRED RESTRICT FKs.
 * The push worker writes a delivery attempt row for every subscription it
 * tries, so real users with push history carry these rows — and deleting the
 * user's PushEvents/Subscriptions fails with P2003 unless deliveries go first.
 * Counts how many real users are affected. Read-only.
 */
import { db } from "../src/lib/db";

async function main() {
  const totalDeliveries = await db.pushDelivery.count();
  console.log(`PushDelivery rows total: ${totalDeliveries}`);

  const users = await db.user.findMany({ select: { id: true, email: true } });
  let affected = 0;
  for (const u of users) {
    const viaEvents = await db.pushDelivery.count({ where: { event: { userId: u.id } } });
    const viaSubs = await db.pushDelivery.count({ where: { subscription: { userId: u.id } } });
    if (viaEvents || viaSubs) {
      affected++;
      console.log(`  ${u.email.padEnd(34)} deliveries viaEvents=${viaEvents} viaSubs=${viaSubs}`);
    }
  }
  console.log(`\nusers whose delete would STILL fail (without a PushDelivery purge): ${affected}`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error("PROBE FAILED:", e); process.exit(1); });
