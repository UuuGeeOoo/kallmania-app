import { PrismaClient } from '@prisma/client'

// Kallmania runs on Supabase Postgres. The sandbox environment pre-sets a global
// DATABASE_URL (local SQLite file) which would silently win over .env, so the real
// connection string lives in KALLMANIA_DATABASE_URL and is promoted here — BEFORE
// the Prisma client is instantiated. Prisma CLI users must pass the URL explicitly
// (see .env comments).
if (process.env.KALLMANIA_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.KALLMANIA_DATABASE_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
