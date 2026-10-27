// Restore the SOCIAL_MEDIA KpiConfig catalogue (8 rows) that was lost,
// and verify WEB_DEV/INBOUND/BPO catalogues are intact.
// Idempotent: only inserts rows that don't exist (department+key).
import { db } from "../src/lib/db";

const SOCIAL_KPIS: {
  key: string;
  label: string;
  unit: string;
  defaultTarget: number | null;
  sortOrder: number;
}[] = [
  { key: "postsCreated", label: "Posts Created / Published", unit: "count", defaultTarget: 4, sortOrder: 1 },
  { key: "storiesReels", label: "Stories / Reels Created", unit: "count", defaultTarget: 4, sortOrder: 2 },
  { key: "engagementRate", label: "Content Engagement Rate (%)", unit: "percent", defaultTarget: 5, sortOrder: 3 },
  { key: "reachImpressions", label: "Reach / Impressions", unit: "count", defaultTarget: 10000, sortOrder: 4 },
  { key: "followerGrowth", label: "Follower Growth (Net)", unit: "count", defaultTarget: 50, sortOrder: 5 },
  { key: "commentsDMs", label: "Comments / DMs Responded To", unit: "count", defaultTarget: 30, sortOrder: 6 },
  { key: "calendarAdherence", label: "Content Calendar Adherence (%)", unit: "percent", defaultTarget: 90, sortOrder: 7 },
  { key: "graphicsDesigned", label: "Graphics / Visuals Designed", unit: "count", defaultTarget: 4, sortOrder: 8 },
];

async function main() {
  let created = 0;
  for (const d of SOCIAL_KPIS) {
    const exists = await db.kpiConfig.findFirst({ where: { department: "SOCIAL_MEDIA", key: d.key } });
    if (exists) continue;
    await db.kpiConfig.create({
      data: {
        department: "SOCIAL_MEDIA",
        key: d.key,
        label: d.label,
        category: "SOCIAL",
        unit: d.unit,
        direction: "HIGHER_BETTER",
        defaultTarget: d.defaultTarget,
        derivedFrom: null,
        mandatory: false,
        active: true,
        sortOrder: d.sortOrder,
      },
    });
    created++;
  }
  console.log(`SOCIAL_MEDIA KPI configs created: ${created}`);
  const byDept = await db.kpiConfig.groupBy({ by: ["department"], _count: { _all: true }, orderBy: { department: "asc" } });
  console.log("catalogue:", byDept.map((r) => `${r.department}=${r._count._all}`).join(" "));
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
