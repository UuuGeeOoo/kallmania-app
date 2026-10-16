"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, fmtDate, fmtDateTime, REPORT_TYPE_LABELS, DEPT_LABELS, type ReportDTO, type KpiMetric, type SessionUser } from "@/lib/client";
import { PageHeader, EmptyState, StatusBadge, SectionCard, inputCls } from "@/components/kallmania/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Loader2, CheckCircle2, Undo2, FileDown, FileSpreadsheet, FileText, ClipboardCheck } from "lucide-react";

function parseKpis(r: ReportDTO): KpiMetric[] {
  try { return r.kpiMetrics ? JSON.parse(r.kpiMetrics) : []; } catch { return []; }
}

export function ReportDetailDialog({ report, open, onClose }: { report: ReportDTO | null; open: boolean; onClose: () => void }) {
  if (!report) return null;
  const kpis = parseKpis(report);
  const core = kpis.filter((k) => k.category !== "EMAIL_EXTENSION");
  const email = kpis.filter((k) => k.category === "EMAIL_EXTENSION");
  let logs: { leadName?: string; disposition?: string; followUp?: string; notes?: string }[] = [];
  try { logs = report.callLogs ? JSON.parse(report.callLogs) : []; } catch {}

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#131f30]/95 text-slate-100 backdrop-blur-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3 text-white">
            <span className="font-mono text-[#b3a5ff]">{report.ref}</span>
            <StatusBadge status={report.status} />
            <span className="text-xs font-normal text-slate-400">{REPORT_TYPE_LABELS[report.type]}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 p-3 text-xs sm:grid-cols-4">
            <div><p className="text-slate-500">Employee</p><p className="mt-0.5 font-medium text-slate-200">{report.user?.fullName}</p></div>
            <div><p className="text-slate-500">Date</p><p className="mt-0.5 font-medium text-slate-200">{fmtDate(report.reportDate)}</p></div>
            <div><p className="text-slate-500">Department</p><p className="mt-0.5 font-medium text-slate-200">{DEPT_LABELS[report.department] || report.department}</p></div>
            <div><p className="text-slate-500">Source</p><p className="mt-0.5 font-medium text-slate-200">{report.sourceType === "UPLOAD_EXTRACTED" ? "Uploaded document" : "Manual entry"}</p></div>
            <div><p className="text-slate-500">Verification</p><p className="mt-0.5 font-medium text-slate-200">{report.verificationStatus.replace(/_/g, " ")}</p></div>
            <div><p className="text-slate-500">Attendance</p><p className="mt-0.5 font-medium text-slate-200">{report.attendanceStatus || "—"}{report.latenessMins ? ` (${report.latenessMins}m late)` : ""}</p></div>
            <div><p className="text-slate-500">Shift</p><p className="mt-0.5 font-medium text-slate-200">{report.shiftTime || "—"}</p></div>
            <div><p className="text-slate-500">Clock in/out</p><p className="mt-0.5 font-medium text-slate-200">{report.clockIn || "—"} / {report.clockOut || "—"}</p></div>
          </div>

          {kpis.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ Key Performance Metrics</p>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-white/[0.03]">
                      <TableHead className="text-[11px] text-slate-400">KPI</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Target</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Actual</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Variance</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {core.map((m) => (
                      <TableRow key={m.key} className="border-white/5">
                        <TableCell className="py-2 text-xs text-slate-200">{m.label}</TableCell>
                        <TableCell className="py-2 text-xs tabular-nums text-slate-400">{m.targetLabel}</TableCell>
                        <TableCell className="py-2 text-xs font-semibold tabular-nums text-slate-100">{m.actual ?? "—"}</TableCell>
                        <TableCell className={`py-2 text-xs font-semibold tabular-nums ${m.variance === null ? "text-slate-600" : m.variance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{m.variance ?? "—"}</TableCell>
                        <TableCell className="py-2 text-xs text-slate-400">{m.notes || ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {email.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase text-[#8b7ff5]">Email activity metrics ({email.filter((m) => m.actual !== null).length} filled)</summary>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {email.map((m) => (
                      <div key={m.key} className="rounded border border-white/10 px-2 py-1.5 text-[11px]">
                        <p className="truncate text-slate-500">{m.label}</p>
                        <p className="font-semibold text-slate-200">{m.actual ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {logs.some((l) => l.leadName) && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ Call Log Summary</p>
              <div className="space-y-1">
                {logs.filter((l) => l.leadName).map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-xs">
                    <span className="font-medium text-slate-200">{l.leadName}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">{l.disposition || "—"}</span>
                    {l.followUp === "Yes" && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">follow-up</span>}
                    <span className="ml-auto text-slate-500">{l.notes}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.challenges && (<div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Challenges / Blockers</p><p className="whitespace-pre-wrap rounded-lg border border-white/10 p-3 text-xs text-slate-300">{report.challenges}</p></div>)}
          {report.escalations && (<div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Escalations</p><p className="whitespace-pre-wrap rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">{report.escalations}</p></div>)}
          {report.additionalActivities && (<div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Additional Activities</p><p className="whitespace-pre-wrap rounded-lg border border-white/10 p-3 text-xs text-slate-300">{report.additionalActivities}</p></div>)}
          {report.supervisorFeedback && (<div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Supervisor Feedback</p><p className="whitespace-pre-wrap rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">{report.supervisorFeedback}</p></div>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── MY REPORTS (employee) ───────────────────

export function MyReportsView({ user }: { user: SessionUser }) {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportDTO | null>(null);

  useEffect(() => {
    api<{ reports: ReportDTO[] }>("/api/reports?mine=1").then(({ reports }) => setReports(reports)).finally(() => setLoading(false));
  }, []);

  const download = (id: string, format: string) => {
    window.open(`/api/export?format=${format}&id=${id}`, "_blank");
  };

  return (
    <div>
      <PageHeader title="My Reports" subtitle="Submission history, review status and exports" />
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title="No reports yet" hint="Submit your first daily report from the Daily Report page." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Ref</TableHead>
                <TableHead className="text-[11px] text-slate-400">Type</TableHead>
                <TableHead className="text-[11px] text-slate-400">Date</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Source</TableHead>
                <TableHead className="text-[11px] text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} className="border-white/5">
                  <TableCell className="py-2.5 font-mono text-xs text-[#b3a5ff]">{r.ref}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-300">{REPORT_TYPE_LABELS[r.type]}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-400">{fmtDate(r.reportDate)}</TableCell>
                  <TableCell className="py-2.5"><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="py-2.5 text-[11px] text-slate-500">{r.sourceType === "UPLOAD_EXTRACTED" ? "Upload" : "Manual"}</TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-100" onClick={() => setSelected(r)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#8b7ff5]" onClick={() => download(r.id, "docx")} title="Export Word"><FileText className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-300" onClick={() => download(r.id, "xlsx")} title="Export Excel"><FileSpreadsheet className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-300" onClick={() => download(r.id, "csv")} title="Export CSV"><FileDown className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ReportDetailDialog report={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─────────────────── REVIEW QUEUE (supervisor) ───────────────────

export function ReviewView({ user, focusReportId }: { user: SessionUser; focusReportId?: string | null }) {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportDTO | null>(null);
  const [feedback, setFeedback] = useState("");
  const [working, setWorking] = useState(false);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");

  const load = async () => {
    setLoading(true);
    try {
      const { reports } = await api<{ reports: ReportDTO[] }>("/api/reports");
      setReports(reports);
      if (focusReportId) {
        const focus = reports.find((r) => r.id === focusReportId);
        if (focus) setSelected(focus);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load();   }, [focusReportId]);

  const review = async (id: string, decision: "approve" | "reject") => {
    setWorking(true);
    try {
      await api("/api/reports", { method: "PATCH", body: JSON.stringify({ id, decision, feedback }) });
      setSelected(null);
      setFeedback("");
      load();
    } finally {
      setWorking(false);
    }
  };

  const download = (id: string, format: string) => window.open(`/api/export?format=${format}&id=${id}`, "_blank");

  const filtered = reports.filter((r) => (statusFilter === "ALL" ? true : r.status === statusFilter));

  return (
    <div>
      <PageHeader
        title="Review Reports"
        subtitle="Inspect submitted reports, compare with uploads, approve or return for correction"
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 border-white/12 bg-white/[0.055] text-xs text-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>{["SUBMITTED", "APPROVED", "REJECTED", "DRAFT", "ALL"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        }
      />
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title={`No ${statusFilter === "ALL" ? "" : statusFilter.toLowerCase()} reports`} hint="Reports submitted by employees will appear here for review." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="k-card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[#b3a5ff]">{r.ref}</span>
                  <StatusBadge status={r.status} />
                  {r.escalations && <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">ESCALATION</span>}
                </div>
                <p className="mt-1 text-xs text-slate-300">{r.user?.fullName} · {REPORT_TYPE_LABELS[r.type]} · {fmtDate(r.reportDate)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {r.sourceType === "UPLOAD_EXTRACTED" ? "Uploaded document → extracted → confirmed by employee" : "Manually entered"} · {r.verificationStatus.replace(/_/g, " ")} · updated {fmtDateTime(r.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.sourceFileId && (
                  <Button size="sm" variant="outline" className="border-slate-600 text-xs text-slate-300 hover:bg-white/10" onClick={() => window.open(`/api/uploads/file?id=${r.sourceFileId}`, "_blank")}>
                    <FileText className="mr-1 h-3.5 w-3.5" /> Source doc
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-slate-600 text-xs text-slate-300 hover:bg-white/10" onClick={() => setSelected(r)}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Inspect
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-[#8b7ff5]" onClick={() => download(r.id, "docx")} title="Download Word">
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-300" onClick={() => download(r.id, "xlsx")} title="Download Excel">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-300" onClick={() => download(r.id, "csv")} title="Download CSV">
                  <FileDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#131f30]/95 text-slate-100 backdrop-blur-2xl sm:max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-3 text-white">{selected?.ref} <StatusBadge status={selected?.status || ""} /></DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <ReportSummary report={selected} />
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-3">
                <p className="mr-auto text-xs font-semibold text-slate-300">Download this report (stored online)</p>
                <Button size="sm" variant="outline" className="border-slate-600 text-xs text-slate-300" onClick={() => download(selected.id, "docx")}>
                  <FileText className="mr-1 h-3.5 w-3.5" /> Word
                </Button>
                <Button size="sm" variant="outline" className="border-slate-600 text-xs text-slate-300" onClick={() => download(selected.id, "xlsx")}>
                  <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" className="border-slate-600 text-xs text-slate-300" onClick={() => download(selected.id, "csv")}>
                  <FileDown className="mr-1 h-3.5 w-3.5" /> CSV
                </Button>
              </div>
              {selected.sourceFileId && (
                <div className="rounded-lg border border-white/10 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-300">Original uploaded document</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-slate-600 text-xs text-slate-300" onClick={() => window.open(`/api/uploads/file?id=${selected.sourceFileId}`, "_blank")}>
                      <FileText className="mr-1 h-3.5 w-3.5" /> Open / download
                    </Button>
                    <span className="text-[11px] text-slate-500">Compare extracted values against the source.</span>
                  </div>
                </div>
              )}
              {selected.status === "SUBMITTED" && (
                <div className="space-y-3">
                  <Textarea rows={3} className={inputCls} placeholder="Feedback for the employee (optional)…" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" disabled={working} className="border-rose-500/50 text-rose-300 hover:bg-rose-500/10" onClick={() => review(selected.id, "reject")}>
                      <Undo2 className="mr-2 h-4 w-4" /> Return for correction
                    </Button>
                    <Button disabled={working} className="bg-emerald-600 hover:bg-emerald-500" onClick={() => review(selected.id, "approve")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve & finalize
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReportSummary({ report }: { report: ReportDTO }) {
  const kpis = parseKpis(report);
  let logs: { leadName?: string; disposition?: string; followUp?: string; notes?: string }[] = [];
  try { logs = report.callLogs ? JSON.parse(report.callLogs) : []; } catch {}
  let entries: Record<string, unknown>[] = [];
  try { entries = report.workEntries ? JSON.parse(report.workEntries) : []; } catch {}
  let ms: Record<string, number> = {};
  try { ms = report.metricsSummary ? JSON.parse(report.metricsSummary) : {}; } catch {}
  const MetricLabel = ({ k }: { k: string }) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 p-3 text-xs sm:grid-cols-4">
        <div><p className="text-slate-500">Employee</p><p className="mt-0.5 font-medium text-slate-200">{report.user?.fullName}</p></div>
        <div><p className="text-slate-500">Date</p><p className="mt-0.5 font-medium text-slate-200">{fmtDate(report.reportDate)}</p></div>
        <div><p className="text-slate-500">Department</p><p className="mt-0.5 font-medium text-slate-200">{DEPT_LABELS[report.department] || report.department}</p></div>
        <div><p className="text-slate-500">Source</p><p className="mt-0.5 font-medium text-slate-200">{report.sourceType === "UPLOAD_EXTRACTED" ? "Uploaded document" : "Manual entry"}</p></div>
        <div><p className="text-slate-500">Verification</p><p className="mt-0.5 font-medium text-slate-200">{report.verificationStatus.replace(/_/g, " ")}</p></div>
        <div><p className="text-slate-500">Attendance</p><p className="mt-0.5 font-medium text-slate-200">{report.attendanceStatus || "—"}</p></div>
        <div><p className="text-slate-500">Shift</p><p className="mt-0.5 font-medium text-slate-200">{report.shiftTime || "—"}</p></div>
        <div><p className="text-slate-500">Clock in/out</p><p className="mt-0.5 font-medium text-slate-200">{report.clockIn || "—"} / {report.clockOut || "—"}</p></div>
      </div>

      {kpis.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ KPIs</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {kpis.filter((m) => m.actual !== null).map((m) => (
              <div key={m.key} className="rounded border border-white/10 px-2 py-1.5 text-[11px]">
                <p className="truncate text-slate-500">{m.label}</p>
                <p className="font-semibold text-slate-200">{m.actual}{m.unit === "percent" ? "%" : ""} <span className="font-normal text-slate-500">/ {m.targetLabel}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
      {Object.keys(ms).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ Metrics</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {Object.entries(ms).map(([k, v]) => (
              <div key={k} className="rounded border border-white/10 px-2 py-1.5 text-[11px]">
                <p className="truncate text-slate-500"><MetricLabel k={k} /></p>
                <p className="font-semibold text-slate-200">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {entries.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ Work entries</p>
          <div className="space-y-1">
            {entries.map((e, i) => (
              <div key={i} className="rounded border border-white/10 px-2 py-1.5 text-[11px] text-slate-300">
                <span className="font-medium text-slate-200">{String(e.task || e.title || e.platform || "Entry")}</span>
                {e.status ? <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px]">{String(e.status)}</span> : null}
                {e.platform ? <span className="ml-2 rounded bg-[#6c5ce7]/20 px-1.5 py-0.5 text-[10px] text-[#b3a5ff]">{String(e.platform)}</span> : null}
                {e.project ? <span className="ml-2 text-slate-500">{String(e.project)}</span> : null}
                {e.deliverable ? <span className="ml-2 text-slate-500">→ {String(e.deliverable)}</span> : null}
                {e.hours ? <span className="ml-2 text-slate-500">{String(e.hours)}h</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {logs.some((l) => l.leadName) && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ Call log</p>
          <div className="space-y-1">
            {logs.filter((l) => l.leadName).map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-xs">
                <span className="font-medium text-slate-200">{l.leadName}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">{l.disposition || "—"}</span>
                <span className="ml-auto text-slate-500">{l.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {report.challenges && <div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Challenges</p><p className="whitespace-pre-wrap rounded-lg border border-white/10 p-3 text-xs text-slate-300">{report.challenges}</p></div>}
      {report.escalations && <div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Escalations</p><p className="whitespace-pre-wrap rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">{report.escalations}</p></div>}
      {report.additionalActivities && <div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Additional activities</p><p className="whitespace-pre-wrap rounded-lg border border-white/10 p-3 text-xs text-slate-300">{report.additionalActivities}</p></div>}
      {report.supervisorFeedback && <div><p className="mb-1 text-xs font-bold uppercase text-[#b3a5ff]">▸ Feedback</p><p className="whitespace-pre-wrap rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">{report.supervisorFeedback}</p></div>}
    </div>
  );
}
