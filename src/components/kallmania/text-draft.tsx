"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, Copy, Check, Trash2, AlertTriangle, FileText, ShieldCheck, Download, Eye } from "lucide-react";
import { api } from "@/lib/client";
import { DocumentViewerModal } from "@/components/kallmania/document-viewer";

/**
 * Text draft viewer — shows the full text extracted from an uploaded document
 * (lives in the database, NOT in the file), with copy support and the
 * "keep text only" action that permanently discards the original file from
 * storage while the draft and mapped fields remain.
 *
 * Works even after the file was discarded: the text endpoint reads the
 * database record, so the draft stays accessible forever.
 */

interface TextDraft {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractStatus: string;
  fileDiscarded: boolean;
  discardedAt?: string | null;
  reportDate?: string | null;
  text: string;
}

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  EXTRACTION_COMPLETED: "Extraction completed",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  SUBMITTED: "Submitted",
  FAILED: "Extraction failed",
};

export function TextDraftModal({
  uploadId,
  name,
  onClose,
  onDiscarded,
}: {
  uploadId: string;
  name: string;
  onClose: () => void;
  /** Called after the original file was successfully discarded. */
  onDiscarded?: () => void;
}) {
  const [draft, setDraft] = useState<TextDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const previewingRef = useRef(false);
  previewingRef.current = previewing;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<TextDraft>(`/api/uploads/text?id=${encodeURIComponent(uploadId)}`);
      setDraft(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !previewingRef.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = async () => {
    if (!draft?.text) return;
    try {
      await navigator.clipboard.writeText(draft.text);
    } catch {
      // Fallback for browsers without clipboard permission
      const ta = document.createElement("textarea");
      ta.value = draft.text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  const discardFile = async () => {
    if (!draft) return;
    setDiscarding(true);
    try {
      await api("/api/uploads/discard", { method: "POST", body: JSON.stringify({ id: uploadId }) });
      setConfirmDiscard(false);
      await load();
      onDiscarded?.();
    } catch (e) {
      setError((e as Error).message);
      setConfirmDiscard(false);
    } finally {
      setDiscarding(false);
    }
  };

  const hasText = !!draft?.text?.trim();
  const discarded = !!draft?.fileDiscarded;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="k-card flex h-full w-full max-w-4xl flex-col overflow-hidden" style={{ padding: 0 }}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-[#8b7ff5]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Text draft — {name}</p>
            <p className="text-[11px] text-slate-500">
              {draft ? `${draft.text.length.toLocaleString()} characters · ${STATUS_LABEL[draft.extractStatus] || draft.extractStatus}` : "Extracted from the document"}
              {discarded && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">file discarded — text only</span>}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-[11px] text-slate-300" title="Preview the draft as a formatted document" disabled={!hasText} onClick={() => setPreviewing(true)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview as document
          </Button>
          <Button size="sm" variant="outline" disabled={!hasText} className="h-8 border-[#8b7ff5]/40 text-[11px] text-[#b3a5ff]" title="Download the draft as a .docx document" onClick={() => { window.location.href = `/api/uploads/draft-export?id=${encodeURIComponent(uploadId)}&download=1`; }}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> DOCX
          </Button>
          <Button size="sm" variant="outline" disabled={!hasText || copied} className="h-8 border-[#8b7ff5]/40 text-[11px] text-[#b3a5ff]" onClick={copyText}>
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />} {copied ? "Copied" : "Copy text"}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={onClose} title="Close"><X className="h-4 w-4" /></Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#0d1622]">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#8b7ff5]" />
              <p className="text-sm">Loading text draft…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
              <p className="max-w-md text-sm text-slate-300">{error}</p>
            </div>
          )}
          {!loading && !error && draft && (
            hasText ? (
              <pre className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-relaxed text-slate-200">{draft.text}</pre>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-10 w-10 text-slate-500" />
                <p className="max-w-md text-sm text-slate-300">No text draft yet — run the extraction first. Once extracted, the full text appears here and the original file can be discarded.</p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-3">
          {discarded ? (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-300/90">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Original file permanently discarded on {draft?.discardedAt ? new Date(draft.discardedAt).toLocaleString() : "—"} — only this text draft and the extracted fields remain.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">This draft lives in the app database — independent of the original file.</p>
              {confirmDiscard ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-rose-300">Delete the original file permanently?</span>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-300" onClick={() => setConfirmDiscard(false)} disabled={discarding}>Cancel</Button>
                  <Button size="sm" variant="outline" className="h-7 border-rose-500/50 text-[11px] text-rose-300 hover:bg-rose-500/10" onClick={discardFile} disabled={discarding}>
                    {discarding ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Yes, discard file
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" disabled={!hasText || discarding} className="h-8 border-rose-500/40 text-[11px] text-rose-300 hover:bg-rose-500/10" onClick={() => setConfirmDiscard(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Keep text only — discard file
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Stacked on top of the text modal (later in DOM, same z-index) — Esc closes this first */}
      {previewing && (
        <DocumentViewerModal
          name={`text-draft-${name.replace(/\.[^.]+$/, "")}.docx`}
          previewUrl={`/api/uploads/draft-preview?id=${encodeURIComponent(uploadId)}`}
          downloadHref={`/api/uploads/draft-export?id=${encodeURIComponent(uploadId)}&download=1`}
          onClose={() => setPreviewing(false)}
        />
      )}
    </div>
  );
}
