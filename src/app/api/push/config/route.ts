import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { vapidConfig } from "@/lib/push";

/**
 * GET /api/push/config
 * Public (to authenticated users) push registration configuration: the VAPID
 * PUBLIC key only — the private key never leaves the server. `configured:false`
 * tells the UI push has not been set up yet (no false "enabled" states).
 */
export async function GET(_req: NextRequest) {
  return handle(async () => {
    await requireUser();
    const vapid = await vapidConfig();
    return ok({
      configured: Boolean(vapid),
      publicKey: vapid?.publicKey ?? null,
      subject: vapid?.subject ?? null,
    });
  });
}
