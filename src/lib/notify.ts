import { db } from "@/lib/db";

export interface NotifyInput {
  userId: string;
  type: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  linkData?: Record<string, unknown>;
  dedupeKey?: string | null;
}

/** Create a notification with dedup support. Dedupe key is scoped per-recipient. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        severity: input.severity || "INFO",
        title: input.title,
        message: input.message,
        linkData: input.linkData ? JSON.stringify(input.linkData) : null,
        dedupeKey: input.dedupeKey ? `${input.dedupeKey}#${input.userId}` : null,
      },
    });
  } catch (e: unknown) {
    // Unique constraint violation on dedupeKey → notification already sent. Safe to skip.
    const code = (e as { code?: string })?.code;
    if (code !== "P2002") console.error("notify error:", e);
  }
}

/** Notify all supervisors (and admins optionally) for a department. */
export async function notifySupervisors(
  input: Omit<NotifyInput, "userId">,
  opts: { includeAdmins?: boolean; department?: string } = {}
): Promise<void> {
  const users = await db.user.findMany({
    where: {
      status: "APPROVED",
      role: opts.includeAdmins ? { in: ["SUPERVISOR", "ADMIN"] } : "SUPERVISOR",
      ...(opts.department ? { department: opts.department } : {}),
    },
  });
  await Promise.all(users.map((u) => notify({ ...input, userId: u.id })));
}

export async function audit(params: {
  userId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        actorName: params.actorName || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details || null,
      },
    });
  } catch (e) {
    console.error("audit error:", e);
  }
}

/**
 * Overdue report detection (lazy scheduler — evaluated on dashboard/consolidated loads).
 * Any APPROVED employee expected to report who has no SUBMITTED/APPROVED report for the
 * given date generates a deduped supervisor notification. Approved-leave / nonworking days
 * can be respected by inserting a SystemFlag leave record keyed `leave:{userId}:{date}`.
 */
export async function checkOverdueReports(dateISO: string): Promise<void> {
  const date = new Date(dateISO + "T00:00:00.000Z");
  const dayStart = new Date(dateISO + "T00:00:00.000Z");
  const dayEnd = new Date(dateISO + "T23:59:59.999Z");
  const now = new Date();
  // Only flag if the workday is considered over (after 18:00 local) or date is in the past
  const workdayOver = now.getHours() >= 18 || now.getTime() > dayEnd.getTime();
  if (!workdayOver) return;

  const reporters = await db.user.findMany({
    where: { status: "APPROVED", role: { in: ["AGENT_BPO", "TEAM_LEAD", "DEVELOPER", "SOCIAL_MEDIA"] } },
  });
  const submitted = await db.report.findMany({
    where: { reportDate: { gte: dayStart, lte: dayEnd }, type: { not: "SUPERVISOR" }, status: { in: ["SUBMITTED", "APPROVED"] } },
    select: { userId: true },
  });
  const submittedSet = new Set(submitted.map((s) => s.userId));

  const supervisors = await db.user.findMany({
    where: { status: "APPROVED", role: { in: ["SUPERVISOR", "ADMIN"] } },
  });

  for (const emp of reporters) {
    if (submittedSet.has(emp.id)) continue;
    // respect approved leave
    const leave = await db.systemFlag.findUnique({ where: { key: `leave:${emp.id}:${dateISO}` } });
    if (leave) continue;
    for (const sup of supervisors) {
      await notify({
        userId: sup.id,
        type: "REPORT_OVERDUE",
        severity: "WARNING",
        title: "Daily report overdue",
        message: `${emp.fullName} (${emp.role}) has not submitted a daily report for ${dateISO}.`,
        linkData: { view: "review", date: dateISO, userId: emp.id },
        dedupeKey: `overdue:${emp.id}:${dateISO}:${sup.id}`,
      });
    }
  }
}
