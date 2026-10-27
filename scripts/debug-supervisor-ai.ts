// Debug: inspect raw AI findings/sections for the filled supervisor master
import { fillSupervisorDocx, type ReportLike } from "../src/lib/report-fill";
import { runDocumentIntelligence } from "../src/lib/doc-intel/pipeline";

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
  ]),
  qaObservations: "Call opening scripts followed in 9 of 10 sampled calls; one agent skipped the disclosure line.",
  escalatedIssues: JSON.stringify([{ description: "CRM licences for 2 new joiners still pending with IT.", priority: "High", status: "Open", action: "Chase IT ticket #4412." }]),
  highlights: "118.6% of the daily call target; two hot leads booked for product demos.",
  lowlights: "2 late arrivals affected the morning queue; absentee cover handled by Janet.",
  actionPlan: JSON.stringify([{ action: "Follow up on CRM licences with IT before 10am.", owner: "Vincent Akemhe", priority: "High", deadline: "2026-10-28" }]),
  user: { fullName: "Vincent Akemhe" },
} as never;

const buffer = await fillSupervisorDocx(report);
const result = await runDocumentIntelligence(buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "supervisor-e2e-filled.docx", "MANAGEMENT");
if (!result.ok || !result.full) throw new Error(result.error || "failed");
const full = result.full;

console.log("── markdown (team perf + highlights area) ──");
const md = result.ir?.markdown ?? "";
const idx = full_findIdx(md, /team performance/i);
console.log(md.slice(Math.max(0, idx - 100), idx + 2400));

console.log("\n── findings (label | kind | value | sourceRef | conf) ──");
for (const f of full.findings) console.log(`  ${f.rawLabel} | ${f.kind} | ${f.value} | ${f.sourceRef} | ${f.confidence}`);

console.log("\n── sections ──");
for (const s of full.sections) console.log(`  [${s.heading}] ${s.content.slice(0, 180).replace(/\n/g, " ⏎ ")}`);

console.log("\n── sectionText ──");
console.log(JSON.stringify(full.sectionText, null, 2));

console.log("\n── unmapped ──");
for (const u of full.unmapped) console.log(`  [${u.label}] ${u.content.slice(0, 100)}`);

function full_findIdx(text: string, re: RegExp): number {
  const m = re.exec(text);
  return m ? m.index : 0;
}
