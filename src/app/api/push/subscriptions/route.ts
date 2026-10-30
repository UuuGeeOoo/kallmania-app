import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";

/**
 * Push subscription management (own devices only).
 *
 *  GET   → the caller's subscriptions, SANITIZED: id, label, active, dates,
 *          endpointTail (last 10 chars) so the UI can mark "this browser"
 *          without ever exposing full endpoints or key material.
 *  POST  { action: "subscribe", endpoint, keys: {p256dh, auth}, label? }
 *          → upserts by endpoint (a browser that re-subscribes — or changes
 *            account — keeps one row; userId is reassigned to the caller).
 *        { action: "unsubscribe", endpoint }
 *          → removes the row owned by the caller.
 */
function sanitized(rows: { id: string; label: string; active: boolean; createdAt: Date; lastSuccessAt: Date | null; endpoint: string }[]) {
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    active: r.active,
    createdAt: r.createdAt,
    lastSuccessAt: r.lastSuccessAt,
    endpointTail: r.endpoint.slice(-10),
  }));
}

export async function GET() {
  return handle(async () => {
    const me = await requireUser();
    const rows = await db.pushSubscription.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, active: true, createdAt: true, lastSuccessAt: true, endpoint: true },
    });
    return ok({ subscriptions: sanitized(rows) });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = (await req.json()) as {
      action?: string;
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      label?: string;
    };

    if (body.action === "subscribe") {
      const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
      const p256dh = body.keys?.p256dh || "";
      const auth = body.keys?.auth || "";
      if (!/^https:\/\//.test(endpoint) || endpoint.length > 2048 || !p256dh || !auth) {
        return fail("Invalid subscription payload", 400);
      }
      const label = (typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Browser").slice(0, 80);
      await db.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: me.id, endpoint, p256dh, auth, label, active: true },
        // Same browser re-subscribing (or a device switching accounts): the
        // subscription is reassigned to the current user and refreshed.
        update: { userId: me.id, p256dh, auth, label, active: true, lastError: null, lastErrorCategory: null },
      });
      return ok({ success: true });
    }

    if (body.action === "unsubscribe") {
      const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
      // Only the owner's row is affected — a user can never remove another
      // user's subscription even if they learn the endpoint URL.
      const res = await db.pushSubscription.deleteMany({ where: { endpoint, userId: me.id } });
      if (res.count === 0) return fail("Subscription not found for this account", 404);
      return ok({ success: true });
    }

    return fail("Unknown action", 400);
  });
}
