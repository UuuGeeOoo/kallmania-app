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
