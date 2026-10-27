"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Siren, Send, Loader2, CheckCircle2, Info } from "lucide-react";

const RECIPIENTS: { key: string; label: string }[] = [
  { key: "TEAM_LEAD", label: "Team lead" },
  { key: "SUPERVISOR", label: "Supervisor" },
  { key: "MANAGER", label: "Manager" },
];

/**
 * Notify / Escalate bar — agents pick who to notify (team lead, supervisor,
 * manager), write the notice and send it. The administrator always receives
 * a copy of every notice.
 */
export default function NotifyBar() {
  const [recipients, setRecipients] = useState<string[]>(["SUPERVISOR"]);
  const [severity, setSeverity] = useState("WARNING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) => {
    setRecipients((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
    setDone(null);
  };

  const send = async () => {
    if (!message.trim() || recipients.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { delivered } = await api<{ delivered: number }>("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ action: "escalate", recipients, severity, message }),
      });
      setDone(`Sent to ${delivered} recipient${delivered === 1 ? "" : "s"} — the administrator sees it too.`);
      setMessage("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="k-card border-[#8b7ff5]/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b7ff5] to-[#6c5ce7] shadow-[0_6px_16px_-6px_rgba(108,92,231,0.7)]">
          <Siren className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Notify / Escalate</p>
          <p className="text-[11px] text-slate-500">Raise a notice to your team lead, supervisor and/or manager — the administrator always sees it too</p>
        </div>
        <div className="flex items-center gap-1.5">
          {RECIPIENTS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => toggle(r.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                recipients.includes(r.key)
                  ? "border-[#8b7ff5]/60 bg-[#6c5ce7]/25 text-[#c4bbff]"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-[#8b7ff5]/40 hover:text-slate-200",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={message}
          onChange={(e) => { setMessage(e.target.value); setDone(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="What do you need to notify or escalate? e.g. Customer threatening to cancel — need manager approval"
          className="h-9 min-w-56 flex-1 border-white/10 bg-white/[0.05] text-xs text-slate-100"
        />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-9 w-32 border-white/10 bg-white/[0.05] text-xs text-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent className="border-white/10 bg-[#16233a] text-slate-200">
            <SelectItem value="INFO">Notification</SelectItem>
            <SelectItem value="WARNING">Notice</SelectItem>
            <SelectItem value="CRITICAL">Escalation</SelectItem>
          </SelectContent>
        </Select>
        <Button disabled={busy || !message.trim() || recipients.length === 0} onClick={send} className="h-9 bg-[#6c5ce7] hover:bg-[#5b4bd4]">
          {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />} Send
        </Button>
      </div>

      {done && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> {done}
        </p>
      )}
      {error && <p className="mt-2 text-[11px] text-rose-400">{error}</p>}
      {!done && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
          <Info className="h-3 w-3" /> Notices appear in the recipients' Notifications inbox instantly.
        </p>
      )}
    </div>
  );
}
