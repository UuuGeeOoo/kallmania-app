// One-shot migration: local SQLite → Supabase Postgres.
// Reads via generated backup client (generated/sqlite-client), writes via main @prisma/client.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const path = process.cwd();

const { PrismaClient: SqliteClient } = require(path + "/generated/sqlite-client/client.js");
const { PrismaClient: PgClient } = require(path + "/node_modules/@prisma/client");

const sqlite = new SqliteClient({
  datasourceUrl: "file:" + path + "/db/custom.db",
});
const pg = new PgClient({
  datasourceUrl: process.env.KALLMANIA_DATABASE_URL,
});

const tables = [
  "user", "report", "reportTemplate", "task", "uploadedFile",
  "notification", "kpiConfig", "auditLog", "systemFlag",
];

async function main() {
  console.log("Reading from SQLite…");
  const data = {};
  for (const t of tables) {
    data[t] = await sqlite[t].findMany();
    console.log(`  sqlite ${t}: ${data[t].length}`);
  }

  console.log("Writing to Supabase…");
  // FK order: users first
  const order = ["user", "report", "reportTemplate", "task", "uploadedFile", "notification", "kpiConfig", "auditLog", "systemFlag"];

  // Users: strip relations, add emailVerified=null (new column)
  for (const t of order) {
    const rows = data[t].map((r) => {
      const { reports, reviewedReports, assignedTasks, createdTasks, notifications, auditLogs, uploadedFiles, updatedTemplates, user, reviewer, assignee, creator, ...rest } = r;
      return rest;
    });
    if (t === "user") {
      for (const r of rows) r.emailVerified = r.emailVerified ?? null;
    }
    if (rows.length) {
      await pg[t].createMany({ data: rows });
    }
    const count = await pg[t].count();
    console.log(`  pg ${t}: ${count}/${rows.length}`);
    if (count !== rows.length) throw new Error(`Row mismatch for ${t}`);
  }

  console.log("MIGRATION_OK");
}

main()
  .catch((e) => { console.error("MIGRATION_FAILED:", e.message); process.exitCode = 1; })
  .finally(async () => { await sqlite.$disconnect(); await pg.$disconnect(); });
