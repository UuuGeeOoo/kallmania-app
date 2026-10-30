import { NextRequest } from "next/server";
import { handle, ok, fail } from "@/lib/api-utils";
import { processPushQueue, cronSecret, housekeepPush } from "@/lib/push";

/**
 * POST /api/push/process — queue processor for unattended schedulers
 * (e.g. Supabase pg_cron + pg_net calling every minute; or any external cron).
 * Protected by a shared secret header: x-push-cron-secret (ENV PUSH_CRON_SECRET,
 * falling back to the server-generated SystemFlag `push:cronSecret`).
 * The value is visible to administrators under Admin → Push Health → Cron.
 *
 * Idempotent: each event is claimed with lease semantics, so overlapping
 * invocations never double-send.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const secret = await cronSecret();
    const provided = req.headers.get("x-push-cron-secret") || "";
    if (!secret || provided !== secret) return fail("Invalid push processor credentials", 401);
    const tally = await processPushQueue(50);
    await housekeepPush();
    return ok({ success: true, ...tally });
  });
}
