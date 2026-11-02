import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { pushHealth, setMandatoryCategories, processPushQueue, cronSecret, vapidConfig, MAX_DISPATCH_ATTEMPTS } from "@/lib/push";

/**
 * Administrative push health + operations (ADMIN only).
 *
 *  GET  → configuration status, queue/delivery/subscription counters, recent
 *         failures and rejected attempts. No endpoint URLs or key material.
 *  POST { action: "retry", eventId }       → re-queue a failed event (bounded).
 *       { action: "setMandatory", types }  → administrator-defined mandatory
 *                                            notification categories.
 *       { action: "processQueue" }         → drain due events now.
 *       { action: "cronInfo" }             → endpoint + secret for Supabase
 *                                            pg_cron setup (admin-only view).
 */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const health = await pushHealth();
    return ok({ ...health, maxAttempts: MAX_DISPATCH_ATTEMPTS });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const body = (await req.json()) as { action?: string; eventId?: string; types?: unknown };

    if (body.action === "retry") {
      const eventId = typeof body.eventId === "string" ? body.eventId : "";
      const event = await db.pushEvent.findUnique({ where: { id: eventId }, select: { id: true, status: true, attempts: true } });
      if (!event) return fail("Notification event not found", 404);
      if (event.attempts >= MAX_DISPATCH_ATTEMPTS) return fail(`Attempt limit (${MAX_DISPATCH_ATTEMPTS}) reached for this event`, 400);
      await db.pushEvent.update({ where: { id: eventId }, data: { status: "PENDING", nextAttemptAt: new Date() } });
      return ok({ success: true });
    }

    if (body.action === "setMandatory") {
      if (!Array.isArray(body.types)) return fail("types must be an array of category names", 400);
      const mandatory = await setMandatoryCategories(body.types.map(String));
      return ok({ success: true, mandatory });
    }

    if (body.action === "processQueue") {
      const tally = await processPushQueue(50);
      return ok({ success: true, ...tally });
    }

    if (body.action === "cronInfo") {
      const configured = Boolean(await vapidConfig());
      return ok({ configured, cronUrl: "/api/push/process", cronSecret: await cronSecret() });
    }

    return fail("Unknown action", 400);
  });
}
