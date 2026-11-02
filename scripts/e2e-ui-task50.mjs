// REAL-BROWSER verification of the Task 50 UI changes:
//   V1  PushEnableBanner appears on #/notifications for a not-yet-subscribed
//       browser and disappears once push is enabled (one-click enable works)
//   V2  Escalation composer picker scoping: an agent sees ONLY their own
//       team's lead (no other team's lead, even same-centre); an ADMIN sees
//       cross-centre supervisors but NO "Team Leads — all centres" group
import { chromium } from "playwright";
import { readFileSync, mkdtempSync, rmSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";
const db = new PrismaClient();
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const PASSWORD = "e2e-test-2026";
const CENTRE = { country: "NG", state: "Enugu" };
const AGENT = { email: "ui50-agent@kallmania.test", fullName: "E2E UI Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-UI-1", ...CENTRE };
const ADMIN = { email: "ui50-admin@kallmania.test", fullName: "E2E UI Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-UI-A", ...CENTRE };
const TL_OUT = { email: "ui50-tl-out@kallmania.test", fullName: "E2E UI Lead Outbound", role: "TEAM_LEAD", department: "BPO", team: "OUTBOUND", employeeId: "E2E-UI-T1", ...CENTRE };
const TL_IN = { email: "ui50-tl-in@kallmania.test", fullName: "E2E UI Lead Inbound", role: "TEAM_LEAD", department: "BPO", team: "INBOUND", employeeId: "E2E-UI-T2", ...CENTRE };
const SUP_IN = { email: "ui50-sup-in@kallmania.test", fullName: "E2E UI Sup Inbound", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-UI-S1", country: "NG", state: "Abuja Federal Capital Territory" };

let failures = 0;
const check = (n, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"} — ${n}${x ? ` | ${x}` : ""}`); if (!c) failures++; };

async function loginViaApi(page, user) {
  const res = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: user.email, password: PASSWORD }) });
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  await page.context().addCookies(cookies.map((c) => {
    const [name, value] = c.split("="); const rest = c.split("=").slice(1).join("=");
    return { name, value: rest, domain: "localhost", path: "/" };
  }));
}

const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of [AGENT, ADMIN, TL_OUT, TL_IN, SUP_IN]) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const ids = (await db.user.findMany({ where: { email: { in: [AGENT, ADMIN, TL_OUT, TL_IN, SUP_IN].map((u) => u.email) } }, select: { id: true } })).map((u) => u.id);
await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: ids } } } });
await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
await db.pushPreference.deleteMany({ where: { userId: { in: ids } } });

const profiles = [mkdtempSync("/tmp/ui50-a-"), mkdtempSync("/tmp/ui50-b-")];
const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  // ── V1: banner on the Notifications page (agent browser) ──
  const ctxA = await chromium.launchPersistentContext(profiles[0], { headless: false, viewport: { width: 1280, height: 900 }, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  await ctxA.grantPermissions(["notifications"], { origin: BASE });
  const pageA = ctxA.pages()[0] || await ctxA.newPage();
  await loginViaApi(pageA, AGENT);
  await pageA.goto(`${BASE}/#/notifications`, { waitUntil: "networkidle" });
  await pageA.waitForSelector("text=Get notified even when Kallmania is closed", { timeout: 20000 });
  const banner = pageA.locator("text=Get notified even when Kallmania is closed");
  check("V1a. banner IS visible on Notifications page before enabling", await banner.count() > 0 && await banner.first().isVisible());
  const enableBtn = pageA.locator("button:has-text('Enable browser notifications')").first();
  check("V1b. the banner's Enable button is visible and clickable", await enableBtn.isVisible());
  await enableBtn.click();
  await pageA.waitForTimeout(6000); // SW register + subscribe + server save
  check("V1c. banner GONE after enabling (state = subscribed)", await banner.count() === 0);
  const reg = await pageA.evaluate(async () => (await navigator.serviceWorker.ready).pushManager.getSubscription());
  check("V1d. real push subscription created from the banner flow", !!reg && reg.endpoint.includes("fcm"), reg?.endpoint?.slice(0, 60));
  await ctxA.close();

  // ── V2: composer picker scoping ──
  const ctxB = await chromium.launchPersistentContext(profiles[1], { headless: false, viewport: { width: 1280, height: 900 }, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const pageB = ctxB.pages()[0] || await ctxB.newPage();
  await loginViaApi(pageB, AGENT);
  await pageB.goto(`${BASE}/#/escalations`, { waitUntil: "networkidle" });
  await pageB.waitForTimeout(2000);
  const newBtn = pageB.locator("button:has-text('New escalation'), button:has-text('Raise an escalation'), button:has-text('Escalate')").first();
  if (await newBtn.count()) {
    await newBtn.click();
    await pageB.waitForTimeout(1200);
    const dlg = pageB.locator("[role='dialog']");
    const trigger = dlg.locator("[role='combobox']").first();
    if (await trigger.count()) {
      await trigger.click();
      await pageB.waitForTimeout(1000);
      const listText = await pageB.locator("[role='listbox']").textContent().catch(() => "");
      check("V2a. agent picker shows own-team lead (Outbound)", (listText || "").includes("E2E UI Lead Outbound"), (listText || "").slice(0, 90));
      check("V2b. agent picker does NOT show the same-centre INBOUND team lead", !(listText || "").includes("E2E UI Lead Inbound"));
    } else { check("V2a. (combobox not found in dialog)", false); }
  } else check("V2a. (skipped — no composer button found)", false);
  // admin: open composer on "Escalate to a role"
  const pageC = await ctxB.newPage();
  await loginViaApi(pageC, ADMIN);
  await pageC.goto(`${BASE}/#/escalations`, { waitUntil: "networkidle" });
  await pageC.waitForTimeout(2000);
  const adminNew = pageC.locator("button:has-text('New escalation'), button:has-text('Escalate'), button:has-text('Notify')").first();
  if (await adminNew.count()) {
    await adminNew.click();
    await pageC.waitForTimeout(800);
    const roleTab = pageC.locator("button:has-text('Escalate to a role')").first();
    if (await roleTab.count()) {
      await roleTab.click();
      await pageC.waitForTimeout(800);
      const dlgC = pageC.locator("[role='dialog']");
      await dlgC.locator("[role='combobox']").first().click().catch(() => {});
      await pageC.waitForTimeout(1000);
      const listText = await pageC.locator("[role='listbox']").textContent().catch(() => "");
      check("V2c. admin picker has NO 'Team Leads — all centres' group", !listText.includes("Team Leads — all centres"));
      check("V2d. admin picker still lists cross-centre supervisor (Abuja)", listText.includes("E2E UI Sup Inbound"), listText.slice(0, 90));
      check("V2e. admin picker does NOT list either team lead", !listText.includes("E2E UI Lead Outbound") && !listText.includes("E2E UI Lead Inbound"));
    } else check("V2c. (skipped — no role tab)", false);
  } else check("V2c. (skipped — no admin composer button)", false);
  await ctxB.close();
} finally {
  await browser.close();
  // cleanup all test users + data
  await db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: ids } } } });
  await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
  await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
  await db.pushPreference.deleteMany({ where: { userId: { in: ids } } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await db.escalationRead.deleteMany({ where: { userId: { in: ids } } });
  const escs = await db.escalation.findMany({ where: { OR: [{ fromId: { in: ids } }, { targetUserId: { in: ids } }] }, select: { id: true } });
  await db.escalation.deleteMany({ where: { id: { in: escs.map((e) => e.id) } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  profiles.forEach((p) => { try { rmSync(p, { recursive: true, force: true }); } catch {} });
  console.log("cleanup ok — all UI-test users removed");
}
console.log(failures === 0 ? "\n✅ ALL UI CHECKS PASSED" : `\n❌ ${failures} UI CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
