"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, fmtDate, fmtDateTime, todayISO, DEPT_LABELS, type EscalationDTO, type SessionUser, type TaskDTO } from "@/lib/client";
import { StatCard, PageHeader, SectionCard, EmptyState, StatusBadge } from "@/components/kallmania/shared";
import PeriodKpiPanel from "@/components/kallmania/kpi-trends";
import { UserKpiDialog } from "@/components/kallmania/user-kpi-dialog";
import { EscalationComposer } from "@/components/kallmania/escalation-center";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Country, State } from "country-state-city";
import {
  Users, FileCheck2, FileX2, ListTodo, CheckCircle2, AlarmClock, Ban, TrendingDown,
  Siren, PhoneCall, Mail, UploadCloud, MonitorSmartphone, Share2, Calendar, Loader2, MapPin, Globe2,
  ArrowUpRight, Megaphone,
} from "lucide-react";

interface EmployeeDash {
  reportSubmittedToday: boolean;
  myReportStatus: string | null;
  myReportRef: string | null;
  openTasks: number;
  tasksCompleted: number;
  tasksDueToday: number;
  upcomingTasks: TaskDTO[];
  kpiAchievement: { label: string; actual: number | null; target: number | null; pct: number | null }[];
  unreadNotifications: number;
  myRecentReports: { id: string; ref: string; type: string; status: string; reportDate: string }[];
}

interface SupervisorDash {
  centreLabel: string | null;
  centreAgents: { id: string; fullName: string; role: string; department: string; team: string | null; country: string | null; state: string | null }[];
  trend: { date: string; label: string; submitted: number }[];
  totalActiveEmployees: number;
  expectedToReport: number;
  reportsSubmitted: number;
  outstandingReports: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksBlocked: number;
  kpiShortfalls: number;
  openEscalations: number;
  bpoTotals: Record<string, number>;
  teamKpiRows: { key: string; label: string; teamTarget: number | null; teamAvg: number | null; best: string | null; lowest: string | null }[];
  techTotals: Record<string, number>;
  socialTotals: Record<string, number>;
  deptTable: { department: string; expected: number; submitted: number; pending: number; tasksAssigned: number; tasksCompleted: number; tasksOverdue: number }[];
  recentAlerts: { id: string; type: string; severity: string; title: string; message: string; createdAt: string }[];
  pendingUserApprovals: number;
  submittedReportList: { id: string; ref: string; userName: string; type: string; status: string; department: string }[];
  pendingReportList: { id: string; ref: string; userName: string; type: string; status: string; department: string }[];
}

export default function Dashboard({ user, onNavigate }: { user: SessionUser; onNavigate: (v: string) => void }) {
  const [date, setDate] = useState(todayISO());
  const [emp, setEmp] = useState<EmployeeDash | null>(null);
  const [sup, setSup] = useState<SupervisorDash | null>(null);
  const [loading, setLoading] = useState(true);
  // Admin drill-down: select the country and the state (centre) whose KPIs to inspect
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const allCountries = Country.getAllCountries().slice().sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ date });
        if (user.role === "ADMIN" && (country || state)) {
          if (country) params.set("country", country);
          if (state) params.set("state", state);
        }
        const data = await api<{ role: string; employee?: EmployeeDash; supervisor?: SupervisorDash }>(`/api/dashboard?${params}`);
        if (cancelled) return;
        setEmp(data.employee || null);
        setSup(data.supervisor || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date, user.role, country, state]);

  const isSupervisor = user.role === "SUPERVISOR" || user.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.fullName.split(" ")[0]}`}
        subtitle={isSupervisor ? "Cross-department oversight — reports, KPIs, tasks and escalations" : DEPT_LABELS[user.department] || "Your workspace"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user.role === "ADMIN" && (
              <>
                <Select value={country || undefined} onValueChange={(v) => { setCountry(v === "__all__" ? "" : v); setState(""); }}>
                  <SelectTrigger className="w-44 border-white/12 bg-white/[0.055] text-xs text-slate-200 backdrop-blur"><Globe2 className="mr-2 h-3.5 w-3.5 text-[#eda06a]" />{country ? allCountries.find((c) => c.isoCode === country)?.name : "All countries"}</SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="__all__">All countries</SelectItem>
                    {allCountries.map((c) => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={state || undefined} onValueChange={(v) => setState(v === "__all__" ? "" : v)} disabled={!country}>
                  <SelectTrigger className="w-40 border-white/12 bg-white/[0.055] text-xs text-slate-200 backdrop-blur"><MapPin className="mr-2 h-3.5 w-3.5 text-[#eda06a]" />{state || "All states"}</SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="__all__">All states</SelectItem>
                    {(country ? State.getStatesOfCountry(country) : []).map((s) => <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger className="w-44 border-white/12 bg-white/[0.055] text-xs text-slate-200 backdrop-blur"><Calendar className="mr-2 h-3.5 w-3.5" />{fmtDate(date)}</SelectTrigger>
              <SelectContent>{getLast7Days().map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : isSupervisor && sup ? (
        <SupervisorDashboard sup={sup} user={user} onNavigate={onNavigate} />
      ) : emp ? (
        <EmployeeDashboard emp={emp} user={user} onNavigate={onNavigate} />
      ) : null}
    </div>
  );
}

function getLast7Days() {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const off = d.getTimezoneOffset();
    const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
    out.push({ value: iso, label: i === 0 ? "Today" : fmtDate(iso) });
  }
  return out;
}

/** Former-model stat card: dark icon disc + bold title, huge number, divider, two sub-stats, ↗ shortcut. */
function ClasyStatCard({
  icon, title, value, stats, onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  stats: { label: string; value: React.ReactNode }[];
  onOpen?: () => void;
}) {
  return (
    <div className="k-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17171c] text-[#eda06a] ring-1 ring-white/10">
            {icon}
          </span>
          <p className="truncate text-sm font-bold text-slate-100">{title}</p>
        </div>
        {onOpen && (
          <button
            onClick={onOpen}
            title={`Open ${title}`}
            className="k-btn-glass flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-3 text-4xl font-extrabold leading-none tracking-tight tabular-nums text-slate-100">{value}</p>
      <div className="mt-4 flex gap-8 border-t border-white/10 pt-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <p className="truncate text-[11px] text-slate-500">{s.label}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Notify & Escalate bar — recent notices inline + quick composer (former-model banner). */
function NotifyEscalateBar({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EscalationDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ escalations: EscalationDTO[] }>("/api/escalations")
      .then(({ escalations }) => { if (!cancelled) { setItems(escalations || []); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const isManagement = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(user.role);
  const preview = items
    .slice(0, 5)
    .map((e) => `${e.subject}: ${e.message}`)
    .join("  ·  ");

  return (
    <div className="k-card flex items-center gap-3 p-3 pr-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f0a267] via-[#e8873a] to-[#d97a35] text-white shadow-[0_8px_24px_-6px_rgba(232,135,58,0.65)]">
        <Siren className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-100">Notify &amp; Escalate</p>
        <p className="truncate text-xs text-slate-500">
          {loaded ? (preview || "No notices yet — send one with the button on the right.") : "Loading recent notices…"}
        </p>
      </div>
      {items.length > 0 && (
        <span className="shrink-0 rounded-full bg-[#e8935a]/15 px-2.5 py-1 text-[10px] font-bold text-[#c2641f] dark:text-[#f0b285]">
          {items.length > 99 ? "99+" : items.length} recent
        </span>
      )}
      <Button size="sm" onClick={() => setOpen(true)} className="k-btn-primary shrink-0 rounded-full px-4 text-xs">
        <Megaphone className="mr-1.5 h-3.5 w-3.5" />
        {isManagement ? "Notify agent" : "Notify / escalate"}
      </Button>
      <EscalationComposer user={user} open={open} setOpen={setOpen} />
    </div>
  );
}

function EmployeeDashboard({ emp, user, onNavigate }: { emp: EmployeeDash; user: SessionUser; onNavigate: (v: string) => void }) {
  const roleReportLabel = user.role === "DEVELOPER" ? "Technical report" : user.role === "SOCIAL_MEDIA" ? "Social media report" : "Daily report";
  return (
    <div className="space-y-5">
      <NotifyEscalateBar user={user} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`${roleReportLabel} today`} value={emp.reportSubmittedToday ? "Submitted" : "Not yet"} tone={emp.reportSubmittedToday ? "good" : "warn"} icon={<FileCheck2 className="h-4 w-4" />} sub={emp.myReportRef || undefined} />
        <StatCard label="Open tasks" value={emp.openTasks} tone="info" icon={<ListTodo className="h-4 w-4" />} sub={`${emp.tasksCompleted} completed all-time`} />
        <StatCard label="Due today" value={emp.tasksDueToday} tone={emp.tasksDueToday > 0 ? "warn" : "default"} icon={<AlarmClock className="h-4 w-4" />} />
        <StatCard label="Unread alerts" value={emp.unreadNotifications} tone={emp.unreadNotifications > 0 ? "bad" : "good"} icon={<Siren className="h-4 w-4" />} />
      </div>

      {!emp.reportSubmittedToday && (
        <button onClick={() => onNavigate("daily-report")} className="k-card k-glow-violet flex w-full items-center gap-4 p-5 text-left transition-transform hover:scale-[1.005]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b7ff5] to-[#6c5ce7] shadow-[0_8px_22px_-6px_rgba(108,92,231,0.7)]"><FileCheck2 className="h-5 w-5 text-white" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Your {roleReportLabel.toLowerCase()} for today is pending</p>
            <p className="mt-0.5 text-xs text-slate-400">Fill the template-based form, or upload your existing report and let Kallmania extract the fields.</p>
          </div>
          <span className="k-btn-primary rounded-full px-4 py-2 text-xs font-semibold text-white">Complete now</span>
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="KPI achievement (latest report)" subtitle="Actual vs target from your most recent submission">
          {emp.kpiAchievement.length === 0 ? (
            <EmptyState title="No KPI data yet" hint="Submit a daily report to see target achievement here." />
          ) : (
            <div className="space-y-3">
              {emp.kpiAchievement.map((k) => (
                <div key={k.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{k.label}</span>
                    <span className="tabular-nums text-slate-400">{k.actual ?? "—"} / {k.target ?? "—"} <span className={`ml-1 font-semibold ${(k.pct || 0) >= 100 ? "text-emerald-400" : (k.pct || 0) >= 80 ? "text-amber-400" : "text-rose-400"}`}>{k.pct !== null ? `${k.pct}%` : ""}</span></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${(k.pct || 0) >= 100 ? "bg-emerald-400" : (k.pct || 0) >= 80 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${Math.min(100, k.pct || 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming tasks">
          {emp.upcomingTasks.length === 0 ? (
            <EmptyState title="No open tasks" hint="You are all caught up." />
          ) : (
            <div className="space-y-2">
              {emp.upcomingTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{t.title}</p>
                    <p className="text-[10px] text-slate-500">{t.department.replace(/_/g, " ")}{t.deadline ? ` · due ${fmtDate(t.deadline)}` : ""}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-[#8b7ff5]" onClick={() => onNavigate("tasks")}>View all tasks</Button>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Multi-period cumulative KPI performance (day / week / month) */}
      <PeriodKpiPanel role={user.role} />

      <SectionCard title="Recent reports">
        {emp.myRecentReports.length === 0 ? (
          <EmptyState title="No reports yet" hint="Your submission history will appear here." />
        ) : (
          <div className="space-y-2">
            {emp.myRecentReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <span className="font-mono text-[#b3a5ff]">{r.ref}</span>
                <span className="text-slate-400">{fmtDate(r.reportDate)}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SupervisorDashboard({ sup, user, onNavigate }: { sup: SupervisorDash; user: SessionUser; onNavigate: (v: string) => void }) {
  const [kpiUser, setKpiUser] = useState<{ id: string; fullName: string; role: string } | null>(null);
  return (
    <div className="space-y-5">
      <NotifyEscalateBar user={user} />
      {sup.centreLabel && (
        <div className="flex w-fit items-center gap-2 rounded-full border border-[#e8935a]/40 bg-[#e8935a]/10 px-3.5 py-1.5 text-xs font-semibold text-[#f0b285]">
          <MapPin className="h-3.5 w-3.5" />
          {user.role === "SUPERVISOR" ? "Your centre: " : "Centre: "}{sup.centreLabel}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ClasyStatCard
          icon={<Users className="h-4 w-4" />}
          title="Agents"
          value={sup.totalActiveEmployees}
          stats={[
            { label: "Expected to report", value: sup.expectedToReport },
            { label: "Awaiting approval", value: sup.pendingUserApprovals },
          ]}
          onOpen={user.role === "ADMIN" ? () => onNavigate("admin-users") : undefined}
        />
        <ClasyStatCard
          icon={<FileCheck2 className="h-4 w-4" />}
          title="Reports Today"
          value={sup.reportsSubmitted}
          stats={[
            { label: "Outstanding", value: sup.outstandingReports },
            { label: "Awaiting approval", value: sup.pendingReportList.length },
          ]}
          onOpen={() => onNavigate("review")}
        />
        <ClasyStatCard
          icon={<ListTodo className="h-4 w-4" />}
          title="Tasks"
          value={sup.tasksAssigned}
          stats={[
            { label: "Completed", value: sup.tasksCompleted },
            { label: "Overdue", value: sup.tasksOverdue },
          ]}
          onOpen={() => onNavigate("team-tasks")}
        />
        <ClasyStatCard
          icon={<Siren className="h-4 w-4" />}
          title="Escalations"
          value={sup.openEscalations}
          stats={[
            { label: "KPI shortfalls", value: sup.kpiShortfalls },
            { label: "Blocked tasks", value: sup.tasksBlocked },
          ]}
          onOpen={() => onNavigate("notifications")}
        />
      </div>

      {/* Former-model layout: Report Submissions chart + Awaiting Review panel */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Report Submissions" subtitle="Agent, technical & social media reports over time">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sup.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="kTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8935a" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#e8935a" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#9b968f", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis tick={{ fill: "#9b968f", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#17171c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#f4f1ec" }}
                  labelStyle={{ color: "#9b968f" }}
                  cursor={{ stroke: "rgba(232,147,90,0.4)" }}
                />
                <Area type="monotone" dataKey="submitted" stroke="#e8935a" strokeWidth={2.5} fill="url(#kTrendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Awaiting Review"
          subtitle="Reports submitted for your approval"
          actions={
            <button
              onClick={() => onNavigate("review")}
              title="Open review queue"
              className="k-btn-glass flex h-8 w-8 items-center justify-center rounded-full text-slate-400"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          }
        >
          {sup.pendingReportList.length === 0 ? (
            <EmptyState title="Nothing waiting for review" hint="Reports submitted for your approval will appear here." />
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {sup.pendingReportList.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onNavigate("review")}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs transition hover:border-[#e8935a]/40 hover:bg-white/[0.05]"
                >
                  <span className="shrink-0 font-mono text-[#eda06a]">{r.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-left text-slate-300">{r.userName}</span>
                  <StatusBadge status={r.status} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Centre agents — click any agent to inspect their KPI performance */}
      {sup.centreAgents.length > 0 && (
        <SectionCard
          title="Centre agents"
          subtitle="Everyone registered in this centre — click a person to see their KPI performance (daily, weekly, monthly, yearly)"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sup.centreAgents.map((a) => (
              <button
                key={a.id}
                onClick={() => setKpiUser({ id: a.id, fullName: a.fullName, role: a.role })}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-[#e8935a]/40 hover:bg-white/[0.05]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5b4636] to-[#3a2c21] text-[11px] font-bold text-[#f0b285] ring-1 ring-white/15">
                  {a.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-200">{a.fullName}</span>
                  <span className="block truncate text-[10px] text-slate-500">{DEPT_LABELS[a.department]?.split(" & ")[0] || a.department}{a.team ? ` · ${a.team}` : ""}</span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-500 group-hover:border-[#e8935a]/40 group-hover:text-[#f0b285]">KPI</span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {sup.pendingUserApprovals > 0 && (
        <button onClick={() => onNavigate("admin-users")} className="k-card flex w-full items-center gap-3 border-amber-500/40 p-4 text-left">
          <Users className="h-5 w-5 text-amber-300" />
          <p className="flex-1 text-sm text-amber-200">{sup.pendingUserApprovals} registration(s) awaiting your confirmation</p>
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">Review</span>
        </button>
      )}

      {/* BPO call & email stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Calls made" value={sup.bpoTotals.totalCallsMade ?? 0} icon={<PhoneCall className="h-4 w-4" />} />
        <StatCard label="Calls connected" value={sup.bpoTotals.callsConnected ?? 0} icon={<PhoneCall className="h-4 w-4" />} />
        <StatCard label="Emails sent" value={sup.bpoTotals.totalMailsSent ?? 0} icon={<Mail className="h-4 w-4" />} />
        <StatCard label="Hot leads" value={(sup.bpoTotals.hotLeads ?? 0) + (sup.bpoTotals.emailHotLeads ?? 0)} tone="good" icon={<TrendingDown className="h-4 w-4 rotate-180" />} />
        <StatCard label="Tech tasks done" value={sup.techTotals.tasksCompleted ?? 0} icon={<MonitorSmartphone className="h-4 w-4" />} />
        <StatCard label="Posts published" value={sup.socialTotals.postsPublished ?? 0} icon={<Share2 className="h-4 w-4" />} />
      </div>

      {/* Departmental table */}
      <SectionCard title="Departmental status" subtitle="Report submission & task performance by department">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Department</TableHead>
                <TableHead className="text-[11px] text-slate-400">Expected</TableHead>
                <TableHead className="text-[11px] text-slate-400">Submitted</TableHead>
                <TableHead className="text-[11px] text-slate-400">Pending</TableHead>
                <TableHead className="text-[11px] text-slate-400">Tasks done</TableHead>
                <TableHead className="text-[11px] text-slate-400">Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sup.deptTable.map((d) => (
                <TableRow key={d.department} className="border-white/5">
                  <TableCell className="py-2.5 text-xs font-semibold text-slate-200">{DEPT_LABELS[d.department]}</TableCell>
                  <TableCell className="py-2.5 text-xs tabular-nums text-slate-300">{d.expected}</TableCell>
                  <TableCell className="py-2.5 text-xs font-semibold tabular-nums text-emerald-300">{d.submitted}</TableCell>
                  <TableCell className="py-2.5 text-xs tabular-nums text-amber-300">{d.pending}</TableCell>
                  <TableCell className="py-2.5 text-xs tabular-nums text-slate-300">{d.tasksCompleted}/{d.tasksAssigned}</TableCell>
                  <TableCell className="py-2.5 text-xs tabular-nums text-rose-300">{d.tasksOverdue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Team KPI averages" subtitle="Averaged across submitted BPO agent reports">
          {sup.teamKpiRows.length === 0 ? (
            <EmptyState title="No agent KPI data" hint="Awaiting BPO agent submissions." />
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[11px] text-slate-400">KPI</TableHead>
                    <TableHead className="text-[11px] text-slate-400">Team avg</TableHead>
                    <TableHead className="text-[11px] text-slate-400">Best</TableHead>
                    <TableHead className="text-[11px] text-slate-400">Lowest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sup.teamKpiRows.map((k) => (
                    <TableRow key={k.key} className="border-white/5">
                      <TableCell className="py-2 text-xs text-slate-200">{k.label}</TableCell>
                      <TableCell className="py-2 text-xs font-semibold tabular-nums text-[#b3a5ff]">{k.teamAvg ?? "—"}</TableCell>
                      <TableCell className="py-2 text-xs text-emerald-300">{k.best || "—"}</TableCell>
                      <TableCell className="py-2 text-xs text-amber-300">{k.lowest || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent alerts & exceptions" actions={<Button size="sm" variant="ghost" className="text-[#8b7ff5]" onClick={() => onNavigate("notifications")}>View all</Button>}>
          {sup.recentAlerts.length === 0 ? (
            <EmptyState title="No alerts" hint="Exceptions (KPI shortfalls, escalations, overdue reports) appear here." />
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {sup.recentAlerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${a.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-300" : a.severity === "WARNING" ? "bg-amber-500/20 text-amber-300" : "bg-sky-500/20 text-sky-300"}`}>{a.severity}</span>
                    <p className="text-xs font-semibold text-slate-200">{a.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{a.message}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{fmtDateTime(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Multi-period cumulative performance (day / week / month / year) */}
      <PeriodKpiPanel role={user.role} />

      <UserKpiDialog user={kpiUser || { id: "", fullName: "", role: "" }} open={!!kpiUser} setOpen={(v) => !v && setKpiUser(null)} />
    </div>
  );
}
