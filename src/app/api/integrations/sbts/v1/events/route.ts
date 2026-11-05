import { NextRequest } from "next/server";
import { createHash } from "crypto";
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
  type ValidSbtsEvent,
} from "@/lib/integrations/sbts";
import { materializeSbtsKpiResults, materializeSbtsReportKpiResults } from "@/lib/kpi-results";
import { notify } from "@/lib/notify";

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
    const batchUnmappedEmails: string[] = [];
    const rejectedItems: { eventId: string | null; error: string }[] = [];

    /**
     * Post-storage side effects for a FIRST-TIME stored, matched event:
     *  1. performance.score → normalized KpiResult rows (headline + components),
     *     idempotent on eventId so replays can never inflate results.
     *  2. daily.report → parsed KPI rows ("Target X | Actual Y | Variance Z",
     *     inline "A (+V)", weekly RAG rows) materialized as normalized KpiResult
     *     records — missing actuals become flagged NO_DATA rows, never zeros —
     *     PLUS an SBTS_IMPORT Report row in the Report Archive with the
     *     supplied template associated (flagged EXTRACTED_UNCONFIRMED for
     *     review — SBTS owns scoring, Kallmania never invents numbers from text).
     * Failures are logged and never break the pipe: the event itself is safe.
     */
    const runSideEffects = async (ev: ValidSbtsEvent, uid: string) => {
      try {
        const u = await db.user.findUnique({ where: { id: uid }, select: { id: true, team: true, department: true, role: true } });
        if (!u) return;
        const owner = { id: u.id, team: u.team, department: u.department || "SOCIAL_MEDIA" };
        const storedEv = await db.sbtsEvent.findUnique({ where: { eventId: ev.eventId } });
        if (!storedEv) return;
        await materializeSbtsKpiResults(storedEv, owner);
        if (ev.type === "daily.report") {
          await materializeSbtsReportKpiResults(storedEv, owner);
          const ref = `SBTS-${ev.eventId}`;
          const existing = await db.report.findUnique({ where: { ref } });
          if (!existing) {
            await db.report.create({
              data: {
                ref,
                type: "SOCIAL",
                reportDate: new Date(ev.eventDate + "T00:00:00.000Z"),
                userId: uid,
                department: owner.department,
                status: "SUBMITTED",
                sourceType: "SBTS_IMPORT",
                verificationStatus: "EXTRACTED_UNCONFIRMED",
                payload: JSON.stringify({
                  sections: { report: ev.report },
                  templateKey: "SBTS_EXTERNAL",
                  templateName: ev.template ? "SBTS supplied template" : "SBTS free-text (no template supplied)",
                  template: ev.template ?? null,
                }),
              },
            });
          }
        }
      } catch (err) {
        console.error("SBTS side-effects failed for", ev.eventId, err);
      }
    };

    for (const item of batch) {
      const v = validateSbtsEvent(item);
      if (!v.ok) {
        rejected += 1;
        const eid = extractEventId(item);
        results.push({ eventId: eid, status: "rejected", error: v.error });
        rejectedItems.push({ eventId: eid, error: v.error });
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
            reportTemplate: ev.template,
            sentAt: ev.sentAt,
            raw: ev.raw,
            userId,
            matched: userId !== null,
          },
        });
        stored += 1;
        results.push({ eventId: ev.eventId, status: "stored", mapped: userId !== null });
        if (!userId) batchUnmappedEmails.push(ev.agentEmail);
        if (userId) await runSideEffects(ev, userId);
      } catch (err) {
        if (isUniqueViolation(err)) {
          duplicates += 1;
          results.push({ eventId: ev.eventId, status: "duplicate" });
        } else {
          throw err;
        }
      }
    }

    // §5 integration reliability — error notifications. Consolidated per
    // batch (never per event), admins only, and idempotent: the dedupeKeys
    // hash the exact batch contents, so an identical replay or a sender's
    // identical retry can never stack duplicate pings. A notification failure
    // must never break the pipe.
    try {
      if (batchUnmappedEmails.length || rejectedItems.length) {
        const admins = await db.user.findMany({ where: { role: "ADMIN", status: "APPROVED" }, select: { id: true } });
        if (batchUnmappedEmails.length) {
          const uniq = [...new Set(batchUnmappedEmails)].sort();
          const digest = createHash("sha256").update(uniq.join(",")).digest("hex").slice(0, 16);
          for (const a of admins) {
            await notify({
              userId: a.id,
              type: "SBTS_UNMAPPED_AGENT",
              severity: "WARNING",
              title: `SBTS: event(s) for ${uniq.length} unmapped agent email(s)`,
              message: `Events arrived from the Media Command Centre for email(s) with no Kallmania account: ${uniq.slice(0, 10).join(", ")}${uniq.length > 10 ? ` … (+${uniq.length - 10} more)` : ""}. Nothing is lost — the events are stored and visible as unmapped under SBTS Scores; reconcile the roster to link them.`,
              linkData: { emails: uniq.slice(0, 25), source: "sbts-ingest" },
              dedupeKey: `sbts-unmapped:${digest}`,
            });
          }
        }
        if (rejectedItems.length) {
          const digest = createHash("sha256").update(rejectedItems.map((r) => `${r.eventId ?? "-"}:${r.error}`).sort().join("|")).digest("hex").slice(0, 16);
          for (const a of admins) {
            await notify({
              userId: a.id,
              type: "SBTS_EVENT_REJECTED",
              severity: "WARNING",
              title: `SBTS: ${rejectedItems.length} event(s) rejected by validation`,
              message: rejectedItems.slice(0, 5).map((r) => `• ${r.eventId ?? "(no id)"}: ${r.error}`).join("\n") + (rejectedItems.length > 5 ? `\n… (+${rejectedItems.length - 5} more)` : ""),
              linkData: { count: rejectedItems.length, source: "sbts-ingest" },
              dedupeKey: `sbts-rejected:${digest}`,
            });
          }
        }
      }
    } catch (err) {
      console.error("SBTS admin notification failed:", err);
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
