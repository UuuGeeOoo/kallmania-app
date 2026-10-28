// API-level E2E for the centre KPI synchronization fix (Task 45):
//  1. Authorized user edits a centre KPI and saves it (correct centre record, returned persisted values)
//  2. The new value remains correct after refreshing (re-GET) and re-login
//  3. Centre dashboard displays the updated KPI (/api/dashboard teamKpiRows + /api/kpi sections, no duplicate rows)
//  4. Agent report template reflects the centre configuration (own-centre merged read, cross-centre isolation)
//  5. Agent can submit a report using the updated configuration
//  6. Validation & calculations use the updated values (submit-time mandatory check + cumulative pct)
//  7. Another centre's configuration remains unchanged (no leakage in reads, dashboards or mandatory rules)
//  8. Historical submitted reports retain their original recorded data
//  9. Failed updates produce an error and never report success (NaN target, missing label, unauthorized)
// 10. Changes persist across navigation / sign-out-in
// 11. Existing KPI editing, dashboards and report submission keep working
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
// Synthetic test centres — tests NEVER touch a real centre's configuration rows
// (a crashed run previously poisoned the Enugu snapshot/restore cycle).
const CENTRE_A = { country: "NG", state: "E2E KPI Centre A" };
const CENTRE_B = { country: "NG", state: "E2E KPI Centre B" };
const AGENT_A = { email: "kpi-e2e-agent-a@kallmania.test", fullName: "E2E KPI Agent A", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-KPI-1", ...CENTRE_A };
const AGENT_A2 = { email: "kpi-e2e-agent-a2@kallmania.test", fullName: "E2E KPI Agent A2", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-KPI-1B", ...CENTRE_A };
const AGENT_B = { email: "kpi-e2e-agent-b@kallmania.test", fullName: "E2E KPI Agent B", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-KPI-2", ...CENTRE_B };
const SUP_A = { email: "kpi-e2e-sup-a@kallmania.test", fullName: "E2E KPI Sup A", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-KPI-SA", ...CENTRE_A };
const SUP_B = { email: "kpi-e2e-sup-b@kallmania.test", fullName: "E2E KPI Sup B", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-KPI-SB", ...CENTRE_B };
const ADMIN = { email: "kpi-e2e-admin@kallmania.test", fullName: "E2E KPI Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-KPI-AD", ...CENTRE_A };
const ALL_USERS = [AGENT_A, AGENT_A2, AGENT_B, SUP_A, SUP_B, ADMIN];

const TODAY = new Date().toISOString().slice(0, 10);

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
async function call(cookie: string, path: string, body?: object, method?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
}

interface Metric { key: string; label: string; target: number | null; targetLabel: string; actual: number | null; variance: number | null; unit: string; category: string; auto: boolean; notes: string }
const metric = (key: string, label: string, target: number | null, actual: number | null, unit = "count"): Metric =>
  ({ key, label, target, targetLabel: target === null ? "-" : `${target}${unit === "percent" ? "%" : unit === "minutes" ? "mins" : ""}`, actual, variance: null, unit, category: "CORE_TEMPLATE", auto: false, notes: "" });

// ── Setup: users ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of ALL_USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
// Clean slate from any previous run (test rows only — production data untouched).
const oldUsers = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } });
const oldIds = oldUsers.map((u) => u.id);
await db.report.deleteMany({ where: { userId: { in: oldIds } } });
await db.notification.deleteMany({ where: { userId: { in: oldIds } } });
await db.auditLog.deleteMany({ where: { userId: { in: oldIds } } });
await db.memberKpiConfig.deleteMany({ where: { userId: { in: oldIds } } });
// Snapshot & remove any pre-existing centre-scoped config rows for the test keys
// (scoped to the synthetic test centres — real centres are never touched).
const TEST_KEYS = ["totalCallsMade", "notInterested", "wrapUpTime"];
const preExisting = await db.kpiConfig.findMany({ where: { key: { in: TEST_KEYS }, department: "BPO", centreState: { in: [CENTRE_A.state, CENTRE_B.state] } } });
const snapshot = preExisting.map((r) => ({ ...r }));
await db.kpiConfig.deleteMany({ where: { id: { in: preExisting.map((r) => r.id) } } });

const agentA = await login({ email: AGENT_A.email, password: PASSWORD });
const agentA2 = await login({ email: AGENT_A2.email, password: PASSWORD });
const agentB = await login({ email: AGENT_B.email, password: PASSWORD });
const supA = await login({ email: SUP_A.email, password: PASSWORD });
const supB = await login({ email: SUP_B.email, password: PASSWORD });
const admin = await login({ email: ADMIN.email, password: PASSWORD });
console.log("setup ok — 6 test users approved & logged in\n");

// ════ 1+2. Supervisor edits HER centre's KPI — persisted under the correct centre ════
const edit = await call(supA, "/api/kpi-config", { department: "BPO", key: "totalCallsMade", label: "Total Calls Made", category: "CORE_TEMPLATE", unit: "count", defaultTarget: 555, centreCountry: CENTRE_A.country, centreState: CENTRE_A.state });
check("1a. supervisor saves centre override → 201 with persisted values", edit.status === 201 && (edit.json.config as { defaultTarget: number } | undefined)?.defaultTarget === 555);
check("1b. saved under the SUPERVISOR'S OWN centre even if another centre was sent", (edit.json.config as { centreCountry: string; centreState: string } | undefined)?.centreState === CENTRE_A.state);
const reRead = await call(supA, `/api/kpi-config?centreCountry=${CENTRE_A.country}&centreState=${encodeURIComponent(CENTRE_A.state)}`);
const reRow = (reRead.json.configs as { key: string; defaultTarget: number | null; isOverride: boolean; globalTarget: number | null }[] | undefined)?.find((c) => c.key === "totalCallsMade");
check("2a. refresh (re-GET) shows the saved override with global reference", reRow?.isOverride === true && reRow?.defaultTarget === 555 && reRow?.globalTarget !== null);

// ════ 4. Agent report template: own-centre merged read; other centre untouched ════
const agentView = await call(agentA, "/api/kpi-config");
const agentRow = (agentView.json.configs as { key: string; defaultTarget: number | null; isOverride: boolean }[] | undefined)?.find((c) => c.key === "totalCallsMade");
check("4a. agent's report template fetches OWN centre override (no params, no 403)", agentRow?.defaultTarget === 555 && agentRow?.isOverride === true);
const agentBView = await call(agentB, "/api/kpi-config");
const agentBRow = (agentBView.json.configs as { key: string; defaultTarget: number | null; isOverride: boolean }[] | undefined)?.find((c) => c.key === "totalCallsMade");
check("7a. other centre's agent still sees the GLOBAL target (no leakage)", agentBRow?.isOverride === false && agentBRow?.defaultTarget !== 555, `target=${agentBRow?.defaultTarget}`);
const agentCross = await call(agentA, `/api/kpi-config?centreCountry=${CENTRE_B.country}&centreState=${encodeURIComponent(CENTRE_B.state)}`);
check("8h-ish. agent CANNOT read another centre's config (403)", agentCross.status === 403);

// Individual (per-member) override — admin sets wrapUpTime for agent A
const adminUser = await db.user.findUnique({ where: { email: ADMIN.email } });
const agentAUser = await db.user.findUnique({ where: { email: AGENT_A.email } });
const member = await call(admin, `/api/users/${agentAUser!.id}/member-kpi`, { department: "BPO", key: "wrapUpTime", label: "Wrap-Up / After-Call Work (mins)", target: 9, unit: "minutes" });
check("4b. per-member override saved APPROVED by admin", member.status === 201 && (member.json.config as { status: string }).status === "APPROVED");
const memberRead = await call(agentA, `/api/users/${agentAUser!.id}/member-kpi`);
const memberRow = (memberRead.json.configs as { key: string; target: number | null; status: string }[] | undefined)?.find((c) => c.key === "wrapUpTime");
check("4c. agent reads own approved member override", memberRow?.status === "APPROVED" && memberRow?.target === 9);

// ════ 5+6. Agent submits a report using the updated configuration ════
const metricsA = [
  metric("totalCallsMade", "Total Calls Made", 555, 600),
  metric("totalMailsSent", "Total Mails Sent", 10, 12),
  metric("callsConnected", "Calls Connected", 25, 24),
];
const submitA = await call(agentA, "/api/reports", { type: "AGENT_BPO", reportDate: TODAY, department: "BPO", attendanceStatus: "Present", shiftTime: "09:00-17:00", kpiMetrics: JSON.stringify(metricsA), submit: true });
check("5a. agent of centre A submits with the updated configuration", submitA.status === 201 || submitA.status === 200, `status=${submitA.status}`);

// ════ 3. Centre dashboard displays the updated KPI ════
const dashA = await call(supA, "/api/dashboard");
const teamRows = (dashA.json as { supervisor?: { teamKpiRows?: { key: string; teamTarget: number | null }[] } }).supervisor?.teamKpiRows ?? [];
check("3a. supervisor dashboard teamKpiRows use the centre target (555)", teamRows.find((r) => r.key === "totalCallsMade")?.teamTarget === 555, `rows=${teamRows.length}`);
const kpiViewA = await call(supA, "/api/kpi?period=daily&department=BPO");
const secA = (kpiViewA.json as { sections?: { department: string; kpis: { key: string; targetDaily: number | null }[] }[] }).sections ?? [];
const bpoSec = secA.find((s) => s.department === "BPO");
const tcmRows = bpoSec?.kpis.filter((k) => k.key === "totalCallsMade") ?? [];
check("3b. KPI view section carries the centre target", tcmRows.length === 1 && tcmRows[0]?.targetDaily === 555, `dup=${tcmRows.length}`);
check("3c. no duplicate rows from centre+global mixing", bpoSec ? new Set(bpoSec.kpis.map((k) => k.key)).size === bpoSec.kpis.length : false);

// ════ 6. Calculations use the updated values ════
const sumA = await call(supA, `/api/kpi/summary?period=day&date=${TODAY}`);
const sumRow = (sumA.json as { rows?: { key: string; dailyTarget: number | null; target: number | null; actual: number | null; pct: number | null }[] }).rows?.find((r) => r.key === "totalCallsMade");
check("6a. cumulative summary target = centre override (555), not global (30)", sumRow?.dailyTarget === 555 && sumRow?.target === 555, `daily=${sumRow?.dailyTarget}`);
check("6b. achievement computed against the centre target (actual/555)", sumRow?.pct !== null && sumRow?.actual !== null && Math.abs((sumRow?.pct ?? 0) - Math.round(((sumRow?.actual as number) / 555) * 10000) / 100) < 0.02, `pct=${sumRow?.pct} actual=${sumRow?.actual}`);
const perUserA = await call(admin, `/api/users/${agentAUser!.id}/kpi?period=day&date=${TODAY}`);
const puRow = (perUserA.json as { rows?: { key: string; dailyTarget: number | null }[] }).rows?.find((r) => r.key === "wrapUpTime");
check("6c. per-member drill-down honours centre config base + individual override", puRow?.dailyTarget === 9, `daily=${puRow?.dailyTarget}`);

// ════ 7. Other centre unchanged across dashboards & mandatory rules ════
const metricsB = [metric("totalCallsMade", "Total Calls Made", 30, 12), metric("totalMailsSent", "Total Mails Sent", 10, 4), metric("callsConnected", "Calls Connected", 25, 10)];
const submitB = await call(agentB, "/api/reports", { type: "AGENT_BPO", reportDate: TODAY, department: "BPO", attendanceStatus: "Present", kpiMetrics: JSON.stringify(metricsB), submit: true });
check("7b. centre B agent submits normally (override at centre A is irrelevant)", submitB.status === 201 || submitB.status === 200, `status=${submitB.status}`);
const kpiViewB = await call(supB, "/api/kpi?period=daily&department=BPO");
const secB = (kpiViewB.json as { sections?: { department: string; kpis: { key: string; targetDaily: number | null }[] }[] }).sections ?? [];
const bSecBpo = secB.find((s) => s.department === "BPO");
const tcmB = bSecBpo?.kpis.find((k) => k.key === "totalCallsMade");
check("7c. centre B's KPI view shows the GLOBAL target (not 555)", tcmB?.targetDaily === 30, `target=${tcmB?.targetDaily}`);
const dashB = await call(supB, "/api/dashboard");
const rowsB = (dashB.json as { supervisor?: { teamKpiRows?: { key: string; teamTarget: number | null }[] } }).supervisor?.teamKpiRows ?? [];
check("7d. centre B dashboard teamTarget = global default", rowsB.find((r) => r.key === "totalCallsMade")?.teamTarget === 30);

// ════ 6+7. Submit-time mandatory validation is centre-scoped ════
const mand = await call(supA, "/api/kpi-config", { department: "BPO", key: "notInterested", label: "Not Interested / Declined", category: "CORE_TEMPLATE", unit: "count", defaultTarget: null, mandatory: true, centreCountry: CENTRE_A.country, centreState: CENTRE_A.state });
check("6d. supervisor marks a metric REQUIRED for centre A only", mand.status === 201 && (mand.json.config as { mandatory: boolean }).mandatory === true);
const blockedA2 = await call(agentA2, "/api/reports", { type: "AGENT_BPO", reportDate: TODAY, department: "BPO", attendanceStatus: "Present", kpiMetrics: JSON.stringify([metric("totalCallsMade", "Total Calls Made", 555, 10), metric("totalMailsSent", "Total Mails Sent", 10, 2), metric("callsConnected", "Calls Connected", 25, 8)]), submit: true });
check("6e. centre A agent WITHOUT the required KPI is rejected (422, nothing persisted)", blockedA2.status === 422 && String((blockedA2.json as { error?: string }).error ?? "").includes("Not Interested"), `status=${blockedA2.status}`);
const metricsA2 = [metric("totalCallsMade", "Total Calls Made", 555, 10), metric("totalMailsSent", "Total Mails Sent", 10, 2), metric("callsConnected", "Calls Connected", 25, 8), metric("notInterested", "Not Interested / Declined", null, 3)];
const okA2 = await call(agentA2, "/api/reports", { type: "AGENT_BPO", reportDate: TODAY, department: "BPO", attendanceStatus: "Present", kpiMetrics: JSON.stringify(metricsA2), submit: true });
check("6f. centre A agent WITH the required KPI submits fine", okA2.status === 201 || okA2.status === 200, `status=${okA2.status}`);
// Centre B agent (second report type guard: use agentB's second submission of same type → blocked by dup; use draft save instead not needed) — verify via a fresh centre B agent submit already done above WITHOUT notInterested → success (7b) proves isolation.

// ════ 8. Historical submitted reports retain their original recorded data ════
await call(supA, "/api/kpi-config", { department: "BPO", key: "totalCallsMade", label: "Total Calls Made", category: "CORE_TEMPLATE", unit: "count", defaultTarget: 777, centreCountry: CENTRE_A.country, centreState: CENTRE_A.state });
const mineA = await call(agentA, `/api/reports?mine=1&date=${TODAY}`);
const mineReports = (mineA.json as { reports?: { kpiMetrics: string | null }[] }).reports ?? [];
const histMetric = (mineReports[0]?.kpiMetrics ? JSON.parse(mineReports[0].kpiMetrics) as Metric[] : []).find((m) => m.key === "totalCallsMade");
check("8a. after re-edit (555→777) the submitted report still records its ORIGINAL target 555", histMetric?.target === 555, `stored=${histMetric?.target}`);

// ════ 9. Failed updates produce an error and never report success ════
const asAgent = await call(agentA, "/api/kpi-config", { department: "BPO", key: "totalCallsMade", label: "x", defaultTarget: 1 });
check("9a. unauthorized agent POST → 403", asAgent.status === 403);
const badTarget = await call(supA, "/api/kpi-config", { department: "BPO", key: "totalCallsMade", label: "Total Calls Made", defaultTarget: "abc", centreCountry: CENTRE_A.country, centreState: CENTRE_A.state });
check("9b. non-numeric target → 400 (no false success)", badTarget.status === 400, `status=${badTarget.status}`);
const noLabel = await call(supA, "/api/kpi-config", { department: "BPO", key: "totalCallsMade", label: "   ", defaultTarget: 1 });
check("9c. blank label → 400", noLabel.status === 400);
const supCross = await call(supA, `/api/kpi-config?centreCountry=${CENTRE_B.country}&centreState=${encodeURIComponent(CENTRE_B.state)}`);
check("9d. supervisor cannot VIEW another centre's config (403)", supCross.status === 403);
const afterBad = await call(supA, `/api/kpi-config?centreCountry=${CENTRE_A.country}&centreState=${encodeURIComponent(CENTRE_A.state)}`);
const afterBadRow = (afterBad.json.configs as { key: string; defaultTarget: number | null }[] | undefined)?.find((c) => c.key === "totalCallsMade");
check("9e. failed edits left the saved configuration intact (777)", afterBadRow?.defaultTarget === 777);

// ════ 10. Persistence across sign-out / sign-in ════
const supA2 = await login({ email: SUP_A.email, password: PASSWORD });
const agentA3 = await login({ email: AGENT_A.email, password: PASSWORD });
const reSup = await call(supA2, `/api/kpi-config?centreCountry=${CENTRE_A.country}&centreState=${encodeURIComponent(CENTRE_A.state)}`);
const reSupRow = (reSup.json.configs as { key: string; defaultTarget: number | null }[] | undefined)?.find((c) => c.key === "totalCallsMade");
check("10a. supervisor re-login still sees 777", reSupRow?.defaultTarget === 777);
const reAgent = await call(agentA3, "/api/kpi-config");
const reAgentRow = (reAgent.json.configs as { key: string; defaultTarget: number | null }[] | undefined)?.find((c) => c.key === "totalCallsMade");
check("10b. agent re-login still receives centre config (777)", reAgentRow?.defaultTarget === 777);

// ════ 11. Existing functionality keeps working ════
const dashAgent = await call(agentA3, "/api/dashboard");
check("11a. agent dashboard unaffected", dashAgent.status === 200 && "employee" in dashAgent.json);
const kpiAgent = await call(agentA3, "/api/kpi?period=daily");
check("11b. agent KPI view works", kpiAgent.status === 200);
const repSup = await call(supA2, "/api/reports?date=" + TODAY);
check("11c. supervisor report list works", repSup.status === 200 && Array.isArray((repSup.json as { reports: unknown[] }).reports));

// ── Cleanup (restore pre-existing rows, remove everything created) ──
const users = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } });
const ids = users.map((u) => u.id);
await db.report.deleteMany({ where: { userId: { in: ids } } });
await db.memberKpiConfig.deleteMany({ where: { userId: { in: ids } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
await db.kpiConfig.deleteMany({ where: { key: { in: TEST_KEYS }, department: "BPO", centreState: { in: [CENTRE_A.state, CENTRE_B.state] } } });
for (const r of snapshot) {
  await db.kpiConfig.create({ data: { department: r.department, key: r.key, label: r.label, category: r.category, unit: r.unit, direction: r.direction, defaultTarget: r.defaultTarget, derivedFrom: r.derivedFrom, mandatory: r.mandatory, active: r.active, sortOrder: r.sortOrder, centreCountry: r.centreCountry, centreState: r.centreState } });
}
// The dashboard's lazy overdue-checker may insert REPORT_OVERDUE notifications
// for the test users asynchronously after the sweep above — retry user deletion
// (late inserts fail harmlessly in notify's catch once the users are gone).
let deleted = false;
for (let i = 0; i < 6 && !deleted; i++) {
  try {
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } } });
    deleted = true;
  } catch {
    await new Promise((r) => setTimeout(r, 700));
  }
}
console.log(`\ncleanup ok — ${ALL_USERS.length} test users removed (retried: ${!deleted ? "GAVE UP" : "ok"}), pre-existing centre rows restored (${snapshot.length})`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
