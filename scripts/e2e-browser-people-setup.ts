// Browser-E2E setup: two synthetic users (cleaned up after the run).
// The ADMIN sits in Enugu, so the real cross-centre supervisor
// (Vincent Akemhe — NG/Abuja) must appear in their escalation picker.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "browser-e2e-2026";
const USERS = [
  { email: "esc-browser-admin@kallmania.test", fullName: "E2E Browser Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-BRW-AD", country: "NG", state: "Enugu" },
  { email: "esc-browser-sup@kallmania.test", fullName: "E2E Browser Sup", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-BRW-S1", country: "NG", state: "Enugu" },
];

const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
console.log(`ready — ${USERS.length} browser test users approved (password: ${PASSWORD})`);
await db.$disconnect();
