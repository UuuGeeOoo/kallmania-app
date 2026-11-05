import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const users = await db.user.findMany({ select: { id: true, email: true } });
  const um = new Map(users.map((u) => [u.id, u.email]));
  const reps = await db.report.findMany({
    where: { department: { in: ["SOCIAL_MEDIA", "WEB_DEV"] } },
    orderBy: [{ userId: "asc" }, { reportDate: "asc" }],
    select: { id: true, ref: true, userId: true, type: true, status: true, reportDate: true, workEntries: true, metricsSummary: true, kpiMetrics: true },
  });
  for (const r of reps) {
    console.log(`\n########## ${um.get(r.userId)} ${r.ref} ${r.type} ${r.status} date=${r.reportDate.toISOString().slice(0, 10)}`);
    if (r.workEntries) console.log("workEntries:", r.workEntries.slice(0, 1200));
    if (r.metricsSummary) console.log("metricsSummary:", r.metricsSummary.slice(0, 800));
    if (r.kpiMetrics) console.log("kpiMetrics:", r.kpiMetrics.slice(0, 800));
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
