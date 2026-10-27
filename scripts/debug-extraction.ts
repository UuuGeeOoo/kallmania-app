/** Debug: verify the AI cross-check stage runs and what it returns. */
import { extractReport } from "../src/lib/extraction";
import { readFileSync } from "fs";

const text = readFileSync("/home/z/my-project/uploads-storage/test-grace-report.txt", "utf8");
const result = await extractReport(Buffer.from(text, "utf8"), "text/plain", "grace-daily-2026-10-26.txt", "BPO");
if (!result.ok) { console.error("FAILED:", result.error); process.exit(1); }
for (const f of result.fields) {
  console.log(`${f.key} = ${String(f.value)}  [${f.confidence}]${f.needsReview ? " NEEDS-REVIEW" : ""}`);
  if (f.needsReview) console.log(`   source: ${f.source}`);
}
