"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ROLE_LABELS, type ReportDTO, type KpiMetric, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, EmptyState, ReportStateBanner } from "@/components/kallmania/shared";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Save, Send, Loader2, MessageSquareQuote } from "lucide-react";

const TECH_CATEGORIES = ["Website Development", "Frontend Development", "Backend Development", "Bug Fixing", "Website Maintenance", "API Integration", "Database Tasks", "Technical Support", "Testing & QA", "Deployment & Release", "Security & Performance", "Technical Research", "Documentation", "Other"];
const TECH_STATUSES = ["Not Started", "In Progress", "Completed", "Under Review", "Blocked", "Pending Deployment", "Awaiting Approval", "Not Completed"];
const TECH_METRICS = [
  { key: "tasksCompleted", label: "Tasks Completed" },
  { key: "bugsResolved", label: "Bugs Resolved" },
  { key: "supportTicketsResolved", label: "Support Tickets Resolved" },
  { key: "deploymentsCompleted", label: "Deployments Completed" },
  { key: "testCasesPassed", label: "Test Cases Passed" },
  { key: "milestonesDelivered", label: "Milestones Delivered" },
  { key: "codeReviewsDone", label: "Code Reviews Done" },
];
const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "X (Twitter)", "LinkedIn", "TikTok", "YouTube", "WhatsApp", "Threads", "Pinterest", "Other"];
const SOCIAL_TASK_STATUSES = ["Planned", "In Progress", "Completed", "Published", "Blocked", "Not Completed"];
const SOCIAL_TASK_ROWS = 6; // template shows 6 numbered rows — more can be added

// The 8 KPI rows from Daily_Report_Social_Media_Team.docx — exact replica
const SOCIAL_KPI_ROWS: { key: string; label: string; unit: "count" | "percent" }[] = [
  { key: "postsCreated", label: "Posts Created / Published", unit: "count" },
  { key: "storiesReels", label: "Stories / Reels Created", unit: "count" },
  { key: "engagementRate", label: "Content Engagement Rate (%)", unit: "percent" },
  { key: "reachImpressions", label: "Reach / Impressions", unit: "count" },
  { key: "followerGrowth", label: "Follower Growth (Net)", unit: "count" },
  { key: "commentsDMs", label: "Comments / DMs Responded To", unit: "count" },
  { key: "calendarAdherence", label: "Content Calendar Adherence (%)", unit: "percent" },
  { key: "graphicsDesigned", label: "Graphics / Visuals Designed", unit: "count" },
];

interface TechEntry {
  title: string; project: string; category: string; status: string; hours: string;
  deliverable: string; repoRef: string; blocker: string; nextSteps: string;
}
interface SocialTask { task: string; platform: string; status: string; deliverable: string; }

type DeptType = "TECH" | "SOCIAL";

/**
 * Shared dept-report state: load today's existing report, save/submit with the
 * template-faithful payload. SOCIAL additionally stores the 8-row docx KPI table
 * (kpiMetrics) and derives metricsSummary from it so dashboards keep aggregating.
 */
function useDeptReport<T extends object>(opts: {
  user: SessionUser; date: string; type: DeptType;
  blankEntries: () => T;
}) {
  const { user, date, type } = opts;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [entries, setEntries] = useState<T[]>(() => [opts.blankEntries()]);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [socialKpis, setSocialKpis] = useState<KpiMetric[]>([]);
  const [info, setInfo] = useState({ shiftTime: "", clockIn: "", clockOut: "", attendanceStatus: "Present", latenessMins: "", designation: ROLE_LABELS[user.role] || "" });
  const [challenges, setChallenges] = useState("");
  const [escalations, setEscalations] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { reports } = await api<{ reports: ReportDTO[] }>(`/api/reports?mine=1&type=${type}&date=${date}`);
        const existing = reports[0];
        if (cancelled) return;
        if (existing) {
          setReportId(existing.id); setRef(existing.ref); setStatus(existing.status);
          const parsed = existing.workEntries ? JSON.parse(existing.workEntries) as Record<string, unknown>[] : [];
          setEntries(parsed.length ? parsed as T[] : [opts.blankEntries()]);
          const ms = existing.metricsSummary ? JSON.parse(existing.metricsSummary) as Record<string, number> : {};
          setMetrics(Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, String(v)])));
          if (type === "SOCIAL") {
            const kpiParsed = existing.kpiMetrics ? JSON.parse(existing.kpiMetrics) as KpiMetric[] : [];
            setSocialKpis(SOCIAL_KPI_ROWS.map((d) => {
              const f = kpiParsed.find((m) => m.key === d.key);
              return f
                ? { ...f, key: d.key, label: d.label, unit: d.unit, category: "SOCIAL_TEMPLATE", auto: false, targetLabel: f.target !== null && f.target !== undefined ? String(f.target) : "-", notes: f.notes || "" }
                : { key: d.key, label: d.label, target: null, targetLabel: "-", actual: null, variance: null, unit: d.unit, category: "SOCIAL_TEMPLATE", auto: false, notes: "" };
            }));
          }
          setInfo({
            shiftTime: existing.shiftTime || "",
            clockIn: existing.clockIn || "",
            clockOut: existing.clockOut || "",
            attendanceStatus: existing.attendanceStatus || "Present",
            latenessMins: existing.latenessMins !== null && existing.latenessMins !== undefined ? String(existing.latenessMins) : "",
            designation: existing.teamName || ROLE_LABELS[user.role] || "",
          });
          setChallenges(existing.challenges || "");
          setEscalations(existing.escalations || "");
          setFeedback(existing.supervisorFeedback || null);
          setReviewer(existing.reviewer?.fullName || null);
          setReviewedAt(existing.reviewedAt || null);
        } else {
          setReportId(null); setRef(null); setStatus("DRAFT");
          setEntries([opts.blankEntries()]);
          setMetrics({});
          if (type === "SOCIAL") {
            setSocialKpis(SOCIAL_KPI_ROWS.map((d) => ({ key: d.key, label: d.label, target: null, targetLabel: "-", actual: null, variance: null, unit: d.unit, category: "SOCIAL_TEMPLATE", auto: false, notes: "" })));
          }
          setInfo({ shiftTime: "", clockIn: "", clockOut: "", attendanceStatus: "Present", latenessMins: "", designation: ROLE_LABELS[user.role] || "" });
          setChallenges(""); setEscalations("");
          setFeedback(null); setReviewer(null); setReviewedAt(null);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, user.id, type]);

  const save = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const cleanEntries = entries.filter((e) => Object.values(e as Record<string, unknown>).some((v) => v && String(v).trim() !== ""));
      const body: Record<string, unknown> = {
        type, reportDate: date, department: user.department, submit,
        shiftTime: info.shiftTime,
        clockIn: info.clockIn,
        clockOut: info.clockOut,
        attendanceStatus: info.attendanceStatus,
        latenessMins: info.latenessMins === "" ? null : info.latenessMins,
        teamName: info.designation, // Role / Designation (template field) persisted on the report
        workEntries: cleanEntries,
        challenges, escalations,
      };
      if (type === "SOCIAL") {
        body.kpiMetrics = socialKpis;
        // derive metricsSummary from the docx KPI actuals so dashboards keep aggregating
        const val = (k: string) => socialKpis.find((m) => m.key === k)?.actual;
        const ms: Record<string, number> = {};
        if (val("postsCreated") !== null && val("postsCreated") !== undefined) ms.postsPublished = val("postsCreated") as number;
        if (val("storiesReels") !== null && val("storiesReels") !== undefined) ms.storiesPublished = val("storiesReels") as number;
        if (val("reachImpressions") !== null && val("reachImpressions") !== undefined) ms.reach = val("reachImpressions") as number;
        if (val("followerGrowth") !== null && val("followerGrowth") !== undefined) ms.followerGrowth = val("followerGrowth") as number;
        if (val("commentsDMs") !== null && val("commentsDMs") !== undefined) ms.commentsHandled = val("commentsDMs") as number;
        body.metricsSummary = ms;
      } else {
        const cleanMetrics = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== "" && !Number.isNaN(parseFloat(v))).map(([k, v]) => [k, parseFloat(v)]));
        body.metricsSummary = cleanMetrics;
      }
      if (reportId) body.id = reportId;
      const { report } = await api<{ report: ReportDTO }>("/api/reports", { method: "POST", body: JSON.stringify(body) });
      setReportId(report.id); setRef(report.ref); setStatus(report.status);
      if (report.supervisorFeedback !== undefined) setFeedback(report.supervisorFeedback);
      setReviewer(report.reviewer?.fullName || null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return { loading, saving, reportId, ref, status, entries, setEntries, metrics, setMetrics, socialKpis, setSocialKpis, info, setInfo, challenges, setChallenges, escalations, setEscalations, feedback, reviewer, reviewedAt, error, save };
}

function CommonFooter({ saving, status, onSave, onSubmit }: { saving: boolean; status: string; onSave: () => void; onSubmit: () => void }) {
  if (status === "APPROVED") return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Button variant="outline" disabled={saving || status === "SUBMITTED"} onClick={onSave} className="k-btn-glass text-slate-200">
        <Save className="mr-2 h-4 w-4" /> Save Draft
      </Button>
      <Button disabled={saving} onClick={onSubmit} className="k-btn-primary">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Daily Report
      </Button>
    </div>
  );
}

// ─────────────────────────── TECH REPORT ───────────────────────────

export function TechReportForm({ user, date }: { user: SessionUser; date: string }) {
  const blank = (): TechEntry => ({ title: "", project: "", category: "", status: "In Progress", hours: "", deliverable: "", repoRef: "", blocker: "", nextSteps: "" });
  const state = useDeptReport<TechEntry>({ user, date, type: "TECH", blankEntries: blank });
  const { entries, setEntries, metrics, setMetrics } = state;
  const patch = (i: number, p: Partial<TechEntry>) => setEntries(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const locked = state.status === "APPROVED" || state.status === "SUBMITTED";

  if (state.loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {state.ref && state.status !== "DRAFT" && (
        <ReportStateBanner status={state.status} ref={state.ref} feedback={state.feedback} reviewer={state.reviewer} reviewedAt={state.reviewedAt} />
      )}
      {state.ref && state.status === "DRAFT" && (
        <div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-mono font-semibold text-[#b3a5ff]">{state.ref}</span><StatusBadge status={state.status} /></div>
      )}
      {state.error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{state.error}</div>}

      <SectionCard title="Attendance">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Staff Name"><Input readOnly disabled className={inputCls} value={user.fullName} /></Field>
          <Field label="Shift Time"><Input disabled={locked} className={inputCls} value={state.info.shiftTime} onChange={(e) => state.setInfo({ ...state.info, shiftTime: e.target.value })} placeholder="e.g. 09:00 - 17:00" /></Field>
          <Field label="Clock-In Time"><Input type="time" disabled={locked} className={inputCls} value={state.info.clockIn} onChange={(e) => state.setInfo({ ...state.info, clockIn: e.target.value })} /></Field>
          <Field label="Clock-Out Time"><Input type="time" disabled={locked} className={inputCls} value={state.info.clockOut} onChange={(e) => state.setInfo({ ...state.info, clockOut: e.target.value })} /></Field>
          <Field label="Attendance Status">
            <Select disabled={locked} value={state.info.attendanceStatus} onValueChange={(v) => state.setInfo({ ...state.info, attendanceStatus: v })}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>{["Present", "Late", "Absent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lateness (mins)"><Input type="number" disabled={locked} className={inputCls} value={state.info.latenessMins} onChange={(e) => state.setInfo({ ...state.info, latenessMins: e.target.value })} placeholder="0" /></Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Work & Task Entries"
        subtitle="Record each task you worked on today — link it to your assigned tasks where possible"
        actions={!locked && (
          <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-200" onClick={() => setEntries([...entries, blank()])}><Plus className="mr-1 h-3.5 w-3.5" /> Add entry</Button>
        )}
      >
        {entries.length === 0 ? (
          <EmptyState title="No entries yet" hint="Click “Add entry” to record your first task of the day." />
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entry {i + 1}</p>
                  {!locked && entries.length > 1 && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => setEntries(entries.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Field label="Task title"><Input disabled={locked} className={inputCls} value={e.title} onChange={(ev) => patch(i, { title: ev.target.value })} placeholder="e.g. Fix checkout bug" /></Field>
                  <Field label="Project / website"><Input disabled={locked} className={inputCls} value={e.project} onChange={(ev) => patch(i, { project: ev.target.value })} placeholder="e.g. sbtsgroup.com" /></Field>
                  <Field label="Category">
                    <Select disabled={locked} value={e.category} onValueChange={(v) => patch(i, { category: v })}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{TECH_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select disabled={locked} value={e.status} onValueChange={(v) => patch(i, { status: v })}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>{TECH_STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Hours spent"><Input disabled={locked} type="number" step="0.5" className={cn(inputCls, "tabular-nums")} value={e.hours} onChange={(ev) => patch(i, { hours: ev.target.value })} /></Field>
                  <Field label="Expected deliverable / actual outcome"><Input disabled={locked} className={inputCls} value={e.deliverable} onChange={(ev) => patch(i, { deliverable: ev.target.value })} placeholder="e.g. PR merged" /></Field>
                  <Field label="Repo / ticket / reference"><Input disabled={locked} className={inputCls} value={e.repoRef} onChange={(ev) => patch(i, { repoRef: ev.target.value })} placeholder="e.g. GH-123" /></Field>
                  <Field label="Blockers / dependencies"><Input disabled={locked} className={inputCls} value={e.blocker} onChange={(ev) => patch(i, { blocker: ev.target.value })} /></Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Key Metrics" subtitle="Technical KPIs for today (counts)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TECH_METRICS.map((d) => (
            <Field key={d.key} label={d.label}>
              <Input
                type="number" inputMode="decimal" disabled={locked}
                className={cn(inputCls, "tabular-nums")} value={metrics[d.key] || ""}
                onChange={(e) => setMetrics({ ...metrics, [d.key]: e.target.value })} placeholder="—"
              />
            </Field>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Challenges / Blockers"><Textarea disabled={locked} rows={4} className={inputCls} value={state.challenges} onChange={(e) => state.setChallenges(e.target.value)} /></SectionCard>
        <SectionCard title="Escalations"><Textarea disabled={locked} rows={4} className={inputCls} value={state.escalations} onChange={(e) => state.setEscalations(e.target.value)} /></SectionCard>
      </div>

      <CommonFooter saving={state.saving} status={state.status} onSave={() => state.save(false)} onSubmit={() => state.save(true)} />
    </div>
  );
}

// ─────────────────────────── SOCIAL REPORT — exact replica of Daily_Report_Social_Media_Team.docx ───────────────────────────

function SocialKpiTable({ rows, onChange, disabled }: { rows: KpiMetric[]; onChange: (rows: KpiMetric[]) => void; disabled?: boolean }) {
  const set = (key: string, patch: Partial<KpiMetric>) => {
    onChange(rows.map((r) => {
      if (r.key !== key) return r;
      const next: KpiMetric = { ...r, ...patch, auto: false };
      next.variance = next.actual !== null && next.target !== null ? Math.round((next.actual - next.target) * 100) / 100 : null;
      return next;
    }));
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-white/[0.03]">
            <TableHead className="text-[11px] uppercase tracking-wide text-slate-400">KPI</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-slate-400">Target</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-slate-400">Actual</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-slate-400">Variance</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-slate-400">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.key} className="border-white/5">
              <TableCell className="py-2 text-xs font-medium text-slate-200">{m.label}</TableCell>
              <TableCell className="py-2">
                <Input
                  type="number" step="any" inputMode="decimal" disabled={disabled}
                  className={cn(inputCls, "h-8 w-20 text-xs tabular-nums")}
                  value={m.target === null ? "" : m.target}
                  onChange={(e) => set(m.key, { target: e.target.value === "" ? null : parseFloat(e.target.value), targetLabel: e.target.value === "" ? "-" : e.target.value })}
                  placeholder="—"
                />
              </TableCell>
              <TableCell className="py-2">
                <Input
                  type="number" step="any" inputMode="decimal" disabled={disabled}
                  className={cn(inputCls, "h-8 w-24 text-xs tabular-nums")}
                  value={m.actual === null ? "" : m.actual}
                  onChange={(e) => set(m.key, { actual: e.target.value === "" ? null : parseFloat(e.target.value) })}
                  placeholder="—"
                />
              </TableCell>
              <TableCell className="py-2 text-xs font-semibold tabular-nums">
                {m.variance === null ? <span className="text-slate-600">—</span> : m.variance >= 0 ? <span className="text-emerald-400">+{m.variance}</span> : <span className="text-rose-400">{m.variance}</span>}
              </TableCell>
              <TableCell className="py-2">
                <Input disabled={disabled} className={cn(inputCls, "h-8 text-xs")} value={m.notes} onChange={(e) => set(m.key, { notes: e.target.value })} placeholder="optional" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SocialReportForm({ user, date }: { user: SessionUser; date: string }) {
  const blank = (): SocialTask => ({ task: "", platform: "", status: "", deliverable: "" });
  const state = useDeptReport<SocialTask>({ user, date, type: "SOCIAL", blankEntries: blank });
  const { entries, setEntries, socialKpis, setSocialKpis } = state;
  const patch = (i: number, p: Partial<SocialTask>) => setEntries(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const locked = state.status === "APPROVED" || state.status === "SUBMITTED";

  if (state.loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Document-style header */}
      <div className="k-card px-6 py-5 text-center">
        <p className="text-base font-bold text-white">SBTS Group Global — Social Media Team Daily Report</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#b3a5ff]">Daily Report — Social Media Management &amp; Content Creation Team</p>
        <p className="mt-1 text-[11px] text-slate-500">SBTS Group Global</p>
      </div>

      {state.ref && state.status !== "DRAFT" && (
        <ReportStateBanner status={state.status} ref={state.ref} feedback={state.feedback} reviewer={state.reviewer} reviewedAt={state.reviewedAt} />
      )}
      {state.ref && state.status === "DRAFT" && (
        <div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-mono font-semibold text-[#b3a5ff]">{state.ref}</span><StatusBadge status={state.status} /></div>
      )}
      {state.error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{state.error}</div>}

      <SectionCard title="Staff Information">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Staff Name"><Input readOnly disabled className={inputCls} value={user.fullName} /></Field>
          <Field label="Date"><Input readOnly disabled className={inputCls} value={date} /></Field>
          <Field label="Role / Designation"><Input disabled={locked} className={inputCls} value={state.info.designation} onChange={(e) => state.setInfo({ ...state.info, designation: e.target.value })} placeholder="e.g. Social Media Specialist" /></Field>
          <Field label="Shift Time"><Input disabled={locked} className={inputCls} value={state.info.shiftTime} onChange={(e) => state.setInfo({ ...state.info, shiftTime: e.target.value })} placeholder="e.g. 09:00 - 17:00" /></Field>
          <Field label="Clock-In Time"><Input type="time" disabled={locked} className={inputCls} value={state.info.clockIn} onChange={(e) => state.setInfo({ ...state.info, clockIn: e.target.value })} /></Field>
          <Field label="Clock-Out Time"><Input type="time" disabled={locked} className={inputCls} value={state.info.clockOut} onChange={(e) => state.setInfo({ ...state.info, clockOut: e.target.value })} /></Field>
          <Field label="Attendance Status">
            <Select disabled={locked} value={state.info.attendanceStatus} onValueChange={(v) => state.setInfo({ ...state.info, attendanceStatus: v })}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>{["Present", "Late", "Absent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lateness (mins)"><Input type="number" disabled={locked} className={inputCls} value={state.info.latenessMins} onChange={(e) => state.setInfo({ ...state.info, latenessMins: e.target.value })} placeholder="0" /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Key Performance Metrics (KPIs)" subtitle="The 8 KPIs from the official template — variance is calculated automatically">
        <SocialKpiTable rows={socialKpis} onChange={setSocialKpis} disabled={locked} />
      </SectionCard>

      <SectionCard
        title="Tasks Assigned & Completed"
        subtitle="One row per task — add as many rows as you need"
        actions={!locked && (
          <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-200" onClick={() => setEntries([...entries, blank()])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add task
          </Button>
        )}
      >
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="min-w-56 text-[11px] text-slate-400">Task Description</TableHead>
                <TableHead className="min-w-36 text-[11px] text-slate-400">Platform</TableHead>
                <TableHead className="min-w-32 text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="min-w-48 text-[11px] text-slate-400">Deliverable / Output</TableHead>
                {!locked && <TableHead className="w-10 text-[11px] text-slate-400"><span className="sr-only">Remove</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-1.5">
                    <Input disabled={locked} className={inputCls} value={e.task} onChange={(ev) => patch(i, { task: ev.target.value })} placeholder="e.g. Designed launch carousel for Instagram" />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Select disabled={locked} value={e.platform} onValueChange={(v) => patch(i, { platform: v })}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{SOCIAL_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Select disabled={locked} value={e.status} onValueChange={(v) => patch(i, { status: v })}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SOCIAL_TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Input disabled={locked} className={inputCls} value={e.deliverable} onChange={(ev) => patch(i, { deliverable: ev.target.value })} placeholder="e.g. 5-slide carousel published" />
                  </TableCell>
                  {!locked && (
                    <TableCell className="py-1.5">
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                        title="Remove this task"
                        onClick={() => setEntries(entries.length > 1 ? entries.filter((_, j) => j !== i) : [blank()])}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!locked && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>{entries.filter((e) => e.task || e.platform || e.deliverable).length} task(s) recorded</span>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5] hover:bg-white/10" onClick={() => setEntries([...entries, blank()])}>
              <Plus className="mr-1 h-3 w-3" /> Add task row
            </Button>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Challenges / Blockers"><Textarea disabled={locked} rows={4} className={inputCls} value={state.challenges} onChange={(e) => state.setChallenges(e.target.value)} placeholder="What slowed you down today?" /></SectionCard>
        <SectionCard title="Escalations"><Textarea disabled={locked} rows={4} className={inputCls} value={state.escalations} onChange={(e) => state.setEscalations(e.target.value)} placeholder="Issues that need supervisor or management attention" /></SectionCard>
      </div>

      <SectionCard
        title="Supervisor Comments"
        subtitle="Reserved for your supervisor — comments appear here after review"
        actions={<MessageSquareQuote className="h-4 w-4 text-slate-500" />}
      >
        {state.feedback ? (
          <div>
            <p className="whitespace-pre-wrap rounded-lg border border-emerald-400/25 bg-emerald-500/8 p-3 text-xs text-emerald-100">{state.feedback}</p>
            {state.reviewer && <p className="mt-1.5 text-[11px] text-slate-500">— {state.reviewer}</p>}
          </div>
        ) : (
          <p className="text-xs italic text-slate-500">No comments yet — this section is filled by your supervisor when reviewing the report.</p>
        )}
      </SectionCard>

      <CommonFooter saving={state.saving} status={state.status} onSave={() => state.save(false)} onSubmit={() => state.save(true)} />
    </div>
  );
}
