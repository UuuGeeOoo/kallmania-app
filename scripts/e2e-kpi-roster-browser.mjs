// Browser check: the cumulative KPI panel renders division groups + roster line.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

// Login via API + cookie injection (mirrors e2e-team-report-browser.mjs)
const res = await fetch(`${BASE}/api/auth`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "login", email: "verify-admin@kallmania.test", password: "verify-2026" }),
});
if (!res.ok) throw new Error("login failed: " + (await res.text()));
const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => {
  const [pair] = c.split(";");
  const idx = pair.indexOf("=");
  return { name: pair.slice(0, idx), value: pair.slice(idx + 1), domain: "localhost", path: "/" };
});
await ctx.addCookies(cookies);

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// The PeriodKpiPanel lives on the dashboard — wait for it AND its data rows.
const panel = page.locator("text=Performance — cumulative KPIs").first();
await panel.waitFor({ timeout: 30000 });
await panel.scrollIntoViewIfNeeded();
await page.waitForFunction(() => /Total Calls Made/.test(document.body.innerText), { timeout: 45000 });
await page.waitForTimeout(800);
const text = await page.evaluate(() => document.body.innerText);

const checks = [
  ["group header: call centre", /CALL CENTRE — OUTBOUND · INBOUND · EMAIL/i.test(text)],
  ["roster line", /Roster:/.test(text)],
  ["roster counts", /Outbound Call Centre \d/.test(text) && /Social Media & Campaign \d/.test(text)],
  ["method hint", /per-agent daily target × agents working × days with data/.test(text)],
  ["roster-scaled target label", /30\/agent × \d+ agents? × \d+ agent-days?/.test(text)],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}`);
  if (!ok) fail++;
}
await page.screenshot({ path: "/tmp/render/dashboard-kpi.png", clip: { x: 0, y: 0, width: 1440, height: 1000 } }).catch(() => {});
console.log(fail === 0 ? "BROWSER CHECK PASSED ✅" : `${fail} FAILED ❌`);
await browser.close();
process.exit(fail ? 1 : 0);
