"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, fmtDate, DEPT_LABELS, TEAM_LABELS, todayISO, type UserDTO } from "@/lib/client";
import { EmptyState, StatusBadge } from "@/components/kallmania/shared";
import { Loader2, TrendingUp, Users, Activity } from "lucide-react";

type Period = "day" | "week" | "month" | "year";

interface KpiRow {
  key: string; label: string; unit: string; category: string;
  dailyTarget: number | null; target: number | null; targetLabel: string;
  actual: number | null; pct: number | null;
}

interface UserKpiResponse {
  user: { id: string; fullName: string; email: string; role: string; department: string; team: string | null; employeeId: string | null; country: string | null; state: string | null; status: string };
  period: Period;
  label: string;
  reportCount: number;
  distinctDates: number;
  rows: KpiRow[];
  techTotals: Record<string, number>;
  socialTotals: Record<string, number>;
  techLabels: { key: string; label: string }[];
  socialLabels: { key: string; label: string }[];
  tasks: Record<string, number>;
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
 * Click-any-user KPI performance dialog — daily / weekly / monthly / yearly
 * cumulative KPIs plus task roll-up for one staff member.
 */
export function UserKpiDialog({ userId, open, onClose }: { userId: string | null; open: boolean; onClose: () => void }) {
  const [period, setPeriod] = useState<Period>("week");
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<UserKpiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await api<UserKpiResponse>(`/api/users/${userId}/kpi?period=${period}&date=${date}`);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId, period, date]);

  const u = data?.user;
  const isTech = u?.role === "DEVELOPER";
  const isSocial = u?.role === "SOCIAL_MEDIA";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-[#14100c] text-slate-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white">KPI performance — {u?.fullName || "…"}</DialogTitle>
          {u && (
            <p className="text-[11px] text-slate-500">
              {u.email} · {u.role.replace(/_/g, " ")} · {u.team ? (TEAM_LABELS[u.team] || u.team) : (DEPT_LABELS[u.department] || u.department)}{u.state ? ` · ${u.state}${u.country ? `, ${u.country}` : ""}` : ""}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(["day", "week", "month", "year"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${period === p ? "bg-[#d98a4e] text-white" : "text-slate-400 hover:bg-white/5"}`}>
                {p === "day" ? "Daily" : p === "week" ? "Weekly" : p === "month" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-8 w-36 border-slate-600/50 bg-[#171310] text-xs text-slate-200" />
          {data && <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500"><TrendingUp className="h-3.5 w-3.5 text-[#f0b48a]" /> {data.label} · {data.reportCount} report(s)</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : error ? (
          <EmptyState icon={<Activity className="h-7 w-7" />} title="Could not load KPI data" hint={error} />
        ) : !data ? null : (
          <div className="space-y-4">
            {data.tasks && data.tasks.total > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">{data.tasks.total} task(s) assigned in period</span>
                {data.tasks.COMPLETED ? <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{data.tasks.COMPLETED} completed</span> : null}
                {data.tasks.BLOCKED ? <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-rose-300">{data.tasks.BLOCKED} blocked</span> : null}
              </div>
            )}

            {data.rows.filter((r) => r.category !== "EMAIL_EXTENSION").length > 0 ? (
              <div className="space-y-2.5">
                {data.rows.filter((r) => r.category !== "EMAIL_EXTENSION").map((k) => (
                  <div key={k.key}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-slate-300">{k.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-400">
                        {fmtVal(k.actual, k.unit)} / {k.targetLabel}{" "}
                        <span className={`ml-1 font-semibold ${pctColor(k.pct)}`}>{k.pct !== null ? `${k.pct}%` : ""}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${(k.pct || 0) >= 100 ? "bg-emerald-400" : (k.pct || 0) >= 80 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${Math.min(100, k.pct || 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : isTech || isSocial ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(isTech ? data.techLabels : data.socialLabels).map((l) => (
                  <div key={l.key} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <p className="truncate text-[10px] text-slate-500">{l.label}</p>
                    <p className="text-sm font-bold tabular-nums text-slate-100">{(isTech ? data.techTotals : data.socialTotals)[l.key] ?? 0}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No submitted reports in this period" hint="KPIs build up from submitted/approved daily reports." />
            )}

            {data.rows.filter((r) => r.category === "EMAIL_EXTENSION" && r.actual !== null).length > 0 && (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold uppercase text-[#f0b48a]">Email activity totals</summary>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {data.rows.filter((r) => r.category === "EMAIL_EXTENSION" && r.actual !== null).map((m) => (
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
      </DialogContent>
    </Dialog>
  );
}

/**
 * My Agents — supervisors (and administrators) see the list of agents in their
 * centre/state and can open each agent's KPI performance (daily / weekly /
 * monthly / yearly).
 */
export default function AgentsView({ user }: { user: { id: string; role: string } }) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { users } = await api<{ users: UserDTO[] }>("/api/users");
        setUsers(users.filter((u) => ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "TEAM_LEAD"].includes(u.role) && u.status === "APPROVED"));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) => u.fullName.toLowerCase().includes(q.toLowerCase()) || (u.employeeId || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Agents &amp; KPI Performance</h2>
          <p className="mt-1 text-sm text-slate-400">
            {user.role === "ADMIN" ? "Every staff member across all centres — click anyone to inspect their KPIs" : "The agents of your centre — click an agent to see their daily, weekly, monthly and yearly KPIs"}
          </p>
        </div>
        <Input placeholder="Search name or staff ID…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-56 border-slate-600/50 bg-[#171310]/60 text-xs text-slate-100" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No agents in your scope yet" hint="Agents appear here once they register, are confirmed, and share your location." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Agent</TableHead>
                <TableHead className="text-[11px] text-slate-400">Role</TableHead>
                <TableHead className="text-[11px] text-slate-400">Centre / Team</TableHead>
                <TableHead className="text-[11px] text-slate-400">Location</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-right text-[11px] text-slate-400">KPI performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="cursor-pointer border-white/5 hover:bg-white/[0.04]" onClick={() => setSelected(u.id)}>
                  <TableCell className="py-2.5">
                    <p className="text-xs font-semibold text-slate-200">{u.fullName}</p>
                    <p className="text-[10px] text-slate-500">{u.email}{u.employeeId ? ` · ${u.employeeId}` : ""}</p>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-300">{u.role.replace(/_/g, " ")}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-300">
                    {u.team ? (TEAM_LABELS[u.team] || u.team) : (DEPT_LABELS[u.department] || u.department)}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-400">{u.state ? `${u.state}${u.country ? `, ${u.country}` : ""}` : "—"}</TableCell>
                  <TableCell className="py-2.5"><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span className="text-[11px] font-semibold text-[#f0b48a]">View KPIs →</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UserKpiDialog userId={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
