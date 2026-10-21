import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";

/** Notice Board — company-wide announcements. Everyone can read; admins manage. */
export async function GET() {
  return handle(async () => {
    await requireUser();
    const notices = await db.notice.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return ok({ notices });
  });
}

/** Post a new notice (admin only). */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { title, body, pinned } = await req.json();
    if (!title || !String(title).trim()) return fail("A notice title is required");
    if (!body || !String(body).trim()) return fail("The notice body is required");
    if (String(title).trim().length > 120) return fail("Title is too long (maximum 120 characters)");
    if (String(body).length > 5000) return fail("Notice body is too long (maximum 5000 characters)");
    const notice = await db.notice.create({
      data: {
        title: String(title).trim(),
        body: String(body).trim(),
        pinned: pinned === true,
        authorId: admin.id,
        authorName: admin.fullName,
      },
    });
    await audit({
      userId: admin.id,
      actorName: admin.fullName,
      action: "CREATE_NOTICE",
      entity: "Notice",
      entityId: notice.id,
      details: `Posted notice: ${notice.title}${notice.pinned ? " (pinned)" : ""}`,
    });
    return ok({ notice }, 201);
  });
}

/** Edit a notice — title, body and/or pinned flag (admin only). */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { noticeId, title, body, pinned } = await req.json();
    if (!noticeId) return fail("noticeId is required");
    const existing = await db.notice.findUnique({ where: { id: noticeId } });
    if (!existing) return fail("Notice not found", 404);
    if (title !== undefined && !String(title).trim()) return fail("A notice title is required");
    if (body !== undefined && !String(body).trim()) return fail("The notice body is required");
    if (title !== undefined && String(title).trim().length > 120) return fail("Title is too long (maximum 120 characters)");
    if (body !== undefined && String(body).length > 5000) return fail("Notice body is too long (maximum 5000 characters)");
    const notice = await db.notice.update({
      where: { id: noticeId },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(body !== undefined ? { body: String(body).trim() } : {}),
        ...(pinned !== undefined ? { pinned: pinned === true } : {}),
      },
    });
    await audit({
      userId: admin.id,
      actorName: admin.fullName,
      action: "UPDATE_NOTICE",
      entity: "Notice",
      entityId: noticeId,
      details: `Updated notice: ${notice.title}`,
    });
    return ok({ notice });
  });
}

/** Delete a notice (admin only). */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const noticeId = searchParams.get("noticeId");
    if (!noticeId) return fail("noticeId is required");
    const existing = await db.notice.findUnique({ where: { id: noticeId } });
    if (!existing) return fail("Notice not found", 404);
    await db.notice.delete({ where: { id: noticeId } });
    await audit({
      userId: admin.id,
      actorName: admin.fullName,
      action: "DELETE_NOTICE",
      entity: "Notice",
      entityId: noticeId,
      details: `Deleted notice: ${existing.title}`,
    });
    return ok({ success: true });
  });
}
