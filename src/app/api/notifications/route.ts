import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";

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
    // Any user can delete a notification from their own inbox.
    if (body.action === "delete" && body.id) {
      await db.notification.deleteMany({ where: { id: body.id, userId: me.id } });
      return ok({ success: true });
    }
    return fail("Unknown action");
  });
}
