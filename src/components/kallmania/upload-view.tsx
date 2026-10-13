"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api, fmtDateTime, type ExtractedField, type KpiMetric, type SessionUser, type UploadDTO } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, EmptyState } from "@/components/kallmania/shared";
import { KpiTable } from "@/components/kallmania/report-forms";
import { Upload as UploadIcon, FileUp, ScanSearch, CheckCircle2, AlertTriangle, XCircle, Loader2, FileText, ShieldAlert, Send, Save } from "lucide-react";

const SUPPORTED = "PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG up to 15 MB";

interface ExtractResponse {
  fields: ExtractedField[];
  sections: { challenges?: string | null; escalations?: string | null; additionalActivities?: string | null };
  stats: { fieldsFound: number; fieldsNeedingReview: number };
  rawTextPreview: string;
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
  const [sections, setSections] = useState<ExtractResponse["sections"]>({});
  const [additional, setAdditional] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ ref: string; submitted: boolean } | null>(null);

  const reset = () => {
    setFile(null); setUploadId(null); setExtraction(null); setMetrics([]); setSections({}); setAdditional(""); setConfirmed(null); setError(null);
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
      // Seed the KPI metric editor with the extracted values
      const { AGENT_KPIS_SEED } = await import("@/lib/kpi-seed");
      const seeded = AGENT_KPIS_SEED.map((d) => {
        const found = ext.fields.find((f) => f.key === d.key);
        return {
          ...d,
          actual: found && typeof found.value === "number" ? found.value : null,
          auto: false,
          notes: found?.needsReview ? "Extracted — please verify" : "",
        };
      });
      setMetrics(seeded);
      setSections(ext.sections || {});
      setAdditional(ext.sections?.additionalActivities || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExtracting(false);
    }
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

      <SectionCard title="Upload Report" subtitle={`Instead of re-entering everything manually, upload your existing daily report — ${SUPPORTED}`}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Department">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BPO">BPO & Outbound Call Centre</SelectItem>
                <SelectItem value="WEB_DEV">Web Development & Technical</SelectItem>
                <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
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
          {uploadId && !confirmed && <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400">Start over</Button>}
          <Button onClick={doUpload} disabled={!file || uploading || extracting} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
            {uploading || extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
            {uploading ? "Uploading…" : extracting ? "Extracting fields…" : "Upload & Extract"}
          </Button>
        </div>
        {extracting && <Progress value={66} className="mt-3 h-1.5" />}
      </SectionCard>

      {extraction && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
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
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-white">{extraction.stats.fieldsFound - reviewCount}</p>
                <p className="text-xs text-slate-400">high confidence</p>
              </div>
            </div>
          </div>

          <SectionCard title="Review Extracted Information" subtitle="Correct anything the system misread, fill what was missed, then confirm. Upload does not mean approved.">
            {extraction.stats.fieldsFound === 0 ? (
              <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="No structured fields could be identified" hint="The document may be handwritten or an unusual layout. Enter the values manually below — the original file stays attached to your report." />
            ) : (
              <>
                <div className="mb-4 space-y-2">
                  {extraction.fields.map((f) => (
                    <div key={f.key + f.source} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${f.confidence === "high" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {f.confidence === "high" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {f.confidence}
                      </span>
                      <span className="font-medium text-slate-200">{f.label}</span>
                      <span className="font-mono text-[#b3a5ff]">{String(f.value)}</span>
                      <span className="ml-auto text-[10px] text-slate-500">source: {f.source}</span>
                    </div>
                  ))}
                </div>
                <KpiTable metrics={metrics} onChange={setMetrics} />
              </>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="Challenges / Blockers">
                <Textarea rows={3} className={inputCls} value={sections.challenges || ""} onChange={(e) => setSections({ ...sections, challenges: e.target.value })} />
              </Field>
              <Field label="Escalations">
                <Textarea rows={3} className={inputCls} value={sections.escalations || ""} onChange={(e) => setSections({ ...sections, escalations: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Additional Activities">
                <Textarea rows={3} className={inputCls} value={additional} onChange={(e) => setAdditional(e.target.value)} />
              </Field>
            </div>

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
    </div>
  );
}
