import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "kallmania-sbts-group-secret-key-2026"
);
const COOKIE_NAME = "kallmania_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  employeeId: string | null;
  status: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    employeeId: user.employeeId,
    status: user.status,
  };
}

/** Requires an APPROVED, non-suspended user. Throws Response-like errors via null return handled by caller. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not authenticated", 401);
  if (user.status !== "APPROVED") throw new AuthError("Account not approved", 403);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Admin access required", 403);
  return user;
}

export async function requireSupervisorOrAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPERVISOR" && user.role !== "ADMIN")
    throw new AuthError("Supervisor access required", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

export function isSupervisorLike(user: SessionUser): boolean {
  return user.role === "SUPERVISOR" || user.role === "ADMIN";
}

export const ROLE_META: Record<string, { label: string; department: string }> = {
  ADMIN: { label: "Administrator", department: "MANAGEMENT" },
  SUPERVISOR: { label: "Supervisor / Team Lead", department: "MANAGEMENT" },
  AGENT_BPO: { label: "BPO / Outbound Call Centre Agent", department: "BPO" },
  DEVELOPER: { label: "Web Development & Technical", department: "WEB_DEV" },
  SOCIAL_MEDIA: { label: "Social Media Team", department: "SOCIAL_MEDIA" },
};

export const DEPARTMENT_META: Record<string, { label: string }> = {
  BPO: { label: "BPO & Outbound Call Centre" },
  WEB_DEV: { label: "Web Development & Technical" },
  SOCIAL_MEDIA: { label: "Social Media" },
  MANAGEMENT: { label: "Management & Supervision" },
};
