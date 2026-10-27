// Seed centre (country/state) scoping for the geo KPI features:
//  - existing Lagos staff get country/state
//  - new Lagos state supervisor (hard-scoped)
//  - new Ghana agent (Greater Accra) with 2 submitted BPO reports
//  - Ngozi stays unscoped (regression guard: unscoped supervisor sees everything)
// Idempotent: safe to re-run.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const HASH = bcrypt.hashSync("@Test1234", 10);

const inLagos = { country: "Nigeria", state: "Lagos" };
const inGhana = { country: "Ghana", state: "Greater Accra" };

async function upsertUser(data) {
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    const updated = await db.user.update({ where: { id: existing.id }, data: { ...data, passwordHash: data.passwordHash || existing.passwordHash } });
    console.log(`updated: ${updated.fullName} <${updated.email}> ${updated.role} → ${updated.country || "-"}/${updated.state || "-"}`);
    return updated;
  }
  const created = await db.user.create({ data: { ...data, status: data.status || "APPROVED", passwordHash: data.passwordHash || HASH } });
  console.log(`created: ${created.fullName} <${created.email}> ${created.role} → ${created.country || "-"}/${created.state || "-"}`);
  return created;
}

// 1. Assign existing staff to the Lagos centre
const lagosNames = ["Blessing Okafor", "Ivy Inbound", "Amara Eze", "Tunde Adeyemi", ";lmnlm:L.", "Samuel Lead"];
for (const name of lagosNames) {
  const u = await db.user.findFirst({ where: { fullName: name } });
  if (!u) { console.log(`skip (missing): ${name}`); continue; }
  await db.user.update({ where: { id: u.id }, data: inLagos });
  console.log(`centred: ${name} → Lagos, Nigeria`);
}

// 2. Lagos state supervisor (hard-scoped) + unscoped supervisor (regression guard)
await upsertUser({
  email: "sup.lagos@kallmania.test",
  fullName: "Emeka Obi",
  role: "SUPERVISOR",
  department: "MANAGEMENT",
  team: null,
  employeeId: "SBTS-LAG-SUP",
  ...inLagos,
  passwordHash: HASH,
  status: "APPROVED",
});
const ngozi = await db.user.findFirst({ where: { fullName: "Ngozi Bello" } });
if (ngozi) {
  await db.user.update({ where: { id: ngozi.id }, data: { country: null, state: null, passwordHash: HASH } });
  console.log(`unscoped guard: Ngozi Bello (supervisor, no centre) password=@Test1234`);
}

// 3. Ghana agent
const kwame = await upsertUser({
  email: "kwame.mensah@kallmania.test",
  fullName: "Kwame Mensah",
  role: "AGENT_BPO",
  department: "BPO",
  team: "OUTBOUND",
  employeeId: "SBTS-GH-001",
  ...inGhana,
  passwordHash: HASH,
  status: "APPROVED",
});

// 4. Two submitted BPO reports for Kwame on 2026-10-16 (same day as the Lagos snapshot)
const template = await db.report.findFirst({
  where: { type: "AGENT_BPO", userId: { not: kwame.id }, kpiMetrics: { not: null } },
  orderBy: { reportDate: "desc" },
});
if (!template) throw new Error("No template BPO report found to copy kpiMetrics from");
const metrics = JSON.parse(template.kpiMetrics);
const scaled = metrics.map((m) => ({
  ...m,
  actual: typeof m.actual === "number" ? Math.max(0, Math.round(m.actual * 0.5 * 10) / 10) : m.actual,
  variance: m.target !== null && m.actual !== null ? m.actual - m.target : m.variance,
}));

const seedReports = [
  { ref: "BPO-GH-SEED1", calls: 52, connected: 31 },
  { ref: "BPO-GH-SEED2", calls: 47, connected: 26 },
];
for (const sr of seedReports) {
  const blob = JSON.stringify(
    scaled.map((m) => {
      if (m.key === "totalCallsMade") return { ...m, actual: sr.calls, variance: sr.calls - (m.target ?? 0) };
      if (m.key === "callsConnected") return { ...m, actual: sr.connected, variance: sr.connected - (m.target ?? 0) };
      return m;
    })
  );
  const existing = await db.report.findUnique({ where: { ref: sr.ref } });
  if (existing) {
    await db.report.update({ where: { ref: sr.ref }, data: { kpiMetrics: blob } });
    console.log(`report updated: ${sr.ref}`);
  } else {
    await db.report.create({
      data: {
        ref: sr.ref,
        type: "AGENT_BPO",
        reportDate: new Date("2026-10-16T10:30:00.000Z"),
        userId: kwame.id,
        department: "BPO",
        kpiMetrics: blob,
        status: "SUBMITTED",
      },
    });
    console.log(`report created: ${sr.ref} for Kwame Mensah`);
  }
}

// 5. Summary
const byCentre = await db.user.groupBy({
  by: ["country", "state"],
  where: { status: "APPROVED", country: { not: null } },
  _count: true,
});
console.log("\ncentres:", JSON.stringify(byCentre.map((g) => ({ c: g.country, s: g.state, n: g._count })), null, 1));
const kwameCount = await db.report.count({ where: { userId: kwame.id, status: "SUBMITTED" } });
console.log("kwame submitted reports:", kwameCount);
await db.$disconnect();
