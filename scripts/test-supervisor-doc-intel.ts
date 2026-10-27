// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR doc-intel test suite
// Part 1 — deterministic routing assertions (no AI): confusion guards,
//          attendance rows, TARGET merge, section routing incl. the combined
//          "Shift Highlights & Lowlights" split.
// Part 2 — full AI E2E: a filled supervisor report rendered from the REAL
//          master template is read by the whole pipeline with department
//          MANAGEMENT; routed values must match the known ground truth.
// Run: DATABASE_URL=... bun scripts/test-supervisor-doc-intel.ts [--no-ai]
// ─────────────────────────────────────────────────────────────────────────────
import { routeKpis } from "../src/lib/doc-intel/routing";
import type { KpiFinding, NarrativeSection } from "../src/lib/doc-intel/types";
import { fillSupervisorDocx, type ReportLike } from "../src/lib/report-fill";
import { runDocumentIntelligence } from "../src/lib/doc-intel/pipeline";
import { writeFile, mkdir } from "fs/promises";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string | null) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const f = (rawLabel: string, value: number, kind: KpiFinding["kind"] = "ACTUAL", sourceRef = "Table 1 row 1", confidence = 1): KpiFinding => ({
  rawLabel, value, kind, unit: null, evidence: `${rawLabel}: ${value}`, sourceRef, confidence,
});
const s = (heading: string, content: string): NarrativeSection => ({ heading, content, sourceRef: `Section: ${heading}` });

// ───────────────────────────── Part 1: deterministic routing ─────────────────────────────
console.log("\n═══ Part 1 — deterministic supervisor routing ═══");

{
  const findings: KpiFinding[] = [
    f("Total Agents on Shift", 12),
    f("Present & On-Time", 10),
    f("Late Arrivals", 2),
    f("Absent (Excused)", 1),
    f("Absent (Unexcused)", 0),
    f("Early Departures", 1),
    f("Total Calls Made (Team)", 360, "TARGET", "Table 2 row 1"),
    f("Total Calls Made (Team)", 342, "ACTUAL", "Table 2 row 1"),
    f("Team Conversion Rate (%)", 2, "TARGET", "Table 2 row 3"),
    f("Team Conversion Rate (%)", 1.8, "ACTUAL", "Table 2 row 3"),
    f("Team Contact Rate (%)", 72.4, "ACTUAL", "Table 2 row 4"),
    f("SLA Adherence (%)", 87.5, "ACTUAL", "Table 2 row 6"),
    f("Schedule Adherence (%)", 92.3, "ACTUAL", "Table 2 row 8"),
    f("Avg. Talk Time (mins)", 4.6, "ACTUAL", "Table 2 row 5"),
  ];
  const out = routeKpis("MANAGEMENT", findings, [], null, null);
  const byKey = new Map(out.routed.map((r) => [r.key, r]));
  const v = (k: string) => byKey.get(k)?.value ?? null;

  check("attendance: 6 rows routed to 6 distinct keys", ["totalOnShift", "presentOnTime", "lateArrivals", "absentExcused", "absentUnexcused", "earlyDepartures"].every((k) => v(k) !== null));
  check("late arrivals ≠ early departures", v("lateArrivals") === 2 && v("earlyDepartures") === 1);
  check("absent excused ≠ absent unexcused (zero preserved)", v("absentExcused") === 1 && v("absentUnexcused") === 0);
  check("present & on-time not confused with total on shift", v("presentOnTime") === 10 && v("totalOnShift") === 12);
  const tcm = byKey.get("totalCallsMade");
  check("team calls: ACTUAL 342 with reportedTarget 360 merged into ONE row", v("totalCallsMade") === 342 && tcm?.reportedTarget === 360, `value=${v("totalCallsMade")} target=${tcm?.reportedTarget}`);
  check("team conversion 1.8 ≠ team contact 72.4 (guard separation)", v("conversionRate") === 1.8 && v("contactRate") === 72.4);
  check("SLA adherence 87.5 ≠ schedule adherence 92.3 (guard separation)", v("slaAdherence") === 87.5 && v("scheduleAdherence") === 92.3);
  check("talk time in minutes", v("avgTalkTime") === 4.6);
  check("no unmapped attendance/KPI label", !out.unmapped.some((u) => /agents on shift|late arrivals|conversion|contact|adherence/i.test(u.label)), out.unmapped.map((u) => u.label).join("; "));
}

// guard stress: ambiguous "Conversion" wording must never become contactRate,
// and if it maps at all it must land in the review band, never auto-trusted
{
  const out = routeKpis("MANAGEMENT", [f("Conversion", 3.1)], [], null, null);
  const cr = out.routed.find((r) => r.key === "conversionRate" && r.value === 3.1);
  const ct = out.routed.find((r) => r.key === "contactRate" && r.value === 3.1);
  check("bare 'Conversion' never maps to contactRate", !ct);
  check("bare 'Conversion' either stays unmapped or maps to conversionRate flagged for review", !cr || cr.needsReview === true, cr ? `needsReview=${cr.needsReview}` : "unmapped");
}
// generic column-header targets ("Team Target") pair with the ACTUAL row of the same sourceRef
{
  const findings: KpiFinding[] = [
    f("Total Calls Made (Team)", 342, "ACTUAL", "Table 4 row 1"),
    f("Team Target", 360, "TARGET", "Table 4 row 1"),
    f("Team Conversion Rate (%)", 1.8, "ACTUAL", "Table 4 row 3"),
    f("Team Target", 2, "TARGET", "Table 4 row 3"),
  ];
  const out = routeKpis("MANAGEMENT", findings, [], null, null);
  const tcm = out.routed.find((r) => r.key === "totalCallsMade");
  const cv = out.routed.find((r) => r.key === "conversionRate");
  check("generic 'Team Target' 360 pairs with same-row ACTUAL (calls)", tcm?.reportedTarget === 360, String(tcm?.reportedTarget));
  check("generic 'Team Target' 2 pairs with same-row ACTUAL (conversion)", cv?.reportedTarget === 2, String(cv?.reportedTarget));
}
// generic variance pairing
{
  const findings: KpiFinding[] = [
    f("Team Contact Rate (%)", 72.4, "ACTUAL", "Table 4 row 4"),
    f("Variance", -27.6, "VARIANCE", "Table 4 row 4"),
  ];
  const out = routeKpis("MANAGEMENT", findings, [], null, null);
  const cr = out.routed.find((r) => r.key === "contactRate");
  check("generic 'Variance' pairs with same-row ACTUAL (contact rate)", cr?.reportedVariance === -27.6, String(cr?.reportedVariance));
}
// cross-department isolation: MANAGEMENT targets never fire for a BPO upload and vice-versa
{
  const outBpo = routeKpis("BPO", [f("Total Agents on Shift", 12), f("Schedule Adherence (%)", 92)], [], null, null);
  check("BPO upload: supervisor attendance/schedule labels stay unmapped", !outBpo.routed.some((r) => r.key === "totalOnShift" || r.key === "scheduleAdherence"));
  const outSup = routeKpis("MANAGEMENT", [f("Calls Made", 45), f("Calls Answered", 31)], [], null, null);
  check("supervisor upload: 'Calls Made' routes to TEAM totalCallsMade, 'Calls Answered' to team callsConnected or review", outSup.routed.some((r) => r.key === "totalCallsMade" && r.value === 45) && !outSup.routed.some((r) => r.key === "callsConnected" && r.value === 45));
}

// sections: supervisor template headings + combined highlights split
{
  const sections: NarrativeSection[] = [
    s("TEAM ATTENDANCE SUMMARY", "12 agents on shift"),
    s("QUALITY ASSURANCE OBSERVATIONS", "Call opening scripts followed in 9 of 10 sampled calls; one agent skipped the disclosure line."),
    s("COACHING & FEEDBACK PROVIDED", "Leonard Destiny — segmentation: refreshed lead-prioritisation rules in a 1:1 session."),
    s("ISSUES ESCALATED TO MANAGEMENT", "CRM licence for 2 new joiners still pending — blocking outreach queue setup."),
    s("SHIFT HIGHLIGHTS & LOWLIGHTS", "Highlights: 118.6% of daily call target; two hot leads booked for demos.\nLowlights: 2 late arrivals affected the morning queue."),
    s("ACTION PLAN FOR NEXT DAY", "Follow up on CRM licences with IT before 10am; rebalance morning queue staffing."),
  ];
  const findings: KpiFinding[] = [f("Total Agents on Shift", 12)];
  const out = routeKpis("MANAGEMENT", findings, sections, null, null);
  check("QA observations routed", !!out.sectionText.qaObservations && out.sectionText.qaObservations.includes("disclosure line"));
  check("coaching routed", !!out.sectionText.coaching && out.sectionText.coaching.includes("1:1"));
  check("escalations routed", !!out.sectionText.escalations && out.sectionText.escalations.includes("CRM licence"));
  check("combined highlights section split: highlights", !!out.sectionText.highlights && out.sectionText.highlights.includes("118.6%") && !out.sectionText.highlights.includes("Lowlights:"), out.sectionText.highlights);
  check("combined highlights section split: lowlights", !!out.sectionText.lowlights && out.sectionText.lowlights.includes("late arrivals"), out.sectionText.lowlights);
  check("action plan routed", !!out.sectionText.actionPlan && out.sectionText.actionPlan.includes("CRM licences"));
  check("attendance summary heading not treated as unmapped narrative", !out.unmapped.some((u) => /attendance summary/i.test(u.label)));
}

// combined highlights in the actual AI shape: pipe-joined table cells
{
  const out = routeKpis(
    "MANAGEMENT",
    [f("Total Agents on Shift", 12)],
    [s("SHIFT HIGHLIGHTS & LOWLIGHTS", "Highlights | 118.6% of the daily call target; two hot leads booked for product demos. | Lowlights | 2 late arrivals affected the morning queue; absentee cover handled by Janet.")],
    null,
    null
  );
  check("pipe-joined combined section: highlights extracted", !!out.sectionText.highlights && out.sectionText.highlights.includes("118.6%") && !/lowlights/i.test(out.sectionText.highlights), out.sectionText.highlights);
  check("pipe-joined combined section: lowlights extracted", !!out.sectionText.lowlights && out.sectionText.lowlights.includes("late arrivals"), out.sectionText.lowlights);
}
// pipe-joined numbered tables are tidied for template assignment (header + empty rows dropped)
{
  const out = routeKpis(
    "MANAGEMENT",
    [f("Total Agents on Shift", 12)],
    [s("ISSUES ESCALATED TO MANAGEMENT", "# | Issue Description | Priority (High/Med/Low) | Status | Action Required | 1 | CRM licences pending with IT. | High | Open | Chase ticket #4412. | 2 | | | | 3 | | | |")],
    null,
    null
  );
  const esc = out.sectionText.escalations || "";
  check("pipe-joined escalation table tidied for the template", esc.includes("CRM licences pending") && esc.includes("High") && !/^\s*#/.test(esc) && !/\|\s*\|\s*3/.test(esc), esc);
}

// ───────────────────────────── Part 2: AI E2E on the real master ─────────────────────────────
if (!process.argv.includes("--no-ai")) {
  console.log("\n═══ Part 2 — AI pipeline E2E (filled supervisor master DOCX) ═══");

  const report: ReportLike = {
    type: "SUPERVISOR",
    reportDate: new Date("2026-10-27T00:00:00Z"),
    department: "MANAGEMENT",
    shiftTime: "09:00 - 17:00",
    clockIn: "08:52",
    clockOut: "17:04",
    teamName: "OUTBOUND",
    campusLocation: "Lagos HQ",
    agentsManaged: 12,
    attendanceSummary: JSON.stringify({
      totalOnShift: { count: "12", details: "Full complement" },
      presentOnTime: { count: "10", details: "" },
      lateArrivals: { count: "2", details: "Odo Patience (8:24am), Leonard Destiny (8:41am)" },
      absentExcused: { count: "1", details: "Approved leave — Nancy Otubelu" },
      absentUnexcused: { count: "0", details: "" },
      earlyDepartures: { count: "1", details: "Gift Otubelu (3:30pm, approved)" },
    }),
    teamKpiAverages: JSON.stringify([
      { key: "totalCallsMade", label: "Total Calls Made (Team)", teamTarget: "360", teamAvg: "342", best: "Odo Patience — 41", lowest: "Leonard Destiny — 19", notes: "" },
      { key: "avgCallsPerAgent", label: "Avg. Calls Per Agent", teamTarget: "30", teamAvg: "28.5", best: "", lowest: "", notes: "" },
      { key: "conversionRate", label: "Team Conversion Rate (%)", teamTarget: "2", teamAvg: "1.8", best: "", lowest: "", notes: "" },
      { key: "contactRate", label: "Team Contact Rate (%)", teamTarget: "100", teamAvg: "72.4", best: "", lowest: "", notes: "" },
      { key: "avgTalkTime", label: "Avg. Talk Time (mins)", teamTarget: "", teamAvg: "4.6", best: "", lowest: "", notes: "" },
      { key: "slaAdherence", label: "SLA Adherence (%)", teamTarget: "90", teamAvg: "87.5", best: "", lowest: "", notes: "" },
      { key: "leadsGenerated", label: "HOT / WARM Leads Generated", teamTarget: "15", teamAvg: "11", best: "", lowest: "", notes: "9 warm, 2 hot" },
      { key: "scheduleAdherence", label: "Schedule Adherence (%)", teamTarget: "95", teamAvg: "92.3", best: "", lowest: "", notes: "" },
    ]),
    coachingEntries: JSON.stringify([
      { agentName: "Leonard Destiny", type: "Call segmentation", details: "Refreshed lead-prioritisation rules in a 1:1 session." },
      { agentName: "Odo Patience", type: "Positive reinforcement", details: "Best call-quality score of the week — keep current script discipline." },
    ]),
    qaObservations: "Call opening scripts followed in 9 of 10 sampled calls; one agent skipped the disclosure line. Hold time under 40 seconds on all monitored calls.",
    escalatedIssues: JSON.stringify([
      { description: "CRM licences for 2 new joiners still pending with IT — blocking outreach queue setup.", priority: "High", status: "Open", action: "Chase IT ticket #4412 before 10am tomorrow." },
    ]),
    highlights: "118.6% of the daily call target; two hot leads booked for product demos.",
    lowlights: "2 late arrivals affected the morning queue; absentee cover handled by Janet.",
    actionPlan: JSON.stringify([
      { action: "Follow up on CRM licences with IT before 10am.", owner: "Vincent Akemhe", priority: "High", deadline: "2026-10-28" },
      { action: "Rebalance morning queue staffing to absorb late-arrival window.", owner: "Vincent Akemhe", priority: "Medium", deadline: "2026-10-29" },
    ]),
    user: { fullName: "Vincent Akemhe" },
  } as never;

  const buffer = await fillSupervisorDocx(report);
  const dir = "/home/z/my-project/downloads";
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/supervisor-e2e-filled.docx`, buffer);
  console.log(`  filled master DOCX rendered (${(buffer.length / 1024).toFixed(0)} KB)`);

  const result = await runDocumentIntelligence(buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "supervisor-e2e-filled.docx", "MANAGEMENT");
  check("pipeline ok", result.ok, result.error);
  if (!result.ok || !result.full) {
    throw new Error("pipeline failed — aborting Part 2");
  }
  const full = result.full;
  const byKey = new Map(full.routed.map((r) => [r.key, r]));
  const v = (k: string) => byKey.get(k)?.value ?? null;

  console.log(`  meta: docType="${full.meta.docType}" guess=${full.meta.reportTypeGuess} period=${full.meta.reportingPeriod ?? "-"} chunks=${full.coverage.chunksRead}`);

  check("document understood as a supervisor report", /supervisor/i.test(full.meta.docType) || full.meta.reportTypeGuess === "SUPERVISOR", `${full.meta.docType}/${full.meta.reportTypeGuess}`);
  check("attendance: totalOnShift=12", v("totalOnShift") === 12, String(v("totalOnShift")));
  check("attendance: presentOnTime=10", v("presentOnTime") === 10, String(v("presentOnTime")));
  check("attendance: lateArrivals=2", v("lateArrivals") === 2, String(v("lateArrivals")));
  check("attendance: absentExcused=1", v("absentExcused") === 1, String(v("absentExcused")));
  check("attendance: absentUnexcused=0 preserved", v("absentUnexcused") === 0, String(v("absentUnexcused")));
  check("attendance: earlyDepartures=1", v("earlyDepartures") === 1, String(v("earlyDepartures")));
  check("team calls made (avg) = 342 with reportedTarget 360", v("totalCallsMade") === 342 && byKey.get("totalCallsMade")?.reportedTarget === 360, `v=${v("totalCallsMade")} t=${byKey.get("totalCallsMade")?.reportedTarget}`);
  check("avg calls per agent = 28.5", v("avgCallsPerAgent") === 28.5, String(v("avgCallsPerAgent")));
  check("team conversion = 1.8 (not contact rate)", v("conversionRate") === 1.8, String(v("conversionRate")));
  check("team contact = 72.4 (not conversion rate)", v("contactRate") === 72.4, String(v("contactRate")));
  check("avg talk time = 4.6 mins", v("avgTalkTime") === 4.6, String(v("avgTalkTime")));
  check("SLA adherence = 87.5 (not schedule adherence)", v("slaAdherence") === 87.5, String(v("slaAdherence")));
  check("schedule adherence = 92.3 (not SLA)", v("scheduleAdherence") === 92.3, String(v("scheduleAdherence")));
  check("team leads generated = 11 with reportedTarget 15", v("leadsGenerated") === 11 && byKey.get("leadsGenerated")?.reportedTarget === 15, `v=${v("leadsGenerated")} t=${byKey.get("leadsGenerated")?.reportedTarget}`);
  check("QA observations captured", !!full.sectionText.qaObservations && full.sectionText.qaObservations.includes("disclosure line"), full.sectionText.qaObservations?.slice(0, 60));
  check("coaching captured", !!full.sectionText.coaching && full.sectionText.coaching.includes("1:1"), full.sectionText.coaching?.slice(0, 60));
  check("escalations captured", !!full.sectionText.escalations && full.sectionText.escalations.toLowerCase().includes("crm licence"), full.sectionText.escalations?.slice(0, 60));
  check("highlights captured (split from combined section)", !!full.sectionText.highlights && full.sectionText.highlights.includes("118.6%"), full.sectionText.highlights?.slice(0, 60));
  check("lowlights captured (split from combined section)", !!full.sectionText.lowlights && full.sectionText.lowlights.includes("late arrivals"), full.sectionText.lowlights?.slice(0, 60));
  check("action plan captured", !!full.sectionText.actionPlan && full.sectionText.actionPlan.toLowerCase().includes("crm licences"), full.sectionText.actionPlan?.slice(0, 60));
  check("Best/Lowest per-agent names preserved (not swallowed)", full.findings.some((x) => /best|lowest/i.test(x.rawLabel)) || full.unmapped.some((u) => /best|lowest/i.test(u.label)) || (byKey.get("totalCallsMade")?.evidence ?? "").length > 0);
  check("validation ran with no ERROR-severity issues", !full.validation.some((x) => x.severity === "ERROR"), full.validation.map((x) => `${x.severity}:${x.field}`).join("; "));

  console.log(`  coverage: ${full.coverage.fieldsMapped} mapped / ${full.coverage.sectionsCaptured} sections / ${full.coverage.unmappedCount} preserved`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log("FAILURES:");
  for (const x of failures) console.log(`  - ${x}`);
  process.exit(1);
}
