"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, fmtDateTime, type DocIntelPayload, type ExtractedField, type KpiMetric, type SessionUser, type UploadDTO } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, EmptyState } from "@/components/kallmania/shared";
import { DocumentViewerModal } from "@/components/kallmania/document-viewer";
import { TextDraftModal } from "@/components/kallmania/text-draft";
import { KpiTable } from "@/components/kallmania/report-forms";
import { Upload as UploadIcon, FileUp, ScanSearch, CheckCircle2, AlertTriangle, XCircle, Loader2, FileText, ShieldAlert, Send, Save, Eye, ScrollText, ListChecks, Table2, FileSearch, PlusCircle, Info } from "lucide-react";

const SUPPORTED = "PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG up to 15 MB";

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
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ ref: string; submitted: boolean } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [includedUnmapped, setIncludedUnmapped] = useState<string[]>([]);

  const reset = () => {
    setFile(null); setUploadId(null); setExtraction(null); setMetrics([]); setSections({}); setAdditional(""); setConfirmed(null); setError(null); setDiscarded(false); setShowRaw(false); setIncludedUnmapped([]);
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
      // Seed the KPI metric editor with the extracted values — supervisor
      // uploads get the supervisor template grid (team KPIs + attendance),
      // everyone else the agent grid.
      const isSupervisor = department === "MANAGEMENT";
      const { AGENT_KPIS_SEED, SUPERVISOR_KPIS_SEED } = await import("@/lib/kpi-seed");
      const seedDefs = isSupervisor ? SUPERVISOR_KPIS_SEED : AGENT_KPIS_SEED;
      const routedByKey = new Map((ext.doc?.full.routed ?? []).map((r) => [r.key, r]));
      const seeded = seedDefs.map((d) => {
        const found = ext.fields.find((f) => f.key === d.key);
        const reported = routedByKey.get(d.key);
        return {
          ...d,
          actual: found && typeof found.value === "number" ? found.value : null,
          // The document's own "Team Target" column — never the agent KPI config
          target: isSupervisor && typeof reported?.reportedTarget === "number" ? reported.reportedTarget : d.target,
          targetLabel: isSupervisor && typeof reported?.reportedTarget === "number" ? String(reported.reportedTarget) : d.targetLabel,
          auto: false,
          notes: found?.needsReview ? "Extracted — please verify" : "",
        };
      });
      setMetrics(seeded as KpiMetric[]);
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
      const { report } = await api<{ report: { ref: string } }>("/api/uploads/confirm", {
        method: "POST",
        body: JSON.stringify({ uploadId, confirmedMetrics: metrics, sections: { ...sections, additionalActivities: additional }, reportDate, department, submit }),
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
          <Field label="Department">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BPO">BPO & Outbound Call Centre</SelectItem>
                <SelectItem value="WEB_DEV">Web Development & Technical</SelectItem>
                <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                <SelectItem value="MANAGEMENT">Management / Supervisor</SelectItem>
              </SelectContent>
            </Select>
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
                  </>
                )}

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
