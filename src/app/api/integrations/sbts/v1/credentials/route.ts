import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { createSbtsCredential, rotateSbtsCredential } from "@/lib/integrations/sbts";

/**
 * SBTS credential management — ADMIN session required.
 *
 * GET  /api/integrations/sbts/v1/credentials
 *      Operational status of the ingest pipe: credential hints (never the key
 *      or secret), 24h event counts, last event received. Used by the admin
 *      "integration pipe" card on the scoreboard view.
 *
 * POST /api/integrations/sbts/v1/credentials
 *      { action: "create" }                       — first credential (409 if one exists)
 *      { action: "rotate", graceHours?: number }  — mint a new key/secret; the previous
 *                                                    one keeps verifying for `graceHours`
 *                                                    (default 24, 0 = immediate revoke).
 *      The plaintext key + secret are returned EXACTLY ONCE in this response —
 *      they are never stored or retrievable again (key only as sha256).
 */
export async function GET() {
  return handle(async () => {
    await requireAdmin();

    const credentials = await db.sbtsCredential.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, keyHint: true, active: true, revokedAt: true, graceUntil: true, createdAt: true },
      take: 10,
    });
    const dayAgo = new Date(Date.now() - 86400_000);
    const [events24h, last, unmapped] = await Promise.all([
      db.sbtsEvent.count({ where: { receivedAt: { gte: dayAgo } } }),
      db.sbtsEvent.findFirst({ orderBy: { receivedAt: "desc" }, select: { receivedAt: true, type: true, agentEmail: true } }),
      db.sbtsEvent.count({ where: { matched: false } }),
    ]);
    return ok({ credentials, events24h, lastEvent: last, unmappedCount: unmapped });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    try {
      await requireAdmin();
    } catch (e) {
      if (e instanceof AuthError) return fail(e.message, e.status);
      throw e;
    }
    const body = (await req.json().catch(() => ({}))) as { action?: string; graceHours?: number; credentialId?: string; label?: string };
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : undefined;

    try {
      if (body.action === "create") {
        const material = await createSbtsCredential(label);
        return ok({ rotated: false, key: material.key, secret: material.secret, keyHint: material.keyHint, label: material.label }, 201);
      }
      if (body.action === "rotate") {
        const graceHours = Number.isFinite(body.graceHours) ? Math.max(0, Math.min(168, Number(body.graceHours))) : 24;
        const targetId = typeof body.credentialId === "string" && body.credentialId ? body.credentialId : undefined;
        const material = await rotateSbtsCredential(graceHours, label, targetId);
        return ok({ rotated: true, graceHours, key: material.key, secret: material.secret, keyHint: material.keyHint, label: material.label });
      }
      return fail('action must be "create" or "rotate"', 400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Credential operation failed";
      if (msg.includes("already exists")) return fail(msg, 409);
      throw e;
    }
  });
}
