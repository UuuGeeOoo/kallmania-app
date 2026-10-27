// ─────────────────────────────────────────────────────────────────────────────
// TEAM LEAD REPORT TEMPLATE — dynamic, administrator/supervisor-editable format.
// Follows the same report patterns as the other templates (staff info → team
// KPI summary → tables → challenges/escalations → action plan for next day).
// The definition is stored in the ReportTemplate table (key "TEAM_LEAD") and can
// be customized from the app by administrators and supervisors; this file holds
// the shipped default that the form falls back to.
// ─────────────────────────────────────────────────────────────────────────────

export interface TlField {
  key: string;
  label: string;
  type?: "text" | "number" | "time" | "select";
  options?: string[];
  placeholder?: string;
}

export interface TlColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
}

export interface TlMetric {
  key: string;
  label: string;
  target: number | null;
  unit: "count" | "percent" | "minutes";
}

export interface TlSection {
  id: string;
  title: string;
  description?: string;
  type: "fields" | "metrics" | "table" | "textarea";
  /** for "fields" sections */
  fields?: TlField[];
  /** for "metrics" sections */
  metrics?: TlMetric[];
  /** for "table" sections */
  columns?: TlColumn[];
  minRows?: number;
  /** allow adding extra rows (default true for tables) */
  addRows?: boolean;
  /** must be filled before submitting */
  required?: boolean;
}

export interface TlDefinition {
  title: string;
  sections: TlSection[];
}

export const TEAM_LEAD_TEMPLATE_KEY = "TEAM_LEAD";

/** Attendance/position select options shared across sections */
export const ATTENDANCE_OPTIONS = ["Present", "Late", "Absent"];
export const TASK_STATUS_OPTIONS = ["Completed", "In Progress", "Pending", "Blocked", "Not Started"];

/** The default Team Lead daily report template (mirrors the other report patterns). */
export function defaultTeamLeadTemplate(): TlDefinition {
  return {
    title: "DAILY REPORT — TEAM LEAD",
    sections: [
      {
        id: "staff-info",
        title: "STAFF INFORMATION",
        type: "fields",
        fields: [
          { key: "teamName", label: "Team / Squad", type: "text", placeholder: "auto from profile" },
          { key: "shiftTime", label: "Shift Time", type: "text", placeholder: "e.g. 09:00 - 17:00" },
          { key: "clockIn", label: "Clock-In Time", type: "time" },
          { key: "clockOut", label: "Clock-Out Time", type: "time" },
          { key: "attendanceStatus", label: "Attendance Status", type: "select", options: ATTENDANCE_OPTIONS },
          { key: "latenessMins", label: "Lateness (mins)", type: "number" },
          { key: "agentsOnDuty", label: "Agents on Duty", type: "number", placeholder: "e.g. 8" },
        ],
      },
      {
        id: "team-kpis",
        title: "TEAM PERFORMANCE SUMMARY (KPIs)",
        description: "Enter the team totals/averages for today — variance against target is calculated automatically.",
        type: "metrics",
        metrics: [
          { key: "teamTotalCalls", label: "Total Calls Made (Team)", target: 240, unit: "count" },
          { key: "teamCallsConnected", label: "Calls Connected (Team)", target: 200, unit: "count" },
          { key: "teamContactRate", label: "Team Contact Rate (%)", target: 100, unit: "percent" },
          { key: "teamConversionRate", label: "Team Conversion Rate (%)", target: 2, unit: "percent" },
          { key: "teamLeadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, unit: "count" },
          { key: "teamTasksCompleted", label: "Tasks Completed (Team)", target: null, unit: "count" },
          { key: "teamEscalations", label: "Escalations Received", target: 0, unit: "count" },
          { key: "teamSlaAdherence", label: "SLA Adherence (%)", target: 95, unit: "percent" },
        ],
      },
      {
        id: "agent-highlights",
        title: "AGENT PERFORMANCE HIGHLIGHTS",
        description: "Call out your best and lowest performers today.",
        type: "table",
        columns: [
          { key: "agent", label: "Agent Name" },
          { key: "highlight", label: "Highlight / Observation" },
          { key: "notes", label: "Notes" },
        ],
        minRows: 3,
      },
      {
        id: "tasks",
        title: "TASKS ASSIGNED & COMPLETED",
        description: "Track the tasks you assigned or followed up on today.",
        type: "table",
        columns: [
          { key: "task", label: "Task / Activity" },
          { key: "assignee", label: "Assigned To" },
          { key: "status", label: "Status", type: "select", options: TASK_STATUS_OPTIONS },
          { key: "remarks", label: "Remarks" },
        ],
        minRows: 4,
      },
      {
        id: "challenges",
        title: "CHALLENGES / BLOCKERS",
        description: "What slowed the team down today?",
        type: "textarea",
      },
      {
        id: "escalations",
        title: "ESCALATIONS REQUIRING SUPERVISOR ATTENTION",
        description: "Issues that must be escalated — supervisors are alerted instantly on submit.",
        type: "textarea",
      },
      {
        id: "coaching",
        title: "COACHING & SUPPORT GIVEN",
        type: "table",
        columns: [
          { key: "agent", label: "Agent" },
          { key: "area", label: "Area Coached" },
          { key: "outcome", label: "Outcome / Next Step" },
        ],
        minRows: 2,
      },
      {
        id: "action-plan",
        title: "ACTION PLAN FOR NEXT DAY",
        description: "Add as many activities as you need — not limited to six.",
        type: "table",
        columns: [
          { key: "activity", label: "Activity / Focus Area" },
          { key: "owner", label: "Owner" },
          { key: "expected", label: "Expected Outcome" },
        ],
        minRows: 5,
        addRows: true,
      },
      {
        id: "comments",
        title: "ADDITIONAL COMMENTS",
        type: "textarea",
      },
    ],
  };
}

export type TlSectionValue = string | number | Record<string, unknown>[] | Record<string, unknown> | null;
export interface TlPayload {
  sections: Record<string, TlSectionValue>;
}

/** ───────────────────────── PER-TEAM TEMPLATES ─────────────────────────
 * Each team lead gets the daily report that matches THEIR designated team
 * instead of one generic format:
 *   BPO · Outbound  → TL_OUTBOUND      BPO · Inbound → TL_INBOUND
 *   Social Media    → TL_SOCIAL        Web & Technical → TL_TECH
 * Everything else (e.g. BPO · Email, unset teams) keeps the generic
 * TEAM_LEAD template as a fallback. All five are editable by administrators
 * and supervisors from KPI Configuration → Report Templates.
 */
export type TlTemplateKey = "TEAM_LEAD" | "TL_OUTBOUND" | "TL_INBOUND" | "TL_SOCIAL" | "TL_TECH";

export interface TeamTemplateMeta {
  key: TlTemplateKey;
  /** Picker label */
  label: string;
  /** What the template covers */
  description: string;
  /** Which team lead uses it */
  audience: string;
}

export const TEAM_LEAD_TEMPLATES: TeamTemplateMeta[] = [
  {
    key: "TL_OUTBOUND",
    label: "Outbound Call Centre",
    description: "Calls made, connections, contact & conversion rates and leads generated.",
    audience: "Team Lead — BPO · Outbound Call Centre",
  },
  {
    key: "TL_INBOUND",
    label: "Inbound Call Centre",
    description: "Calls received, answer rate, handle time, first-call resolution and shift handover.",
    audience: "Team Lead — BPO · Inbound Call Centre",
  },
  {
    key: "TL_SOCIAL",
    label: "Social Media Team",
    description: "Posts, stories/reels, reach, engagement, follower growth and community handling.",
    audience: "Team Lead — Social Media",
  },
  {
    key: "TL_TECH",
    label: "Web & Technical Team",
    description: "Tasks, tickets, deployments, bugs and system uptime for the web & technical team.",
    audience: "Team Lead — Web Development & Technical",
  },
  {
    key: "TEAM_LEAD",
    label: "General (fallback)",
    description: "The original generic team lead report — used when a team has no dedicated template.",
    audience: "Team Lead — any team without a dedicated template",
  },
];

/** Resolve which team-lead template a user's report form should use. */
export function tlTemplateKeyFor(department?: string | null, team?: string | null): TlTemplateKey {
  const dept = (department || "").toUpperCase();
  const tm = (team || "").toUpperCase();
  if (tm === "INBOUND") return "TL_INBOUND";
  if (tm === "OUTBOUND") return "TL_OUTBOUND";
  if (tm === "SOCIAL") return "TL_SOCIAL";
  if (tm === "TECH") return "TL_TECH";
  if (dept === "SOCIAL_MEDIA") return "TL_SOCIAL";
  if (dept === "WEB_DEV") return "TL_TECH";
  return "TEAM_LEAD";
}

export function teamTemplateMeta(key: string): TeamTemplateMeta | undefined {
  return TEAM_LEAD_TEMPLATES.find((t) => t.key === key);
}

/** Shipped default for a template key (fresh object on every call — callers may mutate their copy). */
export function defaultTemplateFor(key: string): TlDefinition {
  switch (key) {
    case "TL_OUTBOUND": return defaultOutboundLeadTemplate();
    case "TL_INBOUND": return defaultInboundLeadTemplate();
    case "TL_SOCIAL": return defaultSocialLeadTemplate();
    case "TL_TECH": return defaultTechLeadTemplate();
    default: return defaultTeamLeadTemplate();
  }
}

// ── shared section builders (fresh objects every call) ──

function staffInfoSection(teamMembersLabel = "Agents on Duty"): TlSection {
  return {
    id: "staff-info",
    title: "STAFF INFORMATION",
    type: "fields",
    fields: [
      { key: "teamName", label: "Team / Squad", type: "text", placeholder: "auto from profile" },
      { key: "shiftTime", label: "Shift Time", type: "text", placeholder: "e.g. 09:00 - 17:00" },
      { key: "clockIn", label: "Clock-In Time", type: "time" },
      { key: "clockOut", label: "Clock-Out Time", type: "time" },
      { key: "attendanceStatus", label: "Attendance Status", type: "select", options: ATTENDANCE_OPTIONS },
      { key: "latenessMins", label: "Lateness (mins)", type: "number" },
      { key: "agentsOnDuty", label: teamMembersLabel, type: "number", placeholder: "e.g. 8" },
    ],
  };
}

function agentHighlightsSection(columns: TlColumn[], description: string): TlSection {
  return { id: "agent-highlights", title: "AGENT PERFORMANCE HIGHLIGHTS", description, type: "table", columns, minRows: 3 };
}

function tasksSection(columns: TlColumn[], description: string): TlSection {
  return { id: "tasks", title: "TASKS ASSIGNED & COMPLETED", description, type: "table", columns, minRows: 4 };
}

function tailSections(): TlSection[] {
  return [
    {
      id: "challenges",
      title: "CHALLENGES / BLOCKERS",
      description: "What slowed the team down today?",
      type: "textarea",
    },
    {
      id: "escalations",
      title: "ESCALATIONS REQUIRING SUPERVISOR ATTENTION",
      description: "Issues that must be escalated — supervisors are alerted instantly on submit.",
      type: "textarea",
    },
    {
      id: "coaching",
      title: "COACHING & SUPPORT GIVEN",
      type: "table",
      columns: [
        { key: "agent", label: "Agent" },
        { key: "area", label: "Area Coached" },
        { key: "outcome", label: "Outcome / Next Step" },
      ],
      minRows: 2,
    },
    {
      id: "action-plan",
      title: "ACTION PLAN FOR NEXT DAY",
      description: "Add as many activities as you need — not limited to six.",
      type: "table",
      columns: [
        { key: "activity", label: "Activity / Focus Area" },
        { key: "owner", label: "Owner" },
        { key: "expected", label: "Expected Outcome" },
      ],
      minRows: 5,
      addRows: true,
    },
    {
      id: "comments",
      title: "ADDITIONAL COMMENTS",
      type: "textarea",
    },
  ];
}

function metricsSection(title: string, description: string, metrics: TlMetric[]): TlSection {
  return { id: "team-kpis", title, description, type: "metrics", metrics };
}

/** Outbound Call Centre team lead — mirrors the outbound agent KPI template. */
export function defaultOutboundLeadTemplate(): TlDefinition {
  return {
    title: "DAILY REPORT — OUTBOUND CALL CENTRE TEAM LEAD",
    sections: [
      staffInfoSection(),
      metricsSection(
        "TEAM PERFORMANCE SUMMARY (KPIs)",
        "Enter the team totals/averages for today — variance against target is calculated automatically.",
        [
          { key: "teamTotalCalls", label: "Total Calls Made (Team)", target: 240, unit: "count" },
          { key: "teamCallsConnected", label: "Calls Connected (Team)", target: 200, unit: "count" },
          { key: "teamContactRate", label: "Team Contact Rate (%)", target: 100, unit: "percent" },
          { key: "teamConversionRate", label: "Team Conversion Rate (%)", target: 2, unit: "percent" },
          { key: "teamLeadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, unit: "count" },
          { key: "teamCallbacksScheduled", label: "Callbacks Scheduled (Team)", target: null, unit: "count" },
          { key: "teamTasksCompleted", label: "Tasks Completed (Team)", target: null, unit: "count" },
          { key: "teamEscalations", label: "Escalations Received", target: 0, unit: "count" },
          { key: "teamSlaAdherence", label: "SLA Adherence (%)", target: 95, unit: "percent" },
        ],
      ),
      agentHighlightsSection(
        [
          { key: "agent", label: "Agent Name" },
          { key: "highlight", label: "Highlight / Observation" },
          { key: "notes", label: "Notes" },
        ],
        "Call out your best and lowest performers today.",
      ),
      tasksSection(
        [
          { key: "task", label: "Task / Activity" },
          { key: "assignee", label: "Assigned To" },
          { key: "status", label: "Status", type: "select", options: TASK_STATUS_OPTIONS },
          { key: "remarks", label: "Remarks" },
        ],
        "Track the tasks you assigned or followed up on today.",
      ),
      ...tailSections(),
    ],
  };
}

/** Inbound Call Centre team lead — answers, handling quality, SLA & shift handover. */
export function defaultInboundLeadTemplate(): TlDefinition {
  return {
    title: "DAILY REPORT — INBOUND CALL CENTRE TEAM LEAD",
    sections: [
      staffInfoSection(),
      metricsSection(
        "TEAM PERFORMANCE SUMMARY (KPIs)",
        "Enter the team totals/averages for today — variance against target is calculated automatically.",
        [
          { key: "teamCallsReceived", label: "Total Calls Received (Team)", target: 240, unit: "count" },
          { key: "teamCallsAnswered", label: "Calls Answered (Team)", target: 220, unit: "count" },
          { key: "teamAnswerRate", label: "Answer Rate (%)", target: 90, unit: "percent" },
          { key: "teamAbandonedCalls", label: "Abandoned / Missed Calls", target: 0, unit: "count" },
          { key: "teamAvgHandleTime", label: "Avg. Handle Time (mins)", target: 6, unit: "minutes" },
          { key: "teamFirstCallResolution", label: "First-Call Resolution (%)", target: 80, unit: "percent" },
          { key: "teamCallbacksScheduled", label: "Callbacks Scheduled (Team)", target: null, unit: "count" },
          { key: "teamCustomerSatisfaction", label: "Customer Satisfaction (%)", target: 90, unit: "percent" },
          { key: "teamSlaAdherence", label: "SLA Adherence (%)", target: 95, unit: "percent" },
        ],
      ),
      agentHighlightsSection(
        [
          { key: "agent", label: "Agent Name" },
          { key: "highlight", label: "Highlight / Observation" },
          { key: "notes", label: "Notes" },
        ],
        "Call out your best and lowest performers today.",
      ),
      tasksSection(
        [
          { key: "task", label: "Task / Activity" },
          { key: "assignee", label: "Assigned To" },
          { key: "status", label: "Status", type: "select", options: TASK_STATUS_OPTIONS },
          { key: "remarks", label: "Remarks" },
        ],
        "Track the tasks you assigned or followed up on today.",
      ),
      {
        id: "handover",
        title: "SHIFT HANDOVER NOTES",
        description: "What should the next shift know? Open enquiries, pending callbacks, staffing notes…",
        type: "textarea",
      },
      ...tailSections(),
    ],
  };
}

/**
 * Social Media team lead — mirrors the uploaded SBTS master document
 * "SBTS-Daily-Report-Social Media Team-Lead.docx" (Enugu centre) so the form
 * the lead fills maps 1:1 onto the printed Word template:
 * staff info → role focus → KPI table → tasks → auto-filled my-day →
 * challenges → escalations & approvals → end-of-day handoff.
 * Supervisor comments stay blank in the master and are filled on review.
 */
export function defaultSocialLeadTemplate(): TlDefinition {
  return {
    title: "DAILY REPORT — SOCIAL MEDIA MANAGEMENT & CONTENT CREATION TEAM",
    sections: [
      staffInfoSection("Team Members on Duty"),
      {
        id: "role-focus",
        title: "ROLE FOCUS FOR TODAY",
        description: "What are you driving today — calendar items, campaigns, reviews, priorities?",
        type: "textarea",
      },
      {
        id: "team-kpis",
        title: "KEY PERFORMANCE METRICS (KPIS)",
        description: "Enter today's actuals — variance against target is calculated automatically.",
        type: "metrics",
        metrics: [
          { key: "calendarItemsPrepared", label: "Calendar item prepared / published", target: null, unit: "count" },
          { key: "videoEditsExports", label: "Video edits / exports completed", target: null, unit: "count" },
          { key: "graphicsVisualAssets", label: "Graphics / visual assets completed", target: null, unit: "count" },
          { key: "approvalQualityChecks", label: "Approval / quality checks completed", target: null, unit: "count" },
          { key: "contentPublishedScheduled", label: "Content published or scheduled", target: null, unit: "count" },
          { key: "commentsEscalationsHandled", label: "Comments / escalations handled", target: null, unit: "count" },
          { key: "taskCompletionRate", label: "Weekly or daily task completion (%)", target: null, unit: "percent" },
          { key: "nextDayPriorities", label: "Next-day priorities prepared", target: null, unit: "count" },
        ],
      },
      {
        id: "tasks",
        title: "TASKS ASSIGNED & COMPLETED",
        description: "Track the content tasks and community follow-ups you assigned today.",
        type: "table",
        columns: [
          { key: "task", label: "Task description" },
          { key: "platform", label: "Platform / channel" },
          { key: "status", label: "Status", type: "select", options: TASK_STATUS_OPTIONS },
          { key: "deliverable", label: "Deliverable / output" },
        ],
        minRows: 6,
      },
      {
        id: "myday",
        title: "WORK DONE FROM MY DAY (AUTO-FILLED)",
        description: "Tasks assigned to you from the Tasks module — pulled in automatically at export; adjust here if needed.",
        type: "table",
        columns: [
          { key: "task", label: "Task" },
          { key: "timeDue", label: "Time due" },
          { key: "status", label: "Status", type: "select", options: TASK_STATUS_OPTIONS },
        ],
        minRows: 2,
      },
      {
        id: "challenges",
        title: "CHALLENGES / BLOCKERS",
        description: "What slowed the team down today?",
        type: "table",
        columns: [
          { key: "blocker", label: "Blocker / risk" },
          { key: "impact", label: "Impact" },
          { key: "support", label: "Support or decision required" },
          { key: "owner", label: "Owner / next action" },
        ],
        minRows: 2,
      },
      {
        id: "escalations",
        title: "ESCALATIONS AND APPROVALS",
        description: "Issues that must be escalated — supervisors are alerted instantly on submit.",
        type: "table",
        columns: [
          { key: "item", label: "Item requiring escalation" },
          { key: "reason", label: "Reason / source / permission needed" },
          { key: "escalatedTo", label: "Escalated to" },
          { key: "status", label: "Status" },
        ],
        minRows: 1,
      },
      {
        id: "handoff",
        title: "END-OF-DAY HANDOFF",
        description: "Shift note: on Friday include the weekly performance note. No routine report is required on Saturday or Sunday; any weekend content must already be scheduled in advance.",
        type: "table",
        columns: [
          { key: "completed", label: "Completed" },
          { key: "pending", label: "Pending approval" },
          { key: "blocked", label: "Blocked" },
          { key: "nextAction", label: "Next action / owner" },
        ],
        minRows: 2,
      },
    ],
  };
}

/** Web & Technical team lead — tasks, tickets, deployments & system health. */
export function defaultTechLeadTemplate(): TlDefinition {
  return {
    title: "DAILY REPORT — WEB & TECHNICAL TEAM LEAD",
    sections: [
      staffInfoSection("Team Members on Duty"),
      metricsSection(
        "TEAM PERFORMANCE SUMMARY (KPIs)",
        "Enter the team totals/averages for today — variance against target is calculated automatically.",
        [
          { key: "teamTasksAssigned", label: "Tasks Assigned (Team)", target: null, unit: "count" },
          { key: "teamTasksCompleted", label: "Tasks Completed (Team)", target: null, unit: "count" },
          { key: "teamTicketsResolved", label: "Support Tickets Resolved (Team)", target: 15, unit: "count" },
          { key: "teamDeployments", label: "Deployments / Releases", target: 2, unit: "count" },
          { key: "teamBugsClosed", label: "Bugs Closed (Team)", target: 10, unit: "count" },
          { key: "teamBugsOpen", label: "Open Bugs at Close of Day", target: 0, unit: "count" },
          { key: "teamUptime", label: "System Uptime (%)", target: 99.9, unit: "percent" },
          { key: "teamSlaAdherence", label: "SLA Adherence (%)", target: 95, unit: "percent" },
        ],
      ),
      agentHighlightsSection(
        [
          { key: "agent", label: "Team Member" },
          { key: "project", label: "Project / System" },
          { key: "highlight", label: "Highlight / Observation" },
        ],
        "Call out today's stand-out engineering work and who delivered it.",
      ),
      tasksSection(
        [
          { key: "task", label: "Task / Ticket" },
          { key: "project", label: "Project / System" },
          { key: "assignee", label: "Assigned To" },
          { key: "status", label: "Status", type: "select", options: TASK_STATUS_OPTIONS },
        ],
        "Track the development tasks, tickets and deployments you assigned or followed up on today.",
      ),
      ...tailSections(),
    ],
  };
}

/** Variance helper for the metrics table (mirrors the agent KPI table behaviour). */
export function tlVariance(actual: number | null, target: number | null): number | null {
  if (actual === null || Number.isNaN(actual) || target === null) return null;
  return Math.round((actual - target) * 100) / 100;
}

export function isTlSectionFilled(section: TlSection, value: TlSectionValue): boolean {
  if (!section.required) return true;
  if (section.type === "textarea" || section.type === "fields") {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return true;
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  }
  if (section.type === "table") {
    if (!Array.isArray(value)) return false;
    return value.some((row) => Object.values(row).some((v) => String(v ?? "").trim().length > 0));
  }
  if (section.type === "metrics") {
    if (!Array.isArray(value)) return false;
    return value.some((row) => {
      const actual = (row as Record<string, unknown>).actual;
      return actual !== null && actual !== undefined && String(actual).trim() !== "";
    });
  }
  return true;
}
