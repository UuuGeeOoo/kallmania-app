"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, todayISO, type ReportDTO, type SessionUser } from "@/lib/client";
import { SectionCard, Field, inputCls, StatusBadge, ReportStateBanner } from "@/components/kallmania/shared";
import { cn } from "@/lib/utils";
import {
  Save, Send, Loader2, Plus, Trash2, FileCog, RotateCcw, GripVertical, LayoutTemplate,
  PencilLine, Eye, ArrowUp, ArrowDown, Settings2, ListPlus,
} from "lucide-react";
import {
  TEAM_LEAD_TEMPLATE_KEY, defaultTeamLeadTemplate, tlVariance,
  type TlDefinition, type TlSection, type TlSectionValue,
} from "@/lib/team-lead-template";

interface TemplateResponse {
  template: { key: string; name: string; description?: string | null; definition: TlDefinition };
  isCustom: boolean;
  updatedAt?: string;
}

type Row = Record<string, string>;
type MetricRow = { key: string; label: string; target: number | null; targetLabel: string; unit: string; actual: number | null; notes: string };

/** ───────────────────────── TEAM LEAD DAILY REPORT FORM ───────────────────────── */
export default function TeamLeadReportForm({ user, date, onDone }: { user: SessionUser; date: string; onDone?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<TlDefinition | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [sections, setSections] = useState<Record<string, TlSectionValue>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tpl = await api<TemplateResponse>(`/api/report-template?key=${TEAM_LEAD_TEMPLATE_KEY}`);
      setDefinition(tpl.template.definition);
      setIsCustom(tpl.isCustom);
      const { reports } = await api<{ reports: ReportDTO[] }>(`/api/reports?mine=1&type=TEAM_LEAD&date=${date}`);
      const existing = reports[0];
      if (existing) {
        setReportId(existing.id);
        setRef(existing.ref);
        setStatus(existing.status);
        const payload = existing.payload ? JSON.parse(existing.payload) as { sections: Record<string, TlSectionValue> } : { sections: {} };
        // Ensure every section exists so inputs stay controlled
        const filled: Record<string, TlSectionValue> = {};
        for (const s of tpl.template.definition.sections) {
          const v = payload.sections?.[s.id];
          if (s.type === "table") filled[s.id] = Array.isArray(v) ? v : Array.from({ length: s.minRows || 3 }, () => ({}));
          else if (s.type === "metrics") filled[s.id] = Array.isArray(v) ? v : (s.metrics || []).map((m) => ({ key: m.key, label: m.label, target: m.target, targetLabel: m.target === null ? "-" : String(m.target) + (m.unit === "percent" ? "%" : ""), unit: m.unit, actual: null, notes: "" }));
          else if (s.type === "fields") filled[s.id] = typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
          else filled[s.id] = typeof v === "string" ? v : "";
        }
        setSections(filled);
        setFeedback(existing.supervisorFeedback || null);
        setReviewer(existing.reviewer?.fullName || null);
        setReviewedAt(existing.reviewedAt || null);
      } else {
        const fresh: Record<string, TlSectionValue> = {};
        for (const s of tpl.template.definition.sections) {
          if (s.type === "table") fresh[s.id] = Array.from({ length: s.minRows || 3 }, () => ({}));
          else if (s.type === "metrics") fresh[s.id] = (s.metrics || []).map((m) => ({ key: m.key, label: m.label, target: m.target, targetLabel: m.target === null ? "-" : String(m.target) + (m.unit === "percent" ? "%" : ""), unit: m.unit, actual: null, notes: "" }));
          else if (s.type === "fields") fresh[s.id] = { teamName: user.team ? "" : "", attendanceStatus: "Present" };
          else fresh[s.id] = "";
        }
        setSections(fresh);
        setReportId(null); setRef(null); setStatus("DRAFT");
        setFeedback(null); setReviewer(null); setReviewedAt(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date, user.team]);

  useEffect(() => { load(); }, [load]);

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
        payload: JSON.stringify({ sections }),
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

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!definition) return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error || "Template could not be loaded."}</div>;

  const locked = status === "APPROVED" || status === "SUBMITTED";

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
          <LayoutTemplate className="h-3.5 w-3.5" /> This report follows the custom format configured by your supervisor / administrator.
        </div>
      )}
      {definition.sections.map(renderSection)}
      {status !== "APPROVED" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" disabled={saving || status === "SUBMITTED"} onClick={() => save(false)} className="k-btn-glass text-slate-200">
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button disabled={saving} onClick={() => save(true)} className="k-btn-primary">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Daily Report
          </Button>
        </div>
      )}
    </div>
  );
}

/** ───────────────────────── TEMPLATE EDITOR (admin & supervisor) ───────────────────────── */
export function TeamLeadTemplateEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [name, setName] = useState("");
  const [def, setDef] = useState<TlDefinition | null>(null);
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<TemplateResponse>(`/api/report-template?key=${TEAM_LEAD_TEMPLATE_KEY}`);
      setDef(res.template.definition);
      setName(res.template.name);
      setIsCustom(res.isCustom);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
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
      await api("/api/report-template", { method: "PUT", body: JSON.stringify({ key: TEAM_LEAD_TEMPLATE_KEY, name, definition: def }) });
      setMessage("Template saved — team leads will now use this format for their daily report.");
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
      await api(`/api/report-template?key=${TEAM_LEAD_TEMPLATE_KEY}`, { method: "DELETE" });
      await load();
      setMessage("Template reset to the shipped default format.");
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><FileCog className="h-5 w-5 text-[#8b7ff5]" /> Team Lead Report Template</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Design the daily report format your team leads fill in. Changes apply immediately to the Team Lead report form{isCustom ? " · custom format in effect" : " · shipped default format"}.
          </p>
        </div>
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
    </div>
  );
}
