"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, fmtDateTime, DEPT_LABELS, TEAM_LABELS, type DocIntelPayload, type ExtractedField, type KpiMetric, type SessionUser, type UploadDTO } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, EmptyState } from "@/components/kallmania/shared";
import { DocumentViewerModal } from "@/components/kallmania/document-viewer";
import { TextDraftModal } from "@/components/kallmania/text-draft";
import { KpiTable } from "@/components/kallmania/report-forms";
import { tlTemplateKeyFor, teamTemplateMeta, type TlDefinition } from "@/lib/team-lead-template";
import { Upload as UploadIcon, FileUp, ScanSearch, CheckCircle2, AlertTriangle, XCircle, Loader2, FileText, ShieldAlert, Send, Save, Eye, ScrollText, ListChecks, Table2, FileSearch, PlusCircle, Info, Plus, Trash2, Users } from "lucide-react";

const SUPPORTED = "PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG up to 15 MB";

const TECH_CATEGORIES = ["Website Development", "Frontend Development", "Backend Development", "Bug Fixing", "Website Maintenance", "API Integration", "Database Tasks", "Technical Support", "Testing & QA", "Deployment & Release", "Security & Performance", "Technical Research", "Documentation", "Other"];
const TECH_STATUSES = ["Not Started", "In Progress", "Completed", "Under Review", "Blocked", "Pending Deployment", "Awaiting Approval", "Not Completed"];
const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "X (Twitter)", "LinkedIn", "TikTok", "YouTube", "WhatsApp", "Threads", "Pinterest", "Other"];
const SOCIAL_TASK_STATUSES = ["Planned", "In Progress", "Completed", "Published", "Blocked", "Not Completed"];

interface TechEntry { title: string; project: string; category: string; status: string; hours: string; deliverable: string; }
interface SocialTask { task: string; platform: string; status: string; deliverable: string; }

/** Fallback rows (master-template defaults) used when the KPI catalogue is unavailable. */
const FALLBACK_SEEDS: Record<string, { key: string; label: string; target: number | null; unit: "count" | "percent" | "minutes"; category: string; mandatory?: boolean }[]> = {
  BPO: [
    { key: "totalCallsMade", label: "Total Calls Made", target: 30, unit: "count", category: "CORE_TEMPLATE", mandatory: true },
    { key: "totalMailsSent", label: "Total Mails Sent", target: 10, unit: "count", category: "CORE_TEMPLATE", mandatory: true },
    { key: "callsConnected", label: "Calls Connected", target: 25, unit: "count", category: "CORE_TEMPLATE", mandatory: true },
    { key: "successfulMailsSent", label: "Successful Mails Sent", target: 8, unit: "count", category: "CORE_TEMPLATE" },
    { key: "contactRate", label: "Contact Rate (%)", target: 100, unit: "percent", category: "CORE_TEMPLATE" },
    { key: "conversionRate", label: "Conversion Rate (%)", target: 2, unit: "percent", category: "CORE_TEMPLATE" },
    { key: "avgTalkTime", label: "Avg. Talk Time (mins)", target: null, unit: "minutes", category: "CORE_TEMPLATE" },
    { key: "avgHoldTime", label: "Avg. Hold Time (mins)", target: null, unit: "minutes", category: "CORE_TEMPLATE" },
    { key: "callbacksScheduled", label: "Callbacks Scheduled", target: null, unit: "count", category: "CORE_TEMPLATE" },
    { key: "leadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, unit: "count", category: "CORE_TEMPLATE" },
    { key: "hotLeads", label: "— Hot Leads", target: null, unit: "count", category: "LEADS_EXTENSION" },
    { key: "warmLeads", label: "— Warm Leads", target: null, unit: "count", category: "LEADS_EXTENSION" },
    { key: "positiveDispositions", label: "Positive Dispositions", target: null, unit: "count", category: "CORE_TEMPLATE" },
    { key: "notInterested", label: "Not Interested / Declined", target: null, unit: "count", category: "CORE_TEMPLATE" },
    { key: "wrapUpTime", label: "Wrap-Up / After-Call Work (mins)", target: 20, unit: "minutes", category: "CORE_TEMPLATE" },
    { key: "bouncedEmails", label: "Bounced Emails", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "failedSends", label: "Failed Sending Attempts", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "followUpEmails", label: "Follow-up Emails Sent", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "personalizedOutreach", label: "Personalized Outreach Emails", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "campaignEmails", label: "Campaign Emails Sent", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "repliesReceived", label: "Replies Received", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "positiveReplies", label: "Positive Replies", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "negativeReplies", label: "Negative Replies", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "interestedProspects", label: "Interested Prospects", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "emailHotLeads", label: "Hot Leads via Email", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "emailWarmLeads", label: "Warm Leads via Email", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "meetingsBookedEmail", label: "Meetings Booked via Email", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "emailTasksCompleted", label: "Email-related Tasks Completed", target: null, unit: "count", category: "EMAIL_EXTENSION" },
    { key: "outstandingFollowUps", label: "Outstanding Email Follow-ups", target: null, unit: "count", category: "EMAIL_EXTENSION" },
  ],
  WEB_DEV: [
    { key: "tasksCompleted", label: "Tasks Completed", target: null, unit: "count", category: "TECH" },
    { key: "bugsResolved", label: "Bugs Resolved", target: null, unit: "count", category: "TECH" },
    { key: "supportTicketsResolved", label: "Support Tickets Resolved", target: null, unit: "count", category: "TECH" },
    { key: "deploymentsCompleted", label: "Deployments Completed", target: null, unit: "count", category: "TECH" },
    { key: "testCasesPassed", label: "Test Cases Passed", target: null, unit: "count", category: "TECH" },
    { key: "milestonesDelivered", label: "Milestones Delivered", target: null, unit: "count", category: "TECH" },
    { key: "codeReviewsDone", label: "Code Reviews Done", target: null, unit: "count", category: "TECH" },
  ],
  SOCIAL_MEDIA: [
    { key: "postsCreated", label: "Posts Created / Published", target: 4, unit: "count", category: "SOCIAL_TEMPLATE" },
    { key: "storiesReels", label: "Stories / Reels Created", target: 4, unit: "count", category: "SOCIAL_TEMPLATE" },
    { key: "engagementRate", label: "Content Engagement Rate (%)", target: 5, unit: "percent", category: "SOCIAL_TEMPLATE" },
    { key: "reachImpressions", label: "Reach / Impressions", target: 10000, unit: "count", category: "SOCIAL_TEMPLATE" },
    { key: "followerGrowth", label: "Follower Growth (Net)", target: 50, unit: "count", category: "SOCIAL_TEMPLATE" },
    { key: "commentsDMs", label: "Comments / DMs Responded To", target: 30, unit: "count", category: "SOCIAL_TEMPLATE" },
    { key: "calendarAdherence", label: "Content Calendar Adherence (%)", target: 90, unit: "percent", category: "SOCIAL_TEMPLATE" },
    { key: "graphicsDesigned", label: "Graphics / Visuals Designed", target: 4, unit: "count", category: "SOCIAL_TEMPLATE" },
  ],
};

// Extracted (dashboard-summary) keys → the Social Media team's 8-row docx KPI table.
const SOCIAL_KEY_MAP: Record<string, string> = {
  postsPublished: "postsCreated",
  postsPlanned: "postsCreated",
  reelsPublished: "storiesReels",
  storiesPublished: "storiesReels",
  reach: "reachImpressions",
  impressions: "reachImpressions",
  commentsHandled: "commentsDMs",
  messagesHandled: "commentsDMs",
  followerGrowth: "followerGrowth",
};

// Which extracted key wins when two map onto the same team template row
// ("posts published" beats "posts planned" for the Posts row, reach beats
// impressions for Reach / Impressions, …).
const SOCIAL_SOURCE_PRIORITY = ["postsPublished", "postsPlanned", "reelsPublished", "storiesPublished", "reach", "impressions", "commentsHandled", "messagesHandled", "followerGrowth"];

const targetLabelFor = (t: number | null | undefined, unit: string): string =>
  t === null || t === undefined ? "-" : unit === "percent" ? `${t}%` : unit === "minutes" ? `${t}mins` : `${t}`;

const titleizeKey = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

interface CatalogueRow { department: string; key: string; label: string; unit: string; defaultTarget: number | null; mandatory: boolean; active: boolean; category?: string }
interface MemberOverride { key: string; label?: string; target: number | null; unit?: string; status: string; department: string }

/**
 * The uploader's effective KPI configuration for their own team: the
 * centre-resolved catalogue (centre overrides over global defaults, served by
 * /api/kpi-config) plus the member's approved individual target overrides —
 * the same configuration the manual report forms use. BPO agents on the
 * INBOUND team read the INBOUND catalogue.
 */
async function loadTeamKpiConfig(user: SessionUser, department: string): Promise<{ rows: CatalogueRow[] | null; overrides: Map<string, MemberOverride> }> {
  const dept = department === "BPO" && user.team === "INBOUND" ? "INBOUND" : department;
  const centreQs = user.country && user.state ? `?centreCountry=${encodeURIComponent(user.country)}&centreState=${encodeURIComponent(user.state)}` : "";
  const [cfg, member] = await Promise.all([
    api<{ configs: CatalogueRow[] }>(`/api/kpi-config${centreQs}`)
      .then((r) => r.configs.filter((c) => c.department === dept && c.active !== false))
      .catch(() => null),
    api<{ configs: MemberOverride[] }>(`/api/users/${user.id}/member-kpi`)
      .then((r) => r.configs.filter((c) => c.status === "APPROVED" && c.department === dept))
      .catch(() => [] as MemberOverride[]),
  ]);
  return { rows: cfg, overrides: new Map(member.map((m) => [m.key, m])) };
}

/**
 * Build the review grid in the TEAM'S OWN report format: rows come from the
 * team's KPI configuration (labels, targets, mandatory flags), values come
 * from the document. Summary keys are mapped onto the team's template rows
 * where the wording differs (social media), and every extracted value the
 * template has no row for is kept visible instead of being dropped.
 */
function buildTeamKpiRows(
  department: string,
  catalogue: CatalogueRow[] | null,
  overrides: Map<string, MemberOverride>,
  extractedEntries: [string, number][],
): KpiMetric[] {
  const fallback = FALLBACK_SEEDS[department] ?? [];
  const fallbackByKey = new Map(fallback.map((d) => [d.key, d]));
  const base = (catalogue?.length ? catalogue : fallback.map((d) => ({ ...d, department, active: true, category: d.category }))).map((c) => {
    const fb = fallbackByKey.get(c.key);
    const unit = (fb?.unit ?? (c.unit === "percent" || c.unit === "minutes" ? c.unit : "count")) as KpiMetric["unit"];
    return { key: c.key, label: c.label, target: c.defaultTarget, unit, category: fb?.category ?? c.category ?? "CUSTOM", mandatory: !!c.mandatory };
  });
  const rows: KpiMetric[] = base.map((r) => {
    const o = overrides.get(r.key);
    if (o && o.target !== null && o.target !== undefined) { r.label = o.label || r.label; r.target = o.target; }
    return { ...r, targetLabel: targetLabelFor(r.target, r.unit), actual: null, variance: null, auto: false, notes: "" };
  });
  const claimedSources = new Set<string>();
  for (const [srcKey, value] of extractedEntries) {
    const targetKey = department === "SOCIAL_MEDIA" ? SOCIAL_KEY_MAP[srcKey] ?? null : srcKey;
    if (!targetKey) continue;
    const row = rows.find((r) => r.key === targetKey);
    claimedSources.add(srcKey);
    if (row && row.actual === null) {
      row.actual = value;
      row.notes = "Extracted — please verify";
    }
  }
  // Values the team template has no row for stay visible — nothing the
  // document stated is silently dropped.
  for (const [srcKey, value] of extractedEntries) {
    if (claimedSources.has(srcKey) || rows.some((r) => r.key === srcKey)) continue;
    rows.push({ key: srcKey, label: titleizeKey(srcKey), target: null, targetLabel: "-", actual: value, variance: null, unit: "count", category: "EXTRACTED", auto: false, notes: "Extracted — please verify" });
  }
  return rows;
}

/** Technical team format — Work & Task Entries (mirror of the manual form). */
function TechEntriesEditor({ entries, onChange }: { entries: TechEntry[]; onChange: (e: TechEntry[]) => void }) {
  const blank = (): TechEntry => ({ title: "", project: "", category: "", status: "In Progress", hours: "", deliverable: "" });
  const patch = (i: number, p: Partial<TechEntry>) => onChange(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#b3a5ff]">Work & Task Entries — Web & Technical format</p>
        <Button size="sm" variant="outline" className="h-7 gap-1 border-[#8b7ff5]/40 px-2 text-[11px] text-[#b3a5ff]" onClick={() => onChange([...entries, blank()])}><Plus className="h-3 w-3" /> Add entry</Button>
      </div>
      {entries.length === 0 && <p className="text-[11px] text-slate-500">Part of the technical report format — record each task worked on today (copy details from the Full extraction tab if the document listed them).</p>}
      {entries.map((e, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entry {i + 1}</p>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => onChange(entries.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Field label="Task title"><Input className={inputCls} value={e.title} onChange={(ev) => patch(i, { title: ev.target.value })} placeholder="e.g. Fix checkout bug" /></Field>
            <Field label="Project / website"><Input className={inputCls} value={e.project} onChange={(ev) => patch(i, { project: ev.target.value })} placeholder="e.g. sbtsgroup.com" /></Field>
            <Field label="Category">
              <Select value={e.category} onValueChange={(v) => patch(i, { category: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TECH_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={e.status} onValueChange={(v) => patch(i, { status: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TECH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Hours spent"><Input type="number" className={inputCls} value={e.hours} onChange={(ev) => patch(i, { hours: ev.target.value })} placeholder="e.g. 3" /></Field>
            <Field label="Deliverable"><Input className={inputCls} value={e.deliverable} onChange={(ev) => patch(i, { deliverable: ev.target.value })} placeholder="What was produced" /></Field>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Social media team format — Tasks Assigned & Completed (mirror of the manual form). */
function SocialTasksEditor({ tasks, onChange }: { tasks: SocialTask[]; onChange: (t: SocialTask[]) => void }) {
  const blank = (): SocialTask => ({ task: "", platform: "", status: "", deliverable: "" });
  const patch = (i: number, p: Partial<SocialTask>) => onChange(tasks.map((t, j) => (j === i ? { ...t, ...p } : t)));
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#b3a5ff]">Tasks Assigned & Completed — Social Media format</p>
        <Button size="sm" variant="outline" className="h-7 gap-1 border-[#8b7ff5]/40 px-2 text-[11px] text-[#b3a5ff]" onClick={() => onChange([...tasks, blank()])}><Plus className="h-3 w-3" /> Add task</Button>
      </div>
      {tasks.length === 0 && <p className="text-[11px] text-slate-500">Part of the social media report format — one row per task with its platform and status.</p>}
      {tasks.map((t, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task {i + 1}</p>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => onChange(tasks.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Task / activity"><Input className={inputCls} value={t.task} onChange={(ev) => patch(i, { task: ev.target.value })} placeholder="e.g. Design campaign graphics" /></Field>
            <Field label="Platform">
              <Select value={t.platform} onValueChange={(v) => patch(i, { platform: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SOCIAL_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={t.status} onValueChange={(v) => patch(i, { status: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SOCIAL_TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Deliverable / notes"><Input className={inputCls} value={t.deliverable} onChange={(ev) => patch(i, { deliverable: ev.target.value })} placeholder="Output or link" /></Field>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReviewSections {
  challenges?: string | null;
  escalations?: string | null;
  additionalActivities?: string | null;
  qaObservations?: string | null;
  coaching?: string | null;
  highlights?: string | null;
  lowlights?: string | null;
  actionPlan?: string | null;
  teamName?: string | null;
  shiftTime?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  attendanceStatus?: string | null;
}

interface ExtractResponse {
  fields: ExtractedField[];
  sections: ReviewSections;
  stats: { fieldsFound: number; fieldsNeedingReview: number; aiChecked: boolean; aiNote?: string };
  rawTextPreview: string;
  doc: DocIntelPayload | null;
}

export default function UploadView({ user, defaultDate }: { user: SessionUser; defaultDate: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [department, setDepartment] = useState(user.department);
  const [reportDate, setReportDate] = useState(defaultDate);
  const [campaign, setCampaign] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractResponse | null>(null);
  const [metrics, setMetrics] = useState<KpiMetric[]>([]);
  const [sections, setSections] = useState<ReviewSections>({});
  const [additional, setAdditional] = useState("");
  const [techEntries, setTechEntries] = useState<TechEntry[]>([]);
  const [socialTasks, setSocialTasks] = useState<SocialTask[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ ref: string; submitted: boolean } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [includedUnmapped, setIncludedUnmapped] = useState<string[]>([]);
  // Managers may file a document on behalf of any team; staff always file in
  // their own team's format.
  const isManager = user.role === "ADMIN" || user.role === "SUPERVISOR";
  // Team leads upload THEIR OWN report: the Team Lead daily report in the lead
  // format of their team (TL_SOCIAL / TL_TECH / TL_OUTBOUND / TL_INBOUND).
  const leadTemplateMeta = user.role === "TEAM_LEAD" ? teamTemplateMeta(tlTemplateKeyFor(user.department, user.team)) : undefined;

  const reset = () => {
    setFile(null); setUploadId(null); setExtraction(null); setMetrics([]); setSections({}); setAdditional(""); setConfirmed(null); setError(null); setDiscarded(false); setShowRaw(false); setIncludedUnmapped([]); setTechEntries([]); setSocialTasks([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const doUpload = async () => {
    if (!file) { setError("Choose a file first"); return; }
    setUploading(true); setError(null); setConfirmed(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("department", department);
      fd.append("reportDate", reportDate);
      if (campaign) fd.append("campaign", campaign);
      const { upload } = await api<{ upload: UploadDTO }>("/api/uploads", { method: "POST", body: fd });
      setUploadId(upload.id);
      setUploadedName(file.name);
      await runExtraction(upload.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const runExtraction = async (id: string) => {
    setExtracting(true);
    try {
      const res = await api<ExtractResponse | { status: string; error: string }>("/api/uploads/extract", { method: "POST", body: JSON.stringify({ id }) });
      if ("error" in res && res.status === "FAILED") {
        setError(res.error);
        return;
      }
      const ext = res as ExtractResponse;
      setExtraction(ext);
      // ── Team-aware review: EVERY department reviews the upload in its own
      // report format with its own KPI configuration — the social media team
      // sees the social media template rows, web dev the technical metrics,
      // outbound/inbound agents the call KPIs, supervisors the supervisor
      // grid. The outbound agent template is never forced onto another team.
      const isSupervisor = department === "MANAGEMENT";
      const isTeamLead = user.role === "TEAM_LEAD" && !isManager;
      const routedByKey = new Map((ext.doc?.full.routed ?? []).map((r) => [r.key, r]));
      const extractedEntries: [string, number][] = ext.fields
        .filter((f) => typeof f.value === "number")
        .map((f) => [f.key, f.value as number]);
      if (isSupervisor) {
        const { SUPERVISOR_KPIS_SEED } = await import("@/lib/kpi-seed");
        const seeded = SUPERVISOR_KPIS_SEED.map((d) => {
          const found = ext.fields.find((f) => f.key === d.key);
          const reported = routedByKey.get(d.key);
          return {
            ...d,
            actual: found && typeof found.value === "number" ? found.value : null,
            // The document's own "Team Target" column — never the agent KPI config
            target: typeof reported?.reportedTarget === "number" ? reported.reportedTarget : d.target,
            targetLabel: typeof reported?.reportedTarget === "number" ? String(reported.reportedTarget) : d.targetLabel,
            auto: false,
            notes: found?.needsReview ? "Extracted — please verify" : "",
          };
        });
        setMetrics(seeded as KpiMetric[]);
      } else if (isTeamLead) {
        // TEAM LEAD: the review grid is the lead's OWN report format — rows
        // from the lead template of their team (the same definition the Daily
        // Report page fills), values from the document. Never an agent grid.
        const tlKey = tlTemplateKeyFor(user.department, user.team);
        const tpl = await api<{ template: { definition: TlDefinition } }>(`/api/report-template?key=${tlKey}`);
        const leadRows: KpiMetric[] = [];
        for (const s of tpl.template.definition.sections) {
          if (s.type !== "metrics") continue;
          for (const m of s.metrics || []) {
            const found = ext.fields.find((f) => f.key === m.key);
            const reported = routedByKey.get(m.key);
            leadRows.push({
              key: m.key, label: m.label, target: m.target,
              targetLabel: m.target === null ? "-" : String(m.target) + (m.unit === "percent" ? "%" : ""),
              unit: m.unit,
              actual: found && typeof found.value === "number" ? found.value : null,
              variance: null, auto: false, category: "LEAD_TEMPLATE",
              notes: found?.needsReview ? "Extracted — please verify" : typeof reported?.reportedTarget === "number" ? `Document target: ${reported.reportedTarget}` : "",
            });
          }
        }
        const known = new Set(leadRows.map((r) => r.key));
        for (const [srcKey, value] of extractedEntries) {
          if (known.has(srcKey)) continue;
          leadRows.push({ key: srcKey, label: titleizeKey(srcKey), target: null, targetLabel: "-", actual: value, variance: null, unit: "count", category: "EXTRACTED", auto: false, notes: "Extracted — please verify" });
        }
        setMetrics(leadRows);
      } else {
        // Ordered so the right source wins when two summary keys map onto one
        // team template row (documented in SOCIAL_SOURCE_PRIORITY).
        const valueOf = new Map(extractedEntries);
        const ordered: [string, number][] = department === "SOCIAL_MEDIA"
          ? [
              ...SOCIAL_SOURCE_PRIORITY.filter((k) => valueOf.has(k)).map((k) => [k, valueOf.get(k)!] as [string, number]),
              ...extractedEntries.filter(([k]) => !SOCIAL_SOURCE_PRIORITY.includes(k)),
            ]
          : extractedEntries;
        const { rows: catalogue, overrides } = await loadTeamKpiConfig(user, department);
        const dept = department === "BPO" && user.team === "INBOUND" ? "INBOUND" : department;
        setMetrics(buildTeamKpiRows(dept, catalogue, overrides, ordered));
      }
      setSections(ext.sections || {});
      setAdditional(ext.sections?.additionalActivities || "");
      // Prefill the attendance block from the document understanding stage
      const att = ext.doc?.full.meta.attendance;
      if (att) {
        setSections((prev) => ({
          ...prev,
          shiftTime: att.shiftTime || prev.shiftTime,
          clockIn: att.clockIn || prev.clockIn,
          clockOut: att.clockOut || prev.clockOut,
          attendanceStatus: att.attendanceStatus || prev.attendanceStatus,
        }));
      }
      // Supervisor: prefill the team name the document states
      if (isSupervisor && ext.doc?.full.meta.team) {
        setSections((prev) => ({ ...prev, teamName: ext.doc?.full.meta.team || prev.teamName || null }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExtracting(false);
    }
  };

  const includeUnmapped = (label: string, content: string) => {
    const marker = `—from "${label}": ${content}`;
    setAdditional((prev) => (prev ? `${prev}\n${marker}` : marker));
    setIncludedUnmapped((prev) => [...prev, label]);
  };

  const confirm = async (submit: boolean) => {
    if (!uploadId) return;
    setConfirming(true); setError(null);
    try {
      // Team-format details: technical work entries and social media tasks are
      // part of those teams' report formats — they travel with the confirm so
      // the created report carries the full team template, not just KPI rows.
      const cleanTech = techEntries.filter((e) => Object.values(e).some((v) => v && String(v).trim() !== ""));
      const cleanSocial = socialTasks.filter((e) => Object.values(e).some((v) => v && String(v).trim() !== ""));
      const workEntries = department === "WEB_DEV" ? cleanTech : department === "SOCIAL_MEDIA" ? cleanSocial : undefined;
      const { report } = await api<{ report: { ref: string } }>("/api/uploads/confirm", {
        method: "POST",
        body: JSON.stringify({ uploadId, confirmedMetrics: metrics, sections: { ...sections, additionalActivities: additional }, reportDate, department, submit, ...(workEntries ? { workEntries } : {}) }),
      });
      setConfirmed({ ref: report.ref, submitted: submit });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  const reviewCount = extraction?.fields.filter((f) => f.needsReview).length || 0;
  const doc = extraction?.doc ?? null;
  const full = doc?.full ?? null;
  const unmappedCount = full?.unmapped.length ?? 0;
  const flagsCount = full ? full.validation.filter((v) => v.severity !== "INFO").length : 0;

  return (
    <div className="space-y-5">
      {confirmed && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          <span>Extraction confirmed and saved as report <span className="font-mono font-semibold">{confirmed.ref}</span>{confirmed.submitted ? " and submitted for supervisor review." : " (draft)."}</span>
          <Button size="sm" variant="outline" className="ml-auto border-emerald-500/40 text-emerald-300" onClick={reset}>Upload another</Button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {discarded && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <ScrollText className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Original file discarded — only the text draft and extracted fields are kept. Use <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setShowDraft(true)}>Text draft</button> to view or copy the text.</span>
        </div>
      )}

      <SectionCard title="Upload Report" subtitle={`The document is read in full — tables, sections and reading order preserved — then every KPI is routed to the right field for your review. ${SUPPORTED}`}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={isManager ? "Department" : "Team — your own report format"}>
            {isManager ? (
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BPO">BPO & Outbound Call Centre</SelectItem>
                  <SelectItem value="WEB_DEV">Web Development & Technical</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                  <SelectItem value="MANAGEMENT">Management / Supervisor</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-200" title="Reports are always read in your own team's format and KPI configuration">
                <Users className="h-3.5 w-3.5 shrink-0 text-[#8b7ff5]" />
                <span className="truncate">{DEPT_LABELS[user.department] || user.department}{user.team && DEPT_LABELS[user.team] && DEPT_LABELS[user.team] !== (DEPT_LABELS[user.department] || user.department) ? ` — ${DEPT_LABELS[user.team]}` : ""}</span>
              </div>
            )}
          </Field>
          <Field label="Reporting date">
            <Input type="date" className={inputCls} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </Field>
          <Field label="Campaign / project (optional)">
            <Input className={inputCls} value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Q3 Outreach" />
          </Field>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#6c5ce7]/40 bg-[#6c5ce7]/5 px-6 py-10 text-center transition-colors hover:border-[#6c5ce7]/70 hover:bg-[#6c5ce7]/10"
        >
          <FileUp className="mb-3 h-10 w-10 text-[#8b7ff5]" />
          <p className="text-sm font-semibold text-slate-200">{file ? file.name : "Click to choose a file or drag it here"}</p>
          <p className="mt-1 text-xs text-slate-500">{file ? `${(file.size / 1024).toFixed(1)} KB` : SUPPORTED}</p>
          <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {uploadId && !confirmed && (
            <>
              <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400">Start over</Button>
              <Button variant="outline" size="sm" onClick={() => setShowDraft(true)} className="border-[#8b7ff5]/40 text-[#b3a5ff]">
                <ScrollText className="mr-1.5 h-4 w-4" /> Text draft
              </Button>
              {!discarded && (
                <Button variant="outline" size="sm" onClick={() => setPreviewing(true)} className="border-[#8b7ff5]/40 text-[#b3a5ff]">
                  <Eye className="mr-1.5 h-4 w-4" /> Preview document
                </Button>
              )}
            </>
          )}
          <Button onClick={doUpload} disabled={!file || uploading || extracting} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
            {uploading || extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
            {uploading ? "Uploading…" : extracting ? "Reading document…" : "Upload & Extract"}
          </Button>
        </div>
        {extracting && <Progress value={66} className="mt-3 h-1.5" />}
      </SectionCard>

      {extraction && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="k-card flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 text-[#8b7ff5]" />
              <div>
                <p className="text-xl font-bold text-white">{extraction.stats.fieldsFound}</p>
                <p className="text-xs text-slate-400">fields identified</p>
              </div>
            </div>
            <div className="k-card flex items-center gap-3 p-4">
              <ShieldAlert className="h-8 w-8 text-[#e8833a]" />
              <div>
                <p className="text-xl font-bold text-white">{reviewCount}</p>
                <p className="text-xs text-slate-400">need your review</p>
              </div>
            </div>
            <div className="k-card flex items-center gap-3 p-4">
              <FileSearch className="h-8 w-8 text-amber-300" />
              <div>
                <p className="text-xl font-bold text-white">{unmappedCount}</p>
                <p className="text-xs text-slate-400">items kept for review (no template field)</p>
              </div>
            </div>
            <div className="k-card flex items-center gap-3 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-white">{extraction.stats.fieldsFound - reviewCount}</p>
                <p className="text-xs text-slate-400">high confidence</p>
              </div>
            </div>
          </div>

          {doc && (
            <div className="k-card p-4 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-100"><ScanSearch className="h-3.5 w-3.5 text-[#8b7ff5]" /> {doc.ir.format.toUpperCase()} read: {doc.ir.routeNote}</span>
                {full?.meta.docType && <span>Document type: <span className="text-[#b3a5ff]">{full.meta.docType}</span></span>}
                {full?.meta.reportingPeriod && <span>Period: <span className="text-slate-100">{full.meta.reportingPeriod}</span></span>}
                {full?.meta.agentName && <span>Owner: <span className="text-slate-100">{full.meta.agentName}</span></span>}
                <span className="ml-auto text-slate-500">{full?.coverage.aiStagesCompleted ? `AI read the full document in ${full.coverage.chunksRead} pass${full.coverage.chunksRead > 1 ? "es" : ""}` : "AI read unavailable — deterministic pass only"}</span>
              </div>
              {extraction.stats.aiNote && (
                <div className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 ${extraction.stats.aiNote.includes("Gemini unavailable") || extraction.stats.aiNote.includes("unavailable") ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-sky-500/30 bg-sky-500/10 text-sky-200"}`}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{extraction.stats.aiNote}</span>
                </div>
              )}
              {full?.meta.departmentMismatch && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {full.meta.departmentMismatch}
                </div>
              )}
            </div>
          )}

          <SectionCard title="Review Extracted Information" subtitle="Correct anything the system misread, fill what was missed, then confirm. Upload does not mean approved.">
            <Tabs defaultValue="mapped">
              <TabsList className="mb-4 bg-white/5">
                <TabsTrigger value="mapped" className="gap-1.5"><Table2 className="h-3.5 w-3.5" /> Mapped fields</TabsTrigger>
                <TabsTrigger value="fulldoc" className="gap-1.5"><FileSearch className="h-3.5 w-3.5" /> Full extraction{unmappedCount ? ` (${unmappedCount})` : ""}</TabsTrigger>
                <TabsTrigger value="checks" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Checks{flagsCount ? ` (${flagsCount})` : ""}</TabsTrigger>
              </TabsList>

              {/* ── Tab 1: mapped fields (the template) ── */}
              <TabsContent value="mapped" className="space-y-4">
                {extraction.stats.fieldsFound === 0 ? (
                  <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="No structured fields could be identified" hint="The document may be handwritten or an unusual layout. Enter the values manually below — the original file stays attached to your report." />
                ) : (
                  <>
                    <div className="space-y-2">
                      {extraction.fields.map((f) => (
                        <div key={f.key + f.source} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${f.confidence === "high" && !f.needsReview ? "bg-emerald-500/15 text-emerald-300" : f.confidence === "medium" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"}`}>
                            {f.confidence === "high" && !f.needsReview ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {f.confidence}{f.needsReview ? " · review" : ""}
                          </span>
                          <span className="font-medium text-slate-200">{f.label}</span>
                          <span className="font-mono text-[#b3a5ff]">{String(f.value)}</span>
                          <span className="ml-auto max-w-[50%] truncate text-[10px] text-slate-500" title={f.source}>source: {f.source}</span>
                        </div>
                      ))}
                    </div>
                    <KpiTable metrics={metrics} onChange={setMetrics} />
                    {leadTemplateMeta && (
                      <div className="flex items-start gap-2 rounded-lg border border-[#6c5ce7]/30 bg-[#6c5ce7]/10 px-3 py-2 text-xs text-[#c9c0ff]">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Confirming files this as <span className="font-semibold text-white">your Team Lead daily report</span> in the <span className="font-semibold">{leadTemplateMeta.label}</span> lead format (ref TL-UP-…). The rows follow your team's lead template and KPI configuration — supervisors are alerted instantly if the document contains escalations.</span>
                      </div>
                    )}
                  </>
                )}

                {department === "WEB_DEV" && <TechEntriesEditor entries={techEntries} onChange={setTechEntries} />}
                {department === "SOCIAL_MEDIA" && <SocialTasksEditor tasks={socialTasks} onChange={setSocialTasks} />}

                {department === "MANAGEMENT" ? (
                  <div className="space-y-4">
                    <Field label="Team name">
                      <Input className={inputCls} value={sections.teamName || ""} onChange={(e) => setSections({ ...sections, teamName: e.target.value })} placeholder="e.g. OUTBOUND" />
                    </Field>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Quality Assurance Observations">
                        <Textarea rows={3} className={inputCls} value={sections.qaObservations || ""} onChange={(e) => setSections({ ...sections, qaObservations: e.target.value })} />
                      </Field>
                      <Field label="Coaching & Feedback Provided">
                        <Textarea rows={3} className={inputCls} value={sections.coaching || ""} onChange={(e) => setSections({ ...sections, coaching: e.target.value })} />
                      </Field>
                      <Field label="Issues Escalated to Management">
                        <Textarea rows={3} className={inputCls} value={sections.escalations || ""} onChange={(e) => setSections({ ...sections, escalations: e.target.value })} />
                      </Field>
                      <Field label="Action Plan for Next Day">
                        <Textarea rows={3} className={inputCls} value={sections.actionPlan || ""} onChange={(e) => setSections({ ...sections, actionPlan: e.target.value })} />
                      </Field>
                      <Field label="Shift Highlights">
                        <Textarea rows={2} className={inputCls} value={sections.highlights || ""} onChange={(e) => setSections({ ...sections, highlights: e.target.value })} />
                      </Field>
                      <Field label="Shift Lowlights">
                        <Textarea rows={2} className={inputCls} value={sections.lowlights || ""} onChange={(e) => setSections({ ...sections, lowlights: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field label="Challenges / Blockers">
                        <Textarea rows={3} className={inputCls} value={sections.challenges || ""} onChange={(e) => setSections({ ...sections, challenges: e.target.value })} />
                      </Field>
                      <Field label="Escalations">
                        <Textarea rows={3} className={inputCls} value={sections.escalations || ""} onChange={(e) => setSections({ ...sections, escalations: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Additional Activities">
                      <Textarea rows={3} className={inputCls} value={additional} onChange={(e) => setAdditional(e.target.value)} />
                    </Field>
                    <p className="text-[11px] text-slate-500">Content the template has no field for is kept in the <b>Full extraction</b> tab — add anything relevant here so it reaches the report.</p>
                  </>
                )}
              </TabsContent>

              {/* ── Tab 2: full extraction (everything the document contains) ── */}
              <TabsContent value="fulldoc" className="space-y-4">
                {full && full.sections.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sections captured from the document ({full.sections.length})</p>
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {full.sections.map((s, i) => (
                        <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{s.heading}</span>
                            <span className="ml-auto text-[10px] text-slate-500">{s.sourceRef}</span>
                            {s.heading.toLowerCase().includes("challenge") && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-[#b3a5ff]" onClick={() => setSections((p) => ({ ...p, challenges: (p.challenges ? p.challenges + "\n" : "") + s.content }))}>→ Challenges</Button>
                            )}
                            {s.heading.toLowerCase().includes("escalat") && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-[#b3a5ff]" onClick={() => setSections((p) => ({ ...p, escalations: (p.escalations ? p.escalations + "\n" : "") + s.content }))}>→ Escalations</Button>
                            )}
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-slate-300">{s.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {full && full.unmapped.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Preserved — no matching template field ({full.unmapped.length})</p>
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {full.unmapped.map((u, i) => (
                        <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-amber-200">{u.label}</span>
                            <span className="ml-auto text-[10px] text-slate-500">{u.sourceRef}</span>
                            {!includedUnmapped.includes(u.label) && (
                              <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px] border-amber-500/40 text-amber-200" onClick={() => includeUnmapped(u.label, u.content)}>
                                <PlusCircle className="h-3 w-3" /> Add to Additional Activities
                              </Button>
                            )}
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-slate-300">{u.content}</p>
                          <p className="mt-1 text-[10px] text-slate-500">why: {u.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {full && full.sections.length === 0 && full.unmapped.length === 0 && (
                  <EmptyState icon={<FileSearch className="h-8 w-8" />} title="No extra narrative content recorded" hint="Everything the AI read was either mapped to fields above or the document is purely tabular." />
                )}

                {doc && (
                  <div>
                    <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setShowRaw(!showRaw)}>
                      {showRaw ? "Hide" : "Show"} structured document text ({doc.markdown.length.toLocaleString()} chars)
                    </Button>
                    {showRaw && (
                      <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300">{doc.markdown}</pre>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── Tab 3: validation checks (code-side, before approval) ── */}
              <TabsContent value="checks" className="space-y-2">
                {full && full.validation.length > 0 ? (
                  full.validation.map((v, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${v.severity === "ERROR" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : v.severity === "WARNING" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-white/10 bg-white/[0.02] text-slate-300"}`}>
                      {v.severity === "INFO" ? <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <span><b>{v.field}</b> — {v.message}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />} title="All checks passed" hint="Values are within expected ranges and consistent with the configured formulas." />
                )}
                {full && (
                  <p className="pt-2 text-[11px] text-slate-500">
                    Coverage: {full.coverage.fieldsMapped} metric value(s) mapped · {full.coverage.sectionsCaptured} narrative section(s) captured · {full.coverage.unmappedCount} item(s) preserved for review. Nothing is auto-approved — your supervisor reviews every submission.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <Button variant="outline" disabled={confirming} onClick={() => confirm(false)} className="border-slate-600 text-slate-200 hover:bg-white/10">
                <Save className="mr-2 h-4 w-4" /> Save as Draft
              </Button>
              <Button disabled={confirming} onClick={() => confirm(true)} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
                {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Confirm & Submit
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <XCircle className="h-3.5 w-3.5 text-slate-500" /> Uploading a document never automatically approves its contents — your supervisor reviews every submission.
            </p>
          </SectionCard>
        </>
      )}
      {previewing && uploadId && !discarded && <DocumentViewerModal uploadId={uploadId} name={uploadedName || "document"} onClose={() => setPreviewing(false)} />}
      {showDraft && uploadId && <TextDraftModal uploadId={uploadId} name={uploadedName || "document"} onClose={() => setShowDraft(false)} onDiscarded={() => setDiscarded(true)} />}
    </div>
  );
}
