"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, Download, ExternalLink, Maximize2, Minimize2, AlertTriangle, ZoomIn, ZoomOut, FileText, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * In-app document viewer — opens uploaded documents inside the application
 * (no download, no external site). Backed by:
 *  - /api/uploads/preview?id=  (JSON payload describing how to render)
 *  - /api/uploads/file?id=     (inline file stream — PDF iframe / <img>)
 * Download always remains available as a separate explicit action
 * (/api/uploads/file?id=…&download=1 → attachment disposition).
 */

interface PreviewPayload {
  kind: "pdf" | "image" | "text" | "docx" | "sheet" | "unsupported";
  html?: string;
  text?: string;
  sheets?: { name: string; rows: string[][] }[];
  extension: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  unsupportedMessage?: string;
}

const KIND_LABEL: Record<string, string> = { pdf: "PDF", image: "Image", text: "Text", docx: "Word document", sheet: "Spreadsheet", unsupported: "File" };

const fileUrl = (id: string) => `/api/uploads/file?id=${encodeURIComponent(id)}`;

export function DocumentViewerModal({ uploadId, name, onClose }: { uploadId: string; name: string; onClose: () => void }) {
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/uploads/preview?id=${encodeURIComponent(uploadId)}`);
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "The document could not be opened");
      setData(json as PreviewPayload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    } else {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    }
  };

  const download = () => { window.location.href = `${fileUrl(uploadId)}&download=1`; };
  const ext = (name.split(".").pop() || "").toUpperCase();
  const kind = data?.kind;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={shellRef} className="k-card flex h-full w-full max-w-6xl flex-col overflow-hidden" style={{ padding: 0 }}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-[#8b7ff5]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="text-[11px] text-slate-500">
              {kind ? KIND_LABEL[kind] : "Document"} · {ext || "?"} · {data ? `${(data.sizeBytes / 1024).toFixed(0)} KB` : ""}
            </p>
          </div>
          {kind === "image" && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300" title="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, z - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="w-10 text-center text-[11px] tabular-nums text-slate-400">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300" title="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300" title="Reset zoom" onClick={() => setZoom(1)}><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>
          )}
          <Button size="sm" variant="ghost" className="h-8 text-[11px] text-slate-300" onClick={toggleFullscreen} title={fullscreen ? "Exit full screen" : "Full screen"}>
            {fullscreen ? <Minimize2 className="mr-1.5 h-3.5 w-3.5" /> : <Maximize2 className="mr-1.5 h-3.5 w-3.5" />} {fullscreen ? "Exit" : "Full screen"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-[11px] text-slate-300" onClick={() => window.open(fileUrl(uploadId), "_blank")} title="Open in a new browser tab">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> New tab
          </Button>
          <Button size="sm" variant="outline" className="h-8 border-[#8b7ff5]/40 text-[11px] text-[#b3a5ff]" onClick={download} title="Download the original file to your device">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={onClose} title="Close viewer"><X className="h-4 w-4" /></Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#0d1622]">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#8b7ff5]" />
              <p className="text-sm">Opening document…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
              <p className="max-w-md text-sm text-slate-300">{error}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-white/15 text-slate-200" onClick={load}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try again</Button>
                <Button size="sm" variant="outline" className="border-[#8b7ff5]/40 text-[#b3a5ff]" onClick={download}><Download className="mr-1.5 h-3.5 w-3.5" /> Download instead</Button>
              </div>
            </div>
          )}
          {!loading && !error && data && (
            <>
              {kind === "pdf" && (
                <iframe src={fileUrl(uploadId)} title={name} className="h-full min-h-[60vh] w-full border-0 bg-white" />
              )}
              {kind === "image" && (
                <div className="flex min-h-full items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(uploadId)} alt={name} style={{ transform: `scale(${zoom})` }} className="max-h-none max-w-full origin-center transition-transform" />
                </div>
              )}
              {kind === "text" && (
                <pre className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-relaxed text-slate-200">{data.text}</pre>
              )}
              {kind === "docx" && (
                <div className="mx-auto max-w-4xl p-6">
                  <div className="docx-preview rounded-xl bg-white p-8 text-[13px] leading-relaxed text-slate-900 shadow-xl" dangerouslySetInnerHTML={{ __html: data.html || "" }} />
                </div>
              )}
              {kind === "sheet" && data.sheets && data.sheets.length > 0 && (
                <div className="p-4">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {data.sheets.map((s, i) => (
                      <button key={i} type="button" onClick={() => setSheetIdx(i)}
                        className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold transition", i === sheetIdx ? "border-[#8b7ff5] bg-[#6c5ce7]/25 text-white" : "border-white/12 text-slate-300 hover:border-slate-500")}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        {(data.sheets[sheetIdx]?.rows || []).map((row, ri) => (
                          <tr key={ri} className={ri === 0 ? "bg-white/[0.05]" : "border-t border-white/5"}>
                            {row.map((cell, ci) => (
                              <td key={ci} className={cn("max-w-72 truncate px-2.5 py-1.5 align-top", ri === 0 ? "font-semibold text-slate-100" : "text-slate-300")}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-600">Showing the first 500 rows of “{data.sheets[sheetIdx]?.name}” — download for the complete workbook.</p>
                </div>
              )}
              {kind === "unsupported" && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <FileText className="h-10 w-10 text-slate-500" />
                  <p className="max-w-md text-sm text-slate-300">{data.unsupportedMessage || "This file type cannot be previewed in the app."}</p>
                  <Button size="sm" variant="outline" className="border-[#8b7ff5]/40 text-[#b3a5ff]" onClick={download}><Download className="mr-1.5 h-3.5 w-3.5" /> Download original</Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        {!loading && !error && kind === "pdf" && (
          <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
            Use the viewer toolbar inside the document for zoom, page navigation, search and printing — the file stays inside the app.
          </div>
        )}
      </div>
    </div>
  );
}
