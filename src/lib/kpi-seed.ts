// Client-safe KPI seed mirroring the master template order & targets.
// (Kept separate from the server template-config so client bundles stay light.)
export interface KpiSeed {
  key: string;
  label: string;
  target: number | null;
  targetLabel: string;
  unit: "count" | "percent" | "minutes";
  category: string;
  mandatory?: boolean;
}

export const AGENT_KPIS_SEED: KpiSeed[] = [
  { key: "totalCallsMade", label: "Total Calls Made", target: 30, targetLabel: "30", unit: "count", category: "CORE_TEMPLATE", mandatory: true },
  { key: "totalMailsSent", label: "Total Mails Sent", target: 10, targetLabel: "10", unit: "count", category: "CORE_TEMPLATE", mandatory: true },
  { key: "callsConnected", label: "Calls Connected", target: 25, targetLabel: "25", unit: "count", category: "CORE_TEMPLATE", mandatory: true },
  { key: "successfulMailsSent", label: "Successful Mails Sent", target: 8, targetLabel: "8", unit: "count", category: "CORE_TEMPLATE" },
  { key: "contactRate", label: "Contact Rate (%)", target: 100, targetLabel: "100%", unit: "percent", category: "CORE_TEMPLATE" },
  { key: "conversionRate", label: "Conversion Rate (%)", target: 2, targetLabel: "2%", unit: "percent", category: "CORE_TEMPLATE" },
  { key: "avgTalkTime", label: "Avg. Talk Time (mins)", target: null, targetLabel: "-", unit: "minutes", category: "CORE_TEMPLATE" },
  { key: "avgHoldTime", label: "Avg. Hold Time (mins)", target: null, targetLabel: "-", unit: "minutes", category: "CORE_TEMPLATE" },
  { key: "callbacksScheduled", label: "Callbacks Scheduled", target: null, targetLabel: "-", unit: "count", category: "CORE_TEMPLATE" },
  { key: "leadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, targetLabel: "-", unit: "count", category: "CORE_TEMPLATE" },
  { key: "hotLeads", label: "— Hot Leads", target: null, targetLabel: "-", unit: "count", category: "LEADS_EXTENSION" },
  { key: "warmLeads", label: "— Warm Leads", target: null, targetLabel: "-", unit: "count", category: "LEADS_EXTENSION" },
  { key: "positiveDispositions", label: "Positive Dispositions", target: null, targetLabel: "-", unit: "count", category: "CORE_TEMPLATE" },
  { key: "notInterested", label: "Not Interested / Declined", target: null, targetLabel: "-", unit: "count", category: "CORE_TEMPLATE" },
  { key: "wrapUpTime", label: "Wrap-Up / After-Call Work (mins)", target: 20, targetLabel: "20mins", unit: "minutes", category: "CORE_TEMPLATE" },
  { key: "bouncedEmails", label: "Bounced Emails", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "failedSends", label: "Failed Sending Attempts", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "followUpEmails", label: "Follow-up Emails Sent", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "personalizedOutreach", label: "Personalized Outreach Emails", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "campaignEmails", label: "Campaign Emails Sent", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "repliesReceived", label: "Replies Received", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "positiveReplies", label: "Positive Replies", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "negativeReplies", label: "Negative Replies", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "interestedProspects", label: "Interested Prospects", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "emailHotLeads", label: "Hot Leads via Email", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "emailWarmLeads", label: "Warm Leads via Email", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "meetingsBookedEmail", label: "Meetings Booked via Email", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "emailTasksCompleted", label: "Email-related Tasks Completed", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
  { key: "outstandingFollowUps", label: "Outstanding Email Follow-ups", target: null, targetLabel: "-", unit: "count", category: "EMAIL_EXTENSION" },
];

export const TECH_METRICS_SEED = [
  { key: "tasksCompleted", label: "Tasks Completed" },
  { key: "bugsResolved", label: "Bugs Resolved" },
  { key: "supportTicketsResolved", label: "Support Tickets Resolved" },
  { key: "deploymentsCompleted", label: "Deployments Completed" },
  { key: "testCasesPassed", label: "Test Cases Passed" },
  { key: "milestonesDelivered", label: "Milestones Delivered" },
  { key: "codeReviewsDone", label: "Code Reviews Done" },
];

export const SOCIAL_METRICS_SEED = [
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

/** Extracted fields → full KpiMetric[] (BPO) or metrics summary record (tech/social) */
export function seedKpisFromFields(fields: { key: string; value: number | string | null }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of fields) {
    if (typeof f.value === "number") out[f.key] = f.value;
  }
  return out;
}
