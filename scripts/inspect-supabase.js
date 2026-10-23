// Inspect Supabase DB: tables, User columns, row counts, sample users
const { Client } = require("pg");

const pwCandidates = [process.env.KALLMANIA_DB_PASSWORD || ""];

(async () => {
  let c = null;
  for (const pw of pwCandidates) {
    try {
      const client = new Client({
        host: "aws-0-eu-west-1.pooler.supabase.com",
        port: 5432,
        user: "postgres.heybhtesxvhuktuhvfyd",
        password: pw,
        database: "postgres",
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      console.log(`CONNECTED with password form: ${pw === pwCandidates[0] ? "percent-encoded" : "decoded"}`);
      c = client;
      break;
    } catch (e) {
      console.log(`connect failed with ${pw.slice(0, 8)}...: ${e.message}`);
    }
  }
  if (!c) throw new Error("all password forms failed");

  const tables = await c.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  console.log("=== TABLES ===");
  console.log(tables.rows.map((r) => r.table_name).join(", "));

  for (const t of ["User", "users", "Notice", "NoticeBoard", "notices"]) {
    const cols = await c.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`,
      [t]
    );
    if (cols.rowCount) {
      console.log(`\n=== COLUMNS OF ${t} ===`);
      cols.rows.forEach((r) =>
        console.log(`  ${r.column_name}  ${r.data_type}  nullable=${r.is_nullable}`)
      );
    }
  }

  // Find the actual user table (Prisma models map to table name == model name by default)
  const userTable = tables.rows.map((r) => r.table_name).includes("User") ? "User" : null;
  if (userTable) {
    const cnt = await c.query(`SELECT COUNT(*)::int AS n FROM "User"`);
    console.log(`\n=== USER COUNT: ${cnt.rows[0].n} ===`);
    const users = await c.query(
      `SELECT id, email, "fullName", role, department, team, status, phone, "employeeId", "createdAt" FROM "User" ORDER BY "createdAt"`
    );
    users.rows.forEach((u) =>
      console.log(
        `  ${u.email} | ${u.fullName} | ${u.role} | ${u.department} | team=${u.team || "-"} | ${u.status}`
      )
    );
    for (const t of ["Report", "Task", "Notification", "KpiConfig", "ReportTemplate", "AuditLog", "SystemFlag", "UploadedFile"]) {
      try {
        const r = await c.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
        console.log(`${t}: ${r.rows[0].n}`);
      } catch (e) {
        console.log(`${t}: ERR`);
      }
    }
  }

  await c.end();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
