"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api, fmtDateTime, TEAM_LABELS, ROLE_LABELS, type NoticeDTO, type SessionUser } from "@/lib/client";
import { PageHeader, EmptyState } from "@/components/kallmania/shared";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Pin, Plus, Pencil, Trash2, Loader2, PinOff, MapPin, Radio, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Country } from "country-state-city";

const inputCls = "border-white/12 bg-white/[0.055] text-slate-100 placeholder:text-slate-500";

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Country.getAllCountries().map((c) => [c.isoCode, c.name])
);

interface CentreDTO { country: string; state: string; agents: number }

/** Human label for a notice's audience. */
function audienceLabel(n: NoticeDTO): string {
  if (n.allCentres) return "Broadcast — all centres";
  if (!n.centreCountry) return "Everyone";
  const centre = `${COUNTRY_NAMES[n.centreCountry] || n.centreCountry} — ${n.centreState}`;
  const teams = n.teams ? (JSON.parse(n.teams) as string[]) : [];
  if (teams.length) return `${centre} · ${teams.map((t) => TEAM_LABELS[t] || t).join(", ")}`;
  return centre;
}

/**
 * Notice Board — announcements from the administration, supervisors and team
 * leads. Administrators choose any audience (company-wide, one centre, chosen
 * teams of a centre, or a broadcast to all centres); supervisors post to their
 * centre (+ teams); team leads post to their own team. Deleting a notice (by
 * its author or an administrator) removes it for every recipient at once.
 */
export default function NoticeBoardView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "ADMIN";
  const isSupervisor = user.role === "SUPERVISOR";
  const isTeamLead = user.role === "TEAM_LEAD";
  const canPost = isAdmin || isSupervisor || isTeamLead;
  const { toast } = useToast();
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [centres, setCentres] = useState<CentreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeDTO | null>(null);
  const [form, setForm] = useState({ title: "", body: "", pinned: false, audience: "ALL", centreKey: "", teams: [] as string[] });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NoticeDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ notices: NoticeDTO[]; centres?: CentreDTO[] }>("/api/notices");
      setNotices(d.notices);
      if (d.centres) setCentres(d.centres);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openComposer = (notice?: NoticeDTO) => {
    if (notice) {
      setEditing(notice);
      const teams = notice.teams ? (JSON.parse(notice.teams) as string[]) : [];
      setForm({
        title: notice.title, body: notice.body, pinned: notice.pinned,
        audience: notice.centreCountry ? "CENTRE" : "ALL",
        centreKey: notice.centreCountry ? `${notice.centreCountry}|${notice.centreState}` : "",
        teams,
      });
    } else {
      setEditing(null);
      setForm({ title: "", body: "", pinned: false, audience: isAdmin ? "ALL" : "CENTRE", centreKey: isSupervisor && user.country && user.state ? `${user.country}|${user.state}` : "", teams: [] });
    }
    setComposerOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy("save");
    try {
      const [centreCountry, centreState] = form.centreKey ? form.centreKey.split("|") : ["", ""];
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        pinned: form.pinned,
        allCentres: !editing && isAdmin && form.audience === "ALL",
        centreCountry: form.audience === "CENTRE" ? centreCountry : undefined,
        centreState: form.audience === "CENTRE" ? centreState : undefined,
        teams: form.audience === "CENTRE" ? form.teams : undefined,
      };
      if (editing) {
        await api("/api/notices", { method: "PATCH", body: JSON.stringify({ noticeId: editing.id, title: payload.title, body: payload.body, pinned: payload.pinned }) });
        toast({ title: "Notice updated", description: `“${payload.title}” was saved.` });
      } else {
        await api("/api/notices", { method: "POST", body: JSON.stringify(payload) });
        const label = payload.allCentres ? "everyone across all centres" : payload.centreCountry ? "the selected audience" : "everyone";
        toast({ title: "Notice posted", description: `“${payload.title}” is now visible to ${label}.` });
      }
      setComposerOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Could not save notice", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const togglePin = async (notice: NoticeDTO) => {
    setBusy(notice.id + "pin");
    try {
      await api("/api/notices", { method: "PATCH", body: JSON.stringify({ noticeId: notice.id, pinned: !notice.pinned }) });
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (notice: NoticeDTO) => {
    setBusy(notice.id + "del");
    try {
      await api(`/api/notices?noticeId=${encodeURIComponent(notice.id)}`, { method: "DELETE" });
      toast({ title: "Notice deleted", description: `“${notice.title}” was removed from the board — and from every recipient's inbox.` });
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const audiencePicker = () => {
    if (isTeamLead) {
      return (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
          <Users2 className="mr-1 inline h-3.5 w-3.5 text-[#eda06a]" />
          Your notice goes to <span className="font-semibold text-slate-200">your team{user.team ? ` — ${TEAM_LABELS[user.team] || user.team}` : ""}</span> in your centre.
        </p>
      );
    }
    if (isSupervisor) {
      return (
        <div className="space-y-2">
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
            <MapPin className="mr-1 inline h-3.5 w-3.5 text-[#eda06a]" />
            Delivered to <span className="font-semibold text-slate-200">your centre</span>{form.teams.length ? " and the selected teams" : ""}.
          </p>
          <TeamPicker value={form.teams} onChange={(teams) => setForm({ ...form, teams })} />
        </div>
      );
    }
    // Administrator — company-wide, broadcast, or a specific centre (+ teams).
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setForm({ ...form, audience: "ALL" })} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", form.audience === "ALL" ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
            <Radio className="mr-1.5 inline h-3.5 w-3.5" /> {form.pinned ? "Company-wide" : "Everyone"}
          </button>
          <button onClick={() => setForm({ ...form, audience: "CENTRE" })} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", form.audience === "CENTRE" ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
            <MapPin className="mr-1.5 inline h-3.5 w-3.5" /> A specific centre
          </button>
        </div>
        {form.audience === "ALL" && (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
            Delivered to every user in every centre as a broadcast.
          </p>
        )}
        {form.audience === "CENTRE" && (
          <>
            <Select value={form.centreKey || undefined} onValueChange={(v) => setForm({ ...form, centreKey: v, teams: [] })}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Pick the centre" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {centres.map((c) => (
                  <SelectItem key={`${c.country}|${c.state}`} value={`${c.country}|${c.state}`}>
                    {COUNTRY_NAMES[c.country] || c.country} — {c.state} ({c.agents} staff)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.centreKey && <TeamPicker value={form.teams} onChange={(teams) => setForm({ ...form, teams })} />}
          </>
        )}
      </div>
    );
  };

  const canManageNotice = (n: NoticeDTO) => isAdmin || n.authorId === user.id;

  return (
    <div>
      <PageHeader
        title="Notice Board"
        subtitle={canPost ? "Announcements — company-wide, per centre or per team" : "Announcements from the administration and your management"}
        actions={
          canPost ? (
            <Button className="k-btn-primary" onClick={() => openComposer()}>
              <Plus className="mr-1.5 h-4 w-4" /> New notice
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : notices.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title="No notices yet"
          hint={canPost ? "Post the first announcement — pick who receives it." : "Announcements from your management will appear here."}
        />
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <article
              key={n.id}
              className={`k-card relative overflow-hidden p-5 ${n.pinned ? "border-[#e8833a]/40 shadow-[0_0_24px_-8px_rgba(232,131,58,0.35)]" : ""}`}
            >
              {n.pinned && (
                <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-[#e8833a]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f0a468]">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${n.pinned ? "bg-[#e8833a]/20 text-[#f0a468]" : "bg-[#6c5ce7]/20 text-[#b3a5ff]"}`}>
                  <Megaphone className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="pr-14 text-sm font-bold text-white sm:pr-20">{n.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{n.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">
                      <p>
                        {n.authorName ? <span className="font-semibold text-slate-400">{n.authorName}</span> : "Administration"}
                        {n.authorRole && n.authorRole !== "ADMIN" ? <span className="text-slate-600"> · {ROLE_LABELS[n.authorRole] || n.authorRole}</span> : null}
                        {" · "}{fmtDateTime(n.createdAt)}
                        {n.updatedAt !== n.createdAt && " · edited"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#eda06a]">
                        <MapPin className="h-3 w-3" /> {audienceLabel(n)}
                      </p>
                    </div>
                    {canManageNotice(n) && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#8b7ff5]" title="Edit" onClick={() => openComposer(n)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#f0a468]" title={n.pinned ? "Unpin" : "Pin to top"} disabled={busy === n.id + "pin"} onClick={() => togglePin(n)}>
                            {busy === n.id + "pin" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-300" title="Delete for everyone" onClick={() => setConfirmDelete(n)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Composer / editor dialog */}
      <Dialog open={composerOpen} onOpenChange={(v) => !v && setComposerOpen(false)}>
        <DialogContent className="border-white/10 bg-[#1b2a3b] text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit notice" : "Post a notice"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editing ? "Update the announcement — its audience sees the change immediately." : "Choose the audience — the notice lands on their board and in their inbox."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && audiencePicker()}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Title *</Label>
              <Input className={inputCls} maxLength={120} placeholder="e.g. Town hall meeting — Friday 4 PM" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Message *</Label>
              <Textarea className={`min-h-[130px] ${inputCls}`} placeholder="Write the announcement…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            {isAdmin && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <Checkbox checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v === true })} />
                <Pin className="h-3.5 w-3.5 text-[#f0a468]" /> Pin to the top of the board
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setComposerOpen(false)}>Cancel</Button>
              <Button className="k-btn-primary" disabled={busy === "save" || !form.title.trim() || !form.body.trim() || (!editing && isAdmin && form.audience === "CENTRE" && !form.centreKey)} onClick={save}>
                {busy === "save" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Megaphone className="mr-1 h-4 w-4" />}
                {editing ? "Save changes" : "Post notice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="border-white/10 bg-[#1b2a3b] text-slate-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete notice</DialogTitle>
            <DialogDescription className="text-slate-400">This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-rose-300">“{confirmDelete?.title}”</span> will be removed from the Notice Board for everyone it was sent to — and its inbox notifications are cleaned up automatically.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-500" disabled={busy === confirmDelete?.id + "del"} onClick={() => confirmDelete && remove(confirmDelete)}>
              {busy === confirmDelete?.id + "del" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />} Delete notice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Team multi-select for narrowing a centre notice to specific teams. */
function TeamPicker({ value, onChange }: { value: string[]; onChange: (teams: string[]) => void }) {
  const all = ["OUTBOUND", "INBOUND", "EMAIL", "SOCIAL", "TECH"];
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Limit to teams (blank = whole centre)</label>
      <div className="flex flex-wrap gap-1.5">
        {all.map((t) => {
          const active = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold transition", active ? "border-[#e8935a]/50 bg-[#e8935a]/10 text-[#f0b285]" : "border-white/10 text-slate-400 hover:bg-white/5")}
            >
              {TEAM_LABELS[t]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
