"use client";

import { useEffect } from "react";
import { forceReloadIfStale } from "@/components/kallmania/boot-guard";
import { Loader2, RotateCw } from "lucide-react";

/**
 * Route-level error boundary. Replaces the raw "Application error:
 * a client-side exception has occurred" screen with a friendly recovery
 * card. If the failure is a stale-bundle chunk error (typical right after a
 * redeploy), it reloads automatically once; otherwise the user gets a
 * one-click Reload.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const reloaded = forceReloadIfStale(error?.message || "");
    if (reloaded) return;
    // Non-chunk failure: log for diagnosis.
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="k-aurora" aria-hidden />
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <Loader2 className="h-6 w-6 text-amber-400" />
        </div>
        <h1 className="text-base font-semibold text-slate-100">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          The page hit an unexpected error while loading. A new version of Kallmania may have just shipped — reloading
          usually fixes it.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem("k-stale-reload-at");
              } catch { /* ignore */ }
              window.location.reload();
            }}
            className="k-btn-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-100"
          >
            <RotateCw className="h-4 w-4" /> Reload Kallmania
          </button>
          <button
            onClick={reset}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Try again
          </button>
        </div>
        {error?.digest ? <p className="mt-4 text-[11px] text-slate-600">Ref: {error.digest}</p> : null}
      </div>
    </div>
  );
}
