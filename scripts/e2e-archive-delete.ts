// API-level E2E for ADMIN report deletion from the Reports Archive:
//  1. Only ADMIN can delete — supervisor and agent attempts are refused (403)
//  2. Admin DELETE ?id= removes the row permanently (gone from db AND the
//     archive feed), notifies the owner (REPORT_DELETED) and audits the removal
//  3. Bulk { ids: [...] } deletes many at once; unknown ids are skipped silently
//  4. Missing id → 400; unknown single id → 404
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
const CENTRE = { country: "NG", state: "Enugu" };
const AGENT = { email: "arc-del-agent@kallmania.test", fullName: "E2E Archive Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-ARC-1", ...CENTRE };
const SUP = { email: "arc-del-sup@kallmania.test", fullName: "E2E Archive Sup", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ARC-2", ...CENTRE };
const ADMIN = { email: "arc-del-admin@kallmania.test", fullName: "E2E Archive Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-ARC-3", ...CENTRE };
const ALL_USERS = [AGENT, SUP, ADMIN];

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

// ── Setup ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of ALL_USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const ids = (await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } })).map((u) => u.id);
// Clean slate from any previous run.
await db.report.deleteMany({ where: { userId: { in: ids }, ref: { startsWith: "ARCE2E-" } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.auditLog.deleteMany({ where: { userId: { in: ids } } });

const agent = await db.user.findUnique({ where: { email: AGENT.email } });
const stamp = Date.now().toString(36).toUpperCase();
const mk = (n: number, status: string) => ({
  ref: `ARCE2E-${stamp}-${n}`, userId: agent!.id, type: "AGENT_BPO", department: "BPO",
  status, reportDate: new Date("2026-01-10T00:00:00.000Z"), kpiMetrics: "[]",
});
const R1 = await db.report.create({ data: mk(1, "APPROVED") });
const R2 = await db.report.create({ data: mk(2, "SUBMITTED") });
const R3 = await db.report.create({ data: mk(3, "SUBMITTED") });

const agentCookie = await login({ email: AGENT.email, password: PASSWORD });
const supCookie = await login({ email: SUP.email, password: PASSWORD });
const adminCookie = await login({ email: ADMIN.email, password: PASSWORD });
console.log("setup ok — 3 test users approved + 3 archive reports created");

// ── §1: who may delete ──
const agentDel = await call(agentCookie, `/api/reports?id=${R1.id}`, undefined, "DELETE");
check("1a. agent DELETE → 403", agentDel.status === 403, `status=${agentDel.status}`);
const supDel = await call(supCookie, `/api/reports?id=${R1.id}`, undefined, "DELETE");
check("1b. supervisor DELETE → 403 (review, never destroy)", supDel.status === 403, `status=${supDel.status}`);
const noId = await call(adminCookie, "/api/reports", undefined, "DELETE");
check("1c. admin DELETE with no id → 400", noId.status === 400, `status=${noId.status}`);
const stillThere = await db.report.count({ where: { id: R1.id } });
check("1d. refused/invalid attempts left the report untouched", stillThere === 1);

// ── §2: admin deletes a single report ──
const del = await call(adminCookie, `/api/reports?id=${R1.id}`, undefined, "DELETE");
check("2a. admin DELETE ?id= → 200 deleted:1", del.status === 200 && (del.json as { deleted?: number }).deleted === 1, `status=${del.status}`);
const gone = await db.report.count({ where: { id: R1.id } });
check("2b. the report row is GONE from the database", gone === 0);
const feed = await call(adminCookie, "/api/reports");
check("2c. the archive feed no longer lists the deleted report", !(feed.json.reports as { id: string }[] | undefined)?.some((r) => r.id === R1.id));
const ownerNotif = await db.notification.findFirst({ where: { userId: agent!.id, type: "REPORT_DELETED" } });
check("2d. the owner was notified (REPORT_DELETED, refs the report)", !!ownerNotif && (ownerNotif.title || "").includes(R1.ref), ownerNotif?.title || "none");
const adminUser = await db.user.findUnique({ where: { email: ADMIN.email } });
const auditRow = await db.auditLog.findFirst({ where: { userId: adminUser!.id, action: "DELETE_REPORT" } });
check("2e. the removal landed in the audit trail", !!auditRow && (auditRow.details || "").includes(R1.ref), auditRow?.details || "none");

// ── §3: bulk delete skips unknown ids ──
const bulk = await call(adminCookie, "/api/reports", { ids: [R2.id, R3.id, "nonexistent-cuid"] }, "DELETE");
check("3a. bulk { ids: [2 live + 1 unknown] } → 200 deleted:2", bulk.status === 200 && (bulk.json as { deleted?: number }).deleted === 2, `status=${bulk.status}`);
const remaining = await db.report.count({ where: { id: { in: [R2.id, R3.id] } } });
check("3b. both live reports are gone from the database", remaining === 0);

// ── §4: unknown single id ──
const missing = await call(adminCookie, "/api/reports?id=nonexistent-cuid", undefined, "DELETE");
check("4a. admin DELETE of unknown id → 404", missing.status === 404, `status=${missing.status}`);

// ── Cleanup ──
await db.report.deleteMany({ where: { userId: { in: ids }, ref: { startsWith: "ARCE2E-" } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: ids } } } });
await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
await db.user.deleteMany({ where: { id: { in: ids } } });
console.log(`cleanup ok — ${ids.length} test users + their reports removed (real data untouched)`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
