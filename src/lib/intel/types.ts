// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL INTELLIGENCE — shared types.
// Every figure in a report is computed by application logic from existing
// application records (Report, Task, Escalation, User, AuditLog,
// ActivityEvent). Missing data is never silently treated as zero: fields stay
// null and are surfaced as "insufficient data".
// ─────────────────────────────────────────────────────────────────────────────

export type IntelReportType = "agent" | "team" | "centre";

/** Reporting-period filter. Mirrors the dashboard periods + custom range. */
export interface IntelPeriod {
  /** today | this-week | this-month | last-month | this-quarter | custom */
  preset: string;
  from: string; // ISO date (yyyy-mm-dd)
  to: string;   // ISO date inclusive
  label: string;
}

export interface IntelScope {
  country: string | null;
  state: string | null;
  team: string | null;      // OUTBOUND | INBOUND | EMAIL | SOCIAL | TECH
  agentId: string | null;   // individual agent drill-down
  supervisorId: string | null;
  teamLeadId: string | null;
  accountStatus: string | null; // APPROVED | PENDING | SUSPENDED | REJECTED
}

/** A KPI row as analysed in a report — direction-aware achievement. */
export interface IntelKpiRow {
  key: string;
  label: string;
  unit: string; // count | percent | minutes
  direction: string; // HIGHER_BETTER | LOWER_BETTER | DERIVED
  target: number | null;   // period target (summed/scaled per the team method)
  actual: number | null;   // period actual (summed / recomputed)
  variance: number | null;
  achievementPct: number | null;
  status: string; // EXCEEDED | MET | APPROACHING | BELOW | CRITICAL | INSUFFICIENT_DATA
  notes?: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  weight: number;         // configured weight (points of 100)
  earned: number | null;  // 0..weight (null → component had no data, re-normalised away)
  basis: string;          // how it was calculated (transparency requirement)
  included: boolean;
}

export interface PerformanceScore {
  score: number | null;   // 0..100, null when no components had data
  components: ScoreComponent[];
  includedWeights: number;
  classification: string; // OUTSTANDING | EXCEEDS_EXPECTATIONS | MEETS_EXPECTATIONS | NEEDS_IMPROVEMENT | UNSATISFACTORY | INSUFFICIENT_DATA
}

export interface IntelFinding {
  title: string;
  evidence: string; // measurable evidence — never a generic statement
}

export interface DataAvailabilityNote {
  metric: string;
  note: string; // "Not currently tracked by the application." | "Insufficient historical data…" etc.
}

export interface AiCommentary {
  source: "gemini" | "rule-based" | "unavailable";
  engineNote?: string; // e.g. Gemini unavailable reason
  summary: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendations: string[];
}

export interface TrendPoint {
  label: string;    // e.g. "W43" or "2026-10-27"
  submitted: number | null;
  kpiPct: number | null; // team/agent KPI achievement in that bucket
  tasksCompleted: number | null;
}

export interface IntelAgentRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  team: string | null;
  teamLabel: string | null;
  employeeId: string | null;
  centre: string;      // "Enugu, NG"
  country: string | null;
  state: string | null;
  status: string;
  createdAt: string;
  employmentType: string;
}

export interface IntelTaskStats {
  assigned: number;
  completed: number;
  pending: number;        // NOT_STARTED / IN_PROGRESS / PENDING_DEPLOYMENT / AWAITING_APPROVAL / UNDER_REVIEW
  overdue: number;        // deadline < period end and not completed
  blocked: number;
  cancelledOrNotCompleted: number; // NOT_COMPLETED — distinguished from completed per data-integrity rules
  completedBeforeDeadline: number;
  completedAfterDeadline: number;
  completionRatePct: number | null;
  punctualityPct: number | null;   // on-time completions / completed (where deadlines exist)
  avgCompletionHours: number | null;
}

export interface IntelAttendanceStats {
  available: boolean;         // false → "Attendance is not reliably recorded" note
  scheduledDays: number;      // agent workDays within the period
  daysWithRecord: number;     // days with a report carrying attendanceStatus
  present: number;
  late: number;
  absent: number;             // reported Absent in their own report
  missingRecords: number;     // scheduled days without an attendance record
  attendancePct: number | null;   // present+late / recorded (NOT / scheduled — missing ≠ absence)
  punctualityPct: number | null;  // present / recorded
  avgLatenessMins: number | null;
}
