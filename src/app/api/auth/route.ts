import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getCurrentUser, ROLE_META, TEAM_META, resolveRegistration } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    return ok({ user });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json();
    const action = body.action as string;

    // ── REGISTRATION ──────────────────────────────────────────
    if (action === "register") {
      const { email, password, fullName, role, department, team, position, employeeId, phone, country, state, city, employmentType } = body;
      if (!email || !password || !fullName) return fail("Email, password and full name are required");
      if (String(password).length < 6) return fail("Password must be at least 6 characters");
      const { isEmploymentType } = await import("@/lib/schedule");
      if (employmentType !== undefined && employmentType !== "" && !isEmploymentType(employmentType))
        return fail("Employment type must be Full-time or Part-time");

      // New hierarchy: BPO division → team → position. Legacy direct role picks still accepted.
      let resolved: { role: string; department: string; team: string | null } | null = null;
      if (team || position) {
        if (team && !TEAM_META[team]) return fail("Invalid team selection");
        if (position && !["AGENT", "TEAM_LEAD", "SUPERVISOR"].includes(position)) return fail("Invalid position selection");
        if (position === "TEAM_LEAD" && !team) return fail("Team Leads must choose the team they lead");
        resolved = resolveRegistration(team, position);
        if (!resolved) return fail("Select where you fall in under the BPO division");
      } else {
        const validRoles = ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "SUPERVISOR"];
        if (!role || !validRoles.includes(role)) return fail("Select where you fall in under the BPO division");
        resolved = { role, department: department || ROLE_META[role]?.department || "BPO", team: null };
      }
      const emailNorm = String(email).trim().toLowerCase();
      const existing = await db.user.findUnique({ where: { email: emailNorm } });
      if (existing) return fail("An account with this email already exists. Please sign in or contact the administrator.");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailNorm)) return fail("Please enter a valid email address");
      if (country && !/^[A-Z]{2}$/.test(String(country))) return fail("Invalid country selection");
      const passwordHash = await hashPassword(String(password));
      const user = await db.user.create({
        data: {
          email: emailNorm,
          passwordHash,
          fullName: String(fullName).trim(),
          role: resolved.role,
          department: resolved.department,
          team: resolved.team,
          employeeId: employeeId ? String(employeeId).trim() : null,
          phone: phone ? String(phone).trim() : null,
          employmentType: isEmploymentType(employmentType) ? employmentType : "FULL_TIME",
          country: country ? String(country) : null,
          state: state ? String(state).trim().slice(0, 80) : null,
          city: city ? String(city).trim().slice(0, 80) : null,
          status: "PENDING",
        },
      });
      const chosenLabel = team
        ? `${TEAM_META[team]?.label || team}${position === "TEAM_LEAD" ? " — Team Lead" : position === "SUPERVISOR" ? " — Supervisor" : " — Agent"}`
        : resolved.role;
      await audit({ userId: user.id, actorName: user.fullName, action: "REGISTER", entity: "User", entityId: user.id, details: `Self-registration as ${chosenLabel}, awaiting admin confirmation` });
      // Notify admins
      const admins = await db.user.findMany({ where: { role: "ADMIN", status: "APPROVED" } });
      const { notify } = await import("@/lib/notify");
      for (const a of admins) {
        await notify({
          userId: a.id,
          type: "USER_PENDING_APPROVAL",
          severity: "INFO",
          title: "New registration awaiting confirmation",
          message: `${user.fullName} (${emailNorm}) registered as ${ROLE_META[resolved.role]?.label || resolved.role}${team ? ` · ${TEAM_META[team]?.label || team}` : ""} and needs confirmation.`,
          linkData: { view: "admin-users" },
        });
      }
      return ok({ success: true, message: "Registration submitted. An administrator will confirm your login and role." }, 201);
    }

    // ── LOGIN ─────────────────────────────────────────────────
    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) return fail("Email and password are required");
      const user = await db.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
      if (!user) return fail("Invalid email or password", 401);
      const valid = await verifyPassword(String(password), user.passwordHash);
      if (!valid) return fail("Invalid email or password", 401);
      if (user.status === "PENDING") return fail("Your account is awaiting administrator confirmation. You will be able to sign in once approved.", 403);
      if (user.status === "REJECTED") return fail("Your registration was not approved. Please contact the administrator.", 403);
      if (user.status === "SUSPENDED") return fail("Your account has been suspended. Please contact the administrator.", 403);
      await setSessionCookie(user.id);
      await audit({ userId: user.id, actorName: user.fullName, action: "LOGIN", entity: "User", entityId: user.id });
      return ok({ success: true });
    }

    // ── LOGOUT ────────────────────────────────────────────────
    if (action === "logout") {
      const current = await getCurrentUser();
      if (current) await audit({ userId: current.id, actorName: current.fullName, action: "LOGOUT", entity: "User", entityId: current.id });
      await clearSessionCookie();
      return ok({ success: true });
    }

    // ── CHANGE PASSWORD (self) ────────────────────────────────
    if (action === "changePassword") {
      const current = await getCurrentUser();
      if (!current) return fail("Not authenticated", 401);
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) return fail("Current and new password are required");
      if (String(newPassword).length < 6) return fail("New password must be at least 6 characters");
      const dbUser = await db.user.findUnique({ where: { id: current.id } });
      if (!dbUser) return fail("User not found", 404);
      const valid = await verifyPassword(String(currentPassword), dbUser.passwordHash);
      if (!valid) return fail("Current password is incorrect", 403);
      await db.user.update({ where: { id: current.id }, data: { passwordHash: await hashPassword(String(newPassword)) } });
      await audit({ userId: current.id, actorName: current.fullName, action: "CHANGE_PASSWORD", entity: "User", entityId: current.id });
      return ok({ success: true });
    }

    return fail("Unknown action");
  });
}
