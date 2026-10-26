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
import { Eye, Loader2, FileDown, FileSpreadsheet, FileText, Archive, DatabaseZap, BookOpen } from "lucide-react";

/**
 * Reports Archive — every submitted report is stored online (server database +
 * original uploads on disk). Administrators and supervisors can browse the full
 * history, read any report's complete contents, and download it as Word /
 * Excel / CSV at any time, from any device.
 */

export default function ReportsArchiveView({ user }: { user: SessionUser }) {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportDTO | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [docPreview, setDocPreview] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    api<{ reports: ReportDTO[] }>("/api/reports")
      .then(({ reports }) => setReports(reports))
      .finally(() => setLoading(false));
  }, []);

  const download = (id: string, format: string) => window.open(`/api/export?format=${format}&id=${id}`, "_blank");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (dept !== "ALL" && r.department !== dept) return false;
      if (type !== "ALL" && r.type !== type) return false;
      if (status !== "ALL" && r.status !== status) return false;
      const d = new Date(r.reportDate).toISOString().slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (needle) {
        const hay = `${r.ref} ${r.user?.fullName ?? ""} ${r.user?.employeeId ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [reports, q, dept, type, status, from, to]);

  const stored = reports.length;
  const approved = reports.filter((r) => r.status === "APPROVED").length;
  const uploads = reports.filter((r) => r.sourceType === "UPLOAD_EXTRACTED").length;

  return (
    <div>
      <PageHeader
        title="Reports Archive"
        subtitle="All reports stored online — browse the full history, read complete contents and download anytime"
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
            <DatabaseZap className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-semibold text-emerald-300">{stored} stored online</span>
            <span className="text-[10px] text-emerald-200/60">({approved} approved · {uploads} from uploads)</span>
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
        {(q || dept !== "ALL" || type !== "ALL" || status !== "ALL" || from || to) && (
          <Button size="sm" variant="ghost" className="h-8 text-[#8b7ff5]" onClick={() => { setQ(""); setDept("ALL"); setType("ALL"); setStatus("ALL"); setFrom(""); setTo(""); }}>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReportDetailDialog report={selected} open={!!selected} onClose={() => setSelected(null)} />
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
