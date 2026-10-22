// Reproduce the kpi-config upsert directly to expose the real error
process.env.DATABASE_URL =
  "postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs&connection_limit=5&pool_timeout=20";
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const values = { label: "Probe", category: "CUSTOM", unit: "count", direction: "HIGHER_BETTER", defaultTarget: 55, mandatory: false, active: true };
  try {
    const c = await p.kpiConfig.upsert({
      where: { department_key_centreCountry_centreState: { department: "BPO", key: "totalCallsMade", centreCountry: "NG", centreState: "Enugu" } },
      create: { ...values, sortOrder: 100, centreCountry: "NG", centreState: "Enugu" },
      update: values,
    });
    console.log("UPSERT OK:", c.id, c.centreCountry + "/" + c.centreState, c.defaultTarget);
    // clean up the probe row if it was created centre-scoped
    if (c.centreCountry === "NG") { await p.kpiConfig.delete({ where: { id: c.id } }); console.log("probe deleted"); }
  } catch (e) {
    console.log("UPSERT FAIL:", e.code || "-", "|", String(e.message).split("\n").filter(Boolean).slice(-8).join(" ⏎ ").slice(0, 600));
  }
  await p.$disconnect();
})();
