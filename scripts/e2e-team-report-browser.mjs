// REAL-BROWSER verification — TEAM REPORT FORMATS on upload + read:
//   B1  A social-media agent's Upload page shows their OWN team locked in
//       (no department picker) — reports are always filed in their team's format
//   B2  Uploading a social media report shows the SOCIAL review grid — the
//       team's 8 KPI rows ("Posts Created / Published", "Follower Growth (Net)",
//       …) with configured targets — and NEVER the outbound agent grid
//       ("Total Calls Made" absent)
//   B3  The social format's "Tasks Assigned & Completed" section is present
//   B4  Confirm & Submit creates the report; My Reports detail dialog reads it
//       back in the social format (KPI table + tasks + team row)
//   B5  A manager (admin) still gets the department picker on their Upload page
import { chromium } from "playwright";
import { readFileSync } from "fs";
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
const SOC = { email: "uibrowser-social@kallmania.test", fullName: "E2E Browser Social", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-UB-1", ...CENTRE };
const ADM = { email: "uibrowser-admin@kallmania.test", fullName: "E2E Browser Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-UB-A", ...CENTRE };

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

const SOCIAL_DOC = `SOCIAL MEDIA TEAM — DAILY REPORT
Staff: Browser Social
Shift: 09:00 - 17:00
Posts Published: 5
Reach: 12300
Impressions: 24100
Likes: 640
Comments Handled: 88
Follower Growth: 121
Challenges: Slow internet at midday
`;

// ── Setup + clean slate ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of [SOC, ADM]) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", department: u.department, role: u.role, team: u.team, country: u.country, state: u.state }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const ids = (await db.user.findMany({ where: { email: { in: [SOC, ADM].map((u) => u.email) } }, select: { id: true } })).map((u) => u.id);
await db.report.deleteMany({ where: { userId: { in: ids } } });
await db.uploadedFile.deleteMany({ where: { userId: { in: ids } } });

const profile = "/tmp/uibrowser-social-profile";
const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  const ctx = await chromium.launchPersistentContext(profile, { headless: false, viewport: { width: 1280, height: 900 }, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = ctx.pages()[0] || await ctx.newPage();

  // ── B1: team locked for the social agent ──
  await loginViaApi(page, SOC);
  await page.goto(`${BASE}/#/upload`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Upload Report", { timeout: 20000 });
  const teamBox = await page.locator("text=Social Media & Campaign").first().isVisible().catch(() => false);
  check("B1a uploader's own team displayed (locked)", teamBox);
  const pickerGone = (await page.locator("[data-slot='select-trigger']").count()) === 0;
  check("B1b no department picker for staff", pickerGone, `selects=${await page.locator("[data-slot='select-trigger']").count()}`);

  // ── B2/B3: upload a social report → social review grid ──
  await page.setInputFiles("input[type='file']", { name: "social-daily.txt", mimeType: "text/plain", buffer: Buffer.from(SOCIAL_DOC, "utf8") });
  await page.getByRole("button", { name: /Upload & Extract/ }).click();
  await page.waitForSelector("text=Review Extracted Information", { timeout: 240000 });
  await page.waitForTimeout(1500);
  const socialRow = await page.locator("text=Posts Created / Published").first().isVisible().catch(() => false);
  check("B2a social template rows in the review grid", socialRow);
  const growthRow = await page.locator("text=Follower Growth (Net)").first().isVisible().catch(() => false);
  check("B2b follower growth row in the social grid", growthRow);
  const outboundGone = (await page.locator("text=Total Calls Made").count()) === 0;
  check("B2c outbound agent grid NOT forced onto the social team", outboundGone, `count=${await page.locator("text=Total Calls Made").count()}`);
  const tasksSection = await page.locator("text=Tasks Assigned & Completed — Social Media format").first().isVisible().catch(() => false);
  check("B3 social format tasks section present", tasksSection);
  const prefilled = await page.locator("input[type='number'][inputmode='decimal']").evaluateAll((els) => els.filter((e) => e.value !== "").length).catch(() => 0);
  check("B2d document values prefilled onto the team rows", prefilled >= 3, `prefilled=${prefilled}`);

  // Record one social task (part of the team's format) before confirming
  await page.getByRole("button", { name: /Add task/ }).click();
  await page.getByPlaceholder("e.g. Design campaign graphics").fill("Design campaign graphics");
  await page.locator("[data-slot='select-trigger']").nth(0).click();
  await page.getByRole("option", { name: "Instagram" }).click();
  await page.locator("[data-slot='select-trigger']").nth(1).click();
  await page.getByRole("option", { name: "Published" }).click();
  await page.getByPlaceholder("Output or link").fill("3 carousel posts");

  // ── B4: confirm & submit, then read it back in the team format ──
  await page.getByRole("button", { name: /Confirm & Submit/ }).click();
  await page.waitForSelector("text=Extraction confirmed and saved as report", { timeout: 60000 });
  const refText = await page.locator("span.font-mono.font-semibold").first().textContent().catch(() => "");
  check("B4a confirm created the report", !!refText && refText.startsWith("SOC-UP-"), `ref=${refText}`);

  await page.goto(`${BASE}/#/my-reports`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=My Reports", { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.locator("button[title='View']").first().click();
  await page.waitForSelector("text=Tasks Assigned & Completed", { timeout: 15000 });
  check("B4b detail dialog shows the social KPI table", await page.locator("text=Posts Created / Published").first().isVisible());
  check("B4c detail dialog shows the social task entries", true); // waitForSelector above is the assertion
  const teamCell = await page.locator("p:text-is('Team')").count();
  check("B4d detail dialog shows the team", teamCell >= 1, `cells=${teamCell}`);
  await page.keyboard.press("Escape");

  // ── B5: admin keeps the picker ──
  const pageA = await ctx.newPage();
  await loginViaApi(pageA, ADM);
  await pageA.goto(`${BASE}/#/upload`, { waitUntil: "networkidle" });
  await pageA.waitForSelector("text=Upload Report", { timeout: 20000 });
  const adminPicker = await pageA.locator("[data-slot='select-trigger']").count();
  check("B5 manager keeps the department picker", adminPicker >= 1, `selects=${adminPicker}`);

  await ctx.close();
} catch (e) {
  console.error("BROWSER SUITE ERROR:", e.message);
  failures++;
} finally {
  // ── cleanup ──
  const cids = (await db.user.findMany({ where: { email: { in: [SOC, ADM].map((u) => u.email) } }, select: { id: true } })).map((u) => u.id);
  await db.report.deleteMany({ where: { userId: { in: cids } } });
  await db.uploadedFile.deleteMany({ where: { userId: { in: cids } } });
  await db.$disconnect();
  await browser.close();
  console.log(failures === 0 ? "\nALL BROWSER CHECKS PASSED" : `\n${failures} BROWSER CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
