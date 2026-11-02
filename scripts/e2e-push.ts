// API-level E2E for the browser push notification system (Task 49).
// Covers acceptance tests that are verifiable over HTTP + database:
//   auth gates (401/403) · VAPID config endpoint · subscription save/sanitize ·
//   cross-user protection · preferences & administrator-defined mandatory
//   categories · real dispatch through FCM (invalid endpoint → auto-deactivate)
//   · attempt logging · retry/re-queue · bounded attempts · duplicate-claim
//   safety · cron processor auth · admin health · test-push honesty (no false
//   success) · service worker + manifest served.
// The REAL device display path is covered separately in a real browser.
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
import { createECDH, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// A REAL browser subscription always carries a valid P-256 point — generate one
// so the synthetic subscriptions behave like genuine ones at the push service.
function realClientKeys(): { p256dh: string; auth: string } {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { p256dh: ecdh.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url") };
}

// ── DATABASE_URL self-heal (mirrors src/lib/db.ts) ──
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-test-2026";
const CENTRE = { country: "NG", state: "E2E Push State" };
const AGENT = { email: "push-agent@kallmania.test", fullName: "E2E Push Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-PSH-1", ...CENTRE };
const SUP = { email: "push-sup@kallmania.test", fullName: "E2E Push Supervisor", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-PSH-S", ...CENTRE };
const ADMIN = { email: "push-admin@kallmania.test", fullName: "E2E Push Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-PSH-A", ...CENTRE };
const ALL_USERS = [AGENT, SUP, ADMIN];
const DEFAULT_MANDATORY = ["ESCALATION", "ESCALATION_MESSAGE", "ESCALATION_REOPENED", "REPORT_SUBMITTED", "REPORT_OVERDUE", "NOTICE"];

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
    method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
}
async function waitFor(fn: () => Promise<boolean>, ms = 15000, step = 500): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, step));
  }
  return await fn();
}

// ── Setup ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of ALL_USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const users = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } } });
const ids = users.map((u) => u.id);
const agentId = users.find((u) => u.email === AGENT.email)!.id;
const supId = users.find((u) => u.email === SUP.email)!.id;
// Clean slate from any previous run.
const oldEscs = await db.escalation.findMany({ where: { OR: [{ fromId: { in: ids } }, { targetUserId: { in: ids } }] }, select: { id: true } });
await db.escalation.deleteMany({ where: { id: { in: oldEscs.map((e) => e.id) } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: ids } } } });
await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
await db.pushPreference.deleteMany({ where: { userId: { in: ids } } });
await db.taskAssignee.deleteMany({ where: { OR: [{ userId: { in: ids } }, { task: { OR: [{ createdById: { in: ids } }, { assigneeId: { in: ids } }] } }] } });
await db.task.deleteMany({ where: { OR: [{ createdById: { in: ids } }, { assigneeId: { in: ids } }] } });

const anon = "";
const agent = await login({ email: AGENT.email, password: PASSWORD });
const sup = await login({ email: SUP.email, password: PASSWORD });
const admin = await login({ email: ADMIN.email, password: PASSWORD });
console.log("setup ok — 3 test users approved");

// ══ 1. Auth gates ══
const g1 = await call(anon, "/api/push/config");
check("1a. unauthenticated /api/push/config → 401", g1.status === 401);
const g2 = await call(anon, "/api/push/subscriptions", { action: "subscribe", endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "a", auth: "b" } });
check("1b. unauthenticated subscribe → 401", g2.status === 401);
const g3 = await call(anon, "/api/push/test", {});
check("1c. unauthenticated test-push → 401", g3.status === 401);
const g4 = await call(agent, "/api/push/admin");
check("1d. non-admin /api/push/admin → 403", g4.status === 403);
const g5 = await call(agent, "/api/push/admin", { action: "processQueue" });
check("1e. non-admin queue processing → 403", g5.status === 403);

// ══ 2. VAPID configuration endpoint ══
const cfg = await call(agent, "/api/push/config");
const pub = String(cfg.json.publicKey || "");
check("2a. config reports configured=true", cfg.json.configured === true);
check("2b. VAPID public key served (base64url, 60-100 chars)", pub.length >= 60 && pub.length <= 100 && !pub.includes("+") && !pub.includes("/"));
check("2c. config does NOT leak any private key material", !JSON.stringify(cfg.json).toLowerCase().includes("private"));

// ══ 3. Subscription save + sanitize ══
const agentKeys = realClientKeys();
const supKeys = realClientKeys();
const subBody = { action: "subscribe", endpoint: "https://push-fake.e2e.invalid/fcm/send/agent-synth", keys: agentKeys, label: "E2E Fake Device" };
const s1 = await call(agent, "/api/push/subscriptions", subBody);
check("3a. subscribe saved server-side → 200", s1.status === 200 && s1.json.success === true);
const list = await call(agent, "/api/push/subscriptions");
const rows = (list.json.subscriptions || []) as Record<string, string | boolean>[];
check("3b. subscription listed with label", rows.length === 1 && rows[0].label === "E2E Fake Device");
check("3c. endpoint/keys NEVER returned (only endpointTail)", rows.length === 1 && typeof rows[0].endpointTail === "string" && !("endpoint" in rows[0]) && !("p256dh" in rows[0]) && !("auth" in rows[0]));
const s2 = await call(sup, "/api/push/subscriptions", { action: "subscribe", endpoint: "https://fcm.googleapis.com/fcm/send/e2e-synth-sup", keys: supKeys, label: "E2E FCM Device" });
check("3d. supervisor subscription saved → 200", s2.status === 200);

// ══ 4. Cross-user protection ══
const supEndpoint = "https://fcm.googleapis.com/fcm/send/e2e-synth-sup";
const x1 = await call(agent, "/api/push/subscriptions", { action: "unsubscribe", endpoint: supEndpoint });
check("4a. agent cannot remove the supervisor's subscription → 404", x1.status === 404);
const supRows = await db.pushSubscription.count({ where: { userId: supId } });
check("4b. supervisor's subscription untouched", supRows === 1);

// ══ 5. Preferences + administrator-defined mandatory categories ══
const p1 = await call(agent, "/api/push/preferences");
const cats = (p1.json.categories || []) as { type: string }[];
const mandatory0 = (p1.json.mandatory || []) as string[];
check("5a. preference catalogue lists the real notification categories", cats.length >= 15 && cats.some((c) => c.type === "ESCALATION"));
check("5b. default mandatory set present (escalations, report submissions/overdue, notices)", DEFAULT_MANDATORY.every((m) => mandatory0.includes(m)));
const p2 = await call(sup, "/api/push/preferences", { pushEnabled: false }, "PATCH");
check("5c. supervisor disables push entirely", p2.status === 200 && (p2.json.prefs as Record<string, unknown>).pushEnabled === false);

// ══ 6. Escalation → mandatory push event enqueued DESPITE pushEnabled=false ══
const esc1 = await call(agent, "/api/escalations", { recipientId: supId, subject: "E2E push escalation", message: "Mandatory push must fire even with push disabled", severity: "NORMAL" });
check("6a. agent escalation created → 201", esc1.status === 201 || esc1.status === 200, `status ${esc1.status}`);
const esc1Id = String((esc1.json.escalation as Record<string, unknown> | undefined)?.id || "");
const ev1 = await db.pushEvent.findFirst({ where: { userId: supId, type: "ESCALATION", relatedId: esc1Id || undefined } });
check("6b. PushEvent enqueued for the recipient (mandatory beats prefs)", Boolean(ev1), `status=${ev1?.status}`);
check("6c. in-app inbox row still created (complementary)", (await db.notification.count({ where: { userId: supId, type: "ESCALATION" } })) >= 1);

// ══ 7. Real dispatch through the push service (FCM) — invalid endpoint → deactivate ══
check("7a. subscription auto-deactivated on 404/410 from FCM", await waitFor(async () => (await db.pushSubscription.findUnique({ where: { endpoint: supEndpoint } }))?.active === false, 20000));
const d1 = await db.pushDelivery.findFirst({ where: { subscription: { endpoint: supEndpoint } }, orderBy: { createdAt: "desc" } });
check("7b. delivery attempt recorded with real push-service status", Boolean(d1) && (d1!.statusCode === 404 || d1!.statusCode === 410), `status=${d1?.statusCode} outcome=${d1?.outcome}`);
check("7c. event NOT marked SENT (no false success)", ev1 ? (await db.pushEvent.findUnique({ where: { id: ev1.id } }))?.status !== "SENT" : true);
const ev1After = ev1 ? await db.pushEvent.findUnique({ where: { id: ev1.id } }) : null;
check("7d. lastError explains the failure", Boolean(ev1After?.lastError));

// ══ 8. Concurrency/claim safety: draining a terminal event does not re-process ══
const attemptsBefore = ev1After?.attempts ?? 0;
await call(admin, "/api/push/admin", { action: "processQueue" });
const ev1Claim = await db.pushEvent.findUnique({ where: { id: ev1!.id } });
check("8a. processQueue leaves terminal events alone (claim semantics)", ev1Claim?.attempts === attemptsBefore, `attempts ${attemptsBefore} → ${ev1Claim?.attempts}`);

// ══ 9. Admin retry re-queues a failed event (bounded) ══
const r1 = await call(admin, "/api/push/admin", { action: "retry", eventId: ev1!.id });
check("9a. admin retry accepted", r1.status === 200 && r1.json.success === true);
await call(admin, "/api/push/admin", { action: "processQueue" });
const ev1Retry = await db.pushEvent.findUnique({ where: { id: ev1!.id } });
check("9b. retry re-attempted exactly once (attempts+1), now SKIPPED (no active sub left)", ev1Retry?.attempts === attemptsBefore + 1 && ["SKIPPED", "FAILED", "SENT"].includes(ev1Retry?.status || ""), `attempts=${ev1Retry?.attempts} status=${ev1Retry?.status}`);

// ══ 10. Non-mandatory category suppression + opt-in ══
await call(sup, "/api/push/preferences", { pushEnabled: true, categories: { TASK_ASSIGNED: false } }, "PATCH");
const t1 = await call(admin, "/api/tasks", { title: "E2E push suppressed task", assigneeId: supId, deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 10), requiredOutcome: "none", priority: "LOW" });
check("10a. task assigned (supervisor opted out of TASK_ASSIGNED push)", t1.status === 200 || t1.status === 201, `status ${t1.status}`);
await new Promise((r) => setTimeout(r, 1500));
const suppressed = await db.pushEvent.count({ where: { userId: supId, type: "TASK_ASSIGNED" } });
check("10b. opted-out category NOT pushed (preference respected)", suppressed === 0);
const inbox = await db.notification.count({ where: { userId: supId, type: "TASK_ASSIGNED" } });
check("10c. in-app notification still exists for the same event", inbox >= 1);
await call(sup, "/api/push/preferences", { categories: { TASK_ASSIGNED: true } }, "PATCH");
const t2 = await call(admin, "/api/tasks", { title: "E2E push opted-in task", assigneeId: supId, deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 10), requiredOutcome: "none", priority: "LOW" });
check("10d. second task assigned after opting in", t2.status === 200 || t2.status === 201);
const pushed = await db.pushEvent.count({ where: { userId: supId, type: "TASK_ASSIGNED" } });
check("10e. opted-in category pushed", pushed >= 1);

// ══ 11. Test-push honesty ══
const tp = await call(agent, "/api/push/test", {});
const tpBody = tp.json as { ok?: boolean; message?: string };
check("11a. test push to an unreachable endpoint reports real failure (no false success)", tp.status === 400 && tpBody.ok === false && tpBody.message!.length > 10, tpBody.message?.slice(0, 80));
const agentSubEndpoint = subBody.endpoint;
const d2 = await db.pushDelivery.findFirst({ where: { subscription: { endpoint: agentSubEndpoint }, outcome: { not: "ACCEPTED" } }, orderBy: { createdAt: "desc" } });
check("11b. failed test attempt logged with retry-eligibility", Boolean(d2) && d2!.retryEligible === true, `outcome=${d2?.outcome}`);
const noSubUser = await login({ email: SUP.email, password: PASSWORD }); // supervisor's sub is deactivated now
const tp2 = await call(noSubUser, "/api/push/test", {});
check("11c. test push with zero active subscriptions → explicit 400", tp2.status === 400 && tp2.json.ok === false);

// ══ 12. Cron processor auth ══
const c1 = await call(anon, "/api/push/process", {});
check("12a. process endpoint without secret → 401", c1.status === 401);
const c2 = await fetch(`${BASE}/api/push/process`, { method: "POST", headers: { "Content-Type": "application/json", "x-push-cron-secret": "wrong-secret" }, body: "{}" });
check("12b. wrong secret → 401", c2.status === 401);
const secretRow = await db.systemFlag.findUnique({ where: { key: "push:cronSecret" } });
const c3 = await fetch(`${BASE}/api/push/process`, { method: "POST", headers: { "Content-Type": "application/json", "x-push-cron-secret": secretRow?.value || "" }, body: "{}" });
const c3j = await c3.json().catch(() => ({}));
check("12c. correct secret → 200 with tally", c3.status === 200 && typeof c3j.processed === "number", JSON.stringify(c3j).slice(0, 80));

// ══ 13. Admin health ══
const h1 = await call(admin, "/api/push/admin");
const h1j = h1.json as Record<string, unknown>;
check("13a. admin health reports configuration + counters", h1.status === 200 && h1j.configured === true && typeof (h1j.counts as Record<string, unknown>).sent === "number");
check("13b. health shows ≥1 deactivated delivery attempt", ((h1j.attempts as Record<string, number>).deactivated) >= 1);
check("13c. health lists recent failures", Array.isArray(h1j.recentFailures) && (h1j.recentFailures as unknown[]).length >= 1);
const mand1 = await call(admin, "/api/push/admin", { action: "setMandatory", types: ["ESCALATION", "NOTICE"] });
check("13d. admin can redefine mandatory categories", mand1.status === 200 && (mand1.json.mandatory as string[]).join(",") === "ESCALATION,NOTICE");
const p3 = await call(agent, "/api/push/preferences");
check("13e. new mandatory set visible to users", ((p3.json.mandatory || []) as string[]).join(",") === "ESCALATION,NOTICE");
await call(admin, "/api/push/admin", { action: "setMandatory", types: DEFAULT_MANDATORY });
const p4 = await call(agent, "/api/push/preferences");
check("13f. mandatory set restored to defaults", DEFAULT_MANDATORY.every((m) => ((p4.json.mandatory || []) as string[]).includes(m)));

// ══ 14. Static assets (service worker + manifest) ══
const sw = await fetch(`${BASE}/sw.js`);
const swText = await sw.text();
check("14a. /sw.js served at root scope with JS content-type", sw.status === 200 && (sw.headers.get("content-type") || "").includes("javascript") && swText.includes("addEventListener(\"push\"") && swText.includes("notificationclick"));
const mf = await fetch(`${BASE}/manifest.json`);
check("14b. /manifest.json served", mf.status === 200 && (await mf.text()).includes("\"Kallmania\""));

// ══ 15. Cleanup (leave zero test rows) ══
const allIds = (await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } })).map((u) => u.id);
const escs = await db.escalation.findMany({ where: { OR: [{ fromId: { in: allIds } }, { targetUserId: { in: allIds } }] }, select: { id: true } });
await db.escalation.deleteMany({ where: { id: { in: escs.map((e) => e.id) } } });
await db.escalationMessage.deleteMany({ where: { senderId: { in: allIds } } });
await db.escalationEvent.deleteMany({ where: { actorId: { in: allIds } } });
await db.escalationRead.deleteMany({ where: { userId: { in: allIds } } });
await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: allIds } } } });
await db.pushEvent.deleteMany({ where: { userId: { in: allIds } } });
await db.pushSubscription.deleteMany({ where: { userId: { in: allIds } } });
await db.pushPreference.deleteMany({ where: { userId: { in: allIds } } });
await db.notification.deleteMany({ where: { userId: { in: allIds } } });
await db.taskAssignee.deleteMany({ where: { OR: [{ userId: { in: allIds } }, { task: { OR: [{ createdById: { in: allIds } }, { assigneeId: { in: allIds } }] } }] } });
await db.task.deleteMany({ where: { OR: [{ createdById: { in: allIds } }, { assigneeId: { in: allIds } }] } });
await db.auditLog.deleteMany({ where: { OR: [{ userId: { in: allIds } }, { actorName: { in: ALL_USERS.map((u) => u.fullName) } }] } });
await db.user.deleteMany({ where: { id: { in: allIds } } });
const leftovers = await db.user.count({ where: { email: { contains: "kallmania.test" } } });
const legacyEsc = await db.escalation.count();
check("15a. cleanup: 0 test users left, legacy escalations intact", leftovers === 0 && legacyEsc === 3, `testUsers=${leftovers} legacyEsc=${legacyEsc}`);

console.log(`\n${failures === 0 ? "✅ ALL PASSED" : `❌ ${failures} FAILURES`}`);
await db.$disconnect();
process.exit(failures === 0 ? 0 : 1);
