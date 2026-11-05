import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  // 1. Reports per user for SOCIAL/WEB_DEV departments
  const reports = await db.report.groupBy({
    by: ["userId", "type", "department", "status"],
    where: { department: { in: ["SOCIAL_MEDIA", "WEB_DEV"] } },
    _count: { id: true },
  });
  console.log("=== REPORTS by user/type/status (SOCIAL_MEDIA, WEB_DEV) ===");
  const users = await db.user.findMany({ select: { id: true, email: true, fullName: true } });
  const um = new Map(users.map((u) => [u.id, u]));
  for (const r of reports.sort((a, b) => (um.get(a.userId)?.email ?? "").localeCompare(um.get(b.userId)?.email ?? ""))) {
    console.log(`${um.get(r.userId)?.email.padEnd(32)} ${r.type.padEnd(11)} ${r.department.padEnd(13)} ${r.status.padEnd(10)} x${r._count.id}`);
  }
  // 2. KpiResults per user for those departments
  const kr = await db.kpiResult.groupBy({
    by: ["userId", "department", "source"],
    where: { department: { in: ["SOCIAL_MEDIA", "WEB_DEV"] } },
    _count: { id: true },
  });
  console.log("\n=== KPI RESULTS by user/department/source ===");
  for (const k of kr.sort((a, b) => (um.get(a.userId)?.email ?? "").localeCompare(um.get(b.userId)?.email ?? ""))) {
    console.log(`${um.get(k.userId)?.email.padEnd(32)} ${k.department.padEnd(13)} ${k.source.padEnd(10)} x${k._count.id}`);
  }
  // 3. SbtsEvents per agentEmail
  const se = await db.sbtsEvent.groupBy({ by: ["agentEmail", "type", "matched"], _count: { id: true } });
  console.log("\n=== SBTS EVENTS by agentEmail/type/matched ===");
  for (const s of se.sort((a, b) => a.agentEmail.localeCompare(b.agentEmail))) {
    console.log(`${s.agentEmail.padEnd(32)} ${s.type.padEnd(18)} matched=${s.matched ? "Y" : "N"} x${s._count.id}`);
  }
  // 4. KpiConfig catalogue rows
  const cfg = await db.kpiConfig.findMany({
    where: { department: { in: ["SOCIAL_MEDIA", "WEB_DEV"] }, active: true },
    orderBy: [{ department: "asc" }, { sortOrder: "asc" }],
  });
  console.log("\n=== KPI CONFIG (SOCIAL_MEDIA, WEB_DEV) ===");
  for (const c of cfg) {
    console.log(`${c.department.padEnd(13)} ${c.key.padEnd(26)} ${c.label.padEnd(34)} unit=${c.unit.padEnd(8)} dir=${c.direction.padEnd(13)} target=${c.defaultTarget === null ? "-" : c.defaultTarget} cat=${c.category} centre=${c.centreCountry}/${c.centreState}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
