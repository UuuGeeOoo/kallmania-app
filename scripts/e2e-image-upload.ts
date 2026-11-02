// Live HTTP test: social-media agent uploads a PNG report → extract (OCR) → confirm → read-back.
const BASE = "http://localhost:3000";
const SOC = { email: "img-e2e-soc@kallmania.test", fullName: "E2E Image Social Agent", role: "AGENT", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-IMG-1", centre: "MAIN", password: "ImgE2e!23" };
let fail = 0;
const ck = (n: string, c: unknown, x = "") => { console.log(`${c ? "PASS" : "FAIL"} — ${n}${x ? " | " + x : ""}`); if (!c) fail++; };

// create user directly (approved) like the other suites, then login
const { PrismaClient } = await import("@prisma/client");
const bcrypt = await import("bcryptjs");
const db = new PrismaClient();
const hash = await bcrypt.hash(SOC.password, 10);
const existing = await db.user.findUnique({ where: { email: SOC.email } });
if (existing) await db.user.update({ where: { email: SOC.email }, data: { passwordHash: hash, status: "APPROVED" } });
else await db.user.create({ data: { email: SOC.email, fullName: SOC.fullName, role: "AGENT", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: SOC.employeeId, centre: "MAIN", passwordHash: hash, status: "APPROVED" } });
// clean slate for this tester (uploads + reports) so the run is repeatable
const me = await db.user.findUnique({ where: { email: SOC.email } });
if (me) {
  await db.uploadedFile.deleteMany({ where: { userId: me.id } });
  await db.report.deleteMany({ where: { userId: me.id } });
}
await db.$disconnect();
let res = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: SOC.email, password: SOC.password }) });
const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
ck("login", Boolean(cookie));

// upload PNG
const png = new Uint8Array(await (await import("fs")).promises.readFile("/tmp/social-report.png"));
const fd = new FormData();
fd.append("file", new Blob([png], { type: "image/png" }), "social-report.png");
fd.append("department", "SOCIAL_MEDIA");
fd.append("reportDate", "2026-11-01");
const up = await fetch(`${BASE}/api/uploads`, { method: "POST", headers: { cookie }, body: fd });
const upj = await up.json().catch(() => ({})) as Record<string, unknown>;
const upId = (upj as { id?: string }).id ?? ((upj as { upload?: { id?: string } }).upload?.id);
ck("PNG upload accepted", up.status === 200 || up.status === 201, `status=${up.status} id=${upId}`);

// extract (OCR via AI engines)
const ex = await fetch(`${BASE}/api/uploads/extract`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: upId }) });
const exj = await ex.json().catch(() => ({})) as Record<string, unknown>;
const fields = (exj.fields ?? []) as { key: string; value: unknown }[];
ck("PNG extract ok", ex.status === 200 && (exj.status === "AWAITING_CONFIRMATION"), `status=${ex.status} fields=${fields.length}`);
ck("OCR read social KPIs into team fields", ["postsPublished", "reach", "impressions", "likes"].every(k => fields.some(f => f.key === k)), fields.map(f => f.key).join(","));
ck("engine flagged in response", String((exj.stats as { aiNote?: string })?.aiNote ?? "").includes("Gemini"), String((exj.stats as { aiNote?: string })?.aiNote ?? "").slice(0, 90));

// confirm → report (contract: uploadId + confirmedMetrics rows, like the review UI seeds)
const val = (k: string) => fields.find((f) => f.key === k)?.value;
const num = (k: string) => (typeof val(k) === "number" ? (val(k) as number) : null);
const row = (key: string, label: string, actual: number | null, target: number | null = null, unit = "count") => ({ key, label, target, targetLabel: target === null ? "-" : `${target}`, actual, variance: null, unit, category: "SOCIAL_TEMPLATE", auto: false, notes: "OCR-extracted" });
const confirmedMetrics = [
  row("postsCreated", "Posts Created / Published", num("postsPublished"), 4),
  row("storiesReels", "Stories / Reels Created", null, 4),
  row("engagementRate", "Content Engagement Rate (%)", null, 5, "percent"),
  row("reachImpressions", "Reach / Impressions", num("reach"), 10000),
  row("followerGrowth", "Follower Growth (Net)", num("followerGrowth"), 50),
  row("commentsDMs", "Comments / DMs Responded To", num("commentsHandled"), 30),
  row("calendarAdherence", "Content Calendar Adherence (%)", null, 90, "percent"),
  row("graphicsDesigned", "Graphics / Visuals Designed", null, 4),
  row("likes", "Likes", num("likes"), null),
  row("shares", "Shares", null, null),
];
const cf = await fetch(`${BASE}/api/uploads/confirm`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: upId, confirmedMetrics, sections: { shiftTime: "09:00 - 17:00", clockIn: "09:00", clockOut: "17:00", attendanceStatus: "Present", challenges: "Ad scheduler API outage delayed two posts by 3 hours." }, reportDate: "2026-11-01", department: "SOCIAL_MEDIA", submit: true, workEntries: [] }) });
const cfj = await cf.json().catch(() => ({})) as Record<string, unknown>;
ck("confirm creates report", cf.status === 200 || cf.status === 201, `status=${cf.status}`);

// read-back
const rb = await fetch(`${BASE}/api/reports?mine=1`, { headers: { cookie } });
const rbj = await rb.json().catch(() => ({})) as { reports?: Record<string, unknown>[] };
const rep = (rbj.reports ?? [])[0];
const ms = typeof rep?.metricsSummary === "string" ? (JSON.parse(rep.metricsSummary as string) as Record<string, number>) : (rep?.metricsSummary as Record<string, number> | undefined);
ck("read-back has team KPI values from the image", Boolean(ms && Number(ms.reach ?? ms.postsPublished ?? 0) > 0), JSON.stringify(ms ?? {}).slice(0, 140));

// cleanup
const del = await fetch(`${BASE}/api/uploads/discard`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: upId }) });
console.log(fail === 0 ? "\nALL IMAGE-E2E CHECKS PASSED" : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
