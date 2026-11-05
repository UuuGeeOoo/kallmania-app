// LIVE SMOKE — production SBTS credential against the running :3000 server.
// Pushes one signed score event for a REAL mapped agent, verifies ingest +
// scoreboard surfacing, then DELETES that single event (no synthetic data left).
import { readFileSync, writeFileSync } from "fs";
import { createHash, createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

// Credential material comes from .env (gitignored) - never hardcode it in the repo.
const KEY = process.env.SBTS_API_KEY ?? "";
const SECRET = process.env.SBTS_HMAC_SECRET ?? "";
if (!KEY || !SECRET) {
  console.error("Set SBTS_API_KEY and SBTS_HMAC_SECRET in the environment (see server .env)");
  process.exit(1);
}
const AGENT = "opeace@kallmania.com";
const EVENT_ID = "sbts-live-smoke-001";
const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  // 1. health as the Command Centre's monitor would see it
  const health = await fetch(`${BASE}/api/integrations/sbts/v1/health`);
  console.log("HEALTH:", health.status, JSON.stringify(await health.json()));

  // 2. signed push with the PRODUCTION credential
  const payload = {
    eventId: EVENT_ID,
    type: "performance.score",
    agent: { email: AGENT },
    date: TODAY,
    score: 68.4,
    delta: 3.2,
    components: { tasks: 20, checkIns: 15, punctuality: 12, publishedPosts: 13.4, eodReport: 8 },
    sentAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(payload);
  const res = await fetch(`${BASE}/api/integrations/sbts/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KEY}`,
      "X-SBTS-Timestamp": String(Math.floor(Date.now() / 1000)),
      "X-SBTS-Signature": createHmac("sha256", SECRET).update(raw, "utf8").digest("hex"),
    },
    body: raw,
  });
  const j = await res.json();
  console.log("INGEST:", res.status, JSON.stringify(j));
  const okPush = res.status === 200 && j.results?.[0]?.status === "stored" && j.results?.[0]?.mapped === true;

  // 3. idempotency on the production pipe
  const res2 = await fetch(`${BASE}/api/integrations/sbts/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KEY}`,
      "X-SBTS-Timestamp": String(Math.floor(Date.now() / 1000)),
      "X-SBTS-Signature": createHmac("sha256", SECRET).update(raw, "utf8").digest("hex"),
    },
    body: raw,
  });
  const j2 = await res2.json();
  console.log("REPLAY:", res2.status, JSON.stringify(j2));
  const okReplay = j2.results?.[0]?.status === "duplicate";

  // 4. scoreboard surfaces it (query DB directly as the session API would)
  const stored = await db.sbtsEvent.findUnique({ where: { eventId: EVENT_ID } });
  const user = await db.user.findUnique({ where: { email: AGENT } });
  const okStored = !!stored && stored.score === 68.4 && stored.matched && stored.userId === user?.id;
  console.log("STORED:", okStored, `score=${stored?.score} matched=${stored?.matched} user=${user?.fullName}`);

  // 5. cleanup — leave NO synthetic data on the production pipe
  await db.sbtsEvent.delete({ where: { eventId: EVENT_ID } });
  const gone = !(await db.sbtsEvent.findUnique({ where: { eventId: EVENT_ID } }));
  console.log("CLEANUP:", gone);

  const allOk = okPush && okReplay && okStored && gone;
  writeFileSync("/tmp/sbts-smoke-result.txt", allOk ? "ALL OK" : "FAILURES");
  console.log(allOk ? "LIVE SMOKE: ALL OK ✅" : "LIVE SMOKE: FAILURES ❌");
  if (!allOk) process.exit(1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); }).finally(() => db.$disconnect());
