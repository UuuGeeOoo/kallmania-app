/**
 * Extraction accuracy test — realistic BPO outbound daily report with traps.
 * Produces "before" (deterministic-only) vs "after" (with LLM cross-check)
 * field results and verifies expected values.
 *
 * Run: bun scripts/test-extraction.ts
 */
import { mapTextToFields } from "../src/lib/extraction";
import { AGENT_KPI_DEFS } from "../src/lib/template-config";
import { writeFileSync } from "fs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const REPORT_TEXT = `DAILY REPORT — BPO CALL CENTER AGENTS (OUTBOUND CALLS)
Agent: Grace Adeyemi        Date: 2026-10-26        Campaign: Q4 Insurance Outreach

KEY PERFORMANCE METRICS
Total Calls Made: 47
Calls Connected: 31
Contact Rate: 66%
Total Mails Sent | 20
Successful Mails Sent: 17
Conversion Rate (%): 6.5
Avg. Talk Time (mins): 4.2
Wrap-Up / After-Call Work (mins): 15
Callbacks Scheduled: 5
Leads Generated (HOT / WARM): 3
— Hot Leads: 2
— Warm Leads: 1

CALL LOG SUMMARY
1 | Hidden River VA Clinic - 813-998-8000 | Interested | Yes | Asked for email follow-up with pricing
2 | Florida Department of Health - 813-307-8000 | Not Interested | No | Said they are not interested this quarter
3 | East Lake Family Dental - 321-236-1393 | Requested for Email | Yes | Manager asked for an email brochure
4 | The Smile Home Dental - 407-863-0473 | Warm Lead | Yes | Callback scheduled Friday 10:30

CHALLENGES / BLOCKERS
Two clinics had gatekeeper objections; the pricing sheet had to be sent manually.

ESCALATIONS
None today.

ADDITIONAL ACTIVITIES
Updated CRM dispositions and prepared follow-up email templates for the dental accounts.`;

// Ground truth (manually verified)
const EXPECTED: Record<string, number> = {
  totalCallsMade: 47,
  callsConnected: 31,
  contactRate: 66,
  totalMailsSent: 20,
  successfulMailsSent: 17,
  conversionRate: 6.5,
  avgTalkTime: 4.2,
  wrapUpTime: 15,
  callbacksScheduled: 5,
  leadsGenerated: 3,
  hotLeads: 2,
  warmLeads: 1,
};

// A value is CORRECT only when the field exists AND matches ground truth.
// Any field NOT in EXPECTED that still got a value is a FALSE POSITIVE.
function score(fields: { key: string; value: unknown; needsReview: boolean }[]) {
  let correct = 0, wrongValue = 0, falsePositives = 0, flagged = 0;
  const wrongList: string[] = [], fpList: string[] = [];
  for (const f of fields) {
    if (f.needsReview) flagged++;
    if (!(f.key in EXPECTED)) {
      falsePositives++;
      fpList.push(`${f.key}=${String(f.value)}`);
      continue;
    }
    if (typeof f.value === "number" && Math.abs(f.value - EXPECTED[f.key]) < 1e-9) correct++;
    else { wrongValue++; wrongList.push(`${f.key}=${String(f.value)} (expected ${EXPECTED[f.key]})`); }
  }
  const missing = Object.keys(EXPECTED).filter((k) => !fields.some((f) => f.key === k));
  return { correct, wrongValue, falsePositives, flagged, missing, wrongList, fpList };
}

function report(label: string, fields: { key: string; value: unknown; needsReview: boolean }[]) {
  const s = score(fields);
  console.log(`\n=== ${label} ===`);
  console.log(`fields found: ${fields.length}`);
  console.log(`correct: ${s.correct}/${Object.keys(EXPECTED).length}   wrong: ${s.wrongValue}   FALSE POSITIVES: ${s.falsePositives}   flagged for review: ${s.flagged}   missing: ${s.missing.length ? s.missing.join(",") : "none"}`);
  if (s.wrongList.length) console.log(`wrong values: ${s.wrongList.join(" | ")}`);
  if (s.fpList.length) console.log(`false positives: ${s.fpList.join(" | ")}`);
  return s;
}

// ── BEFORE: deterministic pass only ──
const det = mapTextToFields(REPORT_TEXT, "BPO");
report("BEFORE (deterministic alias matching only)", det.fields);
console.log(`deterministic sections: ${JSON.stringify(det.sections).slice(0, 220)}`);

// ── AFTER: full pipeline (deterministic + LLM cross-check) — runs through the
// real extractReport() exactly as the API does. ──
const { extractReport } = await import("../src/lib/extraction");
const result = await extractReport(Buffer.from(REPORT_TEXT, "utf8"), "text/plain", "grace-daily-2026-10-26.txt", "BPO");
if (!result.ok) {
  console.error("FULL PIPELINE FAILED:", result.error);
  process.exit(1);
}
report("AFTER (deterministic + AI cross-check / gap-fill)", result.fields);
console.log(`sections found: challenges=${!!result.sections.challenges} escalations=${!!result.sections.escalations} additional=${!!result.sections.additionalActivities}`);

// ── Also write the same report as DOCX + XLSX for the viewer / format tests ──
const doc = new Document({
  sections: [{
    children: REPORT_TEXT.split("\n").map((line) => {
      const heading = /^(KEY PERFORMANCE METRICS|CALL LOG SUMMARY|CHALLENGES \/ BLOCKERS|ESCALATIONS|ADDITIONAL ACTIVITIES|DAILY REPORT)/.test(line);
      return new Paragraph({
        heading: heading ? HeadingLevel.HEADING_2 : undefined,
        children: [new TextRun(line)],
      });
    }),
  }],
});
const docxBuf = await Packer.toBuffer(doc);
writeFileSync("/home/z/my-project/uploads-storage/test-grace-report.docx", docxBuf);
writeFileSync("/home/z/my-project/uploads-storage/test-grace-report.txt", REPORT_TEXT, "utf8");
console.log("\ntest files written to uploads-storage: test-grace-report.docx, test-grace-report.txt");
