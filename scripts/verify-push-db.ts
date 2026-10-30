/**
 * Read-only verification that the Task 49 push-notification state is live in Supabase:
 *  - the four push tables exist with RLS enabled + forced
 *  - VAPID SystemFlag rows exist (private key presence only — never printed)
 *  - push:mandatory + push:cronSecret flags exist
 *  - real row counts (subscriptions / events / deliveries)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tables = await db.$queryRaw<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }[]>`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.relrowsecurity AND c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('PushSubscription', 'PushEvent', 'PushDelivery', 'PushPreference')
    ORDER BY c.relname`;

  console.log("== Push tables in Supabase ==");
  for (const t of tables) {
    console.log(
      `  ${t.table_name}: RLS enabled=${t.rls_enabled} forced=${t.rls_forced}`,
    );
  }
  const found = new Set(tables.map((t) => t.table_name));
  const want = ["PushSubscription", "PushEvent", "PushDelivery", "PushPreference"];
  const missing = want.filter((w) => !found.has(w));

  const flags = await db.systemFlag.findMany({
    where: { key: { in: ["vapid:public", "vapid:private", "vapid:subject", "push:mandatory", "push:cronSecret"] } },
    select: { key: true, value: true },
  });
  console.log("== SystemFlags ==");
  for (const f of flags) {
    if (f.key === "vapid:private" || f.key === "push:cronSecret") {
      console.log(`  ${f.key}: present (length ${f.value.length}, not displayed)`);
    } else {
      console.log(`  ${f.key}: ${f.key === "vapid:public" ? f.value.slice(0, 12) + "…" : f.value.slice(0, 80)}`);
    }
  }
  const flagKeys = new Set(flags.map((f) => f.key));
  const missingFlags = ["vapid:public", "vapid:private", "vapid:subject", "push:mandatory"].filter((k) => !flagKeys.has(k));

  const [subs, events, deliveries, prefs] = await Promise.all([
    db.pushSubscription.count(),
    db.pushEvent.count(),
    db.pushDelivery.count(),
    db.pushPreference.count(),
  ]);
  console.log("== Row counts ==");
  console.log(`  PushSubscription=${subs}  PushEvent=${events}  PushDelivery=${deliveries}  PushPreference=${prefs}`);

  let ok = true;
  if (missing.length) { console.log(`MISSING TABLES: ${missing.join(", ")}`); ok = false; }
  for (const t of tables) {
    if (!t.rls_enabled || !t.rls_forced) { console.log(`RLS NOT FORCED on ${t.table_name}`); ok = false; }
  }
  if (missingFlags.length) { console.log(`MISSING FLAGS: ${missingFlags.join(", ")}`); ok = false; }
  console.log(ok ? "SUPABASE VERIFICATION: ALL GOOD" : "SUPABASE VERIFICATION: PROBLEMS FOUND");
  await db.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
