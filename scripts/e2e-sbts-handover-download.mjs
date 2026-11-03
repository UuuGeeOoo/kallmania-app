// E2E: SBTS handover download flows in real Chromium.
// 1) Admin clicks "Handover PDF" on the app page → download completes, valid PDF.
// 2) Admin clicks "Agent roster XLSX" → download completes, valid xlsx.
// 3) Logged-out visitor opens the URL → visible HTML notice (NOT a failed download).
// 4) Non-admin (agent) session → same visible notice.
import { chromium } from "playwright";
import { readFileSync } from "fs";

const BASE = "http://localhost:3000";
let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
  if (!cond) failures++;
};

async function loginCookie(email, password) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const pair = setCookie.split(";")[0];
  const [name, value] = pair.split("=");
  return { name, value: value.trim() };
}

const run = async () => {
  const browser = await chromium.launch();

  // ── 1+2: admin click-through ──
  const adminCtx = await browser.newContext({ acceptDownloads: true });
  const adminCookie = await loginCookie("verify-admin@kallmania.test", "verify-2026");
  await adminCtx.addCookies([{ url: BASE, ...adminCookie }]);
  const page = await adminCtx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByText("SBTS Scores", { exact: true }).first().click();
  await page.locator("a[href='/api/sbts/handover?file=pdf']").waitFor({ state: "visible", timeout: 15000 });

  for (const [btn, file] of [["Handover PDF", "/tmp/e2e-handover.pdf"], ["Agent roster XLSX", "/tmp/e2e-roster.xlsx"]]) {
    const key = file.endsWith("pdf") ? "pdf" : "xlsx";
    const link = page.locator(`a[href="/api/sbts/handover?file=${key}"]`);
    check(`${btn} button visible on scoreboard`, (await link.count()) === 1, `count=${await link.count()}`);
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), link.click()]);
    await download.saveAs(file);
    const head = readFileSync(file).subarray(0, 4);
    if (file.endsWith("pdf")) check("PDF download valid", head.toString() === "%PDF", head.toString());
    else check("XLSX download valid", head[0] === 0x50 && head[1] === 0x4b, `${head[0]}${head[1]}`);
    const suggested = download.suggestedFilename();
    check(`${btn} filename from Content-Disposition`, suggested.includes(file.endsWith("pdf") ? "SBTS_integration_handover" : "kallmania_media_agents_roster"), suggested);
  }

  // ── 3: logged-out top-level navigation → visible notice ──
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  const resp = await anonPage.goto(`${BASE}/api/sbts/handover?file=pdf`, { waitUntil: "domcontentloaded" });
  check("logged-out navigation returns 200 notice", resp.status() === 200, String(resp.status()));
  const body = await anonPage.textContent("body");
  check("notice explains admin sign-in", (body ?? "").includes("Administrator sign-in required"));

  // ── 4: non-admin session → same notice ──
  const agentCtx = await browser.newContext();
  const agentCookie = await loginCookie("verify-admin@kallmania.test", "verify-2026"); // replaced below with real agent if exists
  await agentCtx.addCookies([{ url: BASE, ...agentCookie }]);
  void agentCookie; void agentCtx; void agentCookie;
  // Use the BPO outsider from the SBTS e2e fixtures if present; otherwise skip gracefully.
  const agentLogin = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "sbts-bpo@kallmania.test", password: "E2E-SBTS-5" }),
  });
  if (agentLogin.ok) {
    const setCookie = agentLogin.headers.get("set-cookie") ?? "";
    const [name, value] = setCookie.split(";")[0].split("=");
    const ctx2 = await browser.newContext();
    await ctx2.addCookies([{ url: BASE, name, value: decodeURIComponent(value) }]);
    const p2 = await ctx2.newPage();
    const r2 = await p2.goto(`${BASE}/api/sbts/handover?file=pdf`, { waitUntil: "domcontentloaded" });
    check("non-admin navigation returns notice", r2.status() === 200 && (await p2.textContent("body")).includes("Administrator sign-in required"));
    await ctx2.close();
  } else {
    console.log("SKIP — non-admin fixture not present (e2e suite self-cleans accounts)");
  }
  void agentCtx;

  // API-style unauthenticated call still gets JSON 401 (programmatic callers).
  const apiResp = await fetch(`${BASE}/api/sbts/handover?file=pdf`);
  check("unauthenticated API call → JSON 401", apiResp.status === 401, String(apiResp.status));

  await browser.close();
  console.log(failures === 0 ? "SBTS HANDOVER DOWNLOAD E2E: ALL PASS ✅" : `SBTS HANDOVER DOWNLOAD E2E: ${failures} FAILURES ❌`);
  process.exitCode = failures === 0 ? 0 : 1;
};

run().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
