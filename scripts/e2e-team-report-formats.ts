// API-level E2E — TEAM-REPORT FORMATS on upload + read:
//  1. A social-media agent's upload is FILED under their own team even when
//     the payload spoofs department=BPO (server-enforced team association)
//  2. Extraction understands the document as a SOCIAL report (social KPI keys
//     routed) — never as the outbound agent template
//  3. Confirm creates a SOCIAL report in the team's format: type SOCIAL,
//     department SOCIAL_MEDIA, the 8-row social KPI table (kpiMetrics), the
//     derived metricsSummary for dashboards, the social task entries
//     (workEntries) and the owner's team stamped on the report — even when the
//     confirm payload spoofs department=BPO
//  4. The same holds for the web/technical team (TECH report: metricsSummary +
//     work entries, no outbound KPI rows) and for a SOCIAL MEDIA TEAM LEAD
//     (team leads upload social media reports)
//  5. Reading back (GET /api/reports?mine=1) exposes every team-format field
//     (kpiMetrics / metricsSummary / workEntries / teamName / department)
//  6. Supervisors/administrators keep the department picker (they file on
//     behalf of teams) — an admin upload under WEB_DEV stays WEB_DEV
const BASE = "http://localhost:3000";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── DATABASE_URL self-heal (mirrors src/lib/db.ts) ──
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-test-2026";
const CENTRE = { country: "NG", state: "Enugu" };
const D1 = "2026-11-02";
const D2 = "2026-11-01";

const SOC = { email: "teamfmt-social@kallmania.test", fullName: "E2E TeamFmt Social Agent", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-TF-1", ...CENTRE };
const DEV = { email: "teamfmt-dev@kallmania.test", fullName: "E2E TeamFmt Developer", role: "DEVELOPER", department: "WEB_DEV", team: "TECH", employeeId: "E2E-TF-2", ...CENTRE };
const TLSOC = { email: "teamfmt-tl@kallmania.test", fullName: "E2E TeamFmt Social Lead", role: "TEAM_LEAD", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-TF-3", ...CENTRE };
const ADM = { email: "teamfmt-admin@kallmania.test", fullName: "E2E TeamFmt Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-TF-AD", ...CENTRE };
const ALL_USERS = [SOC, DEV, TLSOC, ADM];

let failures = 0;
function check(name: string, cond: unknown, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

async function login(u: { email: string; password: string }) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", ...u }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login failed: " + (await res.text()));
  return cookie;
}

async function upload(cookie: string, fileName: string, content: string, mime: string, department: string, reportDate: string) {
  const fd = new FormData();
  fd.append("file", new Blob([content], { type: mime }), fileName);
  fd.append("department", department); // the client's claim — server must enforce the team for staff
  fd.append("reportDate", reportDate);
  const res = await fetch(`${BASE}/api/uploads`, { method: "POST", headers: { cookie }, body: fd });
  return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
}

async function call(cookie: string, path: string, body?: object, method = body ? "POST" : "GET") {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
}

const SOCIAL_DOC = `SOCIAL MEDIA TEAM — DAILY REPORT (${D1})
Staff: Ama Social
Shift: 09:00 - 17:00
Posts Published: 6
Reach: 15400
Impressions: 30200
Likes: 890
Shares: 64
Saves: 27
Link Clicks: 210
Comments Handled: 132
Messages Responded To: 41
Follower Growth: 156
Campaign Leads: 12
Challenges: One scheduled post delayed by network downtime
Escalations: Brand page access needs admin reset
`;

const TECH_DOC = `WEB & TECHNICAL TEAM — DAILY REPORT (${D2})
Staff: Dev E2E
Shift: 09:00 - 17:00
Tasks Completed: 9
Bugs Resolved: 3
Support Tickets Resolved: 5
Deployments Completed: 2
Test Cases Passed: 18
Milestones Delivered: 1
Code Reviews Done: 4
Challenges: Staging environment slow in the morning
`;

const metricRow = (key: string, label: string, actual: number | null, target: number | null = null, unit: "count" | "percent" | "minutes" = "count", category = "SOCIAL_TEMPLATE") => ({
  key, label, target, targetLabel: target === null ? "-" : unit === "percent" ? `${target}%` : `${target}`, actual, variance: null, unit, category, auto: false, notes: "",
});

// ── Setup: users + clean slate from any previous run ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of ALL_USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", department: u.department, role: u.role, team: u.team, country: u.country, state: u.state }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const oldUsers = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } });
const oldIds = oldUsers.map((u) => u.id);
const oldUploads = await db.uploadedFile.findMany({ where: { userId: { in: oldIds } }, select: { id: true, storedName: true } });
for (const up of oldUploads) {
  const p = `/home/z/my-project/uploads-storage/${up.storedName}`;
  if (existsSync(p)) { try { unlinkSync(p); } catch {} }
}
await db.report.deleteMany({ where: { userId: { in: oldIds } } });
await db.uploadedFile.deleteMany({ where: { userId: { in: oldIds } } });
await db.auditLog.deleteMany({ where: { userId: { in: oldIds } } });

const soc = await login({ email: SOC.email, password: PASSWORD });
const dev = await login({ email: DEV.email, password: PASSWORD });
const tl = await login({ email: TLSOC.email, password: PASSWORD });
const adm = await login({ email: ADM.email, password: PASSWORD });

// ── 1. Upload: spoofed department is ignored for staff ──
console.log("\n── 1. SOCIAL AGENT — upload files under their OWN team ──");
const upSoc = await upload(soc, `social-report-${D1}.txt`, SOCIAL_DOC, "text/plain", "BPO", D1);
check("1a social upload accepted", upSoc.status === 201, `status=${upSoc.status}`);
const upSocId = ((upSoc.json as { upload?: { id?: string } }).upload?.id) || "";
check("1b spoofed department=BPO overridden to SOCIAL_MEDIA", ((upSoc.json as { upload?: { department?: string } }).upload?.department) === "SOCIAL_MEDIA", JSON.stringify((upSoc.json as { upload?: { department?: string } }).upload?.department));

// ── 2. Extraction understands the SOCIAL document ──
const exSoc = await call(soc, "/api/uploads/extract", { id: upSocId });
check("2a extract ok", exSoc.status === 200 && (exSoc.json as { status?: string }).status !== "FAILED", `status=${exSoc.status}`);
const exSocFields = (exSoc.json as { fields?: { key: string; value: unknown }[] }).fields || [];
const socVal = (k: string) => exSocFields.find((f) => f.key === k)?.value;
check("2b postsPublished routed from the document", socVal("postsPublished") === 6, `postsPublished=${socVal("postsPublished")}`);
check("2c reach routed", socVal("reach") === 15400, `reach=${socVal("reach")}`);
check("2d followerGrowth routed", socVal("followerGrowth") === 156, `followerGrowth=${socVal("followerGrowth")}`);
check("2e commentsHandled routed", socVal("commentsHandled") === 132, `commentsHandled=${socVal("commentsHandled")}`);
check("2f NO outbound call KPIs appear for a social document", !exSocFields.some((f) => ["totalCallsMade", "callsConnected", "contactRate"].includes(f.key) && f.value !== null), JSON.stringify(exSocFields.filter((f) => f.key === "totalCallsMade").map((f) => f.value)));

// ── 3. Confirm in the team's format (client spoofs department=BPO) ──
console.log("\n── 3. SOCIAL AGENT — confirm creates the SOCIAL team-format report ──");
const confirmedSocial = [
  metricRow("postsCreated", "Posts Created / Published", 6, 4),
  metricRow("storiesReels", "Stories / Reels Created", null, 4),
  metricRow("engagementRate", "Content Engagement Rate (%)", null, 5, "percent"),
  metricRow("reachImpressions", "Reach / Impressions", 15400, 10000),
  metricRow("followerGrowth", "Follower Growth (Net)", 156, 50),
  metricRow("commentsDMs", "Comments / DMs Responded To", 132, 30),
  metricRow("calendarAdherence", "Content Calendar Adherence (%)", null, 90, "percent"),
  metricRow("graphicsDesigned", "Graphics / Visuals Designed", null, 4),
  metricRow("likes", "Likes", 890, null, "count", "EXTRACTED"),
  metricRow("shares", "Shares", 64, null, "count", "EXTRACTED"),
];
const cfSoc = await call(soc, "/api/uploads/confirm", {
  uploadId: upSocId,
  confirmedMetrics: confirmedSocial,
  sections: { shiftTime: "09:00 - 17:00", clockIn: "09:02", clockOut: "17:00", attendanceStatus: "Present", challenges: "One scheduled post delayed by network downtime", escalations: "Brand page access needs admin reset", additionalActivities: "" },
  reportDate: D1,
  department: "BPO", // ← spoof: server must keep SOCIAL_MEDIA
  submit: true,
  workEntries: [
    { task: "Design campaign graphics", platform: "Instagram", status: "Published", deliverable: "3 carousel posts" },
    { task: "Community replies", platform: "Facebook", status: "Completed", deliverable: "DM backlog cleared" },
  ],
});
check("3a confirm accepted", cfSoc.status === 201, `status=${cfSoc.status} body=${JSON.stringify(cfSoc.json).slice(0, 200)}`);
const repSoc = ((cfSoc.json as { report?: Record<string, unknown> }).report) || {};
check("3b report type SOCIAL (not AGENT_BPO)", repSoc.type === "SOCIAL", `type=${repSoc.type}`);
check("3c department stays SOCIAL_MEDIA", repSoc.department === "SOCIAL_MEDIA", `department=${repSoc.department}`);
const socKpis = JSON.parse((repSoc.kpiMetrics as string) || "[]") as { key: string; actual: number | null }[];
check("3d 8-row social KPI table stored", socKpis.length === 10 && socKpis[0].key === "postsCreated", `rows=${socKpis.length}`);
check("3e extracted actuals on the team template rows", socKpis.find((m) => m.key === "postsCreated")?.actual === 6 && socKpis.find((m) => m.key === "reachImpressions")?.actual === 15400 && socKpis.find((m) => m.key === "commentsDMs")?.actual === 132);
const socMs = JSON.parse((repSoc.metricsSummary as string) || "{}") as Record<string, number>;
check("3f derived metricsSummary for dashboards", socMs.postsPublished === 6 && socMs.reach === 15400 && socMs.commentsHandled === 132, JSON.stringify(socMs));
check("3g storiesPublished not invented when absent", !("storiesPublished" in socMs));
const socEntries = JSON.parse((repSoc.workEntries as string) || "[]") as { task: string; platform: string }[];
check("3h social task entries stored", socEntries.length === 2 && socEntries[0].platform === "Instagram");
check("3i owner's team stamped on the report", repSoc.teamName === "SOCIAL", `teamName=${repSoc.teamName}`);
check("3j submitted for review", repSoc.status === "SUBMITTED");

// ── 4. TECH developer + SOCIAL team lead ──
console.log("\n── 4. TECH & TEAM LEAD — each team keeps its own format ──");
const upDev = await upload(dev, `tech-report-${D2}.txt`, TECH_DOC, "text/plain", "BPO", D2);
check("4a tech upload accepted", upDev.status === 201);
const upDevId = ((upDev.json as { upload?: { id?: string } }).upload?.id) || "";
const exDev = await call(dev, "/api/uploads/extract", { id: upDevId });
const exDevFields = (exDev.json as { fields?: { key: string; value: unknown }[] }).fields || [];
check("4b tech document read as TECH (tasksCompleted routed)", exDevFields.some((f) => f.key === "tasksCompleted" && f.value === 9), JSON.stringify(exDevFields.map((f) => `${f.key}=${f.value}`)));
const confirmedTech = [
  metricRow("tasksCompleted", "Tasks Completed", 9, null, "count", "TECH"),
  metricRow("bugsResolved", "Bugs Resolved", 3, null, "count", "TECH"),
  metricRow("supportTicketsResolved", "Support Tickets Resolved", 5, null, "count", "TECH"),
  metricRow("deploymentsCompleted", "Deployments Completed", 2, null, "count", "TECH"),
  metricRow("testCasesPassed", "Test Cases Passed", 18, null, "count", "TECH"),
  metricRow("milestonesDelivered", "Milestones Delivered", 1, null, "count", "TECH"),
  metricRow("codeReviewsDone", "Code Reviews Done", 4, null, "count", "TECH"),
];
const cfDev = await call(dev, "/api/uploads/confirm", {
  uploadId: upDevId, confirmedMetrics: confirmedTech,
  sections: { shiftTime: "09:00 - 17:00", attendanceStatus: "Present", challenges: "Staging environment slow in the morning", additionalActivities: "" },
  reportDate: D2, department: "BPO", submit: true,
  workEntries: [{ title: "Fix checkout bug", project: "sbtsgroup.com", category: "Bug Fixing", status: "Completed", hours: "3", deliverable: "Patch deployed" }],
});
check("4c tech confirm accepted", cfDev.status === 201, `status=${cfDev.status}`);
const repDev = ((cfDev.json as { report?: Record<string, unknown> }).report) || {};
check("4d report type TECH, department WEB_DEV", repDev.type === "TECH" && repDev.department === "WEB_DEV", `type=${repDev.type} dept=${repDev.department}`);
check("4e TECH keeps metricsSummary (no outbound kpiMetrics)", JSON.parse((repDev.metricsSummary as string) || "{}").tasksCompleted === 9 && repDev.kpiMetrics === null, `ms=${String(repDev.metricsSummary).slice(0, 80)}`);
check("4f tech work entries stored", (JSON.parse((repDev.workEntries as string) || "[]") as unknown[]).length === 1);
check("4g developer's team stamped", repDev.teamName === "TECH", `teamName=${repDev.teamName}`);

const upTl = await upload(tl, `tl-social-report-${D2}.txt`, SOCIAL_DOC.replace("Ama Social", "Lead E2E"), "text/plain", "BPO", D2);
const upTlId = ((upTl.json as { upload?: { id?: string } }).upload?.id) || "";
const cfTl = await call(tl, "/api/uploads/confirm", {
  uploadId: upTlId, confirmedMetrics: confirmedSocial, sections: { attendanceStatus: "Present", additionalActivities: "" },
  reportDate: D2, department: "BPO", submit: true,
  workEntries: [{ task: "Content calendar review", platform: "LinkedIn", status: "Completed", deliverable: "Week 45 calendar" }],
});
check("4h team lead upload+confirm accepted", cfTl.status === 201, `status=${cfTl.status}`);
const repTl = ((cfTl.json as { report?: Record<string, unknown> }).report) || {};
check("4i SOCIAL MEDIA TEAM LEAD uploads a SOCIAL report", repTl.type === "SOCIAL" && repTl.department === "SOCIAL_MEDIA", `type=${repTl.type} dept=${repTl.department}`);
check("4j lead's report carries the social KPI table + entries", (JSON.parse((repTl.kpiMetrics as string) || "[]") as unknown[]).length === 10 && (JSON.parse((repTl.workEntries as string) || "[]") as unknown[]).length === 1);

// ── 5. Reading back exposes every team-format field ──
console.log("\n── 5. READING — team details visible on read-back ──");
const mine = await call(soc, "/api/reports?mine=1");
const mineRows = ((mine.json as { reports?: Record<string, unknown>[] }).reports) || [];
const mineSoc = mineRows.find((r) => r.type === "SOCIAL");
check("5a my-reports list returns the social report with team fields", !!mineSoc && typeof mineSoc.workEntries === "string" && typeof mineSoc.metricsSummary === "string" && mineSoc.department === "SOCIAL_MEDIA" && mineSoc.teamName === "SOCIAL", JSON.stringify(mineSoc && { dept: mineSoc.department, team: mineSoc.teamName }));
const socUserId = (await db.user.findUnique({ where: { email: SOC.email } }))?.id || "";
const mineAdmin = await call(adm, `/api/reports?userId=${socUserId}`);
const adminSees = ((mineAdmin.json as { reports?: Record<string, unknown>[] }).reports) || [];
check("5b management reads the same team-format fields (archive/review source)", adminSees.some((r) => r.type === "SOCIAL" && typeof r.workEntries === "string"), `rows=${adminSees.length}`);

// ── 6. Managers keep the department picker ──
console.log("\n── 6. MANAGER PICKER preserved ──");
const upAdm = await upload(adm, `admin-webfile-${D1}.txt`, TECH_DOC.replace("Dev E2E", "Admin upload"), "text/plain", "WEB_DEV", D1);
check("6a admin upload accepted", upAdm.status === 201);
check("6b admin's chosen department is honoured (WEB_DEV kept)", ((upAdm.json as { upload?: { department?: string } }).upload?.department) === "WEB_DEV", JSON.stringify((upAdm.json as { upload?: { department?: string } }).upload?.department));

// ── Cleanup ──
const cu = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } });
const cids = cu.map((u) => u.id);
const ups = await db.uploadedFile.findMany({ where: { userId: { in: cids } }, select: { storedName: true } });
for (const up of ups) { const p = `/home/z/my-project/uploads-storage/${up.storedName}`; if (existsSync(p)) { try { unlinkSync(p); } catch {} } }
await db.report.deleteMany({ where: { userId: { in: cids } } });
await db.uploadedFile.deleteMany({ where: { userId: { in: cids } } });
await db.auditLog.deleteMany({ where: { userId: { in: cids } } });
console.log("\ncleanup ok — test users' reports/uploads removed");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
