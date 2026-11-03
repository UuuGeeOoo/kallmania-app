import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, ok, fail } from "@/lib/api-utils";
import {
  SBTS_PROTOCOL_VERSION,
  SBTS_MAX_BATCH,
  SBTS_MAX_BODY_BYTES,
  verifySbtsRequest,
  validateSbtsEvent,
  extractEventId,
  isUniqueViolation,
} from "@/lib/integrations/sbts";

/**
 * SBTS Media Command Centre ingest — protocol v1.
 *
 * POST /api/integrations/sbts/v1/events
 *   Auth:  Authorization: Bearer <API key>
 *          X-SBTS-Timestamp: <unix seconds|ms, ±5 min>
 *          X-SBTS-Signature:  hex hmac_sha256(sharedSecret, rawBody)
 *   Body:  one event object, or { "events": [ ... ] } (max 100).
 *          v1 event types: performance.score, daily.report.
 *
 * Contract guarantees:
 *   - Responds 200 quickly once authenticated — per-item results report
 *     stored / duplicate (idempotency on eventId) / rejected (validation).
 *   - Duplicate eventId NEVER re-processes: the first stored copy wins.
 *   - A bad item never breaks the pipe — only its own entry is rejected.
 *   - Unmapped agent emails are stored flagged (matched=false) so nothing
 *     is lost while rosters are reconciled.
 */

export async function POST(req: NextRequest) {
  const raw = await req.text();
  return handle(async () => {
    if (!raw) return fail("Empty body", 400);
    if (raw.length > SBTS_MAX_BODY_BYTES) return fail("Body too large (max 1 MB per request)", 413);

    const auth = await verifySbtsRequest(req.headers, raw);
    if (!auth.ok) return fail(auth.error, auth.status);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fail("Malformed JSON body", 400);
    }

    const batch: unknown[] = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { events?: unknown }).events)
        ? ((parsed as { events: unknown[] }).events)
        : [parsed];

    if (batch.length === 0) return fail("No events in body", 400);
    if (batch.length > SBTS_MAX_BATCH)
      return fail(`Batch too large (max ${SBTS_MAX_BATCH} events per request)`, 400);

    // One lookup per batch for email→account mapping (exact, case-insensitive).
    const emails = [...new Set(
      batch
        .map((item) => {
          if (typeof item !== "object" || item === null) return null;
          const agent = (item as { agent?: { email?: unknown } }).agent;
          const email = typeof agent?.email === "string" ? agent.email.trim().toLowerCase() : "";
          return email || null;
        })
        .filter((e): e is string => !!e)
    )];
    const users = emails.length
      ? await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } })
      : [];
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

    const results: { eventId: string | null; status: string; error?: string; mapped?: boolean }[] = [];
    let stored = 0;
    let duplicates = 0;
    let rejected = 0;

    for (const item of batch) {
      const v = validateSbtsEvent(item);
      if (!v.ok) {
        rejected += 1;
        results.push({ eventId: extractEventId(item), status: "rejected", error: v.error });
        continue;
      }
      const ev = v.event;
      const userId = byEmail.get(ev.agentEmail) ?? null;
      try {
        await db.sbtsEvent.create({
          data: {
            eventId: ev.eventId,
            type: ev.type,
            agentEmail: ev.agentEmail,
            eventDate: ev.eventDate,
            score: ev.score,
            delta: ev.delta,
            components: ev.components,
            report: ev.report,
            sentAt: ev.sentAt,
            raw: ev.raw,
            userId,
            matched: userId !== null,
          },
        });
        stored += 1;
        results.push({ eventId: ev.eventId, status: "stored", mapped: userId !== null });
      } catch (err) {
        if (isUniqueViolation(err)) {
          duplicates += 1;
          results.push({ eventId: ev.eventId, status: "duplicate" });
        } else {
          throw err;
        }
      }
    }

    return ok({
      ok: true,
      version: SBTS_PROTOCOL_VERSION,
      accepted: stored,
      duplicates,
      rejected,
      results,
    });
  });
}
