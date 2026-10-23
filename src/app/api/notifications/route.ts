import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";

/**
 * Inbox notifications.
 *  - GET: own inbox (role-aware list is created at fan-out time).
 *  - PATCH: read / readAll / clearAll / delete (own copy) / deleteMany (own copies).
 *  - ADMIN: "delete" and "deleteMany" remove the logical notification for EVERY
 *    recipient — all copies sharing the same dedupeKey base (dedupeKey is
 *    `${base}#${userId}`) and all inbox rows pointing at the same escalation.
 */

/** Admin scope for deleting a logical notification everywhere, not just one inbox copy. */
async function adminGlobalScope(ids: string[]): Promise<Record<string, unknown>[]> {
  const rows = await db.notification.findMany({ where: { id: { in: ids } }, select: { id: true, dedupeKey: true, linkData: true } });
  const bases = new Set<string>();
  const escalationIds = new Set<string>();
  for (const r of rows) {
    if (r.dedupeKey) {
      const cut = r.dedupeKey.lastIndexOf("#");
      if (cut > 0) bases.add(r.dedupeKey.slice(0, cut));
    }
    if (r.linkData) {
      try {
        const link = JSON.parse(r.linkData) as { escalationId?: string };
        if (link.escalationId) escalationIds.add(link.escalationId);
      } catch { /* unparseable linkData */ }
    }
  }
  const or: Record<string, unknown>[] = [{ id: { in: ids } }];
  for (const b of bases) or.push({ dedupeKey: { startsWith: `${b}#` } });
  for (const eid of escalationIds) or.push({ linkData: { contains: eid } });
  return or;
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "1";
    const notifications = await db.notification.findMany({
      where: { userId: me.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unreadCount = await db.notification.count({ where: { userId: me.id, read: false } });
    return ok({ notifications, unreadCount });
  });
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    if (body.action === "readAll") {
      await db.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
      return ok({ success: true });
    }
    if (body.action === "read" && body.id) {
      await db.notification.updateMany({ where: { id: body.id, userId: me.id }, data: { read: true } });
      return ok({ success: true });
    }
    if (body.action === "clearAll") {
      await db.notification.deleteMany({ where: { userId: me.id } });
      return ok({ success: true });
    }
    // Delete one: own copy for everyone; administrators remove every copy of the
    // same logical notification (all recipients, same escalation) as well.
    if (body.action === "delete" && body.id) {
      if (me.role === "ADMIN") {
        await db.notification.deleteMany({ where: { OR: await adminGlobalScope([String(body.id)]) } });
      } else {
        await db.notification.deleteMany({ where: { id: body.id, userId: me.id } });
      }
      return ok({ success: true });
    }
    // Bulk delete: a list of inbox ids — own copies for regular users,
    // every recipient's copy for administrators.
    if (body.action === "deleteMany" && Array.isArray(body.ids) && body.ids.length > 0) {
      const ids = body.ids.map(String).slice(0, 200);
      if (me.role === "ADMIN") {
        await db.notification.deleteMany({ where: { OR: await adminGlobalScope(ids) } });
      } else {
        await db.notification.deleteMany({ where: { id: { in: ids }, userId: me.id } });
      }
      return ok({ success: true, deleted: ids.length });
    }
    return fail("Unknown action");
  });
}
