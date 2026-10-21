"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, fmtDate, todayISO, TASK_DEPTS, type TaskDTO, type SessionUser, type UserDTO } from "@/lib/client";
import { SectionCard, PageHeader, EmptyState, StatusBadge, Field, inputCls } from "@/components/kallmania/shared";
import { Country } from "country-state-city";
import { Plus, Loader2, Trash2, Pencil, ListTodo, Globe2, Building2, Users2 } from "lucide-react";

const ALL_COUNTRIES = Country.getAllCountries().slice().sort((a, b) => a.name.localeCompare(b.name));
const countryName = (code?: string | null) => (code ? ALL_COUNTRIES.find((c) => c.isoCode === code)?.name || code : "");

/** Sentinel values for the Assign-to select */
const ASSIGN_ALL_CENTRES = "__ALL_CENTRES__";
const ASSIGN_WHOLE_CENTRE = "__WHOLE_CENTRE__";

const ALL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "UNDER_REVIEW", "BLOCKED", "PENDING_DEPLOYMENT", "AWAITING_APPROVAL", "NOT_COMPLETED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TECH_CATEGORIES = ["Website Development", "Frontend Development", "Backend Development", "Bug Fixing", "Website Maintenance", "API Integration", "Database Tasks", "Technical Support", "Testing & QA", "Deployment & Release", "Security & Performance", "Technical Research", "Documentation", "Other"];
const SOCIAL_CATEGORIES = ["Content Planning", "Content Creation", "Graphic Design", "Video Production", "Post Scheduling", "Community Management", "Engagement Monitoring", "Analytics & Reporting", "Content Research", "Campaign Management", "Other"];
const BPO_CATEGORIES = ["Outbound Calls", "Lead Qualification", "Follow-ups", "Email Outreach", "Campaign Activity", "Data / List Cleanup", "Other"];

const STATUS_COLORS_TASK: Record<string, string> = {
  NOT_STARTED: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  UNDER_REVIEW: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  BLOCKED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  PENDING_DEPLOYMENT: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  AWAITING_APPROVAL: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  NOT_COMPLETED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

function categoriesFor(dept: string): string[] {
  if (dept === "WEB_DEV") return TECH_CATEGORIES;
  if (dept === "SOCIAL_MEDIA") return SOCIAL_CATEGORIES;
  // Inbound / Outbound / legacy BPO — call centre categories
  if (dept === "BPO" || dept === "INBOUND" || dept === "OUTBOUND") return [...BPO_CATEGORIES, "Inbound Call Handling", "Customer Enquiry Resolution"];
  return [...BPO_CATEGORIES, ...TECH_CATEGORIES, ...SOCIAL_CATEGORIES];
}

/** Human label for who/where a task is assigned. */
function scopeLabel(t: TaskDTO): string {
  if (t.allCentres) return "→ All centres (everyone)";
  if (t.assignee) return `→ ${t.assignee.fullName}`;
  if (t.centreState) {
    const names = (t.assignees || []).map((a) => a.user.fullName);
    const where = t.centreCountry ? `${t.centreState}, ${countryName(t.centreCountry)}` : t.centreState;
    const sample = names.slice(0, 2).join(", ");
    return `→ ${where} centre — ${names.length} assigned${sample ? ` (${sample}${names.length > 2 ? "…" : ""})` : ""}`;
  }
  return "→ Unassigned";
}

function TaskDialog({ user, task, onSaved, open, setOpen }: { user: SessionUser; task: TaskDTO | null; onSaved: () => void; open: boolean; setOpen: (v: boolean) => void }) {
  const isManager = user.role === "SUPERVISOR" || user.role === "ADMIN";
  const canAssign = isManager || user.role === "TEAM_LEAD"; // team leads assign tasks within their centre
  const [staff, setStaff] = useState<UserDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", assigneeId: "", department: user.department, category: "", projectRef: "",
    priority: "MEDIUM", requiredOutcome: "", target: "", deadline: "", estimatedHours: "",
    country: "", centreState: "",
  });

  // Centre catalogue derived from registered staff — a centre is a state/region
  // within a country, so the country select lists countries where staff exist.
  const centreCountries = (() => {
    const counts = new Map<string, number>();
    for (const u of staff) if (u.country) counts.set(u.country, (counts.get(u.country) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const centreStates = (() => {
    const counts = new Map<string, number>();
    for (const u of staff) if (u.country && u.country === form.country && u.state) counts.set(u.state, (counts.get(u.state) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  })();
  // Assign-to list: ONLY agents of the chosen centre (per the assignment scope);
  // with no centre picked, fall back to the full staff list.
  const centreAgents = form.centreState
    ? staff.filter((u) => u.country === form.country && u.state === form.centreState)
    : staff;

  useEffect(() => {
    if (open) {
      if (canAssign) api<{ users: UserDTO[] }>("/api/users").then(({ users }) => setStaff(users.filter((u) => ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "SUPERVISOR"].includes(u.role)))).catch(() => {});
      setSelectedIds([]);
      if (task) {
        const preAll = task.allCentres ? ASSIGN_ALL_CENTRES : "";
        const preCentre = !task.allCentres && task.centreState && !task.assigneeId ? ASSIGN_WHOLE_CENTRE : "";
        setForm({
          title: task.title, description: task.description || "", assigneeId: preAll || preCentre || task.assigneeId || "", department: task.department,
          category: task.category || "", projectRef: task.projectRef || "", priority: task.priority,
          requiredOutcome: task.requiredOutcome || "", target: task.target || "",
          deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : "", estimatedHours: task.estimatedHours !== null && task.estimatedHours !== undefined ? String(task.estimatedHours) : "",
          country: task.centreCountry || "", centreState: task.centreState || "",
        });
      } else {
        setForm({ title: "", description: "", assigneeId: "", department: user.department, category: "", projectRef: "", priority: "MEDIUM", requiredOutcome: "", target: "", deadline: "", estimatedHours: "", country: "", centreState: "" });
      }
    }
  }, [open, task, isManager, user.department]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      // Map the assign-to selection onto the API payload. Centre fields
      // are only a broadcast scope for "Entire centre" — individual picks
      // stay visible to those people only.
      const payload: Record<string, unknown> = { ...form };
      delete payload.country;
      const wholeCentre = form.assigneeId === ASSIGN_WHOLE_CENTRE;
      const allCentres = form.assigneeId === ASSIGN_ALL_CENTRES;
      payload.centreCountry = wholeCentre ? form.country : null;
      payload.centreState = wholeCentre ? form.centreState : null;
      payload.allCentres = allCentres;
      if (allCentres || wholeCentre) {
        payload.assigneeId = null;
      } else if (!task && canAssign) {
        // Create mode: multi-select individual assignment (single or multiple agents)
        payload.assigneeIds = selectedIds;
        payload.assigneeId = selectedIds[0] || null;
      }
      if (task) {
        await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: task.id, ...payload }) });
      } else {
        await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
      }
      setOpen(false);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1b2a3b] text-slate-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle className="text-white">{task ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Task description" required><Input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" /></Field></div>
          {isManager && (
            <>
              <Field label="Centre country" hint={centreCountries.length === 0 ? "No staff locations registered yet" : "Countries where your staff are registered"}>
                <Select
                  value={form.country || undefined}
                  onValueChange={(v) => setForm({ ...form, country: v, centreState: "", assigneeId: "" })}
                >
                  <SelectTrigger className={inputCls}><SelectValue placeholder={centreCountries.length ? "Select country" : "No countries yet"} /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {centreCountries.map(([code, count]) => <SelectItem key={code} value={code}>{countryName(code)} ({count})</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Centre" hint={form.country ? "Centres (states) with registered staff" : "Pick a country first"}>
                <Select
                  value={form.centreState || undefined}
                  onValueChange={(v) => setForm({ ...form, centreState: v, assigneeId: "" })}
                  disabled={!form.country}
                >
                  <SelectTrigger className={inputCls}><SelectValue placeholder={form.country ? (centreStates.length ? "Select centre" : "No centres in this country") : "Pick a country first"} /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {centreStates.map(([state, count]) => <SelectItem key={state} value={state}>{state} ({count})</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field label={form.centreState ? `Assign to — agents in ${form.centreState} centre` : canAssign && !isManager ? "Assign to — agents in your centre" : "Assign to"}>
            {!canAssign ? (
              <Input readOnly disabled className={inputCls} value="Me" />
            ) : task ? (
              /* Edit mode — keep the original single-assignee select */
              <Select value={form.assigneeId || undefined} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select who / where" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {isManager && (
                    <>
                      <SelectItem value={ASSIGN_ALL_CENTRES} className="font-semibold text-emerald-300">
                        <span className="inline-flex items-center gap-2"><Globe2 className="h-3.5 w-3.5" />All centres — everyone</span>
                      </SelectItem>
                      {form.centreState && (
                        <SelectItem value={ASSIGN_WHOLE_CENTRE} className="font-semibold text-sky-300">
                          <span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />Entire {form.centreState} centre</span>
                        </SelectItem>
                      )}
                    </>
                  )}
                  {centreAgents.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} — {u.role.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              /* Create mode — single OR multiple agents via checkbox list */
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
                {isManager && (
                  <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-2">
                    <button type="button" onClick={() => setForm({ ...form, assigneeId: form.assigneeId === ASSIGN_ALL_CENTRES ? "" : ASSIGN_ALL_CENTRES })} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${form.assigneeId === ASSIGN_ALL_CENTRES ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>
                      <Globe2 className="mr-1 inline h-3 w-3" />All centres
                    </button>
                    {form.centreState && (
                      <button type="button" onClick={() => setForm({ ...form, assigneeId: form.assigneeId === ASSIGN_WHOLE_CENTRE ? "" : ASSIGN_WHOLE_CENTRE })} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${form.assigneeId === ASSIGN_WHOLE_CENTRE ? "border-sky-400/50 bg-sky-500/15 text-sky-300" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>
                        <Building2 className="mr-1 inline h-3 w-3" />Entire {form.centreState} centre ({centreAgents.length})
                      </button>
                    )}
                    <button type="button" onClick={() => { setForm({ ...form, assigneeId: "" }); setSelectedIds([]); }} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-500 hover:bg-white/5">Clear</button>
                  </div>
                )}
                {form.assigneeId === ASSIGN_ALL_CENTRES || form.assigneeId === ASSIGN_WHOLE_CENTRE ? (
                  <p className="px-1 py-1 text-[11px] text-slate-500">
                    Broadcast scope selected — {form.assigneeId === ASSIGN_ALL_CENTRES ? "everyone in every centre" : `every agent in the ${form.centreState} centre`} will be assigned automatically.
                  </p>
                ) : centreAgents.length === 0 ? (
                  <p className="px-1 py-1 text-[11px] text-slate-500">{isManager && !form.centreState ? "Pick a centre above to list its agents." : "No agents found in your centre yet."}</p>
                ) : (
                  centreAgents.map((u) => {
                    const checked = selectedIds.includes(u.id);
                    return (
                      <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-slate-300 transition hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedIds((prev) => (checked ? prev.filter((id) => id !== u.id) : [...prev, u.id]))}
                          className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[#e8935a]"
                        />
                        <span className="truncate font-medium">{u.fullName}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-slate-500">{u.role.replace(/_/g, " ").toLowerCase()}</span>
                      </label>
                    );
                  })
                )}
                {selectedIds.length > 0 && form.assigneeId === "" && (
                  <p className="px-1 pt-1 text-[10px] font-semibold text-[#eda06a]">{selectedIds.length} agent{selectedIds.length === 1 ? "" : "s"} selected</p>
                )}
              </div>
            )}
          </Field>
          <Field label="Department">
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v, category: "" })} disabled={!canAssign}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_DEPTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categoriesFor(form.department).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Project / website / campaign"><Input className={inputCls} value={form.projectRef} onChange={(e) => setForm({ ...form, projectRef: e.target.value })} /></Field>
          <Field label="Priority">
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Deadline"><Input type="date" className={inputCls} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Required outcome / deliverable"><Input className={inputCls} value={form.requiredOutcome} onChange={(e) => setForm({ ...form, requiredOutcome: e.target.value })} placeholder="e.g. Landing page deployed" /></Field></div>
          <div className="sm:col-span-2"><Field label="Target / acceptance criteria / KPI target" hint="What does 'done well' mean? Numeric targets link to KPIs."><Input className={inputCls} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="e.g. 30 calls / 98% pass rate" /></Field></div>
          <Field label="Estimated effort (hrs)"><Input type="number" step="0.5" className={inputCls} value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Notes / context"><Textarea rows={2} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        </div>
        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving || !form.title} onClick={save} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{task ? "Save changes" : "Create task"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TasksView({ user, managerMode = false }: { user: SessionUser; managerMode?: boolean }) {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!managerMode) params.set("mine", "1");
      if (deptFilter !== "ALL") params.set("department", deptFilter);
      const { tasks } = await api<{ tasks: TaskDTO[] }>(`/api/tasks?${params}`);
      setTasks(tasks);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load();   }, [managerMode, deptFilter]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, unknown>) => {
    await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id, status, ...extra }) });
    load();
  };
  const remove = async (id: string) => {
    await api(`/api/tasks?id=${id}`, { method: "DELETE" });
    load();
  };

  const isManager = user.role === "SUPERVISOR" || user.role === "ADMIN";
  const visible = tasks.filter((t) => filter === "ALL" || t.status === filter);
  const overdue = (t: TaskDTO) => t.deadline && new Date(t.deadline) < new Date(todayISO() + "T23:59:59") && !["COMPLETED"].includes(t.status);

  return (
    <div>
      <PageHeader
        title={managerMode ? "Tasks & Assignments" : "My Tasks"}
        subtitle={managerMode ? "Create, assign and monitor tasks across departments" : "Your assigned tasks — update status and record blockers"}
        actions={
          <>
            {managerMode && (
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-40 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All departments</SelectItem>
                  {TASK_DEPTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-[#6c5ce7] hover:bg-[#5b4bd4]">
              <Plus className="mr-2 h-4 w-4" /> {managerMode ? "Assign task" : "Add personal task"}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", ...ALL_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${filter === s ? "bg-[#6c5ce7] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <EmptyState icon={<ListTodo className="h-8 w-8" />} title="No tasks here" hint={managerMode ? "Assign the first task to a team member." : "Nothing assigned yet — your supervisor will assign tasks, or add a personal one."} />
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <div key={t.id} className={`k-card p-4 ${overdue(t) ? "border-rose-500/40" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{t.title}</p>
                    <StatusBadge status={t.status} />
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${t.priority === "URGENT" ? "border-rose-400/40 bg-rose-500/15 text-rose-300" : t.priority === "HIGH" ? "border-amber-400/40 bg-amber-500/15 text-amber-300" : "border-slate-500/40 bg-slate-500/10 text-slate-300"}`}>{t.priority}</span>
                    {overdue(t) && <span className="rounded border border-rose-400/40 bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">OVERDUE</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {scopeLabel(t)} · {t.department.replace(/_/g, " ")}{t.category ? ` · ${t.category}` : ""}{t.projectRef ? ` · ${t.projectRef}` : ""}
                    {t.deadline ? ` · due ${fmtDate(t.deadline)}` : ""}
                  </p>
                  {(t.requiredOutcome || t.target) && (
                    <p className="mt-1 text-xs text-slate-500">{t.requiredOutcome ? `Outcome: ${t.requiredOutcome}` : ""}{t.target ? ` · Target: ${t.target}` : ""}</p>
                  )}
                  {t.blocker && <p className="mt-1 text-xs text-rose-300">⛔ Blocker: {t.blocker}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                    <SelectTrigger className="h-8 w-44 border-slate-600/50 bg-[#15202e]/60 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  {isManager && (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-100" onClick={() => { setEditing(t); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-300" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
              {t.status === "BLOCKED" && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/5 pt-3">
                  <div className="min-w-64 flex-1"><Field label="What is blocking this task?"><Input className={inputCls} defaultValue={t.blocker || ""} placeholder="e.g. waiting on API credentials" onBlur={(e) => updateStatus(t.id, "BLOCKED", { blocker: e.target.value })} /></Field></div>
                  <div className="w-32"><Field label="Next steps"><Input className={inputCls} defaultValue={t.nextSteps || ""} onBlur={(e) => api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: t.id, nextSteps: e.target.value }) })} /></Field></div>
                </div>
              )}
              {(t.assignees?.length ?? 0) > 1 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Assigned to {t.assignees!.length} agents:</span>
                  {t.assignees!.map((a) => (
                    <span key={a.userId} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300">{a.user.fullName}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TaskDialog user={user} task={editing} onSaved={load} open={dialogOpen} setOpen={setDialogOpen} />
    </div>
  );
}
