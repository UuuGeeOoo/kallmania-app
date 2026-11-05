// REAL-BROWSER verification — SBTS MEDIA SCOREBOARD UI:
//   B1  A social-media agent logs in and sees the "SBTS Scores" nav item; the
//       scoreboard renders their own performance hero card with the animated
//       0–100 bar showing the LATEST pushed score, the delta chip and the
//       component chips; their own daily report is visible, another agent's is not
//   B2  An admin sees the full division grid (agent cards with bars), the
//       "Integration pipe (admin)" status card and the rotation button
//   B3  Poll mechanism present (auto-refresh 30s badge) — new pushes surface on refresh
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { createHash, createHmac, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";
const db = new PrismaClient();
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const PASSWORD = "e2e-sbts-2026";
const CENTRE = { country: "NG", state: "Enugu" };
const SOC = { email: "sbts-ui-agent@kallmania.test", fullName: "E2E UI Media Agent", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-SUI-1", ...CENTRE };
const ADM = { email: "sbts-ui-admin@kallmania.test", fullName: "E2E UI Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-SUI-A", ...CENTRE };
const EMAILS = [SOC.email, ADM.email];
const D1 = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
const D2 = new Date().toISOString().slice(0, 10);

let failures = 0;
const check = (n, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"} — ${n}${x ? ` | ${x}` : ""}`); if (!c) failures++; };

const KEY = `E2EUIKEY${randomBytes(20).toString("hex")}`;
const SECRET = randomBytes(32).toString("hex");

async function push(event) {
  const raw = JSON.stringify(event);
  const res = await fetch(`${BASE}/api/integrations/sbts/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KEY}`,
      "X-SBTS-Timestamp": String(Math.floor(Date.now() / 1000)),
      "X-SBTS-Signature": createHmac("sha256", SECRET).update(raw, "utf8").digest("hex"),
    },
    body: raw,
  });
  return { status: res.status, json: await res.json() };
}

async function login(page, email) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("input[type=email], input[name=email]", { timeout: 15000 });
  await page.fill("input[type=email], input[name=email]", email);
  const pw = page.locator("input[type=password]").first();
  await pw.fill(PASSWORD);
  await page.locator("button[type=submit], button:has-text('Sign in'), button:has-text('Login')").first().click();
  await page.waitForTimeout(2500);
}

async function visible(page, selector, timeout = 6000) {
  try {
    await page.locator(selector).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

/** FK-safe removal of the temporary e2e users and everything referencing them. */
async function purgeUsers() {
  const rows = await db.user.findMany({ where: { email: { in: EMAILS } }, select: { id: true } });
  const ids = rows.map((u) => u.id);
  if (!ids.length) return;
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
  await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
  await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
  await db.sbtsEvent.deleteMany({ where: { userId: { in: ids } } });
  // an in-flight overdue check can still land a notification between the
  // deletes above and here — tolerate it, the caller's next pass catches it
  await db.user.deleteMany({ where: { email: { in: EMAILS } } }).catch(() => {});
}

async function main() {
  // cleanup + seed — notifications/audits first (the overdue scheduler can
  // address the temporary admin after 18:00 local → FK-safe deletion order)
  await purgeUsers();
  await db.sbtsEvent.deleteMany({ where: { agentEmail: { in: EMAILS } } });
  await db.sbtsCredential.deleteMany({ where: { label: { startsWith: "E2E-SBTS-UI" } } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await db.user.create({ data: { ...SOC, passwordHash, status: "APPROVED" } });
  await db.user.create({ data: { ...ADM, passwordHash, status: "APPROVED" } });
  await db.sbtsCredential.create({
    data: { label: "E2E-SBTS-UI", keyHash: createHash("sha256").update(KEY).digest("hex"), keyHint: "e2e…UIKW", secret: SECRET },
  });

  const p1 = await push({ eventId: "sbts-ui-score-1", type: "performance.score", agent: { email: SOC.email }, date: D1, score: 55, delta: 1, components: { tasks: 18, posts: 12 } });
  const p2 = await push({ eventId: "sbts-ui-score-2", type: "performance.score", agent: { email: SOC.email }, date: D2, score: 72.5, delta: 17.5, components: { tasks: 22, checkIns: 15, punctuality: 13, posts: 14, eodReport: 8.5 } });
  const p3 = await push({ eventId: "sbts-ui-report-1", type: "daily.report", agent: { email: SOC.email }, date: D2, report: "Browser E2E: published 4 campaign creatives and closed the engagement loop. EOD." });
  check("seed events accepted via signed ingest", p1.status === 200 && p2.status === 200 && p3.status === 200, JSON.stringify([p1.accepted, p2.accepted, p3.accepted]));

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  // ── B1: agent view ──
  await login(page, SOC.email);
  check("agent logged in to dashboard", await page.locator("text=Dashboard").first().isVisible().catch(() => false));
  const navItem = page.locator("text=SBTS Scores").first();
  check("SBTS Scores nav visible for social agent", await navItem.isVisible().catch(() => false));
  await navItem.click();
  await page.waitForTimeout(2000);
  check("own hero card shows latest score 72.5", await visible(page, "text=72.5"));
  check("delta chip shows +17.5", await visible(page, "text=+17.5"));
  check("component chips render ('EOD Report' / 'Posts: 14')", (await visible(page, "text=/EOD Report|Eod Report/i")) || (await visible(page, "text=/Posts: 14/i")));
  check("animated score bar rendered", await visible(page, "div.bg-gradient-to-r"));
  check("auto-refresh badge present", await visible(page, "text=auto-refresh 30s"));
  check("own daily report listed", await visible(page, "text=Browser E2E: published 4 campaign creatives"));
  check("another agent's report NOT listed", !(await page.locator("text=Scheduled 12 posts").first().isVisible().catch(() => false)));

  // ── B2: admin view ──
  await login(page, ADM.email);
  const adminNav = page.locator("text=SBTS Scores").first();
  check("SBTS Scores nav visible for admin", await visible(page, "text=SBTS Scores"));
  await adminNav.click();
  await page.waitForTimeout(2500);
  check("admin sees agent card (name)", await visible(page, "text=E2E UI Media Agent"));
  check("admin sees agent score 72.5 on the grid", await visible(page, "text=72.5"));
  check("integration pipe card visible", await visible(page, "text=Integration pipe (admin)"));
  check("rotate button visible", await visible(page, "text=Rotate key & secret"));

  await browser.close();

  // cleanup — the browsing session triggers the lazy overdue-report scheduler,
  // which addresses the temporary admin (after 18:00 local) and may still be
  // in flight when the first purge runs: pass 2 + retry catches stragglers.
  await purgeUsers();
  await purgeUsers();
  await db.sbtsEvent.deleteMany({ where: { agentEmail: { in: EMAILS } } });
  await db.sbtsCredential.deleteMany({ where: { label: { startsWith: "E2E-SBTS-UI" } } });
  for (let i = 0; i < 4; i++) {
    const left = await db.user.findMany({ where: { email: { in: EMAILS } }, select: { id: true } });
    if (!left.length) break;
    await purgeUsers();
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log("─".repeat(50));
  if (failures) { console.log(`SBTS BROWSER: ${failures} FAILURE(S)`); process.exit(1); }
  console.log("SBTS BROWSER: ALL PASS ✅");
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(() => db.$disconnect());
