// Render scripts/sbts-handover-cover.html to /tmp/sbts-cover.pdf (A4) via Chromium.
// Used before running scripts/sbts-handover-pdf.py.
import { chromium } from "playwright";
import { pathToFileURL } from "url";

const html = new URL("./sbts-handover-cover.html", import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html.pathname).href, { waitUntil: "networkidle" });
await page.pdf({ path: "/tmp/sbts-cover.pdf", format: "A4", printBackground: true });
await browser.close();
console.log("cover rendered -> /tmp/sbts-cover.pdf");
