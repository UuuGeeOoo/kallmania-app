import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

// ── SBTS Media Command Centre integration — protocol v1 ─────────────────────
// The external SBTS Media Command Centre scores every media agent in real
// time (tasks, check-ins, punctuality, published posts, end-of-day reports)
// and pushes results here as signed events. Kallmania is the STORE AND
// DISPLAY side: it verifies, stores idempotently, and shows the results.
// Scoring ownership and the event format belong to the Media Command Centre;
// the payload contract is versioned (v1) — changes require a new version.

export const SBTS_PROTOCOL_VERSION = "v1";

/** Events older/newer than this (X-SBTS-Timestamp) are rejected. */
export const SBTS_TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes, per contract
/** Max events per batch POST. */
export const SBTS_MAX_BATCH = 100;
/** Max raw body bytes accepted on the ingest route. */
export const SBTS_MAX_BODY_BYTES = 1_000_000;
/** Max report text length per daily.report event. */
export const SBTS_MAX_REPORT_CHARS = 20_000;
/** Max components per score event. */
export const SBTS_MAX_COMPONENTS = 25;

export const SBTS_EVENT_TYPES = ["performance.score", "daily.report"] as const;
export type SbtsEventType = (typeof SBTS_EVENT_TYPES)[number];

// ── Credentials ─────────────────────────────────────────────────────────────

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** 48-char CSPRNG key from an unambiguous alphabet — 32+ chars per contract. */
export function generateSbtsKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  let out = "";
  while (out.length < 48) {
    for (const b of randomBytes(48)) {
      out += alphabet[b % alphabet.length];
      if (out.length === 48) break;
    }
  }
  return out;
}

/** 64-char hex HMAC secret from a CSPRNG. */
export function generateSbtsSecret(): string {
  return randomBytes(32).toString("hex");
}

function keyHint(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export interface SbtsSecretMaterial {
  id: string;
  key: string; // shown EXACTLY ONCE — only the sha256 hash is persisted
  secret: string;
  keyHint: string;
  label: string;
}

/** First-time credential creation. Refuses when a credential already exists (use rotate). */
export async function createSbtsCredential(label = "SBTS Media Command Centre"): Promise<SbtsSecretMaterial> {
  const existing = await db.sbtsCredential.findFirst({ select: { id: true } });
  if (existing) throw new Error("A credential already exists — use rotate instead");
  return mintCredential(label);
}

/**
 * Rotation: mints a NEW credential and moves the target one into a grace
 * window (revokedAt=now, graceUntil=now+graceHours) so events signed with the
 * old secret keep flowing while the Command Centre swaps keys — the 24/7
 * pipe never breaks mid-rotation. graceHours=0 revokes immediately.
 * Without credentialId the currently active credential is rotated.
 */
export async function rotateSbtsCredential(graceHours = 24, label?: string, credentialId?: string): Promise<SbtsSecretMaterial> {
  const current = credentialId
    ? await db.sbtsCredential.findUnique({ where: { id: credentialId } })
    : await db.sbtsCredential.findFirst({ where: { active: true } });
  const minted = await mintCredential(label ?? current?.label ?? "SBTS Media Command Centre");
  if (current) {
    await db.sbtsCredential.update({
      where: { id: current.id },
      data: {
        active: false,
        revokedAt: new Date(),
        graceUntil: graceHours > 0 ? new Date(Date.now() + graceHours * 3600_000) : null,
      },
    });
  }
  return minted;
}

async function mintCredential(label: string): Promise<SbtsSecretMaterial> {
  const key = generateSbtsKey();
  const secret = generateSbtsSecret();
  const row = await db.sbtsCredential.create({
    data: { label, keyHash: sha256Hex(key), keyHint: keyHint(key), secret },
  });
  return { id: row.id, key, secret, keyHint: row.keyHint, label: row.label };
}

export interface SbtsAuthFailure {
  ok: false;
  status: number;
  error: string;
}
export interface SbtsAuthSuccess {
  ok: true;
  credentialId: string;
}

/**
 * Machine-auth for the ingest route, in strict order:
 *  1. Bearer API key (stored as sha256 — lookup by digest, plaintext never stored)
 *  2. X-SBTS-Timestamp freshness (±5 minutes, accepts seconds or milliseconds)
 *  3. X-SBTS-Signature = hex hmac_sha256(secret, rawBody) — optional "sha256=" prefix,
 *     constant-time comparison. Grace-window credentials keep verifying during rotation.
 */
export async function verifySbtsRequest(
  headers: Headers,
  rawBody: string
): Promise<SbtsAuthSuccess | SbtsAuthFailure> {
  const bearer = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(bearer.trim());
  if (!match) return { ok: false, status: 401, error: "Missing Authorization: Bearer <key>" };
  const presented = match[1]!.trim();

  const credential = await db.sbtsCredential.findFirst({
    where: { keyHash: sha256Hex(presented) },
  });
  if (!credential) return { ok: false, status: 401, error: "Unknown API key" };
  const inGrace =
    !credential.active && !!credential.graceUntil && credential.graceUntil.getTime() > Date.now();
  if (!credential.active && !inGrace)
    return { ok: false, status: 401, error: "API key revoked — rotate and retry" };

  const tsRaw = (headers.get("x-sbts-timestamp") ?? "").trim();
  if (!/^\d{9,14}$/.test(tsRaw))
    return { ok: false, status: 401, error: "Missing or invalid X-SBTS-Timestamp" };
  const tsNum = Number(tsRaw);
  // Accept epoch seconds (10 digits) or milliseconds (13 digits).
  const tsMs = tsRaw.length > 11 ? tsNum : tsNum * 1000;
  const skew = Math.abs(Date.now() - tsMs) / 1000;
  if (skew > SBTS_TIMESTAMP_TOLERANCE_SECONDS)
    return {
      ok: false,
      status: 401,
      error: `Stale timestamp (skew ${Math.round(skew)}s > ${SBTS_TIMESTAMP_TOLERANCE_SECONDS}s)`,
    };

  const sigRaw = (headers.get("x-sbts-signature") ?? "").trim();
  const sigHex = sigRaw.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sigHex))
    return { ok: false, status: 401, error: "Missing or malformed X-SBTS-Signature" };
  const expected = createHmac("sha256", credential.secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(sigHex, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return { ok: false, status: 401, error: "Bad signature" };

  return { ok: true, credentialId: credential.id };
}

// ── Event validation ────────────────────────────────────────────────────────

export interface ValidSbtsEvent {
  eventId: string;
  type: SbtsEventType;
  agentEmail: string;
  eventDate: string;
  score: number | null;
  delta: number | null;
  components: string | null;
  report: string | null;
  // Additive v1 extension: optional template text accompanying a daily.report
  template: string | null;
  sentAt: Date | null;
  raw: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validEventDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false;
  // Sane window: not before launch, no more than 2 days ahead (clock-skew guard)
  return value >= "2024-01-01" && value <= new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Validates one event against the v1 payload contract. Returns a machine-
 * readable error string on rejection — the pipe never breaks on a bad item;
 * it is reported per-item and the rest of the batch still lands.
 */
export function validateSbtsEvent(input: unknown): { ok: true; event: ValidSbtsEvent } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return { ok: false, error: "Event must be a JSON object" };
  const e = input as Record<string, unknown>;

  const eventId = typeof e.eventId === "string" ? e.eventId.trim() : "";
  if (!eventId || eventId.length > 128 || /[\u0000-\u001f]/.test(eventId))
    return { ok: false, error: "eventId is required (1–128 chars, no control characters)" };

  const type = e.type;
  if (type !== "performance.score" && type !== "daily.report")
    return { ok: false, error: "type must be 'performance.score' or 'daily.report'" };

  const agent = typeof e.agent === "object" && e.agent !== null ? (e.agent as Record<string, unknown>) : null;
  const rawEmail = agent && typeof agent.email === "string" ? agent.email : "";
  const agentEmail = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(agentEmail) || agentEmail.length > 254)
    return { ok: false, error: "agent.email must be a valid email address" };

  const eventDate = typeof e.date === "string" ? e.date.trim() : "";
  if (!validEventDate(eventDate))
    return { ok: false, error: "date must be a valid YYYY-MM-DD within the supported window" };

  let score: number | null = null;
  let delta: number | null = null;
  let components: string | null = null;
  let report: string | null = null;
  let template: string | null = null;

  if (type === "performance.score") {
    score = asFiniteNumber(e.score);
    if (score === null || score < 0 || score > 100)
      return { ok: false, error: "score must be a number between 0 and 100" };
    delta = asFiniteNumber(e.delta);
    if (e.components !== undefined && e.components !== null) {
      if (typeof e.components !== "object" || Array.isArray(e.components))
        return { ok: false, error: "components must be a JSON object of { component: points }" };
      const obj = e.components as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length > SBTS_MAX_COMPONENTS)
        return { ok: false, error: `components allows at most ${SBTS_MAX_COMPONENTS} keys` };
      for (const k of keys) {
        const v = obj[k];
        if (typeof v !== "number" || !Number.isFinite(v))
          return { ok: false, error: `components.${k} must be a finite number` };
      }
      components = JSON.stringify(obj);
    }
  } else {
    report = typeof e.report === "string" ? e.report : "";
    if (!report.trim()) return { ok: false, error: "report is required for daily.report events" };
    if (report.length > SBTS_MAX_REPORT_CHARS)
      return { ok: false, error: `report exceeds ${SBTS_MAX_REPORT_CHARS} characters` };
    // Optional companion template (additive v1): the report format the external
    // site says this report follows. Stored and archived WITH the report so the
    // extraction/mapping can be reviewed against its stated structure — a
    // missing template is accepted but the report is flagged for review.
    if (e.template !== undefined && e.template !== null) {
      if (typeof e.template !== "string") return { ok: false, error: "template must be a string when supplied" };
      if (e.template.length > SBTS_MAX_REPORT_CHARS)
        return { ok: false, error: `template exceeds ${SBTS_MAX_REPORT_CHARS} characters` };
      template = e.template;
    }
  }

  let sentAt: Date | null = null;
  if (typeof e.sentAt === "string" && e.sentAt) {
    const d = new Date(e.sentAt);
    if (!Number.isNaN(d.getTime())) sentAt = d;
  }

  return {
    ok: true,
    event: { eventId, type, agentEmail, eventDate, score, delta, components, report, template, sentAt, raw: JSON.stringify(e) },
  };
}

export function extractEventId(input: unknown): string | null {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const id = (input as Record<string, unknown>).eventId;
    if (typeof id === "string" && id.length <= 128) return id;
  }
  return null;
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

// ── Display scoping (session side) ──────────────────────────────────────────
//   ADMIN / SUPERVISOR        → all agents, all divisions ("all")
//   TEAM_LEAD                 → the agents of their own team ("team")
//   SOCIAL_MEDIA agent        → only their own data ("own"), by account email
//   everyone else             → no access (null)

export type SbtsScope = "own" | "team" | "all";

export interface SbtsScopeUser {
  id: string;
  email: string;
  role: string;
  department: string;
  team: string | null;
}

export function sbtsScopeFor(user: SbtsScopeUser): SbtsScope | null {
  if (user.role === "ADMIN" || user.role === "SUPERVISOR") return "all";
  if (user.role === "TEAM_LEAD") return "team";
  if (user.role === "SOCIAL_MEDIA") return "own";
  return null;
}

/** Roster emails visible to this user, per the rules above. */
export async function sbtsVisibleEmails(user: SbtsScopeUser): Promise<string[]> {
  const scope = sbtsScopeFor(user);
  if (!scope) return [];
  if (scope === "own") return [user.email.toLowerCase()];
  const where =
    scope === "all"
      ? { OR: [{ role: "SOCIAL_MEDIA" }, { role: "TEAM_LEAD", team: "SOCIAL" }] }
      : { role: "SOCIAL_MEDIA", team: user.team ?? "__none__" };
  const rows = await db.user.findMany({ where, select: { email: true } });
  return rows.map((r) => r.email.toLowerCase());
}

