"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { api, fmtDateTime, ROLE_LABELS, type EscalationDTO, type EscalationEventDTO, type EscalationMessageDTO, type EscalationRecipientGroups, type SessionUser } from "@/lib/client";
import { EmptyState } from "@/components/kallmania/shared";
import { Siren, Send, Loader2, CheckCheck, ShieldCheck, User2, Users2, Trash2, ArrowLeft, MessagesSquare, History, RotateCcw, PlayCircle, CheckCircle2, Search, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls = "border-white/12 bg-white/[0.055] text-slate-100 placeholder:text-slate-500";

const TEAM_LABELS: Record<string, string> = {
  OUTBOUND: "Outbound", INBOUND: "Inbound", EMAIL: "Email Marketing", SOCIAL: "Social Media", TECH: "Web & Technical",
};

const ESC_STATUS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  ACKNOWLEDGED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  IN_PROGRESS: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  REOPENED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  CLOSED: "bg-slate-500/15 text-slate-300 border-slate-400/30",
};

const EVENT_ICONS: Record<string, string> = {
  CREATED: "Siren", ACKNOWLEDGED: "ShieldCheck", IN_PROGRESS: "PlayCircle", RESOLVED: "CheckCircle2",
  REOPENED: "RotateCcw", CLOSED: "Lock", MESSAGE_SENT: "MessagesSquare", REASSIGNED: "User2", PRIORITY_CHANGED: "Siren",
};

function personLabel(u: { fullName: string; team: string | null }): string {
  return u.team ? `${u.fullName} — ${TEAM_LABELS[u.team] ?? u.team}` : u.fullName;
}

/* ────────────────────────────── Composer ────────────────────────────── */

/**
 * Notify / escalate composer.
 *  - "Notify a person" targets one named person (management only).
 *  - "Escalate to a role" routes the escalation to EVERYONE occupying a role:
 *    administrators reach every centre (management + agent roles), other
 *    management their own centre's leadership tiers — options resolved live
 *    from user records with real occupant counts (never hardcoded).
 *  - Staff (agents) escalate by picking a named, live-resolved recipient:
 *    their team's lead, every supervisor of their centre, or the admins.
 */
export function EscalationComposer({ user, open, setOpen, onSent }: { user: SessionUser; open: boolean; setOpen: (v: boolean) => void; onSent?: () => void }) {
  const isManagement = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(user.role);
  const [mode, setMode] = useState<"ROLE" | "USER">(isManagement ? "USER" : "ROLE");
  const [groups, setGroups] = useState<EscalationRecipientGroups | null>(null);
  const [people, setPeople] = useState<{ id: string; fullName: string; role: string }[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [targetRole, setTargetRole] = useState("");
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
    setRecipientId("");
    setTargetRole("");
    // Named + role escalation targets — dynamic, scoped to the requester.
    api<EscalationRecipientGroups>("/api/escalations/recipients")
      .then(setGroups)
      .catch(() => setGroups(null));
    if (isManagement) {
      // Notify any agent of their choice — centre-scoped server side.
      api<{ users: { id: string; fullName: string; role: string }[] }>("/api/users")
        .then(({ users }) => setPeople(users.filter((u) => u.id !== user.id)))
        .catch(() => setPeople([]));
    }
  }, [open, isManagement, user.id]);

  const roleOptions = groups?.roles ?? [];

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      if (isManagement && mode === "USER") {
        await api("/api/escalations", {
          method: "POST",
          body: JSON.stringify({ subject, message, severity, targetType: "TARGET_USER", targetUserId: recipientId }),
        });
      } else if (isManagement) {
        if (!targetRole) { setError("Choose the role that should handle this"); setSending(false); return; }
        await api("/api/escalations", {
          method: "POST",
          body: JSON.stringify({ subject, message, severity, targetType: "TARGET_ROLE", targetRole }),
        });
      } else {
        if (!recipientId) { setError("Choose who should handle this"); setSending(false); return; }
        await api("/api/escalations", {
          method: "POST",
          body: JSON.stringify({ subject, message, severity, recipientId }),
        });
      }
      setOpen(false);
      onSent?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const hasNamed = !!(groups && (groups.teamLead || groups.supervisors.length > 0 || groups.admins.length > 0));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-white/10 bg-popover text-popover-foreground text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Siren className="h-4.5 w-4.5 text-[#e8935a]" />
            {isManagement ? "Notify / escalate" : "Raise an escalation"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isManagement && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setMode("USER"); setRecipientId(""); }} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", mode === "USER" ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
                <User2 className="mr-1.5 inline h-3.5 w-3.5" /> Notify a person
              </button>
              <button onClick={() => { setMode("ROLE"); setTargetRole(""); }} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", mode === "ROLE" ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
                <Users2 className="mr-1.5 inline h-3.5 w-3.5" /> Escalate to a role
              </button>
            </div>
          )}
          {isManagement && mode === "USER" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Send to</label>
              <Select value={recipientId || undefined} onValueChange={setRecipientId}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Choose a person" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName} — {ROLE_LABELS[p.role] || p.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : isManagement ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Escalate to role</label>
              <Select value={targetRole || undefined} onValueChange={setTargetRole}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder={roleOptions.length > 0 ? "Choose the role that should handle this" : "Loading roles…"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {roleOptions.map((r) => (
                    <SelectItem key={r.role} value={r.role}>
                      {r.label} — {r.scopeLabel} ({r.count} {r.count === 1 ? "person" : "people"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">
                Everyone occupying this role gets the escalation{user.role === "ADMIN" ? " — across ALL centres, not just your own" : " — everyone in your centre with that role"}. The first person to acknowledge becomes the handler.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Escalate to</label>
              <Select value={recipientId || undefined} onValueChange={setRecipientId}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder={hasNamed ? "Choose the person who should handle this" : "Loading eligible people…"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {groups?.teamLead && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-wide text-slate-500">Team Lead — your team</SelectLabel>
                      <SelectItem value={groups.teamLead.id}>{personLabel(groups.teamLead)}</SelectItem>
                    </SelectGroup>
                  )}
                  {groups && groups.supervisors.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-wide text-slate-500">Supervisors — your centre</SelectLabel>
                      {groups.supervisors.map((s) => <SelectItem key={s.id} value={s.id}>{personLabel(s)}</SelectItem>)}
                    </SelectGroup>
                  )}
                  {groups && groups.admins.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-wide text-slate-500">Administrators</SelectLabel>
                      {groups.admins.map((a) => <SelectItem key={a.id} value={a.id}>{personLabel(a)}</SelectItem>)}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">
                Only active, eligible people appear here — your team&apos;s lead, every supervisor of your centre, and the administrators.
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Subject</label>
              <Input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Blocked on client data" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Priority</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="URGENT">Urgent</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Describe the issue</label>
            <Textarea rows={4} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe what you need and why it matters…" />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={sending || !subject || !message || (isManagement && mode === "ROLE" ? !targetRole : !recipientId)} onClick={send} className="bg-[#e8935a] font-semibold text-[#1a120b] hover:bg-[#dd8040]">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────── Detail (thread + timeline) ────────────────────────────── */

function EventIcon({ action }: { action: string }) {
  const name = EVENT_ICONS[action] || "History";
  const cls = "h-3.5 w-3.5 shrink-0";
  if (name === "ShieldCheck") return <ShieldCheck className={cn(cls, "text-sky-400")} />;
  if (name === "PlayCircle") return <PlayCircle className={cn(cls, "text-violet-400")} />;
  if (name === "CheckCircle2") return <CheckCircle2 className={cn(cls, "text-emerald-400")} />;
  if (name === "RotateCcw") return <RotateCcw className={cn(cls, "text-rose-400")} />;
  if (name === "Lock") return <Lock className={cn(cls, "text-slate-400")} />;
  if (name === "MessagesSquare") return <MessagesSquare className={cn(cls, "text-[#e8935a]")} />;
  return <History className={cn(cls, "text-slate-500")} />;
}

interface DetailData {
  escalation: EscalationDTO;
  messages: EscalationMessageDTO[];
  events: EscalationEventDTO[];
}

export function EscalationDetail({ user, id, onBack, onChanged }: { user: SessionUser; id: string; onBack: () => void; onChanged?: () => void }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<DetailData>(`/api/escalations/${id}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    // No websocket infra — poll while the thread is open so replies arrive.
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [data?.messages.length]);

  const runStatus = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setActionError(null);
    try {
      await api("/api/escalations", { method: "PATCH", body: JSON.stringify({ id, action, ...extra }) });
      if (action === "resolve") { setResolving(false); setResolveNote(""); }
      await load();
      onChanged?.();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    setActionError(null);
    try {
      await api(`/api/escalations/${id}`, { method: "POST", body: JSON.stringify({ body: reply.trim() }) });
      setReply("");
      await load();
      onChanged?.();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !data) return (
    <div className="space-y-3 py-10 text-center">
      <p className="text-sm text-rose-300">{error || "Escalation not found"}</p>
      <Button size="sm" variant="outline" className="border-slate-600 text-slate-200" onClick={onBack}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to inbox</Button>
    </div>
  );

  const { escalation: esc, messages, events } = data;
  const isAuthor = esc.fromId === user.id;
  const isRecipient = esc.targetUserId === user.id;
  const isHandler = !!esc.ackById && esc.ackById === user.id;
  const isAdmin = user.role === "ADMIN";
  const roleRouted = esc.targetType === "TARGET_ROLE" && esc.targetRole === user.role;
  const allManagement = esc.targetType === "ALL_MANAGEMENT" && ["SUPERVISOR", "TEAM_LEAD"].includes(user.role);
  const canManage = isRecipient || isHandler || isAdmin || roleRouted || allManagement;
  const canPost = isAuthor || isRecipient || isHandler || isAdmin;
  const canReopenThis = isAuthor || isAdmin || ["TEAM_LEAD", "SUPERVISOR"].includes(user.role);
  const showReopen = ["RESOLVED", "CLOSED"].includes(esc.status) && canReopenThis;

  return (
    <div className="space-y-3">
      <div className="k-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 border-slate-600 px-2 text-xs text-slate-300" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Inbox</Button>
          {esc.severity === "URGENT" && <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">URGENT</span>}
          <p className="text-sm font-bold text-slate-100">{esc.subject}</p>
          <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", ESC_STATUS[esc.status] || ESC_STATUS.OPEN)}>{esc.status.replace("_", " ")}</span>
          <span className="ml-auto text-[10px] text-slate-600">Created {fmtDateTime(esc.createdAt)}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
          <span>From: <span className="font-semibold text-slate-400">{isAuthor ? "You" : esc.fromName}</span> ({ROLE_LABELS[esc.fromRole] || esc.fromRole})</span>
          {esc.targetUser && <span>To: <span className="font-semibold text-slate-400">{esc.targetUser.id === user.id ? "You" : esc.targetUser.fullName}</span> ({ROLE_LABELS[esc.targetUser.role] || esc.targetUser.role})</span>}
          {esc.targetType === "TARGET_ROLE" && !esc.targetUser && <span>Routed to: <span className="font-semibold text-slate-400">{ROLE_LABELS[esc.targetRole || ""] || esc.targetRole}{esc.fromRole === "ADMIN" ? " · all centres" : ""}</span></span>}
          {esc.targetType === "ALL_MANAGEMENT" && <span>Routed to: <span className="font-semibold text-slate-400">All management</span></span>}
          {(esc.centreCountry || esc.team) && esc.fromRole !== "ADMIN" && <span>{[esc.centreState && `${esc.centreCountry}/${esc.centreState}`, esc.team && (TEAM_LABELS[esc.team] ?? esc.team)].filter(Boolean).join(" · ")}</span>}
          {esc.ackByName && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-sky-400" /> Handler: {esc.ackByName}</span>}
          {esc.resolvedByName && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Resolved by {esc.resolvedByName}</span>}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_19rem]">
        {/* ── Conversation thread ── */}
        <div className="k-card flex flex-col p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><MessagesSquare className="h-3.5 w-3.5" /> Conversation ({messages.length})</h4>
          <div ref={threadRef} className="max-h-[26rem] flex-1 space-y-2 overflow-y-auto pr-1">
            {messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed", mine ? "bg-[#6c5ce7]/25 text-slate-100" : "bg-white/[0.05] text-slate-200")}>
                    <p className="mb-0.5 flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                      {mine ? "You" : m.senderName} · {ROLE_LABELS[m.senderRole] || m.senderRole}
                      <span className="font-normal text-slate-600">{fmtDateTime(m.createdAt)}</span>
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {canPost ? (
            <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
              <Textarea rows={2} className={cn(inputCls, "text-xs")} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={isAuthor ? "Add information or ask for an update…" : "Reply to the sender…"} />
              <div className="flex justify-end">
                <Button size="sm" disabled={sending || !reply.trim()} onClick={sendReply} className="k-btn-primary h-8 text-xs">
                  {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />} Send reply
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 border-t border-white/8 pt-3 text-[10px] text-slate-500">
              <Lock className="h-3 w-3" /> Read-only — only the sender, the assigned recipient and the current handler can post here.
            </p>
          )}
        </div>

        {/* ── Actions + timeline ── */}
        <div className="space-y-3">
          {canManage && (
            <div className="k-card space-y-2 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Actions</h4>
              {actionError && <p className="text-[10px] text-rose-400">{actionError}</p>}
              {esc.status === "OPEN" && <Button size="sm" variant="outline" disabled={busy} className="h-8 w-full border-sky-500/40 text-xs text-sky-300 hover:bg-sky-500/10" onClick={() => runStatus("ack")}><CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Acknowledge</Button>}
              {["ACKNOWLEDGED", "REOPENED", "OPEN"].includes(esc.status) && esc.status !== "OPEN" && (
                <Button size="sm" variant="outline" disabled={busy} className="h-8 w-full border-violet-500/40 text-xs text-violet-300 hover:bg-violet-500/10" onClick={() => runStatus("in_progress")}><PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Start progress</Button>
              )}
              {!["RESOLVED", "CLOSED"].includes(esc.status) && (
                <Button size="sm" variant="outline" disabled={busy} className="h-8 w-full border-emerald-500/40 text-xs text-emerald-300 hover:bg-emerald-500/10" onClick={() => { setResolveNote(""); setResolving(true); }}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Resolve…</Button>
              )}
              {esc.status === "RESOLVED" && (
                <Button size="sm" variant="outline" disabled={busy} className="h-8 w-full border-slate-500/40 text-xs text-slate-300 hover:bg-slate-500/10" onClick={() => runStatus("close")}><Lock className="mr-1.5 h-3.5 w-3.5" /> Close</Button>
              )}
              {showReopen && (
                <Button size="sm" variant="outline" disabled={busy} className="h-8 w-full border-rose-500/40 text-xs text-rose-300 hover:bg-rose-500/10" onClick={() => runStatus("reopen")}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen</Button>
              )}
              <p className="text-[9px] leading-relaxed text-slate-600">Acknowledging only confirms receipt — resolving requires a note explaining what was done.</p>
            </div>
          )}
          {!canManage && isAuthor && !["RESOLVED", "CLOSED"].includes(esc.status) && (
            <div className="k-card p-4 text-[10px] leading-relaxed text-slate-500">
              Waiting for <span className="font-semibold text-slate-400">{esc.targetName || (esc.targetRole ? ROLE_LABELS[esc.targetRole] : "management")}</span> to act. You can keep the conversation going below the thread, and reopen the escalation if it is closed without a fix.
            </div>
          )}

          <div className="k-card p-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><History className="h-3.5 w-3.5" /> Activity timeline</h4>
            <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {events.map((ev) => (
                <div key={ev.id} className="flex gap-2">
                  <div className="mt-0.5"><EventIcon action={ev.action} /></div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-300">
                      {ev.action.replace(/_/g, " ").toLowerCase()} <span className="font-normal text-slate-500">— {ev.actorName}</span>
                    </p>
                    {ev.details && <p className="break-words text-[10px] text-slate-500">{ev.details}</p>}
                    <p className="text-[9px] text-slate-600">{fmtDateTime(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve dialog — resolution note required */}
      <Dialog open={resolving} onOpenChange={setResolving}>
        <DialogContent className="border-white/10 bg-popover text-popover-foreground text-slate-100 sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-white">Resolve escalation</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-400">Record what was done about “{esc.subject}”. The sender will see this explanation.</p>
          <Textarea rows={3} className={inputCls} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="e.g. Called the client, reactivated the account and confirmed login works…" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setResolving(false)}>Cancel</Button>
            <Button disabled={busy || !resolveNote.trim()} className="bg-emerald-600 hover:bg-emerald-500" onClick={() => runStatus("resolve", { resolutionNote: resolveNote.trim() })}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />} Resolve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────── Inbox panel ────────────────────────────── */

/** Escalation inbox — persistent threads with unread badges and filters.
 *  Mounted on the dedicated Escalations view and inside Notifications. */
export function EscalationsPanel({ user, focusId }: { user: SessionUser; focusId?: string | null }) {
  const [items, setItems] = useState<EscalationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ ids: string[]; label: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [scope, setScope] = useState<"all" | "mine" | "assigned">("all");
  const [q, setQ] = useState("");
  const canManage = ["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(user.role);
  const isAdmin = user.role === "ADMIN";

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);
      if (scope === "mine") params.set("mine", "1");
      if (scope === "assigned") params.set("assigned", "1");
      if (q.trim()) params.set("q", q.trim());
      const { escalations } = await api<{ escalations: EscalationDTO[] }>(`/api/escalations?${params.toString()}`);
      setItems(escalations);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, scope, q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (focusId) setSelectedId(focusId); }, [focusId]);
  // Refresh badges while browsing the list (no websocket infra — 30s polling).
  useEffect(() => {
    if (selectedId) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [selectedId, load]);

  const act = async (id: string, action: "ack" | "resolve") => {
    await api("/api/escalations", { method: "PATCH", body: JSON.stringify({ id, action }) }).catch(() => {});
    load();
  };

  const removeEscalations = async (ids: string[]) => {
    setBulkBusy(true);
    try {
      await api("/api/escalations", { method: "DELETE", body: JSON.stringify({ ids }) });
      setDeleting(null);
      setSelected(new Set());
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleSel = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  };
  const allSelected = items.length > 0 && selected.size === items.length;

  if (selectedId) {
    return (
      <EscalationDetail
        user={user}
        id={selectedId}
        onBack={() => { setSelectedId(null); load(); }}
        onChanged={load}
      />
    );
  }

  return (
    <div className="k-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="k-section-title text-[15px] font-bold">Escalations</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {user.role === "ADMIN" ? "Every escalation across every centre — open one to read the thread and timeline" : "Tracked issues with their own conversation — open one to continue the thread"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && selected.size > 0 && (
            <Button variant="outline" size="sm" disabled={bulkBusy} className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10" onClick={() => setDeleting({ ids: [...selected], label: `${selected.size} escalation${selected.size === 1 ? "" : "s"}` })}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete selected ({selected.size})
            </Button>
          )}
          <Button onClick={() => setComposerOpen(true)} className="bg-[#e8935a] font-semibold text-[#1a120b] hover:bg-[#dd8040]">
            <Siren className="mr-2 h-4 w-4" /> New escalation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-white/10 text-[11px] font-semibold">
          {([["all", "All"], ["mine", "Sent by me"], ["assigned", canManage ? "Assigned to me" : "Sent to me"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setScope(v)} className={cn("px-3 py-1.5 transition", scope === v ? "bg-[#6c5ce7]/30 text-white" : "text-slate-400 hover:bg-white/5")}>{label}</button>
          ))}
        </div>
        <Select value={statusFilter || undefined} onValueChange={(v) => setStatusFilter(v === "__all" ? "" : v)}>
          <SelectTrigger className={cn(inputCls, "h-8 w-36 text-xs")}><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="REOPENED">Reopened</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="__all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter || undefined} onValueChange={(v) => setSeverityFilter(v === "__all" ? "" : v)}>
          <SelectTrigger className={cn(inputCls, "h-8 w-32 text-xs")}><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="__all">All priorities</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input className={cn(inputCls, "h-8 pl-8 text-xs")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject…" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Siren className="h-7 w-7" />} title="No escalations here" hint="Raise one with the button above — it becomes a tracked conversation with the person you choose." />
      ) : (
        <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
          {isAdmin && items.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 px-1 text-[11px] text-slate-500">
              <Checkbox checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false} onCheckedChange={(v) => setSelected(v ? new Set(items.map((e) => e.id)) : new Set())} />
              Select all{selected.size > 0 ? ` (${selected.size} selected)` : ""} — admins can remove escalations in any status
            </label>
          )}
          {items.map((e) => {
            const mine = e.fromId === user.id;
            return (
              <div key={e.id} role="button" tabIndex={0} onClick={() => setSelectedId(e.id)} onKeyDown={(ev) => ev.key === "Enter" && setSelectedId(e.id)} className={cn("cursor-pointer rounded-xl border p-3 transition hover:bg-white/[0.04]", e.severity === "URGENT" ? "border-rose-500/30 bg-rose-500/[0.04]" : "border-white/10 bg-white/[0.02]", selected.has(e.id) && "ring-1 ring-[#6c5ce7]/50")}>
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <span onClick={(ev) => ev.stopPropagation()}>
                      <Checkbox checked={selected.has(e.id)} onCheckedChange={(v) => toggleSel(e.id, v === true)} aria-label={`Select escalation: ${e.subject}`} />
                    </span>
                  )}
                  {e.severity === "URGENT" && <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">URGENT</span>}
                  <p className="text-sm font-semibold text-slate-100">{e.subject}</p>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", ESC_STATUS[e.status] || ESC_STATUS.OPEN)}>{e.status.replace("_", " ")}</span>
                  {e.unread && <span className="flex items-center gap-1 rounded bg-[#6c5ce7]/25 px-1.5 py-0.5 text-[9px] font-bold text-[#b1a4fa]"><span className="h-1.5 w-1.5 rounded-full bg-[#8b7ff5]" /> {e._count?.messages ?? 0} msg</span>}
                  <span className="ml-auto text-[10px] text-slate-600">Updated {fmtDateTime(e.lastMessageAt || e.updatedAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{e.message}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
                  <span>From: <span className="font-semibold text-slate-400">{mine ? "You" : e.fromName}</span> ({ROLE_LABELS[e.fromRole] || e.fromRole})</span>
                  {e.targetUser && <span>To: <span className="font-semibold text-slate-400">{e.targetUser.id === user.id ? "You" : e.targetUser.fullName}</span></span>}
                  {e.targetType === "TARGET_ROLE" && !e.targetUser && <span>Routed to: <span className="font-semibold text-slate-400">{ROLE_LABELS[e.targetRole || ""] || e.targetRole}{e.fromRole === "ADMIN" ? " · all centres" : ""}</span></span>}
                  {e.targetType === "ALL_MANAGEMENT" && <span>Routed to: <span className="font-semibold text-slate-400">All management</span></span>}
                  <span className="flex items-center gap-1"><MessagesSquare className="h-3 w-3" /> {e._count?.messages ?? 0} · {e._count?.events ?? 0} events</span>
                  {e.ackByName && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-sky-400" /> {e.ackByName}</span>}
                </div>
                {canManage && !mine && e.status === "OPEN" && (
                  <div className="mt-2 flex gap-2" onClick={(ev) => ev.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-7 border-sky-500/40 text-xs text-sky-300 hover:bg-sky-500/10" onClick={() => act(e.id, "ack")}>
                      <CheckCheck className="mr-1 h-3.5 w-3.5" /> Acknowledge
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-emerald-500/40 text-xs text-emerald-300 hover:bg-emerald-500/10" onClick={() => setSelectedId(e.id)}>
                      Open to resolve
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EscalationComposer user={user} open={composerOpen} setOpen={setComposerOpen} onSent={load} />

      {/* Admin delete confirmation — any status, single or bulk */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="border-white/10 bg-popover text-popover-foreground text-slate-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete {deleting && deleting.ids.length > 1 ? `${deleting.ids.length} escalations` : "escalation"}</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-rose-300">{deleting?.label}</span> will be permanently removed for everyone — including the full conversation thread, activity timeline and inbox notifications.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button disabled={bulkBusy} className="bg-rose-600 hover:bg-rose-500" onClick={() => deleting && removeEscalations(deleting.ids)}>
              {bulkBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
