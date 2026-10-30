/**
 * One-time (idempotent) VAPID key setup for browser push notifications.
 *
 * Generates a REAL Web Push application server keypair and stores it in the
 * database SystemFlag table (`vapid:public` / `vapid:private` / `vapid:subject`)
 * so it survives the recurring .env wipes documented in worklog Task 43. ENV
 * vars (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT) always win over
 * the stored values when present.
 *
 * The private key is written to the DB, never printed. Run with the app's
 * DATABASE_URL:
 *   cd /home/z/my-project && DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' .env) bun run scripts/setup-vapid.ts
 */
import webpush from "web-push";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const existing = await db.systemFlag.findUnique({ where: { key: "vapid:public" } });
  const hasPrivate = await db.systemFlag.findUnique({ where: { key: "vapid:private" } });
  if (existing && hasPrivate) {
    console.log("VAPID keys already configured (SystemFlag vapid:public/vapid:private) — nothing to do.");
    console.log("Public key:", existing.value);
    return;
  }
  const keys = webpush.generateVAPIDKeys();
  const subject = process.env.VAPID_SUBJECT || "mailto:notifications@kallmania-app.local";
  await db.systemFlag.upsert({ where: { key: "vapid:public" }, update: { value: keys.publicKey }, create: { key: "vapid:public", value: keys.publicKey } });
  await db.systemFlag.upsert({ where: { key: "vapid:private" }, update: { value: keys.privateKey }, create: { key: "vapid:private", value: keys.privateKey } });
  await db.systemFlag.upsert({ where: { key: "vapid:subject" }, update: { value: subject }, create: { key: "vapid:subject", value: subject } });
  console.log("Generated and stored a new VAPID keypair in SystemFlag.");
  console.log("Public key (safe to serve to browsers):", keys.publicKey);
  console.log("Subject:", subject);
  console.log("Private key stored in DB (vapid:private) — never printed, never committed.");
}

main().finally(() => db.$disconnect());
