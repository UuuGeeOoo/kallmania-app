"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtDate, type ReportDTO, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge } from "@/components/kallmania/shared";
import { Save, Send, Loader2, RefreshCw, FileDown } from "lucide-react";

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

export default function SupervisorReportForm({ user, date, onExport }: { user: SessionUser; date: string; onExport?: (id: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState({ shiftTime: "", clockIn: "", clockOut: "", teamName: "", campusLocation: "", agentsManaged: "" });
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>(() => Object.fromEntries(ATTENDANCE_ROWS.map((r) => [r.key, { count: "", details: "" }])));
  const [teamKpis, setTeamKpis] = useState<TeamKpiRow[]>(() => TEAM_KPI_KEYS.map((k) => ({ key: k.key, label: k.label, teamTarget: "", teamAvg: "", best: "", lowest: "", notes: "" })));
  const [coaching, setCoaching] = useState<CoachingRow[]>(() => empty(5, () => ({ agentName: "", type: "", details: "" })));
  const [qa, setQa] = useState("");
  const [escalated, setEscalated] = useState<EscalatedRow[]>(() => empty(4, () => ({ description: "", priority: "", status: "", action: "" })));
  const [highlights, setHighlights] = useState("");
  const [lowlights, setLowlights] = useState("");
  const [plan, setPlan] = useState<PlanRow[]>(() => empty(5, () => ({ action: "", owner: "", priority: "", deadline: "" })));
  const [managerReview, setManagerReview] = useState("");
  const [ownActivities, setOwnActivities] = useState("");

  const load = async () => {
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

      if (existing) {
        setReportId(existing.id); setRef(existing.ref); setStatus(existing.status);
        setInfo({
          shiftTime: existing.shiftTime || "", clockIn: existing.clockIn || "", clockOut: existing.clockOut || "",
          teamName: existing.teamName || "", campusLocation: existing.campusLocation || "",
          agentsManaged: existing.agentsManaged !== null && existing.agentsManaged !== undefined ? String(existing.agentsManaged) : "",
        });
        const att = existing.attendanceSummary ? JSON.parse(existing.attendanceSummary) as Record<string, AttendanceRow> : {};
        setAttendance(Object.fromEntries(ATTENDANCE_ROWS.map((r) => [r.key, att[r.key] || { count: "", details: "" }])));
        const kpis = existing.teamKpiAverages ? JSON.parse(existing.teamKpiAverages) as TeamKpiRow[] : [];
        setTeamKpis(TEAM_KPI_KEYS.map((k) => {
          const found = kpis.find((x) => x.key === k.key);
          return found ? { ...found, label: k.label } : { key: k.key, label: k.label, teamTarget: "", teamAvg: "", best: "", lowest: "", notes: "" };
        }));
        setCoaching(existing.coachingEntries ? (JSON.parse(existing.coachingEntries) as CoachingRow[]) : empty(5, () => ({ agentName: "", type: "", details: "" })));
        setQa(existing.qaObservations || "");
        setEscalated(existing.escalatedIssues ? (JSON.parse(existing.escalatedIssues) as EscalatedRow[]) : empty(4, () => ({ description: "", priority: "", status: "", action: "" })));
        setHighlights(existing.highlights || "");
        setLowlights(existing.lowlights || "");
        setPlan(existing.actionPlan ? (JSON.parse(existing.actionPlan) as PlanRow[]) : empty(5, () => ({ action: "", owner: "", priority: "", deadline: "" })));
        setManagerReview(existing.managerReview || "");
        setOwnActivities(existing.additionalActivities || "");
      } else {
        setReportId(null); setRef(null); setStatus("DRAFT");
        if (bpo?.teamKpiRows) {
          setTeamKpis(TEAM_KPI_KEYS.map((k) => {
            const auto = bpo.teamKpiRows!.find((x) => x.key === k.key);
            return {
              key: k.key, label: k.label,
              teamTarget: auto?.teamTarget !== null && auto?.teamTarget !== undefined ? String(auto.teamTarget) : "",
              teamAvg: auto?.teamAvg !== null && auto?.teamAvg !== undefined ? String(auto.teamAvg) : "",
              best: auto?.best || "", lowest: auto?.lowest || "", notes: "",
            };
          }));
        } else {
          setTeamKpis(TEAM_KPI_KEYS.map((k) => ({ key: k.key, label: k.label, teamTarget: "", teamAvg: "", best: "", lowest: "", notes: "" })));
        }
        setCoaching(empty(5, () => ({ agentName: "", type: "", details: "" })));
        setEscalated(empty(4, () => ({ description: "", priority: "", status: "", action: "" })));
        setPlan(empty(5, () => ({ action: "", owner: "", priority: "", deadline: "" })));
        setInfo({ shiftTime: "", clockIn: "", clockOut: "", teamName: "", campusLocation: "", agentsManaged: "" });
        setAttendance(Object.fromEntries(ATTENDANCE_ROWS.map((r) => [r.key, { count: "", details: "" }])));
        setQa(""); setHighlights(""); setLowlights(""); setManagerReview(""); setOwnActivities("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();   }, [date, user.id]);

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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const locked = false; // supervisor can always edit their own report

  return (
    <div className="space-y-5">
      {ref && <div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-mono font-semibold text-[#b3a5ff]">{ref}</span><StatusBadge status={status} /></div>}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

      <SectionCard title="Supervisor's Information" subtitle="DAILY REPORT — BPO SUPERVISOR" actions={
        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/10" onClick={load} title="Re-pull team aggregates from submitted agent reports">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync team data
        </Button>
      }>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Supervisor Name"><Input readOnly disabled className={inputCls} value={user.fullName} /></Field>
          <Field label="Date"><Input readOnly disabled className={inputCls} value={fmtDate(date)} /></Field>
          <Field label="Team Name"><Input disabled={locked} className={inputCls} value={info.teamName} onChange={(e) => setInfo({ ...info, teamName: e.target.value })} /></Field>
          <Field label="Shift Time"><Input disabled={locked} className={inputCls} value={info.shiftTime} onChange={(e) => setInfo({ ...info, shiftTime: e.target.value })} /></Field>
          <Field label="Campus / Location"><Input disabled={locked} className={inputCls} value={info.campusLocation} onChange={(e) => setInfo({ ...info, campusLocation: e.target.value })} /></Field>
          <Field label="No. of Agents Managed"><Input disabled={locked} type="number" className={`${inputCls} tabular-nums`} value={info.agentsManaged} onChange={(e) => setInfo({ ...info, agentsManaged: e.target.value })} /></Field>
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
                    <Input disabled={locked} type="number" className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100" value={attendance[r.key]?.count || ""} onChange={(e) => setAttendance({ ...attendance, [r.key]: { ...attendance[r.key], count: e.target.value } })} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={attendance[r.key]?.details || ""} onChange={(e) => setAttendance({ ...attendance, [r.key]: { ...attendance[r.key], details: e.target.value } })} placeholder="names separated by commas" />
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
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 w-20 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100" value={k.teamTarget} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, teamTarget: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 w-20 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100" value={k.teamAvg} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, teamAvg: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 w-32 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={k.best} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, best: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 w-32 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={k.lowest} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, lowest: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={k.notes} onChange={(e) => setTeamKpis(teamKpis.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Coaching & Feedback Provided">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Agent Name</TableHead>
                <TableHead className="text-[11px] text-slate-400">Type (Coaching / Warning / Kudos)</TableHead>
                <TableHead className="text-[11px] text-slate-400">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaching.map((c, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={c.agentName} onChange={(e) => setCoaching(coaching.map((x, j) => (j === i ? { ...x, agentName: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2 w-40">
                    <Select disabled={locked} value={c.type} onValueChange={(v) => setCoaching(coaching.map((x, j) => (j === i ? { ...x, type: v } : x)))}>
                      <SelectTrigger className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["Coaching", "Warning", "Kudos"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={c.details} onChange={(e) => setCoaching(coaching.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)))} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Quality Assurance Observations"><Textarea disabled={locked} rows={3} className={inputCls} value={qa} onChange={(e) => setQa(e.target.value)} /></SectionCard>

      <SectionCard title="Issues Escalated to Management">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Issue Description</TableHead>
                <TableHead className="text-[11px] text-slate-400">Priority</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Action Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escalated.map((e, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={e.description} onChange={(ev) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2 w-28">
                    <Select disabled={locked} value={e.priority} onValueChange={(v) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, priority: v } : x)))}>
                      <SelectTrigger className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["High", "Med", "Low"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={e.status} onChange={(ev) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, status: ev.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={e.action} onChange={(ev) => setEscalated(escalated.map((x, j) => (j === i ? { ...x, action: ev.target.value } : x)))} /></TableCell>
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

      <SectionCard title="Action Plan for Next Day">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                <TableHead className="text-[11px] text-slate-400">Action Item</TableHead>
                <TableHead className="text-[11px] text-slate-400">Owner / Responsible</TableHead>
                <TableHead className="text-[11px] text-slate-400">Priority</TableHead>
                <TableHead className="text-[11px] text-slate-400">Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map((p, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={p.action} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2"><Input disabled={locked} className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={p.owner} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)))} /></TableCell>
                  <TableCell className="py-2 w-28">
                    <Select disabled={locked} value={p.priority} onValueChange={(v) => setPlan(plan.map((x, j) => (j === i ? { ...x, priority: v } : x)))}>
                      <SelectTrigger className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["High", "Med", "Low"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2"><Input disabled={locked} type="date" className="h-8 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100" value={p.deadline} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, deadline: e.target.value } : x)))} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Supervisor's Own Activities" subtitle="Meetings, coaching, task allocation, reviews, escalations handled, client communications, admin work, decisions taken">
        <Textarea disabled={locked} rows={5} className={inputCls} value={ownActivities} onChange={(e) => setOwnActivities(e.target.value)} placeholder="e.g. 09:30 morning briefing; 11:00 coached agent on objection handling; reviewed 2 PRs…" />
      </SectionCard>

      <SectionCard title="Manager Review"><Textarea disabled={locked} rows={3} className={inputCls} value={managerReview} onChange={(e) => setManagerReview(e.target.value)} placeholder="Reserved for the BPO Manager's review comments" /></SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {reportId && (
          <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => onExport?.(reportId)}>
            <FileDown className="mr-2 h-4 w-4" /> Export Word
          </Button>
        )}
        <Button variant="outline" disabled={saving} onClick={() => save(false)} className="border-slate-600 text-slate-200 hover:bg-white/10"><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
        <Button disabled={saving} onClick={() => save(true)} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Supervisor Report
        </Button>
      </div>
    </div>
  );
}
