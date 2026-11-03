/**
 * Generate signed, expiring download links for the SBTS handover pack.
 *
 *   bun scripts/sbts-handover-links.ts [days] [base-url]
 *
 *   days      — link validity in days (default 7)
 *   base-url  — absolute origin to prefix (default: the production host)
 *
 * The signature is HMAC-SHA256(secret, "handover:v1:<file>:<exp>") where the
 * secret lives in the shared database (SystemFlag "handover:signing-secret")
 * — the SAME secret /api/sbts/handover verifies against, so a link generated
 * here works on every deployment that shares the DB (sandbox preview and the
 * production host), with no login required. Expired or tampered links fall
 * back to the administrator-session gate.
 */
import { createHmac } from "crypto";
import { db } from "../src/lib/db";
import { getHandoverSigningSecret, signHandoverToken } from "../src/lib/handover-token";

const DEFAULT_BASE = "https://kallmaniareportingcentre.space-z.ai";

async function main() {
  const days = Math.max(1, Number(process.argv[2] || 7) || 7);
  const base = (process.argv[3] || DEFAULT_BASE).replace(/\/+$/, "");
  const exp = Math.floor(Date.now() / 1000) + days * 86400;

  const secret = await getHandoverSigningSecret();
  const expiresAt = new Date(exp * 1000).toISOString();

  console.log(`Signing secret: SystemFlag("handover:signing-secret") — ${secret.slice(0, 8)}… (lives in the shared DB)`);
  console.log(`Valid for ${days} day(s) — expires ${expiresAt}`);
  console.log("");
  for (const file of ["pdf", "xlsx"]) {
    const sig = signHandoverToken(secret, file, exp);
    const path = `/api/sbts/handover?file=${file}&exp=${exp}&sig=${sig}`;
    console.log(`[PDF ] ${base}${path}`);
    console.log(`[XLSX] ${base}${path.replace("file=pdf", "file=xlsx")}`);
    console.log(`[rel ] ${path}  (same host as the app)`);
    console.log("");
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
