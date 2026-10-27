"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, DEPT_LABELS, type SessionUser } from "@/lib/client";
import { PageHeader, SectionCard, EmptyState } from "@/components/kallmania/shared";
import { achievementTone } from "@/lib/kpi-aggregate";
import { Loader2, CalendarDays, TrendingUp, PhoneCall, Share2, MonitorSmartphone, Users, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly";

interface AggKpiDTO {
  key: string; label: string; unit: "count" | "percent" | "minutes"; kind: "sum" | "rate" | "avg";
  targetDaily: number | null; periodTarget: number | null; actual: number | null;
  achievement: number | null; status: string; sampleCount: number;
}
interface SectionDTO { department: string; reportCount: number; daysWithReports: number; overall: number | null; kpis: AggKpiDTO[] }
interface OverviewDTO { period: Period; label: string; daysElapsed: number; daysTotal: number; reportCount: number; achievement: number | null; kpisTracked: number; kpisWithData: number }
interface TrendDTO { label: string; start: string; end: string; reportCount: number; achievement: number | null; highlights: Record<string, number> }

interface KpiResponse {
  scope: "team" | "mine";
  period: Period;
  date: string;
  department: string;
  range: { label: string; daysElapsed: number; daysTotal: number };
  overview: OverviewDTO[];
  sections: SectionDTO[];
  trends: TrendDTO[];
}

const STATUS_STYLE: Record<string, string> = {
  exceeded: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  on_track: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  at_risk: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  below: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  no_data: "bg-white/5 text-zinc-400 border-white/10",
  no_target: "bg-white/5 text-zinc-400 border-white/10",
};
const STATUS_LABEL: Record<string, string> = {
  exceeded: "Exceeded", on_track: "On Track", at_risk: "At Risk", below: "Below Target", no_data: "No Data", no_target: "No Target",
};

const PERIOD_TABS: { key: Period; label: string; hint: string }[] = [
  { key: "daily", label: "Daily", hint: "Single day" },
  { key: "weekly", label: "Weekly", hint: "Mon–Sun cumulative" },
  { key: "monthly", label: "Monthly", hint: "Month-to-date cumulative" },
];

function fmtMetric(v: number | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "percent") return `${v}%`;
  if (unit === "minutes") return `${v}m`;
  return v.toLocaleString();
}

export default function KpiView({ user }: { user: SessionUser }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState("ALL");
  const [data, setData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupervisor = user.role === "SUPERVISOR" || user.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api<KpiResponse>(`/api/kpi?period=${period}&date=${date}&department=${department}`);
        if (!cancelled) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, date, department, isSupervisor]);

  const headline = useMemo(() => {
    if (!data) return { calls: null as number | null, leads: null as number | null, posts: null as number | null, tech: null as number | null };
    let calls = null as number | null, leads = null as number | null, posts = null as number | null, tech = null as number | null;
    for (const s of data.sections) {
      for (const k of s.kpis) {
        if (k.actual === null) continue;
        if (k.key === "totalCallsMade") calls = (calls || 0) + k.actual;
        if (k.key === "leadsGenerated") leads = (leads || 0) + k.actual;
        if (k.key === "postsPublished" || k.key === "postsCreated") posts = (posts || 0) + k.actual;
        if (k.key === "tasksCompleted") tech = (tech || 0) + k.actual;
      }
    }
    return { calls, leads, posts, tech };
  }, [data]);

  const selectedOverview = data?.overview.find((o) => o.period === period);

  return (
    <div>
      <PageHeader
        title="KPI Analytics"
        subtitle={isSupervisor
          ? "Cumulative team performance — daily, weekly and monthly KPI achievement"
          : "Your cumulative performance — daily, weekly and monthly KPI achievement"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-[#131316] px-2.5 text-xs text-zinc-200"
            />
            {isSupervisor && (
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9 w-44 border-white/10 bg-[#131316] text-xs text-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All departments</SelectItem>
                  <SelectItem value="BPO">BPO & Outbound Call Centre</SelectItem>
                  <SelectItem value="WEB_DEV">Web Development & Technical</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      {/* Period tabs */}
      <div className="mb-5 inline-flex rounded-xl border border-white/[0.08] bg-[#131316] p-1">
        {PERIOD_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              period === t.key ? "bg-[#5b8def] text-white shadow-[0_2px_10px_rgba(91,141,239,0.4)]" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {t.label}
            <span className="ml-1.5 hidden text-[10px] font-normal opacity-70 sm:inline">{t.hint}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data ? (
        <EmptyState title="Could not load KPI data" hint="Please try again." />
      ) : (
        <div className="space-y-5">
          {/* Cumulative overview cards — Day / Week / Month */}
          <div className="grid gap-4 sm:grid-cols-3">
            {data.overview.map((o) => {
              const pct = o.achievement;
              const active = o.period === period;
              const tone = pct === null ? "text-zinc-500" : pct >= 100 ? "text-emerald-300" : pct >= 85 ? "text-sky-300" : pct >= 70 ? "text-amber-300" : "text-rose-300";
              return (
                <button
                  key={o.period}
                  onClick={() => setPeriod(o.period)}
                  className={cn(
                    "k-card p-5 text-left transition-all",
                    active ? "ring-2 ring-[#5b8def]/60" : "opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {o.period === "daily" ? "Daily" : o.period === "weekly" ? "Weekly" : "Monthly"} cumulative
                    </p>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                      {o.period === "daily" ? "1 day" : `${o.daysElapsed}/${o.daysTotal} days`}
                    </span>
                  </div>
                  <p className={cn("mt-3 text-4xl font-bold tabular-nums", tone)}>
                    {pct !== null ? `${pct}%` : "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-600">{o.label}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className={cn("h-full rounded-full", pct === null ? "bg-zinc-600" : pct >= 100 ? "bg-emerald-400" : pct >= 85 ? "bg-sky-400" : pct >= 70 ? "bg-amber-400" : "bg-rose-400")}
                      style={{ width: `${Math.min(100, pct || 0)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    {o.reportCount} report{o.reportCount === 1 ? "" : "s"} · {o.kpisWithData}/{o.kpisTracked} KPIs tracked
                  </p>
                </button>
              );
            })}
          </div>

          {/* Headline cumulative outputs for the selected period */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile icon={<PhoneCall className="h-4 w-4" />} label="Calls made" value={headline.calls} sub={data.range.label} />
            <StatTile icon={<Users className="h-4 w-4" />} label="Leads generated" value={headline.leads} sub="Hot + warm" />
            <StatTile icon={<Share2 className="h-4 w-4" />} label="Posts published" value={headline.posts} sub="Social media" />
            <StatTile icon={<MonitorSmartphone className="h-4 w-4" />} label="Tech tasks completed" value={headline.tech} sub="Web dev team" />
          </div>

          {/* Trend chart */}
          <SectionCard
            title={period === "daily" ? "Achievement trend — last 14 days" : period === "weekly" ? "Achievement trend — last 8 weeks" : "Achievement trend — last 6 months"}
            subtitle="Overall KPI achievement per period, averaged across departments with data"
          >
            <AchievementTrendChart buckets={data.trends} />
          </SectionCard>

          {/* Department cumulative KPI tables */}
          {data.sections.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-8 w-8" />}
              title={`No ${period} KPI data yet`}
              hint="Cumulative KPIs appear as soon as daily reports are submitted and approved within the selected period."
            />
          ) : (
            data.sections.map((s) => (
              <SectionCard
                key={s.department}
                title={isSupervisor ? DEPT_LABELS[s.department] || s.department : "My performance"}
                subtitle={`${s.reportCount} report${s.reportCount === 1 ? "" : "s"} · ${s.daysWithReports} day${s.daysWithReports === 1 ? "" : "s"} with data · ${data.range.label}`}
                actions={
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">Overall</span>
                    <span className={cn("rounded-lg border px-2.5 py-1 text-sm font-bold tabular-nums", achievementTone(s.overall))}>
                      {s.overall !== null ? `${s.overall}%` : "—"}
                    </span>
                  </div>
                }
              >
                <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 bg-white/[0.03]">
                        <TableHead className="text-[11px] text-zinc-500">KPI metric</TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Daily target</TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Period target</TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Cumulative actual</TableHead>
                        <TableHead className="min-w-[140px] text-[11px] text-zinc-500">Achievement</TableHead>
                        <TableHead className="text-[11px] text-zinc-500">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.kpis.map((k) => (
                        <TableRow key={k.key} className="border-white/5">
                          <TableCell className="py-2.5 text-xs font-medium text-zinc-200">{k.label}</TableCell>
                          <TableCell className="py-2.5 text-xs tabular-nums text-zinc-500">
                            {k.targetDaily !== null ? fmtMetric(k.targetDaily, k.unit) : "—"}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs tabular-nums text-zinc-400">
                            {k.periodTarget !== null ? fmtMetric(k.periodTarget, k.unit) : "—"}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs font-semibold tabular-nums text-zinc-100">
                            {fmtMetric(k.actual, k.unit)}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    k.achievement === null ? "bg-zinc-600"
                                      : k.achievement >= 100 ? "bg-emerald-400"
                                      : k.achievement >= 85 ? "bg-sky-400"
                                      : k.achievement >= 70 ? "bg-amber-400" : "bg-rose-400"
                                  )}
                                  style={{ width: `${Math.min(100, k.achievement || 0)}%` }}
                                />
                              </div>
                              <span className={cn("text-xs font-semibold tabular-nums", achievementTone(k.achievement))}>
                                {k.achievement !== null ? `${k.achievement}%` : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLE[k.status] || STATUS_STYLE.no_data)}>
                              {STATUS_LABEL[k.status] || k.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-zinc-600">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Period target = daily target × {data.range.daysElapsed} day{data.range.daysElapsed === 1 ? "" : "s"} elapsed. Rates (%, talk time) use the daily target — they don&apos;t accumulate.
                </p>
              </SectionCard>
            ))
          )}

          {selectedOverview && selectedOverview.reportCount === 0 && (
            <div className="k-card flex items-center gap-3 border-amber-500/30 p-4">
              <CalendarDays className="h-5 w-5 shrink-0 text-amber-300" />
              <p className="text-xs text-amber-200">
                No reports found for <span className="font-semibold">{data.range.label}</span>. Cumulative KPIs build up automatically as reports are submitted and approved.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | null; sub?: string }) {
  return (
    <div className="k-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <span className="k-icon-bubble h-8 w-8">{icon}</span>
      </div>
      <p className="mt-2.5 text-2xl font-bold tabular-nums text-zinc-100">{value !== null ? value.toLocaleString() : "—"}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-600">{sub}</p>}
    </div>
  );
}

/* SVG achievement trend chart */
function AchievementTrendChart({ buckets }: { buckets: TrendDTO[] }) {
  const W = 620, H = 200, padL = 34, padB = 24, padT = 12;
  const innerW = W - padL - 10, innerH = H - padB - padT;
  const barW = Math.min(34, innerW / buckets.length - 10);

  if (buckets.every((b) => b.achievement === null && b.reportCount === 0)) {
    return <EmptyState title="No trend data yet" hint="Trends appear as reports are submitted over time." />;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full">
        {[0, 0.5, 1].map((g) => {
          const y = padT + innerH * (1 - g);
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - 8} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-zinc-600" fontSize="9">{g * 100}%</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const pct = b.achievement ?? 0;
          const h = Math.max(b.achievement === null ? 2 : 3, Math.min(1, pct / 100) * innerH);
          const x = padL + (innerW / buckets.length) * i + (innerW / buckets.length - barW) / 2;
          const y = padT + innerH - h;
          const fill = b.achievement === null ? "rgba(255,255,255,0.08)" : pct >= 100 ? "#4ade80" : pct >= 85 ? "#5b8def" : pct >= 70 ? "#fbbf24" : "#f87171";
          const isLast = i === buckets.length - 1;
          return (
            <g key={`${b.start}-${i}`}>
              <rect x={x} y={y} width={barW} height={h} rx={Math.min(6, barW / 2.8)} fill={fill} opacity={isLast ? 1 : 0.65}>
                <title>{`${b.label}: ${b.achievement !== null ? `${b.achievement}% achievement` : "no data"} · ${b.reportCount} report(s)`}</title>
              </rect>
              {b.achievement !== null && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" className="fill-zinc-500" fontSize="8.5" fontWeight="600">{b.achievement}%</text>
              )}
              <text x={x + barW / 2} y={H - 7} textAnchor="middle" className="fill-zinc-600" fontSize="9">{b.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> ≥100%</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#5b8def]" /> 85–99%</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> 70–84%</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" /> &lt;70%</span>
      </div>
    </div>
  );
}
