/**
 * KPI ENGINE BACKFILL — one-shot, idempotent.
 *
 * Re-runs every materializer over the full history so pre-engine records get
 * their normalized KPI rows:
 *   1. matched SBTS performance.score events → headline + component rows
 *      (also re-grades with the direction-aware achievement fix),
 *   2. matched SBTS daily.report events → parsed "Target | Actual | Variance"
 *      rows (missing actuals → flagged NO_DATA rows, weekly RAG → weekly_ keys),
 *   3. SUBMITTED/APPROVED SOCIAL_MEDIA + WEB_DEV reports → report rows
 *      (catches reports submitted before the engine existed).
 * dedupeKey idempotency makes re-runs no-ops; corrections bump revision and
 * keep previousActual. Nothing is fabricated: an empty/rejected report simply
 * produces zero rows and is reported as a flagged gap.
 *
 * Run: DATABASE_URL=... npx tsx scripts/backfill-kpi-engine.ts
 */
import { PrismaClient } from "@prisma/client";
import { materializeReportKpiResults, materializeSbtsKpiResults } from "../src/lib/kpi-results";
import { materializeSbtsReportKpiResults } from "../src/lib/kpi-engine";

const db = new PrismaClient();

async function main() {
  const before = await db.kpiResult.count();

  // 1 + 2. SBTS events (matched only — unmapped ones have no owner to attribute).
  const events = await db.sbtsEvent.findMany({
    where: { matched: true, userId: { not: null } },
    orderBy: [{ receivedAt: "asc" }],
  });
  let sbtsRows = 0;
  const eventNotes: string[] = [];
  for (const ev of events) {
    const u = await db.user.findUnique({
      where: { id: ev.userId as string },
      select: { id: true, team: true, department: true },
    });
    if (!u) continue;
    const owner = { id: u.id, team: u.team, department: u.department || "SOCIAL_MEDIA" };
    const a = await materializeSbtsKpiResults(ev, owner);
    const b = await materializeSbtsReportKpiResults(ev, owner);
    if (a + b > 0) eventNotes.push(`${ev.agentEmail} ${ev.type} ${ev.eventDate}: +${a + b} row(s)`);
    sbtsRows += a + b;
  }

  // 3. Submitted/approved reports of the two departments this engine brief covers.
  const reports = await db.report.findMany({
    where: { department: { in: ["SOCIAL_MEDIA", "WEB_DEV"] }, status: { in: ["SUBMITTED", "APPROVED"] } },
    orderBy: [{ reportDate: "asc" }],
  });
  let reportRows = 0;
  const reportNotes: string[] = [];
  for (const r of reports) {
    const u = await db.user.findUnique({ where: { id: r.userId }, select: { id: true, team: true, department: true } });
    if (!u) continue;
    const n = await materializeReportKpiResults(r, { id: u.id, team: u.team, department: u.department || r.department });
    if (n > 0) reportNotes.push(`${r.ref} (${r.department} ${r.reportDate.toISOString().slice(0, 10)}): +${n}`);
    reportRows += n;
  }

  const after = await db.kpiResult.count();

  console.log("=== KPI ENGINE BACKFILL ===");
  console.log(`KpiResult rows: ${before} → ${after} (+${after - before})`);
  console.log(`SBTS events processed: ${events.length}, new/updated rows: ${sbtsRows}`);
  for (const n of eventNotes) console.log("  ", n);
  console.log(`Reports processed: ${reports.length}, new/updated rows: ${reportRows}`);
  for (const n of reportNotes) console.log("  ", n);

  // 4. Gap flags — agents the brief names, from the actual records.
  const agents = await db.user.findMany({
    where: { email: { in: ["opeace@kallmania.com", "asomto@kallmania.com", "nchimamkpam@kallmania.com", "evlad@kallmania.com", "cemmanuel@kallmania.com", "jnkemakolam@kallmania.com"] } },
    select: { id: true, email: true, department: true, team: true },
  });
  console.log("\n=== AGENT COVERAGE (the named team) ===");
  for (const a of agents) {
    const [kpiCount, reportsSub, rejected] = await Promise.all([
      db.kpiResult.count({ where: { userId: a.id } }),
      db.report.count({ where: { userId: a.id, status: { in: ["SUBMITTED", "APPROVED"] } } }),
      db.report.count({ where: { userId: a.id, status: "REJECTED" } }),
    ]);
    const flag =
      reportsSub === 0 && rejected === 0
        ? "GAP: no reports on record — nothing to compute, flagged for review (never fabricated)"
        : reportsSub === 0 && rejected > 0
          ? "GAP: only rejected report(s); latest is empty (no actual values) — no KPI rows can be honestly generated; flagged for re-submission"
          : `${kpiCount} KPI record(s)`;
    console.log(`${a.email.padEnd(32)} submitted=${reportsSub} rejected=${rejected} → ${flag}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
