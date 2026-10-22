// Inspect what actually exists in the Supabase DB (via session pooler)
process.env.DATABASE_URL =
  "postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs&connection_limit=5&pool_timeout=20";
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const tables = await p.$queryRaw`
    select table_schema, table_name
    from information_schema.tables
    where table_schema not in ('pg_catalog','information_schema')
    order by table_schema, table_name`;
  console.log("=== TABLES ===");
  for (const t of tables) console.log(`${t.table_schema}.${t.table_name}`);
  if (tables.length === 0) console.log("(none)");
  try {
    const users = await p.$queryRaw`select count(*)::int as c, string_agg(email, ', ') as emails from "User"`;
    console.log(`\n=== User table === count=${users[0].c}\n${users[0].emails}`);
  } catch (e) { console.log("\nUser table query failed:", String(e.message).split("\n")[0]); }
  await p.$disconnect();
})();
