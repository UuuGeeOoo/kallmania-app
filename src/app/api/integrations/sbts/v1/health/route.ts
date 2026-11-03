import { db } from "@/lib/db";
import { ok } from "@/lib/api-utils";
import { SBTS_PROTOCOL_VERSION } from "@/lib/integrations/sbts";

/**
 * SBTS ingest pipe health — GET /api/integrations/sbts/v1/health
 * Unauthenticated (it exists for the Media Command Centre's uptime monitor).
 * status:"ok" while the service answers and the database is reachable;
 * "degraded" (503) if the database check fails.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return ok({
      status: "ok",
      service: "sbts-ingest",
      version: SBTS_PROTOCOL_VERSION,
      time: new Date().toISOString(),
    });
  } catch {
    return ok({ status: "degraded", service: "sbts-ingest", version: SBTS_PROTOCOL_VERSION, time: new Date().toISOString() }, 503);
  }
}
