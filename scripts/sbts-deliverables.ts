// SBTS handover deliverables — seed the shared database with the bytes of the
// two handover files so EVERY deployment (including production hosts whose
// filesystem has no download/ directory) serves identical, up-to-date copies.
//   bun scripts/sbts-deliverables.ts
//
// Re-run after regenerating either file in download/ to refresh the DB copy.
import { readFileSync } from "fs";
import { createHash } from "crypto";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const { PrismaClient } = await import("@prisma/client");

const FILES = [
  { name: "handover-pdf", path: "/home/z/my-project/download/SBTS_integration_handover_v1.pdf", mime: "application/pdf" },
  { name: "roster-xlsx", path: "/home/z/my-project/download/kallmania_media_agents_roster.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
];

const db = new PrismaClient();
try {
  for (const f of FILES) {
    const bytes = readFileSync(f.path);
    const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    await db.sbtsDeliverable.upsert({
      where: { name: f.name },
      update: { mimeType: f.mime, bytes, sizeBytes: bytes.byteLength },
      create: { name: f.name, mimeType: f.mime, bytes, sizeBytes: bytes.byteLength },
    });
    console.log(`SEEDED ${f.name}: ${bytes.byteLength} bytes  sha256:${sha}…  from ${f.path}`);
  }
} finally {
  await db.$disconnect();
}
