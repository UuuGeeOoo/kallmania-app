// REAL-BROWSER verification of admin report deletion in the Reports Archive:
//   D1  ADMIN sees a delete (trash) action on every archive row; clicking it
//       opens a confirmation naming the report; confirming removes the row
//       from the table immediately (permanent server delete behind it)
//   D2  SUPERVISOR does NOT see any delete action (review-only, never destroy)
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
const AGENT = { email: "arcui-agent@kallmania.test", fullName: "E2E ArcUI Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-ARCUI-1", ...CENTRE };
const SUP = { email: "arcui-sup@kallmania.test", fullName: "E2E ArcUI Sup", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ARCUI-2", ...CENTRE };
const ADMIN = { email: "arcui-admin@kallmania.test", fullName: "E2E ArcUI Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-ARCUI-3", ...CENTRE };
const stamp = Date.now().toString(36).toUpperCase();
const mk = (n) => ({ ref: `ARCUI-${stamp}-${n}`, userId: null, type: "AGENT_BPO", department: "BPO", status: "APPROVED", reportDate: new Date("2026-02-10T00:00:00.000Z"), kpiMetrics: "[]" });

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
for (const u of [AGENT, SUP, ADMIN]) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const agent = await db.user.findUnique({ where: { email: AGENT.email } });
const R1 = await db.report.create({ data: { ...mk(1), userId: agent.id } });
const R2 = await db.report.create({ data: { ...mk(2), userId: agent.id } });
const emails = [AGENT, SUP, ADMIN].map((u) => u.email);
const ids = (await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } })).map((u) => u.id);

const profiles = [mkdtempSync("/tmp/arcdel-a-"), mkdtempSync("/tmp/arcdel-b-")];
const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  // ── D1: admin deletes from the archive ──
  const ctxA = await chromium.launchPersistentContext(profiles[0], { headless: false, viewport: { width: 1280, height: 900 }, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const pageA = ctxA.pages()[0] || await ctxA.newPage();
  await loginViaApi(pageA, ADMIN);
  await pageA.goto(`${BASE}/#/archive`, { waitUntil: "networkidle" });
  await pageA.waitForTimeout(2500);
  // The production archive already holds real reports — assert RATIOS, not absolute counts.
  const totalRows = await pageA.locator("tbody tr").count();
  const adminTrashes = pageA.locator("button[title*='Delete this report permanently']");
  check("D1a. admin sees a delete action on EVERY report row", totalRows >= 2 && (await adminTrashes.count()) === totalRows, `rows=${totalRows} trashes=${await adminTrashes.count()}`);
  // Delete OUR test report specifically (never a real production row).
  const myRow = pageA.locator("tbody tr", { hasText: R1.ref });
  await myRow.locator("button[title*='Delete this report permanently']").first().click();
  const dlg = pageA.locator("[role='alertdialog']");
  await dlg.waitFor({ state: "visible", timeout: 5000 });
  check("D1b. the confirm dialog names the report being deleted", (await dlg.textContent() || "").includes(R1.ref));
  await dlg.locator("button:has-text('Delete permanently')").first().click();
  // Poll — the DELETE round-trip + state update should be quick; log DELETEs.
  const delResponses = [];
  pageA.on("response", (res) => { if (res.request().method() === "DELETE") delResponses.push(`${res.url()} → ${res.status()}`); });
  let myRowCount = -1, dlgCount = -1;
  for (let i = 0; i < 16; i++) {
    await pageA.waitForTimeout(500);
    myRowCount = await pageA.locator("tbody tr", { hasText: R1.ref }).count();
    dlgCount = await dlg.count();
    if (myRowCount === 0 && dlgCount === 0) break;
  }
  console.log(`   [diag] DELETE responses: ${delResponses.join(" ; ") || "NONE"}`);
  check("D1c. after confirming, the deleted row is gone from the table", myRowCount === 0, `myRows=${myRowCount} totalRows=${await pageA.locator("tbody tr").count()} (was ${totalRows})`);
  check("D1d. the dialog closed", dlgCount === 0);
  const stillThere = await db.report.count({ where: { id: R1.id } });
  check("D1e. the row was really deleted on the server", stillThere === 0);
  await ctxA.close();

  // ── D2: supervisor has no delete action ──
  const ctxB = await chromium.launchPersistentContext(profiles[1], { headless: false, viewport: { width: 1280, height: 900 }, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const pageB = ctxB.pages()[0] || await ctxB.newPage();
  await loginViaApi(pageB, SUP);
  await pageB.goto(`${BASE}/#/archive`, { waitUntil: "networkidle" });
  await pageB.waitForTimeout(2500);
  check("D2a. supervisor still sees archive rows (read access intact)", (await pageB.locator("tbody tr").count()) >= 1);
  check("D2b. supervisor sees NO delete action anywhere", (await pageB.locator("button[title*='Delete this report permanently']").count()) === 0);
  await ctxB.close();
} finally {
  await browser.close();
  await db.report.deleteMany({ where: { id: { in: [R1.id, R2.id] } } });
  // Push tables first — PushEvent/PushDelivery hold FKs to the user.
  let clean = false;
  for (let attempt = 1; attempt <= 6 && !clean; attempt++) {
    try {
      await db.$transaction([
        db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: ids } } } }),
        db.pushEvent.deleteMany({ where: { userId: { in: ids } } }),
        db.pushSubscription.deleteMany({ where: { userId: { in: ids } } }),
        db.pushPreference.deleteMany({ where: { userId: { in: ids } } }),
        db.notification.deleteMany({ where: { userId: { in: ids } } }),
        db.auditLog.deleteMany({ where: { userId: { in: ids } } }),
        db.escalationRead.deleteMany({ where: { userId: { in: ids } } }),
        db.user.deleteMany({ where: { id: { in: ids } } }),
      ]);
      clean = true;
    } catch (e) {
      if (attempt === 6) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  profiles.forEach((p) => { try { rmSync(p, { recursive: true, force: true }); } catch {} });
  console.log("cleanup ok — all browser-test users + reports removed");
}
console.log(failures === 0 ? "\n✅ ALL BROWSER CHECKS PASSED" : `\n❌ ${failures} BROWSER CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
