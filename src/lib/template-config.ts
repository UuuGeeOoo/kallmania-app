// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE CONFIG — Field mapping derived from the attached master templates:
//   1) "Daily Report Call Centre.docx"  (BPO Call Center Agents — Outbound Calls)
//   2) "Daily_Report_Supervisor.docx"   (BPO Supervisor)
// SBTS Group Global
// The original headings, field order, targets and terminology are preserved.
// Extensions (e.g. detailed email metrics) are appended under EMAIL_EXTENSION.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY_HEADER = "SBTS Group Global";
export const AGENT_TEMPLATE_TITLE = "DAILY REPORT — BPO CALL CENTER AGENTS (OUTBOUND CALLS)";
export const SUPERVISOR_TEMPLATE_TITLE = "DAILY REPORT — BPO SUPERVISOR";

export interface KpiDef {
  key: string;
  label: string;
  target: number | null;
  targetLabel?: string; // e.g. "-" or "20mins"
  unit: "count" | "percent" | "minutes";
  category: "CORE_TEMPLATE" | "EMAIL_EXTENSION" | "LEADS_EXTENSION";
  derivedFrom?: string; // auto-calculated when actual not manually provided
  mandatory?: boolean;
  sortOrder: number;
}

// Core KPI table exactly as it appears in the attached agent template
export const CORE_TEMPLATE_KPIS: KpiDef[] = [
  { key: "totalCallsMade", label: "Total Calls Made", target: 30, unit: "count", category: "CORE_TEMPLATE", mandatory: true, sortOrder: 1 },
  { key: "totalMailsSent", label: "Total Mails Sent", target: 10, unit: "count", category: "CORE_TEMPLATE", mandatory: true, sortOrder: 2 },
  { key: "callsConnected", label: "Calls Connected", target: 25, unit: "count", category: "CORE_TEMPLATE", mandatory: true, sortOrder: 3 },
  { key: "successfulMailsSent", label: "Successful Mails Sent", target: 8, unit: "count", category: "CORE_TEMPLATE", sortOrder: 4 },
  { key: "contactRate", label: "Contact Rate (%)", target: 100, unit: "percent", category: "CORE_TEMPLATE", derivedFrom: "callsConnected/totalCallsMade*100", sortOrder: 5 },
  { key: "conversionRate", label: "Conversion Rate (%)", target: 2, unit: "percent", category: "CORE_TEMPLATE", derivedFrom: "(hotLeads+warmLeads)/callsConnected*100", sortOrder: 6 },
  { key: "avgTalkTime", label: "Avg. Talk Time (mins)", target: null, targetLabel: "-", unit: "minutes", category: "CORE_TEMPLATE", sortOrder: 7 },
  { key: "avgHoldTime", label: "Avg. Hold Time (mins)", target: null, targetLabel: "-", unit: "minutes", category: "CORE_TEMPLATE", sortOrder: 8 },
  { key: "callbacksScheduled", label: "Callbacks Scheduled", target: null, unit: "count", category: "CORE_TEMPLATE", sortOrder: 9 },
  { key: "leadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, unit: "count", category: "CORE_TEMPLATE", derivedFrom: "hotLeads+warmLeads", sortOrder: 10 },
  { key: "positiveDispositions", label: "Positive Dispositions", target: null, unit: "count", category: "CORE_TEMPLATE", sortOrder: 11 },
  { key: "notInterested", label: "Not Interested / Declined", target: null, unit: "count", category: "CORE_TEMPLATE", sortOrder: 12 },
  { key: "wrapUpTime", label: "Wrap-Up / After-Call Work (mins)", target: 20, targetLabel: "20mins", unit: "minutes", category: "CORE_TEMPLATE", sortOrder: 13 },
];

// Extensions — required by the brief (§5 Email metrics) appended after core rows
export const EMAIL_EXTENSION_KPIS: KpiDef[] = [
  { key: "bouncedEmails", label: "Bounced Emails", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 14 },
  { key: "failedSends", label: "Failed Sending Attempts", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 15 },
  { key: "followUpEmails", label: "Follow-up Emails Sent", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 16 },
  { key: "personalizedOutreach", label: "Personalized Outreach Emails", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 17 },
  { key: "campaignEmails", label: "Campaign Emails Sent", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 18 },
  { key: "repliesReceived", label: "Replies Received", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 19 },
  { key: "positiveReplies", label: "Positive Replies", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 20 },
  { key: "negativeReplies", label: "Negative Replies", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 21 },
  { key: "interestedProspects", label: "Interested Prospects", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 22 },
  { key: "emailHotLeads", label: "Hot Leads via Email", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 23 },
  { key: "emailWarmLeads", label: "Warm Leads via Email", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 24 },
  { key: "meetingsBookedEmail", label: "Meetings Booked via Email", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 25 },
  { key: "emailTasksCompleted", label: "Email-related Tasks Completed", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 26 },
  { key: "outstandingFollowUps", label: "Outstanding Email Follow-ups", target: null, unit: "count", category: "EMAIL_EXTENSION", sortOrder: 27 },
];

// Lead split extensions (feeds "Leads Generated (HOT / WARM)" row)
export const LEADS_EXTENSION_KPIS: KpiDef[] = [
  { key: "hotLeads", label: "— Hot Leads", target: null, unit: "count", category: "LEADS_EXTENSION", sortOrder: 10.1 },
  { key: "warmLeads", label: "— Warm Leads", target: null, unit: "count", category: "LEADS_EXTENSION", sortOrder: 10.2 },
];

export const AGENT_KPI_DEFS: KpiDef[] = [
  ...CORE_TEMPLATE_KPIS,
  ...LEADS_EXTENSION_KPIS,
  ...EMAIL_EXTENSION_KPIS,
];

// Supervisor template — TEAM PERFORMANCE SUMMARY (KPI AVERAGES) rows
export const SUPERVISOR_TEAM_KPIS = [
  { key: "totalCallsMade", label: "Total Calls Made (Team)" },
  { key: "avgCallsPerAgent", label: "Avg. Calls Per Agent" },
  { key: "conversionRate", label: "Team Conversion Rate (%)" },
  { key: "contactRate", label: "Team Contact Rate (%)" },
  { key: "avgTalkTime", label: "Avg. Talk Time (mins)" },
  { key: "slaAdherence", label: "SLA Adherence (%)" },
  { key: "leadsGenerated", label: "HOT / WARM Leads Generated" },
  { key: "scheduleAdherence", label: "Schedule Adherence (%)" },
];

export const ATTENDANCE_ROWS = [
  { key: "totalOnShift", label: "Total Agents on Shift" },
  { key: "presentOnTime", label: "Present & On-Time" },
  { key: "lateArrivals", label: "Late Arrivals" },
  { key: "absentExcused", label: "Absent (Excused)" },
  { key: "absentUnexcused", label: "Absent (Unexcused)" },
  { key: "earlyDepartures", label: "Early Departures" },
];

export const DISPOSITION_OPTIONS = [
  "Interested",
  "Callback Requested",
  "Not Interested",
  "No Answer",
  "Busy / Unreachable",
  "Wrong Number",
  "Voicemail",
  "Meeting Booked",
  "Hot Lead",
  "Warm Lead",
];

export const CALL_LOG_ROWS = 8; // template has 8 numbered rows
export const COACHING_ROWS = 5;
export const ESCALATED_ISSUE_ROWS = 4;
export const ACTION_PLAN_ROWS = 5;

// TECH template — activity categories (§7)
export const TECH_CATEGORIES = [
  "Website Development",
  "Frontend Development",
  "Backend Development",
  "Bug Fixing",
  "Website Maintenance",
  "API Integration",
  "Database Tasks",
  "Technical Support",
  "Testing & QA",
  "Deployment & Release",
  "Security & Performance",
  "Technical Research",
  "Documentation",
  "Other",
];

export const TECH_TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "Under Review",
  "Blocked",
  "Pending Deployment",
  "Awaiting Approval",
  "Not Completed",
];

export const TECH_SUMMARY_METRICS = [
  { key: "tasksCompleted", label: "Tasks Completed" },
  { key: "bugsResolved", label: "Bugs Resolved" },
  { key: "supportTicketsResolved", label: "Support Tickets Resolved" },
  { key: "deploymentsCompleted", label: "Deployments Completed" },
  { key: "testCasesPassed", label: "Test Cases Passed" },
  { key: "milestonesDelivered", label: "Milestones Delivered" },
  { key: "codeReviewsDone", label: "Code Reviews Done" },
];

// SOCIAL template (§8)
export const SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "X (Twitter)",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "WhatsApp",
  "Threads",
  "Pinterest",
  "Other",
];

export const SOCIAL_CONTENT_FORMATS = [
  "Image Post",
  "Graphic Design",
  "Video / Reel",
  "Story",
  "Carousel",
  "Blog / Article",
  "Live Session",
  "Community Reply",
  "Other",
];

export const SOCIAL_SUMMARY_METRICS = [
  { key: "postsPlanned", label: "Posts Planned" },
  { key: "postsPublished", label: "Posts Published" },
  { key: "reelsPublished", label: "Reels / Videos Published" },
  { key: "storiesPublished", label: "Stories Published" },
  { key: "reach", label: "Reach" },
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "commentsHandled", label: "Comments Handled" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "linkClicks", label: "Link Clicks" },
  { key: "messagesHandled", label: "Messages Responded To" },
  { key: "followerGrowth", label: "Follower Growth" },
  { key: "campaignLeads", label: "Campaign Leads / Conversions" },
];

export const SUPERVISOR_ACTIVITY_TYPES = [
  "Meetings & Briefings",
  "Agent / Staff Coaching",
  "Task Allocation",
  "Technical Reviews",
  "Content Reviews",
  "Escalation Handling",
  "Client Communications",
  "Quality Assurance",
  "Administrative Activities",
];

export function getKpiDef(key: string): KpiDef | undefined {
  return AGENT_KPI_DEFS.find((k) => k.key === key);
}

/** Build the default KPI metric rows for a new agent report (template order + targets). */
export function buildDefaultKpiMetrics(overrides?: Record<string, { target?: number | null }>) {
  return AGENT_KPI_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    target: overrides?.[def.key]?.target !== undefined ? overrides![def.key].target : def.target,
    targetLabel: def.targetLabel ?? (def.target !== null ? String(def.target) + (def.unit === "percent" ? "%" : "") : "-"),
    actual: null as number | null,
    variance: null as number | null,
    unit: def.unit,
    category: def.category,
    auto: false,
    notes: "",
    mandatory: !!def.mandatory,
  }));
}
