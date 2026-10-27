import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth";

/**
 * One-time passcode engine (stored on Supabase Postgres via Prisma `OtpToken`).
 *
 * Purposes:
 *  - REGISTER        — account creation: issued right after a new user registers
 *  - PASSWORD_RESET  — forgotten password: issued by the "forgot password" flow
 * Login intentionally does NOT use OTP (direct email + password session).
 */

export type OtpPurpose = "REGISTER" | "PASSWORD_RESET";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // wrong-code attempts before the challenge is exhausted
const SEND_WINDOW_MS = 15 * 60 * 1000; // rolling send-rate window
const SEND_CAPS: Record<OtpPurpose, number> = {
  REGISTER: 3, // initial send + 2 resends per 15 min
  PASSWORD_RESET: 3, // initial send + 2 resends per 15 min
};

export function isOtpPurpose(v: string): v is OtpPurpose {
  return v === "REGISTER" || v === "PASSWORD_RESET";
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}${domain}`;
}

/** Deliver the code. Seam for real email: set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS. */
function deliverCode(email: string, code: string, purpose: OtpPurpose) {
  // TODO production: send via SMTP (nodemailer) when SMTP_HOST is configured.
  console.log(`[OTP] ${purpose} code for ${email}: ${code} (valid 10 minutes)`);
}

export const isDemoDelivery = !process.env.SMTP_HOST;

async function countRecentSends(email: string, purpose: OtpPurpose): Promise<number> {
  return db.otpToken.count({
    where: { email, purpose, createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) } },
  });
}

/** Invalidate any live challenge for this email+purpose so only the newest code works. */
async function voidLiveChallenges(email: string, purpose?: OtpPurpose) {
  await db.otpToken.updateMany({
    where: {
      email,
      ...(purpose ? { purpose } : {}),
      status: { in: ["PENDING", "VERIFIED"] },
    },
    data: { status: "CONSUMED" },
  });
}

export interface OtpChallenge {
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
  /** Only present in demo delivery (no SMTP configured) so the sandbox UI can show the code. */
  previewCode?: string;
  resent?: boolean;
}

export async function issueOtp(
  emailRaw: string,
  purpose: OtpPurpose,
  { resend = false } = {}
): Promise<OtpChallenge> {
  const email = emailRaw.trim().toLowerCase();
  const cap = SEND_CAPS[purpose];
  const recent = await countRecentSends(email, purpose);
  if (recent >= cap) {
    const waitMin = Math.ceil(SEND_WINDOW_MS / 60000);
    throw new AuthError(
      `Too many codes requested for this email. Please try again in ${waitMin} minutes.`,
      429
    );
  }

  await voidLiveChallenges(email, purpose);

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const token = await db.otpToken.create({
    data: {
      email,
      codeHash,
      purpose,
      status: "PENDING",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  deliverCode(email, code, purpose);

  return {
    challengeId: token.id,
    maskedEmail: maskEmail(email),
    expiresAt: token.expiresAt.toISOString(),
    ...(isDemoDelivery ? { previewCode: code } : {}),
    ...(resend ? { resent: true } : {}),
  };
}

/** Look up a challenge (for resend). Throws if unknown. */
export async function getChallengeInfo(challengeId: string): Promise<{ email: string; purpose: OtpPurpose }> {
  const token = await db.otpToken.findUnique({ where: { id: challengeId } });
  if (!token || !isOtpPurpose(token.purpose)) {
    throw new AuthError("Invalid or expired verification session", 400);
  }
  return { email: token.email, purpose: token.purpose };
}

/**
 * Verify a code. With consume=true the challenge is finished (registration);
 * with consume=false it stays VERIFIED for a second step (password reset).
 * Throws AuthError with a user-safe message on any failure path.
 */
export async function verifyOtpChallenge(
  challengeId: string,
  codeRaw: string,
  purpose: OtpPurpose,
  { consume = false } = {}
): Promise<{ email: string }> {
  const token = await db.otpToken.findUnique({ where: { id: challengeId } });
  if (!token || token.purpose !== purpose) {
    throw new AuthError("Invalid or expired verification session", 400);
  }
  if (token.status === "EXHAUSTED") {
    throw new AuthError("Too many incorrect attempts. Please request a new code.", 400);
  }
  if (token.status === "CONSUMED") {
    throw new AuthError("This verification session has already been used. Please start again.", 400);
  }
  if (token.expiresAt.getTime() < Date.now()) {
    throw new AuthError("This code has expired. Please request a new one.", 400);
  }
  if (token.attempts >= MAX_ATTEMPTS) {
    await db.otpToken.update({ where: { id: token.id }, data: { status: "EXHAUSTED" } });
    throw new AuthError("Too many incorrect attempts. Please request a new code.", 400);
  }

  const code = String(codeRaw ?? "").trim();
  const valid = /^\d{6}$/.test(code) && (await bcrypt.compare(code, token.codeHash));
  if (!valid) {
    const attempts = token.attempts + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    await db.otpToken.update({
      where: { id: token.id },
      data: { attempts, ...(exhausted ? { status: "EXHAUSTED" } : {}) },
    });
    const remaining = MAX_ATTEMPTS - attempts;
    throw new AuthError(
      exhausted
        ? "Too many incorrect attempts. Please request a new code."
        : `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      400
    );
  }

  await db.otpToken.update({
    where: { id: token.id },
    data: { status: consume ? "CONSUMED" : "VERIFIED", verifiedAt: new Date() },
  });
  return { email: token.email };
}

/** Second step of the reset flow: the challenge must already be VERIFIED. */
export async function consumeVerifiedChallenge(
  challengeId: string,
  purpose: OtpPurpose
): Promise<{ email: string }> {
  const token = await db.otpToken.findUnique({ where: { id: challengeId } });
  if (!token || token.purpose !== purpose) {
    throw new AuthError("Invalid or expired verification session", 400);
  }
  if (token.status === "EXHAUSTED") {
    throw new AuthError("Too many incorrect attempts. Please start again.", 400);
  }
  if (token.status === "CONSUMED") {
    throw new AuthError("This reset link has already been used. Please start again.", 400);
  }
  if (token.status !== "VERIFIED") {
    throw new AuthError("Please verify the code sent to your email first.", 400);
  }
  if (token.verifiedAt && token.verifiedAt.getTime() + OTP_TTL_MS < Date.now()) {
    throw new AuthError("This verification has expired. Please start again.", 400);
  }
  await db.otpToken.update({ where: { id: token.id }, data: { status: "CONSUMED" } });
  return { email: token.email };
}

/** After a successful password change, kill every live challenge for the email (all purposes). */
export async function voidAllChallenges(email: string) {
  await voidLiveChallenges(email);
}

/** Remove every OTP token for an email (used by tests / admin cleanup). */
export async function clearTokens(email: string) {
  await db.otpToken.deleteMany({ where: { email } });
}
