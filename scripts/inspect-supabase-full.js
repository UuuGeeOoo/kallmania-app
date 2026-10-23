// Full schema diff material: all columns per table + FK constraints + sample country/state
const { Client } = require("pg");

(async () => {
  const c = new Client({
    host: "aws-0-eu-west-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.heybhtesxvhuktuhvfyd",
    password: process.env.KALLMANIA_DB_PASSWORD || "",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const tables = (
    await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`)
  ).rows.map((r) => r.table_name);

  for (const t of tables) {
    const cols = await c.query(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n### ${t}`);
    cols.rows.forEach((r) => console.log(`  ${r.column_name}  ${r.data_type}  null=${r.is_nullable}  def=${r.column_default || "-"}`));
  }

  console.log("\n### FOREIGN KEYS");
  const fks = await c.query(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'`
  );
  fks.rows.forEach((r) => console.log(`  ${r.table_name}.${r.column_name} -> ${r.foreign_table}`));

  console.log("\n### TaskAssignee ROWS");
  try {
    const ta = await c.query(`SELECT * FROM "TaskAssignee" LIMIT 10`);
    console.log(JSON.stringify(ta.rows, null, 1));
  } catch (e) { console.log("  ERR", e.message); }

  console.log("\n### USER country/state SAMPLES");
  const u = await c.query(`SELECT email, "fullName", country, state FROM "User" ORDER BY "createdAt"`);
  u.rows.forEach((r) => console.log(`  ${r.email} | country=${r.country || "-"} | state=${r.state || "-"}`));

  console.log("\n### Report columns (for diff)");
  const rc = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Report' AND table_schema='public' ORDER BY ordinal_position`);
  console.log(rc.rows.map((r) => r.column_name).join(", "));

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
