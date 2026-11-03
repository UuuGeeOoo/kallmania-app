"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, type SessionUser } from "@/lib/client";
import { cn } from "@/lib/utils";
import { AgentReportView, CentreReportView, TeamReportView } from "./intel-report-view";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BrainCircuit, Building2, Download, FileSpreadsheet, Loader2, RefreshCw, Users } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL INTELLIGENCE & PERFORMANCE REPORTS — administrator-only module.
// Tabs: Overview dashboard · Individual agent report · Team report · Centre
// report · Exports & activity. Every figure comes from /api/intel/* (ADMIN
// enforced server-side; generation/view/export audited).
// ─────────────────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "custom", label: "Custom range" },
];

interface Meta {
  centres: { country: string; state: string; staff: number }[];
  teams: { key: string; label: string; agents: number }[];
  supervisors: { id: string; name: string }[];
  teamLeads: { id: string; name: string; team: string | null; country: string | null; state: string | null }[];
  agents: { id: string; name: string; role: string; team: string | null; country: string | null; state: string | null }[];
}

interface Overview {
  period: { label: string };
  stats: Record<string, number>;
  teamComparison: { team: string; label: string; agents: number; meanKpiAchPct: number | null; meanScore: number | null; overdue: number; compliancePct: number | null }[];
  trend: { label: string; submitted: number; kpiPct: number | null; tasksCompleted: number }[];
  roster: { team: string; label: string; agents: number }[];
  topAgents: { id: string; name: string; team: string | null; score: number | null; classification: string; kpiPct: number | null }[];
  attentionAgents: { id: string; name: string; team: string | null; kpiPct: number | null; overdue: number; classification: string }[];
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("k-card p-4 sm:p-5", className)}>{children}</div>;
}

function StatCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-black leading-none", tone === "good" && "text-emerald-400", tone === "warn" && "text-amber-400", tone === "bad" && "text-rose-400", !tone && "text-slate-100")}>{value}</p>
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin text-[#8b7ff5]" /> {label}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-14 text-center">
      <BrainCircuit className="h-8 w-8 text-slate-600" />
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="max-w-md text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {message}
    </p>
  );
}

const selCls = "h-8 w-[150px] rounded-lg border border-white/12 bg-white/[0.055] text-xs text-slate-200 backdrop-blur";

export default function IntelView({ user }: { user: SessionUser }) {
  const [tab, setTab] = useState<"overview" | "agent" | "team" | "centre" | "exports">("overview");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);

  // filters
  const [period, setPeriod] = useState("this-month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [state_, setState_] = useState("");
  const [team, setTeam] = useState("");
  const [accountStatus, setAccountStatus] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("period", period);
    if (period === "custom" && from) p.set("from", from);
    if (period === "custom" && to) p.set("to", to);
    if (country) p.set("country", country);
    if (state_) p.set("state", state_);
    if (team) p.set("team", team);
    if (accountStatus) p.set("accountStatus", accountStatus);
    return p;
  }, [period, from, to, country, state_, team, accountStatus]);

  useEffect(() => {
    setMetaErr(null);
    api<Meta>("/api/intel/meta")
      .then(setMeta)
      .catch((e) => setMetaErr((e as Error).message));
  }, []);

  const centreStates = useMemo(() => {
    if (!meta) return [];
    return meta.centres.filter((c) => (country ? c.country === country : true));
  }, [meta, country]);

  const filteredAgents = useMemo(() => {
    if (!meta) return [];
    return meta.agents.filter((a) =>
      (country ? a.country === country : true) &&
      (state_ ? a.state === state_ : true) &&
      (team ? a.team === team : true),
    );
  }, [meta, country, state_, team]);

  const filteredTeams = useMemo(() => {
    if (!meta) return [];
    return meta.teams.filter((t) => (country || state_ ? t.agents > 0 || meta.agents.some((a) => a.team === t.key && (country ? a.country === country : true) && (state_ ? a.state === state_ : true)) : true));
  }, [meta, country, state_]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black text-white">
            <BrainCircuit className="h-5 w-5 text-[#eda06a]" /> Operational Intelligence &amp; Performance Reports
          </h1>
          <p className="text-xs text-slate-500">Administrator analytics over existing application records — individual, team and centre-wide operational reports with Excel exports.</p>
        </div>
        <Badge variant="outline" className="border-[#e8935a]/40 text-[#eda06a]">Administrators only</Badge>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5">
        {([["overview", "Overview"], ["agent", "Individual Agent Report"], ["team", "Team Report"], ["centre", "Centre Report"], ["exports", "Exports & Activity"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition",
              tab === k ? "bg-[#e8935a]/15 text-[#c2641f] dark:text-[#f0b285]" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <Card className="!py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filters</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className={selCls}><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          {period === "custom" && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px] border-white/12 bg-white/[0.055] text-xs text-slate-200" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px] border-white/12 bg-white/[0.055] text-xs text-slate-200" />
            </>
          )}
          <Select value={country || "all"} onValueChange={(v) => { setCountry(v === "all" ? "" : v); setState_(""); }}>
            <SelectTrigger className={selCls}><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {[...new Set((meta?.centres ?? []).map((c) => c.country))].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={state_ || "all"} onValueChange={(v) => setState_(v === "all" ? "" : v)}>
            <SelectTrigger className={selCls}><SelectValue placeholder="Centre (state)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All centres</SelectItem>
              {centreStates.map((c) => <SelectItem key={`${c.country}-${c.state}`} value={c.state!}>{c.state}{c.country ? `, ${c.country}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={team || "all"} onValueChange={(v) => setTeam(v === "all" ? "" : v)}>
            <SelectTrigger className={selCls}><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {filteredTeams.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={accountStatus || "all"} onValueChange={(v) => setAccountStatus(v === "all" ? "" : v)}>
            <SelectTrigger className={selCls}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["APPROVED", "PENDING", "SUSPENDED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {metaErr && <div className="mt-2"><ErrorNote message={metaErr} /></div>}
      </Card>

      {tab === "overview" && <OverviewTab params={params} />}
      {tab === "agent" && <AgentTab meta={meta} params={params} agents={filteredAgents} />}
      {tab === "team" && <TeamTab meta={meta} params={params} />}
      {tab === "centre" && <CentreTab params={params} />}
      {tab === "exports" && <ExportsTab user={user} />}
    </div>
  );
}

// ── Overview dashboard ──
function OverviewTab({ params }: { params: URLSearchParams }) {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    api<Overview>(`/api/intel/overview?${params.toString()}`)
      .then(setData)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <Loading label="Crunching operational records…" />;
  if (err) return <ErrorNote message={err} />;
  if (!data) return null;
  const s = data.stats;
  const hasData = s.agentsWithData > 0 || s.tasksAssigned > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{data.period.label} · roster: {data.roster.map((r) => `${r.label} ${r.agents}`).join(" · ") || "no agents in scope"}</p>
        <Button variant="ghost" size="sm" onClick={load} className="h-7 gap-1.5 text-xs text-slate-400"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      </div>

      {!hasData ? (
        <EmptyState title="No operational records in this scope" hint="Widen the filters (centre / team / period) or wait for reports and tasks to be filed. Missing data is never fabricated." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Agents (active)" value={`${s.agentsActive}/${s.agentsRegistered}`} hint={`${s.agentsInactive} inactive`} />
            <StatCard label="Supervisors" value={String(s.supervisors)} hint={`${s.teamLeads} team leads`} />
            <StatCard label="Teams" value={String(s.teams)} />
            <StatCard label="Tasks assigned" value={String(s.tasksAssigned)} hint={`${s.tasksCompleted} completed · ${s.tasksPending} pending`} />
            <StatCard label="Overdue tasks" value={String(s.tasksOverdue)} tone={s.tasksOverdue > 0 ? "bad" : "good"} />
            <StatCard label="Overall KPI achievement" value={s.overallKpiAchPct !== null ? `${s.overallKpiAchPct}%` : "—"} tone={s.overallKpiAchPct === null ? undefined : s.overallKpiAchPct >= 80 ? "good" : s.overallKpiAchPct >= 60 ? "warn" : "bad"} />
            <StatCard label="Avg team performance" value={s.avgTeamPerformance !== null ? String(s.avgTeamPerformance) : "—"} hint="transparent 0–100 score" />
            <StatCard label="Task completion rate" value={s.agentCompletionRatePct !== null ? `${s.agentCompletionRatePct}%` : "—"} />
            <StatCard label="Meeting KPI targets" value={String(s.agentsMeetingTargets)} tone="good" />
            <StatCard label="Below KPI targets" value={String(s.agentsBelowTargets)} tone={s.agentsBelowTargets > 0 ? "warn" : "good"} />
            <StatCard label="Improving" value={String(s.agentsImproving)} tone="good" hint="vs previous period" />
            <StatCard label="Declining" value={String(s.agentsDeclining)} tone={s.agentsDeclining > 0 ? "bad" : "good"} hint="vs previous period" />
          </div>

          <Card>
            <p className="text-sm font-bold text-slate-100">Application activity &amp; KPI trend</p>
            <p className="mb-3 text-[11px] text-slate-500">Weekly buckets: submitted reports, KPI achievement (roster method — Σ per-agent targets × agent-days) and tracked task completions.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8935a" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#e8935a" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" />
                  <Tooltip contentStyle={{ background: "#11141c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} labelStyle={{ color: "#e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area yAxisId="l" type="monotone" dataKey="submitted" name="Reports submitted" stroke="#e8935a" fill="url(#gSub)" strokeWidth={2} />
                  <Area yAxisId="l" type="monotone" dataKey="tasksCompleted" name="Tasks completed (tracked)" stroke="#8b7ff5" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
                  <Area yAxisId="r" type="monotone" dataKey="kpiPct" name="KPI achievement %" stroke="#34d399" fill="transparent" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-bold text-slate-100">Team comparison</p>
            <p className="mb-3 text-[11px] text-slate-500">Mean per-agent KPI achievement and mean performance score per team (rankings need ≥50 weight points of data).</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.teamComparison} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#11141c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="meanKpiAchPct" name="Mean KPI %" radius={[6, 6, 0, 0]}>
                    {data.teamComparison.map((t, i) => <Cell key={i} fill={(t.meanKpiAchPct ?? 0) >= 80 ? "#34d399" : (t.meanKpiAchPct ?? 0) >= 60 ? "#f59e0b" : "#f87171"} />)}
                  </Bar>
                  <Bar dataKey="meanScore" name="Mean score" fill="#8b7ff5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="mb-2 text-sm font-bold text-slate-100">Top performers</p>
              {data.topAgents.length ? (
                <ul className="space-y-1.5">
                  {data.topAgents.map((a, i) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 text-xs">
                      <span className="font-medium text-slate-200">{i + 1}. {a.name} <span className="text-slate-500">· {a.team ?? "—"}</span></span>
                      <span className="font-bold text-emerald-400">{a.score} <span className="text-[10px] font-normal text-slate-500">({a.kpiPct !== null ? `${a.kpiPct}% KPI` : "no KPI data"})</span></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs italic text-slate-500">No rankable agents in scope.</p>}
            </Card>
            <Card>
              <p className="mb-2 text-sm font-bold text-slate-100">Requiring management attention</p>
              {data.attentionAgents.length ? (
                <ul className="space-y-1.5">
                  {data.attentionAgents.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 text-xs">
                      <span className="font-medium text-slate-200">{a.name} <span className="text-slate-500">· {a.team ?? "—"}</span></span>
                      <span className="text-rose-400">{a.kpiPct !== null ? `${a.kpiPct}% KPI` : "no KPI data"}{a.overdue > 0 ? ` · ${a.overdue} overdue` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs italic text-slate-500">Nobody is below the thresholds in this scope.</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── shared report generator hook ──
function useReport<T>(type: string, extra: URLSearchParams) {
  const [report, setReport] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const generate = () => {
    setLoading(true);
    setErr(null);
    setReport(null);
    api<T>(`/api/intel/report?type=${type}&${extra.toString()}`)
      .then((r) => {
        const rec = r as unknown as Record<string, unknown>;
        if (rec && typeof rec === "object" && "error" in rec && typeof rec.error === "string") setErr(rec.error);
        else setReport(r);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  };
  return { report, err, loading, generate };
}

function GenerateBar({ loading, onGenerate, onExport, children, exportDisabled }: { loading: boolean; onGenerate: () => void; onExport: () => void; children: React.ReactNode; exportDisabled: boolean }) {
  return (
    <Card className="!py-3">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <span className="flex-1" />
        <Button size="sm" className="k-btn-primary h-8 gap-1.5 text-xs" onClick={onGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />} Generate report
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 border-white/12 bg-white/[0.04] text-xs text-slate-200" onClick={onExport} disabled={exportDisabled || loading}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export .xlsx
        </Button>
      </div>
    </Card>
  );
}

// ── Individual agent report tab ──
function AgentTab({ meta, params, agents }: { meta: Meta | null; params: URLSearchParams; agents: Meta["agents"] }) {
  const [agentId, setAgentId] = useState("");
  const p = useMemo(() => { const q = new URLSearchParams(params); if (agentId) q.set("agentId", agentId); return q; }, [params, agentId]);
  const { report, err, loading, generate } = useReport<never>("agent", p);

  const exportX = () => window.open(`/api/intel/export?type=agent&${p.toString()}`, "_blank");

  useEffect(() => { setAgentId(""); }, [params]);

  return (
    <div className="space-y-4">
      <GenerateBar loading={loading} onGenerate={generate} onExport={exportX} exportDisabled={!agentId}>
        <Select value={agentId || undefined} onValueChange={setAgentId}>
          <SelectTrigger className={cn(selCls, "w-[240px]")}><SelectValue placeholder="Select agent…" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} — {a.team ?? a.role}</SelectItem>)}
          </SelectContent>
        </Select>
        {!agentId && <span className="text-[11px] text-slate-500">Pick an agent, then generate the full A–H operational report.</span>}
      </GenerateBar>
      {err && <ErrorNote message={err} />}
      {loading && <Loading label="Building the individual operational report…" />}
      {report && <AgentReportView r={report as never} />}
      {!report && !loading && !err && (
        <EmptyState title="Individual Agent Operational Report" hint="Profile, KPI analysis with best/weakest identification, application activity, task management, attendance, evidence-based strengths & weaknesses, transparent overall assessment and Gemini commentary." />
      )}
    </div>
  );
}

// ── Team report tab ──
function TeamTab({ meta, params }: { meta: Meta | null; params: URLSearchParams }) {
  const [team, setTeam] = useState("");
  const [leadId, setLeadId] = useState("");
  const p = useMemo(() => {
    const q = new URLSearchParams(params);
    if (leadId) q.set("teamLeadId", leadId); else if (team) q.set("team", team);
    return q;
  }, [params, team, leadId]);
  const { report, err, loading, generate } = useReport<never>("team", p);
  const exportX = () => window.open(`/api/intel/export?type=team&${p.toString()}`, "_blank");
  const leads = (meta?.teamLeads ?? []).filter((l) => (params.get("country") ? l.country === params.get("country") : true) && (params.get("state") ? l.state === params.get("state") : true));

  return (
    <div className="space-y-4">
      <GenerateBar loading={loading} onGenerate={generate} onExport={exportX} exportDisabled={!team && !leadId}>
        <Select value={team || undefined} onValueChange={(v) => { setTeam(v); setLeadId(""); }}>
          <SelectTrigger className={selCls}><SelectValue placeholder="Team…" /></SelectTrigger>
          <SelectContent>{(meta?.teams ?? []).map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-[10px] text-slate-500">or</span>
        <Select value={leadId || undefined} onValueChange={(v) => { setLeadId(v); setTeam(""); }}>
          <SelectTrigger className={cn(selCls, "w-[220px]")}><SelectValue placeholder="Team Lead…" /></SelectTrigger>
          <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
        </Select>
      </GenerateBar>
      {err && <ErrorNote message={err} />}
      {loading && <Loading label="Building the team operational report…" />}
      {report && <TeamReportView r={report as never} />}
      {!report && !loading && !err && (
        <EmptyState title="Team KPI & Operational Report" hint="Team overview with roster-method KPI targets, agent rankings, per-KPI comparison, productivity vs activity, strengths & weaknesses, team-lead assessment and recommendations." />
      )}
    </div>
  );
}

// ── Centre report tab ──
function CentreTab({ params }: { params: URLSearchParams }) {
  const okScope = !!(params.get("country") && params.get("state"));
  const p = useMemo(() => { const q = new URLSearchParams(params); return q; }, [params]);
  const { report, err, loading, generate } = useReport<never>("centre", p);
  const exportX = () => window.open(`/api/intel/export?type=centre&${p.toString()}`, "_blank");
  return (
    <div className="space-y-4">
      <GenerateBar loading={loading} onGenerate={generate} onExport={exportX} exportDisabled={false}>
        <span className="text-[11px] text-slate-500">
          {okScope ? `Centre: ${params.get("state")}, ${params.get("country")}` : "No centre filter — the report consolidates every centre. Pick a centre in the filters above to scope it."}
        </span>
      </GenerateBar>
      {err && <ErrorNote message={err} />}
      {loading && <Loading label="Building the centre-wide operational report…" />}
      {report && <CentreReportView r={report as never} />}
      {!report && !loading && !err && (
        <EmptyState title="Centre-Wide Operational Report" hint="Centre overview, supervisor and team-lead analysis, consolidated agent analysis without duplication, operational risk analysis and management recommendations." />
      )}
    </div>
  );
}

// ── Exports & activity tab ──
function ExportsTab({ user }: { user: SessionUser }) {
  const [type, setType] = useState("centre");
  const [team, setTeam] = useState("");
  const [agentId, setAgentId] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [activity, setActivity] = useState<{ events: Record<string, unknown>[]; reportLog: Record<string, unknown>[] } | null>(null);

  useEffect(() => {
    api<Meta>("/api/intel/meta").then(setMeta).catch(() => {});
    api<typeof activity>("/api/intel/activity").then(setActivity).catch(() => {});
  }, []);

  const p = new URLSearchParams();
  p.set("type", type);
  if (type === "team" && team) p.set("team", team);
  if (type === "agent" && agentId) p.set("agentId", agentId);

  const exportX = () => window.open(`/api/intel/export?${p.toString()}`, "_blank");

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm font-bold text-slate-100">Operational Reports &amp; Exports</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Choose a report type, scope and period (the filters bar above applies), then download the professionally formatted Excel workbook. Every export is audited.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={(v) => { setType(v); setTeam(""); setAgentId(""); }}>
            <SelectTrigger className={selCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="agent">Individual Agent Report</SelectItem>
              <SelectItem value="team">Team KPI &amp; Operational Report</SelectItem>
              <SelectItem value="centre">Centre-Wide Report</SelectItem>
            </SelectContent>
          </Select>
          {type === "team" && (
            <Select value={team || undefined} onValueChange={setTeam}>
              <SelectTrigger className={selCls}><SelectValue placeholder="Team…" /></SelectTrigger>
              <SelectContent>{(meta?.teams ?? []).map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {type === "agent" && (
            <Select value={agentId || undefined} onValueChange={setAgentId}>
              <SelectTrigger className={cn(selCls, "w-[240px]")}><SelectValue placeholder="Agent…" /></SelectTrigger>
              <SelectContent className="max-h-72">{(meta?.agents ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button size="sm" className="k-btn-primary h-8 gap-1.5 text-xs" onClick={exportX} disabled={(type === "team" && !team) || (type === "agent" && !agentId)}>
            <Download className="h-3.5 w-3.5" /> Download workbook (.xlsx)
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Tip: for a formal PDF, open a generated report preview and use the browser&apos;s Print → Save as PDF on the report sections.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-100"><Users className="h-4 w-4 text-[#eda06a]" /> Recent activity events (tracked)</p>
          <div className="max-h-72 space-y-1 overflow-auto">
            {(activity?.events ?? []).map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 text-[11px]">
                <span className="text-slate-200">{String(e.user)} <span className="text-slate-500">· {String(e.eventType)}</span></span>
                <span className="text-slate-500">{new Date(String(e.at)).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            ))}
            {!activity?.events.length && <p className="py-6 text-center text-xs italic text-slate-500">No tracked activity yet — events are recorded from now on (logins, submissions, task changes, escalations, uploads).</p>}
          </div>
        </Card>
        <Card>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-100"><Building2 className="h-4 w-4 text-[#eda06a]" /> Report audit trail</p>
          <div className="max-h-72 space-y-1 overflow-auto">
            {(activity?.reportLog ?? []).map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 text-[11px]">
                <span className="text-slate-200">{String(l.actor)} <Badge variant="outline" className="ml-1 border-white/10 text-[9px] text-slate-400">{String(l.action).replace("INTEL_REPORT_", "")}</Badge></span>
                <span className="truncate text-slate-500">{String(l.details).slice(0, 80)}</span>
                <span className="shrink-0 text-slate-500">{new Date(String(l.at)).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            ))}
            {!activity?.reportLog.length && <p className="py-6 text-center text-xs italic text-slate-500">No reports generated yet in this period.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
