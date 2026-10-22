"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtDate, type ReportDTO, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, ReportStateBanner } from "@/components/kallmania/shared";
import { cn } from "@/lib/utils";
import { Save, Send, Loader2, RefreshCw, FileDown, Plus, Trash2, CalendarClock } from "lucide-react";

const ATTENDANCE_ROWS = [
  { key: "totalOnShift", label: "Total Agents on Shift" },
  { key: "presentOnTime", label: "Present & On-Time" },
  { key: "lateArrivals", label: "Late Arrivals" },
  { key: "absentExcused", label: "Absent (Excused)" },
  { key: "absentUnexcused", label: "Absent (Unexcused)" },
  { key: "earlyDepartures", label: "Early Departures" },
];
const TEAM_KPI_KEYS = [
  { key: "totalCallsMade", label: "Total Calls Made (Team)" },
  { key: "avgCallsPerAgent", label: "Avg. Calls Per Agent" },
  { key: "conversionRate", label: "Team Conversion Rate (%)" },
  { key: "contactRate", label: "Team Contact Rate (%)" },
  { key: "avgTalkTime", label: "Avg. Talk Time (mins)" },
  { key: "slaAdherence", label: "SLA Adherence (%)" },
  { key: "leadsGenerated", label: "HOT / WARM Leads Generated" },
  { key: "scheduleAdherence", label: "Schedule Adherence (%)" },
];

interface AttendanceRow { count: string; details: string }
interface TeamKpiRow { key: string; label: string; teamTarget: string; teamAvg: string; best: string; lowest: string; notes: string }
interface CoachingRow { agentName: string; type: string; details: string }
interface EscalatedRow { description: string; priority: string; status: string; action: string }
interface PlanRow { action: string; owner: string; priority: string; deadline: string }

const empty = <T,>(n: number, fn: () => T): T[] => Array.from({ length: n }, fn);
const blankPlan = (): PlanRow => ({ action: "", owner: "", priority: "", deadline: "" });
const blankCoaching = (): CoachingRow => ({ agentName: "", type: "", details: "" });
const blankEscalated = (): EscalatedRow => ({ description: "", priority: "", status: "", action: "" });
const PLAN_ROWS = 6; // template shows six rows — supervisors can add as many as they need

export default function SupervisorReportForm({ user, date, onExport }: { user: SessionUser; date: string; onExport?: (id: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [info, setInfo] = useState({ shiftTime: "", clockIn: "", clockOut: "", teamName: "", campusLocation: "", agentsManaged: "" });
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>(() => Object.fromEntries(ATTENDANCE_ROWS.map((r) => [r.key, { count: "", details: "" }])));
  const [teamKpis, setTeamKpis] = useState<TeamKpiRow[]>(() => TEAM_KPI_KEYS.map((k) => ({ key: k.key, label: k.label, teamTarget: "", teamAvg: "", best: "", lowest: "", notes: "" })));
  const [coaching, setCoaching] = useState<CoachingRow[]>(() => empty(5, blankCoaching));
  const [qa, setQa] = useState("");
  const [escalated, setEscalated] = useState<EscalatedRow[]>(() => empty(4, blankEscalated));
  const [highlights, setHighlights] = useState("");
  const [lowlights, setLowlights] = useState("");
  const [plan, setPlan] = useState<PlanRow[]>(() => empty(PLAN_ROWS, blankPlan));
  const [managerReview, setManagerReview] = useState("");
  const [ownActivities, setOwnActivities] = useState("");
  // ── reporting-date guard: keep unsaved entries when the date changes ──
  const loadIdRef = useRef(0);
  const snapshotRef = useRef("{}");
  const dateRef = useRef(date);
  const mountedRef = useRef(false);
  const [dateKept, setDateKept] = useState<string | null>(null);

  const load = async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { reports } = await api<{ reports: ReportDTO[] }>(`/api/reports?mine=1&type=SUPERVISOR&date=${date}`);
      const existing = reports[0];
      // Auto-populate team aggregates from confirmed agent reports
      const consolidated = await api<{
        departments: Record<string, { teamKpiRows?: { key: string; label: string; teamTarget: number | null; teamAvg: number | null; best: string | null; lowest: string | null }[]; bpoTotals?: Record<string, number> }>;
      }>(`/api/consolidated?date=${date}`);
      const bpo = consolidated.departments?.BPO;
      if (loadId !== loadIdRef.current) return;

      const builtKpis = existing
        ? (() => {
            const kpis = existing.teamKpiAverages ? JSON.parse(existing.teamKpiAverages) as TeamKpiRow[] : [];
            return TEAM_KPI_KEYS.map((k) => {
              const found = kpis.find((x) => x.key === k.key);
              return found ? { ...found, label: k.label } : { key: k.key, label: k.label, teamTarget: "", teamAvg: "", best: "", lowest: "", notes: "" };
            });
          })()
        : bpo?.teamKpiRows
          ? TEAM_KPI_KEYS.map((k) => {
              const auto = bpo.teamKpiRows!.find((x) => x.key === k.key);
              return {
                key: k.key, label: k.label,
                teamTarget: auto?.teamTarget !== null && auto?.teamTarget !== undefined ? String(auto.teamTarget) : "",
                teamAvg: auto?.teamAvg !== null && auto?.teamAvg !== undefined ? String(auto.teamAvg) : "",
                best: auto?.best || "", lowest: auto?.lowest || "", notes: "",
              };
            })
          : TEAM_KPI_KEYS.map((k) => ({ key: k.key, label: k.label, teamTarget: "", teamAvg: "", best: "", lowest: "", notes: "" }));
      const builtAttendance = existing
        ? (() => {
            const att = existing.attendanceSummary ? JSON.parse(existing.attendanceSummary) as Record<string, AttendanceRow> : {};
            return Object.fromEntries(ATTENDANCE_ROWS.map((r) => [r.key, att[r.key] || { count: "", details: "" }]));
          })()
        : Object.fromEntries(ATTENDANCE_ROWS.map((r) => [r.key, { count: "", details: "" }]));
      const builtCoaching = existing?.coachingEntries ? (JSON.parse(existing.coachingEntries) as CoachingRow[]) : empty(5, blankCoaching);
      const builtEscalated = existing?.escalatedIssues ? (JSON.parse(existing.escalatedIssues) as EscalatedRow[]) : empty(4, blankEscalated);
      const builtPlan = existing?.actionPlan ? (JSON.parse(existing.actionPlan) as PlanRow[]) : empty(PLAN_ROWS, blankPlan);
      const builtQa = existing?.qaObservations || "";
      const builtHighlights = existing?.highlights || "";
      const builtLowlights = existing?.lowlights || "";
      const builtManagerReview = existing?.managerReview || "";
      const builtOwnActivities = existing?.additionalActivities || "";
      const builtInfo = existing ? {
        shiftTime: existing.shiftTime || "", clockIn: existing.clockIn || "", clockOut: existing.clockOut || "",
        teamName: existing.teamName || "", campusLocation: existing.campusLocation || "",
        agentsManaged: existing.agentsManaged !== null && existing.agentsManaged !== undefined ? String(existing.agentsManaged) : "",
      } : { shiftTime: "", clockIn: "", clockOut: "", teamName: "", campusLocation: "", agentsManaged: "" };

      setTeamKpis(builtKpis);
      setAttendance(builtAttendance);
      setCoaching(builtCoaching);
      setEscalated(builtEscalated);
      setPlan(builtPlan);
      setQa(builtQa);
      setHighlights(builtHighlights);
      setLowlights(builtLowlights);
      setManagerReview(builtManagerReview);
      setOwnActivities(builtOwnActivities);
      setInfo(builtInfo);
      if (existing) {
        setReportId(existing.id); setRef(existing.ref); setStatus(existing.status);
        setFeedback(existing.supervisorFeedback || null);
        setReviewer(existing.reviewer?.fullName || null);
        setReviewedAt(existing.reviewedAt || null);
      } else {
        setReportId(null); setRef(null); setStatus("DRAFT");
        setFeedback(null); setReviewer(null); setReviewedAt(null);
      }
      // baseline for the reporting-date guard — anything typed after this counts as unsaved
      snapshotRef.current = JSON.stringify({ info: builtInfo, attendance: builtAttendance, teamKpis: builtKpis, coaching: builtCoaching, qa: builtQa, escalated: builtEscalated, highlights: builtHighlights, lowlights: builtLowlights, plan: builtPlan, managerReview: builtManagerReview, ownActivities: builtOwnActivities });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (loadId === loadIdRef.current) setLoading(false);
    }
  };

  // Initial load only — date changes go through the guard below.
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Reporting-date guard: unsaved entries are kept; a clean form loads the saved date.
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; dateRef.current = date; return; }
    if (date === dateRef.current) return;
    dateRef.current = date;
    const current = JSON.stringify({ info, attendance, teamKpis, coaching, qa, escalated, highlights, lowlights, plan, managerReview, ownActivities });
    if (current !== snapshotRef.current) {
      setDateKept(date);
      return;
    }
    setDateKept(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const save = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        reportDate: date, submit,
        ...info,
        attendanceSummary: attendance,
        teamKpiAverages: teamKpis,
        coachingEntries: coaching.filter((c) => c.agentName || c.details),
        qaObservations: qa,
        escalatedIssues: escalated.filter((e) => e.description),
        highlights, lowlights,
        actionPlan: plan.filter((p) => p.action),
        managerReview,
        ownActivities,
      };
      if (reportId) body.id = reportId;
      const { report } = await api<{ report: ReportDTO }>("/api/consolidated", { method: "POST", body: JSON.stringify(body) });
      setReportId(report.id); setRef(report.ref); setStatus(report.status);
      if (report.supervisorFeedback !== undefined) setFeedback(report.supervisorFeedback);
      snapshotRef.current = JSON.stringify({ info, attendance, teamKpis, coaching, qa, escalated, highlights, lowlights, plan, managerReview, ownActivities });
      setDateKept(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Submitted → awaiting admin approval (locked); Approved → locked; Returned → editable again
  const locked = status === "APPROVED" || status === "SUBMITTED";

  const cellInput = cn(inputCls, "h-8 text-xs");
  const cellNum = cn(inputCls, "h-8 w-20 text-xs tabular-nums");
  const cellName = cn(inputCls, "h-8 w-32 text-xs");

  return (
    <div className="space-y-5">
      {dateKept && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" /> Reporting date changed to {dateKept} — your entries were kept and will be saved under this date.
        </div>
      )}
      {ref && status !== "DRAFT" && (
        <ReportStateBanner status={status} ref={ref} feedback={feedback} reviewer={reviewer} reviewedAt={reviewedAt} />
      )}
      {ref && status === "DRAFT" && (
        <div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-mono font-semibold text-[#b3a5ff]">{ref}</span><StatusBadge status={status} /></div>
      )}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

      <SectionCard title="Supervisor's Information" subtitle="DAILY REPORT — BPO SUPERVISOR" actions={
        <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-300" onClick={load} title="Re-pull team aggregates from submitted agent reports">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync team data
        </Button>
      }>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Supervisor Name"><Input readOnly disabled className={inputCls} value={user.fullName} /></Field>
          <Field label="Date"><Input readOnly disabled className={inputCls} value={fmtDate(date)} /></Field>
          <Field label="Team Name"><Input disabled={locked} className={inputCls} value={info.teamName} onChange={(e) => setInfo({ ...info, teamName: e.target.value })} /></Field>
          <Field label="Shift Time"><Input disabled={locked} className={inputCls} value={info.shiftTime} onChange={(e) => setInfo({ ...info, shiftTime: e.target.value })} /></Field>
          <Field label="Campus / Location"><Input disabled={locked} className={inputCls} value={info.campusLocation} onChange={(e) => setInfo({ ...info, campusLocation: e.target.value })} /></Field>
          <Field label="No. of Agents Managed"><Input disabled={locked} type="number" className={cn(inputCls, "tabular-nums")} value={info.agentsManaged} onChange={(e) => setInfo({ ...info, agentsManaged: e.target.value })} /></Field>
          <Field label="Clock-In Time"><Input disabled={locked} type="time" className={inputCls} value={info.clockIn} onChange={(e) => setInfo({ ...info, clockIn: e.target.value })} /></Field>
          <Field label="Clock-Out Time"><Input disabled={locked} type="time" className={inputCls} value={info.clockOut} onChange={(e) => setInfo({ ...info, clockOut: e.target.value })} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Team Attendance Summary">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Metric</TableHead>
                <TableHead className="w-24 text-[11px] text-slate-400">Count</TableHead>
                <TableHead className="text-[11px] text-slate-400">Names / Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ATTENDANCE_ROWS.map((r) => (
                <TableRow key={r.key} className="border-white/5">
                  <TableCell className="py-2 text-xs font-medium text-slate-200">{r.label}</TableCell>
                  <TableCell className="py-2">
                    <Input disabled={locked} type="number" className={cellNum} value={attendance[r.key]?.count || ""} onChange={(e) => setAttendance({ ...attendance, [r.key]: { ...attendance[r.key], count: e.target.value } })} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input disabled={locked} className={cellInput} value={attendance[r.key]?.details || ""} onChange={(e) => setAttendance({ ...attendance, [r.key]: { ...attendance[r.key], details: e.target.value } })} placeholder="names separated by commas" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Team Performance Summary (KPI Averages)" subtitle="Auto-filled from submitted agent reports where available — edit as needed">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">KPI</TableHead>
                <TableHead className="text-[11px] text-slate-400">Team Target</TableHead>
                <TableHead className="text-[11px] text-slate-400">Team Average</TableHead>
                <TableHead className="text-[11px] text-slate-400">Best Performer</TableHead>
                <TableHead className="text-[11px] text-slate-400">Lowest Performer</TableHead>
                <TableHead className="text-[11px] text-slate-400">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamKpis.map((k, i) => (
                <TableRow key={k.key} className="border-white/5">
                  <TableCell className="py-2 text-xs font-medium text-slate-200">{k.label}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} type="number" className={cellNum} value={k.teamTarget} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, teamTarget: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} type="number" className={cellNum} value={k.teamAvg} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, teamAvg: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellName} value={k.best} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, best: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellName} value={k.lowest} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, lowest: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={k.notes} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Coaching & Feedback Provided"
        actions={!locked && (
          <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-200" onClick={() => setCoaching([...coaching, blankCoaching()])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add row
          </Button>
        )}
      >
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Agent Name</TableHead>
                <TableHead className="text-[11px] text-slate-400">Type (Coaching / Warning / Kudos)</TableHead>
                <TableHead className="text-[11px] text-slate-400">Details</TableHead>
                {!locked && <TableHead className="w-10 text-[11px] text-slate-400"><span className="sr-only">Remove</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaching.map((c, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={c.agentName} onChange={(e) => setCoaching(coaching.map((x, j) => (j === i ? { ...x, agentName: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2 w-44">
                    <Select disabled={locked} value={c.type} onValueChange={(v) => setCoaching(coaching.map((x, j) => (j === i ? { ...x, type: v } : x)))}>
                      <SelectTrigger className={cellInput}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["Coaching", "Warning", "Kudos"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={c.details} onChange={(e) => setCoaching(coaching.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)))} /></TableCell>
                  {!locked && (
                    <TableCell className="py-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" title="Remove row" onClick={() => setCoaching(coaching.length > 1 ? coaching.filter((_, j) => j !== i) : [blankCoaching()])}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Quality Assurance Observations"><Textarea disabled={locked} rows={3} className={inputCls} value={qa} onChange={(e) => setQa(e.target.value)} /></SectionCard>

      <SectionCard
        title="Issues Escalated to Management"
        actions={!locked && (
          <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-200" onClick={() => setEscalated([...escalated, blankEscalated()])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add row
          </Button>
        )}
      >
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Issue Description</TableHead>
                <TableHead className="text-[11px] text-slate-400">Priority</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Action Required</TableHead>
                {!locked && <TableHead className="w-10 text-[11px] text-slate-400"><span className="sr-only">Remove</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {escalated.map((e, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={e.description} onChange={(ev) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2 w-28">
                    <Select disabled={locked} value={e.priority} onValueChange={(v) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, priority: v } : x)))}>
                      <SelectTrigger className={cellInput}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["High", "Med", "Low"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={e.status} onChange={(ev) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, status: ev.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={e.action} onChange={(ev) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, action: ev.target.value } : x)))} /></TableCell>
                  {!locked && (
                    <TableCell className="py-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" title="Remove row" onClick={() => setEscalated(escalated.length > 1 ? escalated.filter((_, j) => j !== i) : [blankEscalated()])}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Highlights"><Textarea disabled={locked} rows={3} className={inputCls} value={highlights} onChange={(e) => setHighlights(e.target.value)} /></SectionCard>
        <SectionCard title="Lowlights"><Textarea disabled={locked} rows={3} className={inputCls} value={lowlights} onChange={(e) => setLowlights(e.target.value)} /></SectionCard>
      </div>

      <SectionCard
        title="Action Plan for Next Day"
        subtitle="Add as many action items as you need — the six template rows are just a starting point"
        actions={!locked && (
          <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-200" onClick={() => setPlan([...plan, blankPlan()])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add action item
          </Button>
        )}
      >
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Action Item</TableHead>
                <TableHead className="text-[11px] text-slate-400">Owner / Responsible</TableHead>
                <TableHead className="text-[11px] text-slate-400">Priority</TableHead>
                <TableHead className="text-[11px] text-slate-400">Deadline</TableHead>
                {!locked && <TableHead className="w-10 text-[11px] text-slate-400"><span className="sr-only">Remove</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map((p, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={p.action} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className={cellInput} value={p.owner} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2 w-28">
                    <Select disabled={locked} value={p.priority} onValueChange={(v) => setPlan(plan.map((x, j) => (j === i ? { ...x, priority: v } : x)))}>
                      <SelectTrigger className={cellInput}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["High", "Med", "Low"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2"><Input disabled={locked} type="date" className={cellInput} value={p.deadline} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, deadline: e.target.value } : x)))} /></TableCell>
                  {!locked && (
                    <TableCell className="py-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" title="Remove row" onClick={() => setPlan(plan.length > 1 ? plan.filter((_, j) => j !== i) : [blankPlan()])}>
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
            <span>{plan.filter((p) => p.action).length} action item(s) planned</span>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5] hover:bg-white/10" onClick={() => setPlan([...plan, blankPlan()])}>
              <Plus className="mr-1 h-3 w-3" /> Add action plan row
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Supervisor's Own Activities" subtitle="Meetings, coaching, task allocation, reviews, escalations handled, client communications, admin work, decisions taken">
        <Textarea disabled={locked} rows={5} className={inputCls} value={ownActivities} onChange={(e) => setOwnActivities(e.target.value)} placeholder="e.g. 09:30 morning briefing; 11:00 coached agent on objection handling; reviewed 2 PRs…" />
      </SectionCard>

      <SectionCard title="Manager Review"><Textarea disabled={locked} rows={3} className={inputCls} value={managerReview} onChange={(e) => setManagerReview(e.target.value)} placeholder="Reserved for the BPO Manager's review comments" /></SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {reportId && (
          <Button variant="outline" className="k-btn-glass text-slate-200" onClick={() => onExport?.(reportId)}>
            <FileDown className="mr-2 h-4 w-4" /> Export Word
          </Button>
        )}
        <Button variant="outline" disabled={saving || status === "SUBMITTED"} onClick={() => save(false)} className="k-btn-glass text-slate-200"><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
        <Button disabled={saving} onClick={() => save(true)} className="k-btn-primary">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Supervisor Report
        </Button>
      </div>
    </div>
  );
}
