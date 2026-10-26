"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtDate, DEPT_LABELS, todayISO } from "@/lib/client";
import { SectionCard, EmptyState } from "@/components/kallmania/shared";
import { Country, State } from "country-state-city";
import { CalendarRange, Globe2, Loader2, MapPin, TrendingUp } from "lucide-react";

type Period = "day" | "week" | "month" | "year";

interface CumRow {
  key: string;
  label: string;
  unit: string;
  category: string;
  dailyTarget: number | null;
  target: number | null;
  targetLabel: string;
  actual: number | null;
  pct: number | null;
}

interface KpiSummary {
  period: Period;
  label: string;
  start: string;
  end: string;
  periodDays: number;
  reportCount: number;
  distinctDates: number;
  rows: CumRow[];
  techTotals: Record<string, number>;
  socialTotals: Record<string, number>;
  byEmployee: { userId: string; userName: string; department: string; reports: number; callsMade: number; callsConnected: number; mailsSent: number; leads: number; tasksCompleted: number; postsPublished: number }[];
  techLabels: { key: string; label: string }[];
  socialLabels: { key: string; label: string }[];
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

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: "day", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "year", label: "Yearly" },
  ];
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/10">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === o.key ? "bg-[#e8935a] text-[#1a120b]" : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Multi-period cumulative KPI performance panel (day / week / month).
 * Employees see their own cumulative KPIs; supervisors/admins see team-wide
 * cumulative KPIs plus a per-employee breakdown.
 */
export default function PeriodKpiPanel({ role, userRole }: { role: string; userRole?: string }) {
  const effectiveRole = userRole ?? role;
  const isSupervisor = effectiveRole === "SUPERVISOR" || effectiveRole === "ADMIN";
  const isTech = effectiveRole === "DEVELOPER";
  const isSocial = effectiveRole === "SOCIAL_MEDIA";

  const [period, setPeriod] = useState<Period>("week");
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  // Admin centre drill-down: choose the country + state whose KPIs to inspect
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const isAdmin = effectiveRole === "ADMIN";
  const allCountries = Country.getAllCountries().slice().sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period, date });
        if (isAdmin && (country || state)) {
          if (country) params.set("country", country);
          if (state) params.set("state", state);
        }
        const d = await api<KpiSummary>(`/api/kpi/summary?${params}`);
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, date, effectiveRole, isAdmin, country, state]);

  const coreRows = data?.rows.filter((r) => r.category !== "EMAIL_EXTENSION") ?? [];
  const emailRows = data?.rows.filter((r) => r.category === "EMAIL_EXTENSION" && r.actual !== null) ?? [];

  const subtitle =
    period === "day"
      ? `Cumulative performance for ${fmtDate(date)}`
      : period === "week"
        ? `Cumulative Mon–Sun week containing ${fmtDate(date)}`
        : period === "year"
          ? `Cumulative totals for the whole year of ${fmtDate(date)}`
          : `Cumulative totals for ${fmtDate(date)} (whole month)`;

  return (
    <SectionCard
      title="Performance — cumulative KPIs"
      subtitle={subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <Select value={country || undefined} onValueChange={(v) => { setCountry(v === "__all__" ? "" : v); setState(""); }}>
                <SelectTrigger className="h-8 w-auto min-w-36 max-w-72 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><Globe2 className="mr-2 h-3.5 w-3.5 shrink-0 text-[#eda06a]" /><span className="truncate">{country ? allCountries.find((c) => c.isoCode === country)?.name : "All countries"}</span></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__all__">All countries</SelectItem>
                  {allCountries.map((c) => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={state || undefined} onValueChange={(v) => setState(v === "__all__" ? "" : v)} disabled={!country}>
                <SelectTrigger className="h-8 w-auto min-w-36 max-w-72 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-[#eda06a]" /><span className="truncate">{state || "All states"}</span></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__all__">All states</SelectItem>
                  {(country ? State.getStatesOfCountry(country) : []).map((s) => <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
          <PeriodToggle period={period} onChange={setPeriod} />
          <Input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-8 w-36 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"
          />
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !data ? (
        <EmptyState icon={<CalendarRange className="h-7 w-7" />} title="No KPI data" hint="Could not load cumulative KPI data." />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-[#8b7ff5]" /> {data.label}</span>
            <span>{data.reportCount} report{data.reportCount === 1 ? "" : "s"} · {data.distinctDates} day{data.distinctDates === 1 ? "" : "s"} with data</span>
            {data.distinctDates > 1 && <span>count targets scale by days with data</span>}
          </div>

          {/* BPO agent / team cumulative KPI rows */}
          {coreRows.length > 0 && (
            <div className="space-y-2.5">
              {coreRows.map((k) => (
                <div key={k.key}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-300">{k.label}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {fmtVal(k.actual, k.unit)} / {k.targetLabel}{" "}
                      <span className={`ml-1 font-semibold ${pctColor(k.pct)}`}>{k.pct !== null ? `${k.pct}%` : ""}</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${(k.pct || 0) >= 100 ? "bg-emerald-400" : (k.pct || 0) >= 80 ? "bg-amber-400" : "bg-rose-400"}`}
                      style={{ width: `${Math.min(100, k.pct || 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {coreRows.length === 0 && !isTech && !isSocial && (
            <EmptyState title={`No submitted KPI reports ${period === "day" ? "on this day" : period === "week" ? "in this week" : "in this month"}`} hint="Cumulative KPIs build up from submitted/approved daily reports." />
          )}

          {/* Tech / social employee: own cumulative summary metrics */}
          {(isTech || isSocial) && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(isTech ? data.techLabels : data.socialLabels).map((l) => (
                <div key={l.key} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <p className="truncate text-[10px] text-slate-500">{l.label}</p>
                  <p className="text-sm font-bold tabular-nums text-slate-100">{(isTech ? data.techTotals : data.socialTotals)[l.key] ?? 0}</p>
                </div>
              ))}
            </div>
          )}

          {/* Supervisor: tech + social dept totals */}
          {isSupervisor && (Object.keys(data.techTotals).length > 0 || Object.keys(data.socialTotals).length > 0) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.techTotals.tasksCompleted !== undefined && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] text-slate-500">Tech tasks completed</p>
                  <p className="text-sm font-bold tabular-nums text-slate-100">{data.techTotals.tasksCompleted}</p>
                </div>
              )}
              {data.techTotals.bugsResolved !== undefined && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] text-slate-500">Bugs resolved</p>
                  <p className="text-sm font-bold tabular-nums text-slate-100">{data.techTotals.bugsResolved}</p>
                </div>
              )}
              {data.socialTotals.postsPublished !== undefined && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] text-slate-500">Posts published</p>
                  <p className="text-sm font-bold tabular-nums text-slate-100">{data.socialTotals.postsPublished}</p>
                </div>
              )}
              {data.socialTotals.reach !== undefined && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] text-slate-500">Total reach</p>
                  <p className="text-sm font-bold tabular-nums text-slate-100">{data.socialTotals.reach}</p>
                </div>
              )}
            </div>
          )}

          {/* Supervisor: per-employee cumulative breakdown */}
          {isSupervisor && data.byEmployee.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b3a5ff]">▸ Per-employee totals ({period})</p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-white/[0.03]">
                      <TableHead className="text-[11px] text-slate-400">Employee</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Dept</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Reports</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Calls</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Connected</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Emails</TableHead>
                      <TableHead className="text-[11px] text-slate-400">Leads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byEmployee.map((e) => (
                      <TableRow key={e.userId} className="border-white/5">
                        <TableCell className="py-2 text-xs font-medium text-slate-200">{e.userName}</TableCell>
                        <TableCell className="py-2 text-[11px] text-slate-400">{DEPT_LABELS[e.department]?.split(" & ")[0] || e.department}</TableCell>
                        <TableCell className="py-2 text-xs tabular-nums text-slate-300">{e.reports}</TableCell>
                        <TableCell className="py-2 text-xs tabular-nums text-slate-300">{e.callsMade || "—"}</TableCell>
                        <TableCell className="py-2 text-xs tabular-nums text-slate-300">{e.callsConnected || "—"}</TableCell>
                        <TableCell className="py-2 text-xs tabular-nums text-slate-300">{e.mailsSent || "—"}</TableCell>
                        <TableCell className="py-2 text-xs font-semibold tabular-nums text-emerald-300">{e.leads || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Email extension rows (collapsed by default) */}
          {emailRows.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[11px] font-semibold uppercase text-[#8b7ff5]">Email activity totals ({emailRows.length} filled)</summary>
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
        </div>
      )}
    </SectionCard>
  );
}
