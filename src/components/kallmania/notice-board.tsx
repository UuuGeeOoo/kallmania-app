"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api, fmtDateTime, type NoticeDTO, type SessionUser } from "@/lib/client";
import { PageHeader, EmptyState } from "@/components/kallmania/shared";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Pin, Plus, Pencil, Trash2, Loader2, PinOff } from "lucide-react";

const inputCls = "border-white/12 bg-white/[0.055] text-slate-100 placeholder:text-slate-500";

/** Notice Board — company-wide announcements posted by administrators, visible to every user. */
export default function NoticeBoardView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "ADMIN";
  const { toast } = useToast();
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeDTO | null>(null);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NoticeDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { notices } = await api<{ notices: NoticeDTO[] }>("/api/notices");
      setNotices(notices);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openComposer = (notice?: NoticeDTO) => {
    if (notice) {
      setEditing(notice);
      setForm({ title: notice.title, body: notice.body, pinned: notice.pinned });
    } else {
      setEditing(null);
      setForm({ title: "", body: "", pinned: false });
    }
    setComposerOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy("save");
    try {
      if (editing) {
        await api("/api/notices", { method: "PATCH", body: JSON.stringify({ noticeId: editing.id, ...form }) });
        toast({ title: "Notice updated", description: `“${form.title.trim()}” was saved.` });
      } else {
        await api("/api/notices", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Notice posted", description: `“${form.title.trim()}” is now visible to everyone.` });
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
      toast({ title: "Notice deleted", description: `“${notice.title}” was removed from the board.` });
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Unexpected error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notice Board"
        subtitle="Company-wide announcements from the administration"
        actions={
          isAdmin ? (
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
          hint={isAdmin ? "Post the first announcement — it becomes instantly visible to every user." : "Announcements from the administration will appear here."}
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
                    <p className="text-[11px] text-slate-500">
                      {n.authorName ? <span className="font-semibold text-slate-400">{n.authorName}</span> : "Administration"} · {fmtDateTime(n.createdAt)}
                      {n.updatedAt !== n.createdAt && " · edited"}
                    </p>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#8b7ff5]" title="Edit" onClick={() => openComposer(n)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#f0a468]" title={n.pinned ? "Unpin" : "Pin to top"} disabled={busy === n.id + "pin"} onClick={() => togglePin(n)}>
                          {busy === n.id + "pin" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-300" title="Delete" onClick={() => setConfirmDelete(n)}>
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
              {editing ? "Update the announcement — everyone sees the change immediately." : "Everyone on Kallmania will see this on their Notice Board."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Title *</Label>
              <Input className={inputCls} maxLength={120} placeholder="e.g. Town hall meeting — Friday 4 PM" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Message *</Label>
              <Textarea className={`min-h-[130px] ${inputCls}`} placeholder="Write the announcement…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <Checkbox checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v === true })} />
              <Pin className="h-3.5 w-3.5 text-[#f0a468]" /> Pin to the top of the board
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => setComposerOpen(false)}>Cancel</Button>
              <Button className="k-btn-primary" disabled={busy === "save" || !form.title.trim() || !form.body.trim()} onClick={save}>
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
            <span className="font-semibold text-rose-300">“{confirmDelete?.title}”</span> will be removed from the Notice Board for everyone.
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
