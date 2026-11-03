import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit, notify } from "@/lib/notify";

/**
 * Admin-side of the forgot-password flow.
 *
 * An agent who forgot their password raises a request from the login screen
 * (POST /api/auth action=requestPasswordReset). It lands here as PENDING.
 * The administrator APPROVES (the agent gets the go-ahead to set a new
 * password on the login screen — one-time) or DENIES it. Every decision is
 * audited and the requester is notified in-app for when they are back in.
 */

/** List password reset requests (newest first) with the resolved account info. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const rows = await db.passwordResetRequest.findMany({
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
    const emails = Array.from(new Set(rows.map((r) => r.email)));
    const users = await db.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, fullName: true, role: true, team: true, status: true },
    });
    const byEmail = new Map(users.map((u) => [u.email, u]));
    return ok({
      requests: rows.map((r) => {
        const u = byEmail.get(r.email);
        return {
          id: r.id,
          email: r.email,
          status: r.status,
          requestedAt: r.requestedAt,
          decidedAt: r.decidedAt,
          decidedByName: r.decidedByName,
          usedAt: r.usedAt,
          fullName: u?.fullName ?? null,
          role: u?.role ?? null,
          team: u?.team ?? null,
          accountStatus: u?.status ?? null,
        };
      }),
    });
  });
}

/** Approve or deny a PENDING request. */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const body = await req.json();
    const { id, action } = body;
    if (!id || !["approve", "deny"].includes(action)) return fail("id and action (approve|deny) are required");
    const row = await db.passwordResetRequest.findUnique({ where: { id } });
    if (!row) return fail("Request not found", 404);
    if (row.status !== "PENDING") return fail(`This request was already ${row.status.toLowerCase()}`);
    const updated = await db.passwordResetRequest.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "DENIED",
        decidedAt: new Date(),
        decidedById: admin.id,
        decidedByName: admin.fullName,
      },
    });
    await audit({
      userId: admin.id,
      actorName: admin.fullName,
      action: action === "approve" ? "PASSWORD_RESET_APPROVED" : "PASSWORD_RESET_DENIED",
      entity: "PasswordResetRequest",
      entityId: id,
      details: `${action === "approve" ? "Approved" : "Denied"} the forgot-password request for ${row.email}`,
    });
    const user = await db.user.findUnique({ where: { email: row.email } });
    if (user) {
      await notify({
        userId: user.id,
        type: "PASSWORD_RESET_DECISION",
        severity: action === "approve" ? "INFO" : "WARNING",
        title: action === "approve" ? "Password reset approved" : "Password reset request denied",
        message:
          action === "approve"
            ? "Your password reset was approved. On the login screen choose Forgot password, enter this email and set your new password — this approval works once."
            : "Your password reset request was denied by the administrator. Contact the administrator if you still cannot sign in.",
        linkData: { view: "dashboard" },
        dedupeKey: `pwreset-decision:${id}`,
      });
    }
    return ok({ success: true, status: updated.status });
  });
}
