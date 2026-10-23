/**
 * One-time cleanup: delete REPORT_OVERDUE notifications that were generated for
 * dates an employee was NOT scheduled to work (part-timers flagged on off days).
 * WorksOn logic mirrors src/lib/schedule.ts so the rule matches production.
 *
 * Run: bun scripts/cleanup-stale-overdue.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

// Same self-heal logic as src/lib/db.ts: prefer a valid env, else read .env
let url = process.env.DATABASE_URL || "";
if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
  try {
    const env = readFileSync("/home/z/my-project/.env", "utf8");
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (m) url = m[1].trim();
  } catch {}
}
if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
  console.error("No valid DATABASE_URL found (env or .env)");
  process.exit(1);
}

const FULL_TIME_DEFAULT = "1111100";
function isValidWorkDays(v: unknown): v is string {
  return typeof v === "string" && /^[01]{7}$/.test(v) && v.includes("1");
}
function worksOn(mask: string | null | undefined, dateISO: string): boolean {
  const d = new Date(dateISO + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return false;
  const idx = (d.getUTCDay() + 6) % 7; // Monday-first
  const m = mask && isValidWorkDays(mask) ? mask : FULL_TIME_DEFAULT;
  return m[idx] === "1";
}

const db = new PrismaClient({ datasources: { db: { url } } });
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const notifs = await db.notification.findMany({
    where: { type: "REPORT_OVERDUE" },
    select: { id: true, dedupeKey: true, linkData: true, title: true, message: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const users = await db.user.findMany({ select: { id: true, fullName: true, workDays: true } });
  const byId = new Map(users.map((u) => [u.id, u]));

  console.log(`REPORT_OVERDUE notifications: ${notifs.length}`);
  let deleted = 0;
  let kept = 0;
  let unparsed = 0;

  for (const n of notifs) {
    // dedupeKey stored as `overdue:{empId}:{dateISO}:{supId}#{recipientId}`
    const base = (n.dedupeKey || "").split("#")[0];
    const parts = base.split(":");
    let empId = parts.length >= 4 ? parts[1] : "";
    let dateISO = parts.length >= 4 ? parts[2] : "";
    if (!empId || !dateISO) {
      try {
        const ld = JSON.parse(n.linkData || "{}") as { userId?: string; date?: string };
        empId = empId || ld.userId || "";
        dateISO = dateISO || ld.date || "";
      } catch {}
    }
    const emp = empId ? byId.get(empId) : undefined;
    if (!empId || !dateISO) {
      unparsed++;
      console.log(`  ? unparseable (kept): id=${n.id} key=${n.dedupeKey}`);
      continue;
    }
    if (!emp) {
      // employee no longer exists (purged test users) — alert is meaningless
      deleted++;
      console.log(`  x GONE-USER empId=${empId} ${dateISO} → notif ${n.id} ${n.message.slice(0, 70)}`);
      if (!dryRun) await db.notification.delete({ where: { id: n.id } });
      continue;
    }
    if (worksOn(emp.workDays, dateISO)) {
      kept++;
      continue;
    }
    deleted++;
    console.log(
      `  x OFF-DAY ${emp.fullName} ${dateISO} (${new Date(dateISO + "T00:00:00Z").toUTCString().slice(0, 3)}) ` +
        `mask=${emp.workDays || "(default Mon-Fri)"} → notif ${n.id} ${n.message.slice(0, 70)}`
    );
    if (!dryRun) await db.notification.delete({ where: { id: n.id } });
  }

  console.log(`\nDeleted: ${deleted}${dryRun ? " (dry-run — nothing written)" : ""} | kept (scheduled workdays): ${kept} | unparseable: ${unparsed}`);
  const remaining = await db.notification.count({ where: { type: "REPORT_OVERDUE" } });
  console.log(`Remaining REPORT_OVERDUE notifications: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
