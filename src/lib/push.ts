/**
 * Browser push notification core (Web Push / VAPID), server-side only.
 *
 * Flow: application event → notify() → enqueuePush() (queued PushEvent row)
 *   → dispatchPushEvent() → web-push (VAPID-signed, encrypted) → push service
 *   (FCM/Mozilla/APNs) → the app's service worker → native OS notification.
 *
 * Hosting note: this app is a self-hosted Next.js standalone server (bun), not
 * Supabase-hosted — dispatch therefore runs in the app's own trusted server-side
 * runtime (Node-compatible API routes, secrets only ever read here). The
 * "Supabase Edge Function" role from the push architecture is played by these
 * server routes; Supabase Postgres stores the queue/state via Prisma, and the
 * four push tables are RLS-locked with zero policies so only the server (table
 * owner) can reach them.
 *
 * VAPID keys: generated once by scripts/setup-vapid.ts and stored in SystemFlag
 * (`vapid:public` / `vapid:private` / `vapid:subject`). ENV vars win when set
 * (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). Keys are never sent
 * to the client (the PUBLIC key is served via /api/push/config).
 */
import webpush from "web-push";
import { db } from "@/lib/db";

export const MAX_DISPATCH_ATTEMPTS = 6;
/** Lease window: a PROCESSING event whose lease has expired can be re-claimed. */
const LEASE_MS = 2 * 60 * 1000;
const HOUSEKEEPING_DAYS = 30;

export interface PushCategory { type: string; label: string }

/** Push categories = the real notification types the app produces. */
export const PUSH_CATEGORIES: PushCategory[] = [
  { type: "ESCALATION", label: "New escalations assigned to me" },
  { type: "ESCALATION_MESSAGE", label: "Escalation thread replies" },
  { type: "ESCALATION_REOPENED", label: "Escalations reopened" },
  { type: "REPORT_SUBMITTED", label: "Report submissions (supervisors)" },
  { type: "REPORT_OVERDUE", label: "Overdue report alerts" },
  { type: "KPI_SHORTFALL", label: "KPI threshold shortfall" },
  { type: "TASK_ASSIGNED", label: "Tasks assigned to me" },
  { type: "TASK_UPDATED", label: "Task updates" },
  { type: "TASK_BLOCKED", label: "Task blocked" },
  { type: "TASK_COMPLETED", label: "Task completed" },
  { type: "TASK_INCOMPLETE", label: "Task checklist incomplete" },
  { type: "NOTICE", label: "Administrative notices" },
  { type: "UPLOAD_FAILED", label: "Report upload problems" },
  { type: "MEMBER_KPI_PROPOSED", label: "Member KPI proposals" },
  { type: "MEMBER_KPI_UPDATED", label: "Member KPI decisions" },
  { type: "MEMBER_KPI_APPROVAL", label: "Member KPI approvals" },
  { type: "ACCOUNT_APPROVED", label: "Account approved" },
  { type: "ROLE_CHANGED", label: "Role changes" },
  { type: "SCHEDULE_UPDATED", label: "Work schedule changes" },
  { type: "USER_PENDING_APPROVAL", label: "New registrations awaiting approval (admins)" },
];

/** Administrator-defined mandatory categories (SystemFlag `push:mandatory`). */
const DEFAULT_MANDATORY = ["ESCALATION", "ESCALATION_MESSAGE", "ESCALATION_REOPENED", "REPORT_SUBMITTED", "REPORT_OVERDUE", "NOTICE"];

async function getFlag(key: string): Promise<string | null> {
  const row = await db.systemFlag.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setFlag(key: string, value: string): Promise<void> {
  await db.systemFlag.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function mandatoryCategories(): Promise<string[]> {
  try {
    const raw = await getFlag("push:mandatory");
    if (!raw) return DEFAULT_MANDATORY;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter((t) => PUSH_CATEGORIES.some((c) => c.type === t)) : DEFAULT_MANDATORY;
  } catch {
    return DEFAULT_MANDATORY;
  }
}

export async function setMandatoryCategories(types: string[]): Promise<string[]> {
  const clean = [...new Set(types)].filter((t) => PUSH_CATEGORIES.some((c) => c.type === t));
  await setFlag("push:mandatory", JSON.stringify(clean));
  return clean;
}

export async function cronSecret(): Promise<string> {
  const envSecret = process.env.PUSH_CRON_SECRET;
  if (envSecret) return envSecret;
  let secret = await getFlag("push:cronSecret");
  if (!secret) {
    secret = crypto.randomUUID().replace(/-/g, "");
    await setFlag("push:cronSecret", secret);
  }
  return secret;
}

// ── VAPID configuration ─────────────────────────────────────────────────────

export interface VapidConfig { publicKey: string; privateKey: string; subject: string }

/** Resolves VAPID details from ENV first, then SystemFlag. null when not configured. */
export async function vapidConfig(): Promise<VapidConfig | null> {
  const publicKey = process.env.VAPID_PUBLIC_KEY || (await getFlag("vapid:public"));
  const privateKey = process.env.VAPID_PRIVATE_KEY || (await getFlag("vapid:private"));
  const subject = process.env.VAPID_SUBJECT || (await getFlag("vapid:subject")) || "mailto:notifications@kallmania-app.local";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

// ── Preferences ─────────────────────────────────────────────────────────────

export interface EffectivePrefs { pushEnabled: boolean; categories: Record<string, boolean> }

export async function effectivePrefs(userId: string): Promise<EffectivePrefs> {
  const pref = await db.pushPreference.findUnique({ where: { userId } });
  let categories: Record<string, boolean> = {};
  if (pref?.categories) {
    try { categories = JSON.parse(pref.categories) as Record<string, boolean>; } catch { /* corrupt row → defaults */ }
  }
  return { pushEnabled: pref?.pushEnabled ?? true, categories };
}

/**
 * Should this user receive a push for this type?
 * Disabled/omitted categories are respected EXCEPT administrator-defined
 * mandatory ones (escalations, report submissions/overdue, notices).
 */
export async function pushAllowed(userId: string, type: string): Promise<boolean> {
  const prefs = await effectivePrefs(userId);
  const mandatory = await mandatoryCategories();
  if (mandatory.includes(type)) return true;
  if (!prefs.pushEnabled) return false;
  if (prefs.categories[type] === false) return false;
  return true;
}

// ── Safe deep-link destination ──────────────────────────────────────────────

/** Hash-route views the SPA can open (page.tsx renderView switch). */
const VIEW_ALLOWLIST = new Set([
  "dashboard", "notice-board", "daily-report", "supervisor-report", "tl-template", "upload", "tasks",
  "team-tasks", "my-reports", "review", "archive", "consolidated", "uploads-admin", "admin-users",
  "kpi-config", "audit", "notifications", "escalations", "profile",
]);
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Derives a safe internal destination from notification linkData. Never throws. */
export function safePushUrl(linkData: string | null | undefined): string {
  try {
    if (!linkData) return "#/notifications";
    const link = JSON.parse(linkData) as Record<string, unknown>;
    const view = typeof link.view === "string" ? link.view : "";
    if (!VIEW_ALLOWLIST.has(view)) return "#/notifications";
    const id = typeof link.id === "string" && SAFE_ID.test(link.id) ? link.id : null;
    return id ? `#/${view}/${id}` : `#/${view}`;
  } catch {
    return "#/notifications";
  }
}

// ── Enqueue ─────────────────────────────────────────────────────────────────

export interface EnqueueInput {
  userId: string;
  type: string;
  severity?: string;
  title: string;
  body: string;
  linkData?: string | null;
  dedupeKey?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
}

/**
 * Queues a push event for one recipient (trusted server-side producers only).
 * Returns the created row, or null when preferences disable this category
 * (non-mandatory) or the dedupeKey was already enqueued (idempotent).
 * Dispatch is fired in the background (non-blocking for API responses).
 */
export async function enqueuePush(input: EnqueueInput): Promise<{ id: string } | null> {
  try {
    if (!(await pushAllowed(input.userId, input.type))) return null;
    const event = await db.pushEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        severity: input.severity || "INFO",
        title: input.title.slice(0, 120),
        body: input.body.slice(0, 240),
        url: safePushUrl(input.linkData),
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        dedupeKey: input.dedupeKey ?? null,
      },
      select: { id: true },
    });
    void dispatchPushEvent(event.id).catch((e) => console.error("push dispatch error:", e));
    return event;
  } catch (e: unknown) {
    // Unique dedupeKey → this logical notification is already queued. Safe skip.
    const code = (e as { code?: string })?.code;
    if (code !== "P2002") console.error("push enqueue error:", e);
    return null;
  }
}

// ── Dispatch ────────────────────────────────────────────────────────────────

export interface DispatchOutcome {
  subscriptionId: string;
  label: string;
  statusCode: number | null;
  outcome: "ACCEPTED" | "RETRY_LATER" | "FAILED" | "DEACTIVATED";
  error: string | null;
}

function errorCategory(status: number | undefined, message: string): { outcome: DispatchOutcome["outcome"]; category: string } {
  if (status === 404 || status === 410) return { outcome: "DEACTIVATED", category: "EXPIRED" };
  if (status === 429) return { outcome: "RETRY_LATER", category: "RATE_LIMITED" };
  if (status && status >= 500) return { outcome: "RETRY_LATER", category: "PROVIDER" };
  if (status === 401 || status === 403) return { outcome: "FAILED", category: "UNAUTHORIZED" };
  if (status === 413) return { outcome: "FAILED", category: "PAYLOAD_TOO_LARGE" };
  if (status && status >= 400) return { outcome: "FAILED", category: "REJECTED" };
  return /timeout|ECONN|ENOTFOUND|fetch failed|network/i.test(message)
    ? { outcome: "RETRY_LATER", category: "NETWORK" }
    : { outcome: "FAILED", category: "UNKNOWN" };
}

/**
 * Claims and dispatches one queued event to all of the recipient's active
 * subscriptions. Claim/lease semantics (PENDING/FAILED + lease expiry) make
 * concurrent workers and retries safe: whoever wins the claim processes it.
 */
export async function dispatchPushEvent(eventId: string): Promise<{ status: string; outcomes: DispatchOutcome[] } | null> {
  const now = new Date();
  const claimed = await db.pushEvent.updateMany({
    where: { id: eventId, status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: now } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
  });
  if (claimed.count === 0) return null; // claimed elsewhere / not yet due / already terminal

  const event = await db.pushEvent.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const subs = await db.pushSubscription.findMany({ where: { userId: event.userId, active: true } });
  const outcomes: DispatchOutcome[] = [];

  if (subs.length === 0) {
    // No active subscriptions: finish honestly as SKIPPED — never a false "sent".
    await db.pushEvent.update({ where: { id: event.id }, data: { status: "SKIPPED", processedAt: new Date(), lastError: "No active push subscription for recipient" } });
    return { status: "SKIPPED", outcomes };
  }

  const vapid = await vapidConfig();
  if (!vapid) {
    // Missing configuration must never look like success.
    await db.pushEvent.update({ where: { id: event.id }, data: { status: "FAILED", processedAt: new Date(), lastError: "Push not configured: VAPID keys missing" } });
    for (const s of subs) {
      await db.pushDelivery.create({ data: { eventId: event.id, subscriptionId: s.id, attempt: event.attempts + 1, outcome: "FAILED", error: "VAPID configuration missing", retryEligible: true, nextRetryAt: new Date(now.getTime() + LEASE_MS) } });
    }
    return { status: "FAILED", outcomes: [] };
  }

  const payload = JSON.stringify({ eventId: event.id, title: event.title, body: event.body, url: event.url, tag: event.id, severity: event.severity, type: event.type });

  for (const sub of subs) {
    try {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 24 * 3600 }
      );
      const outcome: DispatchOutcome = { subscriptionId: sub.id, label: sub.label, statusCode: res.statusCode ?? 201, outcome: "ACCEPTED", error: null };
      outcomes.push(outcome);
      await db.pushDelivery.create({ data: { eventId: event.id, subscriptionId: sub.id, attempt: event.attempts + 1, statusCode: outcome.statusCode, outcome: "ACCEPTED" } });
      await db.pushSubscription.update({ where: { id: sub.id }, data: { lastSuccessAt: new Date(), lastError: null, lastErrorCategory: null } });
    } catch (e: unknown) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      const message = (err.body || err.message || "push failed").slice(0, 300);
      const { outcome, category } = errorCategory(err.statusCode, message);
      outcomes.push({ subscriptionId: sub.id, label: sub.label, statusCode: err.statusCode ?? null, outcome, error: message });
      await db.pushDelivery.create({
        data: {
          eventId: event.id, subscriptionId: sub.id, attempt: event.attempts + 1,
          statusCode: err.statusCode ?? null, outcome, error: message,
          retryEligible: outcome === "RETRY_LATER",
          nextRetryAt: outcome === "RETRY_LATER" ? new Date(now.getTime() + backoffMs(event.attempts + 1)) : null,
        },
      });
      if (outcome === "DEACTIVATED") {
        await db.pushSubscription.update({ where: { id: sub.id }, data: { active: false, lastError: message, lastErrorCategory: category } });
      } else {
        await db.pushSubscription.update({ where: { id: sub.id }, data: { lastError: message, lastErrorCategory: category } });
      }
    }
  }

  const accepted = outcomes.some((o) => o.outcome === "ACCEPTED");
  const retryable = outcomes.some((o) => o.outcome === "RETRY_LATER");
  const exhausted = event.attempts + 1 >= MAX_DISPATCH_ATTEMPTS;

  if (accepted) {
    await db.pushEvent.update({ where: { id: event.id }, data: { status: "SENT", processedAt: new Date(), lastError: null } });
  } else if (retryable && !exhausted) {
    await db.pushEvent.update({ where: { id: event.id }, data: { status: "FAILED", nextAttemptAt: new Date(now.getTime() + backoffMs(event.attempts + 1)), lastError: outcomes.map((o) => o.error).filter(Boolean).join(" | ").slice(0, 300) || "Temporary delivery failure" } });
  } else {
    await db.pushEvent.update({ where: { id: event.id }, data: { status: "FAILED", processedAt: new Date(), lastError: outcomes.map((o) => o.error).filter(Boolean).join(" | ").slice(0, 300) || "Delivery failed" } });
  }
  return { status: accepted ? "SENT" : retryable && !exhausted ? "FAILED_RETRY" : "FAILED", outcomes };
}

function backoffMs(attempt: number): number {
  return Math.min(30_000 * 2 ** (attempt - 1), 15 * 60_000); // 30s, 1m, 2m, 4m, 8m, 15m cap
}

// ── Queue processing (drain) ────────────────────────────────────────────────

/**
 * Drives due PENDING/FAILED events and recovers stuck PROCESSING events whose
 * lease expired. Idempotent and concurrency-safe (per-event claim).
 */
export async function processPushQueue(limit = 25): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const now = new Date();
  const due = await db.pushEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED", "PROCESSING"] },
      nextAttemptAt: { lte: now },
      attempts: { lt: MAX_DISPATCH_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const tally = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  for (const { id } of due) {
    const res = await dispatchPushEvent(id);
    if (!res) continue;
    tally.processed += 1;
    if (res.status === "SENT") tally.sent += 1;
    else if (res.status === "SKIPPED") tally.skipped += 1;
    else tally.failed += 1;
  }
  if (due.length > 0) await housekeepPush();
  return tally;
}

/** Cleanup policy: trim old terminal events/deliveries and dead subscriptions. */
export async function housekeepPush(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - HOUSEKEEPING_DAYS * 24 * 3600 * 1000);
    await db.pushDelivery.deleteMany({ where: { createdAt: { lt: cutoff } } });
    await db.pushEvent.deleteMany({ where: { status: { in: ["SENT", "SKIPPED"] }, createdAt: { lt: cutoff } } });
    await db.pushSubscription.deleteMany({ where: { active: false, updatedAt: { lt: cutoff } } });
  } catch (e) {
    console.error("push housekeeping error:", e);
  }
}

/**
 * Lazy scheduler hook (same pattern as checkOverdueReports): dashboard and
 * consolidated loads drain the push queue in the background, rate-limited so
 * bursts of dashboard loads don't hammer the DB.
 */
let lastDrainAt = 0;
export function lazyDrainPushQueue(): void {
  const now = Date.now();
  if (now - lastDrainAt < 20_000) return;
  lastDrainAt = now;
  void processPushQueue(15).catch((e) => console.error("push lazy drain error:", e));
}

// ── Test + health ───────────────────────────────────────────────────────────

export interface TestPushResult {
  ok: boolean;
  message: string;
  outcomes: DispatchOutcome[];
}

/** Real Web Push to the user's own registered subscriptions; honest result only. */
export async function sendTestPush(userId: string): Promise<TestPushResult> {
  const vapid = await vapidConfig();
  if (!vapid) {
    return { ok: false, message: "Push is not configured on the server yet (VAPID keys missing) — ask an administrator to run push setup.", outcomes: [] };
  }
  const active = await db.pushSubscription.count({ where: { userId, active: true } });
  if (active === 0) {
    return { ok: false, message: "This account has no active push subscription in any browser. Enable browser notifications first.", outcomes: [] };
  }
  const event = await db.pushEvent.create({
    data: {
      userId, type: "PUSH_TEST", severity: "INFO",
      title: "Test push notification",
      body: "If you can read this, Kallmania browser push is working on this device.",
      url: "#/notifications",
      relatedType: "push-test",
    },
    select: { id: true },
  });
  const res = await dispatchPushEvent(event.id);
  const outcomes = res?.outcomes ?? [];
  const accepted = outcomes.filter((o) => o.outcome === "ACCEPTED").length;
  const failed = outcomes.filter((o) => o.outcome !== "ACCEPTED");
  if (accepted > 0) {
    return { ok: true, message: `Accepted by the push service for ${accepted} browser${accepted === 1 ? "" : "s"} — the device should show the notification momentarily.`, outcomes };
  }
  return {
    ok: false,
    message: failed.length > 0
      ? `The push service did not accept the message: ${failed[0].error || failed[0].outcome}`
      : "No delivery was attempted.",
    outcomes,
  };
}

export interface PushHealth {
  configured: boolean;
  subject: string;
  publicKeyPresent: boolean;
  counts: { queued: number; processing: number; sent: number; failed: number; skipped: number };
  attempts: { total: number; accepted: number; retryLater: number; failed: number; deactivated: number };
  subscriptions: { total: number; active: number; inactive: number };
  recentFailures: { eventId: string; title: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: Date }[];
  recentAttempts: { at: Date; eventTitle: string; subscriptionLabel: string; statusCode: number | null; outcome: string; error: string | null }[];
}

export async function pushHealth(): Promise<PushHealth> {
  const vapid = await vapidConfig();
  const [events, attemptsAgg, subs, failedEvents, recentAttempts] = await Promise.all([
    db.pushEvent.groupBy({ by: ["status"], _count: { _all: true } }),
    db.pushDelivery.groupBy({ by: ["outcome"], _count: { _all: true } }),
    db.pushSubscription.groupBy({ by: ["active"], _count: { _all: true } }),
    db.pushEvent.findMany({
      where: { status: { in: ["FAILED", "PROCESSING"] } },
      orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, title: true, type: true, status: true, attempts: true, lastError: true, createdAt: true },
    }),
    db.pushDelivery.findMany({
      where: { outcome: { not: "ACCEPTED" } },
      orderBy: { createdAt: "desc" }, take: 10,
      select: { createdAt: true, statusCode: true, outcome: true, error: true, event: { select: { title: true } }, subscription: { select: { label: true } } },
    }),
  ]);
  const countBy = <K extends string>(rows: { [k: string]: unknown; _count: { _all: number } }[], key: string): Record<string, number> => {
    const acc: Record<string, number> = {};
    for (const r of rows) acc[String(r[key])] = r._count._all;
    return acc;
  };
  const ev = countBy(events as never[], "status");
  const at = countBy(attemptsAgg as never[], "outcome");
  const sb = countBy(subs as never[], "active");
  return {
    configured: Boolean(vapid),
    subject: vapid?.subject ?? "",
    publicKeyPresent: Boolean(vapid?.publicKey),
    counts: {
      queued: ev["PENDING"] ?? 0,
      processing: ev["PROCESSING"] ?? 0,
      sent: ev["SENT"] ?? 0,
      failed: ev["FAILED"] ?? 0,
      skipped: ev["SKIPPED"] ?? 0,
    },
    attempts: {
      total: attemptsAgg.reduce((s, r) => s + r._count._all, 0),
      accepted: at["ACCEPTED"] ?? 0,
      retryLater: at["RETRY_LATER"] ?? 0,
      failed: at["FAILED"] ?? 0,
      deactivated: at["DEACTIVATED"] ?? 0,
    },
    subscriptions: { total: Object.values(sb).reduce((s, n) => s + n, 0), active: sb["true"] ?? 0, inactive: sb["false"] ?? 0 },
    recentFailures: failedEvents.map((f) => ({
      eventId: f.id, title: f.title, type: f.type, status: f.status, attempts: f.attempts, lastError: f.lastError, createdAt: f.createdAt,
    })),
    recentAttempts: recentAttempts.map((a) => ({
      at: a.createdAt, eventTitle: a.event.title, subscriptionLabel: a.subscription.label,
      statusCode: a.statusCode, outcome: a.outcome, error: a.error,
    })),
  };
}
