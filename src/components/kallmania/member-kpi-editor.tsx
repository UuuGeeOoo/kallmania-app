"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ROLE_LABELS, type UserDTO } from "@/lib/client";
import { EmptyState, MetricCombobox, DeptReportSections, type MetricOption } from "@/components/kallmania/shared";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Target, Trash2, Check, X, Plus, Clock4 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Individual (per-member) KPI configuration editor.
 * Administrators & supervisors save directly (APPROVED); a team lead's edits
 * stay PENDING until a supervisor or administrator approves them.
 */

export interface MemberKpiConfigDTO {
  id: string;
  userId: string;
  department: string;
  key: string;
  label: string;
  target: number | null;
  unit: string;
  status: string; // PENDING | APPROVED | REJECTED
  proposedByName?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
  updatedAt: string;
}

interface CatalogEntry { key: string; label: string; category?: string; unit: string }

const inputCls = "border-white/12 bg-white/[0.055] text-slate-100 placeholder:text-slate-500";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  REJECTED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

export function MemberKpiEditor({ staff, me, onChanged }: { staff: { id: string; fullName: string; role?: string; department?: string; team?: string | null }; me: { id: string; role: string; team?: string | null; department?: string }; onChanged?: () => void }) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<MemberKpiConfigDTO[]>([]);
  const [cat, setCat] = useState<Record<string, CatalogEntry[]>>({});
  const [canApprove, setCanApprove] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Record<string, string>>({});
  // Add-metric form. The metric field is a combobox: pick one of the known
  // options or type a brand-new custom metric name.
  const [newDept, setNewDept] = useState("BPO");
  const [newLabel, setNewLabel] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newUnit, setNewUnit] = useState("count");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ configs: MemberKpiConfigDTO[]; catalog: Record<string, CatalogEntry[]>; canApprove: boolean; canEdit: boolean }>(`/api/users/${staff.id}/member-kpi`);
      setConfigs(d.configs);
      setCat(d.catalog || {});
      setCanApprove(d.canApprove);
      setCanEdit(d.canEdit);
    } finally {
      setLoading(false);
    }
  }, [staff.id]);
  useEffect(() => { load(); }, [load]);

  const save = async (department: string, key: string, label: string, target: string, unit: string) => {
    setBusy(key);
    try {
      const res = await api<{ config: MemberKpiConfigDTO }>(`/api/users/${staff.id}/member-kpi`, {
        method: "POST",
        body: JSON.stringify({ department, key, label, target, unit }),
      });
      toast({
        title: res.config.status === "PENDING" ? "Sent for approval" : "Individual KPI updated",
        description: res.config.status === "PENDING"
          ? `“${label}” now waits for a supervisor or administrator to approve it.`
          : `“${label}” applies to ${staff.fullName} immediately.`,
      });
      resetMetricForm();
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const review = async (configId: string, action: "approve" | "reject") => {
    setBusy(configId + action);
    try {
      await api(`/api/users/${staff.id}/member-kpi`, { method: "PATCH", body: JSON.stringify({ configId, action }) });
      toast({ title: action === "approve" ? "Proposal approved" : "Proposal rejected" });
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Review failed", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (configId: string) => {
    setBusy(configId + "del");
    try {
      await api(`/api/users/${staff.id}/member-kpi?configId=${encodeURIComponent(configId)}`, { method: "DELETE" });
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Could not remove", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = configs.filter((c) => c.status === "PENDING").length;
  const catalogEntries = cat[newDept] || [];

  // Resolve what the typed metric text means: an exact catalogue match keeps
  // its canonical key/label/unit; anything else becomes a new custom metric.
  const typedText = newLabel.trim();
  const typedMatch = typedText
    ? catalogEntries.find((m) => m.label.toLowerCase() === typedText.toLowerCase() || m.key === typedText)
    : undefined;
  const resolvedKey = typedMatch ? typedMatch.key : typedText ? typedText.replace(/\s+/g, "_").toLowerCase() : "";
  const isCustomMetric = !!typedText && !typedMatch;

  const resetMetricForm = () => { setNewLabel(""); setNewTarget(""); setNewUnit("count"); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#eda06a]">
          <Target className="mr-1 inline h-3.5 w-3.5" /> Individual KPI configuration — {staff.fullName}
        </p>
        {pendingCount > 0 && (
          <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            {pendingCount} pending approval
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        {me.role === "TEAM_LEAD"
          ? "Your edits apply to this member's report targets once a supervisor or administrator approves them."
          : me.role === "SUPERVISOR"
            ? "Your changes apply immediately. Team-lead proposals below wait for your approval."
            : "Your changes apply immediately. You also approve or reject team-lead proposals."}
      </p>

      {loading ? (
        <div className="flex justify-center py-6 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : configs.length === 0 ? (
        <EmptyState icon={<Target className="h-6 w-6" />} title="No individual KPI settings yet" hint="The member follows the centre/global defaults. Add an override below." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-white/10 bg-white/[0.03] text-left text-[11px] text-slate-400">
                <th className="px-3 py-2 font-medium">Metric</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Individual target</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.id} className="border-white/5">
                  <td className="px-3 py-2 text-slate-200">
                    {c.label}
                    <span className="ml-2 font-mono text-[9px] text-slate-600">{c.key}</span>
                    {c.proposedByName && <p className="text-[9px] text-slate-600">by {c.proposedByName}{c.reviewedByName && c.status !== "PENDING" ? ` · reviewed by ${c.reviewedByName}` : ""}</p>}
                  </td>
                  <td className="px-3 py-2 text-[10px] uppercase text-slate-500">{c.department.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          defaultValue={c.target !== null ? String(c.target) : ""}
                          key={c.id + String(c.target)}
                          className="h-7 w-20 border-slate-600/50 bg-[#15202e]/60 text-xs tabular-nums text-slate-100"
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (c.target !== null ? String(c.target) : "")) save(c.department, c.key, c.label, v, c.unit);
                          }}
                        />
                        <span className="text-[10px] text-slate-500">{c.unit}</span>
                      </div>
                    ) : (
                      <span className="tabular-nums text-slate-300">{c.target !== null ? `${c.target} ${c.unit}` : "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", STATUS_STYLE[c.status] || STATUS_STYLE.PENDING)}>
                      {c.status === "PENDING" && <Clock4 className="mr-1 inline h-2.5 w-2.5" />}{c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {canApprove && c.status === "PENDING" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-300 hover:bg-emerald-500/10" title="Approve" disabled={busy === c.id + "approve"} onClick={() => review(c.id, "approve")}>
                            {busy === c.id + "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-300 hover:bg-rose-500/10" title="Reject" disabled={busy === c.id + "reject"} onClick={() => review(c.id, "reject")}>
                            {busy === c.id + "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                      {canEdit && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-rose-300" title="Remove this individual override" disabled={busy === c.id + "del"} onClick={() => remove(c.id)}>
                          {busy === c.id + "del" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="grid grid-cols-2 items-end gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-400">Department</label>
            <Select value={newDept} onValueChange={(v) => { setNewDept(v); resetMetricForm(); }}>
              <SelectTrigger className="h-8 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BPO">Outbound Call Centre</SelectItem>
                <SelectItem value="INBOUND">Inbound Call Centre</SelectItem>
                <SelectItem value="WEB_DEV">Web & Technical</SelectItem>
                <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-400">Metric</label>
            <MetricCombobox
              options={catalogEntries as MetricOption[]}
              text={newLabel}
              onSelect={(o) => { setNewLabel(o.label); setNewUnit(o.unit || "count"); }}
              onText={setNewLabel}
              placeholder="Pick a metric or type a new one"
            />
            {isCustomMetric ? (
              <div className="space-y-1">
                <Select value={newUnit} onValueChange={setNewUnit}>
                  <SelectTrigger className="h-7 border-slate-600/50 bg-[#1b2a3b] text-[11px] text-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">count</SelectItem>
                    <SelectItem value="percent">percent</SelectItem>
                    <SelectItem value="minutes">minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-slate-500">New custom metric — key <span className="font-mono">{resolvedKey}</span></p>
              </div>
            ) : typedMatch ? (
              <p className="text-[9px] text-slate-500">key <span className="font-mono">{typedMatch.key}</span></p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-400">Daily target</label>
            <Input type="number" step="any" className={cn("h-8 tabular-nums", inputCls)} value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="blank = none" />
          </div>
          <Button
            className="h-8 bg-[#6c5ce7] text-xs hover:bg-[#5b4bd4]"
            disabled={!typedText || busy !== null}
            onClick={() => {
              if (typedMatch) save(newDept, typedMatch.key, typedMatch.label, newTarget, typedMatch.unit || "count");
              else if (typedText) save(newDept, resolvedKey, typedText, newTarget, newUnit);
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            Set individual target
          </Button>
        </div>
      )}

      {/* Other report sections for this member's department — full structure visibility */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <DeptReportSections department={newDept} compact />
      </div>
    </div>
  );
}

/** Member picker + editor — embedded in KPI Configuration for admins, supervisors and team leads. */
export function MemberKpiConfigCard({ me }: { me: { id: string; role: string; fullName: string; team?: string | null; department?: string } }) {
  const [members, setMembers] = useState<UserDTO[]>([]);
  const [selected, setSelected] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ users: UserDTO[] }>("/api/users")
      .then(({ users }) => setMembers(users.filter((u) => u.id !== me.id)))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [me.id]);

  const pickerLabel = me.role === "TEAM_LEAD" ? "Your team members" : me.role === "SUPERVISOR" ? "Members of your centre" : "All staff";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selected?.id || undefined}
          onValueChange={(id) => setSelected(members.find((m) => m.id === id) || null)}
        >
          <SelectTrigger className="w-72 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200">
            <SelectValue placeholder={`Choose a member — ${pickerLabel}`} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.fullName} — {ROLE_LABELS[m.role] || m.role}{m.team ? ` · ${m.team}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        {selected && me.role === "TEAM_LEAD" && selected.team !== me.team && (
          <span className="text-[11px] text-amber-400">Only members of your own team can be configured.</span>
        )}
      </div>
      {selected ? (
        <MemberKpiEditor staff={selected} me={me} />
      ) : (
        !loading && (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="Pick a team member"
            hint="Configure how the report KPI targets should look for that individual — team-lead edits need supervisor/admin approval."
          />
        )
      )}
    </div>
  );
}
