"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { api, todayISO, type KpiMetric, type CallLogEntry, type ReportDTO, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge } from "@/components/kallmania/shared";
import { ChevronDown, Save, Send, Calculator, Loader2, FileDown } from "lucide-react";

export const DISPOSITIONS = ["Interested", "Callback Requested", "Not Interested", "No Answer", "Busy / Unreachable", "Wrong Number", "Voicemail", "Meeting Booked", "Hot Lead", "Warm Lead"];
const CALL_LOG_ROWS = 8;

function useRecalc() {
  return useCallback((metrics: KpiMetric[]): KpiMetric[] => {
    const out = metrics.map((m) => ({ ...m }));
    const get = (key: string): number | null => {
      const m = out.find((x) => x.key === key);
      return m && m.actual !== null && !Number.isNaN(m.actual) ? m.actual : null;
    };
    for (const m of out) {
      // derived metrics
      if (m.key === "contactRate") {
        const c = get("callsConnected"), t = get("totalCallsMade");
        const manual = m.actual !== null && !m.auto;
        if (!manual) { m.actual = t !== null && t !== 0 && c !== null ? Math.round((c / t) * 10000) / 100 : null; m.auto = m.actual !== null; }
      }
      if (m.key === "conversionRate") {
        const leads = get("hotLeads"), warm = get("warmLeads"), c = get("callsConnected");
        const manual = m.actual !== null && !m.auto;
        if (!manual) {
          const totalLeads = leads !== null && warm !== null ? leads + warm : null;
          m.actual = totalLeads !== null && c !== null && c !== 0 ? Math.round((totalLeads / c) * 10000) / 100 : null;
          m.auto = m.actual !== null;
        }
      }
      if (m.key === "leadsGenerated") {
        const h = get("hotLeads"), w = get("warmLeads");
        const manual = m.actual !== null && !m.auto;
        if (!manual) { m.actual = h !== null && w !== null ? h + w : null; m.auto = m.actual !== null; }
      }
      // variance
      if (m.actual !== null && m.target !== null) m.variance = Math.round((m.actual - m.target) * 100) / 100;
      else m.variance = null;
    }
    return out;
  }, []);
}

export function KpiTable({ metrics, onChange, showCategory }: { metrics: KpiMetric[]; onChange: (m: KpiMetric[]) => void; showCategory?: boolean }) {
  const recalc = useRecalc();
  const [emailOpen, setEmailOpen] = useState(false);
  const core = metrics.filter((m) => m.category === "CORE_TEMPLATE" || m.category === "LEADS_EXTENSION");
  const email = metrics.filter((m) => m.category === "EMAIL_EXTENSION");

  const setActual = (key: string, raw: string) => {
    const v = raw === "" ? null : parseFloat(raw);
    onChange(recalc(metrics.map((m) => (m.key === key ? { ...m, actual: Number.isNaN(v as number) ? null : v, auto: false } : m))));
  };
  const setNotes = (key: string, notes: string) => onChange(metrics.map((m) => (m.key === key ? { ...m, notes } : m)));

  const renderRow = (m: KpiMetric) => (
    <TableRow key={m.key} className="border-white/5">
      <TableCell className="py-2 text-xs font-medium text-slate-200">
        {m.label}
        {m.mandatory && <span className="ml-1 text-rose-400">*</span>}
        {m.auto && m.actual !== null && (
          <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-[#6c5ce7]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#b3a5ff]">
            <Calculator className="h-2.5 w-2.5" /> auto
          </span>
        )}
      </TableCell>
      <TableCell className="py-2 text-xs tabular-nums text-slate-400">{m.targetLabel}{m.unit === "percent" && m.target !== null ? "" : ""}</TableCell>
      <TableCell className="py-2">
        <Input
          type="number" step="any" inputMode="decimal"
          className="h-8 w-24 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100"
          value={m.actual === null ? "" : m.actual}
          onChange={(e) => setActual(m.key, e.target.value)}
          placeholder="—"
        />
      </TableCell>
      <TableCell className="py-2 text-xs font-semibold tabular-nums">
        {m.variance === null ? <span className="text-slate-600">—</span> : m.variance >= 0 ? <span className="text-emerald-400">+{m.variance}</span> : <span className="text-rose-400">{m.variance}</span>}
      </TableCell>
      <TableCell className="py-2">
        <Input className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={m.notes} onChange={(e) => setNotes(m.key, e.target.value)} placeholder="optional" />
      </TableCell>
    </TableRow>
  );

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
          {core.map(renderRow)}
          <TableRow className="border-white/5">
            <TableCell colSpan={5} className="p-0">
              <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#b3a5ff] hover:bg-white/[0.03]">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${emailOpen ? "rotate-180" : ""}`} />
                  Email activity metrics (extension) — {email.filter((m) => m.actual !== null).length} filled
                </CollapsibleTrigger>
                <CollapsibleContent>{email.map(renderRow)}</CollapsibleContent>
              </Collapsible>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function AttendanceBlock({
  values, onChange, user, isSupervisor,
}: {
  values: { shiftTime: string; clockIn: string; clockOut: string; attendanceStatus: string; latenessMins: string };
  onChange: (v: Partial<typeof values>) => void;
  user: SessionUser;
  isSupervisor?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Field label={isSupervisor ? "Supervisor Name" : "Agent Name"}>
        <Input readOnly disabled className={inputCls} value={user.fullName} />
      </Field>
      <Field label={isSupervisor ? "Team Name" : "Agent ID"}>
        <Input className={inputCls} value={isSupervisor ? values.teamName || "" : user.employeeId || ""} onChange={(e) => isSupervisor && onChange({ teamName: e.target.value } as never)} placeholder={isSupervisor ? "e.g. ICBM Outbound Team A" : "Auto from profile"} />
      </Field>
    </div>
  );
}

export default function AgentBpoReportForm({
  user, date, onDone,
}: {
  user: SessionUser;
  date: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("DRAFT");
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(Array.from({ length: CALL_LOG_ROWS }, () => ({})));
  const [info, setInfo] = useState({ shiftTime: "", clockIn: "", clockOut: "", attendanceStatus: "Present", latenessMins: "" });
  const [campaignName, setCampaignName] = useState("");
  const [challenges, setChallenges] = useState("");
  const [escalations, setEscalations] = useState("");
  const [additional, setAdditional] = useState("");
  const [error, setError] = useState<string | null>(null);

  const DEFAULT_KPIS: KpiMetric[] = useMemo(() => ([
    { key: "totalCallsMade", label: "Total Calls Made", target: 30, targetLabel: "30", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "", mandatory: true },
    { key: "totalMailsSent", label: "Total Mails Sent", target: 10, targetLabel: "10", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "", mandatory: true },
    { key: "callsConnected", label: "Calls Connected", target: 25, targetLabel: "25", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "", mandatory: true },
    { key: "successfulMailsSent", label: "Successful Mails Sent", target: 8, targetLabel: "8", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "contactRate", label: "Contact Rate (%)", target: 100, targetLabel: "100%", actual: null, variance: null, unit: "percent", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "conversionRate", label: "Conversion Rate (%)", target: 2, targetLabel: "2%", actual: null, variance: null, unit: "percent", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "avgTalkTime", label: "Avg. Talk Time (mins)", target: null, targetLabel: "-", actual: null, variance: null, unit: "minutes", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "avgHoldTime", label: "Avg. Hold Time (mins)", target: null, targetLabel: "-", actual: null, variance: null, unit: "minutes", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "callbacksScheduled", label: "Callbacks Scheduled", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "leadsGenerated", label: "Leads Generated (HOT / WARM)", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "hotLeads", label: "— Hot Leads", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "LEADS_EXTENSION", auto: false, notes: "" },
    { key: "warmLeads", label: "— Warm Leads", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "LEADS_EXTENSION", auto: false, notes: "" },
    { key: "positiveDispositions", label: "Positive Dispositions", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "notInterested", label: "Not Interested / Declined", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "wrapUpTime", label: "Wrap-Up / After-Call Work (mins)", target: 20, targetLabel: "20mins", actual: null, variance: null, unit: "minutes", category: "CORE_TEMPLATE", auto: false, notes: "" },
    { key: "bouncedEmails", label: "Bounced Emails", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "failedSends", label: "Failed Sending Attempts", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "followUpEmails", label: "Follow-up Emails Sent", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "personalizedOutreach", label: "Personalized Outreach Emails", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "campaignEmails", label: "Campaign Emails Sent", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "repliesReceived", label: "Replies Received", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "positiveReplies", label: "Positive Replies", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "negativeReplies", label: "Negative Replies", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "interestedProspects", label: "Interested Prospects", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "emailHotLeads", label: "Hot Leads via Email", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "emailWarmLeads", label: "Warm Leads via Email", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "meetingsBookedEmail", label: "Meetings Booked via Email", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "emailTasksCompleted", label: "Email-related Tasks Completed", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
    { key: "outstandingFollowUps", label: "Outstanding Email Follow-ups", target: null, targetLabel: "-", actual: null, variance: null, unit: "count", category: "EMAIL_EXTENSION", auto: false, notes: "" },
  ]), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { reports } = await api<{ reports: ReportDTO[] }>(`/api/reports?mine=1&type=AGENT_BPO&date=${date}`);
        const existing = reports[0];
        if (cancelled) return;
        if (existing) {
          setReportId(existing.id);
          setRef(existing.ref);
          setStatus(existing.status);
          setInfo({
            shiftTime: existing.shiftTime || "", clockIn: existing.clockIn || "", clockOut: existing.clockOut || "",
            attendanceStatus: existing.attendanceStatus || "Present", latenessMins: existing.latenessMins !== null && existing.latenessMins !== undefined ? String(existing.latenessMins) : "",
          });
          const metrics = existing.kpiMetrics ? JSON.parse(existing.kpiMetrics) as KpiMetric[] : [];
          // merge defaults so new template rows appear for older reports
          const merged = DEFAULT_KPIS.map((d) => {
            const found = metrics.find((m) => m.key === d.key);
            return found ? { ...d, ...found, label: d.label } : d;
          });
          setKpiMetrics(merged);
          const logs = existing.callLogs ? JSON.parse(existing.callLogs) as CallLogEntry[] : [];
          setCallLogs(Array.from({ length: CALL_LOG_ROWS }, (_, i) => logs[i] || {}));
          const ctx = existing.emailContext ? JSON.parse(existing.emailContext) as { campaignName?: string } : {};
          setCampaignName(ctx.campaignName || "");
          setChallenges(existing.challenges || "");
          setEscalations(existing.escalations || "");
          setAdditional(existing.additionalActivities || "");
        } else {
          setReportId(null); setRef(null); setStatus("DRAFT");
          setKpiMetrics(DEFAULT_KPIS.map((d) => ({ ...d })));
          setCallLogs(Array.from({ length: CALL_LOG_ROWS }, () => ({})));
          setCampaignName(""); setChallenges(""); setEscalations(""); setAdditional("");
          setInfo({ shiftTime: "", clockIn: "", clockOut: "", attendanceStatus: "Present", latenessMins: "" });
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date, user.id, DEFAULT_KPIS]);

  const save = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        type: "AGENT_BPO", reportDate: date, department: user.department, submit,
        ...info,
        latenessMins: info.latenessMins === "" ? null : info.latenessMins,
        kpiMetrics, callLogs,
        emailContext: { campaignName },
        challenges, escalations, additionalActivities: additional,
      };
      if (reportId) body.id = reportId;
      const { report } = await api<{ report: ReportDTO }>("/api/reports", { method: "POST", body: JSON.stringify(body) });
      setReportId(report.id); setRef(report.ref); setStatus(report.status);
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {ref && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-mono font-semibold text-[#b3a5ff]">{ref}</span>
          <StatusBadge status={status} />
          {status === "APPROVED" && <span className="text-slate-500">Locked — ask your supervisor to return it for changes.</span>}
        </div>
      )}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

      <SectionCard title="Agent Information" subtitle="DAILY REPORT — BPO CALL CENTER AGENTS (OUTBOUND CALLS)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Agent Name"><Input readOnly disabled className={inputCls} value={user.fullName} /></Field>
          <Field label="Date"><Input readOnly disabled className={inputCls} value={date} /></Field>
          <Field label="Agent ID"><Input readOnly disabled className={inputCls} value={user.employeeId || "—"} /></Field>
          <Field label="Shift Time" hint="e.g. 09:00 - 17:00">
            <Input disabled={status === "APPROVED"} className={inputCls} value={info.shiftTime} onChange={(e) => setInfo({ ...info, shiftTime: e.target.value })} />
          </Field>
          <Field label="Clock-In Time">
            <Input type="time" disabled={status === "APPROVED"} className={inputCls} value={info.clockIn} onChange={(e) => setInfo({ ...info, clockIn: e.target.value })} />
          </Field>
          <Field label="Clock-Out Time">
            <Input type="time" disabled={status === "APPROVED"} className={inputCls} value={info.clockOut} onChange={(e) => setInfo({ ...info, clockOut: e.target.value })} />
          </Field>
          <Field label="Attendance Status">
            <Select disabled={status === "APPROVED"} value={info.attendanceStatus} onValueChange={(v) => setInfo({ ...info, attendanceStatus: v })}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>{["Present", "Late", "Absent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lateness (mins)">
            <Input type="number" disabled={status === "APPROVED"} className={inputCls} value={info.latenessMins} onChange={(e) => setInfo({ ...info, latenessMins: e.target.value })} placeholder="0" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Key Performance Metrics (KPIs)" subtitle="Targets from the master template — derived KPIs calculate automatically; leave blank if not applicable">
        <KpiTable metrics={kpiMetrics} onChange={setKpiMetrics} />
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Campaign / Outreach Name" hint="Which email campaign or outreach list did you work on today?">
            <Input disabled={status === "APPROVED"} className={inputCls} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. Q3 SaaS Outreach — Batch 2" />
          </Field>
          <div className="flex items-end text-[11px] text-slate-500">
            <p>Metrics marked <span className="mx-1 rounded bg-[#6c5ce7]/20 px-1 py-0.5 text-[#b3a5ff]">auto</span> are calculated from your entries (Contact Rate = Connected ÷ Calls; Conversion = Leads ÷ Connected). Missing data is never counted as zero.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Call Log Summary" subtitle="Log up to 8 key calls from today">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Lead / Contact Name</TableHead>
                <TableHead className="text-[11px] text-slate-400">Disposition</TableHead>
                <TableHead className="text-[11px] text-slate-400">Follow-Up Required?</TableHead>
                <TableHead className="text-[11px] text-slate-400">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callLogs.map((log, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-1.5">
                    <Input disabled={status === "APPROVED"} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={log.leadName || ""} onChange={(e) => setCallLogs(callLogs.map((l, j) => (j === i ? { ...l, leadName: e.target.value } : l)))} />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Select disabled={status === "APPROVED"} value={log.disposition || ""} onValueChange={(v) => setCallLogs(callLogs.map((l, j) => (j === i ? { ...l, disposition: v } : l)))}>
                      <SelectTrigger className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DISPOSITIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Select disabled={status === "APPROVED"} value={log.followUp || ""} onValueChange={(v) => setCallLogs(callLogs.map((l, j) => (j === i ? { ...l, followUp: v } : l)))}>
                      <SelectTrigger className="h-8 w-24 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["Yes", "No"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Input disabled={status === "APPROVED"} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={log.notes || ""} onChange={(e) => setCallLogs(callLogs.map((l, j) => (j === i ? { ...l, notes: e.target.value } : l)))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Challenges / Blockers">
          <Textarea disabled={status === "APPROVED"} rows={4} className={inputCls} value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="What made your work harder today?" />
        </SectionCard>
        <SectionCard title="Escalations">
          <Textarea disabled={status === "APPROVED"} rows={4} className={inputCls} value={escalations} onChange={(e) => setEscalations(e.target.value)} placeholder="Issues that need supervisor or management attention" />
        </SectionCard>
      </div>

      <SectionCard title="Additional Activities" subtitle="Any other work performed today beyond your assigned tasks">
        <Textarea disabled={status === "APPROVED"} rows={3} className={inputCls} value={additional} onChange={(e) => setAdditional(e.target.value)} placeholder="e.g. helped onboard a new agent, data cleanup…" />
      </SectionCard>

      {status !== "APPROVED" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" disabled={saving} onClick={() => save(false)} className="border-slate-600 text-slate-200 hover:bg-white/10">
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button disabled={saving} onClick={() => save(true)} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Daily Report
          </Button>
        </div>
      )}
    </div>
  );
}
