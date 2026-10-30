import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { namedRecipients, roleTargetOptions } from "@/lib/escalations";

/**
 * GET /api/escalations/recipients — everything the composer offers, resolved
 * LIVE from user records (never hardcoded):
 *   - teamLead:    the team lead of the requester's team (centre-scoped, dynamic —
 *                  leadership changes are reflected immediately)
 *   - supervisors: every eligible supervisor of the requester's centre
 *                  (centres with multiple supervisors all appear)
 *   - admins:      every eligible administrator
 *   - roles:       ROLE-targeting options for management — every targetable
 *                  role that currently has active occupants, with live counts
 *                  and scope ("all centres" for administrators — they can
 *                  escalate to everyone occupying a role in all centres —
 *                  "your centre" for supervisors/team leads)
 * Inactive / unauthorized users are never returned.
 */
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const [groups, roles] = await Promise.all([namedRecipients(me), roleTargetOptions(me)]);
    return ok({ ...groups, roles });
  });
}
