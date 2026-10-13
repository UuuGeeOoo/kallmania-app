"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type ReportDTO, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, EmptyState } from "@/components/kallmania/shared";
import { Plus, Trash2, Save, Send, Loader2 } from "lucide-react";

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
const SOCIAL_FORMATS = ["Image Post", "Graphic Design", "Video / Reel", "Story", "Carousel", "Blog / Article", "Live Session", "Community Reply", "Other"];
const SOCIAL_STATUSES = ["Planned", "Draft", "In Progress", "Published", "Scheduled", "Blocked", "Not Completed"];
const SOCIAL_METRICS = [
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

interface TechEntry {
  title: string; project: string; category: string; status: string; hours: string;
  deliverable: string; repoRef: string; blocker: string; nextSteps: string;
}
interface SocialEntry {
  platform: string; account: string; campaign: string; title: string; format: string;
  publishedAt: string; url: string; planned: string; actual: string; status: string;
  reach: string; likes: string; comments: string; shares: string; notes: string;
}

function useDeptReport<T extends { id?: string }>(opts: {
  user: SessionUser; date: string; type: "TECH" | "SOCIAL";
  blankEntries: () => T[];
  entryKind: string;
}) {
  const { user, date, type } = opts;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [entries, setEntries] = useState<T[]>(opts.blankEntries());
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [info, setInfo] = useState({ shiftTime: "", attendanceStatus: "Present" });
  const [challenges, setChallenges] = useState("");
  const [escalations, setEscalations] = useState("");
  const [additional, setAdditional] = useState("");
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
          const parsed = existing.workEntries ? JSON.parse(existing.workEntries) as T[] : [];
          setEntries(parsed.length ? parsed : opts.blankEntries());
          const ms = existing.metricsSummary ? JSON.parse(existing.metricsSummary) as Record<string, number> : {};
          setMetrics(Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, String(v)])));
          setInfo({ shiftTime: existing.shiftTime || "", attendanceStatus: existing.attendanceStatus || "Present" });
          setChallenges(existing.challenges || "");
          setEscalations(existing.escalations || "");
          setAdditional(existing.additionalActivities || "");
        } else {
          setReportId(null); setRef(null); setStatus("DRAFT");
          setEntries(opts.blankEntries());
          setMetrics({});
          setInfo({ shiftTime: "", attendanceStatus: "Present" });
          setChallenges(""); setEscalations(""); setAdditional("");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
     
  }, [date, user.id, type]);

  const save = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const cleanEntries = entries.filter((e) => Object.values(e as Record<string, unknown>).some((v) => v && String(v).trim() !== ""));
      const cleanMetrics = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== "" && !Number.isNaN(parseFloat(v))).map(([k, v]) => [k, parseFloat(v)]));
      const body: Record<string, unknown> = {
        type, reportDate: date, department: user.department, submit,
        ...info,
        workEntries: cleanEntries,
        metricsSummary: cleanMetrics,
        challenges, escalations, additionalActivities: additional,
      };
      if (reportId) body.id = reportId;
      const { report } = await api<{ report: ReportDTO }>("/api/reports", { method: "POST", body: JSON.stringify(body) });
      setReportId(report.id); setRef(report.ref); setStatus(report.status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return { loading, saving, reportId, ref, status, entries, setEntries, metrics, setMetrics, info, setInfo, challenges, setChallenges, escalations, setEscalations, additional, setAdditional, error, save };
}

function CommonFooter({ saving, status, onSave, onSubmit, saveLabel }: { saving: boolean; status: string; onSave: () => void; onSubmit: () => void; saveLabel?: string }) {
  if (status === "APPROVED") return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Button variant="outline" disabled={saving} onClick={onSave} className="border-slate-600 text-slate-200 hover:bg-white/10">
        <Save className="mr-2 h-4 w-4" /> {saveLabel || "Save Draft"}
      </Button>
      <Button disabled={saving} onClick={onSubmit} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Daily Report
      </Button>
    </div>
  );
}

function AttendanceMini({ info, onChange, disabled }: { info: { shiftTime: string; attendanceStatus: string }; onChange: (v: Partial<{ shiftTime: string; attendanceStatus: string }>) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Field label="Shift Time"><Input disabled={disabled} className={inputCls} value={info.shiftTime} onChange={(e) => onChange({ shiftTime: e.target.value })} placeholder="e.g. 09:00 - 17:00" /></Field>
      <Field label="Attendance Status">
        <Select disabled={disabled} value={info.attendanceStatus} onValueChange={(v) => onChange({ attendanceStatus: v })}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent>{["Present", "Late", "Absent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function MetricsGrid({ defs, metrics, onChange, disabled }: { defs: { key: string; label: string }[]; metrics: Record<string, string>; onChange: (m: Record<string, string>) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {defs.map((d) => (
        <Field key={d.key} label={d.label}>
          <Input
            type="number" inputMode="decimal" disabled={disabled}
            className={`${inputCls} tabular-nums`} value={metrics[d.key] || ""}
            onChange={(e) => onChange({ ...metrics, [d.key]: e.target.value })} placeholder="—"
          />
        </Field>
      ))}
    </div>
  );
}

// ─────────────────────────── TECH REPORT ───────────────────────────

export function TechReportForm({ user, date }: { user: SessionUser; date: string }) {
  const blank = (): TechEntry => ({ title: "", project: "", category: "", status: "In Progress", hours: "", deliverable: "", repoRef: "", blocker: "", nextSteps: "" });
  const state = useDeptReport<TechEntry>({ user, date, type: "TECH", blankEntries: blank, entryKind: "task" });
  const { entries, setEntries, metrics, setMetrics } = state;
  const patch = (i: number, p: Partial<TechEntry>) => setEntries(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const locked = state.status === "APPROVED";

  if (state.loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {state.ref && <div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-mono font-semibold text-[#b3a5ff]">{state.ref}</span><StatusBadge status={state.status} /></div>}
      {state.error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{state.error}</div>}

      <SectionCard title="Attendance">
        <AttendanceMini info={state.info} onChange={(v) => state.setInfo({ ...state.info, ...v })} disabled={locked} />
      </SectionCard>

      <SectionCard
        title="Work & Task Entries"
        subtitle="Record each task you worked on today — link it to your assigned tasks where possible"
        actions={<Button size="sm" variant="outline" disabled={locked} className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => setEntries([...entries, blank()])}><Plus className="mr-1 h-3.5 w-3.5" /> Add entry</Button>}
      >
        {entries.length === 0 ? (
          <EmptyState title="No entries yet" hint="Click “Add entry” to record your first task of the day." />
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entry {i + 1}</p>
                  {!locked && entries.length > 1 && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-rose-300" onClick={() => setEntries(entries.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
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
                  <Field label="Hours spent"><Input disabled={locked} type="number" step="0.5" className={`${inputCls} tabular-nums`} value={e.hours} onChange={(ev) => patch(i, { hours: ev.target.value })} /></Field>
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
        <MetricsGrid defs={TECH_METRICS} metrics={metrics} onChange={setMetrics} disabled={locked} />
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Challenges / Blockers"><Textarea disabled={locked} rows={4} className={inputCls} value={state.challenges} onChange={(e) => state.setChallenges(e.target.value)} /></SectionCard>
        <SectionCard title="Escalations"><Textarea disabled={locked} rows={4} className={inputCls} value={state.escalations} onChange={(e) => state.setEscalations(e.target.value)} /></SectionCard>
      </div>
      <SectionCard title="Additional Activities"><Textarea disabled={locked} rows={3} className={inputCls} value={state.additional} onChange={(e) => state.setAdditional(e.target.value)} /></SectionCard>

      <CommonFooter saving={state.saving} status={state.status} onSave={() => state.save(false)} onSubmit={() => state.save(true)} />
    </div>
  );
}

// ─────────────────────────── SOCIAL REPORT ───────────────────────────

export function SocialReportForm({ user, date }: { user: SessionUser; date: string }) {
  const blank = (): SocialEntry => ({ platform: "", account: "", campaign: "", title: "", format: "", publishedAt: "", url: "", planned: "", actual: "", status: "In Progress", reach: "", likes: "", comments: "", shares: "", notes: "" });
  const state = useDeptReport<SocialEntry>({ user, date, type: "SOCIAL", blankEntries: blank, entryKind: "activity" });
  const { entries, setEntries, metrics, setMetrics } = state;
  const patch = (i: number, p: Partial<SocialEntry>) => setEntries(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const locked = state.status === "APPROVED";

  if (state.loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {state.ref && <div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-mono font-semibold text-[#b3a5ff]">{state.ref}</span><StatusBadge status={state.status} /></div>}
      {state.error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{state.error}</div>}

      <SectionCard title="Attendance">
        <AttendanceMini info={state.info} onChange={(v) => state.setInfo({ ...state.info, ...v })} disabled={locked} />
      </SectionCard>

      <SectionCard
        title="Content & Platform Activities"
        subtitle="Record each post, campaign or community activity"
        actions={<Button size="sm" variant="outline" disabled={locked} className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => setEntries([...entries, blank()])}><Plus className="mr-1 h-3.5 w-3.5" /> Add activity</Button>}
      >
        {entries.length === 0 ? (
          <EmptyState title="No activities yet" hint="Click “Add activity” to record your first content item of the day." />
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Activity {i + 1}</p>
                  {!locked && entries.length > 1 && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-rose-300" onClick={() => setEntries(entries.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <Field label="Platform">
                    <Select disabled={locked} value={e.platform} onValueChange={(v) => patch(i, { platform: v })}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{SOCIAL_PLATFORMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Account / brand"><Input disabled={locked} className={inputCls} value={e.account} onChange={(ev) => patch(i, { account: ev.target.value })} /></Field>
                  <Field label="Campaign"><Input disabled={locked} className={inputCls} value={e.campaign} onChange={(ev) => patch(i, { campaign: ev.target.value })} /></Field>
                  <Field label="Content / activity title"><Input disabled={locked} className={inputCls} value={e.title} onChange={(ev) => patch(i, { title: ev.target.value })} /></Field>
                  <Field label="Format">
                    <Select disabled={locked} value={e.format} onValueChange={(v) => patch(i, { format: v })}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{SOCIAL_FORMATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Published date/time"><Input disabled={locked} type="datetime-local" className={inputCls} value={e.publishedAt} onChange={(ev) => patch(i, { publishedAt: ev.target.value })} /></Field>
                  <Field label="Post URL"><Input disabled={locked} className={inputCls} value={e.url} onChange={(ev) => patch(i, { url: ev.target.value })} placeholder="https://…" /></Field>
                  <Field label="Planned output"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={e.planned} onChange={(ev) => patch(i, { planned: ev.target.value })} /></Field>
                  <Field label="Actual output"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={e.actual} onChange={(ev) => patch(i, { actual: ev.target.value })} /></Field>
                  <Field label="Status">
                    <Select disabled={locked} value={e.status} onValueChange={(v) => patch(i, { status: v })}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>{SOCIAL_STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Reach"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={e.reach} onChange={(ev) => patch(i, { reach: ev.target.value })} /></Field>
                  <Field label="Likes"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={e.likes} onChange={(ev) => patch(i, { likes: ev.target.value })} /></Field>
                  <Field label="Comments"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={e.comments} onChange={(ev) => patch(i, { comments: ev.target.value })} /></Field>
                  <Field label="Shares"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={e.shares} onChange={(ev) => patch(i, { shares: ev.target.value })} /></Field>
                  <Field label="Notes"><Input disabled={locked} className={inputCls} value={e.notes} onChange={(ev) => patch(i, { notes: ev.target.value })} /></Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Platform Metrics Summary" subtitle="Aggregate performance across platforms today">
        <MetricsGrid defs={SOCIAL_METRICS} metrics={metrics} onChange={setMetrics} disabled={locked} />
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Challenges / Blockers"><Textarea disabled={locked} rows={4} className={inputCls} value={state.challenges} onChange={(e) => state.setChallenges(e.target.value)} /></SectionCard>
        <SectionCard title="Escalations"><Textarea disabled={locked} rows={4} className={inputCls} value={state.escalations} onChange={(e) => state.setEscalations(e.target.value)} /></SectionCard>
      </div>
      <SectionCard title="Additional Activities"><Textarea disabled={locked} rows={3} className={inputCls} value={state.additional} onChange={(e) => state.setAdditional(e.target.value)} /></SectionCard>

      <CommonFooter saving={state.saving} status={state.status} onSave={() => state.save(false)} onSubmit={() => state.save(true)} />
    </div>
  );
}
