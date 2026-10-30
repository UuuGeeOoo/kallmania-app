// One synthetic supervisor (Abuja) for the browser E2E of role escalation.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();
const hash = await bcrypt.hash("e2e-test-2026", 10);
await db.user.upsert({
  where: { email: "esc-role-e2e-sup-b1@kallmania.test" },
  update: { passwordHash: hash, status: "APPROVED" },
  create: { email: "esc-role-e2e-sup-b1@kallmania.test", passwordHash: hash, fullName: "E2E Role Sup B1", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ROLE-SB1", country: "NG", state: "Abuja Federal Capital Territory", status: "APPROVED" },
});
console.log("synthetic supervisor ready");
await db.$disconnect();
