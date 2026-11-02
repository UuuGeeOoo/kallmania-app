import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash("verify-2026", 10);
  await db.user.upsert({
    where: { email: "verify-admin@kallmania.test" },
    update: { passwordHash: hash, status: "APPROVED", role: "ADMIN" },
    create: { email: "verify-admin@kallmania.test", fullName: "Verify Admin", passwordHash: hash, role: "ADMIN", department: "MANAGEMENT", status: "APPROVED", employeeId: "VERIFY-1" },
  });
  console.log("verify-admin ready");
}
main().finally(() => db.$disconnect());
