"use client";

import { useEffect } from "react";

/**
 * Stale-bundle auto-recovery.
 *
 * After a redeploy the browser can hold an old HTML document (cache/bfcache)
 * that references content-hashed chunks which no longer exist on the server.
 * The result: the boot splash hangs, then "Application error: a client-side
 * exception has occurred". The classic signature is a chunk-load failure.
 *
 * This guard listens for those failures and hard-reloads ONCE per browser
 * session to pick up the fresh deploy, instead of leaving the user on the
 * raw error screen.
 */

const RELOAD_FLAG = "k-stale-reload-at";

function looksLikeChunkFailure(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("chunkloaderror") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("failed to fetch dynamically") ||
    (m.includes("module script") && m.includes("failed")) ||
    (m.includes("fetch") && m.includes("/_next/"))
  );
}

/** Force one hard reload per browser session (guards against reload loops). */
export function forceReloadIfStale(message = ""): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (looksLikeChunkFailure(message) || !message) {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      const now = Date.now();
      // Allow a fresh reload per deployment cycle; suppress loops within 30s.
      if (!last || now - last > 30_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(now));
        try {
          sessionStorage.setItem("k-force-full-boot", "1");
        } catch { /* ignore */ }
        window.location.reload();
        return true;
      }
    }
  } catch { /* storage unavailable — fall through */ }
  return false;
}

/**
 * Mount once near the root layout. No UI — purely registers recovery
 * listeners for chunk-load failures that happen outside any React boundary
 * (e.g. during dynamic imports of lazily loaded views).
 */
export default function BootGuard() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (looksLikeChunkFailure(e.message || "")) forceReloadIfStale(e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason || "");
      if (looksLikeChunkFailure(msg)) forceReloadIfStale(msg);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
