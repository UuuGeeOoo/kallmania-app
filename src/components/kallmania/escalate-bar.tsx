"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, fmtDateTime, ROLE_LABELS, type UserDTO } from "@/lib/client";
import { Siren, Megaphone, Loader2, Send, ChevronRight } from "lucide-react";

interface EscalationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  senderName: string;
  senderRole: string;
}

/**
 * Notify / Escalate bar.
 *  - Agents notify their Team Lead, Supervisor or Manager — administrators see every notice.
 *  - Managers / administrators / supervisors / team leads can notify any agent of their choice.
 *  - A live feed of the latest notices runs along the bar.
 */
export default function EscalateBar({ user }: { user: { id: string; role: string; fullName: string; department: string; team?: string | null } }) {
  const isLeadership = ["ADMIN", "SUPERVISOR", "TEAM_LEAD"].includes(user.role);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"escalate" | "notify">(isLeadership ? "notify" : "escalate");
  const [level, setLevel] = useState("SUPERVISOR");
  const [recipients, setRecipients] = useState<UserDTO[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<EscalationItem[]>([]);

  const loadFeed = () => {
    (async () => {
      try {
        const { notifications } = await api<{ notifications: EscalationItem[] }>("/api/escalations");
        setFeed(notifications.slice(0, 5));
      } catch { /* ignore */ }
    })();
  };
  useEffect(loadFeed, [user.id]);

  const openDialog = () => {
    setMode(isLeadership ? "notify" : "escalate");
    setResult(null);
    setError(null);
    setMessage("");
    setRecipientId("");
    if (isLeadership) {
      api<{ users: UserDTO[] }>("/api/users")
        .then(({ users }) => setRecipients(users.filter((u) => u.status === "APPROVED" && u.id !== user.id)))
        .catch(() => setRecipients([]));
    }
    setOpen(true);
  };

  const send = async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === "escalate") {
        const res = await api<{ message: string }>("/api/escalations", { method: "POST", body: JSON.stringify({ action: "escalate", targetLevel: level, message }) });
        setResult(res.message);
      } else {
        if (!recipientId) { setError("Choose a recipient"); setSaving(false); return; }
        const res = await api<{ message: string }>("/api/escalations", { method: "POST", body: JSON.stringify({ action: "notifyAgent", userId: recipientId, message }) });
        setResult(res.message);
      }
      setMessage("");
      loadFeed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const ticker = feed.length
    ? feed
    : [];

  return (
    <div className="k-card k-glow-violet flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e2915a] to-[#c2551d] shadow-[0_6px_18px_-4px_rgba(226,145,90,0.7)]">
        <Siren className="h-4.5 w-4.5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-100">Notify &amp; Escalate</p>
        <p className="truncate text-[11px] text-slate-500">
          {ticker.length ? ticker.map((f) => `${f.senderName}: ${f.message}`).join("  ·  ") : isLeadership ? "Send a direct notice to any agent — or escalate to the management tier." : "Notify your team lead, supervisor or manager — the administrator sees every notice too."}
        </p>
      </div>
      {ticker.length > 0 && (
        <span className="rounded-full bg-[#e2915a]/15 px-2 py-0.5 text-[10px] font-bold text-[#e2915a]">{ticker.length} recent</span>
      )}
      <Button size="sm" onClick={openDialog} className="k-btn-primary rounded-full px-4 text-xs font-semibold">
        <Megaphone className="mr-1.5 h-3.5 w-3.5" /> {isLeadership ? "Notify agent" : "Notify / Escalate"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#171310] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{isLeadership && mode === "notify" ? "Send a direct notice" : "Notify / Escalate"}</DialogTitle>
          </DialogHeader>
          {isLeadership && (
            <div className="mb-1 flex overflow-hidden rounded-lg border border-white/10 text-xs font-semibold">
              <button onClick={() => setMode("notify")} className={`flex-1 px-3 py-1.5 ${mode === "notify" ? "bg-[#d98a4e] text-white" : "text-slate-400 hover:bg-white/5"}`}>Notify an agent</button>
              <button onClick={() => setMode("escalate")} className={`flex-1 px-3 py-1.5 ${mode === "escalate" ? "bg-[#d98a4e] text-white" : "text-slate-400 hover:bg-white/5"}`}>Escalate upward</button>
            </div>
          )}
          {result ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm font-semibold text-emerald-300">{result}</p>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-200" onClick={() => { setOpen(false); setResult(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {mode === "escalate" ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-300">Notify who?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[["TEAM_LEAD", "Team Lead"], ["SUPERVISOR", "Supervisor"], ["MANAGER", "Manager"]].map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => setLevel(v)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${level === v ? "border-[#f0b48a] bg-[#d98a4e]/20 text-white" : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">The administrator receives a copy of every notice.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-300">Recipient</p>
                  <Select value={recipientId} onValueChange={setRecipientId}>
                    <SelectTrigger className="border-white/12 bg-white/[0.055] text-slate-100"><SelectValue placeholder="Choose a staff member" /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {recipients.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.fullName} — {ROLE_LABELS[u.role] || u.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-300">Message</p>
                <Textarea rows={3} className="border-white/12 bg-white/[0.055] text-slate-100" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue or instruction…" />
              </div>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="text-slate-300" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" disabled={saving || !message.trim()} onClick={send} className="k-btn-primary">
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />} Send notice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Full escalations inbox view — visible to every role, admins see all centres */
export function EscalationsView({ user }: { user: { id: string; role: string } }) {
  const [items, setItems] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    (async () => {
      setLoading(true);
      try {
        const { notifications } = await api<{ notifications: EscalationItem[] }>("/api/escalations");
        setItems(notifications);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  };
  useEffect(load, [user.id]);

  const markRead = async (id: string) => {
    await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ action: "read", id }) }).catch(() => {});
    load();
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-600/40 py-10 text-center text-sm text-slate-400">
          No notices yet — use the Notify &amp; Escalate bar on the dashboard.
        </div>
      ) : (
        items.map((n) => (
          <button key={n.id} onClick={() => markRead(n.id)} className={`k-card block w-full border-l-4 p-4 text-left ${n.type === "ESCALATION" ? "border-l-[#e2915a]" : "border-l-[#f0b48a]"} ${n.read ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${n.type === "ESCALATION" ? "bg-[#e2915a]/20 text-[#e2915a]" : "bg-[#f0b48a]/20 text-[#f0b48a]"}`}>{n.type === "ESCALATION" ? "Escalation" : "Direct notice"}</span>
              <p className="text-sm font-semibold text-slate-100">{n.title}</p>
              {!n.read && <span className="h-2 w-2 rounded-full bg-[#e2915a]" />}
              <span className="ml-auto text-[10px] text-slate-600">{fmtDateTime(n.createdAt)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{n.message}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">
              From {n.senderName}{n.senderRole ? ` · ${ROLE_LABELS[n.senderRole] || n.senderRole}` : ""} <ChevronRight className="h-3 w-3" />
            </p>
          </button>
        ))
      )}
    </div>
  );
}
