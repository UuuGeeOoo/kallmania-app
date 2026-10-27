"use client";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  team?: string | null;
  employeeId: string | null;
  status: string;
  phone?: string | null;
  country?: string | null;
  state?: string | null;
}

export interface KpiMetric {
  key: string;
  label: string;
  target: number | null;
  targetLabel: string;
  actual: number | null;
  variance: number | null;
  unit: "count" | "percent" | "minutes";
  category: string;
  auto: boolean;
  notes: string;
  mandatory?: boolean;
}

export interface CallLogEntry {
  leadName?: string;
  disposition?: string;
  followUp?: string;
  notes?: string;
}

export interface ReportDTO {
  id: string;
  ref: string;
  type: string;
  reportDate: string;
  department: string;
  userId: string;
  shiftTime?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  attendanceStatus?: string | null;
  latenessMins?: number | null;
  kpiMetrics?: string | null;
  callLogs?: string | null;
  challenges?: string | null;
  escalations?: string | null;
  additionalActivities?: string | null;
  emailContext?: string | null;
  workEntries?: string | null;
  metricsSummary?: string | null;
  payload?: string | null;
  teamName?: string | null;
  campusLocation?: string | null;
  agentsManaged?: number | null;
  attendanceSummary?: string | null;
  teamKpiAverages?: string | null;
  coachingEntries?: string | null;
  qaObservations?: string | null;
  escalatedIssues?: string | null;
  highlights?: string | null;
  lowlights?: string | null;
  actionPlan?: string | null;
  managerReview?: string | null;
  status: string;
  supervisorFeedback?: string | null;
  reviewedAt?: string | null;
  sourceType: string;
  sourceFileId?: string | null;
  verificationStatus: string;
  user?: { id: string; fullName: string; email: string; role: string; department: string; employeeId?: string | null };
  reviewer?: { id: string; fullName: string } | null;
  updatedAt: string;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description?: string | null;
  department: string;
  assigneeId?: string | null;
  assignee?: { id: string; fullName: string; role?: string } | null;
  creator?: { id: string; fullName: string } | null;
  category?: string | null;
  projectRef?: string | null;
  priority: string;
  status: string;
  requiredOutcome?: string | null;
  target?: string | null;
  kpiKey?: string | null;
  dateAssigned: string;
  deadline?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  blocker?: string | null;
  nextSteps?: string | null;
  centreCountry?: string | null;
  centreState?: string | null;
  allCentres?: boolean;
  assignees?: { userId: string; user: { id: string; fullName: string; role: string } }[];
}

export interface UploadDTO {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractStatus: string;
  extractError?: string | null;
  reportDate?: string | null;
  department?: string | null;
  reportId?: string | null;
  userId: string;
  user?: { id: string; fullName: string; role: string; department: string };
  createdAt: string;
  confirmedAt?: string | null;
  fileDiscarded?: boolean;
  discardedAt?: string | null;
}

export interface NotificationDTO {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  linkData?: string | null;
  read: boolean;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  team?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  country?: string | null;
  state?: string | null;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  employmentType?: string;
  workDays?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  reportCount?: number;
}

export interface NoticeDTO {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorId?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  centreCountry?: string | null;
  centreState?: string | null;
  teams?: string | null;
  allCentres?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: number | string | null;
  confidence: "high" | "medium" | "low";
  source: string;
  needsReview: boolean;
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: options?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  SUPERVISOR: "Supervisor",
  TEAM_LEAD: "Team Lead",
  AGENT_BPO: "Call Centre Agent",
  DEVELOPER: "Web Development & Technical",
  SOCIAL_MEDIA: "Social Media & Campaign",
};

export const POSITION_LABELS: Record<string, string> = {
  AGENT: "Agent",
  TEAM_LEAD: "Team Lead",
  SUPERVISOR: "Supervisor",
  ADMIN: "Administrator",
};

/** Teams under Kallmania (BPO division) — registration & profile display */
export const TEAM_LABELS: Record<string, string> = {
  OUTBOUND: "Outbound Call Centre",
  INBOUND: "Inbound Call Centre",
  EMAIL: "Email Marketing",
  SOCIAL: "Social Media & Campaign",
  TECH: "Web & Technical",
};

export const DEPT_LABELS: Record<string, string> = {
  BPO: "Outbound Call Centre",
  INBOUND: "Inbound Call Centre",
  OUTBOUND: "Outbound Call Centre",
  WEB_DEV: "Web Development & Technical",
  SOCIAL_MEDIA: "Social Media & Campaign",
  MANAGEMENT: "Management & Supervision",
};

/** Task & assignment departments — the call centre is split into Inbound / Outbound */
export const TASK_DEPTS: { value: string; label: string }[] = [
  { value: "INBOUND", label: "Inbound Call Centre" },
  { value: "OUTBOUND", label: "Outbound Call Centre" },
  { value: "WEB_DEV", label: "Web Development & Technical" },
  { value: "SOCIAL_MEDIA", label: "Social Media & Campaign" },
];

export interface EscalationDTO {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: string;
  targetType: string;
  targetRole?: string | null;
  targetUserId?: string | null;
  targetName?: string | null;
  subject: string;
  message: string;
  severity: string;
  status: string;
  ackByName?: string | null;
  ackNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  from?: { id: string; fullName: string; role: string; country?: string | null; state?: string | null };
  targetUser?: { id: string; fullName: string; role: string } | null;
}

export const REPORT_TYPE_LABELS: Record<string, string> = {
  AGENT_BPO: "BPO Agent Daily Report",
  TECH: "Technical Team Daily Report",
  SOCIAL: "Social Media Daily Report",
  SUPERVISOR: "Supervisor Daily Report",
  TEAM_LEAD: "Team Lead Daily Report",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  SUBMITTED: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  REJECTED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  APPROVED_USER: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  REJECTED_USER: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  SUSPENDED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  BLOCKED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  NOT_STARTED: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  UPLOADED: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  PROCESSING: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  AWAITING_CONFIRMATION: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  EXTRACTION_COMPLETED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  FAILED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

export function todayISO(): string {
  const d = new Date();
  // Use local date (not UTC) so it matches the user's workday
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Geo helpers (shape matches GET /api/geo countries payload) ──
export interface GeoCountryLite {
  code: string; // ISO-3166 alpha-2, e.g. "NG"
  iso2: string; // alias of code — derived client-side for the location pickers
  name: string;
  flag: string; // emoji flag from the country dataset
  phone: string; // international dial code, e.g. "+234"
}

/** Convert an ISO-3166 alpha-2 code to its emoji flag ("" for empty/invalid input). */
export function flagEmoji(iso: string): string {
  if (!iso || !/^[A-Za-z]{2}$/.test(iso.trim())) return "";
  return iso
    .trim()
    .toUpperCase()
    .split("")
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
    .join("");
}
