"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, fmtDate, fmtDateTime, todayISO, DEPT_LABELS, type TaskDTO } from "@/lib/client";
import { StatCard, PageHeader, SectionCard, EmptyState, StatusBadge } from "@/components/kallmania/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, FileCheck2, FileX2, ListTodo, CheckCircle2, AlarmClock, Ban, TrendingDown,
  Siren, PhoneCall, Mail, UploadCloud, MonitorSmartphone, Share2, Calendar, Loader2,
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

export default function Dashboard({ user, onNavigate }: { user: { role: string; fullName: string; department: string }; onNavigate: (v: string) => void }) {
  const [date, setDate] = useState(todayISO());
  const [emp, setEmp] = useState<EmployeeDash | null>(null);
  const [sup, setSup] = useState<SupervisorDash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api<{ role: string; employee?: EmployeeDash; supervisor?: SupervisorDash }>(`/api/dashboard?date=${date}`);
        if (cancelled) return;
        setEmp(data.employee || null);
        setSup(data.supervisor || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date, user.role]);

  const isSupervisor = user.role === "SUPERVISOR" || user.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.fullName.split(" ")[0]}`}
        subtitle={isSupervisor ? "Cross-department oversight — reports, KPIs, tasks and escalations" : DEPT_LABELS[user.department] || "Your workspace"}
        actions={
          <Select value={date} onValueChange={setDate}>
            <SelectTrigger className="w-44 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><Calendar className="mr-2 h-3.5 w-3.5" />{fmtDate(date)}</SelectTrigger>
            <SelectContent>{getLast7Days().map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : isSupervisor && sup ? (
        <SupervisorDashboard sup={sup} onNavigate={onNavigate} />
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

function EmployeeDashboard({ emp, user, onNavigate }: { emp: EmployeeDash; user: { role: string; department: string }; onNavigate: (v: string) => void }) {
  const roleReportLabel = user.role === "DEVELOPER" ? "Technical report" : user.role === "SOCIAL_MEDIA" ? "Social media report" : "Daily report";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`${roleReportLabel} today`} value={emp.reportSubmittedToday ? "Submitted" : "Not yet"} tone={emp.reportSubmittedToday ? "good" : "warn"} icon={<FileCheck2 className="h-4 w-4" />} sub={emp.myReportRef || undefined} />
        <StatCard label="Open tasks" value={emp.openTasks} tone="info" icon={<ListTodo className="h-4 w-4" />} sub={`${emp.tasksCompleted} completed all-time`} />
        <StatCard label="Due today" value={emp.tasksDueToday} tone={emp.tasksDueToday > 0 ? "warn" : "default"} icon={<AlarmClock className="h-4 w-4" />} />
        <StatCard label="Unread alerts" value={emp.unreadNotifications} tone={emp.unreadNotifications > 0 ? "bad" : "good"} icon={<Siren className="h-4 w-4" />} />
      </div>

      {!emp.reportSubmittedToday && (
        <button onClick={() => onNavigate("daily-report")} className="k-card k-glow-violet flex w-full items-center gap-4 p-5 text-left transition-transform hover:scale-[1.005]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6c5ce7]"><FileCheck2 className="h-5 w-5 text-white" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Your {roleReportLabel.toLowerCase()} for today is pending</p>
            <p className="mt-0.5 text-xs text-slate-400">Fill the template-based form, or upload your existing report and let Kallmania extract the fields.</p>
          </div>
          <span className="rounded-full bg-[#6c5ce7] px-4 py-2 text-xs font-semibold text-white">Complete now</span>
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

function SupervisorDashboard({ sup, onNavigate }: { sup: SupervisorDash; onNavigate: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active employees" value={sup.totalActiveEmployees} icon={<Users className="h-4 w-4" />} sub={`${sup.expectedToReport} expected to report`} />
        <StatCard label="Reports submitted" value={sup.reportsSubmitted} tone="good" icon={<FileCheck2 className="h-4 w-4" />} sub={`${sup.outstandingReports} outstanding`} />
        <StatCard label="Tasks completed" value={`${sup.tasksCompleted}/${sup.tasksAssigned}`} tone="info" icon={<CheckCircle2 className="h-4 w-4" />} sub={`${sup.tasksOverdue} overdue`} />
        <StatCard label="Open escalations" value={sup.openEscalations} tone={sup.openEscalations > 0 ? "bad" : "good"} icon={<Siren className="h-4 w-4" />} sub={`${sup.kpiShortfalls} KPI shortfalls`} />
      </div>

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

      {/* Submitted reports quick list */}
      <SectionCard title="Today's submissions" actions={<Button size="sm" variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => onNavigate("review")}>Open review queue</Button>}>
        {sup.submittedReportList.length === 0 ? (
          <EmptyState title="No submissions yet today" hint="Agent, technical and social media reports appear here as they arrive." />
        ) : (
          <div className="space-y-2">
            {sup.submittedReportList.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <span className="font-mono text-[#b3a5ff]">{r.ref}</span>
                <span className="text-slate-300">{r.userName}</span>
                <span className="text-slate-500">{DEPT_LABELS[r.department]?.split(" & ")[0] || r.department}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
