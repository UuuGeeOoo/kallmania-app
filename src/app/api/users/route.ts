import { NextRequest } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit, notify } from "@/lib/notify";
import { hashPassword } from "@/lib/auth";

const STORAGE_DIR = process.env.UPLOAD_STORAGE_DIR || "/home/z/my-project/uploads-storage";

/** List users — admins see all; supervisors see the staff of their centre (state). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const isManager = isSupervisorLike(me) || me.role === "TEAM_LEAD";
    if (!isManager) return fail("Supervisor access required", 403);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (me.role === "SUPERVISOR") {
      // State supervisors only see the staff registered in their centre.
      if (me.country && me.state) where.AND = [{ country: me.country }, { state: me.state }];
    } else if (me.role === "TEAM_LEAD") {
      // Team leads see the agents of their centre.
      if (me.country && me.state) where.AND = [{ country: me.country }, { state: me.state }];
      where.role = { in: ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"] };
    }
    const users = await db.user.findMany({
      where,
      select: {
        id: true, email: true, fullName: true, role: true, department: true, team: true,
        employeeId: true, phone: true, country: true, state: true, status: true, createdAt: true, approvedAt: true,
        employmentType: true, workDays: true, shiftStart: true, shiftEnd: true,
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ users: users.map(({ _count, ...u }) => ({ ...u, reportCount: _count.reports })) });
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
      case "setSchedule": {
        // Employment type + working days + shift hours (admin-controlled; weekend days included in the mask)
        const { employmentType, workDays, shiftStart, shiftEnd } = body;
        const { isEmploymentType, isValidWorkDays, isValidTime, shiftHours, describeSchedule } = await import("@/lib/schedule");
        if (!isEmploymentType(employmentType)) return fail("Employment type must be Full-time or Part-time");
        if (!isValidWorkDays(workDays)) return fail("Pick at least one working day (Mon–Sun)");
        if (!isValidTime(shiftStart) || !isValidTime(shiftEnd)) return fail("Shift hours must be valid 24h times (HH:MM)");
        const hrs = shiftHours(shiftStart, shiftEnd);
        if (hrs === null) return fail("Shift end must be after shift start");
        await db.user.update({ where: { id: userId }, data: { employmentType, workDays, shiftStart, shiftEnd } });
        const summary = describeSchedule({ employmentType, workDays, shiftStart, shiftEnd });
        await notify({ userId, type: "SCHEDULE_UPDATED", severity: "INFO", title: "Your work schedule was updated", message: `An administrator set your schedule to: ${summary}.`, dedupeKey: `schedule:${userId}:${workDays}:${shiftStart}:${shiftEnd}` });
        await audit({ userId: admin.id, actorName: admin.fullName, action: "SET_SCHEDULE", entity: "User", entityId: userId, details: `${user.email} → ${summary}` });
        return ok({ success: true, schedule: { employmentType, workDays, shiftStart, shiftEnd, summary } });
      }
      case "delete": {
        if (user.role === "ADMIN") return fail("Cannot delete an administrator account");
        const reportCount = await db.report.count({ where: { userId } });
        const userFiles = await db.uploadedFile.findMany({ where: { userId }, select: { storedName: true } });
        const sentEscalations = await db.escalation.findMany({ where: { fromId: userId }, select: { id: true } });
        // Permanently remove the account and every record tied to it — atomically.
        // Foreign-key children are cleared/re-pointed first so the delete can never fail
        // with a constraint violation (the old silent-failure bug).
        await db.$transaction([
          // Reports owned by the user
          db.report.deleteMany({ where: { userId } }),
          // Reports the user reviewed/approved — keep the reports, drop the reviewer link
          db.report.updateMany({ where: { reviewedById: userId }, data: { reviewedById: null } }),
          // Report templates the user last updated — keep templates, drop the link
          db.reportTemplate.updateMany({ where: { updatedById: userId }, data: { updatedById: null } }),
          // Notifications belong solely to the user
          db.notification.deleteMany({ where: { userId } }),
          // Inbox copies held by OTHERS that point at this user's escalations
          db.notification.deleteMany({ where: { OR: sentEscalations.map((e) => ({ linkData: { contains: e.id } })) } }),
          // Escalations the user sent belong solely to them
          db.escalation.deleteMany({ where: { fromId: userId } }),
          // Escalations targeted directly at the user — keep them, drop the link
          db.escalation.updateMany({ where: { targetUserId: userId }, data: { targetUserId: null, targetName: user.fullName } }),
          // Individual KPI configurations belong solely to the member
          db.memberKpiConfig.deleteMany({ where: { userId } }),
          // Uploaded-file records registered by the user
          db.uploadedFile.deleteMany({ where: { userId } }),
          // Audit trail stays readable (actorName preserved), link to deleted account severed
          db.auditLog.updateMany({ where: { userId }, data: { userId: null } }),
          // Tasks the user was assigned — keep the tasks, just unassign them
          db.task.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } }),
          // Multi-assignee task links (TaskAssignee) belong solely to the user
          db.taskAssignee.deleteMany({ where: { userId } }),
          // Notices the user authored stay up — keep the display name, drop the link
          db.notice.updateMany({ where: { authorId: userId }, data: { authorId: null, authorName: user.fullName } }),
          // Tasks the user created — hand ownership to the deleting admin so nothing is lost
          db.task.updateMany({ where: { createdById: userId }, data: { createdById: admin.id } }),
          db.user.delete({ where: { id: userId } }),
        ]);
        // Best-effort cleanup of the user's physical upload files (DB rows are already gone)
        await Promise.all(userFiles.map((f) => unlink(path.join(STORAGE_DIR, f.storedName)).catch(() => {})));
        await audit({ userId: admin.id, actorName: admin.fullName, action: "DELETE_USER", entity: "User", entityId: userId, details: `Permanently deleted ${user.email} — ${reportCount} report(s) removed, ${userFiles.length} upload(s) purged` });
        return ok({ success: true, deleted: true, message: `${user.fullName} was permanently deleted.` });
      }
      default:
        return fail("Unknown action");
    }
  });
}
