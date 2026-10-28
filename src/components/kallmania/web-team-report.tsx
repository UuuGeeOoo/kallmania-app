"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtDate, type ReportDTO, type SessionUser } from "@/lib/client";
import { PageHeader, ReportStateBanner, ReportSubmitActions } from "@/components/kallmania/shared";
import { Loader2, FileText, CalendarClock } from "lucide-react";

/**
 * Web Development and Technical Team Report — EXACT replica of the attached
 * "Web Development and Technical Team Report.docx":
 *   ▸ STAFF INFORMATION  ▸ KEY PERFORMANCE METRICS (KPIs)  ▸ TASKS ASSIGNED &
 *   COMPLETED  ▸ CHALLENGES / BLOCKERS  ▸ ESCALATIONS  ▸ SUPERVISOR COMMENTS
 * Submits into the same TECH report pipeline so dashboards keep aggregating.
 */

const WEB_KPI_ROWS: { key: string; label: string; unit: "count" | "percent" | "minutes" }[] = [
  { key: "ticketsAssigned", label: "Tickets / Tasks Assigned", unit: "count" },
  { key: "ticketsCompleted", label: "Tickets / Tasks Completed", unit: "count" },
  { key: "bugsReported", label: "Bugs Reported", unit: "count" },
  { key: "bugsResolved", label: "Bugs Resolved", unit: "count" },
  { key: "pagesSitesUpdated", label: "Pages / Sites Updated", unit: "count" },
  { key: "websiteUptime", label: "Website Uptime (%)", unit: "percent" },
  { key: "avgResponseHours", label: "Avg. Response Time to Tickets (hrs)", unit: "count" },
  { key: "codeReviewsDone", label: "Code Reviews Completed", unit: "count" },
  { key: "deploymentsMade", label: "Deployments Made", unit: "count" },
];

const WEB_TASK_STATUSES = ["Completed", "In Progress", "Not Started", "Under Review", "Blocked", "Pending Deployment", "Awaiting Approval", "Not Completed"];
const WEB_TASK_ROWS = 7;

interface WebTaskRow { task: string; project: string; status: string; deliverable: string }

const blankTasks = (): WebTaskRow[] => Array.from({ length: WEB_TASK_ROWS }, () => ({ task: "", project: "", status: "", deliverable: "" }));

export default function WebTeamReportForm({ user, date }: { user: SessionUser; date: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  // Correction mode: SUBMITTED reports are read-only until "Make Correction";
  // saving corrections keeps the report awaiting approval (never resubmitted).
  const [correcting, setCorrecting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [info, setInfo] = useState({ staffName: user.fullName, role: "", shiftTime: "", clockIn: "", clockOut: "", attendanceStatus: "Present", lateness: "" });
  const [kpis, setKpis] = useState(() => WEB_KPI_ROWS.map((d) => ({ key: d.key, label: d.label, unit: d.unit, target: "", actual: "", variance: "", notes: "" })));
  const [tasks, setTasks] = useState<WebTaskRow[]>(blankTasks);
  const [challenges, setChallenges] = useState("");
  const [escalations, setEscalations] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  // ── reporting-date guard: keep unsaved entries when the date changes ──
  const loadIdRef = useRef(0);
  const snapshotRef = useRef("{}");
  const dateRef = useRef(date);
  const mountedRef = useRef(false);
  const [dateKept, setDateKept] = useState<string | null>(null);

  const blankKpis = () => WEB_KPI_ROWS.map((d) => ({ key: d.key, label: d.label, unit: d.unit, target: "", actual: "", variance: "", notes: "" }));

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { reports } = await api<{ reports: ReportDTO[] }>(`/api/reports?mine=1`);
      const existing = reports.find((r) => r.type === "TECH" && new Date(r.reportDate).toISOString().slice(0, 10) === date);
      if (loadId !== loadIdRef.current) return;
      const builtKpis = (() => {
        if (!existing) return blankKpis();
        const rows = (() => { try { return JSON.parse(existing.kpiMetrics || "[]") as { key: string; target: number | null; actual: number | null; variance: number | null; notes?: string }[]; } catch { return []; } })();
        return WEB_KPI_ROWS.map((d) => {
          const hit = rows.find((r) => r.key === d.key);
          return {
            key: d.key, label: d.label, unit: d.unit,
            target: hit?.target !== null && hit?.target !== undefined ? String(hit.target) : "",
            actual: hit?.actual !== null && hit?.actual !== undefined ? String(hit.actual) : "",
            variance: hit?.variance !== null && hit?.variance !== undefined ? String(hit.variance) : "",
            notes: hit?.notes || "",
          };
        });
      })();
      const builtTasks = (() => {
        if (!existing) return blankTasks();
        let entries: Record<string, string>[] = [];
        try { entries = JSON.parse(existing.workEntries || "[]"); } catch {}
        return blankTasks().map((row, i) => ({
          task: entries[i]?.task || "",
          project: entries[i]?.project || "",
          status: entries[i]?.status || "",
          deliverable: entries[i]?.deliverable || "",
        }));
      })();
      const builtChallenges = existing?.challenges || "";
      const builtEscalations = existing?.escalations || "";
      const payload = (() => { if (!existing) return {} as Record<string, string>; try { return JSON.parse(existing.payload || "{}") as Record<string, string>; } catch { return {} as Record<string, string>; } })();
      const builtInfo = existing ? {
        staffName: payload.staffName || user.fullName,
        role: payload.role || "",
        shiftTime: existing.shiftTime || "",
        clockIn: existing.clockIn || "",
        clockOut: existing.clockOut || "",
        attendanceStatus: existing.attendanceStatus || "Present",
        lateness: existing.latenessMins !== null && existing.latenessMins !== undefined ? String(existing.latenessMins) : "",
      } : { staffName: user.fullName, role: "", shiftTime: "", clockIn: "", clockOut: "", attendanceStatus: "Present", lateness: "" };
      const builtSupervisor = payload.supervisorName || "";
      const builtSignature = payload.signatureDate || "";
      setKpis(builtKpis);
      setTasks(builtTasks);
      setChallenges(builtChallenges);
      setEscalations(builtEscalations);
      setInfo(builtInfo);
      setSupervisorName(builtSupervisor);
      setSignatureDate(builtSignature);
      if (existing) {
        setReportId(existing.id);
        setRef(existing.ref);
        setStatus(existing.status);
        setFeedback(existing.supervisorFeedback || null);
      } else {
        setReportId(null); setRef(null); setStatus("DRAFT"); setFeedback(null);
      }
      setCorrecting(false);
      // baseline for the reporting-date guard — anything typed after this counts as unsaved
      snapshotRef.current = JSON.stringify({ info: builtInfo, kpis: builtKpis, tasks: builtTasks, challenges: builtChallenges, escalations: builtEscalations, supervisorName: builtSupervisor, signatureDate: builtSignature });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (loadId === loadIdRef.current) setLoading(false);
    }
  }, [date, user.fullName, user.id]);

  // Initial load only — date changes go through the guard below.
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Reporting-date guard: unsaved entries are kept; a clean form loads the saved date.
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; dateRef.current = date; return; }
    if (date === dateRef.current) return;
    dateRef.current = date;
    const current = JSON.stringify({ info, kpis, tasks, challenges, escalations, supervisorName, signatureDate });
    if (current !== snapshotRef.current) {
      setDateKept(date);
      return;
    }
    setDateKept(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const locked = status === "APPROVED" || (status === "SUBMITTED" && !correcting);

  const save = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const kpiMetrics = kpis.map((k) => ({
        key: k.key,
        label: k.label,
        target: k.target === "" ? null : parseFloat(k.target),
        actual: k.actual === "" ? null : parseFloat(k.actual),
        variance: k.variance === "" ? null : parseFloat(k.variance),
        unit: k.unit,
        category: "TECH_TEMPLATE",
        auto: false,
        notes: k.notes,
      }));
      // Derive metricsSummary so supervisor dashboards keep aggregating the web team
      const num = (key: string) => {
        const v = kpis.find((k) => k.key === key)?.actual;
        return v !== "" && v !== undefined && !Number.isNaN(parseFloat(v)) ? parseFloat(v) : undefined;
      };
      const ms: Record<string, number> = {};
      if (num("ticketsCompleted") !== undefined) ms.tasksCompleted = num("ticketsCompleted")!;
      if (num("bugsReported") !== undefined) ms.bugsReported = num("bugsReported")!;
      if (num("bugsResolved") !== undefined) ms.bugsResolved = num("bugsResolved")!;
      if (num("pagesSitesUpdated") !== undefined) ms.pagesSitesUpdated = num("pagesSitesUpdated")!;
      if (num("websiteUptime") !== undefined) ms.websiteUptime = num("websiteUptime")!;
      if (num("avgResponseHours") !== undefined) ms.avgResponseHours = num("avgResponseHours")!;
      if (num("codeReviewsDone") !== undefined) ms.codeReviewsDone = num("codeReviewsDone")!;
      if (num("deploymentsMade") !== undefined) ms.deploymentsCompleted = num("deploymentsMade")!;

      const body: Record<string, unknown> = {
        type: "TECH",
        reportDate: date,
        department: user.department,
        submit,
        shiftTime: info.shiftTime,
        clockIn: info.clockIn,
        clockOut: info.clockOut,
        attendanceStatus: info.attendanceStatus,
        latenessMins: info.lateness === "" ? null : info.lateness,
        teamName: info.role,
        kpiMetrics,
        metricsSummary: ms,
        workEntries: tasks.filter((t) => Object.values(t).some((v) => v && String(v).trim() !== "")),
        challenges,
        escalations,
        payload: JSON.stringify({ staffName: info.staffName, role: info.role, supervisorName, signatureDate }),
      };
      if (reportId) body.id = reportId;
      const { report } = await api<{ report: ReportDTO }>("/api/reports", { method: "POST", body: JSON.stringify(body) });
      setReportId(report.id);
      setRef(report.ref);
      setStatus(report.status);
      setCorrecting(false);
      setFeedback(report.supervisorFeedback || null);
      snapshotRef.current = JSON.stringify({ info, kpis, tasks, challenges, escalations, supervisorName, signatureDate });
      setDateKept(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const infoCell = "h-9 w-full border-b border-dashed border-white/20 bg-transparent px-2 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-none disabled:opacity-60";

  return (
    <div>
      <PageHeader
        title="Web Development and Technical Team Report"
        subtitle="Daily report — exact replica of the official SBTS Group document"
        actions={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">{fmtDate(date)}</span>}
      />
      {dateKept && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" /> Reporting date changed to {dateKept} — your entries were kept and will be saved under this date.
        </div>
      )}
      {status === "SUBMITTED" && <div className="mb-4"><ReportStateBanner status="SUBMITTED" ref={ref || ""} /></div>}
      {status === "APPROVED" && <div className="mb-4"><ReportStateBanner status="APPROVED" ref={ref || ""} reviewer={feedback ? undefined : undefined} /></div>}
      {status === "REJECTED" && <div className="mb-4"><ReportStateBanner status="REJECTED" ref={ref || ""} feedback={feedback} /></div>}

      <div className="k-card space-y-6 p-6">
        {/* Document header — exact replica */}
        <div className="overflow-hidden rounded-xl border border-white/12">
          <div className="bg-white/[0.04] px-4 py-3 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-100">DAILY REPORT — BPO WEB TEAM (DEVELOPERS / WEBSITE MANAGEMENT/DESIGNERS/TECHNICAL MANAGEMENT)</p>
            <p className="mt-1 text-xs font-semibold text-[#eda06a]">SBTS Group Global — ICBM BPO Division</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {/* ▸ STAFF INFORMATION */}
            <section>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#f0b285]">▸ STAFF INFORMATION</p>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Staff Name</span><Input disabled className={infoCell} value={info.staffName} onChange={(e) => setInfo({ ...info, staffName: e.target.value })} /></label>
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Date</span><Input disabled className={infoCell} value={fmtDate(date)} /></label>
                </div>
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Role / Designation</span><Input disabled={locked} className={infoCell} value={info.role} onChange={(e) => setInfo({ ...info, role: e.target.value })} placeholder="e.g. Frontend Developer" /></label>
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Shift Time</span><Input disabled={locked} className={infoCell} value={info.shiftTime} onChange={(e) => setInfo({ ...info, shiftTime: e.target.value })} placeholder="e.g. 08:00 – 17:00" /></label>
                </div>
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Clock-In Time</span><Input disabled={locked} type="time" className={infoCell} value={info.clockIn} onChange={(e) => setInfo({ ...info, clockIn: e.target.value })} /></label>
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Clock-Out Time</span><Input disabled={locked} type="time" className={infoCell} value={info.clockOut} onChange={(e) => setInfo({ ...info, clockOut: e.target.value })} /></label>
                </div>
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Attendance Status</span>
                    <Select value={info.attendanceStatus} onValueChange={(v) => setInfo({ ...info, attendanceStatus: v })} disabled={locked}>
                      <SelectTrigger className="h-9 border-b border-dashed border-white/20 bg-transparent text-sm text-slate-100"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Present">Present</SelectItem><SelectItem value="Absent">Absent</SelectItem><SelectItem value="Late">Late</SelectItem></SelectContent>
                    </Select>
                  </label>
                  <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Lateness (mins)</span><Input disabled={locked} type="number" className={infoCell} value={info.lateness} onChange={(e) => setInfo({ ...info, lateness: e.target.value })} placeholder="0" /></label>
                </div>
              </div>
            </section>

            {/* ▸ KEY PERFORMANCE METRICS (KPIs) */}
            <section>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#f0b285]">▸ KEY PERFORMANCE METRICS (KPIs)</p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-white/[0.03]">
                      <TableHead className="text-[11px] text-slate-400">KPI</TableHead>
                      <TableHead className="w-24 text-[11px] text-slate-400">Target</TableHead>
                      <TableHead className="w-24 text-[11px] text-slate-400">Actual</TableHead>
                      <TableHead className="w-24 text-[11px] text-slate-400">Variance</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.map((k, idx) => (
                      <TableRow key={k.key} className="border-white/5">
                        <TableCell className="py-1.5 text-xs font-medium text-slate-200">{k.label}</TableCell>
                        {(["target", "actual", "variance"] as const).map((f) => (
                          <TableCell key={f} className="py-1.5">
                            <Input
                              disabled={locked}
                              type="number"
                              step="any"
                              className="h-8 border-white/12 bg-white/[0.04] text-xs tabular-nums text-slate-100"
                              value={k[f]}
                              onChange={(e) => setKpis((prev) => prev.map((row, i) => (i === idx ? { ...row, [f]: e.target.value } : row)))}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="py-1.5">
                          <Input
                            disabled={locked}
                            className="h-8 border-white/12 bg-white/[0.04] text-xs text-slate-100"
                            value={k.notes}
                            onChange={(e) => setKpis((prev) => prev.map((row, i) => (i === idx ? { ...row, notes: e.target.value } : row)))}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* ▸ TASKS ASSIGNED & COMPLETED */}
            <section>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#f0b285]">▸ TASKS ASSIGNED &amp; COMPLETED</p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-white/[0.03]">
                      <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Task / Ticket Description</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Client / Project</TableHead>
                      <TableHead className="w-40 text-[11px] text-slate-400">Status</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Output / Deliverable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t, idx) => (
                      <TableRow key={idx} className="border-white/5">
                        <TableCell className="py-1.5 text-center text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="py-1.5"><Input disabled={locked} className="h-8 border-white/12 bg-white/[0.04] text-xs text-slate-100" value={t.task} onChange={(e) => setTasks((prev) => prev.map((row, i) => (i === idx ? { ...row, task: e.target.value } : row)))} /></TableCell>
                        <TableCell className="py-1.5"><Input disabled={locked} className="h-8 border-white/12 bg-white/[0.04] text-xs text-slate-100" value={t.project} onChange={(e) => setTasks((prev) => prev.map((row, i) => (i === idx ? { ...row, project: e.target.value } : row)))} /></TableCell>
                        <TableCell className="py-1.5">
                          <Select value={t.status || undefined} onValueChange={(v) => setTasks((prev) => prev.map((row, i) => (i === idx ? { ...row, status: v } : row)))} disabled={locked}>
                            <SelectTrigger className="h-8 border-white/12 bg-white/[0.04] text-xs text-slate-100"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>{WEB_TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5"><Input disabled={locked} className="h-8 border-white/12 bg-white/[0.04] text-xs text-slate-100" value={t.deliverable} onChange={(e) => setTasks((prev) => prev.map((row, i) => (i === idx ? { ...row, deliverable: e.target.value } : row)))} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* ▸ CHALLENGES / BLOCKERS */}
            <section>
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#f0b285]">▸ CHALLENGES / BLOCKERS</p>
              <Textarea rows={3} disabled={locked} className="border-white/12 bg-white/[0.04] text-sm text-slate-100" value={challenges} onChange={(e) => setChallenges(e.target.value)} />
            </section>

            {/* ▸ ESCALATIONS */}
            <section>
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#f0b285]">▸ ESCALATIONS</p>
              <Textarea rows={2} disabled={locked} className="border-white/12 bg-white/[0.04] text-sm text-slate-100" value={escalations} onChange={(e) => setEscalations(e.target.value)} />
            </section>

            {/* ▸ SUPERVISOR COMMENTS */}
            <section>
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#f0b285]">▸ SUPERVISOR COMMENTS</p>
              {feedback ? (
                <p className="whitespace-pre-wrap rounded-lg border border-white/12 bg-white/[0.04] p-3 text-sm text-slate-200">{feedback}</p>
              ) : (
                <Textarea rows={3} disabled className="border-white/12 bg-white/[0.02] text-sm text-slate-500" placeholder="Reserved for your supervisor's review" />
              )}
              <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Supervisor Name</span><Input disabled={locked} className={infoCell} value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-[11px] font-medium text-slate-500">Signature / Date</span><Input disabled={locked} className={infoCell} value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} placeholder="e.g. J. Adamson — 21/10/2026" /></label>
              </div>
            </section>

            {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

            <ReportSubmitActions
              status={status}
              correcting={correcting}
              saving={saving}
              onCorrect={() => setCorrecting(true)}
              onCancelCorrect={() => { setCorrecting(false); load(); }}
              onSaveDraft={() => save(false)}
              onSubmit={() => save(true)}
            />

            <p className="text-center text-[10px] uppercase tracking-widest text-slate-600">Confidential — For Internal Use Only</p>
          </>
        )}
      </div>
    </div>
  );
}
