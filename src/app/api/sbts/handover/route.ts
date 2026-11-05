import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getHandoverSigningSecret, verifyHandoverToken } from "@/lib/handover-token";
import { handle, fail } from "@/lib/api-utils";

export const runtime = "nodejs";

/**
 * SBTS handover deliverable downloads.
 * GET /api/sbts/handover?file=pdf   → SBTS_integration_handover_v1.pdf
 * GET /api/sbts/handover?file=xlsx  → kallmania_media_agents_roster.xlsx
 *
 * Two ways to download:
 *   1. Administrator session (the in-app buttons on the SBTS Scores page).
 *   2. A signed, expiring link — ?file=…&exp=<unix>&sig=<hex> — issued by
 *      scripts/sbts-handover-links.ts. The signature (HMAC over file+expiry
 *      with a DB-stored secret) IS the proof: no login required. This is how
 *      the social media team receives the pack without admin accounts. The
 *      link expires; a tampered or stale signature falls back to the admin
 *      session check, so nothing loosens for anyone else.
 *
 * The handover PDF carries the LIVE production API key and HMAC secret, so the
 * files are never exposed as unauthenticated static assets. Bytes come from
 * the shared database (SbtsDeliverable, seeded by scripts/sbts-deliverables.ts)
 * so every deployment — including production hosts whose filesystem has no
 * download/ directory — serves identical copies; the gitignored download/
 * directory is a fallback. The file key is a strict whitelist; no
 * user-controlled path reaches the disk.
 */
const FILES: Record<string, { filename: string; type: string; dbKey: string }> = {
  pdf: { filename: "SBTS_integration_handover_v1.pdf", type: "application/pdf", dbKey: "handover-pdf" },
  xlsx: {
    filename: "kallmania_media_agents_roster.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dbKey: "roster-xlsx",
  },
};

async function loadDeliverable(meta: { filename: string; dbKey: string }): Promise<Buffer | null> {
  // 1. Shared database — present on every deployment that shares the DB.
  try {
    const row = await db.sbtsDeliverable.findUnique({ where: { name: meta.dbKey } });
    if (row?.bytes?.length) return Buffer.from(row.bytes);
  } catch {
    // table not migrated yet — fall through to the filesystem
  }
  // 2. Filesystem fallback. The standalone server runs with cwd
  //    .next/standalone; source builds run from the project root.
  const candidates = [
    path.resolve(process.cwd(), "download", meta.filename),
    path.resolve(process.cwd(), "..", "..", "download", meta.filename),
    path.resolve("/home/z/my-project/download", meta.filename),
  ];
  for (const p of candidates) {
    try {
      return await readFile(p);
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Top-level navigation (the download buttons / a pasted URL) gets a visible
 * explanation page instead of a JSON 401 — a bare JSON error is exactly what
 * Chrome surfaces as a cryptic failed "handover.json" download entry.
 * API-style calls keep the JSON error.
 */
function wantsHtml(req: NextRequest): boolean {
  if (req.headers.get("sec-fetch-dest") === "document") return true;
  return (req.headers.get("accept") ?? "").includes("text/html");
}

function htmlNotice(title: string, message: string): NextResponse {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(title)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem}main{max-width:36rem;background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2.25rem}h1{font-size:1.2rem;margin:0 0 .75rem}p{line-height:1.6;color:#94a3b8;margin:.5rem 0}a{color:#4da8da}</style></head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a href="/">Open Kallmania and sign in as an administrator</a></p></main></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url);
    const key = url.searchParams.get("file") ?? "pdf";
    const meta = FILES[key];
    if (!meta) return fail("Unknown deliverable — use ?file=pdf or ?file=xlsx.", 400);

    // Signed-link path: a valid ?exp=&sig= pair downloads without a session.
    // Any signature problem (tampered, wrong file, expired) falls back to the
    // administrator session check — the gate only tightens, never loosens.
    let signed = false;
    if (url.searchParams.has("exp") || url.searchParams.has("sig")) {
      try {
        signed = verifyHandoverToken(
          await getHandoverSigningSecret(),
          key,
          url.searchParams.get("exp"),
          url.searchParams.get("sig"),
        );
      } catch {
        signed = false; // secret not reachable → session-only downloads
      }
    }
    if (!signed) {
      try {
        await requireAdmin();
      } catch {
        if (wantsHtml(req)) {
          return htmlNotice(
            "Administrator sign-in required",
            "The SBTS handover pack carries the live integration credentials (API key and HMAC secret), so downloads are restricted to signed-in administrators — or to a valid signed link issued by the administrator (scripts/sbts-handover-links.ts). Sign in with your administrator account on Kallmania, then open this download again — or use the Handover PDF / Agent roster XLSX buttons in the Integration pipe card on the SBTS Scores page.",
          );
        }
        return fail("Administrator session required for handover downloads.", 401);
      }
    }

    const buf = await loadDeliverable(meta);
    if (!buf) {
      return fail("Deliverable bytes are missing — regenerate the file into download/ and re-run scripts/sbts-deliverables.ts.", 404);
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": meta.type,
        "Content-Disposition": `attachment; filename="${meta.filename}"`,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "no-store",
      },
    });
  });
}
