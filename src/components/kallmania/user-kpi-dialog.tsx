"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtDate, ROLE_LABELS, type UserDTO } from "@/lib/client";
import { EmptyState, StatusBadge } from "@/components/kallmania/shared";
import { MemberKpiEditor } from "@/components/kallmania/member-kpi-editor";
import { Loader2, Target, ListTodo, CalendarDays, Settings2, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month" | "year";

interface UserKpiData {
  user: { id: string; fullName: string; email: string; role: string; department: string; team?: string | null; country?: string | null; state?: string | null; city?: string | null };
  period: Period;
  label: string;
  reportCount: number;
  distinctDates: number;
  rows: { key: string; label: string; unit: string; category: string; target: number | null; targetLabel: string; actual: number | null; pct: number | null }[];
  taskStats: { assigned: number; completed: number; open: number; overdue: number };
  recentReports: { id: string; ref: string; type: string; status: string; reportDate: string }[];
  techLabels?: { key: string; label: string }[];
  socialLabels?: { key: string; label: string }[];
  kpiRecords?: { id: string; kpiKey: string; label: string; unit: string; target: number | null; actual: number | null; achievement: number | null; statusLabel: string | null; source: string; reportDate: string; verification: string; revision: number; reportRef: string | null; sbtsEventId: string | null }[];
  kpiRecordSummary?: { kpiKey: string; label: string; actualTotal: number; avgAchievement: number | null; status: string }[];
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
];

interface CumulativeData {
  cumulative: {
    kpis: { kpiKey: string; label: string; unit: string; dailyTarget: number | null; cumulativeTarget: number | null; cumulativeActual: number | null; cumulativeVariance: number | null; achievementPct: number | null; status: string; days: { reported: number; met: number; exceeded: number; missed: number; noData: number } }[];
    weekly: { kpiKey: string; label: string; cumulativeTarget: number | null; cumulativeActual: number | null; achievementPct: number | null }[];
    reporting: { expectedDays: number; reportedDays: number; missingDates: string[]; missingCount: number; consistencyPct: number | null; incompleteExtractionDays: number; supersededSameDay: number; note: string };
    overall: { achievementPct: number | null; basis: string; cumulativeTarget: number | null; cumulativeActual: number | null };
  };
  dailyRecords: { id: string; date: string; kpiKey: string; label: string; unit: string; target: number | null; actual: number | null; variance: number | null; achievement: number | null; statusLabel: string | null; source: string; extractionConfidence: string | null; ref: string | null }[];
}

/** The report-based cumulative engine panel (§2.F math over normalized records).
 *  Yearly maps to a custom Jan 1 → Dec 31 window for the engine API. */
function CumulativePanel({ userId, period, date }: { userId: string; period: Period; date: string }) {
  const [data, setData] = useState<CumulativeData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const q = period === "year"
          ? `period=custom&from=${date.slice(0, 4)}-01-01&to=${date.slice(0, 4)}-12-31`
          : `period=${period}&date=${date}`;
        const d = await api<CumulativeData>(`/api/kpi/cumulative?userId=${userId}&${q}`);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, period, date]);
  if (err) return <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Cumulative engine: {err}</p>;
  if (!data) return <p className="py-2 text-center text-[11px] text-slate-500"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> computing cumulative records…</p>;
  const c = data.cumulative;
  const kpis = showAll ? c.kpis : c.kpis.slice(0, 6);
  return (
    <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#8b7ff5]"><Sigma className="h-3.5 w-3.5" /> Cumulative KPI (calculated records)</p>
        <span className="text-[11px] text-slate-400">
          Overall <span className={cn("font-bold", pctColor(c.overall.achievementPct))}>{c.overall.achievementPct !== null ? `${c.overall.achievementPct}%` : "n/a"}</span>
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500">{c.overall.basis} · Σ{c.overall.cumulativeActual ?? 0} actual vs Σ{c.overall.cumulativeTarget ?? 0} target</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Reporting days", value: `${c.reporting.reportedDays}/${c.reporting.expectedDays}` },
          { label: "Missing reports", value: c.reporting.missingCount },
          { label: "Incomplete extractions", value: c.reporting.incompleteExtractionDays },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/10 px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className={cn("text-sm font-bold tabular-nums", s.label === "Missing reports" && Number(s.value) > 0 ? "text-amber-400" : "text-slate-100")}>{s.value}</p>
          </div>
        ))}
      </div>
      {c.reporting.missingDates.length > 0 && (
        <p className="text-[10px] text-amber-400/90">Missing on: {c.reporting.missingDates.slice(0, 8).join(", ")}{c.reporting.missingDates.length > 8 ? "…" : ""} — flagged, never counted as zero.</p>
      )}
      {c.reporting.supersededSameDay > 0 && <p className="text-[10px] text-slate-500">{c.reporting.supersededSameDay} same-day duplicate record(s) collapsed (latest wins).</p>}
      <div className="space-y-1.5">
        {kpis.map((k) => (
          <div key={k.kpiKey} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-slate-200">{k.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="text-slate-200">{fmtVal(k.cumulativeActual, k.unit)}</span>
                <span className="text-slate-500"> / Σ{fmtVal(k.cumulativeTarget, k.unit)}</span>
                {k.cumulativeVariance !== null && <span className={cn("ml-1 font-semibold", k.cumulativeVariance >= 0 ? "text-emerald-400" : "text-rose-400")}>({k.cumulativeVariance >= 0 ? "+" : ""}{k.cumulativeVariance})</span>}
                <span className={cn("ml-1.5 font-bold", pctColor(k.achievementPct))}>{k.achievementPct !== null ? `${k.achievementPct}%` : k.status === "NO_DATA" ? "no data" : "no target"}</span>
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {k.days.reported} reported day(s) · {k.days.exceeded} exceeded · {k.days.met} met · {k.days.missed} missed{k.days.noData > 0 ? ` · ${k.days.noData} NOT REPORTED` : ""}
            </p>
          </div>
        ))}
        {c.kpis.length > 6 && (
          <button onClick={() => setShowAll((v) => !v)} className="w-full rounded-lg border border-white/10 py-1 text-[11px] text-slate-400 hover:bg-white/5">
            {showAll ? "Show less" : `Show all ${c.kpis.length} KPIs`}
          </button>
        )}
      </div>
      {c.weekly.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[10px] font-semibold uppercase text-slate-500">Weekly scoreboard rows (kept separately, never daily-summed)</summary>
          <div className="mt-1.5 space-y-1">
            {c.weekly.map((k) => (
              <div key={k.kpiKey} className="flex justify-between gap-2 rounded border border-white/10 px-2 py-1 text-[10px]">
                <span className="truncate text-slate-400">{k.label}</span>
                <span className="shrink-0 tabular-nums text-slate-300">{fmtVal(k.cumulativeActual, "count")} / {fmtVal(k.cumulativeTarget, "count")}{k.achievementPct !== null ? ` · ${k.achievementPct}%` : ""}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function pctColor(pct: number | null): string {
  if (pct === null) return "text-slate-500";
  if (pct >= 100) return "text-emerald-400";
  if (pct >= 80) return "text-amber-400";
  return "text-rose-400";
}

function fmtVal(v: number | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "percent") return `${v}%`;
  if (unit === "minutes") return `${v}m`;
  return String(v);
}

/**
 * Per-staff KPI performance dialog — click any user in User Management (or the
 * centre panel) to inspect their KPI achievement daily / weekly / monthly / yearly.
 * Managers (admin / supervisor / team lead) also get the individual KPI
 * configuration editor inside the dialog.
 */
export function UserKpiDialog({ user: staff, viewer, open, setOpen }: { user: UserDTO | { id: string; fullName: string; role: string }; viewer?: { id: string; role: string; team?: string | null; department?: string }; open: boolean; setOpen: (v: boolean) => void }) {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<UserKpiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await api<UserKpiData>(`/api/users/${staff.id}/kpi?period=${period}&date=${date}`);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) { setData(null); setError((e as Error).message); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, staff.id, period, date]);

  const coreRows = data?.rows.filter((r) => r.category !== "EMAIL_EXTENSION") ?? [];
  const emailRows = data?.rows.filter((r) => r.category === "EMAIL_EXTENSION" && r.actual !== null) ?? [];
  const viewerIsManager = !!viewer && ["ADMIN", "SUPERVISOR", "TEAM_LEAD"].includes(viewer.role) && viewer.id !== staff.id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-popover text-popover-foreground text-slate-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-white">
            <Target className="h-4.5 w-4.5 text-[#e8935a]" />
            KPI performance — {staff.fullName}
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">{ROLE_LABELS[staff.role] || staff.role}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn("px-3 py-1.5 text-xs font-semibold transition-colors", period === p.key ? "bg-[#e8935a] text-[#1a120b]" : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200")}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-8 w-36 border-white/12 bg-white/[0.055] text-xs text-slate-200" />
          {data && <span className="ml-auto text-[11px] text-slate-500">{data.label} · {data.reportCount} report(s)</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>
        ) : !data ? (
          <EmptyState title="No data" />
        ) : (
          <div className="space-y-4">
            {/* Task stats strip */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Tasks assigned", value: data.taskStats.assigned },
                { label: "Completed", value: data.taskStats.completed },
                { label: "Open", value: data.taskStats.open },
                { label: "Overdue", value: data.taskStats.overdue },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-center">
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                  <p className="text-base font-bold tabular-nums text-slate-100">{s.value}</p>
                </div>
              ))}
            </div>

            {coreRows.length > 0 ? (
              <div className="space-y-2.5">
                {coreRows.map((k) => (
                  <div key={k.key}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-slate-300">{k.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-400">
                        {fmtVal(k.actual, k.unit)} / {k.targetLabel}{" "}
                        <span className={cn("ml-1 font-semibold", pctColor(k.pct))}>{k.pct !== null ? `${k.pct}%` : ""}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={cn("h-full rounded-full", (k.pct || 0) >= 100 ? "bg-emerald-400" : (k.pct || 0) >= 80 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${Math.min(100, k.pct || 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No KPI reports in this period" hint="Cumulative KPIs build up from submitted/approved daily reports." />
            )}

            {emailRows.length > 0 && (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold uppercase text-[#eda06a]">Email activity ({emailRows.length} filled)</summary>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {emailRows.map((m) => (
                    <div key={m.key} className="rounded border border-white/10 px-2 py-1.5 text-[11px]">
                      <p className="truncate text-slate-500">{m.label}</p>
                      <p className="font-semibold text-slate-200">{fmtVal(m.actual, m.unit)}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {!!data.kpiRecords?.length && (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold uppercase text-[#8b7ff5]">
                  KPI records ({data.kpiRecords.length} · incl. {data.kpiRecords.filter((r) => r.source === "SBTS").length} from Media Scoreboard)
                </summary>
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                  {data.kpiRecords.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px]">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-200">{rec.label}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          {new Date(rec.reportDate).toISOString().slice(0, 10)} · {rec.source === "SBTS" ? `Media Scoreboard${rec.sbtsEventId ? ` · ${rec.sbtsEventId.slice(0, 10)}…` : ""}` : rec.reportRef ? `report ${rec.reportRef}` : rec.source}{rec.revision > 1 ? ` · corrected (rev ${rec.revision})` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-slate-200">{fmtVal(rec.actual, rec.unit)}{rec.target !== null ? <span className="text-slate-500"> / {fmtVal(rec.target, rec.unit)}</span> : ""}</p>
                        <p className={cn("text-[10px] font-semibold", rec.achievement === null ? "text-slate-500" : pctColor(rec.achievement))}>
                          {rec.achievement !== null ? `${rec.achievement}%` : rec.statusLabel === "NO_TARGET" ? "no target" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <CumulativePanel userId={staff.id} period={period} date={date} />

            {data.recentReports.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#eda06a]"><ListTodo className="h-3.5 w-3.5" /> Recent reports</p>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {data.recentReports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs">
                      <span className="font-mono text-[#eda06a]">{r.ref}</span>
                      <span className="text-slate-400">{fmtDate(r.reportDate)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewerIsManager && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#eda06a]"><Settings2 className="h-3.5 w-3.5" /> Individual KPI configuration</p>
                <MemberKpiEditor staff={staff} me={{ id: viewer.id, role: viewer.role, team: viewer.team ?? null, department: viewer.department }} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
