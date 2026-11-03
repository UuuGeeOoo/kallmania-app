import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();

const USERS = [
  { email: "e2e-agent@kallmania.test", fullName: "E2E Report Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-RG-1", country: "NG", state: "Enugu" },
  { email: "e2e-sup@kallmania.test", fullName: "E2E Report Sup", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-RG-S", country: "NG", state: "Enugu" },
];

async function main() {
  const hash = await bcrypt.hash("e2e-test-2026", 10);
  for (const u of USERS) {
    await db.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team, role: u.role },
      create: { ...u, passwordHash: hash, status: "APPROVED" },
    });
  }
  console.log("seeded", USERS.map((u) => u.email).join(", "));
}
main().finally(() => db.$disconnect());
