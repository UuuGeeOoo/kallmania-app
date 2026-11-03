import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { handle, fail } from "@/lib/api-utils";

export const runtime = "nodejs";

/**
 * SBTS handover deliverable downloads — ADMIN session required.
 * GET /api/sbts/handover?file=pdf   → SBTS_integration_handover_v1.pdf
 * GET /api/sbts/handover?file=xlsx  → kallmania_media_agents_roster.xlsx
 *
 * The handover PDF carries the LIVE production API key and HMAC secret, so the
 * files are never exposed as unauthenticated static assets — they are streamed
 * from the gitignored download/ directory only to signed-in administrators.
 * The file key is a strict whitelist; no user-controlled path ever reaches the
 * filesystem.
 */
const FILES: Record<string, { filename: string; type: string }> = {
  pdf: { filename: "SBTS_integration_handover_v1.pdf", type: "application/pdf" },
  xlsx: {
    filename: "kallmania_media_agents_roster.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
};

async function loadDeliverable(filename: string): Promise<Buffer | null> {
  // The standalone server runs with cwd .next/standalone; source builds run
  // from the project root. Resolve both, plus the absolute workspace path.
  const candidates = [
    path.resolve(process.cwd(), "download", filename),
    path.resolve(process.cwd(), "..", "..", "download", filename),
    path.resolve("/home/z/my-project/download", filename),
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

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();

    const key = new URL(req.url).searchParams.get("file") ?? "pdf";
    const meta = FILES[key];
    if (!meta) return fail("Unknown deliverable — use ?file=pdf or ?file=xlsx.", 400);

    const buf = await loadDeliverable(meta.filename);
    if (!buf) {
      return fail("Deliverable file is not on the server — regenerate it into download/ first.", 404);
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
