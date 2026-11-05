// API-level E2E — SBTS MEDIA COMMAND CENTRE integration (protocol v1):
//  1. HEALTH: GET /api/integrations/sbts/v1/health is public, {"status":"ok"}
//  2. INGEST SECURITY: bearer key (sha256-stored), X-SBTS-Timestamp ±5min,
//     X-SBTS-Signature hmac_sha256(secret, rawBody) — wrong/missing/stale all 401
//  3. INGEST: performance.score + daily.report stored idempotently (duplicate
//     eventId skipped), per-item validation (bad items rejected, batch survives),
//     email mapping (case-insensitive), unmapped emails stored flagged
//  4. DISPLAY SCOPING: /api/sbts/scores + /api/sbts/reports — agent sees ONLY
//     their own (account-email match), team lead sees their team, supervisor/
//     admin see all; BPO agents and anonymous callers get 403/401
//  5. LATEST/PREVIOUS: newest eventDate wins, tie-break most recently received
//  6. ROTATION: targeted rotate mints a new credential, old one keeps verifying
//     inside the grace window and dies at grace 0; credentials API is admin-only
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
import { createHmac, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-sbts-2026";
const D1 = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
const D2 = new Date().toISOString().slice(0, 10);
const D3 = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);

const A1 = { email: "sbts-agent1@kallmania.test", fullName: "E2E SBTS Agent One", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-SBTS-1" };
const A2 = { email: "sbts-agent2@kallmania.test", fullName: "E2E SBTS Agent Two", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-SBTS-2" };
const TL = { email: "sbts-lead@kallmania.test", fullName: "E2E SBTS Lead", role: "TEAM_LEAD", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-SBTS-3" };
const ADM = { email: "sbts-admin@kallmania.test", fullName: "E2E SBTS Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-SBTS-4" };
const BPO = { email: "sbts-bpo@kallmania.test", fullName: "E2E SBTS Outsider", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-SBTS-5" };
const ALL = [A1, A2, TL, ADM, BPO];
const E2E_EMAILS = ALL.map((u) => u.email);

let failures = 0;
function check(name: string, cond: unknown, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}
function nowTs(): string {
  return String(Math.floor(Date.now() / 1000));
}

async function login(u: { email: string; password?: string }) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: u.email, password: u.password ?? PASSWORD }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`login failed for ${u.email}: ${await res.text()}`);
  return cookie;
}

async function postEvents(key: string | null, secret: string | null, body: unknown, opts?: { ts?: string; sig?: string | null }) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["Authorization"] = `Bearer ${key}`;
  if (secret !== null) headers["X-SBTS-Signature"] = opts?.sig === undefined ? sign(secret, raw) : opts.sig;
  headers["X-SBTS-Timestamp"] = opts?.ts ?? nowTs();
  const res = await fetch(`${BASE}/api/integrations/sbts/v1/events`, { method: "POST", headers, body: raw });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function getSession(cookie: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function main() {
  // ── CLEANUP (previous runs) ────────────────────────────────────────────────
  const oldUsers = await db.user.findMany({ where: { email: { in: E2E_EMAILS } }, select: { id: true } });
  const oldIds = oldUsers.map((u) => u.id);
  if (oldIds.length) {
    await db.kpiResult.deleteMany({ where: { userId: { in: oldIds } } });
    await db.report.deleteMany({ where: { userId: { in: oldIds } } }); // SBTS_IMPORT archive copies + own reports
    await db.activityEvent.deleteMany({ where: { userId: { in: oldIds } } });
    await db.sbtsEvent.deleteMany({ where: { OR: [{ userId: { in: oldIds } }, { agentEmail: { in: E2E_EMAILS } }] } });
  }
  await db.sbtsEvent.deleteMany({ where: { agentEmail: { in: [...E2E_EMAILS, "sbts-ghost@nowhere.test"] } } });
  await db.sbtsCredential.deleteMany({ where: { label: { startsWith: "E2E-SBTS" } } });
  await db.user.deleteMany({ where: { email: { in: E2E_EMAILS } } });

  // ── SEED ───────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of ALL) await db.user.create({ data: { ...u, passwordHash, status: "APPROVED" } });
  // The ingest credential the suite signs with (target-rotated later, never the production one):
  const KEY = `E2ETESTKEY${randomBytes(24).toString("hex")}`;
  const SECRET = randomBytes(32).toString("hex");
  await db.sbtsCredential.create({
    data: { label: "E2E-SBTS-MAIN", keyHash: (await import("crypto")).createHash("sha256").update(KEY).digest("hex"), keyHint: "e2e…MAIN", secret: SECRET },
  });

  console.log("── 1. HEALTH ──");
  {
    const res = await fetch(`${BASE}/api/integrations/sbts/v1/health`);
    const json = await res.json() as Record<string, unknown>;
    check("health is public 200", res.status === 200);
    check("health status ok", json.status === "ok");
    check("health reports protocol version v1", json.version === "v1");
  }

  console.log("── 2. INGEST SECURITY ──");
  {
    const r0 = await postEvents(null, null, { eventId: "x" });
    check("missing Authorization header → 401", r0.status === 401, JSON.stringify(r0.json));
    const r1 = await postEvents("WRONG-KEY-123", "whatever-secret", { eventId: "x" });
    check("unknown API key → 401", r1.status === 401);
    const body = JSON.stringify({ eventId: "sig-test", type: "daily.report", agent: { email: A1.email }, date: D2, report: "sig" });
    const noSig = await fetch(`${BASE}/api/integrations/sbts/v1/events`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}`, "X-SBTS-Timestamp": nowTs() }, body });
    check("missing signature → 401", noSig.status === 401);
    const badSig = await postEvents(KEY, "not-the-real-secret", JSON.parse(body));
    check("bad HMAC signature → 401", badSig.status === 401);
    const stale = await postEvents(KEY, SECRET, JSON.parse(body), { ts: String(Math.floor(Date.now() / 1000) - 360) });
    check("timestamp 6 minutes old → 401 (5-min window)", stale.status === 401);
    const future = await postEvents(KEY, SECRET, JSON.parse(body), { ts: String(Math.floor(Date.now() / 1000) + 360) });
    check("timestamp 6 minutes in future → 401", future.status === 401);
    const msTs = await postEvents(KEY, SECRET, { eventId: "ts-ms", type: "daily.report", agent: { email: A1.email }, date: D2, report: "ms timestamp accepted" }, { ts: String(Date.now()) });
    check("millisecond timestamps accepted", msTs.status === 200, JSON.stringify(msTs.json));
  }

  console.log("── 3. INGEST + IDEMPOTENCY + VALIDATION ──");
  {
    const s1 = { eventId: "sbts-e2e-score-1", type: "performance.score", agent: { email: A1.email.toUpperCase() }, date: D1, score: 62.5, delta: 2.5, components: { tasks: 20, checkIns: 15, punctuality: 12, posts: 10, eodReport: 5 }, sentAt: new Date().toISOString() };
    const r1 = await postEvents(KEY, SECRET, s1);
    check("valid performance.score → 200 stored", r1.status === 200 && (r1.json as { results: { status: string }[] }).results[0]?.status === "stored", JSON.stringify(r1.json));
    check("email matched case-insensitively", (r1.json as { results: { mapped?: boolean }[] }).results[0]?.mapped === true);
    const dup = await postEvents(KEY, SECRET, s1);
    check("duplicate eventId → 200 duplicate (idempotent)", dup.status === 200 && (dup.json as { results: { status: string }[] }).results[0]?.status === "duplicate");
    const cnt = await db.sbtsEvent.count({ where: { eventId: s1.eventId } });
    check("duplicate stored exactly once", cnt === 1);

    const r2 = await postEvents(KEY, SECRET, { eventId: "sbts-e2e-report-1", type: "daily.report", agent: { email: A1.email }, date: D2, report: "Published 5 creatives, 3 reels edited, engaged 200 comments. EOD." });
    check("valid daily.report → stored", r2.status === 200 && (r2.json as { accepted: number }).accepted === 1);
    const r2b = await postEvents(KEY, SECRET, { eventId: "sbts-e2e-report-2", type: "daily.report", agent: { email: A2.email }, date: D2, report: "Scheduled 12 posts, answered 45 DMs, community engagement up. EOD." });
    check("second agent daily.report → stored", r2b.status === 200 && (r2b.json as { accepted: number }).accepted === 1);

    const batch = await postEvents(KEY, SECRET, { events: [
      { eventId: "sbts-e2e-score-2", type: "performance.score", agent: { email: A2.email }, date: D2, score: 41, delta: -3 },
      { eventId: "sbts-e2e-score-1", type: "performance.score", agent: { email: A1.email }, date: D1, score: 62.5 }, // duplicate
      { eventId: "sbts-e2e-bad-1", type: "performance.score", agent: { email: A1.email }, date: D2, score: 150 },   // invalid
    ] });
    const bj = batch.json as { accepted: number; duplicates: number; rejected: number };
    check("batch: accepted=1 duplicates=1 rejected=1", batch.status === 200 && bj.accepted === 1 && bj.duplicates === 1 && bj.rejected === 1, JSON.stringify(bj));

    for (const [name, ev] of [
      ["missing eventId", { type: "daily.report", agent: { email: A1.email }, date: D2, report: "x" }],
      ["unknown type", { eventId: "bad-type", type: "nonsense", agent: { email: A1.email }, date: D2, report: "x" }],
      ["score > 100", { eventId: "bad-score", type: "performance.score", agent: { email: A1.email }, date: D2, score: 100.01 }],
      ["score not number", { eventId: "bad-score2", type: "performance.score", agent: { email: A1.email }, date: D2, score: "high" }],
      ["bad email", { eventId: "bad-email", type: "performance.score", agent: { email: "not-an-email" }, date: D2, score: 50 }],
      ["bad date", { eventId: "bad-date", type: "performance.score", agent: { email: A1.email }, date: "04/11/2026", score: 50 }],
      ["empty report", { eventId: "bad-report", type: "daily.report", agent: { email: A1.email }, date: D2, report: "   " }],
      ["non-finite component", { eventId: "bad-comp", type: "performance.score", agent: { email: A1.email }, date: D2, score: 50, components: { tasks: "all" } }],
    ] as [string, object][]) {
      const r = await postEvents(KEY, SECRET, ev);
      const item = (r.json as { results: { status: string }[] }).results?.[0];
      check(`rejects ${name} (per-item, HTTP still 200)`, r.status === 200 && item?.status === "rejected", JSON.stringify(r.json));
    }
    const malformed = await postEvents(KEY, SECRET, "{not json");
    check("malformed JSON → 400", malformed.status === 400);

    const unmapped = await postEvents(KEY, SECRET, { eventId: "sbts-e2e-ghost-1", type: "performance.score", agent: { email: "sbts-ghost@nowhere.test" }, date: D2, score: 77 });
    check("unmapped email stored flagged (pipe never breaks)", unmapped.status === 200 && (unmapped.json as { results: { mapped?: boolean }[] }).results[0]?.mapped === false);
    const ghost = await db.sbtsEvent.findUnique({ where: { eventId: "sbts-e2e-ghost-1" } });
    check("unmapped event persisted with matched=false", !!ghost && ghost.matched === false && ghost.userId === null);
  }

  console.log("── 4. DISPLAY SCOPING ──");
  {
    const anon = await getSession("", "/api/sbts/scores");
    check("scores unauthenticated → 401", anon.status === 401);
    const bpo = await getSession(await login(BPO), "/api/sbts/scores");
    check("BPO agent (out of scope role) → 403", bpo.status === 403);

    const agent = await getSession(await login(A1), "/api/sbts/scores");
    const aj = agent.json as { scope: string; agents: { email: string; latest: { score: number } | null; previous: { score: number } | null }[] };
    check("agent scope = own", agent.status === 200 && aj.scope === "own");
    check("agent sees exactly their own account", aj.agents.length === 1 && aj.agents[0]?.email === A1.email);
    // agent1 has D1=62.5 and D3(=+1d batch? no — D3 only in batch as score-2? batch score-2 is A2) — agent1: D1 62.5 + D3 none; plus none newer.
    check("agent latest score correct", aj.agents[0]?.latest?.score === 62.5, JSON.stringify(aj.agents[0]?.latest));

    const lead = await getSession(await login(TL), "/api/sbts/scores");
    const lj = lead.json as { scope: string; agents: { email: string; role: string }[] };
    check("lead scope = team and sees both team agents", lead.status === 200 && lj.scope === "team" && lj.agents.filter((a) => [A1.email, A2.email].includes(a.email)).length === 2, JSON.stringify(lj.agents?.map((a) => a.email)));
    check("lead scope excludes out-of-team roles (no BPO/management)", lj.agents.every((a) => a.role === "SOCIAL_MEDIA" || a.role === "TEAM_LEAD"));

    const admin = await getSession(await login(ADM), "/api/sbts/scores");
    const dj = admin.json as { scope: string; agents: { email: string; latest: { score: number; date: string } | null }[]; unmapped: { email: string }[] };
    check("admin scope = all", admin.status === 200 && dj.scope === "all");
    const a2row = dj.agents.find((a) => a.email === A2.email);
    check("admin sees agent2 latest score 41", a2row?.latest?.score === 41);
    check("unmapped ghost email surfaced to admin", dj.unmapped.some((u) => u.email === "sbts-ghost@nowhere.test"));

    const reportsAnon = await getSession("", "/api/sbts/reports");
    check("reports unauthenticated → 401", reportsAnon.status === 401);
    const reportsBpo = await getSession(await login(BPO), "/api/sbts/reports");
    check("reports BPO agent → 403", reportsBpo.status === 403);

    const rep1 = await getSession(await login(A1), "/api/sbts/reports");
    const rj1 = rep1.json as { reports: { agentEmail: string; date: string; report: string }[] };
    check("agent sees ONLY their own reports (email match)", rep1.status === 200 && rj1.reports.length >= 1 && rj1.reports.every((r) => r.agentEmail === A1.email) && rj1.reports.some((r) => r.report.includes("5 creatives")), JSON.stringify(rj1.reports?.map((r) => r.agentEmail)));
    const repLead = await getSession(await login(TL), "/api/sbts/reports");
    const rjL = repLead.json as { reports: { agentEmail: string }[] };
    check("lead sees team reports (both agents, never outsiders)", repLead.status === 200 && rjL.reports.length >= 2 && rjL.reports.every((r) => [A1.email, A2.email].includes(r.agentEmail)));
    const repAdmin = await getSession(await login(ADM), "/api/sbts/reports?email=" + encodeURIComponent(A2.email));
    const rjA = repAdmin.json as { reports: { agentEmail: string }[] };
    check("admin filtered by email works", repAdmin.status === 200 && rjA.reports.length >= 1 && rjA.reports.every((r) => r.agentEmail === A2.email));
    const sneaky = await getSession(await login(A1), "/api/sbts/reports?email=" + encodeURIComponent(A2.email));
    check("agent cannot widen scope via email param (forced self)", sneaky.status === 200 && (sneaky.json as { reports: { agentEmail: string }[] }).reports.every((r) => r.agentEmail === A1.email));
    const forbidden = await getSession(await login(TL), "/api/sbts/reports?email=sbts-ghost@nowhere.test");
    check("lead blocked from non-team email (403)", forbidden.status === 403);
  }

  console.log("── 5. LATEST/PREVIOUS ordering ──");
  {
    // Push a newer-day score for agent1: latest must switch to it, previous becomes 62.5
    const newer = await postEvents(KEY, SECRET, { eventId: "sbts-e2e-score-3", type: "performance.score", agent: { email: A1.email }, date: D3, score: 78, delta: 15.5, components: { tasks: 22, posts: 14 } });
    check("newer-day score stored", newer.status === 200);
    const admin = await getSession(await login(ADM), "/api/sbts/scores");
    const row = (admin.json as { agents: { email: string; latest: { score: number; date: string } | null; previous: { score: number } | null }[] }).agents.find((a) => a.email === A1.email);
    check("latest = newest eventDate (78 @ D3)", row?.latest?.score === 78 && row?.latest?.date === D3, JSON.stringify(row));
    check("previous = 62.5 (D1)", row?.previous?.score === 62.5);
    // Same-day tie-break: re-issued score for D3 with a NEW eventId (not duplicate) — most recently received wins
    await postEvents(KEY, SECRET, { eventId: "sbts-e2e-score-4", type: "performance.score", agent: { email: A1.email }, date: D3, score: 81 });
    const admin2 = await getSession(await login(ADM), "/api/sbts/scores");
    const row2 = (admin2.json as { agents: { email: string; latest: { score: number } | null; previous: { score: number } | null }[] }).agents.find((a) => a.email === A1.email);
    check("same-day tie-break: newest received wins (81)", row2?.latest?.score === 81 && row2?.previous?.score === 78, JSON.stringify(row2));
  }

  console.log("── 6. CREDENTIALS API + ROTATION ──");
  {
    const anon = await getSession("", "/api/integrations/sbts/v1/credentials");
    check("credentials API unauthenticated → 401", anon.status === 401);
    const agent = await getSession(await login(A1), "/api/integrations/sbts/v1/credentials");
    check("credentials API agent → 403", agent.status === 403);
    const admin = await getSession(await login(ADM), "/api/integrations/sbts/v1/credentials");
    const cj = admin.json as { credentials: { keyHint: string; label: string }[]; events24h: number; lastEvent: { type: string } | null };
    check("credentials API admin lists hints (never plaintext)", admin.status === 200 && cj.credentials.some((c) => c.label === "E2E-SBTS-MAIN") && JSON.stringify(cj).includes(KEY) === false);
    check("credentials API reports live event counters", cj.events24h >= 5 && cj.lastEvent !== null, `events24h=${cj.events24h}`);

    // Targeted rotation with grace: rotate the MAIN test credential (never the production one)
    const mainRow = await db.sbtsCredential.findFirst({ where: { label: "E2E-SBTS-MAIN" } });
    const rotRes = await fetch(`${BASE}/api/integrations/sbts/v1/credentials`, {
      method: "POST", headers: { "Content-Type": "application/json", cookie: await login(ADM) },
      body: JSON.stringify({ action: "rotate", graceHours: 1, credentialId: mainRow?.id }),
    });
    const rot = await rotRes.json() as { rotated: boolean; key: string; secret: string; keyHint: string };
    check("admin rotate returns new key+secret exactly once", rotRes.status === 200 && rot.rotated === true && rot.key.length >= 32 && rot.secret.length >= 32);
    const newRow = await db.sbtsCredential.findFirst({ where: { keyHint: rot.keyHint } });
    check("new credential ACTIVE, old in grace", !!newRow?.active && (await db.sbtsCredential.findUnique({ where: { id: mainRow!.id } }))?.active === false);

    const rNew = await postEvents(rot.key, rot.secret, { eventId: "sbts-e2e-rot-new", type: "performance.score", agent: { email: A1.email }, date: D2, score: 88 });
    check("NEW credential verifies", rNew.status === 200);
    const rOld = await postEvents(KEY, SECRET, { eventId: "sbts-e2e-rot-old", type: "performance.score", agent: { email: A1.email }, date: D2, score: 89 });
    check("OLD credential still verifies within grace window", rOld.status === 200, JSON.stringify(rOld.json));

    // grace 0 → immediate revoke
    const rot2Res = await fetch(`${BASE}/api/integrations/sbts/v1/credentials`, {
      method: "POST", headers: { "Content-Type": "application/json", cookie: await login(ADM) },
      body: JSON.stringify({ action: "rotate", graceHours: 0, credentialId: newRow?.id }),
    });
    const rot2 = await rot2Res.json() as { key: string; secret: string };
    check("second rotation ok (grace 0)", rot2Res.status === 200);
    const rDead = await postEvents(rot.key, rot.secret, { eventId: "sbts-e2e-rot-dead", type: "performance.score", agent: { email: A1.email }, date: D2, score: 90 });
    check("grace-0 rotated credential rejected immediately", rDead.status === 401);
    const rOld2 = await postEvents(KEY, SECRET, { eventId: "sbts-e2e-rot-old2", type: "performance.score", agent: { email: A1.email }, date: D2, score: 91 });
    check("first-rotation OLD credential still in its 1h grace", rOld2.status === 200);
    const rNew2 = await postEvents(rot2.key, rot2.secret, { eventId: "sbts-e2e-rot-new2", type: "performance.score", agent: { email: A1.email }, date: D2, score: 92 });
    check("latest credential verifies", rNew2.status === 200);
  }

  // ── CLEANUP (this run) ─────────────────────────────────────────────────────
  const users = await db.user.findMany({ where: { email: { in: E2E_EMAILS } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.sbtsEvent.deleteMany({ where: { userId: { in: ids } } });
  }
  await db.sbtsEvent.deleteMany({ where: { agentEmail: { in: [...E2E_EMAILS, "sbts-ghost@nowhere.test"] } } });
  await db.sbtsCredential.deleteMany({ where: { label: { startsWith: "E2E-SBTS" } } });
  await db.user.deleteMany({ where: { email: { in: E2E_EMAILS } } });

  console.log("─".repeat(50));
  if (failures) {
    console.log(`SBTS E2E: ${failures} FAILURE(S)`);
    process.exit(1);
  } else {
    console.log("SBTS E2E: ALL PASS ✅");
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
