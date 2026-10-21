"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtDate, ROLE_LABELS, type UserDTO } from "@/lib/client";
import { EmptyState, StatusBadge } from "@/components/kallmania/shared";
import { Loader2, Target, ListTodo, CalendarDays } from "lucide-react";
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
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
];

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
 */
export function UserKpiDialog({ user: staff, open, setOpen }: { user: UserDTO | { id: string; fullName: string; role: string }; open: boolean; setOpen: (v: boolean) => void }) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-[#17171c] text-slate-100 sm:max-w-2xl">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
