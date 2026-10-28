"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, todayISO, type ReportDTO, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, ReportStateBanner, ReportSubmitActions } from "@/components/kallmania/shared";
import { cn } from "@/lib/utils";
import {
  Save, Send, Loader2, Plus, Trash2, FileCog, RotateCcw, GripVertical, LayoutTemplate,
  PencilLine, Eye, ArrowUp, ArrowDown, Settings2, ListPlus, CalendarClock, ChevronDown, Lock, Target,
} from "lucide-react";
import {
  TEAM_LEAD_TEMPLATE_KEY, TEAM_LEAD_TEMPLATES, defaultTeamLeadTemplate, teamTemplateMeta, tlTemplateKeyFor, tlVariance,
  type TlDefinition, type TlSection, type TlSectionValue, type TlTemplateKey,
} from "@/lib/team-lead-template";
import { REPORT_SECTION_INVENTORY, type SectionInventoryItem } from "@/lib/template-config";

interface TemplateResponse {
  template: { key: string; name: string; description?: string | null; definition: TlDefinition };
  isCustom: boolean;
  updatedAt?: string;
}

type Row = Record<string, string>;
type MetricRow = { key: string; label: string; target: number | null; targetLabel: string; unit: string; actual: number | null; notes: string };

/** ───────────────────────── TEAM LEAD DAILY REPORT FORM ───────────────────────── */
export default function TeamLeadReportForm({ user, date, onDone }: { user: SessionUser; date: string; onDone?: () => void }) {
  // The report follows the team lead's DESIGNATED TEAM — outbound, inbound, social
  // media and web & technical leads each get their own format (editable in KPI Configuration).
  const templateKey: TlTemplateKey = tlTemplateKeyFor(user.department, user.team);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<TlDefinition | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  // Correction mode: SUBMITTED reports are read-only until "Make Correction";
  // saving corrections keeps the report awaiting approval (never resubmitted).
  const [correcting, setCorrecting] = useState(false);
  const [sections, setSections] = useState<Record<string, TlSectionValue>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  // ── reporting-date guard: keep unsaved entries when the date changes ──
  const snapshotRef = useRef("{}");
  const dateRef = useRef(date);
  const mountedRef = useRef(false);
  const [dateKept, setDateKept] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tpl = await api<TemplateResponse>(`/api/report-template?key=${templateKey}`);
      setDefinition(tpl.template.definition);
      setIsCustom(tpl.isCustom);
      const { reports } = await api<{ reports: ReportDTO[] }>(`/api/reports?mine=1&type=TEAM_LEAD&date=${date}`);
      const existing = reports[0];
      const built: Record<string, TlSectionValue> = {};
      if (existing) {
        setReportId(existing.id);
        setRef(existing.ref);
        setStatus(existing.status);
        const payload = existing.payload ? JSON.parse(existing.payload) as { sections: Record<string, TlSectionValue> } : { sections: {} };
        // Ensure every section exists so inputs stay controlled
        for (const s of tpl.template.definition.sections) {
          const v = payload.sections?.[s.id];
          if (s.type === "table") built[s.id] = Array.isArray(v) ? v : Array.from({ length: s.minRows || 3 }, () => ({}));
          else if (s.type === "metrics") built[s.id] = Array.isArray(v) ? v : (s.metrics || []).map((m) => ({ key: m.key, label: m.label, target: m.target, targetLabel: m.target === null ? "-" : String(m.target) + (m.unit === "percent" ? "%" : ""), unit: m.unit, actual: null, notes: "" }));
          else if (s.type === "fields") built[s.id] = typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
          else built[s.id] = typeof v === "string" ? v : "";
        }
        setSections(built);
        setFeedback(existing.supervisorFeedback || null);
        setReviewer(existing.reviewer?.fullName || null);
        setReviewedAt(existing.reviewedAt || null);
      } else {
        for (const s of tpl.template.definition.sections) {
          if (s.type === "table") built[s.id] = Array.from({ length: s.minRows || 3 }, () => ({}));
          else if (s.type === "metrics") built[s.id] = (s.metrics || []).map((m) => ({ key: m.key, label: m.label, target: m.target, targetLabel: m.target === null ? "-" : String(m.target) + (m.unit === "percent" ? "%" : ""), unit: m.unit, actual: null, notes: "" }));
          else if (s.type === "fields") built[s.id] = { teamName: user.team ? "" : "", attendanceStatus: "Present" };
          else built[s.id] = "";
        }
        setSections(built);
        setReportId(null); setRef(null); setStatus("DRAFT");
        setFeedback(null); setReviewer(null); setReviewedAt(null);
      }
      setCorrecting(false);
      snapshotRef.current = JSON.stringify(built);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date, templateKey, user.team]);

  // Initial load only — date changes are handled by the guard effect below,
  // so switching the reporting date never wipes unsaved entries.
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ── TL_SOCIAL: "WORK DONE FROM MY DAY (AUTO-FILLED)" ──
  // Prefill the section from the Tasks module for the reporting date (the same
  // data the export injects server-side when the section was left empty).
  const mydayPrefilledFor = useRef<string | null>(null);
  useEffect(() => {
    if (templateKey !== "TL_SOCIAL" || loading || !definition) return;
    if (mydayPrefilledFor.current === date) return;
    const mydaySection = definition.sections.find((sec) => sec.id === "myday");
    if (!mydaySection) return;
    const rows = sections["myday"];
    if (!Array.isArray(rows) || rows.some((r) => Object.values(r || {}).some((v) => String(v ?? "").trim() !== ""))) {
      mydayPrefilledFor.current = date; // has content (saved report) — nothing to fill
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { tasks } = await api<{ tasks: { title: string; deadline?: string | null; dateAssigned?: string | null; status: string; target?: string | null }[] }>("/api/tasks?mine=1");
        const dayStart = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const inDay = tasks.filter((t) => {
          const d = t.deadline ? new Date(t.deadline) : t.dateAssigned ? new Date(t.dateAssigned) : null;
          return d && !Number.isNaN(d.getTime()) && d >= dayStart && d < dayEnd;
        }).slice(0, 6);
        if (cancelled || inDay.length === 0) return;
        const human = (st: string) => st.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const filled = inDay.map((t) => {
          const d = t.deadline ? new Date(t.deadline) : null;
          const due = d && !Number.isNaN(d.getTime()) && d >= dayStart && d < dayEnd
            ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : t.target || "";
          return { task: t.title, timeDue: due, status: human(t.status) };
        });
        mydayPrefilledFor.current = date;
        setSections((prev) => {
          const rest = Array.isArray(prev.myday) ? (prev.myday as Record<string, unknown>[]).slice(filled.length) : [];
          return { ...prev, myday: [...filled, ...rest] };
        });
      } catch { /* auto-fill is best-effort */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateKey, definition, date, loading]);

  // Changing the reporting date only changes the date — unsaved entries are kept
  // (a clean form still loads whatever is already saved under the new date).
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; dateRef.current = date; return; }
    if (date === dateRef.current) return;
    dateRef.current = date;
    if (JSON.stringify(sections) !== snapshotRef.current) {
      setDateKept(date);
      return;
    }
    setDateKept(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const setSection = (id: string, value: TlSectionValue) => setSections((prev) => ({ ...prev, [id]: value }));

  const save = async (submit: boolean) => {
    if (!definition) return;
    setSaving(true);
    setError(null);
    try {
      // validate required sections on submit
      if (submit) {
        for (const s of definition.sections) {
          if (!s.required) continue;
          const v = sections[s.id];
          const empty = s.type === "textarea" ? !String(v || "").trim() : s.type === "table" ? !Array.isArray(v) || !v.some((r) => Object.values(r).some((x) => String(x ?? "").trim())) : false;
          if (empty) { throw new Error(`Section “${s.title}” is required before submitting.`); }
        }
      }
      const body: Record<string, unknown> = {
        type: "TEAM_LEAD", reportDate: date, department: user.department, submit,
        teamName: user.team || "BPO Division",
        payload: JSON.stringify({ sections, templateKey }),
      };
      if (reportId) body.id = reportId;
      const { report } = await api<{ report: ReportDTO }>("/api/reports", { method: "POST", body: JSON.stringify(body) });
      setReportId(report.id); setRef(report.ref); setStatus(report.status);
      setCorrecting(false);
      snapshotRef.current = JSON.stringify(sections);
      setDateKept(null);
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!definition) return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error || "Template could not be loaded."}</div>;

  const locked = status === "APPROVED" || (status === "SUBMITTED" && !correcting);

  const renderSection = (s: TlSection) => {
    const value = sections[s.id];
    if (s.type === "fields") {
      const vals = (typeof value === "object" && value !== null && !Array.isArray(value) ? value : {}) as Record<string, string>;
      const setField = (k: string, v: string) => setSection(s.id, { ...vals, [k]: v });
      return (
        <SectionCard key={s.id} title={s.title} subtitle={s.description}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Team Lead Name"><Input readOnly disabled className={inputCls} value={user.fullName} /></Field>
            <Field label="Date"><Input readOnly disabled className={inputCls} value={date} /></Field>
            <Field label="Position"><Input readOnly disabled className={inputCls} value="Team Lead" /></Field>
            {(s.fields || []).map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "select" ? (
                  <Select disabled={locked} value={vals[f.key] || ""} onValueChange={(v) => setField(f.key, v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    disabled={locked}
                    type={f.type === "number" ? "number" : f.type === "time" ? "time" : "text"}
                    className={inputCls}
                    placeholder={f.placeholder || ""}
                    value={vals[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
        </SectionCard>
      );
    }
    if (s.type === "textarea") {
      return (
        <SectionCard key={s.id} title={s.title} subtitle={s.description}>
          <Textarea disabled={locked} rows={4} className={inputCls} value={String(value ?? "")} onChange={(e) => setSection(s.id, e.target.value)} placeholder={s.required ? "Required before submitting…" : "Optional — leave blank if nothing to report"} />
        </SectionCard>
      );
    }
    if (s.type === "metrics") {
      const rows = (Array.isArray(value) ? value : []) as MetricRow[];
      const setActual = (key: string, raw: string) => {
        const v = raw === "" ? null : parseFloat(raw);
        setSection(s.id, rows.map((r) => (r.key === key ? { ...r, actual: Number.isNaN(v as number) ? null : v } : r)));
      };
      const setNotes = (key: string, notes: string) => setSection(s.id, rows.map((r) => (r.key === key ? { ...r, notes } : r)));
      return (
        <SectionCard key={s.id} title={s.title} subtitle={s.description}>
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
                {rows.map((r) => {
                  const variance = tlVariance(r.actual, r.target);
                  return (
                    <TableRow key={r.key} className="border-white/5">
                      <TableCell className="py-2 text-xs font-medium text-slate-200">{r.label}</TableCell>
                      <TableCell className="py-2 text-xs tabular-nums text-slate-400">{r.targetLabel}</TableCell>
                      <TableCell className="py-2">
                        <Input disabled={locked} type="number" step="any" inputMode="decimal" className={cn(inputCls, "h-8 w-24 text-xs tabular-nums")} value={r.actual === null ? "" : r.actual} onChange={(e) => setActual(r.key, e.target.value)} placeholder="—" />
                      </TableCell>
                      <TableCell className="py-2 text-xs font-semibold tabular-nums">
                        {variance === null ? <span className="text-slate-600">—</span> : variance >= 0 ? <span className="text-emerald-400">+{variance}</span> : <span className="text-rose-400">{variance}</span>}
                      </TableCell>
                      <TableCell className="py-2">
                        <Input disabled={locked} className={cn(inputCls, "h-8 text-xs")} value={r.notes || ""} onChange={(e) => setNotes(r.key, e.target.value)} placeholder="optional" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      );
    }
    // table
    const rows = (Array.isArray(value) ? value : []) as Row[];
    const minRows = s.minRows || 0;
    const canAdd = s.addRows !== false;
    const setCell = (i: number, col: string, v: string) => setSection(s.id, rows.map((r, j) => (j === i ? { ...r, [col]: v } : r)));
    return (
      <SectionCard
        key={s.id}
        title={s.title}
        subtitle={s.description}
        actions={
          !locked && canAdd && (
            <Button size="sm" className="k-btn-glass h-8 text-xs text-slate-200" onClick={() => setSection(s.id, [...rows, {}])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add row
            </Button>
          )
        }
      >
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="w-10 text-[11px] text-slate-400">#</TableHead>
                {(s.columns || []).map((c) => <TableHead key={c.key} className="text-[11px] text-slate-400">{c.label}</TableHead>)}
                {!locked && <TableHead className="w-10 text-[11px] text-slate-400"><span className="sr-only">Remove</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                  {(s.columns || []).map((c) => (
                    <TableCell key={c.key} className="py-1.5">
                      {c.type === "select" ? (
                        <Select disabled={locked} value={row[c.key] || ""} onValueChange={(v) => setCell(i, c.key, v)}>
                          <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{(c.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input disabled={locked} type={c.type === "number" ? "number" : "text"} className={inputCls} value={row[c.key] || ""} onChange={(e) => setCell(i, c.key, e.target.value)} />
                      )}
                    </TableCell>
                  ))}
                  {!locked && (
                    <TableCell className="py-1.5">
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                        title="Remove this row"
                        onClick={() => setSection(s.id, rows.length > 1 ? rows.filter((_, j) => j !== i) : [{}])}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!locked && canAdd && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>{rows.filter((r) => Object.values(r).some((v) => String(v ?? "").trim())).length} filled · template minimum {minRows} row(s)</span>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5] hover:bg-white/10" onClick={() => setSection(s.id, [...rows, {}])}>
              <Plus className="mr-1 h-3 w-3" /> Add another row
            </Button>
          </div>
        )}
      </SectionCard>
    );
  };

  return (
    <div className="space-y-5">
      {dateKept && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" /> Reporting date changed to {dateKept} — your entries were kept and will be saved under this date.
        </div>
      )}
      {ref && status !== "DRAFT" && <ReportStateBanner status={status} ref={ref} feedback={feedback} reviewer={reviewer} reviewedAt={reviewedAt} />}
      {ref && status === "DRAFT" && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-mono font-semibold text-[#b3a5ff]">{ref}</span>
          <StatusBadge status={status} />
        </div>
      )}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
      {isCustom && status === "DRAFT" && (
        <div className="flex items-center gap-2 rounded-lg border border-[#8b7ff5]/30 bg-[#6c5ce7]/10 px-3 py-2 text-[11px] text-[#b3a5ff]">
          <LayoutTemplate className="h-3.5 w-3.5" /> This report follows the custom {teamTemplateMeta(templateKey)?.label || "team lead"} template configured by your supervisor / administrator.
        </div>
      )}
      {definition.sections.map(renderSection)}
      <ReportSubmitActions
        status={status}
        correcting={correcting}
        saving={saving}
        onCorrect={() => setCorrecting(true)}
        onCancelCorrect={() => { setCorrecting(false); load(); }}
        onSaveDraft={() => save(false)}
        onSubmit={() => save(true)}
      />
    </div>
  );
}

/** ───────────────────────── MASTER REPORT TEMPLATES (Word) ───────────────────────── */

interface MasterTemplateRow {
  reportType: string;
  label: string;
  originalName: string | null;
  sizeBytes: number | null;
  fileHash: string | null;
  updatedByName: string | null;
  updatedAt: string | null;
  isBundled: boolean;
}

/**
 * Shows the ORIGINAL uploaded Word document backing each report type —
 * generated & downloaded reports are filled into a copy of it, so the original
 * design (logos, fonts, colours, tables, headers/footers, margins) is kept.
 * Administrators can replace a master; supervisors can download it.
 */
export function MasterTemplatesCard() {
  const [masters, setMasters] = useState<MasterTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [replaceType, setReplaceType] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { masters } = await api<{ masters: MasterTemplateRow[] }>("/api/report-templates/master");
      setMasters(masters);
    } catch {
      setMasters([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ user: { role: string } | null }>("/api/auth").then(({ user }) => setIsAdmin(user?.role === "ADMIN")).catch(() => {});
  }, []);

  const pickFile = (reportType: string) => {
    setReplaceType(reportType);
    setMessage(null); setError(null);
    fileRef.current?.click();
  };

  const upload = async (file: File) => {
    if (!replaceType) return;
    setBusy(replaceType);
    try {
      const form = new FormData();
      form.append("reportType", replaceType);
      form.append("file", file);
      const res = await fetch("/api/report-templates/master", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Upload failed");
      setMasters(json.masters);
      setMessage(`Master template replaced — new ${replaceType.replace(/_/g, " ")} reports will use “${file.name}” as their design foundation. Previously generated reports stay unchanged.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setReplaceType(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <SectionCard
      title="Master report templates (Word)"
      subtitle="The original SBTS documents every generated report is filled into — a copy is edited, the master is never modified"
    >
      <input
        ref={fileRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
      />
      {message && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</div>}
      {error && <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-6 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {masters.map((m) => (
            <div key={m.reportType} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200">
                  {m.label}
                  {m.originalName ? (
                    <span className="rounded bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">design foundation</span>
                  ) : (
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">built-in generator</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {m.originalName
                    ? `${m.originalName}${m.sizeBytes ? ` · ${(m.sizeBytes / 1024).toFixed(0)} KB` : ""}${m.updatedByName ? ` · updated by ${m.updatedByName}` : ""}${m.fileHash ? ` · sha256 ${m.fileHash.slice(0, 8)}` : ""}`
                    : "No Word master — team-lead reports use the dynamic in-app template"}
                </p>
              </div>
              {m.originalName && (
                <Button
                  size="sm" variant="ghost" className="h-7 text-[11px] text-slate-300"
                  title="Download the current master template"
                  onClick={() => window.location.href = `/api/report-templates/master/file?reportType=${m.reportType}`}
                >
                  <Save className="mr-1 h-3 w-3" /> Download
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm" variant="outline"
                  className="h-7 border-[#8b7ff5]/40 text-[11px] text-[#b3a5ff]"
                  disabled={busy === m.reportType}
                  title="Replace this master with an uploaded .docx — new reports adopt its design"
                  onClick={() => pickFile(m.reportType)}
                >
                  {busy === m.reportType ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                  Replace
                </Button>
              )}
            </div>
          ))}
          <p className="text-[10px] text-slate-600">
            Report generation copies the master, inserts the validated report data into the existing sections and table cells, and never touches the master file — its sha256 fingerprint is stored so the original can always be verified.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

/** ───────────────────────── TEMPLATE EDITOR (admin & supervisor) ───────────────────────── */
export function TeamLeadTemplateEditor() {
  // One editor for every team's template — pick the team, edit its format.
  const [tplKey, setTplKey] = useState<TlTemplateKey>("TL_OUTBOUND");
  const meta = teamTemplateMeta(tplKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [name, setName] = useState("");
  const [def, setDef] = useState<TlDefinition | null>(null);
  const [preview, setPreview] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [invReport, setInvReport] = useState(REPORT_SECTION_INVENTORY[0].key);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<TemplateResponse>(`/api/report-template?key=${tplKey}`);
      setDef(res.template.definition);
      setName(res.template.name);
      setIsCustom(res.isCustom);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tplKey]);
  useEffect(() => { load(); }, [load]);

  const update = (fn: (d: TlDefinition) => void) => {
    if (!def) return;
    const copy = JSON.parse(JSON.stringify(def)) as TlDefinition;
    fn(copy);
    setDef(copy);
  };

  const save = async () => {
    if (!def) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await api("/api/report-template", { method: "PUT", body: JSON.stringify({ key: tplKey, name, definition: def }) });
      setMessage(`Template saved — ${meta?.label || "team"} leads will now use this format for their daily report.`);
      setIsCustom(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true); setError(null); setMessage(null);
    try {
      await api(`/api/report-template?key=${tplKey}`, { method: "DELETE" });
      await load();
      setMessage(`Template reset to the shipped default format for ${meta?.label || "this team"}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!def) return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error || "Template could not be loaded."}</div>;

  const addSection = () => {
    update((d) => {
      d.sections.push({ id: `section-${Date.now().toString(36)}`, title: "NEW SECTION", type: "textarea", description: "" });
    });
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    update((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.sections.length) return;
      const [s] = d.sections.splice(i, 1);
      d.sections.splice(j, 0, s);
    });
  };

  return (
    <div className="space-y-5">
      <MasterTemplatesCard />
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><FileCog className="h-5 w-5 text-[#8b7ff5]" /> Report Templates &amp; Sections</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Pick a team and design the daily report its team lead fills in, or browse the full section structure of every report type in the app{isCustom ? " · custom format in effect" : " · shipped default format"}.
          </p>
        </div>
        <Select value={tplKey} onValueChange={(v) => { setMessage(null); setError(null); setPreview(false); setTplKey(v as TlTemplateKey); }}>
          <SelectTrigger className="w-64 border-white/12 bg-white/[0.055] text-xs text-slate-200 backdrop-blur">
            <SelectValue placeholder="Choose team template" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {TEAM_LEAD_TEMPLATES.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}{t.key === "TEAM_LEAD" ? "" : " — Team Lead"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="k-btn-glass border-white/15 text-slate-200" onClick={() => setPreview(!preview)}>
          <Eye className="mr-1.5 h-4 w-4" /> {preview ? "Edit structure" : "Preview form"}
        </Button>
        <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10" onClick={reset} disabled={saving}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Reset to default
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="k-btn-primary">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save template
        </Button>
      </div>

      {meta && (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">{meta.audience}:</span> {meta.description}
        </p>
      )}

      {message && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</div>}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

      {preview ? (
        <div className="space-y-4 opacity-95">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-sm font-bold tracking-wide text-white">{def.title}</p>
            <p className="mt-1 text-[11px] text-slate-500">Live preview of the form team leads will see</p>
          </div>
          {def.sections.map((s) => (
            <SectionCard key={s.id} title={s.title} subtitle={s.description}>
              {s.type === "fields" && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(s.fields || []).map((f) => (
                    <Field key={f.key} label={f.label}><Input disabled className={inputCls} placeholder={f.placeholder || "…"} /></Field>
                  ))}
                </div>
              )}
              {s.type === "textarea" && <Textarea disabled rows={3} className={inputCls} placeholder={s.required ? "Required section" : "Optional section"} />}
              {s.type === "metrics" && (
                <div className="rounded-lg border border-white/10 p-3 text-[11px] text-slate-400">
                  KPI table with {(s.metrics || []).length} metric row(s): {(s.metrics || []).map((m) => m.label).join(" · ")}
                </div>
              )}
              {s.type === "table" && (
                <div className="rounded-lg border border-white/10 p-3 text-[11px] text-slate-400">
                  Dynamic table — columns: {(s.columns || []).map((c) => c.label).join(" · ")} · minimum {s.minRows || 0} row(s){s.addRows !== false ? " · team lead can add more" : ""}
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      ) : (
        <>
          <SectionCard title="Report identity">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Template name"><Input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Document title (shown at the top of the report)"><Input className={inputCls} value={def.title} onChange={(e) => update((d) => { d.title = e.target.value; })} /></Field>
            </div>
          </SectionCard>

          {def.sections.map((s, i) => (
            <SectionCard
              key={s.id}
              title={`Section ${i + 1}`}
              subtitle={s.type.toUpperCase()}
              actions={
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" title="Move up" onClick={() => moveSection(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" title="Move down" onClick={() => moveSection(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-rose-400 hover:bg-rose-500/10" title="Remove section"
                    onClick={() => update((d) => { d.sections.splice(i, 1); })}
                  ><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              }
            >
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Section title"><Input className={inputCls} value={s.title} onChange={(e) => update((d) => { d.sections[i].title = e.target.value; })} /></Field>
                <Field label="Type">
                  <Select value={s.type} onValueChange={(v) => update((d) => {
                    const sec = d.sections[i];
                    sec.type = v as TlSection["type"];
                    if (v === "table" && !sec.columns) { sec.columns = [{ key: "item", label: "Item" }, { key: "notes", label: "Notes" }]; sec.minRows = 3; }
                    if (v === "metrics" && !sec.metrics) sec.metrics = [{ key: "metric1", label: "Metric 1", target: null, unit: "count" }];
                    if (v === "fields" && !sec.fields) sec.fields = [{ key: "field1", label: "Field 1", type: "text" }];
                  })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fields">Info fields (grid)</SelectItem>
                      <SelectItem value="metrics">KPI metrics table</SelectItem>
                      <SelectItem value="table">Dynamic table</SelectItem>
                      <SelectItem value="textarea">Free text</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Hint / description (optional)" >
                  <Input className={inputCls} value={s.description || ""} onChange={(e) => update((d) => { d.sections[i].description = e.target.value; })} />
                </Field>
                <Field label="Required before submit?">
                  <Select value={s.required ? "yes" : "no"} onValueChange={(v) => update((d) => { d.sections[i].required = v === "yes"; })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="no">Optional</SelectItem><SelectItem value="yes">Required</SelectItem></SelectContent>
                  </Select>
                </Field>
              </div>

              {s.type === "fields" && (
                <div className="mt-3 space-y-2 rounded-lg border border-white/10 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Settings2 className="h-3 w-3" /> Fields in this section</p>
                  {(s.fields || []).map((f, fi) => (
                    <div key={fi} className="grid grid-cols-[1fr_120px_1fr_auto] items-center gap-2">
                      <Input className={cn(inputCls, "h-8 text-xs")} value={f.label} onChange={(e) => update((d) => { d.sections[i].fields![fi].label = e.target.value; })} placeholder="Field label" />
                      <Select value={f.type || "text"} onValueChange={(v) => update((d) => { d.sections[i].fields![fi].type = v as never; })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["text", "number", "time", "select"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className={cn(inputCls, "h-8 text-xs")} value={(f.options || []).join(", ")} onChange={(e) => update((d) => { d.sections[i].fields![fi].options = e.target.value.split(",").map((x) => x.trim()).filter(Boolean); })} placeholder="Options (comma-separated, for select)" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-rose-300" onClick={() => update((d) => { d.sections[i].fields!.splice(fi, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5]" onClick={() => update((d) => { d.sections[i].fields!.push({ key: `f${Date.now().toString(36)}`, label: "New Field", type: "text" }); })}>
                    <ListPlus className="mr-1 h-3.5 w-3.5" /> Add field
                  </Button>
                </div>
              )}

              {s.type === "metrics" && (
                <div className="mt-3 space-y-2 rounded-lg border border-white/10 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><GripVertical className="h-3 w-3" /> KPI rows (target editable by the team lead)</p>
                  {(s.metrics || []).map((m, mi) => (
                    <div key={mi} className="grid grid-cols-[1fr_110px_110px_auto] items-center gap-2">
                      <Input className={cn(inputCls, "h-8 text-xs")} value={m.label} onChange={(e) => update((d) => { d.sections[i].metrics![mi].label = e.target.value; })} placeholder="Metric label" />
                      <Input type="number" className={cn(inputCls, "h-8 text-xs tabular-nums")} value={m.target === null ? "" : m.target} onChange={(e) => update((d) => { d.sections[i].metrics![mi].target = e.target.value === "" ? null : parseFloat(e.target.value); })} placeholder="Target" />
                      <Select value={m.unit} onValueChange={(v) => update((d) => { d.sections[i].metrics![mi].unit = v as never; })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["count", "percent", "minutes"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-rose-300" onClick={() => update((d) => { d.sections[i].metrics!.splice(mi, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5]" onClick={() => update((d) => { d.sections[i].metrics!.push({ key: `m${Date.now().toString(36)}`, label: "New Metric", target: null, unit: "count" }); })}>
                    <ListPlus className="mr-1 h-3.5 w-3.5" /> Add metric row
                  </Button>
                </div>
              )}

              {s.type === "table" && (
                <div className="mt-3 space-y-2 rounded-lg border border-white/10 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><PencilLine className="h-3 w-3" /> Columns</p>
                  {(s.columns || []).map((c, ci) => (
                    <div key={ci} className="grid grid-cols-[1fr_110px_1fr_auto] items-center gap-2">
                      <Input className={cn(inputCls, "h-8 text-xs")} value={c.label} onChange={(e) => update((d) => { d.sections[i].columns![ci].label = e.target.value; })} placeholder="Column label" />
                      <Select value={c.type || "text"} onValueChange={(v) => update((d) => { d.sections[i].columns![ci].type = v as never; })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["text", "number", "select"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className={cn(inputCls, "h-8 text-xs")} value={(c.options || []).join(", ")} onChange={(e) => update((d) => { d.sections[i].columns![ci].options = e.target.value.split(",").map((x) => x.trim()).filter(Boolean); })} placeholder="Options (comma-separated, for select)" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-rose-300" onClick={() => update((d) => { d.sections[i].columns!.splice(ci, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5]" onClick={() => update((d) => { d.sections[i].columns!.push({ key: `c${Date.now().toString(36)}`, label: "New Column", type: "text" }); })}>
                      <ListPlus className="mr-1 h-3.5 w-3.5" /> Add column
                    </Button>
                    <label className="flex items-center gap-2 text-[11px] text-slate-400">
                      Minimum rows:
                      <Input type="number" className="h-7 w-16 border-white/12 bg-white/[0.055] text-xs tabular-nums text-slate-100" value={s.minRows ?? 0} onChange={(e) => update((d) => { d.sections[i].minRows = parseInt(e.target.value, 10) || 0; })} />
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-400">
                      <input type="checkbox" className="accent-[#6c5ce7]" checked={s.addRows !== false} onChange={(e) => update((d) => { d.sections[i].addRows = e.target.checked; })} />
                      Allow the team lead to add extra rows
                    </label>
                  </div>
                </div>
              )}
            </SectionCard>
          ))}

          <Button variant="outline" onClick={addSection} className="k-btn-glass border-white/15 text-slate-200">
            <Plus className="mr-2 h-4 w-4" /> Add section
          </Button>
        </>
      )}

      {/* Full report section inventory — every report type in the app */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02]">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
          onClick={() => setShowInventory(!showInventory)}
        >
          <LayoutTemplate className="h-4 w-4 shrink-0 text-[#eda06a]" />
          <span className="text-sm font-semibold text-slate-100">All report sections in the app</span>
          <span className="text-[11px] text-slate-500">— the complete structure of every report type, including the built-in agent &amp; supervisor forms</span>
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform", showInventory && "rotate-180")} />
        </button>
        {showInventory && (
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {REPORT_SECTION_INVENTORY.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setInvReport(r.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    invReport === r.key ? "border-[#8b7ff5] bg-[#6c5ce7]/20 text-white" : "border-white/12 text-slate-300 hover:border-slate-500"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {REPORT_SECTION_INVENTORY.filter((r) => r.key === invReport).map((r) => (
              <div key={r.key} className="space-y-2">
                <p className="text-[11px] text-slate-500"><span className="font-semibold text-slate-300">Who fills it:</span> {r.audience}</p>
                {r.sections.map((s: SectionInventoryItem, i: number) => (
                  <div key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                    <span className="mt-0.5 w-5 shrink-0 text-center font-mono text-[10px] text-slate-600">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-200">{s.title}</span>
                      <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b3a5ff]">{s.kind}</span>
                      {s.configurableViaKpi && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-[#eda06a]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#f0b285]" title="Metric rows inside this section are managed in KPI Configuration">
                          <Target className="h-2.5 w-2.5" /> KPI-configurable
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{s.detail}</span>
                    </span>
                    {!r.key.startsWith("TL_") && (
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500" title="Built-in form structure — its metric rows are configured under KPI Configuration">
                        <Lock className="h-2.5 w-2.5" /> Built-in
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              Team-lead reports above are fully editable: reorder, rename, retype or remove any section and add brand-new ones, then save. The built-in agent and supervisor forms keep their proven structure — the metric rows inside them (targets, labels, mandatory flags, additions and deletions) are configured under <span className="font-semibold text-slate-300">KPI Configuration</span>, per centre and per individual.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
