/** Restore the seeded e2e admin the password-reset suite expects (was purged by cleanup). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

let url = process.env.DATABASE_URL || "";
if (!url.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) url = m[1];
  process.env.DATABASE_URL = url;
}
const db = new PrismaClient();

async function main() {
  const email = "verify-admin@kallmania.test";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) { console.log("verify-admin already present"); return; }
  const passwordHash = await bcrypt.hash("verify-2026", 10);
  await db.user.create({
    data: { email, fullName: "Verify Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "VERIFY-ADMIN-1", country: "NG", state: "Enugu", passwordHash, status: "APPROVED" },
  });
  console.log("verify-admin restored");
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
