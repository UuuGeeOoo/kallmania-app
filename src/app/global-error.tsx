"use client";

import { useEffect } from "react";
import { forceReloadIfStale } from "@/components/kallmania/boot-guard";
import { Loader2, RotateCw } from "lucide-react";

/**
 * Global error boundary — last resort when the root layout itself fails.
 * Must render its own <html>/<body>. Same recovery UX as route-level
 * error.tsx, with automatic reload once for stale-bundle chunk failures.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const reloaded = forceReloadIfStale(error?.message || "");
    if (reloaded) return;
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0d14", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              padding: 24,
              textAlign: "center",
              color: "#e2e8f0",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "rgba(245,158,11,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
              }}
            >
              <Loader2 size={24} />
            </div>
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Kallmania hit an error</h1>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#94a3b8" }}>
              A new version may have just shipped. Reloading usually fixes it.
            </p>
            <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#f1f5f9",
                  padding: "8px 16px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <RotateCw size={16} /> Reload Kallmania
              </button>
              <button
                onClick={reset}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#cbd5e1",
                  padding: "8px 16px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
            {error?.digest ? (
              <p style={{ marginTop: 16, fontSize: 11, color: "#475569" }}>Ref: {error.digest}</p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
