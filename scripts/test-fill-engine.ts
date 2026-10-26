/**
 * Standalone test of the template-preserving fill engine.
 * Generates a filled AGENT_BPO + SUPERVISOR + TECH + SOCIAL report from the
 * bundled masters and dumps their text structure for verification.
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fillAgentBpoDocx, fillSupervisorDocx, fillTechDocx, fillSocialDocx } from "../src/lib/report-fill";

const MASTERS = path.join(process.cwd(), "assets", "report-templates");

// point the registry at the bundled assets (no DB in this harness)
process.env.KALLMANIA_TEST = "1";

// ── inject a master loader so the fills run without the DB ──
import { setMasterLoaderOverride } from "../src/lib/report-masters";

setMasterLoaderOverride(async (reportType: string) => {
  const map: Record<string, string> = {
    AGENT_BPO: "Daily_Report_Call_Centre.docx",
    SUPERVISOR: "Daily_Report_Supervisor.docx",
    TECH: "Daily_Report_Web_Development_Technical.docx",
    SOCIAL: "Daily_Report_Social_Media_Team.docx",
  };
  const file = map[reportType];
  if (!file) return null;
  const buffer = readFileSync(path.join(MASTERS, file));
  return { reportType, buffer, originalName: file, fileHash: "test" };
});

const agentReport = {
  type: "AGENT_BPO",
  reportDate: "2026-10-26T00:00:00.000Z",
  shiftTime: "09:00 - 17:00",
  clockIn: "08:57",
  clockOut: "17:04",
  attendanceStatus: "Present",
  latenessMins: 0,
  kpiMetrics: JSON.stringify([
    { key: "totalCallsMade", label: "Total Calls Made", target: 30, targetLabel: "30", actual: 34, variance: 4, unit: "count", notes: "" },
    { key: "totalMailsSent", label: "Total Mails Sent", target: 10, targetLabel: "10", actual: 12, variance: 2, unit: "count", notes: "" },
    { key: "callsConnected", label: "Calls Connected", target: 25, targetLabel: "25", actual: 21, variance: -4, unit: "count", notes: "3 voicemails" },
    { key: "successfulMailsSent", label: "Successful Mails Sent", target: 8, targetLabel: "8", actual: 9, variance: 1, unit: "count", notes: "" },
    { key: "contactRate", label: "Contact Rate (%)", target: 100, targetLabel: "100%", actual: 61.76, variance: -38.24, unit: "percent", notes: "" },
    { key: "conversionRate", label: "Conversion Rate (%)", target: 2, targetLabel: "2%", actual: 9.52, variance: 7.52, unit: "percent", notes: "" },
    { key: "avgTalkTime", label: "Avg. Talk Time (mins)", target: null, targetLabel: "-", actual: 4.5, variance: null, unit: "minutes", notes: "" },
    { key: "avgHoldTime", label: "Avg. Hold Time (mins)", target: null, targetLabel: "-", actual: 1.2, variance: null, unit: "minutes", notes: "" },
    { key: "callbacksScheduled", label: "Callbacks Scheduled", target: null, actual: 5, variance: null, unit: "count", notes: "" },
    { key: "leadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, actual: 2, variance: null, unit: "count", notes: "" },
    { key: "positiveDispositions", label: "Positive Dispositions", target: null, actual: 7, variance: null, unit: "count", notes: "" },
    { key: "notInterested", label: "Not Interested / Declined", target: null, actual: 6, variance: null, unit: "count", notes: "" },
    { key: "wrapUpTime", label: "Wrap-Up / After-Call Work (mins)", target: 20, targetLabel: "20mins", actual: 18, variance: -2, unit: "minutes", notes: "" },
    { key: "hotLeads", label: "— Hot Leads", target: null, actual: 1, variance: null, unit: "count", notes: "" },
    { key: "warmLeads", label: "— Warm Leads", target: null, actual: 1, variance: null, unit: "count", notes: "" },
    { key: "bouncedEmails", label: "Bounced Emails", target: null, actual: 1, variance: null, unit: "count", notes: "mailbox full" },
  ]),
  callLogs: JSON.stringify([
    { leadName: "Eastlake Motors", disposition: "Interested", followUp: "Yes", notes: "Send quote tomorrow" },
    { leadName: "Mrs. Adeyemi", disposition: "Requested for Email", followUp: "Yes", notes: "Wants price list by mail" },
    { leadName: "Bluegate Ltd", disposition: "Callback Requested", followUp: "Yes", notes: "Call Thursday 10am" },
    { leadName: "Dr. Hassan", disposition: "Not Interested", followUp: "No", notes: "Current contract runs to Q3" },
    { leadName: "Kolawole Traders", disposition: "No Answer", followUp: "Yes", notes: "Try after 4pm" },
    { leadName: "Ibeju Plaza", disposition: "Voicemail", followUp: "Yes", notes: "Left message" },
    { leadName: "Granite Works", disposition: "Hot Lead", followUp: "Yes", notes: "Wants 40 seats" },
    { leadName: "Simba Foods", disposition: "Warm Lead", followUp: "Yes", notes: "Send deck" },
    { leadName: "Overflow Entry 9", disposition: "Meeting Booked", followUp: "Yes", notes: "Row-clone test" },
    { leadName: "Overflow Entry 10", disposition: "Wrong Number", followUp: "No", notes: "Row-clone test 2" },
  ]),
  challenges: "Network outage between 11am and 12pm slowed dialing.\nAirtime for the test line ran out mid-shift.",
  escalations: "Granite Works wants a written 40-seat proposal — needs management pricing approval.",
  additionalActivities: "(no template section — stays in app)",
  user: { fullName: "Grace Effiom", employeeId: "SBTS-0142", role: "AGENT_BPO" },
};

const supervisorReport = {
  type: "SUPERVISOR",
  reportDate: "2026-10-26T00:00:00.000Z",
  teamName: "Outbound Squad A",
  campusLocation: "Lagos — Ikeja",
  agentsManaged: 12,
  shiftTime: "08:00 - 17:00",
  clockIn: "07:55",
  clockOut: "17:10",
  attendanceSummary: JSON.stringify({
    totalOnShift: { count: "12", details: "" },
    presentOnTime: { count: "10", details: "" },
    lateArrivals: { count: "1", details: "Tunde Balogun (12 mins)" },
    absentExcused: { count: "1", details: "Amaka Okeke — approved leave" },
    absentUnexcused: { count: "", details: "" },
    earlyDepartures: { count: "", details: "" },
  }),
  teamKpiAverages: JSON.stringify([
    { key: "totalCallsMade", label: "Total Calls Made (Team)", teamTarget: "30", teamAvg: "27.4", best: "Grace Effiom", lowest: "Tunde Balogun", notes: "" },
    { key: "avgCallsPerAgent", label: "Avg. Calls Per Agent", teamTarget: "", teamAvg: "27.4", best: "", lowest: "", notes: "" },
    { key: "conversionRate", label: "Team Conversion Rate (%)", teamTarget: "2", teamAvg: "3.1", best: "Grace Effiom", lowest: "Sunny Day", notes: "" },
    { key: "contactRate", label: "Team Contact Rate (%)", teamTarget: "100", teamAvg: "64.2", best: "", lowest: "", notes: "" },
    { key: "avgTalkTime", label: "Avg. Talk Time (mins)", teamTarget: "", teamAvg: "4.8", best: "", lowest: "", notes: "" },
    { key: "slaAdherence", label: "SLA Adherence (%)", teamTarget: "95", teamAvg: "92.5", best: "", lowest: "", notes: "Network outage window" },
    { key: "leadsGenerated", label: "HOT / WARM Leads Generated", teamTarget: "", teamAvg: "1.4", best: "", lowest: "", notes: "" },
    { key: "scheduleAdherence", label: "Schedule Adherence (%)", teamTarget: "90", teamAvg: "88", best: "", lowest: "", notes: "" },
  ]),
  coachingEntries: JSON.stringify([
    { agentName: "Tunde Balogun", type: "Coaching", details: "Reviewed call opening script; agreed on daily role-play" },
    { agentName: "Sunny Day", type: "Warning", details: "Two late arrivals this week — attendance expectations reset" },
  ]),
  qaObservations: "Monitored 6 calls. Greeting compliance 100%, but 2 agents skipped the recap step before closing.",
  escalatedIssues: JSON.stringify([
    { description: "Granite Works 40-seat proposal needs pricing approval", priority: "High", status: "OPEN", action: "Management to review margins" },
  ]),
  highlights: "Granite Works 40-seat opportunity confirmed as hot lead.",
  lowlights: "One hour of network outage reduced contact rate.",
  actionPlan: JSON.stringify([
    { action: "Role-play sessions for opening script", owner: "Team leads", priority: "High", deadline: "2026-10-27" },
    { action: "Send Granite Works proposal", owner: "Supervisor", priority: "High", deadline: "2026-10-28" },
  ]),
  user: { fullName: "Chinedu Obi", employeeId: "SBTS-0007", role: "SUPERVISOR" },
  reviewer: { fullName: "E. Christian" },
  reviewedAt: "2026-10-27T08:30:00.000Z",
};

const techReport = {
  type: "TECH",
  reportDate: "2026-10-26T00:00:00.000Z",
  shiftTime: "09:00 - 17:00",
  clockIn: "08:58",
  clockOut: "17:02",
  attendanceStatus: "Present",
  latenessMins: 0,
  metricsSummary: JSON.stringify({ tasksCompleted: 6, bugsResolved: 3, supportTicketsResolved: 4, deploymentsCompleted: 1, testCasesPassed: 12, milestonesDelivered: 1, codeReviewsDone: 2 }),
  workEntries: JSON.stringify([
    { task: "Checkout page redesign", project: "Kallmania Store", status: "Completed", deliverable: "PR #214 merged" },
    { task: "Fix login redirect loop", project: "Client Portal", status: "Completed", deliverable: "Hotfix v2.3.1" },
    { task: "API rate limiting", project: "Core API", status: "In Progress", deliverable: "PR open" },
  ]),
  challenges: "Staging database was down for 40 minutes.",
  escalations: "Client Portal SSL renewal needs vendor approval before Friday.",
  supervisorFeedback: "Good pace — keep the PR descriptions detailed.",
  user: { fullName: "Dev Okonkwo", employeeId: "SBTS-0301", role: "DEVELOPER" },
  reviewer: { fullName: "Chinedu Obi" },
  reviewedAt: "2026-10-27T09:00:00.000Z",
};

const socialReport = {
  type: "SOCIAL",
  reportDate: "2026-10-26T00:00:00.000Z",
  shiftTime: "09:00 - 17:00",
  clockIn: "09:01",
  clockOut: "17:00",
  attendanceStatus: "Late",
  latenessMins: 1,
  metricsSummary: JSON.stringify({ postsPlanned: 5, postsPublished: 4, reelsPublished: 2, storiesPublished: 6, reach: 8400, impressions: 11200, likes: 530, commentsHandled: 41, shares: 88, saves: 62, linkClicks: 140, messagesHandled: 27, followerGrowth: 96, campaignLeads: 9 }),
  workEntries: JSON.stringify([
    { task: "Launch carousel for IG", platform: "Instagram", status: "Completed", deliverable: "5-slide carousel live" },
    { task: "Product demo reel", platform: "TikTok", status: "Completed", deliverable: "Reel published" },
  ]),
  challenges: "Brand asset folder permissions delayed two designs.",
  escalations: "Need budget approval for boosted post.",
  supervisorFeedback: "Carousel performed well — reuse the layout.",
  user: { fullName: "Zainab Idris", employeeId: "SBTS-0410", role: "SOCIAL_MEDIA" },
  reviewer: { fullName: "Chinedu Obi" },
  reviewedAt: "2026-10-27T09:05:00.000Z",
};

async function main() {
  const outDir = "/tmp/filled";
  const jobs: [string, Promise<Buffer>][] = [
    ["agent_bpo", fillAgentBpoDocx(agentReport as never)],
    ["supervisor", fillSupervisorDocx(supervisorReport as never)],
    ["tech", fillTechDocx(techReport as never)],
    ["social", fillSocialDocx(socialReport as never)],
  ];
  for (const [name, p] of jobs) {
    const buf = await p;
    writeFileSync(`/tmp/filled_${name}.docx`, buf);
    console.log(`${name}: ${(buf.length / 1024).toFixed(0)} KB -> /tmp/filled_${name}.docx`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
