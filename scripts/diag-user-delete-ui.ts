// Deep diagnostic: does the confirm button's onClick actually run?
// - capture pageerror + all console messages (hydration failures)
// - document-level capture listener logs every click target
// - after click: check for the Loader2 spinner (busy state => onClick ran)
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

const BASE = "http://localhost:3000";
const db = new PrismaClient();
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const PASSWORD = "e2e-uidel-2026";
const STAMP = Date.now().toString(36);
const ADMIN = { email: `uidel-admin-${STAMP}@kallmania.test`, fullName: "E2E UI Delete Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: `E2E-UIDEL-A-${STAMP}`, country: "NG", state: "Enugu" };
const VICTIM = { email: `uidel-victim-${STAMP}@kallmania.test`, fullName: "E2E UI Delete Victim", role: "AGENT_BPO", department: "BPO", team: "INBOUND", employeeId: `E2E-UIDEL-V-${STAMP}`, country: "NG", state: "Enugu" };

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of [ADMIN, VICTIM]) await db.user.create({ data: { ...u, passwordHash, status: "APPROVED" } });
  const victim = await db.user.findUniqueOrThrow({ where: { email: VICTIM.email } });
  await db.activityEvent.create({ data: { userId: victim.id, eventType: "LOGIN" } });
  await db.pushEvent.create({ data: { userId: victim.id, type: "ESCALATION_NEW", title: "p", body: "b" } });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
  page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text().slice(0, 200)));
  page.on("request", (r) => { if (r.url().includes("/api/users") && r.method() === "PATCH") console.log("[request-out]", r.method(), r.url()); });
  page.on("response", (r) => {
    if (r.url().includes("/api/users")) console.log(`[network] ${r.request().method()} ${r.url()} → ${r.status()}`);
  });

  await page.goto(`${BASE}/`);
  await page.waitForSelector("input[type=email]", { timeout: 15000 });
  await page.fill("input[type=email]", ADMIN.email);
  await page.fill("input[type=password]", PASSWORD);
  await page.locator("button[type=submit], button:has-text('Sign in'), button:has-text('Login')").first().click();
  await page.waitForTimeout(2500);

  await page.locator("button", { hasText: "Dashboard Overview" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("menuitem", { name: "User Management" }).first().click();
  await page.waitForTimeout(2000);

  const victimRow = page.locator("tr", { hasText: VICTIM.email }).first();
  await victimRow.waitFor({ timeout: 15000 });
  await victimRow.locator("button[title='Delete']").first().click();
  await page.waitForTimeout(800);

  // capture-phase click logger — sees every click before any stopPropagation
  await page.evaluate(() => {
    document.addEventListener("click", (ev) => {
      const t = ev.target as HTMLElement;
      const btn = t.closest("button");
      console.log("[CAPTURE-CLICK]", btn ? btn.textContent?.trim().slice(0, 40) : t.tagName, "defaultPrevented=" + ev.defaultPrevented);
    }, true);
  });

  const dialog = page.locator("[role=dialog]").first();
  const confirmBtn = dialog.locator("button", { hasText: "Delete permanently" }).first();
  console.log("[step] clicking confirm…");
  await confirmBtn.click();
  await page.waitForTimeout(1200);
  const spinner = await dialog.locator(".animate-spin").count();
  console.log("[step] spinner (busy) after click:", spinner);
  const dialogText = await dialog.innerText().catch(() => "<gone>");
  console.log("[step] dialog text head:", dialogText.slice(0, 120).replace(/\n/g, " | "));
  await page.waitForTimeout(3000);
  const rows = await page.locator("tr", { hasText: VICTIM.email }).count();
  console.log("[step] victim rows after 4s:", rows);
  console.log("[db] user still exists:", !!(await db.user.findUnique({ where: { id: victim.id } })));
  await browser.close();

  // cleanup
  const users = await db.user.findMany({ where: { email: { contains: "uidel-" } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.pushDelivery.deleteMany({ where: { OR: [{ event: { userId: { in: ids } } }, { subscription: { userId: { in: ids } } }] } }).catch(() => {});
    await db.pushEvent.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
  }
  await db.user.deleteMany({ where: { email: { contains: "uidel-" } } }).catch(() => {});
  await db.$disconnect();
}

main().catch((e) => { console.error("DIAG crashed:", e); process.exit(1); });
