/* Inspect ReportTemplate rows in the runtime DB (Supabase) + confirm schema sync. */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const db = new PrismaClient();
  try {
    const rows = await db.reportTemplate.findMany({
      select: { id: true, key: true, name: true, updatedAt: true, updatedById: true },
      orderBy: { key: "asc" },
    });
    console.log(`ReportTemplate rows in DB: ${rows.length}`);
    for (const r of rows) console.log(` - ${r.key} | ${r.name} | updated ${r.updatedAt?.toISOString?.() || r.updatedAt}`);
    const expected = ["TEAM_LEAD", "TL_OUTBOUND", "TL_INBOUND", "TL_SOCIAL", "TL_TECH"];
    const missing = expected.filter((k) => !rows.some((r) => r.key === k));
    console.log(missing.length === 0 ? "All 5 keys have rows (custom)." : `No custom rows for: ${missing.join(", ")} (shipped defaults will be served — expected when untouched)`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error("INSPECT FAILED:", e.message); process.exit(1); });
