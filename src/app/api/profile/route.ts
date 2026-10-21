import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api-utils";
import { audit } from "@/lib/notify";

const PUBLIC_PROFILE = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  department: true,
  team: true,
  employeeId: true,
  phone: true,
  country: true,
  state: true,
  city: true,
  status: true,
  createdAt: true,
  approvedAt: true,
};

/** GET — the signed-in user's own profile. */
export async function GET() {
  return handle(async () => {
    const me = await requireUser();
    const profile = await db.user.findUnique({ where: { id: me.id }, select: PUBLIC_PROFILE });
    if (!profile) return fail("User not found", 404);
    return ok({ profile });
  });
}

/** PATCH — self-service edits: fullName, employeeId, phone, country/state + optional password change.
 *  Role, department, team and email stay administrator-controlled. */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { fullName, phone, country, state, city, employeeId, currentPassword, newPassword } = body;

    const data: Record<string, unknown> = {};

    if (fullName !== undefined) {
      const name = String(fullName).trim();
      if (name.length < 2) return fail("Full name must be at least 2 characters");
      data.fullName = name;
    }
    if (phone !== undefined) {
      const p = String(phone).trim();
      if (p && !/^[+0-9()\-\s]{6,20}$/.test(p)) return fail("Phone number looks invalid");
      data.phone = p || null;
    }
    if (country !== undefined) {
      const c = String(country || "").trim().toUpperCase();
      if (c && !/^[A-Z]{2}$/.test(c)) return fail("Invalid country selection");
      data.country = c || null;
      if (!c) data.state = null; // clearing country clears the region too
    }
    if (state !== undefined) {
      const s = String(state || "").trim();
      if (s) {
        const effectiveCountry = data.country !== undefined ? (data.country as string | null) : me.country;
        if (!effectiveCountry) return fail("Select a country before choosing a state/region");
        if (s.length > 100) return fail("State/region name too long");
      }
      data.state = s || null;
    }
    if (employeeId !== undefined) {
      const eid = String(employeeId).trim();
      if (eid.length > 40) return fail("Employee ID looks too long (max 40 characters)");
      data.employeeId = eid || null;
    }
    if (city !== undefined) {
      const c = String(city || "").trim();
      if (c.length > 100) return fail("City name too long");
      data.city = c || null;
    }

    let passwordChanged = false;
    if (newPassword) {
      if (!currentPassword) return fail("Enter your current password to set a new one");
      if (String(newPassword).length < 6) return fail("New password must be at least 6 characters");
      const dbUser = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
      if (!dbUser) return fail("User not found", 404);
      const valid = await verifyPassword(String(currentPassword), dbUser.passwordHash);
      if (!valid) return fail("Current password is incorrect", 403);
      data.passwordHash = await hashPassword(String(newPassword));
      passwordChanged = true;
    }

    if (Object.keys(data).length === 0) return fail("Nothing to update");

    const before = await db.user.findUnique({ where: { id: me.id }, select: { fullName: true, phone: true, employeeId: true, country: true, state: true } });
    const updated = await db.user.update({ where: { id: me.id }, data, select: PUBLIC_PROFILE });
    const changes = [
      ...(data.fullName !== undefined && before && before.fullName !== updated.fullName ? ["name"] : []),
      ...(data.employeeId !== undefined && before && before.employeeId !== updated.employeeId ? ["employee ID"] : []),
      ...(data.phone !== undefined && before && before.phone !== updated.phone ? ["phone"] : []),
      ...((data.country !== undefined || data.state !== undefined) && before && (before.country !== updated.country || before.state !== updated.state) ? ["location"] : []),
      ...(passwordChanged ? ["password"] : []),
    ].join(", ");
    await audit({
      userId: me.id,
      actorName: updated.fullName,
      action: "PROFILE_UPDATE",
      entity: "User",
      entityId: me.id,
      details: `Self-service update: ${changes}`,
    });
    return ok({ profile: updated, passwordChanged, message: passwordChanged ? "Profile and password updated." : "Profile updated." });
  });
}
