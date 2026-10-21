"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, fmtDateTime, ROLE_LABELS, type EscalationDTO, type SessionUser } from "@/lib/client";
import { EmptyState } from "@/components/kallmania/shared";
import { Siren, Send, Loader2, CheckCheck, ShieldCheck, User2, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls = "border-white/12 bg-white/[0.055] text-slate-100 placeholder:text-slate-500";

/**
 * Notify / escalate composer.
 *  - Staff (agents, leads): escalate to Team Lead, Supervisor or Administrator —
 *    the administrator always sees every notice.
 *  - Management (team lead, supervisor, admin): notify any agent of their choice.
 */
export function EscalationComposer({ user, open, setOpen, onSent }: { user: SessionUser; open: boolean; setOpen: (v: boolean) => void; onSent?: () => void }) {
  const isManagement = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(user.role);
  const [mode, setMode] = useState<"ROLE" | "USER">(isManagement ? "USER" : "ROLE");
  const [targetRole, setTargetRole] = useState("SUPERVISOR");
  const [people, setPeople] = useState<{ id: string; fullName: string; role: string }[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [severity, setSeverity] = useState("NORMAL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(isManagement ? "USER" : "ROLE");
    setError(null);
    setSubject("");
    setMessage("");
    setSeverity("NORMAL");
    setTargetUserId("");
    if (isManagement) {
      // Notify any agent of their choice — centre-scoped server side.
      api<{ users: { id: string; fullName: string; role: string }[] }>("/api/users")
        .then(({ users }) => setPeople(users.filter((u) => u.id !== user.id)))
        .catch(() => setPeople([]));
    }
  }, [open, isManagement, user.id]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api("/api/escalations", {
        method: "POST",
        body: JSON.stringify({
          subject,
          message,
          severity,
          targetType: mode === "USER" ? "TARGET_USER" : "TARGET_ROLE",
          targetRole: mode === "ROLE" ? targetRole : undefined,
          targetUserId: mode === "USER" ? targetUserId : undefined,
        }),
      });
      setOpen(false);
      onSent?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-white/10 bg-[#17171c] text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Siren className="h-4.5 w-4.5 text-[#e8935a]" />
            {isManagement ? "Notify / escalate" : "Notify or escalate"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isManagement ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode("USER")} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", mode === "USER" ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
                <User2 className="mr-1.5 inline h-3.5 w-3.5" /> Notify a person
              </button>
              <button onClick={() => setMode("ROLE")} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", mode === "ROLE" ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
                <Users2 className="mr-1.5 inline h-3.5 w-3.5" /> Escalate to a role
              </button>
            </div>
          ) : (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
              Your notice goes to the role you pick in your centre — and the administrator always sees it too.
            </p>
          )}
          {mode === "USER" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Send to</label>
              <Select value={targetUserId || undefined} onValueChange={setTargetUserId}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Choose a person" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName} — {ROLE_LABELS[p.role] || p.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Escalate to</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["TEAM_LEAD", "SUPERVISOR", "ADMIN"].map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Subject</label>
              <Input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Blocked on client data" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="URGENT">Urgent</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Message</label>
            <Textarea rows={4} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe what you need and why it matters…" />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={sending || !subject || !message || (mode === "USER" && !targetUserId)} onClick={send} className="bg-[#e8935a] font-semibold text-[#1a120b] hover:bg-[#dd8040]">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ESC_STATUS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  ACKNOWLEDGED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
};

/** Escalation feed — mounted inside the notifications view. */
export function EscalationsPanel({ user }: { user: SessionUser }) {
  const [items, setItems] = useState<EscalationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const canManage = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(user.role);

  const load = async () => {
    setLoading(true);
    try {
      const { escalations } = await api<{ escalations: EscalationDTO[] }>("/api/escalations");
      setItems(escalations);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "ack" | "resolve") => {
    await api("/api/escalations", { method: "PATCH", body: JSON.stringify({ id, action }) });
    load();
  };

  return (
    <div className="k-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="k-section-title text-[15px] font-bold">Notify / escalate bar</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {user.role === "ADMIN" ? "Every notice across every centre reaches you here" : "Escalations you sent, received, or routed to your role"}
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="bg-[#e8935a] font-semibold text-[#1a120b] hover:bg-[#dd8040]">
          <Siren className="mr-2 h-4 w-4" /> {canManage ? "Notify / escalate" : "Notify / escalate"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Siren className="h-7 w-7" />} title="No notices yet" hint="Use the bar above to notify your team lead, supervisor or administrator — or to message an agent." />
      ) : (
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {items.map((e) => {
            const mine = e.fromId === user.id;
            return (
              <div key={e.id} className={cn("rounded-xl border p-3", e.severity === "URGENT" ? "border-rose-500/30 bg-rose-500/[0.04]" : "border-white/10 bg-white/[0.02]")}>
                <div className="flex flex-wrap items-center gap-2">
                  {e.severity === "URGENT" && <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">URGENT</span>}
                  <p className="text-sm font-semibold text-slate-100">{e.subject}</p>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", ESC_STATUS[e.status] || ESC_STATUS.OPEN)}>{e.status}</span>
                  <span className="ml-auto text-[10px] text-slate-600">{fmtDateTime(e.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{e.message}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
                  <span>From: <span className="font-semibold text-slate-400">{mine ? "You" : e.fromName}</span> ({ROLE_LABELS[e.fromRole] || e.fromRole})</span>
                  {e.targetType === "TARGET_USER" && e.targetUser && <span>To: <span className="font-semibold text-slate-400">{e.targetUser.id === user.id ? "You" : e.targetUser.fullName}</span></span>}
                  {e.targetType === "TARGET_ROLE" && e.targetRole && <span>Routed to: <span className="font-semibold text-slate-400">{ROLE_LABELS[e.targetRole]}</span></span>}
                  {e.targetType === "ALL_MANAGEMENT" && <span>Routed to: <span className="font-semibold text-slate-400">All management</span></span>}
                  {e.ackByName && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> {e.ackByName}{e.ackNote ? ` — ${e.ackNote}` : ""}</span>}
                </div>
                {canManage && !mine && e.status === "OPEN" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 border-sky-500/40 text-xs text-sky-300 hover:bg-sky-500/10" onClick={() => act(e.id, "ack")}>
                      <CheckCheck className="mr-1 h-3.5 w-3.5" /> Acknowledge
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-emerald-500/40 text-xs text-emerald-300 hover:bg-emerald-500/10" onClick={() => act(e.id, "resolve")}>
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EscalationComposer user={user} open={composerOpen} setOpen={setComposerOpen} onSent={load} />
    </div>
  );
}
