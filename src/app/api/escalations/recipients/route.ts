import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { namedRecipients } from "@/lib/escalations";

/**
 * GET /api/escalations/recipients — the ACTUAL people the requester may
 * escalate to, resolved live from user records (never hardcoded):
 *   - teamLead:    the team lead of the requester's team (centre-scoped, dynamic —
 *                  leadership changes are reflected immediately)
 *   - supervisors: every eligible supervisor of the requester's centre
 *                  (centres with multiple supervisors all appear)
 *   - admins:      every eligible administrator
 * Inactive / unauthorized users are never returned.
 */
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const groups = await namedRecipients(me);
    return ok(groups);
  });
}
