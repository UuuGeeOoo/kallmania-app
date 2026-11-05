// Post-recycle check: SBTS credential status + deliverable rows + signing secret.
import { readFileSync } from "fs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

const rows = await db.sbtsDeliverable.findMany({ select: { name: true, sizeBytes: true, updatedAt: true } });
for (const r of rows) console.log("deliverable:", r.name, r.sizeBytes, "bytes");
if (!rows.length) console.log("NO DELIVERABLE ROWS — regeneration needed");

const flags = await db.$queryRawUnsafe<any[]>(`SELECT key FROM "SystemFlag" WHERE key LIKE 'handover%'`);
for (const f of flags) console.log("flag:", f.key);

const cred = await db.sbtsCredential.findMany({ select: { status: true, keyHint: true, rotatedAt: true }, orderBy: { createdAt: "desc" }, take: 3 });
for (const c of cred) console.log("credential:", c.status, c.keyHint, c.rotatedAt);

await db.$disconnect();
