// SBTS Media Command Centre — credential operations (run on the server).
//   bun scripts/sbts-credentials.ts status
//   bun scripts/sbts-credentials.ts create
//   bun scripts/sbts-credentials.ts rotate [graceHours]   (default 24)
//
// The API key and HMAC secret are printed EXACTLY ONCE — the key is stored
// only as a sha256 hash, the secret is needed server-side for signature
// verification. Send both to the Command Centre over a secure channel.
import { readFileSync } from "fs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const { PrismaClient } = await import("@prisma/client");
const { createSbtsCredential, rotateSbtsCredential, sha256Hex } = await import("../src/lib/integrations/sbts");

const db = new PrismaClient();
const cmd = process.argv[2] ?? "status";

async function main() {
  if (cmd === "create") {
    const material = await createSbtsCredential();
    console.log("─".repeat(60));
    console.log("NEW SBTS CREDENTIAL (shown once — copy now):");
    console.log(`  API key:     ${material.key}`);
    console.log(`  HMAC secret: ${material.secret}`);
    console.log("─".repeat(60));
  } else if (cmd === "rotate") {
    const graceHours = Number(process.argv[3] ?? "24");
    const material = await rotateSbtsCredential(Number.isFinite(graceHours) ? graceHours : 24);
    console.log("─".repeat(60));
    console.log(`ROTATED — previous key ${graceHours > 0 ? `keeps verifying for ${graceHours}h (grace)` : "revoked immediately"}`);
    console.log("NEW SBTS CREDENTIAL (shown once — copy now):");
    console.log(`  API key:     ${material.key}`);
    console.log(`  HMAC secret: ${material.secret}`);
    console.log("─".repeat(60));
  } else {
    const creds = await db.sbtsCredential.findMany({ orderBy: { createdAt: "desc" } });
    console.log(`SBTS credentials: ${creds.length}`);
    for (const c of creds) {
      const state = c.active ? "ACTIVE" : c.graceUntil && c.graceUntil > new Date() ? "GRACE (still verifying)" : "REVOKED";
      console.log(`  ${c.keyHint}  ${state}  created ${c.createdAt.toISOString()}${c.graceUntil ? `  graceUntil ${c.graceUntil.toISOString()}` : ""}`);
    }
    const events = await db.sbtsEvent.count();
    const last = await db.sbtsEvent.findFirst({ orderBy: { receivedAt: "desc" }, select: { receivedAt: true, type: true } });
    console.log(`Stored events: ${events}${last ? `  last: ${last.type} at ${last.receivedAt.toISOString()}` : ""}`);
    // sanity: verify the sha256 helper is loadable (guards broken imports)
    void sha256Hex("probe");
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
