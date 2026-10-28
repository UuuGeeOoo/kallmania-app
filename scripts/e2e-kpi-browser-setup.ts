// Browser E2E setup/cleanup for Task 45 KPI sync verification.
// usage: bun scripts/e2e-kpi-browser-setup.ts setup|cleanup
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = await import("fs").then((fs) => fs.readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8"));
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();
const PASSWORD = "e2e-test-2026";
const CENTRE = { country: "NG", state: "E2E State" };
const SUP = { email: "kpi-br-sup@kallmania.test", fullName: "E2E BR Supervisor", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-BR-S", ...CENTRE };
const AGENT = { email: "kpi-br-agent@kallmania.test", fullName: "E2E BR Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-BR-A", ...CENTRE };
const ALL = [SUP, AGENT];
const mode = process.argv[2] || "setup";

if (mode === "setup") {
  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const u of ALL) {
    await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
  }
  console.log("setup ok");
} else {
  const users = await db.user.findMany({ where: { email: { in: ALL.map((u) => u.email) } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await db.report.deleteMany({ where: { userId: { in: ids } } });
  await db.memberKpiConfig.deleteMany({ where: { userId: { in: ids } } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  // remove the centre override the browser test created (E2E State centre rows)
  await db.kpiConfig.deleteMany({ where: { centreState: CENTRE.state, centreCountry: CENTRE.country } });
  let deleted = false;
  for (let i = 0; i < 6 && !deleted; i++) {
    try {
      await db.notification.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { email: { in: ALL.map((u) => u.email) } } });
      deleted = true;
    } catch { await new Promise((r) => setTimeout(r, 700)); }
  }
  console.log(`cleanup ok (${deleted ? "users removed" : "USER DELETE FAILED"})`);
}
await db.$disconnect();
