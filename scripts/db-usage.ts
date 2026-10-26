import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

// Same self-heal logic as src/lib/db.ts: prefer a valid env, else read .env
let url = process.env.DATABASE_URL || ''
if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
  try {
    const env = readFileSync('/home/z/my-project/.env', 'utf8')
    const m = env.match(/^DATABASE_URL=(.+)$/m)
    if (m) url = m[1].trim()
  } catch {}
}

const db = new PrismaClient({ datasources: { db: { url } } })

async function main() {
  const total = await db.$queryRawUnsafe<{ size: string; bytes: bigint }[]>(
    `SELECT pg_size_pretty(pg_database_size(current_database())) AS size, pg_database_size(current_database()) AS bytes`
  )
  console.log('TOTAL_DB_BYTES=' + total[0].bytes.toString())
  console.log('TOTAL_DB_PRETTY=' + total[0].size)

  const tables = await db.$queryRawUnsafe<{ table_name: string; pretty: string; bytes: bigint; rows: bigint }[]>(
    `SELECT c.relname AS table_name,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS pretty,
            pg_total_relation_size(c.oid) AS bytes,
            COALESCE(n_live_tup, 0) AS rows
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 12`
  )
  console.log('--- TOP TABLES (size incl. indexes | est. rows) ---')
  for (const t of tables) {
    console.log(`${t.table_name.padEnd(24)} ${t.pretty.padStart(10)}  rows≈${t.rows.toString()}`)
  }

  // Row counts for the heavyweights (exact)
  for (const name of ['Report', 'Notification', 'AuditLog', 'UploadedFile', 'Escalation']) {
    try {
      const cnt = await db.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*)::bigint AS c FROM "${name}"`)
      console.log(`COUNT ${name} = ${cnt[0].c.toString()}`)
    } catch { /* table may not exist */ }
  }
}

main().catch(e => { console.error('ERR', String(e).slice(0, 500)); process.exit(1) }).finally(() => db.$disconnect())
