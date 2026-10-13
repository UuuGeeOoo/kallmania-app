"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, fmtDate, fmtDateTime, ROLE_LABELS, DEPT_LABELS, type UserDTO, type NotificationDTO } from "@/lib/client";
import { PageHeader, EmptyState, StatusBadge, SectionCard, Field, inputCls } from "@/components/kallmania/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CheckCircle2, XCircle, PauseCircle, PlayCircle, KeyRound, Trash2, Loader2, Bell, Settings2, ScrollText } from "lucide-react";

// ───────────────────────── USER MANAGEMENT ─────────────────────────

export function AdminUsersView() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [resetUser, setResetUser] = useState<UserDTO | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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

  const act = async (userId: string, action: string, extra?: Record<string, unknown>) => {
    setBusy(userId + action);
    try {
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId, action, ...extra }) });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const changeRole = async (userId: string, role: string) => {
    setBusy(userId + "role");
    try {
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId, action: "changeRole", role }) });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const visible = users.filter((u) => filter === "ALL" || u.status === filter);
  const pending = users.filter((u) => u.status === "PENDING");

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
                    Requested role: <span className="font-semibold text-[#b3a5ff]">{ROLE_LABELS[u.role]}</span> · Department: {DEPT_LABELS[u.department] || u.department} · registered {fmtDate(u.createdAt)}
                  </p>
                </div>
                <Select defaultValue={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                  <SelectTrigger className="h-8 w-52 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "SUPERVISOR", "ADMIN"].map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <TableHead className="text-[11px] text-slate-400">Role</TableHead>
                <TableHead className="text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-[11px] text-slate-400">Registered</TableHead>
                <TableHead className="text-[11px] text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id} className="border-white/5">
                  <TableCell className="py-2.5 text-xs font-semibold text-slate-200">{u.fullName}</TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-400">{u.email}</TableCell>
                  <TableCell className="py-2.5">
                    <Select defaultValue={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                      <SelectTrigger className="h-7 w-44 border-slate-600/50 bg-[#15202e]/60 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "SUPERVISOR", "ADMIN"].map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2.5"><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="py-2.5 text-[11px] text-slate-500">{fmtDate(u.createdAt)}</TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1">
                      {u.status === "PENDING" && <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" title="Approve" onClick={() => act(u.id, "approve")}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
                      {u.status === "APPROVED" && <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400" title="Suspend" onClick={() => act(u.id, "suspend")}><PauseCircle className="h-3.5 w-3.5" /></Button>}
                      {u.status === "SUSPENDED" && <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" title="Reactivate" onClick={() => act(u.id, "reactivate")}><PlayCircle className="h-3.5 w-3.5" /></Button>}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#8b7ff5]" title="Reset password" onClick={() => { setResetUser(u); setNewPassword(""); }}><KeyRound className="h-3.5 w-3.5" /></Button>
                      {u.role !== "ADMIN" && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-300" title="Delete" onClick={() => act(u.id, "delete")}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
    </div>
  );
}

// ───────────────────────── KPI CONFIGURATION ─────────────────────────

interface KpiConfigDTO {
  id: string; department: string; key: string; label: string; category: string;
  unit: string; direction: string; defaultTarget: number | null; mandatory: boolean; active: boolean;
}

export function KpiConfigView() {
  const [configs, setConfigs] = useState<KpiConfigDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("BPO");
  const [form, setForm] = useState({ key: "", label: "", defaultTarget: "", mandatory: false, unit: "count" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { configs } = await api<{ configs: KpiConfigDTO[] }>("/api/kpi-config");
      setConfigs(configs);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.key || !form.label) return;
    setSaving(true);
    try {
      await api("/api/kpi-config", {
        method: "POST",
        body: JSON.stringify({ department: deptFilter, key: form.key.trim().replace(/\s+/g, "_").toLowerCase(), label: form.label, defaultTarget: form.defaultTarget, unit: form.unit, mandatory: form.mandatory, category: "EMAIL_EXTENSION" }),
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
      body: JSON.stringify({ department: c.department, key: c.key, label: c.label, category: c.category, unit: c.unit, defaultTarget: target, mandatory: c.mandatory, active: c.active }),
    });
    load();
  };

  const visible = configs.filter((c) => c.department === deptFilter);

  return (
    <div>
      <PageHeader title="KPI Configuration" subtitle="Configure targets, mandatory fields and metric catalogues per department" />
      <div className="mb-4">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-56 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="BPO">BPO & Outbound Call Centre</SelectItem>
            <SelectItem value="WEB_DEV">Web Development & Technical</SelectItem>
            <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <SectionCard title={`Metrics — ${DEPT_LABELS[deptFilter]}`} subtitle="Edit the default target for any metric. Blank target = no fixed target.">
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-white/[0.03]">
                  <TableHead className="text-[11px] text-slate-400">Metric</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Key</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Category</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Unit</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Default target</TableHead>
                  <TableHead className="text-[11px] text-slate-400">Mandatory</TableHead>
                  <TableHead className="text-[11px] text-slate-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => (
                  <TableRow key={c.id} className="border-white/5">
                    <TableCell className="py-2 text-xs font-medium text-slate-200">{c.label}</TableCell>
                    <TableCell className="py-2 font-mono text-[10px] text-slate-500">{c.key}</TableCell>
                    <TableCell className="py-2 text-[10px] uppercase text-slate-500">{c.category.replace(/_/g, " ")}</TableCell>
                    <TableCell className="py-2 text-xs text-slate-400">{c.unit}</TableCell>
                    <TableCell className="py-2">
                      <Input
                        defaultValue={c.defaultTarget !== null ? String(c.defaultTarget) : ""}
                        className="h-7 w-20 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100"
                        onBlur={(e) => { if (e.target.value !== (c.defaultTarget !== null ? String(c.defaultTarget) : "")) toggleTarget(c, e.target.value); }}
                      />
                    </TableCell>
                    <TableCell className="py-2 text-xs">{c.mandatory ? <span className="text-rose-300">required</span> : <span className="text-slate-500">optional</span>}</TableCell>
                    <TableCell className="py-2">
                      {!["totalCallsMade", "totalMailsSent", "callsConnected"].includes(c.key) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-rose-300" onClick={() => remove(c.id)} title="Remove"><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
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
              <Select value={form.mandatory ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, mandatory: v === "yes" })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="no">Optional</SelectItem><SelectItem value="yes">Required</SelectItem></SelectContent>
              </Select>
            </Field>
            <Button disabled={saving || !form.label} onClick={add} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />} Add metric
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
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

export function NotificationsView({ user, onNavigate }: { user: { id: string }; onNavigate: (view: string, data?: string) => void }) {
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
