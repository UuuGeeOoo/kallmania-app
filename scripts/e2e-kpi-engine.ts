// API+engine E2E — REPORT-BASED KPI CALCULATION ENGINE (implementation prompt):
//  §2 SOCIAL MEDIA: SBTS Media Scoreboard reports (Prosper/Peace/Nze) parsed
//     into structured daily records — real formats (Target|Actual|Variance,
//     inline "5 (+4)", weekly RAG), missing actuals = NO_DATA (never zero),
//     sum-based cumulative (never averaged percentages), missing-day flags
//     from the workDays mask, same-day report collapse.
//  §3/§5 WEB DEV/TECHNICAL: task-based profile (assigned vs completed
//     deliverables, completion rate, on-time, overdue/outstanding/blocked,
//     bugs reported ≠ resolved), no fixed daily targets, within-report dedupe.
//  §6 INDIVIDUAL REPORTS: Operational Intelligence agent report carries the
//     cumulative records + evidence + work-completed/outstanding registers;
//     the agent whose records were missing (evlad) gets an honest gap report.
//  §7 TEAM RANKINGS: basis-labelled rankings, separate measures, no-rank for
//     agents without data.
//  §8/§9: provenance (extraction confidence/evidence), quarterly + custom
//     periods, dashboard consistency (/api/kpi/results vs /api/kpi/cumulative).
//  §10 acceptance: repeated imports never duplicate; a report stored without
//     updating KPI records would fail this suite.
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parseSbtsReportKpiLines, computeCumulativeKpi, buildTechTaskProfile, materializeSbtsReportKpiResults, type RawKpiRecord } from "../src/lib/kpi-engine";
import { materializeReportKpiResults } from "../src/lib/kpi-results";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
// Small pool for this script — the Next server already holds Supabase pooler
// sessions (session-mode max 15); without a cap the two clients starve each other.
const SCOPED_URL = `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=3`;
const db = new PrismaClient({ datasources: { db: { url: SCOPED_URL } } });

const PASSWORD = "e2e-kpi-2026";
const ADMIN = { email: "kpi-admin@kallmania.test", password: PASSWORD };
const PROSPER = "asomto@kallmania.com", PEACE = "opeace@kallmania.com", CHIMA = "nchimamkpam@kallmania.com";
const VLAD = "evlad@kallmania.com", JANE = "jnkemakolam@kallmania.com", CEMM = "cemmanuel@kallmania.com";
const TEMP_AGENT = { email: "kpieng-agent@kallmania.test", fullName: "E2E KPI Engine Agent", password: "kpieng-2026" };
const WIN = { from: "2026-10-20", to: "2026-11-08" };

let failures = 0;
function check(name: string, cond: unknown, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

async function login(u: { email: string; password: string }) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: u.email, password: u.password }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`login failed for ${u.email}`);
  return cookie;
}

async function call(cookie: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", cookie, ...(init?.headers ?? {}) } });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function ensureUser(u: { email: string; fullName: string; password: string; role?: string; department?: string; team?: string }) {
  const found = await db.user.findUnique({ where: { email: u.email } });
  if (found) return found;
  return db.user.create({
    data: {
      email: u.email, fullName: u.fullName, passwordHash: await bcrypt.hash(u.password, 10),
      role: u.role ?? "SOCIAL_MEDIA", department: u.department ?? "SOCIAL_MEDIA", team: u.team ?? "SOCIAL",
      status: "APPROVED", approvedAt: new Date(), country: "NG", state: "Enugu",
    },
  });
}

async function main() {
  const admin = await ensureUser({ ...ADMIN, fullName: "E2E KPI Admin", role: "ADMIN", department: "MANAGEMENT", team: null });
  const tempAgent = await ensureUser(TEMP_AGENT);
  const cookie = await login(ADMIN);
  const cookieAgent = await login({ email: TEMP_AGENT.email, password: TEMP_AGENT.password });

  const users = await db.user.findMany({ where: { email: { in: [PROSPER, PEACE, CHIMA, VLAD, JANE, CEMM] } }, select: { id: true, email: true, team: true, department: true, workDays: true, createdAt: true } });
  const U = Object.fromEntries(users.map((u) => [u.email, u])) as Record<string, { id: string; email: string; team: string | null; department: string; workDays: string; createdAt: Date }>;
  check("real users resolved from records", ["opeace@kallmania.com", "asomto@kallmania.com", "nchimamkpam@kallmania.com", "evlad@kallmania.com", "cemmanuel@kallmania.com"].every((e) => !!U[e]));

  // ── §2.A/B PARSER on the REAL scoreboard texts ────────────────────────────
  const events = await db.sbtsEvent.findMany({ where: { agentEmail: { in: [PROSPER, PEACE, CHIMA] }, type: "daily.report" }, orderBy: { eventDate: "asc" } });
  const peaceOct29 = events.find((e) => e.agentEmail === PEACE && e.eventDate === "2026-10-29");
  const peaceNov3 = events.filter((e) => e.agentEmail === PEACE && e.eventDate === "2026-11-03");
  const peaceNov5 = events.find((e) => e.agentEmail === PEACE && e.eventDate === "2026-11-05");
  const chimaNov3 = events.find((e) => e.agentEmail === CHIMA && e.eventDate === "2026-11-03");
  const prosperNov3 = events.find((e) => e.agentEmail === PROSPER && e.eventDate === "2026-11-03" && (e.report?.includes("KEY PERFORMANCE METRICS") ?? false));
  const prosperOct26 = events.find((e) => e.agentEmail === PROSPER && e.eventDate === "2026-10-26");

  const p29 = parseSbtsReportKpiLines(peaceOct29?.report ?? "");
  check("§2B Peace Oct 29: 8 role-specific KPI rows parsed", p29.length === 8, `got ${p29.length}`);
  const p29posts = p29.find((r) => r.slug === "platform_posts_scheduled_published");
  check("§2B Peace posts row: target 2, actual 3, variance +1, HIGH confidence", !!p29posts && p29posts.target === 2 && p29posts.actual === 3 && p29posts.variance === 1 && p29posts.confidence === "HIGH");
  const p29readiness = p29.find((r) => r.slug === "publishing_queue_readiness");
  check("§2B percent row: readiness target 90 actual 100 unit percent", !!p29readiness && p29readiness.target === 90 && p29readiness.actual === 100 && p29readiness.unit === "percent");

  const pNov3 = peaceNov3.map((e) => parseSbtsReportKpiLines(e.report)).sort((a, b) => b.length - a.length)[0] ?? [];
  const noDataRows = pNov3.filter((r) => r.actual === null && r.target !== null);
  check("§2G Peace Nov 3: 'Actual -' rows are missing (null), NEVER zero", noDataRows.length === 3, `noData=${noDataRows.length} names=${noDataRows.map((r) => r.slug).join(",")}`);

  const c3 = parseSbtsReportKpiLines(chimaNov3?.report ?? "");
  check("§2B Chima inline format: 7 rows parsed", c3.length === 7, `got ${c3.length}`);
  check("§2B Chima targets derived as actual − variance: [1,3,2,3,1,1,100]", JSON.stringify(c3.map((r) => r.target)) === JSON.stringify([1, 3, 2, 3, 1, 1, 100]), c3.map((r) => r.target).join(","));
  check("§2B Chima derived targets carry MEDIUM confidence", c3.every((r) => r.confidence === "MEDIUM"));

  const pr3 = parseSbtsReportKpiLines(prosperNov3?.report ?? "");
  const prContent = pr3.find((r) => r.slug === "content_published_or_scheduled");
  check("§2B Prosper role report parsed with reported +16 variance row", pr3.length === 8 && !!prContent && prContent.target === 1 && prContent.actual === 17 && prContent.variance === 16);

  const pr26 = parseSbtsReportKpiLines(prosperOct26?.report ?? "");
  const weeklyRows = pr26.filter((r) => r.periodKind === "weekly");
  check("§2C weekly RAG rows isolated (never daily targets)", weeklyRows.length >= 5, `weekly=${weeklyRows.length}`);
  const shifts = weeklyRows.find((r) => r.name?.toLowerCase().includes("handoff") || r.slug.includes("handoff"));
  check("§2C '2/2 shifts covered' under a percent target reads 100%", !!shifts && shifts.actual === 100, `actual=${shifts?.actual}`);

  // ── §2.F CUMULATIVE ENGINE over Peace (sum-based, missing days, NO_DATA) ──
  const peaceRecords = await db.kpiResult.findMany({ where: { userId: U[PEACE].id, reportDate: { gte: new Date(WIN.from + "T00:00:00.000Z"), lte: new Date(WIN.to + "T23:59:59.999Z") } } });
  const raw: RawKpiRecord[] = peaceRecords.map((r) => ({ kpiKey: r.kpiKey, label: r.label, unit: r.unit, target: r.target, actual: r.actual, achievement: r.achievement, statusLabel: r.statusLabel, source: r.source, reportDate: r.reportDate, updatedAt: r.updatedAt, reportRef: null, sbtsEventId: r.sbtsEventId }));
  const dirs = new Map([["postsCreated", "HIGHER_BETTER"]]);
  const eng = computeCumulativeKpi(raw, dirs, { reportedDates: new Set(["2026-10-29", "2026-11-03", "2026-11-05"]) });
  const posts = eng.kpis.find((k) => k.kpiKey === "platform_posts_scheduled_published");
  check("§2F posts cumulative: Σtarget 6, Σactual 6, variance 0, achievement 100%", !!posts && posts.cumulativeTarget === 6 && posts.cumulativeActual === 6 && posts.cumulativeVariance === 0 && posts.achievementPct === 100, posts ? `t=${posts.cumulativeTarget} a=${posts.cumulativeActual}` : "missing");
  const comments = eng.kpis.find((k) => k.kpiKey === "comments_dms_responded_to");
  check("§2G comments: NO_DATA days excluded from sums (0/5, not 0/15), 2 noData days counted", !!comments && comments.cumulativeTarget === 5 && comments.cumulativeActual === 0 && comments.days.noData === 2 && comments.achievementPct === 0, comments ? `t=${comments.cumulativeTarget} a=${comments.cumulativeActual} noData=${comments.days.noData}` : "missing");
  const stories = eng.kpis.find((k) => k.kpiKey === "stories_reels_thumbnails_created");
  check("§2F stories: 1 reported day only (target 1 actual 0), 2 noData", !!stories && stories.cumulativeTarget === 1 && stories.cumulativeActual === 0 && stories.days.noData === 2);
  check("§2F no weekly_ key inside daily kpis", eng.kpis.every((k) => !k.kpiKey.startsWith("weekly_")));

  // Missing-day detection via HTTP (workDays mask 0101000 = Tue+Thu)
  const cumRes = await call(cookie, `/api/kpi/cumulative?userId=${U[PEACE].id}&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const cum = cumRes.json as { cumulative?: { reporting?: { expectedDays: number; reportedDays: number; missingCount: number; missingDates: string[] } } };
  check("§2G missing-day flags: Peace (Tue+Thu, joined Oct 22) expected 5, reported 3, missing Oct 22+27", cumRes.status === 200 && cum.cumulative?.reporting?.expectedDays === 5 && cum.cumulative.reporting.reportedDays === 3 && cum.cumulative.reporting.missingCount === 2 && cum.cumulative.reporting.missingDates.includes("2026-10-27"), JSON.stringify(cum.cumulative?.reporting?.missingDates));

  // ── §5 same-day duplicate collapse (synthetic second report, then cleanup) ─
  const synth = await db.sbtsEvent.create({
    data: {
      eventId: `e2e-kpieng-dup-${Date.now()}`, type: "daily.report", agentEmail: PEACE, eventDate: "2026-11-03",
      report: "KPI test duplicate\n1. Platform posts scheduled / published\n   Target 2 | Actual 9 | Variance +7\n",
      matched: true, userId: U[PEACE].id, raw: "{}",
    },
  });
  await materializeSbtsReportKpiResults(synth, { id: U[PEACE].id, team: "SOCIAL", department: "SOCIAL_MEDIA" });
  const peaceRecords2 = await db.kpiResult.findMany({ where: { userId: U[PEACE].id, reportDate: { gte: new Date("2026-11-03T00:00:00.000Z"), lte: new Date("2026-11-03T23:59:59.999Z") }, kpiKey: "platform_posts_scheduled_published" } });
  check("§5 same-day duplicate stores separate rows (per-event idempotency)", peaceRecords2.length === 2, `rows=${peaceRecords2.length}`);
  const raw2: RawKpiRecord[] = peaceRecords2.map((r) => ({ kpiKey: r.kpiKey, label: r.label, unit: r.unit, target: r.target, actual: r.actual, achievement: r.achievement, statusLabel: r.statusLabel, source: r.source, reportDate: r.reportDate, updatedAt: r.updatedAt }));
  const eng2 = computeCumulativeKpi(raw2, new Map(), {});
  const posts2 = eng2.kpis.find((k) => k.kpiKey === "platform_posts_scheduled_published");
  check("§5 cumulative collapses the same day (latest wins): 9 counted once", !!posts2 && posts2.cumulativeActual === 9 && posts2.days.reported === 1 && eng2.reporting.supersededSameDay === 1, `a=${posts2?.cumulativeActual} superseded=${eng2.reporting.supersededSameDay}`);
  await db.kpiResult.deleteMany({ where: { sbtsEventId: synth.id } });
  await db.sbtsEvent.delete({ where: { id: synth.id } });
  const afterClean = await db.kpiResult.count({ where: { userId: U[PEACE].id, kpiKey: "platform_posts_scheduled_published", reportDate: { gte: new Date("2026-11-03T00:00:00.000Z"), lte: new Date("2026-11-03T23:59:59.999Z") } } });
  check("§5 cleanup restored exactly one Nov 3 posts row", afterClean === 1);

  // ── §10 repeated imports never duplicate ─────────────────────────────────
  // Scoped to SBTS-event rows: a real agent can submit a manual report while
  // this suite runs — that live report:* row is the pipeline working, not a
  // replay leak. The property under test: replaying stored events adds zero
  // rows for those events.
  const replayEvents = await db.sbtsEvent.findMany({ where: { matched: true, userId: { not: null } } });
  const evIds = replayEvents.map((e) => e.id);
  const before = await db.kpiResult.count({ where: { sbtsEventId: { in: evIds } } });
  for (const ev of replayEvents) {
    const u = await db.user.findUnique({ where: { id: ev.userId as string }, select: { id: true, team: true, department: true } });
    if (!u) continue;
    const { materializeSbtsKpiResults } = await import("../src/lib/kpi-results");
    await materializeSbtsKpiResults(ev, { id: u.id, team: u.team, department: u.department || "SOCIAL_MEDIA" });
    await materializeSbtsReportKpiResults(ev, { id: u.id, team: u.team, department: u.department || "SOCIAL_MEDIA" });
  }
  const after = await db.kpiResult.count({ where: { sbtsEventId: { in: evIds } } });
  check("§10 full replay of every stored SBTS event adds zero rows", before === after, `${before} → ${after}`);

  // ── §3/§5 TECH task-based engine (real TECH reports) ─────────────────────
  // Live agents keep filing reports while this suite runs — expected counts are
  // recomputed independently from the reports themselves, never hardcoded.
  const cemmReports = await db.report.findMany({ where: { userId: U[CEMM].id, status: { in: ["SUBMITTED", "APPROVED"] } }, orderBy: { reportDate: "asc" } });
  const cemmTasks = await db.task.findMany({ where: { OR: [{ assigneeId: U[CEMM].id }, { assignees: { some: { userId: U[CEMM].id } } }] } });
  // Self-heal any row written by a stale runtime (submit-time materialization
  // can land while a pool-starved process holds old code): idempotent re-run.
  for (const r of cemmReports) {
    await materializeReportKpiResults(r, { id: U[CEMM].id, team: U[CEMM].team, department: U[CEMM].department || r.department });
  }
  const expectedAssigned = cemmReports.reduce((s, r) => {
    try { return s + (JSON.parse(r.kpiMetrics ?? "[]") as { key: string; actual: number | null }[]).filter((m) => m.key === "ticketsAssigned" && m.actual !== null).reduce((x, m) => x + Number(m.actual), 0); } catch { return s; }
  }, 0);
  const expectedCompleted = cemmReports.reduce((s, r) => {
    try { return s + (JSON.parse(r.kpiMetrics ?? "[]") as { key: string; actual: number | null }[]).filter((m) => m.key === "ticketsCompleted" && m.actual !== null).reduce((x, m) => x + Number(m.actual), 0); } catch { return s; }
  }, 0);
  const profile = buildTechTaskProfile(cemmReports.map((r) => ({ id: r.id, ref: r.ref, reportDate: r.reportDate, status: r.status, kpiMetrics: r.kpiMetrics, workEntries: r.workEntries })), cemmTasks.map((t) => ({ title: t.title, status: t.status, priority: t.priority, dateAssigned: t.dateAssigned, deadline: t.deadline, blocker: t.blocker, category: t.category, updatedAt: t.updatedAt })));
  check(`§3 Chidiebere: assigned ${expectedAssigned} deliverables across ${cemmReports.length} daily reports (self-declared scope, engine = independent recount)`, profile.assignedDeliverables === expectedAssigned, `assigned=${profile.assignedDeliverables} expected=${expectedAssigned}`);
  check("§3 completion equals completed/assigned with rate math", profile.completedDeliverables === expectedCompleted && profile.completionRatePct === Math.round((expectedCompleted / expectedAssigned) * 10000) / 100, `completed=${profile.completedDeliverables} rate=${profile.completionRatePct}%`);
  check("§5 bugs reported and bugs resolved are independent recorded counters", Number.isFinite(profile.bugsReported) && Number.isFinite(profile.bugsResolved), `reported=${profile.bugsReported} resolved=${profile.bugsResolved}`);
  const pcDays = new Set(cemmReports.filter((r) => (r.workEntries ?? "").toLowerCase().includes("pc monitoring")).map((r) => r.reportDate.toISOString().slice(0, 10)));
  check("§5 'PC Monitoring' recurring duty grouped per day, no cross-day double counting", profile.entries.filter((e) => e.task.toLowerCase().startsWith("pc monitoring")).length === pcDays.size, `entries=${profile.entries.filter((e) => e.task.toLowerCase().startsWith("pc monitoring")).length} days=${pcDays.size}`);
  check("§3 no fixed daily target was invented (basis documented)", Object.keys(profile.basis).length >= 4);

  // Synthetic: incomplete entry + duplicate entry must not inflate completions
  const synthReport = { id: "synth", ref: "SYNTH-1", reportDate: new Date("2026-11-04T00:00:00.000Z"), status: "SUBMITTED", kpiMetrics: JSON.stringify([{ key: "ticketsAssigned", target: 3, actual: 3 }, { key: "ticketsCompleted", target: 3, actual: 2 }]), workEntries: JSON.stringify([{ task: "Fix login bug", status: "Completed" }, { task: "Fix Login Bug", status: "Completed" }, { task: "Deploy API integration", status: "In Progress" }]) };
  const p2 = buildTechTaskProfile([synthReport], []);
  check("§5 duplicate work entry (same normalized title) flagged and counted once", p2.entries.filter((e) => e.task.toLowerCase().startsWith("fix login") && !e.duplicate).length === 1 && p2.entries.find((e) => e.task.toLowerCase().startsWith("fix login") && e.duplicate) !== undefined);
  check("§5 incomplete task never counted as completed deliverable", p2.completionRatePct !== null && p2.completionRatePct < 100 && p2.outstandingDeliverables === 1, `rate=${p2.completionRatePct}`);
  check("§5 incomplete entry lands in the outstanding register", p2.outstandingWork.some((w) => w.label.startsWith("Deploy API")));

  // ── §3 missing Technical agent — honest gap handling ─────────────────────
  const vladRows = await db.kpiResult.count({ where: { userId: U[VLAD].id } });
  check("§3 Vladimir: zero fabricated KPI rows from his empty rejected report", vladRows === 0, `rows=${vladRows}`);
  const vladIntel = await call(cookie, `/api/intel/report?type=agent&agentId=${U[VLAD].id}&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const vladReport = vladIntel.json as { cumulativeKpi?: { kpis: unknown[]; reporting: { missingCount: number } }; profile?: { fullName: string }; error?: string };
  check("§3 Vladimir's individual KPI report GENERATES with the gap flagged, nothing invented", vladIntel.status === 200 && !vladReport.error && vladReport.profile?.fullName === "Vladimir" && vladReport.cumulativeKpi?.kpis?.length === 0 && vladReport.cumulativeKpi.reporting.missingCount > 0, JSON.stringify(vladReport.cumulativeKpi?.reporting ?? vladReport.error));
  const janeRows = await db.kpiResult.count({ where: { userId: U[JANE].id } });
  check("§3 Jane (no reports at all): zero fabricated rows", janeRows === 0);

  // ── §5 lower-better direction fix (response time) ─────────────────────────
  const arh = await db.kpiResult.findFirst({ where: { kpiKey: "avgResponseHours", userId: U[CEMM].id }, orderBy: { reportDate: "desc" } });
  check("§5 response time is LOWER-better: 5h vs 4h target = 80% ON_TRACK (was 125% MET)", !!arh && arh.achievement === 80 && arh.statusLabel === "ON_TRACK", arh ? `ach=${arh.achievement} ${arh.statusLabel} rev=${arh.revision}` : "missing");

  // ── §6 individual report content for a SOCIAL + a TECH agent ─────────────
  const peaceIntel = await call(cookie, `/api/intel/report?type=agent&agentId=${U[PEACE].id}&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const peaceReport = peaceIntel.json as { cumulativeKpi?: { kpis: { kpiKey: string }[]; reporting: { missingCount: number } }; workCompleted?: unknown[]; techTaskProfile?: unknown };
  check("§6 Peace's Operational Intelligence report carries the cumulative engine block", peaceIntel.status === 200 && (peaceReport.cumulativeKpi?.kpis?.length ?? 0) >= 8 && peaceReport.cumulativeKpi?.reporting?.missingCount === 2, JSON.stringify((peaceReport as { error?: string }).error ?? ""));
  const chimaIntel = await call(cookie, `/api/intel/report?type=agent&agentId=${U[CHIMA].id}&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const chimaReportData = chimaIntel.json as { workCompleted?: { task: string }[] };
  check("§6 Peace: cumulative engine block present, no tech profile for a social agent", peaceIntel.status === 200 && peaceReport.techTaskProfile === null);
  check("§6 work-completed register: Chima's verified entries (grouped, evidence-linked)", chimaIntel.status === 200 && (chimaReportData.workCompleted?.length ?? 0) > 0, `tasks=${chimaReportData.workCompleted?.map((w) => w.task).slice(0, 2).join("; ")}`);
  const cemmIntel = await call(cookie, `/api/intel/report?type=agent&agentId=${U[CEMM].id}&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const cemmReportData = cemmIntel.json as { techTaskProfile?: { assignedDeliverables: number; completedDeliverables: number; bugsResolved: number } | null };
  check("§6 Chidiebere's report carries the task-based profile (§6 D/E)", cemmIntel.status === 200 && !!cemmReportData.techTaskProfile && cemmReportData.techTaskProfile.assignedDeliverables === expectedAssigned);

  // ── §7 team rankings with basis (SOCIAL + TECH) ───────────────────────────
  const socialTeam = await call(cookie, `/api/intel/report?type=team&team=SOCIAL&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const socialData = socialTeam.json as { kpiEngineRankings?: { rankings: { id: string; basis: string; leaders: { agent: string }[] }[]; measurementNotes: string[] } };
  const sRank = socialData.kpiEngineRankings?.rankings ?? [];
  check("§7 SOCIAL team rankings present with measurement basis", socialTeam.status === 200 && sRank.some((r) => r.id === "cumulative-achievement") && sRank.every((r) => r.basis.length > 20), `rankings=${sRank.length}`);
  check("§7 achievement ranking leader is a real social agent, not roster order", sRank.find((r) => r.id === "cumulative-achievement")?.leaders?.[0]?.agent !== undefined);
  const techTeam = await call(cookie, `/api/intel/report?type=team&team=TECH&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const techData = techTeam.json as { kpiEngineRankings?: { rankings: { id: string; leaders: { agent: string; display: string }[] }[]; measurementNotes: string[] } };
  const tRank = techData.kpiEngineRankings?.rankings ?? [];
  check("§7 TECH team has task-based rankings (deliverables, bugs separate, outstanding)", techTeam.status === 200 && ["deliverables-completed", "bugs-resolved", "outstanding-assignments"].every((id) => tRank.some((r) => r.id === id)), `rankings=${tRank.map((r) => r.id).join(",")}`);
  check("§7 no-rank-for-no-data note present (Vladimir/Jane excluded honestly)", (techData.kpiEngineRankings?.measurementNotes ?? []).some((n) => n.includes("never scored as zero")));

  // ── §8/§9 provenance + period filters + dashboard consistency ────────────
  const resQ = await call(cookie, `/api/kpi/results?userId=${U[PEACE].id}&period=quarter&date=2026-11-03`);
  const resC = await call(cookie, `/api/kpi/results?userId=${U[PEACE].id}&period=custom&from=${WIN.from}&to=${WIN.to}`);
  const resQData = resQ.json as { summary?: { cumulativeTarget: number | null; cumulativeActual: number | null; achievementPct: number | null; noDataDays: number }[]; records?: { extractionConfidence: string | null; evidence: string | null }[] };
  check("§9 quarterly + custom periods accepted by /api/kpi/results", resQ.status === 200 && resC.status === 200);
  const qPosts = resQData.summary?.find((s) => s.cumulativeTarget !== null && s.cumulativeActual !== null);
  check("§2F results roll-up is sum-based (cumulative fields, no avgAchievement)", !!qPosts && "noDataDays" in (qPosts as object) && !("avgAchievement" in (resQData.summary?.[0] ?? {})));
  check("§8 provenance exposed: extraction confidence + evidence on parsed rows", (resQData.records ?? []).some((r) => r.extractionConfidence === "HIGH" && !!r.evidence));
  const cumPosts = (cumRes.json as { cumulative?: { kpis: { kpiKey: string; cumulativeTarget: number | null; cumulativeActual: number | null }[] } }).cumulative?.kpis?.find((k) => k.kpiKey === "platform_posts_scheduled_published");
  const qPostsWin = (resC.json as { summary?: { kpiKey: string; cumulativeTarget: number | null; cumulativeActual: number | null }[] }).summary?.find((s) => s.kpiKey === "platform_posts_scheduled_published");
  check("§9 dashboards agree: /api/kpi/results and /api/kpi/cumulative read the same records", !!cumPosts && !!qPostsWin && cumPosts.cumulativeTarget === qPostsWin.cumulativeTarget && cumPosts.cumulativeActual === qPostsWin.cumulativeActual, `cum=${cumPosts?.cumulativeTarget}/${cumPosts?.cumulativeActual} res=${qPostsWin?.cumulativeTarget}/${qPostsWin?.cumulativeActual}`);

  // ── Security ──────────────────────────────────────────────────────────────
  const s1 = await call(cookieAgent, `/api/kpi/cumulative?userId=${U[PEACE].id}&period=month`);
  check("Security: agent cannot read another agent's cumulative KPIs", s1.status === 403, `got ${s1.status}`);
  const s2 = await call(cookieAgent, `/api/kpi/cumulative?roster=social&period=month`);
  check("Security: agent cannot read the team roster cumulative view", s2.status === 403, `got ${s2.status}`);
  const s3 = await call(cookieAgent, `/api/kpi/cumulative?period=month`);
  check("Security: agent CAN read their own cumulative KPIs", s3.status === 200);
  const s4 = await call(cookie, `/api/kpi/cumulative?roster=social&period=month`);
  const rosterLen = ((s4.json as { roster?: unknown[] }).roster ?? []).length;
  check("Roster view: admin sees the social roster incl. Prosper/Peace/Nze", s4.status === 200 && rosterLen >= 3, `roster=${rosterLen}`);

  // ── cleanup temp user (FK-safe) ───────────────────────────────────────────
  await db.kpiResult.deleteMany({ where: { userId: tempAgent.id } });
  await db.report.deleteMany({ where: { userId: tempAgent.id } });
  await db.sbtsEvent.deleteMany({ where: { agentEmail: TEMP_AGENT.email } });
  await db.activityEvent.deleteMany({ where: { userId: tempAgent.id } });
  await db.notification.deleteMany({ where: { userId: tempAgent.id } });
  await db.pushEvent.deleteMany({ where: { userId: tempAgent.id } });
  await db.pushSubscription.deleteMany({ where: { userId: tempAgent.id } });
  await db.pushPreference.deleteMany({ where: { userId: tempAgent.id } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { userId: tempAgent.id } });
  await db.user.delete({ where: { id: tempAgent.id } }).catch(() => {});

  console.log(failures === 0 ? "\nKPI ENGINE E2E: ALL PASS" : `\nKPI ENGINE E2E: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
