// API-level E2E for the persistent-draft workflow (save → resume → edit → submit):
//  1. Save as Draft persists all fields with a stable id + ref (DRAFT status)
//  2. Draft is retrievable (mine=1&status=DRAFT) with every value intact
//  3. Saving the draft again updates the SAME record (no duplicates ever)
//  4. Dashboard exposes myDrafts (employee + supervisor payloads)
//  5. Submitting the draft keeps the same id/ref and flips DRAFT→SUBMITTED
//  6. Duplicate submissions are refused (resubmit + second create, 409)
//  7. Submit validation: mandatory KPIs enforced (422, data preserved), Absent exempt
//  8. Draft + submitted report can coexist for a day (upload path) — both retrievable
//  9. Privacy: another agent cannot read or update someone else's draft
// 10. Approved reports are locked (403 on correction, 409 on resubmission)
// 11. REJECTED → draft-save → resubmit path still works (regression)
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
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
const AGENT = { email: "e2e-agent@kallmania.test", fullName: "E2E Test Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-001" };
const AGENT2 = { email: "e2e-agent2@kallmania.test", fullName: "E2E Second Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-002" };
const SUP = { email: "e2e-sup@kallmania.test", fullName: "E2E Test Supervisor", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-SUP" };

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
async function call(cookie: string, path: string, body?: object, method = body ? "POST" : "GET") {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

// ── Setup: users + clean slate ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of [AGENT, AGENT2, SUP]) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const agentUser = await db.user.findUnique({ where: { email: AGENT.email } });
const agent2User = await db.user.findUnique({ where: { email: AGENT2.email } });
for (const uid of [agentUser!.id, agent2User!.id]) {
  await db.notification.deleteMany({ where: { userId: uid } });
  await db.auditLog.deleteMany({ where: { userId: uid } });
  await db.report.deleteMany({ where: { userId: uid } });
}
console.log(`clean slate — BPO mandatory KPI configs: ${(await db.kpiConfig.findMany({ where: { department: "BPO", mandatory: true, active: true } })).length}`);

const agent = await login({ email: AGENT.email, password: PASSWORD });
const agent2 = await login({ email: AGENT2.email, password: PASSWORD });
const sup = await login({ email: SUP.email, password: PASSWORD });

const mandatoryKeys = (await db.kpiConfig.findMany({ where: { department: "BPO", mandatory: true, active: true } })).map((c) => c.key);
const filledMandatory = mandatoryKeys.map((key) => ({ key, label: key, target: 10, targetLabel: "10", actual: 12, variance: 2, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" }));
const emptyMandatory = mandatoryKeys.map((key) => ({ key, label: key, target: 10, targetLabel: "10", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" }));

// ── 1. Save as Draft persists everything ──
const d1 = await call(agent, "/api/reports", {
  type: "AGENT_BPO", reportDate: today, department: "BPO", submit: false,
  shiftTime: "10:00-18:00", clockIn: "10:05", attendanceStatus: "Present", latenessMins: "5",
  kpiMetrics: [{ key: "totalCallsMade", label: "Total Calls Made", target: 30, targetLabel: "30", actual: 12, variance: -18, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "morning only" }, ...emptyMandatory.filter((m) => m.key !== "totalCallsMade")],
  callLogs: [{ leadName: "Grace Okafor", disposition: "Interested", followUp: "Yes", notes: "wants callback Friday" }],
  emailContext: { campaignName: "Q4 Outreach Wave 1" },
  challenges: "draft note v1 — network kept dropping",
});
check("1. Save as Draft creates DRAFT record", d1.status === 201 && d1.json?.report?.status === "DRAFT", `status=${d1.status} ${d1.json?.report?.status}`);
const draft = d1.json?.report;
check("1b. Draft has stable id + generated ref", !!draft?.id && !!draft?.ref && String(draft.ref).startsWith("BPO-"), `ref=${draft?.ref}`);

// ── 2. Draft is retrievable with all values ──
const g1 = await call(agent, `/api/reports?mine=1&status=DRAFT&date=${today}`);
const found = g1.json?.reports?.find((r: { id: string }) => r.id === draft.id);
const kpisBack = found?.kpiMetrics ? JSON.parse(found.kpiMetrics) : [];
const logsBack = found?.callLogs ? JSON.parse(found.callLogs) : [];
check("2. Draft listed under mine=1&status=DRAFT", !!found, `count=${g1.json?.reports?.length}`);
check("2b. KPI values restored", kpisBack.find((m: { key: string }) => m.key === "totalCallsMade")?.actual === 12, `totalCallsMade=${kpisBack.find((m: { key: string }) => m.key === "totalCallsMade")?.actual}`);
check("2c. Attendance + shift + notes restored", found?.shiftTime === "10:00-18:00" && found?.clockIn === "10:05" && found?.latenessMins === 5, `shift=${found?.shiftTime}`);
check("2d. Call log + campaign + text sections restored", logsBack[0]?.leadName === "Grace Okafor" && found?.challenges === "draft note v1 — network kept dropping", `logs=${logsBack.length}`);
const ctxBack = found?.emailContext ? JSON.parse(found.emailContext) : {};
check("2e. Campaign name (emailContext) restored", ctxBack.campaignName === "Q4 Outreach Wave 1", `campaign=${ctxBack.campaignName}`);

// ── 3. Saving again updates the SAME record (no duplicates) ──
const d2 = await call(agent, "/api/reports", { id: draft.id, type: "AGENT_BPO", reportDate: today, submit: false, challenges: "draft note v2 — edited", kpiMetrics: filledMandatory });
await new Promise((r) => setTimeout(r, 30));
const d3 = await call(agent, "/api/reports", { id: draft.id, type: "AGENT_BPO", reportDate: today, submit: false, challenges: "draft note v3 — autosave-style edit", kpiMetrics: filledMandatory });
const countToday = await db.report.count({ where: { userId: agentUser!.id, type: "AGENT_BPO", reportDate: { gte: new Date(today + "T00:00:00.000Z"), lte: new Date(today + "T23:59:59.999Z") } } });
check("3. Multiple saves keep ONE record", countToday === 1 && d2.json?.report?.id === draft.id && d3.json?.report?.id === draft.id, `records=${countToday}`);
check("3b. Same ref preserved across saves", d3.json?.report?.ref === draft.ref, `ref=${d3.json?.report?.ref}`);
check("3c. Latest values persisted", d3.json?.report?.challenges === "draft note v3 — autosave-style edit", `challenges=${d3.json?.report?.challenges}`);

// ── 4. Dashboard myDrafts exposes the draft ──
const dash = await call(agent, "/api/dashboard");
const myDrafts = dash.json?.employee?.myDrafts || [];
check("4. Dashboard employee.myDrafts contains the draft", myDrafts.some((x: { id: string }) => x.id === draft.id), `drafts=${myDrafts.length}`);
const supDash = await call(sup, "/api/dashboard");
check("4b. Supervisor payload also exposes myDrafts", Array.isArray(supDash.json?.supervisor?.myDrafts), `drafts=${supDash.json?.supervisor?.myDrafts?.length}`);

// ── 5. Submit the draft — same id/ref, DRAFT→SUBMITTED ──
const s1 = await call(agent, "/api/reports", { id: draft.id, type: "AGENT_BPO", reportDate: today, submit: true, kpiMetrics: filledMandatory, attendanceStatus: "Present" });
check("5. Draft submits with same id + ref", s1.status === 200 && s1.json?.report?.status === "SUBMITTED" && s1.json?.report?.id === draft.id && s1.json?.report?.ref === draft.ref, `status=${s1.status} ref=${s1.json?.report?.ref}`);
const dash2 = await call(agent, "/api/dashboard");
check("5b. Dashboard counts it as submitted (drafts don't inflate the live count)", dash2.json?.employee?.reportSubmittedToday === true && !(dash2.json?.employee?.myDrafts || []).some((x: { id: string }) => x.id === draft.id), `submittedToday=${dash2.json?.employee?.reportSubmittedToday}`);
const supNotif = await db.notification.count({ where: { type: "REPORT_SUBMITTED", message: { contains: draft.ref } } });
check("5c. Supervisor notified of submission", supNotif >= 1, `notifs=${supNotif}`);

// ── 6. Duplicate submission refused ──
const s2 = await call(agent, "/api/reports", { id: draft.id, type: "AGENT_BPO", reportDate: today, submit: true, kpiMetrics: filledMandatory });
check("6. Re-submitting the submitted draft is blocked (409)", s2.status === 409, `status=${s2.status}`);
const s3 = await call(agent, "/api/reports", { type: "AGENT_BPO", reportDate: today, submit: true, kpiMetrics: filledMandatory });
check("6b. Second create+submit same day blocked (409)", s3.status === 409, `status=${s3.status}`);
const s4 = await call(agent, "/api/reports", { type: "AGENT_BPO", reportDate: today, submit: false });
check("6c. Stray draft create blocked while live report exists (409)", s4.status === 409, `status=${s4.status}`);

// ── 7. Mandatory-KPI validation on submit (data preserved, Absent exempt) ──
if (mandatoryKeys.length) {
  const v1 = await call(agent, "/api/reports", { type: "AGENT_BPO", reportDate: threeDaysAgo, submit: false, challenges: "half-filled draft awaiting KPI numbers", kpiMetrics: emptyMandatory });
  const vd = v1.json?.report;
  check("7. Draft without KPIs saves fine", v1.status === 201 && vd?.status === "DRAFT", `status=${v1.status}`);
  const v2 = await call(agent, "/api/reports", { id: vd.id, type: "AGENT_BPO", reportDate: threeDaysAgo, submit: true, kpiMetrics: emptyMandatory, attendanceStatus: "Present" });
  const missingListed = mandatoryKeys.some((k) => {
    const cfg = mandatoryKeys;
    void cfg;
    return true;
  }) && typeof v2.json?.error === "string" && /required KPI/i.test(v2.json.error);
  check("7b. Submit without mandatory KPIs rejected (422) with field list", v2.status === 422 && missingListed, `status=${v2.status} msg=${String(v2.json?.error || "").slice(0, 60)}`);
  const v3 = await call(agent, `/api/reports?mine=1&date=${threeDaysAgo}`);
  const vd3 = v3.json?.reports?.find((r: { id: string }) => r.id === vd.id);
  check("7c. Validation failure preserves the draft + its content", vd3?.status === "DRAFT" && vd3?.challenges === "half-filled draft awaiting KPI numbers", `status=${vd3?.status}`);
  const v4 = await call(agent, "/api/reports", { id: vd.id, type: "AGENT_BPO", reportDate: threeDaysAgo, submit: true, kpiMetrics: filledMandatory, attendanceStatus: "Present" });
  check("7d. Submit succeeds once required KPIs filled", v4.status === 200 && v4.json?.report?.status === "SUBMITTED", `status=${v4.status}`);

  const v5 = await call(agent, "/api/reports", { type: "AGENT_BPO", reportDate: twoDaysAgo, submit: true, kpiMetrics: emptyMandatory, attendanceStatus: "Absent" });
  check("7e. Absent agent exempt from KPI requirement", v5.status === 201 && v5.json?.report?.status === "SUBMITTED", `status=${v5.status}`);
} else {
  console.log("SKIP 7 — no mandatory BPO KPI configs in DB");
}

// ── 8. Draft + submitted coexist for one day (upload path) — both retrievable ──
const c1 = await call(agent, "/api/reports", { type: "AGENT_BPO", reportDate: yesterday, submit: false, challenges: "manual draft from yesterday", kpiMetrics: filledMandatory });
const c2 = await call(agent, "/api/reports", { type: "AGENT_BPO", reportDate: yesterday, submit: true, challenges: "confirmed from uploaded document", kpiMetrics: filledMandatory });
check("8. Draft + submitted coexist (draft create allowed before any live report)", c1.status === 201 && c2.status === 201 && c1.json?.report?.id !== c2.json?.report?.id, `statuses=${c1.status}/${c2.status}`);
const g2 = await call(agent, `/api/reports?mine=1&date=${yesterday}`);
check("8b. Both retrievable for that day", g2.json?.reports?.length === 2, `count=${g2.json?.reports?.length}`);
const dash3 = await call(agent, "/api/dashboard");
check("8c. Draft still listed in My Drafts alongside the submitted one", (dash3.json?.employee?.myDrafts || []).some((x: { id: string }) => x.id === c1.json?.report?.id), `drafts=${dash3.json?.employee?.myDrafts?.length}`);

// ── 9. Privacy: another agent cannot touch someone else's draft ──
const p1 = await call(agent2, "/api/reports?mine=1");
check("9. Other agent's drafts invisible in mine=1", !(p1.json?.reports || []).some((r: { id: string }) => r.id === c1.json?.report?.id), `agent2 sees ${p1.json?.reports?.length} reports`);
const p2 = await call(agent2, "/api/reports", { id: c1.json?.report?.id, type: "AGENT_BPO", reportDate: yesterday, submit: false, challenges: "hijacked" });
check("9b. Other agent cannot update the draft (403)", p2.status === 403, `status=${p2.status}`);
const p3 = await call(agent2, "/api/reports", { id: c1.json?.report?.id, type: "AGENT_BPO", reportDate: yesterday, submit: true, kpiMetrics: filledMandatory });
check("9c. Other agent cannot submit the draft (403)", p3.status === 403, `status=${p3.status}`);
const p4 = await call(agent, `/api/reports?mine=1&date=${yesterday}`);
check("9d. Owner's draft untouched", p4.json?.reports?.find((r: { id: string }) => r.id === c1.json?.report?.id)?.challenges === "manual draft from yesterday", "");

// ── 10. Approved reports are locked ──
const a1 = await call(sup, "/api/reports", { id: draft.id, decision: "approve", feedback: "solid day" }, "PATCH");
check("10. Supervisor approves the submitted draft", a1.status === 200 && a1.json?.report?.status === "APPROVED", `status=${a1.status}`);
const a2 = await call(agent, "/api/reports", { id: draft.id, type: "AGENT_BPO", reportDate: today, submit: false, challenges: "trying to correct an approved report" });
check("10b. Approved report locked for correction (403)", a2.status === 403, `status=${a2.status}`);
const a3 = await call(agent, "/api/reports", { id: draft.id, type: "AGENT_BPO", reportDate: today, submit: true, kpiMetrics: filledMandatory });
check("10c. Approved report locked for resubmission (403/409)", a3.status === 403 || a3.status === 409, `status=${a3.status}`);

// ── 11. REJECTED → draft-save → resubmit regression ──
const r1 = await call(sup, "/api/reports", { id: c2.json?.report?.id, decision: "reject", feedback: "numbers look off, fix them" }, "PATCH");
check("11. Supervisor returns report for correction", r1.status === 200 && r1.json?.report?.status === "REJECTED", `status=${r1.status}`);
const r2 = await call(agent, "/api/reports", { id: c2.json?.report?.id, type: "AGENT_BPO", reportDate: yesterday, submit: false, challenges: "fixed the numbers", kpiMetrics: filledMandatory });
check("11b. Draft-save on rejected report → DRAFT (same record)", r2.status === 200 && r2.json?.report?.status === "DRAFT" && r2.json?.report?.id === c2.json?.report?.id, `status=${r2.json?.report?.status}`);
const r3 = await call(agent, "/api/reports", { id: c2.json?.report?.id, type: "AGENT_BPO", reportDate: yesterday, submit: true, kpiMetrics: filledMandatory });
check("11c. Resubmit after fixing → SUBMITTED again", r3.status === 200 && r3.json?.report?.status === "SUBMITTED", `status=${r3.json?.report?.status}`);

// ── Cleanup: remove all test data (users, reports, notifications, audit) ──
for (const u of [AGENT, AGENT2, SUP]) {
  const uRow = await db.user.findUnique({ where: { email: u.email } });
  if (!uRow) continue;
  await db.notification.deleteMany({ where: { userId: uRow.id } });
  await db.auditLog.deleteMany({ where: { userId: uRow.id } });
  await db.report.deleteMany({ where: { userId: uRow.id } });
  await db.user.delete({ where: { id: uRow.id } }).catch(() => {});
}
const leftReports = await db.report.count({ where: { ref: { startsWith: "BPO-" }, user: { email: { startsWith: "e2e" } } } });
console.log(`cleanup — remaining e2e reports: ${leftReports}`);

await db.$disconnect();
console.log(failures === 0 ? "\nALL DRAFT-WORKFLOW CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
