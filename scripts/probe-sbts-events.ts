import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const evs = await db.sbtsEvent.findMany({
    where: { agentEmail: { in: ["asomto@kallmania.com", "opeace@kallmania.com", "nchimamkpam@kallmania.com"] } },
    orderBy: [{ agentEmail: "asc" }, { eventDate: "asc" }],
  });
  for (const e of evs) {
    console.log(`\n===== ${e.agentEmail} ${e.type} ${e.eventDate} score=${e.score} delta=${e.delta}`);
    if (e.components) console.log("components:", e.components.slice(0, 500));
    if (e.report) console.log("report:", e.report.slice(0, 900));
    if (e.reportTemplate) console.log("template:", e.reportTemplate.slice(0, 200));
  }
  const krs = await db.kpiResult.findMany({
    where: { department: "WEB_DEV" },
    select: { dedupeKey: true, kpiKey: true, target: true, actual: true, achievement: true, statusLabel: true, reportId: true, reportDate: true, verification: true },
    orderBy: { reportDate: "asc" },
  });
  console.log("\n===== WEB_DEV KpiResults =====");
  for (const k of krs) console.log(`${k.reportDate.toISOString().slice(0,10)} ${k.kpiKey.padEnd(22)} t=${k.target} a=${k.actual} ach=${k.achievement} ${k.statusLabel} ${k.verification} ${k.dedupeKey}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
