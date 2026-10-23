"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, fmtDate, fmtDateTime, ROLE_LABELS, DEPT_LABELS, TEAM_LABELS, type UserDTO, type NotificationDTO, type SessionUser } from "@/lib/client";
import { PageHeader, EmptyState, StatusBadge, SectionCard, Field, inputCls } from "@/components/kallmania/shared";
import { EMPLOYMENT_LABELS, WORKDAY_SHORT, FULL_TIME_DEFAULT, formatWorkDays, shiftHours, includesWeekend, weeklyHours, type EmploymentType } from "@/lib/schedule";
import { UserKpiDialog } from "@/components/kallmania/user-kpi-dialog";
import { EscalationsPanel } from "@/components/kallmania/escalation-center";
import { TeamLeadTemplateEditor } from "@/components/kallmania/team-lead-form";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Country } from "country-state-city";
import { Users, CheckCircle2, XCircle, PauseCircle, PlayCircle, KeyRound, Trash2, Loader2, Bell, Settings2, ScrollText, Info, MapPin, CalendarClock } from "lucide-react";

const ALL_ROLES = ["AGENT_BPO", "TEAM_LEAD", "DEVELOPER", "SOCIAL_MEDIA", "SUPERVISOR", "ADMIN"];
const ALL_TEAMS = ["OUTBOUND", "INBOUND", "EMAIL", "SOCIAL", "TECH"];

/** ISO-2 code → country name for the Location column (built once per module load) */
const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Country.getAllCountries().map((c) => [c.isoCode, c.name])
);

function locationLabel(u: { country?: string | null; state?: string | null }): string {
  const countryName = u.country ? COUNTRY_NAMES[u.country] || u.country : null;
  return [u.state, countryName].filter(Boolean).join(", ");
}

export function AdminUsersView() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [resetUser, setResetUser] = useState<UserDTO | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserDTO | null>(null);
  const [kpiUser, setKpiUser] = useState<UserDTO | null>(null);
  const [scheduleUser, setScheduleUser] = useState<UserDTO | null>(null);
  const [schedForm, setSchedForm] = useState({ employmentType: "FULL_TIME", workDays: "1111100", shiftStart: "09:00", shiftEnd: "17:00" });
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { users } = await api<{ users: UserDTO[] }>("/api/users");
      setUsers(users);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (userId: string, action: string, extra?: Record<string, unknown>): Promise<Record<string, unknown> | undefined> => {
    setBusy(userId + action);
    try {
      const res = await api<Record<string, unknown>>("/api/users", { method: "PATCH", body: JSON.stringify({ userId, action, ...extra }) });
      await load();
      return res;
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Unexpected error — please try again", variant: "destructive" });
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  const changeRole = async (userId: string, role: string, team?: string) => {
    setBusy(userId + "role");
    try {
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId, action: "changeRole", role, ...(team !== undefined ? { team } : {}) }) });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const changeTeam = async (u: UserDTO, team: string) => {
    setBusy(u.id + "team");
    try {
      // Keep the current role; move the user to another team under the BPO division
      const agentRoleByTeam: Record<string, string> = { OUTBOUND: "AGENT_BPO", INBOUND: "AGENT_BPO", EMAIL: "AGENT_BPO", SOCIAL: "SOCIAL_MEDIA", TECH: "DEVELOPER" };
      const role = u.role === "TEAM_LEAD" ? "TEAM_LEAD" : agentRoleByTeam[team] || u.role;
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: u.id, action: "changeRole", role, team }) });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const visible = users.filter((u) => filter === "ALL" || u.status === filter);
  const pending = users.filter((u) => u.status === "PENDING");

  const openSchedule = (u: UserDTO) => {
    setSchedForm({
      employmentType: u.employmentType || "FULL_TIME",
      workDays: u.workDays || FULL_TIME_DEFAULT.workDays,
      shiftStart: u.shiftStart || FULL_TIME_DEFAULT.shiftStart,
      shiftEnd: u.shiftEnd || FULL_TIME_DEFAULT.shiftEnd,
    });
    setScheduleUser(u);
  };
  const toggleDay = (i: number) =>
    setSchedForm((f) => {
      const arr = f.workDays.split("");
      arr[i] = arr[i] === "1" ? "0" : "1";
      const next = arr.join("");
      return next.includes("1") ? { ...f, workDays: next } : f; // at least one working day
    });

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Confirm registrations, manage roles and access"
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>{["ALL", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      {pending.length > 0 && (
        <SectionCard title="Awaiting confirmation" subtitle="These users registered themselves and cannot log in until you confirm their login and role" className="mb-5 border-amber-500/30">
          <div className="space-y-3">
            {pending.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100">{u.fullName} <span className="ml-2 text-xs font-normal text-slate-400">{u.email}</span></p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Requested: <span className="font-semibold text-[#b3a5ff]">{ROLE_LABELS[u.role]}</span>
                    {u.team ? ` · ${TEAM_LABELS[u.team] || u.team}` : ""} · {DEPT_LABELS[u.department] || u.department} · registered {fmtDate(u.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select defaultValue={u.team || undefined} onValueChange={(v) => changeTeam(u, v)}>
                    <SelectTrigger className="h-8 w-40 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue placeholder="Team under Kallmania" /></SelectTrigger>
                    <SelectContent>{ALL_TEAMS.map((t) => <SelectItem key={t} value={t}>{TEAM_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select defaultValue={u.role} onValueChange={(v) => changeRole(u.id, v, u.team || undefined)}>
                    <SelectTrigger className="h-8 w-44 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button size="sm" disabled={busy === u.id + "approve"} onClick={() => act(u.id, "approve")} className="bg-emerald-600 hover:bg-emerald-500">
                  {busy === u.id + "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />} Confirm
                </Button>
                <Button size="sm" variant="outline" disabled={busy === u.id + "reject"} onClick={() => act(u.id, "reject")} className="border-rose-500/50 text-rose-300 hover:bg-rose-500/10">
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No users" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Name</TableHead>
                <TableHead className="text-[11px] text-slate-400">Email</TableHead>
                <TableHead className="text-[11px] text-slate-400">Location</TableHead>
                <TableHead className="text-[11px] text-slate-400">Role</TableHead>
                <TableHead className="text-[11px] text-slate-400">Team under Kallmania</TableHead>
                <TableHead className="text-[11px] text-slate-400">Employment</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Registered</TableHead>
                <TableHead className="text-[11px] text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id} className="border-white/5">
                  <TableCell className="py-2.5">
                    <button
                      onClick={() => setKpiUser(u)}
                      title="View KPI performance"
                      className="text-xs font-semibold text-slate-200 underline-offset-2 transition hover:text-[#eda06a] hover:underline"
                    >
                      {u.fullName}
                    </button>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-400">{u.email}</TableCell>
                  <TableCell className="py-2.5 text-[11px] text-slate-400">
                    {u.country || u.state ? (
                      <span className="flex items-center gap-1.5" title={locationLabel(u)}>
                        <MapPin className="h-3 w-3 shrink-0 text-[#8b7ff5]" />
                        <span className="max-w-[140px] truncate">{locationLabel(u)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Select defaultValue={u.role} onValueChange={(v) => changeRole(u.id, v, u.team || undefined)}>
                      <SelectTrigger className="h-7 w-40 border-slate-600/50 bg-[#15202e]/60 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2.5">
                    {["SUPERVISOR", "ADMIN"].includes(u.role) ? (
                      <span className="text-[11px] text-slate-500">— division-wide —</span>
                    ) : (
                      <Select defaultValue={u.team || undefined} onValueChange={(v) => changeTeam(u, v)}>
                        <SelectTrigger className="h-7 w-40 border-slate-600/50 bg-[#15202e]/60 text-[11px]"><SelectValue placeholder="Set team" /></SelectTrigger>
                        <SelectContent>{ALL_TEAMS.map((t) => <SelectItem key={t} value={t}>{TEAM_LABELS[t]}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className={`w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${(u.employmentType || "FULL_TIME") === "PART_TIME" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>
                        {EMPLOYMENT_LABELS[(u.employmentType as EmploymentType) || "FULL_TIME"] || "Full-time"}
                      </span>
                      <span className="text-[10px] leading-tight text-slate-500">
                        {formatWorkDays(u.workDays || FULL_TIME_DEFAULT.workDays)} · {u.shiftStart || "09:00"}–{u.shiftEnd || "17:00"}
                        {includesWeekend(u.workDays || FULL_TIME_DEFAULT.workDays) ? " · incl. weekend" : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5"><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="py-2.5 text-[11px] text-slate-500">{fmtDate(u.createdAt)}</TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1">
                      {u.status === "PENDING" && <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" title="Approve" onClick={() => act(u.id, "approve")}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
                      {u.status === "APPROVED" && <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400" title="Suspend" onClick={() => act(u.id, "suspend")}><PauseCircle className="h-3.5 w-3.5" /></Button>}
                      {u.status === "SUSPENDED" && <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" title="Reactivate" onClick={() => act(u.id, "reactivate")}><PlayCircle className="h-3.5 w-3.5" /></Button>}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#eda06a]" title="Working days & shift hours" onClick={() => openSchedule(u)}><CalendarClock className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#8b7ff5]" title="Reset password" onClick={() => { setResetUser(u); setNewPassword(""); }}><KeyRound className="h-3.5 w-3.5" /></Button>
                      {u.role !== "ADMIN" && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-300" title="Delete" onClick={() => setDeleteUser(u)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UserKpiDialog user={kpiUser || { id: "", fullName: "", role: "" }} open={!!kpiUser} setOpen={(v) => !v && setKpiUser(null)} />

      <Dialog open={!!deleteUser} onOpenChange={(v) => !v && setDeleteUser(null)}>
        <DialogContent className="border-white/10 bg-[#1b2a3b] text-slate-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete account — {deleteUser?.fullName}</DialogTitle>
            <DialogDescription className="text-slate-400">This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-rose-300">{deleteUser?.email}</span> will be permanently removed
            {(deleteUser?.reportCount ?? 0) > 0 && (
              <> together with <span className="font-semibold text-amber-300">{deleteUser?.reportCount} submitted report{deleteUser?.reportCount === 1 ? "" : "s"}</span></>
            )}
            . Tasks they created are kept and reassigned to you; tasks assigned to them become unassigned.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button
              disabled={busy === deleteUser?.id + "delete"}
              className="bg-rose-600 hover:bg-rose-500"
              onClick={async () => {
                if (!deleteUser) return;
                const res = await act(deleteUser.id, "delete");
                if (res) {
                  toast({ title: "Account deleted", description: (res.message as string) || `${deleteUser.fullName} was permanently deleted.` });
                  setDeleteUser(null);
                }
              }}
            >
              {busy === deleteUser?.id + "delete" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />} Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetUser} onOpenChange={(v) => !v && setResetUser(null)}>
        <DialogContent className="border-white/10 bg-[#1b2a3b] text-slate-100 sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-white">Reset password — {resetUser?.fullName}</DialogTitle></DialogHeader>
          <Field label="New password" required hint="Minimum 6 characters. Share it securely with the user.">
            <Input type="text" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="e.g. @SecurePass2026" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button disabled={newPassword.length < 6} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]" onClick={async () => { if (resetUser) { await act(resetUser.id, "resetPassword", { newPassword }); setResetUser(null); } }}>Reset</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduleUser} onOpenChange={(v) => !v && setScheduleUser(null)}>
        <DialogContent className="border-white/10 bg-[#1b2a3b] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Work schedule — {scheduleUser?.fullName}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Employment type, working days and shift hours. Weekend days (Sat, Sun) can be included — toggle them on to assign weekend work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Employment type" required>
              <Select value={schedForm.employmentType} onValueChange={(v) => setSchedForm((f) => ({ ...f, employmentType: v }))}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full-time — standard 8-hour shift</SelectItem>
                  <SelectItem value="PART_TIME">Part-time — fewer hours and/or days</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs text-slate-300">Working days <span className="font-normal text-slate-500">— tap to toggle; Sat/Sun = weekend</span></Label>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-slate-300 hover:bg-white/5" onClick={() => setSchedForm((f) => ({ ...f, workDays: "1111100" }))}>Mon–Fri</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-slate-300 hover:bg-white/5" onClick={() => setSchedForm((f) => ({ ...f, workDays: "1111110" }))}>Mon–Sat</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-slate-300 hover:bg-white/5" onClick={() => setSchedForm((f) => ({ ...f, workDays: "1111111" }))}>Every day</Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {WORKDAY_SHORT.map((d, i) => {
                  const on = schedForm.workDays[i] === "1";
                  const weekend = i >= 5;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`rounded-lg border px-1 py-2 text-[11px] font-semibold transition ${
                        on
                          ? weekend
                            ? "border-amber-400/60 bg-amber-500/20 text-amber-700 dark:text-amber-200"
                            : "border-emerald-400/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-slate-600 hover:border-white/25"
                      }`}
                      title={on ? `${d} — working day${weekend ? " (weekend)" : ""}` : `${d} — off`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              {includesWeekend(schedForm.workDays) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">Weekend work assigned — Sat and/or Sun are working days.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Shift starts" required>
                <Input type="time" className={`${inputCls} [color-scheme:dark]`} value={schedForm.shiftStart} onChange={(e) => setSchedForm((f) => ({ ...f, shiftStart: e.target.value }))} />
              </Field>
              <Field label="Shift ends" required>
                <Input type="time" className={`${inputCls} [color-scheme:dark]`} value={schedForm.shiftEnd} onChange={(e) => setSchedForm((f) => ({ ...f, shiftEnd: e.target.value }))} />
              </Field>
            </div>

            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-slate-400">
              {(() => {
                const perDay = shiftHours(schedForm.shiftStart, schedForm.shiftEnd);
                const week = weeklyHours(schedForm);
                if (perDay === null || week === null) return "Enter a valid shift window (end must be after start).";
                const days = schedForm.workDays.split("").filter((c) => c === "1").length;
                return `Summary: ${days} working day${days === 1 ? "" : "s"} · ${perDay % 1 === 0 ? perDay : perDay.toFixed(2)}h/day · ${week % 1 === 0 ? week : week.toFixed(2)}h/week${schedForm.employmentType === "FULL_TIME" && perDay !== 8 ? " — full-time agents normally work an 8-hour shift." : ""}`;
              })()}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setScheduleUser(null)}>Cancel</Button>
            <Button
              disabled={busy === (scheduleUser?.id ?? "") + "setSchedule" || shiftHours(schedForm.shiftStart, schedForm.shiftEnd) === null}
              className="bg-[#6c5ce7] hover:bg-[#5b4bd4]"
              onClick={async () => {
                if (!scheduleUser) return;
                const res = await act(scheduleUser.id, "setSchedule", schedForm);
                if (res) {
                  toast({ title: "Schedule saved", description: (res.schedule as { summary?: string } | undefined)?.summary || `${scheduleUser.fullName}'s schedule was updated.` });
                  setScheduleUser(null);
                }
              }}
            >
              {busy === (scheduleUser?.id ?? "") + "setSchedule" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="mr-1 h-3.5 w-3.5" />} Save schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────── KPI CONFIGURATION ─────────────────────────

interface KpiConfigDTO {
  id: string; department: string; key: string; label: string; category: string;
  unit: string; direction: string; defaultTarget: number | null; mandatory: boolean; active: boolean;
  centreCountry: string; centreState: string;
  isOverride: boolean; globalTarget: number | null;
}

interface CentreDTO { country: string; state: string; agents: number }

export function KpiConfigView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "ADMIN";
  const isSupervisor = user.role === "SUPERVISOR";
  const [configs, setConfigs] = useState<KpiConfigDTO[]>([]);
  const [centres, setCentres] = useState<CentreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("BPO");
  // Selected scope: ALL/ALL = global defaults (administrator only);
  // otherwise a specific centre (country + state) the administrator picked,
  // or the supervisor's own centre.
  const [centreCountry, setCentreCountry] = useState(isSupervisor ? user.country || "" : "ALL");
  const [centreState, setCentreState] = useState(isSupervisor ? user.state || "" : "ALL");
  const [form, setForm] = useState({ key: "", label: "", defaultTarget: "", mandatory: false, unit: "count" });
  const [saving, setSaving] = useState(false);

  const centreSelected = centreCountry !== "ALL" && centreCountry !== "" && centreState !== "ALL" && centreState !== "";

  const load = async () => {
    setLoading(true);
    try {
      const qs = centreSelected ? `?centreCountry=${encodeURIComponent(centreCountry)}&centreState=${encodeURIComponent(centreState)}` : "";
      const { configs, centres } = await api<{ configs: KpiConfigDTO[]; centres?: CentreDTO[] }>(`/api/kpi-config${qs}`);
      setConfigs(configs);
      if (centres) setCentres(centres);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [centreCountry, centreState]);

  const add = async () => {
    if (!form.key || !form.label) return;
    setSaving(true);
    try {
      await api("/api/kpi-config", {
        method: "POST",
        body: JSON.stringify({
          department: deptFilter, key: form.key.trim().replace(/\s+/g, "_").toLowerCase(), label: form.label,
          defaultTarget: form.defaultTarget, unit: form.unit, mandatory: isInbound ? false : form.mandatory, category: "CUSTOM",
          centreCountry: centreSelected ? centreCountry : undefined, centreState: centreSelected ? centreState : undefined,
        }),
      });
      setForm({ key: "", label: "", defaultTarget: "", mandatory: false, unit: "count" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await api(`/api/kpi-config?id=${id}`, { method: "DELETE" });
    load();
  };

  const toggleTarget = async (c: KpiConfigDTO, target: string) => {
    await api("/api/kpi-config", {
      method: "POST",
      body: JSON.stringify({
        department: c.department, key: c.key, label: c.label, category: c.category, unit: c.unit,
        defaultTarget: target, mandatory: c.mandatory, active: c.active,
        centreCountry: centreSelected ? centreCountry : undefined, centreState: centreSelected ? centreState : undefined,
      }),
    });
    load();
  };

  const visible = configs.filter((c) => c.department === deptFilter);
  const isInbound = deptFilter === "INBOUND";
  // Only the outbound BPO template locks its three core template rows — Inbound rows are all editable/deletable.
  const isProtected = (c: KpiConfigDTO) => !centreSelected && deptFilter === "BPO" && ["totalCallsMade", "totalMailsSent", "callsConnected"].includes(c.key);

  const centreLabel = centreSelected
    ? `${COUNTRY_NAMES[centreCountry] || centreCountry} — ${centreState}`
    : "All centres (default)";

  return (
    <div>
      <PageHeader title="KPI Configuration" subtitle="Pick a centre and configure the KPI targets for its teams — or edit the global defaults" />

      {/* Scope selector — administrators choose any centre; supervisors are pinned to theirs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-56 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="BPO">BPO & Outbound Call Centre</SelectItem>
            <SelectItem value="INBOUND">Inbound Call Centre</SelectItem>
            <SelectItem value="WEB_DEV">Web Development & Technical</SelectItem>
            <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin ? (
          <Select
            value={centreSelected ? `${centreCountry}|${centreState}` : "ALL"}
            onValueChange={(v) => {
              if (v === "ALL") { setCentreCountry("ALL"); setCentreState("ALL"); return; }
              const [cc, cs] = v.split("|");
              setCentreCountry(cc); setCentreState(cs);
            }}
          >
            <SelectTrigger className="w-72 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200">
              <MapPin className="mr-1 h-3.5 w-3.5 text-[#eda06a]" />
              <SelectValue placeholder="Choose centre" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">All centres — global defaults</SelectItem>
              {centres.map((c) => (
                <SelectItem key={`${c.country}|${c.state}`} value={`${c.country}|${c.state}`}>
                  {COUNTRY_NAMES[c.country] || c.country} — {c.state} ({c.agents} staff)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-[#eda06a]" />
            {centreSelected ? `Your centre — ${centreLabel}` : "No centre location set on your account"}
          </span>
        )}
      </div>
      {isSupervisor && !centreSelected && (
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-amber-400">
          <Info className="h-3.5 w-3.5" /> Your account has no country/state, so no centre can be resolved. Ask an administrator to set your location.
        </p>
      )}
      {isInbound && (
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-[#b3a5ff]">
          <Info className="h-3.5 w-3.5" /> Inbound Call Centre uses the same metrics as the outbound template — but nothing is required: every metric is optional, and each one can be edited or deleted.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <SectionCard
          title={`Metrics — ${DEPT_LABELS[deptFilter]} · ${centreLabel}`}
          subtitle={centreSelected ? "Values you edit here apply to this centre only and override the global defaults." : "Edit the default target for any metric. Blank target = no fixed target."}
        >
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-white/[0.03]">
                  <TableHead className="text-[11px] text-slate-400">Metric</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Key</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Category</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Unit</TableHead>
                  <TableHead className="text-[11px] text-slate-400">{centreSelected ? "Target for this centre" : "Default target"}</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Mandatory</TableHead>
                  <TableHead className="text-[11px] text-slate-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => (
                  <TableRow key={c.id} className="border-white/5">
                    <TableCell className="py-2 text-xs font-medium text-slate-200">
                      {c.label}
                      {centreSelected && (
                        <span className={cnBadge(c.isOverride)}>
                          {c.isOverride ? "centre override" : "global default"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-[10px] text-slate-500">{c.key}</TableCell>
                    <TableCell className="py-2 text-[10px] uppercase text-slate-500">{c.category.replace(/_/g, " ")}</TableCell>
                    <TableCell className="py-2 text-xs text-slate-400">{c.unit}</TableCell>
                    <TableCell className="py-2">
                      <Input
                        defaultValue={c.defaultTarget !== null ? String(c.defaultTarget) : ""}
                        className="h-7 w-20 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100"
                        onBlur={(e) => { if (e.target.value !== (c.defaultTarget !== null ? String(c.defaultTarget) : "")) toggleTarget(c, e.target.value); }}
                      />
                      {centreSelected && c.isOverride && (
                        <p className="mt-0.5 text-[9px] text-slate-500">global: {c.globalTarget !== null ? c.globalTarget : "—"}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-xs">{isInbound || !c.mandatory ? <span className="text-slate-500">optional</span> : <span className="text-rose-300">required</span>}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        {centreSelected && c.isOverride && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-slate-400 hover:text-amber-300" title="Remove this centre override and fall back to the global default" onClick={() => remove(c.id)}>
                            Reset
                          </Button>
                        )}
                        {!isProtected(c) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-rose-300" onClick={() => remove(c.id)} title="Remove"><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid grid-cols-2 items-end gap-3 border-t border-white/10 pt-4 sm:grid-cols-5">
            <Field label="New metric label"><Input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value, key: e.target.value })} placeholder="e.g. LinkedIn Connections" /></Field>
            <Field label="Default target"><Input type="number" className={`${inputCls} tabular-nums`} value={form.defaultTarget} onChange={(e) => setForm({ ...form, defaultTarget: e.target.value })} /></Field>
            <Field label="Unit">
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>{["count", "percent", "minutes"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Mandatory">
              <Select
                value={isInbound ? "no" : form.mandatory ? "yes" : "no"}
                onValueChange={(v) => setForm({ ...form, mandatory: v === "yes" })}
                disabled={isInbound}
              >
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="no">Optional</SelectItem><SelectItem value="yes">Required</SelectItem></SelectContent>
              </Select>
            </Field>
            <Button disabled={saving || !form.label} onClick={add} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
              {centreSelected ? "Add for this centre" : "Add metric"}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Report Templates — per-team team-lead daily report formats, editable here */}
      <div className="mt-8 border-t border-white/10 pt-6">
        <TeamLeadTemplateEditor />
      </div>
    </div>
  );
}

function cnBadge(isOverride: boolean) {
  return isOverride
    ? "ml-2 rounded bg-[#e8935a]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#c2641f] dark:text-[#f0b285]"
    : "ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500";
}

// ───────────────────────── AUDIT TRAIL ─────────────────────────

export function AuditView() {
  const [logs, setLogs] = useState<{ id: string; actorName: string | null; action: string; entity: string; entityId: string | null; details: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ logs: typeof logs }>("/api/audit").then(({ logs }) => setLogs(logs)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="System-wide activity log — who did what and when" />
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No audit entries yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">Time</TableHead>
                <TableHead className="text-[11px] text-slate-400">Actor</TableHead>
                <TableHead className="text-[11px] text-slate-400">Action</TableHead>
                <TableHead className="text-[11px] text-slate-400">Entity</TableHead>
                <TableHead className="text-[11px] text-slate-400">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className="border-white/5">
                  <TableCell className="whitespace-nowrap py-2 text-[11px] text-slate-500">{fmtDateTime(l.createdAt)}</TableCell>
                  <TableCell className="py-2 text-xs font-medium text-slate-200">{l.actorName || "—"}</TableCell>
                  <TableCell className="py-2"><span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#b3a5ff]">{l.action}</span></TableCell>
                  <TableCell className="py-2 text-[11px] text-slate-400">{l.entity}</TableCell>
                  <TableCell className="max-w-md truncate py-2 text-[11px] text-slate-500">{l.details || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── NOTIFICATIONS ─────────────────────────

export function NotificationsView({ user, onNavigate }: { user: { id: string; role: string; fullName: string; email: string; department: string; team?: string | null; employeeId?: string | null; status: string }; onNavigate: (view: string, data?: string) => void }) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { notifications } = await api<{ notifications: NotificationDTO[] }>("/api/notifications");
      setItems(notifications);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ action: "readAll" }) });
    load();
  };

  const openNotification = async (n: NotificationDTO) => {
    await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ action: "read", id: n.id }) });
    let link: { view?: string; id?: string } = {};
    try { link = n.linkData ? JSON.parse(n.linkData) : {}; } catch {}
    load();
    if (link.view) onNavigate(link.view, link.id);
  };

  const sevColor = (s: string) => (s === "CRITICAL" ? "border-l-rose-500" : s === "WARNING" ? "border-l-amber-500" : "border-l-sky-500");

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Alerts for submissions, KPI shortfalls, escalations, overdue reports and failed uploads"
        actions={
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-white/10" onClick={markAll}>Mark all read</Button>
        }
      />
      <div className="mb-5">
        <EscalationsPanel user={user as SessionUser} />
      </div>
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" hint="You will be alerted here when action is needed." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button key={n.id} onClick={() => openNotification(n)} className={`k-card flex w-full items-start gap-3 border-l-4 p-4 text-left ${sevColor(n.severity)} ${n.read ? "opacity-60" : ""}`}>
              <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.severity === "CRITICAL" ? "text-rose-400" : n.severity === "WARNING" ? "text-amber-400" : "text-sky-400"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-[#e8833a]" />}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{n.message}</p>
                <p className="mt-1 text-[10px] text-slate-600">{fmtDateTime(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── UPLOADS (supervisor view) ─────────────────────────

export function UploadsAdminView() {
  const [uploads, setUploads] = useState<{ id: string; originalName: string; sizeBytes: number; extractStatus: string; reportDate: string | null; department: string | null; reportId: string | null; user?: { fullName: string }; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ uploads: typeof uploads }>("/api/uploads").then(({ uploads }) => setUploads(uploads)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Uploaded Files" subtitle="All uploaded report documents, their extraction status and linked reports" />
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : uploads.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No uploads yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">File</TableHead>
                <TableHead className="text-[11px] text-slate-400">Employee</TableHead>
                <TableHead className="text-[11px] text-slate-400">Dept</TableHead>
                <TableHead className="text-[11px] text-slate-400">Report date</TableHead>
                <TableHead className="text-[11px] text-slate-400">Extraction status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((u) => (
                <TableRow key={u.id} className="border-white/5">
                  <TableCell className="max-w-48 truncate py-2.5 text-xs text-slate-200">{u.originalName} <span className="text-slate-600">({(u.sizeBytes / 1024).toFixed(0)} KB)</span></TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-300">{u.user?.fullName}</TableCell>
                  <TableCell className="py-2.5 text-[11px] text-slate-500">{DEPT_LABELS[u.department || ""] || u.department || "—"}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-400">{u.reportDate ? fmtDate(u.reportDate) : "—"}</TableCell>
                  <TableCell className="py-2.5"><StatusBadge status={u.extractStatus} /></TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-300" onClick={() => window.open(`/api/uploads/file?id=${u.id}`, "_blank")}>Open</Button>
                      {u.reportId && <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#8b7ff5]" onClick={() => window.open(`/api/export?format=docx&id=${u.reportId}`, "_blank")}>Report</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
