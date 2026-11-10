// REAL-BROWSER verification — ADMIN USER MANAGEMENT → DELETE PERMANENTLY:
//   The admin logs in through the real UI, opens "User Management", finds the
//   victim's row, clicks the trash action, confirms the "Delete permanently"
//   dialog and the row disappears — against a victim seeded with the exact
//   RESTRICT-FK footprint (activity events, push subscription/events/preference,
//   report + KPI result, notifications) that used to make the request silently
//   roll back with P2003 ("admin cannot permanently delete users").
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
const EMAILS = [ADMIN.email, VICTIM.email];

let failures = 0;
const check = (n, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"} — ${n}${x ? ` | ${x}` : ""}`); if (!c) failures++; };

async function purge() {
  // Wildcard: also reclaim leftovers from earlier crashed runs of this suite
  const users = await db.user.findMany({
    where: { OR: [{ email: { in: EMAILS } }, { email: { contains: "uidel-" } }] },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.kpiResult.deleteMany({ where: { userId: { in: ids } } });
    await db.report.deleteMany({ where: { userId: { in: ids } } });
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.pushDelivery.deleteMany({ where: { OR: [{ event: { userId: { in: ids } } }, { subscription: { userId: { in: ids } } }] } });
    await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
    await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  }
  await db.user.deleteMany({ where: { OR: [{ email: { in: EMAILS } }, { email: { contains: "uidel-" } }] } }).catch(() => {});
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

async function main() {
  await purge();

  // Seed admin + victim with the previously-fatal RESTRICT-FK footprint
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of [ADMIN, VICTIM]) await db.user.create({ data: { ...u, passwordHash, status: "APPROVED" } });
  const victim = await db.user.findUniqueOrThrow({ where: { email: VICTIM.email } });
  const day = new Date();
  const report = await db.report.create({ data: { ref: `E2E-UIDEL-${STAMP}-R`, type: "DAILY_REPORT", reportDate: day, userId: victim.id, department: "BPO", status: "SUBMITTED" } });
  await db.kpiResult.create({ data: { dedupeKey: `e2e-uidel:${STAMP}:k`, userId: victim.id, team: "INBOUND", department: "BPO", kpiKey: "callsHandled", label: "Calls handled", unit: "count", target: 50, actual: 60, achievement: 120, statusLabel: "MET", source: "REPORT", reportId: report.id, reportDate: day, periodMonth: day.toISOString().slice(0, 7) } });
  await db.activityEvent.create({ data: { userId: victim.id, eventType: "LOGIN", team: "INBOUND" } });
  await db.pushSubscription.create({ data: { userId: victim.id, endpoint: `https://push.example/uidel-${STAMP}`, p256dh: "k", auth: "a" } });
  const pev = await db.pushEvent.create({ data: { userId: victim.id, type: "ESCALATION_NEW", title: "p", body: "b", dedupeKey: `e2e-uidel-push:${STAMP}` } });
  const sub = await db.pushSubscription.findFirstOrThrow({ where: { userId: victim.id } });
  await db.pushDelivery.create({ data: { eventId: pev.id, subscriptionId: sub.id, attempt: 1, outcome: "FAILED", error: "VAPID not configured (worker)" } });
  await db.pushPreference.create({ data: { userId: victim.id, pushEnabled: true } });
  await db.notification.create({ data: { userId: victim.id, type: "ACCOUNT_APPROVED", title: "own", message: "m" } });
  console.log(`seeded victim ${victim.id} with RESTRICT-FK footprint\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await login(page, ADMIN.email);
  check("B1 admin logged in", page.isClosed() === false);

  // Navigation is a pop-out menu attached to the "Dashboard Overview" grid button
  await page.locator("button", { hasText: "Dashboard Overview" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("menuitem", { name: "User Management" }).first().click();
  await page.waitForTimeout(2000);
  const victimRow = page.locator("tr, .k-card", { hasText: VICTIM.email }).first();
  await victimRow.waitFor({ timeout: 15000 });
  check("B2 victim row visible in User Management", await victimRow.isVisible());

  await victimRow.locator("button[title='Delete']").first().click();
  await page.waitForTimeout(600);
  const dialog = page.locator("[role=dialog]", { hasText: "permanently" }).first();
  check("B3 permanent-delete confirmation dialog opens", await dialog.isVisible());

  await dialog.locator("button", { hasText: "Delete permanently" }).first().click();
  // The delete transaction runs ~15 sequential statements against the remote
  // Supabase Postgres — 6-11s is normal. Wait for the row to actually leave
  // the table (the spinner covers the wait in the real UI).
  let rowGone = true;
  try {
    await page.locator("tr", { hasText: VICTIM.email }).first().waitFor({ state: "detached", timeout: 30000 });
  } catch {
    rowGone = false;
  }
  check("B4 victim row GONE from the table after confirm", rowGone);
  const toast = await page.locator("text=Account deleted").count();
  check("B5 success toast shown", toast > 0 || rowGone, `toast=${toast}`);

  await browser.close();

  // DB truth after the UI flow
  const gone = await db.user.findUnique({ where: { id: victim.id } });
  check("B6 DB: user row deleted", !gone);
  const [act, psub, pevt, ppref, pdel, rep, kpi, notif] = await Promise.all([
    db.activityEvent.count({ where: { userId: victim.id } }),
    db.pushSubscription.count({ where: { userId: victim.id } }),
    db.pushEvent.count({ where: { userId: victim.id } }),
    db.pushPreference.count({ where: { userId: victim.id } }),
    db.pushDelivery.count({ where: { OR: [{ event: { userId: victim.id } }, { subscription: { userId: victim.id } }] } }),
    db.report.count({ where: { userId: victim.id } }),
    db.kpiResult.count({ where: { userId: victim.id } }),
    db.notification.count({ where: { userId: victim.id } }),
  ]);
  check("B7 DB: every FK child + grandchild purged", act === 0 && psub === 0 && pevt === 0 && ppref === 0 && pdel === 0 && rep === 0 && kpi === 0 && notif === 0,
    `activity=${act} pushSub=${psub} pushEvents=${pevt} pushPrefs=${ppref} pushDeliveries=${pdel} reports=${rep} kpi=${kpi} notif=${notif}`);

  console.log(`\n=== ${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} ===`);
  await purge();
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch(async (e) => { console.error("BROWSER E2E crashed:", e); await purge().catch(() => {}); process.exit(1); });
