import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api-utils";
import { sendTestPush } from "@/lib/push";

/**
 * POST /api/push/test — send a REAL Web Push to the signed-in user's own
 * registered browsers and report the honest per-outcome result (accepted /
 * retried / failed per subscription). Never fakes success:
 *   - 401 without a session (requireUser)
 *   - 400 with { ok:false, message } when push is unconfigured, the account
 *     has no active subscription, or the push service refused the message.
 */
export async function POST(_req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const result = await sendTestPush(me.id);
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    return ok({ ok: true, message: result.message, outcomes: result.outcomes });
  });
}
