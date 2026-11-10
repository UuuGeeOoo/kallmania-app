/**
 * inspect-user-fks.ts — dump every FK constraint that references the "User"
 * table in the LIVE Supabase database, with its delete rule, plus row counts
 * for the tables that matter for user deletion.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const fks = await db.$queryRaw<
    Array<{
      constraint_name: string;
      table_name: string;
      column_name: string;
      delete_rule: string;
    }>
  >`
    SELECT
      tc.constraint_name,
      ccu.table_name  AS referenced_table,
      kcu.table_name  AS table_name,
      kcu.column_name AS column_name,
      rc.delete_rule
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = rc.constraint_name
     AND tc.constraint_type = 'FOREIGN KEY'
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.constraint_name
    WHERE ccu.table_name = 'User'
    ORDER BY kcu.table_name
  `;
  console.log("=== FK constraints referencing User (live DB) ===");
  for (const f of fks) {
    console.log(
      `${f.table_name}.${f.column_name}  ←  ${f.constraint_name}  ON DELETE ${f.delete_rule}`
    );
  }

  // Row counts on the hot tables, so we know what the failing user actually has.
  const counts = await db.$queryRaw<Array<{ table_name: string; rows: bigint }>>`
    SELECT relname AS table_name, n_live_tup AS rows
    FROM pg_stat_user_tables
    WHERE relname IN ('PushEvent','PushDelivery','PushSubscription','PushPreference',
                      'ActivityEvent','PasswordResetRequest','Notification','Report',
                      'KpiResult','Escalation','Task','TaskAssignee','UploadedFile',
                      'MemberKpiConfig','AuditLog','SbtsEvent','"User"')
    ORDER BY relname
  `;
  console.log("\n=== Approx row counts (pg_stat_user_tables) ===");
  for (const c of counts) console.log(`${c.table_name}: ${c.rows}`);
}

main()
  .catch((e) => {
    console.error("INSPECT FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
