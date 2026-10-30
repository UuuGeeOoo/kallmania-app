import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { namedRecipients } from "@/lib/escalations";

/**
 * GET /api/escalations/recipients — everything the escalation composer
 * offers, resolved LIVE from user records (never hardcoded):
 *   - teamLead:    the team lead of the requester's team (centre-scoped,
 *                  dynamic — leadership changes are reflected immediately)
 *   - teamLeads:   ALL active team leads across EVERY centre — populated for
 *                  ADMIN authors only, so the admin escalation view shows the
 *                  leaders of other centres too
 *   - supervisors: every eligible supervisor of the requester's centre
 *                  (centres with multiple supervisors all appear); for ADMIN
 *                  authors, every supervisor of EVERY centre
 *   - admins:      every eligible administrator
 * Each person carries country/state so cross-centre names can be labelled
 * with their centre. Inactive / unauthorized users are never returned.
 */
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const groups = await namedRecipients(me);
    return ok(groups);
  });
}
