import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Durable DATABASE_URL guard — DO NOT REMOVE.
//
// Kallmania runs on Supabase Postgres, but the hosting platform has repeatedly
// (a) wiped .env during workspace syncs and (b) exported a local SQLite URL
// ("file:/home/z/my-project/db/custom.db") into the process environment of both
// the dev server and the deployed standalone build. Environment files cannot be
// trusted, and @next/env never overrides existing process.env values — so the
// only bulletproof place to fix the URL is here, in code, BEFORE the Prisma
// client is instantiated. Every API route imports this module, so the guard
// runs on every server path (dev + production standalone).
//
// Resolution order:
//   1. process.env.DATABASE_URL — kept if it is already a valid postgres URL
//      (e.g. provided by the platform at deploy time, or loaded from .env).
//   2. process.env.KALLMANIA_DATABASE_URL — legacy pinned-URL escape hatch.
//   3. KALLMANIA_FALLBACK_DATABASE_URL below — committed last-resort constant
//      (private repo) so the app self-heals even when every env source is lost.
//      If the Supabase credentials ever rotate, update .env first; this constant
//      is only used when no valid URL can be found anywhere else.
// ─────────────────────────────────────────────────────────────────────────────

const KALLMANIA_FALLBACK_DATABASE_URL =
  'postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs&connection_limit=5&pool_timeout=20'

function ensureDatabaseUrl(): void {
  const current = process.env.DATABASE_URL || ''
  if (current.startsWith('postgresql://') || current.startsWith('postgres://')) return

  if (process.env.KALLMANIA_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.KALLMANIA_DATABASE_URL
    return
  }
  process.env.DATABASE_URL = KALLMANIA_FALLBACK_DATABASE_URL
}

ensureDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
