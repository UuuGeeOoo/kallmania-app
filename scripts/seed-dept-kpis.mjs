// One-off seed: create the WEB_DEV + SOCIAL_MEDIA KPI catalogue rows from the
// report template rows (no fixed targets — admins/supervisors set them).
import { PrismaClient } from "@prisma/client";

// Mirror of src/lib/template-config.ts template rows (kept in sync manually —
// this script runs against the deployed DB once).
const TECH_TEMPLATE_KPI_ROWS = [
  { key: "ticketsAssigned", label: "Tickets / Tasks Assigned" },
  { key: "tasksCompleted", label: "Tickets / Tasks Completed" },
  { key: "bugsReported", label: "Bugs Reported" },
  { key: "bugsResolved", label: "Bugs Resolved" },
  { key: "pagesUpdated", label: "Pages / Sites Updated" },
  { key: "websiteUptime", label: "Website Uptime (%)" },
  { key: "avgResponseHrs", label: "Avg. Response Time to Tickets (hrs)" },
  { key: "codeReviewsDone", label: "Code Reviews Completed" },
  { key: "deploymentsCompleted", label: "Deployments Made" },
];
const SOCIAL_TEMPLATE_KPI_ROWS = [
  { key: "postsCreated", label: "Posts Created / Published" },
  { key: "storiesReels", label: "Stories / Reels Created" },
  { key: "engagementRate", label: "Content Engagement Rate (%)" },
  { key: "reachImpressions", label: "Reach / Impressions" },
  { key: "followerGrowth", label: "Follower Growth (Net)" },
  { key: "commentsDMs", label: "Comments / DMs Responded To" },
  { key: "calendarAdherence", label: "Content Calendar Adherence (%)" },
  { key: "graphicsDesigned", label: "Graphics / Visuals Designed" },
];

const db = new PrismaClient();
const techUnits = { websiteUptime: "percent" };
const socialUnits = { engagementRate: "percent", calendarAdherence: "percent" };

const existing = await db.kpiConfig.count({ where: { department: { in: ["WEB_DEV", "SOCIAL_MEDIA"] } } });
if (existing > 0) {
  console.log(`WEB_DEV/SOCIAL_MEDIA already seeded (${existing} rows) — nothing to do.`);
} else {
  await db.kpiConfig.createMany({
    data: [
      ...TECH_TEMPLATE_KPI_ROWS.map((m, i) => ({ department: "WEB_DEV", key: m.key, label: m.label, category: "TECH", unit: techUnits[m.key] || "count", direction: "HIGHER_BETTER", defaultTarget: null, mandatory: false, sortOrder: i + 1 })),
      ...SOCIAL_TEMPLATE_KPI_ROWS.map((m, i) => ({ department: "SOCIAL_MEDIA", key: m.key, label: m.label, category: "SOCIAL", unit: socialUnits[m.key] || "count", direction: "HIGHER_BETTER", defaultTarget: null, mandatory: false, sortOrder: i + 1 })),
    ],
  });
  console.log(`Seeded ${TECH_TEMPLATE_KPI_ROWS.length} WEB_DEV + ${SOCIAL_TEMPLATE_KPI_ROWS.length} SOCIAL_MEDIA KPI rows.`);
}
await db.$disconnect();
