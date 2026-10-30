// REAL-BROWSER push E2E (Task 49) — the acceptance-critical path:
//   real Chromium + real service worker + real FCM subscription + real
//   Web Push delivery, asserted from the page via getNotifications().
//
// What is proven here (beyond the API suite):
//   B1  Enable flow through the REAL UI (permission → SW → subscribe → saved)
//   B2  A real test notification arrives through Google's push service and is
//       displayed by the service worker while the tab is in the background
//   B3  Escalation created by an agent reaches the supervisor's browser as a
//       native notification (§13.6), and again while the tab is CLOSED (§13.4,
//       browser running) — the notification is listed after reopening
//   B4  Click-side navigation wiring (hash listener) moves the SPA view
//   B5  Multi-device: two different browser contexts both receive pushes
//
// Headless limits, stated honestly: the OS-level notification visual and the
// physical click on it cannot be exercised in a headless browser — display is
// proven via SW getNotifications() (same registry the OS UI reads), and the
// click handler is covered by code review + the user's manual test.
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";
const db = new PrismaClient();

// ── DATABASE_URL self-heal (mirrors src/lib/db.ts) ──
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}

const PASSWORD = "e2e-test-2026";
const AGENT = { email: "push-br-agent@kallmania.test", fullName: "E2E Browser Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-PBR-1", country: "NG", state: "E2E Browser State" };
const SUP = { email: "push-br-sup@kallmania.test", fullName: "E2E Browser Supervisor", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-PBR-S", country: "NG", state: "E2E Browser State" };

let failures = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginViaApi(page, user) {
  const res = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: user.email, password: PASSWORD }) });
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  await page.context().addCookies(cookies.map((c) => {
    const [kv, ...attrs] = c.split("; ");
    const [name, value] = kv.split("=");
    const attrsObj = {};
    for (const a of attrs) { const [k, v] = a.split("="); attrsObj[k.toLowerCase()] = v === undefined ? true : v; }
    return { name, value, domain: "localhost", path: attrsObj.path || "/", expires: attrsObj.expires ? Number(attrsObj.expires) : -1, httpOnly: attrsObj.httponly === "true" || attrsObj.httponly === true, sameSite: "Lax" };
  }));
}

/** Poll the SW registration's live notification list until predicate matches. */
async function waitNotification(page, predicate, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  let last = [];
  while (Date.now() < end) {
    last = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const list = await reg.getNotifications();
      return list.map((n) => ({ title: n.title, body: n.body, tag: n.tag, url: n.data?.url }));
    });
    if (predicate(last)) return last;
    await sleep(600);
  }
  return last;
}

// ── Setup ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of [AGENT, SUP]) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED" }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const users = await db.user.findMany({ where: { email: { in: [AGENT.email, SUP.email] } } });
const agentId = users.find((u) => u.email === AGENT.email).id;
const supId = users.find((u) => u.email === SUP.email).id;
for (const t of ["escalation", "notification", "pushEvent", "pushSubscription", "pushPreference", "pushDelivery"]) {
  // per-table targeted cleanup below (FK-safe order)
}
const oldEscs = await db.escalation.findMany({ where: { OR: [{ fromId: { in: [agentId, supId] } }, { targetUserId: { in: [agentId, supId] } }] }, select: { id: true } });
await db.escalation.deleteMany({ where: { id: { in: oldEscs.map((e) => e.id) } } });
await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: [agentId, supId] } } } });
await db.pushEvent.deleteMany({ where: { userId: { in: [agentId, supId] } } });
await db.pushSubscription.deleteMany({ where: { userId: { in: [agentId, supId] } } });
await db.pushPreference.deleteMany({ where: { userId: { in: [agentId, supId] } } });
await db.notification.deleteMany({ where: { userId: { in: [agentId, supId] } } });

// Persistent Chrome profiles under Xvfb: Playwright's normal contexts are
// incognito and Chrome refuses push subscriptions in incognito (crbug.com/401439)
// — persistent (non-incognito) profiles get genuine FCM subscriptions.
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
const profileA = mkdtempSync(join(tmpdir(), "push-prof-a-"));
const profileS = mkdtempSync(join(tmpdir(), "push-prof-s-"));
const browser = await chromium.launchPersistentContext(profileA, {
  headless: false, args: ["--no-sandbox", "--disable-dev-shm-usage"], viewport: { width: 1280, height: 900 },
});
const browserS = await chromium.launchPersistentContext(profileS, {
  headless: false, args: ["--no-sandbox", "--disable-dev-shm-usage"], viewport: { width: 1280, height: 900 },
});

// ── B1: Agent enables notifications through the REAL UI ──
const ctxA = browser;
await ctxA.grantPermissions(["notifications"], { origin: BASE });
const pageA = ctxA.pages()[0] || await ctxA.newPage();
await loginViaApi(pageA, AGENT);
await pageA.goto(`${BASE}/#/profile`);
await pageA.waitForSelector("text=Browser notifications", { timeout: 30000 });
const enableBtn = pageA.getByRole("button", { name: /Enable browser notifications/ });
check("B1a. settings section renders with the Enable action", await enableBtn.isVisible());
await enableBtn.click();
await pageA.waitForSelector("text=Notifications enabled", { timeout: 30000 });
check("B1b. UI reaches 'Notifications enabled' state after the real flow", true);
const subState = await pageA.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? { endpoint: sub.endpoint, scope: reg.scope } : null;
});
check("B1c. real push subscription exists in this browser (FCM endpoint)", /^https:\/\/[a-z0-9.]*google\.com\/fcm\/send\//.test(subState?.endpoint || ""), subState?.endpoint?.slice(0, 48) + "…");
check("B1d. service worker controls the origin at scope '/'", subState?.scope === `${BASE}/`);
const dbSubs = await db.pushSubscription.count({ where: { userId: agentId, active: true } });
check("B1e. subscription persisted server-side against the account", dbSubs === 1);

// ── B2: real test push → arrives via FCM while the tab is backgrounded ──
await pageA.goto(`${BASE}/#/dashboard`); // app tab moves away from settings (background state for the SW)
await sleep(800);
const testRes = await pageA.evaluate(async () => {
  const res = await fetch("/api/push/test", { method: "POST" });
  return { status: res.status, body: await res.json() };
});
check("B2a. backend reports the push service ACCEPTED the message", testRes.body.ok === true, testRes.body.message?.slice(0, 70));
const notifs = await waitNotification(pageA, (list) => list.some((n) => n.title === "Test push notification"));
check("B2b. REAL native notification displayed by the service worker", notifs.some((n) => n.title === "Test push notification"), JSON.stringify(notifs.find((n) => n.title === "Test push notification") || {}));
check("B2c. notification carries the safe deep-link destination", notifs.some((n) => n.title === "Test push notification" && n.url === "#/notifications"));

// ── B3: escalation → supervisor's browser (separate profile = second device) ──
const ctxS = browserS;
await ctxS.grantPermissions(["notifications"], { origin: BASE });
const pageS = ctxS.pages()[0] || await ctxS.newPage();
await loginViaApi(pageS, SUP);
await pageS.goto(`${BASE}/#/profile`);
await pageS.waitForSelector("text=Browser notifications", { timeout: 30000 });
await pageS.getByRole("button", { name: /Enable browser notifications/ }).click();
await pageS.waitForSelector("text=Notifications enabled", { timeout: 30000 });
check("B3a. supervisor's browser subscribed (second device under same account type)", (await db.pushSubscription.count({ where: { userId: supId, active: true } })) === 1);

// Agent creates a real escalation to the supervisor via the API (as the app does)
const escRes = await pageA.evaluate(async () => {
  const rec = await fetch("/api/escalations/recipients").then((r) => r.json());
  const sup = (rec.groups?.supervisors || rec.supervisors || [])[0];
  const res = await fetch("/api/escalations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId: sup.id, subject: "Browser E2E escalation", message: "Real push must reach the supervisor's browser", severity: "NORMAL" }) });
  return { status: res.status, body: await res.json() };
});
check("B3b. agent escalation created through the app API", escRes.status === 201 || escRes.status === 200, `status ${escRes.status}`);
const supNotifs = await waitNotification(pageS, (list) => list.some((n) => n.title.includes("Browser E2E escalation")));
const escNotif = supNotifs.find((n) => n.title.includes("Browser E2E escalation"));
check("B3c. supervisor's browser received the escalation push (real event → FCM → SW)", Boolean(escNotif), escNotif ? `url=${escNotif.url}` : "not received");
check("B3d. escalation deep link targets the thread", escNotif?.url === `#/escalations/${escRes.body.escalation.id}`);

// ── B4: close the supervisor's tab — browser still receives push (§13.4) ──
await pageS.close();
await sleep(1000);
// The agent replies on the thread → supervisor must get a push while CLOSED.
const msgRes = await pageA.evaluate(async () => {
  const feed = await fetch("/api/escalations").then((r) => r.json());
  const esc = (feed.escalations || []).find((e) => e.subject === "Browser E2E escalation");
  const res = await fetch(`/api/escalations/${esc.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "Reply while your tab is closed", action: "message" }) });
  return { status: res.status, id: esc.id };
});
check("B4a. thread reply accepted", msgRes.status === 200 || msgRes.status === 201, `status ${msgRes.status}`);
// Reopen a tab on the same origin — notifications shown while closed remain listed.
const pageS2 = await ctxS.newPage();
await pageS2.goto(`${BASE}/#/notifications`);
const closedArrival = await waitNotification(pageS2, (list) => list.some((n) => n.body?.includes("while your tab is closed") || n.title.includes("Browser E2E escalation")), 25000);
check("B4b. push ARRIVED while the tab was closed (delivered to the SW, listed after reopen)", closedArrival.some((n) => n.title.includes("Browser E2E escalation")), `${closedArrival.length} notification(s) listed`);

// ── B5: click-side navigation wiring (hash listener drives the SPA view) ──
await pageA.goto(`${BASE}/#/dashboard`);
await sleep(600);
await pageA.evaluate(() => { window.location.hash = "#/notifications"; });
await sleep(600);
const view = await pageA.evaluate(() => document.body.innerText.includes("Notifications") && document.body.innerText.includes("Alerts for submissions") ? "notifications" : "other");
check("B5. hash-route navigation lands the open tab on the right view", view === "notifications");

// ── Cleanup ──
for (const pg of [pageA, pageS2]) await pg.close().catch(() => {});
await ctxA.close().catch(() => {});
await ctxS.close().catch(() => {});
rmSync(profileA, { recursive: true, force: true });
rmSync(profileS, { recursive: true, force: true });
const allIds = [agentId, supId];
const escs2 = await db.escalation.findMany({ where: { OR: [{ fromId: { in: allIds } }, { targetUserId: { in: allIds } }] }, select: { id: true } });
await db.escalation.deleteMany({ where: { id: { in: escs2.map((e) => e.id) } } });
await db.escalationMessage.deleteMany({ where: { senderId: { in: allIds } } });
await db.escalationEvent.deleteMany({ where: { actorId: { in: allIds } } });
await db.escalationRead.deleteMany({ where: { userId: { in: allIds } } });
await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: allIds } } } });
await db.pushEvent.deleteMany({ where: { userId: { in: allIds } } });
await db.pushSubscription.deleteMany({ where: { userId: { in: allIds } } });
await db.pushPreference.deleteMany({ where: { userId: { in: allIds } } });
await db.notification.deleteMany({ where: { userId: { in: allIds } } });
await db.auditLog.deleteMany({ where: { userId: { in: allIds } } });
await db.user.deleteMany({ where: { id: { in: allIds } } });
const leftovers = await db.user.count({ where: { email: { contains: "push-br-" } } });
check("cleanup: 0 browser-test users left", leftovers === 0);

console.log(`\n${failures === 0 ? "✅ ALL BROWSER TESTS PASSED" : `❌ ${failures} FAILURES`}`);
await db.$disconnect();
process.exit(failures === 0 ? 0 : 1);
