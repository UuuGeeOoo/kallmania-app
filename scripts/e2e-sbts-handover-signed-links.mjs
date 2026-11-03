/**
 * E2E: signed handover download links work with NO login at all.
 * Drives real Chromium (headless via Xvfb), fresh context — zero cookies —
 * navigates to the signed URLs like a user pasting them in the address bar,
 * saves both downloads and asserts magic bytes, filenames and sizes.
 * Also asserts a tampered link shows the visible notice page instead of a
 * cryptic failed download.
 *
 * Run: DISPLAY=:99 node scripts/e2e-sbts-handover-signed-links.mjs
 */
import { chromium } from "playwright";
import { readFileSync, statSync } from "fs";
import { createHmac } from "crypto";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const DAYS = Number(process.env.DAYS || 7);
const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;

// The signing secret lives in the shared DB — read it through the running
// app's own generator path is overkill here; hit the DB via prisma? In e2e we
// simply reuse the app: the links below were minted with the same formula the
// route verifies. To stay independent, fetch the secret from the DB with bun
// is not available from node — so we accept links passed via env or compute
// them via the API-side script contract by reading SystemFlag through a
// helper endpoint? NO — simplest correct path: compute with the secret from
// the DB using prisma client already generated in this repo.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

let results = [];
const ok = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
};

const main = async () => {
  const flag = await prisma.systemFlag.findUnique({ where: { key: "handover:signing-secret" } });
  if (!flag?.value) throw new Error("handover signing secret not found in DB");
  const secret = flag.value;
  const sign = (file) => createHmac("sha256", secret).update(`handover:v1:${file}:${exp}`).digest("hex");

  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  // Prove the context is logged OUT
  const session = await context.cookies();
  ok("fresh context has zero cookies", session.length === 0, `${session.length} cookies`);

  // ── PDF via top-level navigation, no login ──
  const pdfUrl = `${BASE}/api/sbts/handover?file=pdf&exp=${exp}&sig=${sign("pdf")}`;
  // A navigation that turns into a download never fires "load" — Playwright
  // raises "Download is starting" from goto; that IS the success path here.
  const [dlPdf] = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    page.goto(pdfUrl).catch((e) => {
      if (!String(e).includes("Download is starting")) throw e;
    }),
  ]);
  const pdfPath = "/tmp/e2e-signed-handover.pdf";
  await dlPdf.saveAs(pdfPath);
  ok("PDF download suggested filename", dlPdf.suggestedFilename() === "SBTS_integration_handover_v1.pdf", dlPdf.suggestedFilename());
  const pdfHead = readFileSync(pdfPath).subarray(0, 5).toString();
  ok("PDF magic bytes %PDF-", pdfHead === "%PDF-", pdfHead);
  const pdfSize = statSync(pdfPath).size;
  ok("PDF size 227354 bytes", pdfSize === 227354, String(pdfSize));

  // ── XLSX via top-level navigation, no login ──
  const xlsxUrl = `${BASE}/api/sbts/handover?file=xlsx&exp=${exp}&sig=${sign("xlsx")}`;
  const [dlXlsx] = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    page.goto(xlsxUrl).catch((e) => {
      if (!String(e).includes("Download is starting")) throw e;
    }),
  ]);
  const xlsxPath = "/tmp/e2e-signed-roster.xlsx";
  await dlXlsx.saveAs(xlsxPath);
  ok("XLSX suggested filename", dlXlsx.suggestedFilename() === "kallmania_media_agents_roster.xlsx", dlXlsx.suggestedFilename());
  const xlsxMagic = readFileSync(xlsxPath).subarray(0, 2).toString();
  ok("XLSX magic bytes PK", xlsxMagic === "PK", xlsxMagic);
  const xlsxSize = statSync(xlsxPath).size;
  ok("XLSX size 6898 bytes", xlsxSize === 6898, String(xlsxSize));

  // ── Tampered link → visible notice page (NOT a failed download) ──
  const badUrl = `${BASE}/api/sbts/handover?file=pdf&exp=${exp}&sig=${"0".repeat(64)}`;
  const resp = await page.goto(badUrl);
  const body = await page.textContent("body");
  ok("tampered link returns 200 page", resp.status() === 200, `status ${resp.status()}`);
  ok("tampered link shows visible notice", (body || "").includes("Administrator sign-in required"));

  await browser.close();
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
