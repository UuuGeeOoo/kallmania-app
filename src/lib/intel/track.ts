import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TRACKING — server-side instrumentation for the Operational
// Intelligence module. Records meaningful operational events (never passwords,
// message contents, or other sensitive material). Failures are logged and
// swallowed so tracking can never break an operational workflow.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "LOGIN"
  | "REPORT_CREATED"
  | "REPORT_DRAFT_SAVED"
  | "REPORT_SUBMITTED"
  | "REPORT_UPDATED"
  | "REPORT_REVIEWED"
  | "TASK_STATUS_CHANGED"
  | "TASK_COMPLETED"
  | "ESCALATION_RAISED"
  | "ESCALATION_REPLIED"
  | "ESCALATION_RESOLVED"
  | "UPLOAD_UPLOADED"
  | "UPLOAD_CONFIRMED";

export async function trackActivity(input: {
  userId: string;
  eventType: ActivityEventType;
  relatedType?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
  /** Caller-provided centre/team snapshot (avoids an extra query). */
  centre?: { country: string | null; state: string | null; team: string | null };
}): Promise<void> {
  try {
    let centre = input.centre ?? null;
    if (!centre) {
      const u = await db.user.findUnique({ where: { id: input.userId }, select: { country: true, state: true, team: true } });
      centre = u ?? { country: null, state: null, team: null };
    }
    await db.activityEvent.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        centreCountry: centre.country,
        centreState: centre.state,
        team: centre.team,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (e) {
    console.error("trackActivity error:", e);
  }
}
