import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { AGENT_KPI_DEFS, SOCIAL_TEMPLATE_KPIS } from "@/lib/template-config";

// Default targets/units for the social media catalogue (editable in KPI Config).
const SOCIAL_KPI_META: Record<string, { unit: string; defaultTarget: number }> = {
  postsCreated: { unit: "count", defaultTarget: 4 },
  storiesReels: { unit: "count", defaultTarget: 4 },
  engagementRate: { unit: "percent", defaultTarget: 5 },
  reachImpressions: { unit: "count", defaultTarget: 10000 },
  followerGrowth: { unit: "count", defaultTarget: 50 },
  commentsDMs: { unit: "count", defaultTarget: 30 },
  calendarAdherence: { unit: "percent", defaultTarget: 90 },
  graphicsDesigned: { unit: "count", defaultTarget: 4 },
};

/**
 * One-time bootstrap: seeds the administrator account (idempotent via SystemFlag).
 * Admin: echristian@kallmania.com / Egbo Christian Ugochukwu / @21279413
 */
export async function GET() {
  return handle(async () => {
    // Seed the Inbound Call Centre KPI catalogue (same metrics as outbound, all optional) — runs once.
    const inboundFlag = await db.systemFlag.findUnique({ where: { key: "seeded_inbound_kpis_v1" } });
    if (!inboundFlag) {
      const existingInbound = await db.kpiConfig.count({ where: { department: "INBOUND" } });
      if (existingInbound === 0) {
        await db.kpiConfig.createMany({
          data: AGENT_KPI_DEFS.map((d) => ({
            department: "INBOUND",
            key: d.key,
            label: d.label,
            category: d.category,
            unit: d.unit,
            direction: d.derivedFrom ? "DERIVED" : "HIGHER_BETTER",
            defaultTarget: d.target,
            derivedFrom: d.derivedFrom || null,
            mandatory: false, // inbound: nothing is required — every metric is optional
            sortOrder: Math.round(d.sortOrder),
          })),
        });
      }
      await db.systemFlag.create({ data: { key: "seeded_inbound_kpis_v1", value: new Date().toISOString() } });
    }

    // Seed the Social Media Team KPI catalogue — runs once, self-heals fresh environments.
    const socialFlag = await db.systemFlag.findUnique({ where: { key: "seeded_social_kpis_v1" } });
    if (!socialFlag) {
      const existingSocial = await db.kpiConfig.count({ where: { department: "SOCIAL_MEDIA" } });
      if (existingSocial === 0) {
        await db.kpiConfig.createMany({
          data: SOCIAL_TEMPLATE_KPIS.map((d, i) => ({
            department: "SOCIAL_MEDIA",
            key: d.key,
            label: d.label,
            category: "SOCIAL",
            unit: SOCIAL_KPI_META[d.key]?.unit ?? "count",
            direction: "HIGHER_BETTER",
            defaultTarget: SOCIAL_KPI_META[d.key]?.defaultTarget ?? null,
            derivedFrom: null,
            mandatory: false,
            sortOrder: i + 1,
          })),
        });
      }
      await db.systemFlag.create({ data: { key: "seeded_social_kpis_v1", value: new Date().toISOString() } });
    }

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
