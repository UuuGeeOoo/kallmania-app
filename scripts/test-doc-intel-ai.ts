/**
 * Full pipeline E2E (WITH the AI stages) — runs the real document-intelligence
 * pipeline against the generated BPO DOCX and prints the whole review payload.
 *
 * Run: DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' .env) bun scripts/test-doc-intel-ai.ts
 */
import { writeFileSync, mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
import { runDocumentIntelligence } from "../src/lib/doc-intel/pipeline";

const cell = (t: string, bold = false) =>
  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold })] })] });
const row = (cells: string[], bold = false) =>
  new TableRow({ children: cells.map((c) => cell(c, bold)) });

const kpiRows: string[][] = [
  ["Metric", "Target", "Actual", "Variance"],
  ["Total Calls Made", "30", "45", "15"],
  ["Calls Answered", "25", "31", "6"],
  ["Total Mails Sent", "10", "0", "-10"],
  ["Successful Mails Sent", "8", "12", "4"],
  ["Contact Rate (%)", "100", "68.9", "-31.1"],
  ["Hot Leads", "2", "2", "0"],
  ["Warm Leads", "3", "1", "-2"],
];

// Reuse the DOCX produced by the deterministic test when present, else rebuild
const tmp = mkdtempSync(join(tmpdir(), "docintel-ai-"));
const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: "DAILY REPORT — BPO CALL CENTER AGENTS (OUTBOUND CALLS)", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: "Agent: Grace Adeyemi        Date: 2026-10-27        Campaign: Q4 Insurance Outreach" }),
        new Paragraph({ text: "Shift: 09:00 - 17:00        Clock In: 08:57        Clock Out: 17:04        Attendance: Present" }),
        new Paragraph({ text: "KEY PERFORMANCE METRICS", heading: HeadingLevel.HEADING_2 }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: kpiRows.map((r) => row(r, r[0] === "Metric")) }),
        new Paragraph({ text: "CALL LOG SUMMARY", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "1 | Hidden River VA Clinic - 813-998-8000 | Interested | Yes | Asked for email follow-up" }),
        new Paragraph({ text: "2 | Florida Dept of Health - 813-307-8000 | Not Interested | No | said not interested this quarter" }),
        new Paragraph({ text: "CHALLENGES / BLOCKERS", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Shared mailbox was locked out until 13:05; pricing sheets had to be sent from the personal mailbox." }),
        new Paragraph({ text: "ESCALATIONS", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Mailbox lockout escalated to IT at 11:20; resolved 13:05." }),
        new Paragraph({ text: "SUPERVISOR COMMENTS", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Grace handled the mailbox outage calmly and still beat the call target. Recommend recognising her at the Friday stand-up." }),
        new Paragraph({ text: "ADDITIONAL ACTIVITIES", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Trained the new starter on CRM disposition codes for 45 minutes after shift." }),
      ],
    },
  ],
});

const buf = Buffer.from(await Packer.toBuffer(doc));
const t0 = Date.now();
const out = await runDocumentIntelligence(buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "grace-daily-ai.docx", "BPO");
const dt = ((Date.now() - t0) / 1000).toFixed(1);

if (!out.ok || !out.full || !out.ir) {
  console.error("PIPELINE FAILED:", out.error);
  process.exit(1);
}
const { full, ir } = out;
console.log(`\nPipeline completed in ${dt}s · format=${ir.format} · tables=${ir.stats.tables} · chunks read=${full.coverage.chunksRead}`);
console.log(`\n── Document understanding ──`);
console.log(`  docType: ${full.meta.docType}`);
console.log(`  reportTypeGuess: ${full.meta.reportTypeGuess}  period: ${full.meta.reportingPeriod}`);
console.log(`  agent: ${full.meta.agentName}  team: ${full.meta.team}  campaign: ${full.meta.campaign}`);
console.log(`  attendance: ${JSON.stringify(full.meta.attendance)}`);
console.log(`\n── Routed KPIs (deterministic destinations) ──`);
for (const r of full.routed.filter((x) => x.kind === "ACTUAL")) {
  console.log(`  ${r.key.padEnd(24)} = ${String(r.value).padEnd(8)} [${r.confidence.toFixed(2)}]${r.needsReview ? " NEEDS-REVIEW: " + (r.reviewReason || "") : ""}  ← "${r.evidence.slice(0, 60)}" (${r.sourceRef})`);
}
console.log(`\n── Target/variance findings ──`);
for (const r of full.routed.filter((x) => x.kind !== "ACTUAL")) {
  console.log(`  ${r.key.padEnd(24)} kind=${r.kind} value=${r.value} reportedTarget=${r.reportedTarget ?? "-"} reportedVariance=${r.reportedVariance ?? "-"}`);
}
console.log(`\n── Narrative sections (${full.sections.length}) ──`);
for (const s of full.sections) console.log(`  • ${s.heading} (${s.content.length} chars) — ${s.sourceRef}`);
console.log(`\n── Unmapped / review queue (${full.unmapped.length}) ──`);
for (const u of full.unmapped) console.log(`  • ${u.label}: ${u.content.slice(0, 80)}… (${u.reason})`);
console.log(`\n── Validation (${full.validation.length}) ──`);
for (const v of full.validation) console.log(`  [${v.severity}] ${v.field}: ${v.message.slice(0, 120)}`);
console.log(`\n── Findings not routed (raw) ──`);
for (const f of full.findings.slice(0, 20)) console.log(`  "${f.rawLabel}" = ${f.value} (${f.kind}, conf ${f.confidence.toFixed(2)})`);
console.log(`\nWarnings: ${full.warnings.length ? full.warnings.join(" | ") : "none"}`);
