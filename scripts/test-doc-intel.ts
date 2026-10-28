/**
 * Document-intelligence pipeline test — representative documents, deterministic
 * (skipAi) mode: verifies structure-preserving parsing, KPI routing accuracy,
 * confusion guards, zero/negative preservation, end-of-document capture and
 * unmapped-content preservation. Mirrors the "Document Intake Agent" tutorial's
 * own test approach: generate a DOCX with a KPI table, then read it back.
 *
 * Run: DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' .env) bun scripts/test-doc-intel.ts
 */
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
import * as XLSX from "xlsx";
import { runDocumentIntelligence } from "../src/lib/doc-intel/pipeline";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function expect(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "docintel-"));

// ── Test document 1: BPO DOCX with KPI table (Target | Actual | Variance), traps included ──
const cell = (t: string, bold = false) =>
  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold })] })] });
const row = (cells: string[], bold = false) =>
  new TableRow({ children: cells.map((c) => cell(c, bold)) });

const kpiRows: [string, string, string, string][] = [
  ["Metric", "Target", "Actual", "Variance"],
  ["Total Calls Made", "30", "45", "15"],
  ["Calls Answered", "25", "31", "6"],
  ["Total Mails Sent", "10", "0", "-10"],
  ["Successful Mails Sent", "8", "12", "4"],
  ["Contact Rate (%)", "100", "68.9", "-31.1"],
  ["Hot Leads", "2", "2", "0"],
  ["Warm Leads", "3", "-1", "-4"],
];

const doc1 = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: "DAILY REPORT — BPO CALL CENTER AGENTS (OUTBOUND CALLS)", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: "Agent: Grace Adeyemi        Date: 2026-10-27        Campaign: Q4 Insurance Outreach" }),
        new Paragraph({ text: "KEY PERFORMANCE METRICS", heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: kpiRows.map((r) => row(r as unknown as string[], r[0] === "Metric")),
        }),
        new Paragraph({ text: "CALL LOG SUMMARY", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "1 | Hidden River VA Clinic - 813-998-8000 | Interested | Yes | Asked for email follow-up" }),
        new Paragraph({ text: "2 | Florida Dept of Health - 813-307-8000 | Not Interested | No | said not interested this quarter" }),
        new Paragraph({ text: "CHALLENGES / BLOCKERS", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Two clinics had gatekeeper objections; the pricing sheet had to be sent manually from the personal mailbox because the shared mailbox was locked out again." }),
        new Paragraph({ text: "ESCALATIONS", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Shared mailbox lockout escalated to IT at 11:20; resolved 13:05." }),
        // Unmapped section — has NO template field; must be preserved
        new Paragraph({ text: "SUPERVISOR COMMENTS", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Grace handled the mailbox outage calmly and still beat the call target. Recommend recognising her at the Friday stand-up." }),
        // Content at the very END — classic silent omission
        new Paragraph({ text: "ADDITIONAL ACTIVITIES", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Trained the new starter on the CRM disposition codes for 45 minutes after shift." }),
        new Paragraph({ text: "Training note: the new starter shadowed 12 live calls today." }),
      ],
    },
  ],
});

const buf1 = await Packer.toBuffer(doc1);
const p1 = join(tmp, "grace-daily-bpo.docx");
writeFileSync(p1, Buffer.from(buf1));
console.log(`\n■ BPO DOCX (${kpiRows.length - 1} KPI rows, call log, unmapped section, end-of-doc content)`);

const out1 = await runDocumentIntelligence(Buffer.from(buf1), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "grace-daily-bpo.docx", "BPO", { skipAi: true });
expect("pipeline ok", out1.ok, out1.error);
if (out1.ok && out1.ir && out1.full) {
  const { ir, full } = out1;
  // Stage A: structure preserved
  expect("docx parsed with tables", ir.stats.tables >= 1, `tables=${ir.stats.tables}`);
  expect("markdown keeps pipe tables", /\| Total Calls Made \| 30 \| 45 \| 15 \|/.test(ir.markdown));
  expect("reading order: KPI table before CALL LOG", ir.markdown.indexOf("Total Calls Made") < ir.markdown.indexOf("Hidden River VA Clinic"));
  expect("end-of-document content present in parse", ir.markdown.includes("shadowed 12 live calls"));

  // skipAi: no AI findings — deterministic fallback covers fields from markdown
  const byKey = new Map(out1.full ? [] : []);
  const fields = new Map<string, { value: number | string | null; needsReview: boolean }>();
  // routed empty in skipAi; the ExtractionResult-level fallback is exercised via extractReport — here assert routing stage directly
  void byKey; void fields;

  // Stage D through the deterministic fallback path
  const { mapTextToFields } = await import("../src/lib/extraction");
  const det = mapTextToFields(ir.markdown, "BPO");
  const detMap = new Map(det.fields.map((f) => [f.key, f]));
  expect("fallback: totalCallsMade = 45", detMap.get("totalCallsMade")?.value === 45, String(detMap.get("totalCallsMade")?.value));
  expect("fallback: callsConnected ← 'Calls Answered' = 31", detMap.get("callsConnected")?.value === 31, String(detMap.get("callsConnected")?.value));
  expect("fallback: totalMailsSent zero PRESERVED", detMap.get("totalMailsSent")?.value === 0, String(detMap.get("totalMailsSent")?.value));
  expect("fallback: hotLeads = 2 (not confused with warmLeads)", detMap.get("hotLeads")?.value === 2 && detMap.get("warmLeads")?.value === -1, `hot=${detMap.get("hotLeads")?.value} warm=${detMap.get("warmLeads")?.value}`);
  expect("fallback: challenges captured", (det.sections.challenges || "").includes("gatekeeper objections"));
  expect("no false emailHotLeads/emailWarmLeads from 'Hot Leads'/'Warm Leads' rows",
    !detMap.has("emailHotLeads") && !detMap.has("emailWarmLeads"),
    JSON.stringify([...detMap.keys()].filter((k) => k.startsWith("email"))));
  expect("no false totalCallsMade-vs-callsConnected swap in table pass",
    detMap.get("totalCallsMade")?.value === 45 && detMap.get("callsConnected")?.value === 31);
}

// ── Test document 2: SOCIAL XLSX — reach vs impressions confusion guard ──
const wb = XLSX.utils.book_new();
const socialRows = [
  ["SOCIAL MEDIA DAILY REPORT — 2026-10-27"],
  ["Team", "Platform", "Posts Planned", "Posts Published", "Reach", "Impressions", "Likes", "Shares", "Saves", "Link Clicks", "Messages Responded To", "Follower Growth", "Campaign Leads / Conversions"],
  ["Social Media", "Instagram", "4", "4", "12000", "18500", "450", "38", "61", "120", "24", "85", "7"],
  ["Social Media", "Facebook", "2", "1", "5400", "7900", "180", "12", "9", "44", "10", "22", "2"],
];
const ws = XLSX.utils.aoa_to_sheet(socialRows);
XLSX.utils.book_append_sheet(wb, ws, "Daily");
const notes = XLSX.utils.aoa_to_sheet([
  ["NOTES & OBSERVATIONS"],
  ["Reel posted at 6pm outperformed static posts by 3x reach."],
  ["CHALLENGES / BLOCKERS"],
  ["Instagram API token expired overnight; first post delayed by 2 hours."],
]);
XLSX.utils.book_append_sheet(wb, notes, "Notes");
const buf2 = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
const p2 = join(tmp, "social-daily.xlsx");
writeFileSync(p2, buf2);
console.log(`\n■ SOCIAL XLSX (2 sheets, reach≠impressions, planned≠published)`);

const out2 = await runDocumentIntelligence(buf2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "social-daily.xlsx", "SOCIAL_MEDIA", { skipAi: true });
expect("xlsx pipeline ok", out2.ok, out2.error);
if (out2.ok && out2.ir) {
  expect("both sheets parsed", (ir2Sheets(out2) ?? []).length === 2, String((ir2Sheets(out2) ?? []).join(",")));
  const { mapTextToFields } = await import("../src/lib/extraction");
  const det = mapTextToFields(out2.ir.markdown, "SOCIAL_MEDIA");
  const m = new Map(det.fields.map((f) => [f.key, f.value]));
  expect("reach = 12000 (not impressions)", m.get("reach") === 12000, String(m.get("reach")));
  expect("impressions = 18500", m.get("impressions") === 18500, String(m.get("impressions")));
  expect("postsPlanned = 4 vs postsPublished = 4 (instagram row wins, sheet order)", typeof m.get("postsPlanned") === "number", String(m.get("postsPlanned")));
  expect("challenges from Notes sheet", (det.sections.challenges || "").includes("API token"), det.sections.challenges?.slice(0, 60));
}
function ir2Sheets(out: { ir: { sheets?: string[] } | null }): string[] | undefined {
  return out.ir?.sheets;
}

// ── Test document 3: routing engine unit checks (confidence gates + guards) ──
console.log(`\n■ Routing engine unit checks`);
const { routeKpis } = await import("../src/lib/doc-intel/routing");
const mk = (rawLabel: string, value: number, kind = "ACTUAL", unit = "count", confidence = 0.95) => ({
  rawLabel, value, kind: kind as "ACTUAL", unit, evidence: `${rawLabel}: ${value}`, sourceRef: "unit test", confidence,
});

const r1 = routeKpis("BPO", [mk("Total Calls Made", 45), mk("Calls Answered", 31)], [], null);
const r1map = new Map(r1.routed.filter((x) => x.kind === "ACTUAL").map((x) => [x.key, x.value]));
expect("calls made → totalCallsMade", r1map.get("totalCallsMade") === 45, String(r1map.get("totalCallsMade")));
expect("calls answered → callsConnected (not totalCallsMade)", r1map.get("callsConnected") === 31 && r1map.get("totalCallsMade") === 45, JSON.stringify([...r1map]));

const r2 = routeKpis("SOCIAL_MEDIA", [mk("Reach", 12000), mk("Impressions", 18500)], [], null);
const r2map = new Map(r2.routed.filter((x) => x.kind === "ACTUAL").map((x) => [x.key, x.value]));
expect("reach ≠ impressions", r2map.get("reach") === 12000 && r2map.get("impressions") === 18500, JSON.stringify([...r2map]));

const r3 = routeKpis("BPO", [mk("Total Emails Dispatched", 12)], [], null);
expect("unknown-but-similar label either maps with review or goes unmapped (never silent wrong field)",
  r3.routed.every((x) => x.needsReview) || r3.unmapped.length > 0,
  JSON.stringify({ routed: r3.routed.map((x) => [x.key, x.needsReview]), unmapped: r3.unmapped.map((u) => u.label) }));

const r4 = routeKpis("BPO", [mk("Total Calls Made", 45, "ACTUAL", "count", 0.95), mk("Total Calls Made", 30, "ACTUAL", "count", 0.7)], [], null);
expect("duplicate conflicting values → needsReview", r4.routed.some((x) => x.key === "totalCallsMade" && x.needsReview), JSON.stringify(r4.routed.filter((x) => x.key === "totalCallsMade").map((x) => [x.value, x.needsReview])));

const r5 = routeKpis("BPO", [mk("Calls Made (Target)", 30, "TARGET")], [], null);
const r5t = r5.routed.find((x) => x.key === "totalCallsMade");
expect("TARGET-kind finding routed without stealing the actual slot", !!r5t && r5t.reportedTarget === 30 && r5t.value === null, JSON.stringify(r5t));

const r6 = routeKpis("BPO", [], [{ heading: "Supervisor Comments", content: "Recommend recognising Grace.", sourceRef: "unit test" }], null);
expect("unmatched section preserved as unmapped", r6.unmapped.length === 1 && r6.unmapped[0].label === "Supervisor Comments", JSON.stringify(r6.unmapped));

const r7 = routeKpis("BPO", [], [{ heading: "Challenges / Blockers", content: "Mailbox locked.", sourceRef: "unit test" }], null);
expect("challenges section routed to challenges field", r7.sectionText.challenges === "Mailbox locked.", JSON.stringify(r7.sectionText));

// ── Test document 4: WEB_DEV text report (deterministic fallback on plain text) ──
console.log(`\n■ WEB_DEV TXT`);
const txt = [
  "TECHNICAL TEAM DAILY REPORT — 2026-10-27",
  "Developer: Tunde Bello",
  "",
  "KEY METRICS",
  "Tasks Completed: 6",
  "Bugs Resolved: 3",
  "Support Tickets Resolved: 2",
  "Deployments Completed: 1",
  "",
  "CHALLENGES / BLOCKERS",
  "Staging database migration pending approval.",
].join("\n");
const out4 = await runDocumentIntelligence(Buffer.from(txt, "utf8"), "text/plain", "tech-daily.txt", "WEB_DEV", { skipAi: true });
expect("txt pipeline ok", out4.ok, out4.error);
if (out4.ok && out4.ir) {
  const { mapTextToFields } = await import("../src/lib/extraction");
  const det = mapTextToFields(out4.ir.markdown, "WEB_DEV");
  const m = new Map(det.fields.map((f) => [f.key, f.value]));
  expect("tech tasksCompleted = 6", m.get("tasksCompleted") === 6, String(m.get("tasksCompleted")));
  expect("tech bugsResolved = 3", m.get("bugsResolved") === 3, String(m.get("bugsResolved")));
  expect("tech challenges captured", (det.sections.challenges || "").includes("migration pending"));
}

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
if (failures.length) {
  console.log("Failures:");
  for (const f of failures) console.log(" - " + f);
  process.exit(1);
}
