"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, fmtDate, fmtDateTime, REPORT_TYPE_LABELS, DEPT_LABELS, type ReportDTO, type SessionUser } from "@/lib/client";
import { PageHeader, EmptyState, StatusBadge } from "@/components/kallmania/shared";
import { ReportDetailDialog } from "@/components/kallmania/reports-view";
import { DocumentViewerModal } from "@/components/kallmania/document-viewer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Loader2, FileDown, FileSpreadsheet, FileText, Archive, DatabaseZap, BookOpen, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Reports Archive — every submitted report is stored online (server database +
 * original uploads on disk). Administrators and supervisors can browse the full
 * history, read any report's complete contents, inspect the normalized KPI
 * records generated from it (report values AND Media Scoreboard imports), see
 * the associated template, and download it as Word / Excel / CSV at any time.
 * ADMINISTRATORS can also permanently remove reports from the archive
 * (confirmed, audited, owner-notified) — supervisors keep read/review access
 * but never destruction.
 */

interface ArchiveReport extends ReportDTO {
  kpiRecordCount: number;
  template: string | null;
  pipelineStatus: string;
  sourceFile: { id: string; fileName: string; sizeBytes: number; mimeType: string; createdAt: string; discarded: boolean } | null;
}
interface KpiRecordRow {
  id: string; kpiKey: string; label: string; unit: string; target: number | null; actual: number | null;
  achievement: number | null; statusLabel: string | null; source: string; reportDate: string;
  verification: string; revision: number; previousActual: number | null;
  report: { id: string; ref: string; type: string; status: string; sourceType: string } | null;
  sbtsEvent: { eventId: string; eventDate: string; type: string } | null;
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual entry",
  UPLOAD_EXTRACTED: "Upload + AI extract",
  CONSOLIDATED: "Consolidated",
  SBTS_IMPORT: "External site (SBTS)",
};
const SOURCE_OF_RESULT: Record<string, string> = {
  REPORT: "Team report",
  TL_REPORT: "Team lead report",
  SBTS: "Media Scoreboard",
};

export default function ReportsArchiveView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "ADMIN";
  const [reports, setReports] = useState<ArchiveReport[]>([]);
  const [stats, setStats] = useState<{ reportsOnline: number; approved: number; archivedFiles: number; storageBytes: number; kpiRecords: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportDTO | null>(null);
  const [kpiRecordsFor, setKpiRecordsFor] = useState<ArchiveReport | null>(null);
  const [kpiRecords, setKpiRecords] = useState<KpiRecordRow[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReportDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sourceType, setSourceType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [docPreview, setDocPreview] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    api<{ reports: ArchiveReport[]; stats: typeof stats }>("/api/archive")
      .then((res) => { setReports(res.reports); setStats(res.stats); })
      .finally(() => setLoading(false));
  }, []);

  // KPI records for one archive row — the same normalized store the dashboards use.
  const openKpiRecords = (r: ArchiveReport) => {
    setKpiRecordsFor(r);
    setKpiRecords(null);
    api<{ records: KpiRecordRow[] }>(`/api/kpi/results?reportId=${r.id}`)
      .then((res) => setKpiRecords(res.records))
      .catch(() => setKpiRecords([]));
  };

  const download = (id: string, format: string) => window.open(`/api/export?format=${format}&id=${id}`, "_blank");

  // Permanent removal — server-side admin-only; the row is gone forever and
  // the owner is notified. The list updates in place on success.
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDelError(null);
    try {
      await api(`/api/reports?id=${pendingDelete.id}`, { method: "DELETE" });
      setReports((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (e) {
      setDelError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (dept !== "ALL" && r.department !== dept) return false;
      if (type !== "ALL" && r.type !== type) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (sourceType !== "ALL" && r.sourceType !== sourceType) return false;
      const d = new Date(r.reportDate).toISOString().slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (needle) {
        const hay = `${r.ref} ${r.user?.fullName ?? ""} ${r.user?.employeeId ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [reports, q, dept, type, status, sourceType, from, to]);

  const stored = stats?.reportsOnline ?? reports.length;
  const approved = stats?.approved ?? reports.filter((r) => r.status === "APPROVED").length;
  const uploads = reports.filter((r) => r.sourceType === "UPLOAD_EXTRACTED").length;
  const external = reports.filter((r) => r.sourceType === "SBTS_IMPORT").length;

  return (
    <div>
      <PageHeader
        title="Reports Archive"
        subtitle="All reports stored online — browse the full history, read complete contents and download anytime"
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
            <DatabaseZap className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-semibold text-emerald-300">{stored} stored online</span>
            <span className="text-[10px] text-emerald-200/60">({approved} approved · {uploads} from uploads{external ? ` · ${external} from external site` : ""}{stats ? ` · ${stats.kpiRecords} KPI records` : ""})</span>
          </div>
        }
      />

      {/* Filters */}
      <div className="k-card mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="Search ref, employee, staff ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 w-52 border-slate-600/50 bg-[#15202e]/60 text-xs text-slate-100"
        />
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="h-8 w-44 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {Object.entries(DEPT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 w-44 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All report types</SelectItem>
            {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceType} onValueChange={setSourceType}>
          <SelectTrigger className="h-8 w-40 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-36 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>{["ALL", "SUBMITTED", "APPROVED", "REJECTED", "DRAFT"].map((s) => <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-slate-600/50 bg-[#1b2a3b] px-2 text-xs text-slate-200" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-slate-600/50 bg-[#1b2a3b] px-2 text-xs text-slate-200" />
        </div>
        {(q || dept !== "ALL" || type !== "ALL" || status !== "ALL" || sourceType !== "ALL" || from || to) && (
          <Button size="sm" variant="ghost" className="h-8 text-[#8b7ff5]" onClick={() => { setQ(""); setDept("ALL"); setType("ALL"); setStatus("ALL"); setSourceType("ALL"); setFrom(""); setTo(""); }}>
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} of {reports.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Archive className="h-8 w-8" />} title="No reports match" hint="Adjust the filters — every submitted report is permanently stored here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Ref</TableHead>
                <TableHead className="text-[11px] text-slate-400">Employee</TableHead>
                <TableHead className="text-[11px] text-slate-400">Type</TableHead>
                <TableHead className="text-[11px] text-slate-400">Department</TableHead>
                <TableHead className="text-[11px] text-slate-400">Date</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Source</TableHead>
                <TableHead className="text-[11px] text-slate-400">KPI records</TableHead>
                <TableHead className="text-[11px] text-slate-400">Reviewed</TableHead>
                <TableHead className="text-right text-[11px] text-slate-400">View & download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="border-white/5">
                  <TableCell className="py-2.5 font-mono text-xs text-[#b3a5ff]">{r.ref}</TableCell>
                  <TableCell className="py-2.5 text-xs font-medium text-slate-200">{r.user?.fullName}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-300">{REPORT_TYPE_LABELS[r.type]}</TableCell>
                  <TableCell className="py-2.5 text-[11px] text-slate-400">{DEPT_LABELS[r.department]?.split(" & ")[0] || r.department}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-400">{fmtDate(r.reportDate)}</TableCell>
                  <TableCell className="py-2.5"><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="py-2.5 text-[10px] text-slate-400">
                    <span title={r.pipelineStatus}>{SOURCE_LABELS[r.sourceType] ?? r.sourceType}{r.template ? ` · ${r.template}` : ""}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-[#8b7ff5]/30 bg-[#8b7ff5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#b3a5ff] hover:bg-[#8b7ff5]/20"
                      onClick={() => openKpiRecords(r)}
                      title="View the KPI records generated from this report"
                    >
                      <DatabaseZap className="h-3 w-3" /> {r.kpiRecordCount}
                    </button>
                  </TableCell>
                  <TableCell className="py-2.5 text-[10px] text-slate-500">
                    {r.reviewer ? `${r.reviewer.fullName} · ${fmtDateTime(r.updatedAt)}` : "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-100" onClick={() => setSelected(r)} title="View full report">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-300" onClick={() => setDocPreview({ id: r.id, name: `${r.ref}.docx` })} title="Preview the generated report document (original template design)">
                        <BookOpen className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#8b7ff5]" onClick={() => download(r.id, "docx")} title="Download Word">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-300" onClick={() => download(r.id, "xlsx")} title="Download Excel">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-300" onClick={() => download(r.id, "csv")} title="Download CSV">
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-400" onClick={() => { setDelError(null); setPendingDelete(r); }} title="Delete this report permanently (administrator)">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReportDetailDialog report={selected} open={!!selected} onClose={() => setSelected(null)} />

      {/* KPI records generated from one archived report — the normalized store. */}
      {kpiRecordsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setKpiRecordsFor(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#131c29] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">KPI records — {kpiRecordsFor.ref}</h3>
                <p className="text-[11px] text-slate-400">
                  {kpiRecordsFor.user?.fullName} · {fmtDate(kpiRecordsFor.reportDate)} · normalized records linking every value to its source
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-slate-400" onClick={() => setKpiRecordsFor(null)}>Close</Button>
            </div>
            {kpiRecords === null ? (
              <div className="flex justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : kpiRecords.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No KPI records were generated from this report (no numeric KPI values were present — e.g. free-text external reports flagged for review).
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">KPI</th>
                      <th className="px-3 py-2 font-semibold">Target</th>
                      <th className="px-3 py-2 font-semibold">Actual</th>
                      <th className="px-3 py-2 font-semibold">Achievement</th>
                      <th className="px-3 py-2 font-semibold">Source</th>
                      <th className="px-3 py-2 font-semibold">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {kpiRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td className="px-3 py-2 font-medium text-slate-200">{rec.label}{rec.revision > 1 ? <span className="ml-1 text-[10px] text-amber-300" title={`corrected — previous value ${rec.previousActual ?? "—"}`}>rev {rec.revision}</span> : ""}</td>
                        <td className="px-3 py-2">{rec.target ?? "—"}</td>
                        <td className="px-3 py-2">{rec.actual ?? "—"}{rec.unit === "percent" ? "%" : ""}</td>
                        <td className="px-3 py-2">
                          {rec.achievement === null ? <span className="text-slate-500">{rec.statusLabel === "NO_TARGET" ? "no target" : "—"}</span> : (
                            <span className={rec.achievement >= 100 ? "text-emerald-300" : rec.achievement >= 80 ? "text-amber-300" : "text-rose-300"}>{rec.achievement}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[10px]">{SOURCE_OF_RESULT[rec.source] ?? rec.source}{rec.sbtsEvent ? <span className="block text-slate-500">event {rec.sbtsEvent.eventId.slice(0, 12)}…</span> : rec.report ? <span className="block text-slate-500">{rec.report.ref}</span> : null}</td>
                        <td className="px-3 py-2 text-[10px]">{rec.verification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin-only: permanent deletion confirm — destructive, so it always asks twice. */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => { if (!v) setPendingDelete(null); }}>
        <AlertDialogContent className="border-white/10 bg-popover text-slate-100 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this report permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {pendingDelete && (
                <>
                  Report <span className="font-mono text-[#b3a5ff]">{pendingDelete.ref}</span> by {pendingDelete.user?.fullName} ({fmtDate(pendingDelete.reportDate)}) will be removed from the archive forever. This cannot be undone — the employee will be notified.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {delError && <p className="text-xs text-rose-400">{delError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-rose-600 font-semibold text-white hover:bg-rose-500"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {docPreview && (
        <DocumentViewerModal
          name={docPreview.name}
          previewUrl={`/api/export/preview?id=${docPreview.id}`}
          downloadHref={`/api/export?format=docx&id=${docPreview.id}`}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}
