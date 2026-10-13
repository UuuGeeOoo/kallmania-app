import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { AGENT_KPI_DEFS } from "@/lib/template-config";

/**
 * One-time bootstrap: seeds the administrator account (idempotent via SystemFlag).
 * Admin: echristian@kallmania.com / Egbo Christian Ugochukwu / @21279413
 */
export async function GET() {
  return handle(async () => {
    const flag = await db.systemFlag.findUnique({ where: { key: "seeded_admin_v1" } });
    if (!flag) {
      const email = "echristian@kallmania.com";
      let admin = await db.user.findUnique({ where: { email } });
      if (!admin) {
        admin = await db.user.create({
          data: {
            email,
            passwordHash: await hashPassword("@21279413"),
            fullName: "Egbo Christian Ugochukwu",
            role: "ADMIN",
            department: "MANAGEMENT",
            employeeId: "SBTS-ADM-001",
            status: "APPROVED",
            approvedAt: new Date(),
          },
        });
      } else if (admin.status !== "APPROVED") {
        admin = await db.user.update({ where: { id: admin.id }, data: { status: "APPROVED", role: "ADMIN" } });
      }
      // Seed default KPI config from template
      const existingKpis = await db.kpiConfig.count();
      if (existingKpis === 0) {
        await db.kpiConfig.createMany({
          data: AGENT_KPI_DEFS.map((d) => ({
            department: "BPO",
            key: d.key,
            label: d.label,
            category: d.category,
            unit: d.unit,
            direction: d.derivedFrom ? "DERIVED" : "HIGHER_BETTER",
            defaultTarget: d.target,
            derivedFrom: d.derivedFrom || null,
            mandatory: !!d.mandatory,
            sortOrder: Math.round(d.sortOrder),
          })),
        });
      }
      await db.systemFlag.create({ data: { key: "seeded_admin_v1", value: new Date().toISOString() } });
      return ok({ seeded: true, admin: admin.email });
    }
    return ok({ seeded: true });
  });
}
