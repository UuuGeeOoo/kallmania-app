import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

// ── Signed, expiring handover download links ────────────────────────────────
// The handover pack carries live integration credentials, so it must not be a
// public static asset — but the social media team has no admin accounts, so a
// bare "sign in as admin first" gate kept producing cryptic failed downloads.
// The compromise: the administrator shares a LINK that is itself the proof.
// Each link carries ?exp=<unix>&sig=<hex> where sig = HMAC-SHA256(secret,
// "handover:v1:<file>:<exp>"). The signature is bound to the exact file key
// and expiry, so it cannot be reused for another file or past its expiry.
//
// The signing secret lives in the shared DATABASE (SystemFlag), not in env:
// the sandbox preview and the production host share the same Supabase DB, so
// a link generated anywhere verifies on both — with zero extra configuration.

const SECRET_KEY = "handover:signing-secret";

/** Get — or lazily mint — the shared signing secret from the database. */
export async function getHandoverSigningSecret(): Promise<string> {
  const row = await db.systemFlag.findUnique({ where: { key: SECRET_KEY } });
  if (row?.value) return row.value;
  const value = randomBytes(32).toString("hex");
  // upsert: concurrent first requests must not fight over the row
  await db.systemFlag.upsert({ where: { key: SECRET_KEY }, create: { key: SECRET_KEY, value }, update: {} });
  return value;
}

export function signHandoverToken(secret: string, file: string, exp: number): string {
  return createHmac("sha256", secret).update(`handover:v1:${file}:${exp}`).digest("hex");
}

/** Constant-time verification of a signed, expiring download token. */
export function verifyHandoverToken(secret: string, file: string, exp: string | null, sig: string | null): boolean {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isSafeInteger(expNum) || expNum <= 0) return false;
  if (expNum * 1000 < Date.now()) return false; // expired
  const expected = Buffer.from(signHandoverToken(secret, file, expNum), "hex");
  const provided = /^[0-9a-f]+$/i.test(sig) ? Buffer.from(sig, "hex") : Buffer.alloc(0);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
