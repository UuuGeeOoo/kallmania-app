import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit, notify } from "@/lib/notify";
import { hashPassword } from "@/lib/auth";

/** List users — admins see all; supervisors see their department staff. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    // Supervisors/Admins oversee all departments; dept filter only for non-management supervisors
    if (me.role === "SUPERVISOR" && me.department !== "MANAGEMENT") where.department = me.department;
    const users = await db.user.findMany({
      where,
      select: {
        id: true, email: true, fullName: true, role: true, department: true, team: true,
        employeeId: true, phone: true, status: true, createdAt: true, approvedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ users });
  });
}

/** Admin actions: approve / reject / suspend / reactivate / change role / reset password / delete */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const body = await req.json();
    const { userId, action, role, department, team, newPassword } = body;
    if (!userId || !action) return fail("userId and action are required");
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return fail("User not found", 404);

    switch (action) {
      case "approve": {
        await db.user.update({ where: { id: userId }, data: { status: "APPROVED", approvedAt: new Date(), approvedById: admin.id } });
        await notify({ userId, type: "ACCOUNT_APPROVED", severity: "INFO", title: "Account confirmed", message: `Welcome ${user.fullName}! Your account has been confirmed by the administrator. You can now sign in.`, dedupeKey: `approved:${userId}` });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "APPROVE_USER", entity: "User", entityId: userId, details: `Approved ${user.email}` });
        return ok({ success: true });
      }
      case "reject": {
        await db.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "REJECT_USER", entity: "User", entityId: userId, details: `Rejected ${user.email}` });
        return ok({ success: true });
      }
      case "suspend": {
        await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "SUSPEND_USER", entity: "User", entityId: userId, details: `Suspended ${user.email}` });
        return ok({ success: true });
      }
      case "reactivate": {
        await db.user.update({ where: { id: userId }, data: { status: "APPROVED" } });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "REACTIVATE_USER", entity: "User", entityId: userId, details: `Reactivated ${user.email}` });
        return ok({ success: true });
      }
      case "changeRole": {
        if (!role) return fail("role is required");
        const { ROLE_META, TEAM_META } = await import("@/lib/auth");
        if (!ROLE_META[role]) return fail("Invalid role");
        if (team && !TEAM_META[team]) return fail("Invalid team");
        const effectiveTeam = ["SUPERVISOR", "ADMIN"].includes(role) ? null : (team !== undefined ? team : user.team);
        const dept = department || (effectiveTeam && TEAM_META[effectiveTeam] ? TEAM_META[effectiveTeam].department : ROLE_META[role].department);
        await db.user.update({
          where: { id: userId },
          data: {
            role,
            department: dept,
            team: effectiveTeam,
          },
        });
        await notify({ userId, type: "ROLE_CHANGED", severity: "INFO", title: "Your role was updated", message: `Your role is now: ${ROLE_META[role].label}.${team && !['SUPERVISOR','ADMIN'].includes(role) ? ` Team: ${TEAM_META[team]?.label || team}.` : ""}`, dedupeKey: `role:${userId}:${role}:${team || "x"}` });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "CHANGE_ROLE", entity: "User", entityId: userId, details: `${user.email} → ${role}${team && !['SUPERVISOR','ADMIN'].includes(role) ? ` (${team})` : ""}` });
        return ok({ success: true });
      }
      case "resetPassword": {
        if (!newPassword || String(newPassword).length < 6) return fail("New password must be at least 6 characters");
        await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(String(newPassword)) } });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "RESET_PASSWORD", entity: "User", entityId: userId, details: `Password reset for ${user.email}` });
        return ok({ success: true });
      }
      case "setLeave": {
        const { date, onLeave } = body;
        if (!date) return fail("date is required");
        const key = `leave:${userId}:${date}`;
        if (onLeave) {
          await db.systemFlag.upsert({ where: { key }, create: { key, value: "approved-leave" }, update: { value: "approved-leave" } });
        } else {
          await db.systemFlag.deleteMany({ where: { key } });
        }
        await audit({ userId: admin.id, actorName: admin.fullName, action: "SET_LEAVE", entity: "User", entityId: userId, details: `${user.email} leave ${date} = ${onLeave}` });
        return ok({ success: true });
      }
      case "delete": {
        if (user.role === "ADMIN") return fail("Cannot delete an administrator account");
        const reportCount = await db.report.count({ where: { userId } });
        if (reportCount > 0) {
          // Preserve report history — suspend instead of hard delete
          await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
          await audit({ userId: admin.id, actorName: admin.fullName, action: "SOFT_DELETE_USER", entity: "User", entityId: userId, details: `${user.email} has ${reportCount} reports — suspended to preserve history` });
          return ok({ success: true, softDeleted: true, message: "User has report history — account suspended to preserve records." });
        }
        await db.user.delete({ where: { id: userId } });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "DELETE_USER", entity: "User", entityId: userId, details: `Deleted ${user.email}` });
        return ok({ success: true });
      }
      default:
        return fail("Unknown action");
    }
  });
}
