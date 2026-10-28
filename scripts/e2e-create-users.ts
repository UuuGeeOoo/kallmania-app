// Create E2E test users for the report workflow verification (idempotent).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "e2e-test-2026";
const hash = await bcrypt.hash(PASSWORD, 10);

const users = [
  { email: "e2e-agent@kallmania.test", fullName: "E2E Test Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-001" },
  { email: "e2e-sup@kallmania.test", fullName: "E2E Test Supervisor", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-SUP" },
];

for (const u of users) {
  const existing = await db.user.findUnique({ where: { email: u.email } });
  if (existing) {
    await db.user.update({ where: { email: u.email }, data: { passwordHash: hash, status: "APPROVED" } });
    console.log("updated", u.email);
  } else {
    await db.user.create({ data: { ...u, passwordHash: hash, status: "APPROVED" } });
    console.log("created", u.email);
  }
}
await db.$disconnect();
console.log("password:", PASSWORD);
