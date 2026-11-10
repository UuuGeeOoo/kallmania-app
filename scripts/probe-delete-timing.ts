/**
 * Timing probe: how long does PATCH /api/users {action:"delete"} actually take
 * against the production standalone server + remote Supabase, for a victim
 * carrying the full FK footprint? Also proves the browser flow works when the
 * client waits long enough. Creates + deletes its own temp users.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();
const BASE = "http://localhost:3000";
const PASSWORD = "e2e-timing-2026";
const STAMP = Date.now().toString(36);
const ADMIN = { email: `timing-admin-${STAMP}@kallmania.test`, fullName: "E2E Timing Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: `E2E-TIM-A-${STAMP}`, country: "NG", state: "Enugu" };
const VICTIM = { email: `timing-victim-${STAMP}@kallmania.test`, fullName: "E2E Timing Victim", role: "AGENT_BPO", department: "BPO", team: "INBOUND", employeeId: `E2E-TIM-V-${STAMP}`, country: "NG", state: "Enugu" };
const EMAILS = [ADMIN.email, VICTIM.email];

async function purge() {
  const users = await db.user.findMany({ where: { OR: [{ email: { in: EMAILS } }, { email: { contains: "timing-" } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.kpiResult.deleteMany({ where: { userId: { in: ids } } });
    await db.report.deleteMany({ where: { userId: { in: ids } } });
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.pushDelivery.deleteMany({ where: { OR: [{ event: { userId: { in: ids } } }, { subscription: { userId: { in: ids } } }] } }).catch(() => {});
    await db.pushEvent.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.memberKpiConfig.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.taskAssignee.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
  }
  await db.user.deleteMany({ where: { OR: [{ email: { in: EMAILS } }, { email: { contains: "timing-" } }] } }).catch(() => {});
}

async function main() {
  await purge();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of [ADMIN, VICTIM]) await db.user.create({ data: { ...u, passwordHash, status: "APPROVED" } });
  const admin = await db.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
  const victim = await db.user.findUniqueOrThrow({ where: { email: VICTIM.email } });
  const day = new Date();
  const report = await db.report.create({ data: { ref: `E2E-TIM-${STAMP}-R`, type: "DAILY_REPORT", reportDate: day, userId: victim.id, department: "BPO", status: "SUBMITTED" } });
  await db.kpiResult.create({ data: { dedupeKey: `e2e-tim:${STAMP}:k`, userId: victim.id, team: "INBOUND", department: "BPO", kpiKey: "callsHandled", label: "Calls handled", unit: "count", target: 50, actual: 60, achievement: 120, statusLabel: "MET", source: "REPORT", reportId: report.id, reportDate: day, periodMonth: day.toISOString().slice(0, 7) } });
  await db.activityEvent.create({ data: { userId: victim.id, eventType: "LOGIN" } });
  const sub = await db.pushSubscription.create({ data: { userId: victim.id, endpoint: `https://push.example/tim-${STAMP}`, p256dh: "k", auth: "a" } });
  const pev = await db.pushEvent.create({ data: { userId: victim.id, type: "ESCALATION_NEW", title: "p", body: "b" } });
  await db.pushDelivery.create({ data: { eventId: pev.id, subscriptionId: sub.id, attempt: 1, outcome: "FAILED", error: "no vapid" } });
  await db.pushPreference.create({ data: { userId: victim.id, pushEnabled: true } });
  await db.notification.create({ data: { userId: victim.id, type: "ACCOUNT_APPROVED", title: "own", message: "m" } });
  console.log(`seeded victim ${victim.id} (full footprint incl. PushDelivery)`);

  const loginRes = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: ADMIN.email, password: PASSWORD }) });
  const cookie = loginRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

  for (let i = 1; i <= 3; i++) {
    // re-seed a fresh victim each round so every timed call has identical work
    const vEmail = `timing-victim-${STAMP}-${i}@kallmania.test`;
    await db.user.create({ data: { ...VICTIM, email: vEmail, passwordHash, status: "APPROVED" } });
    const v2 = await db.user.findUniqueOrThrow({ where: { email: vEmail } });
    await db.report.create({ data: { ref: `E2E-TIM-${STAMP}-R${i}`, type: "DAILY_REPORT", reportDate: day, userId: v2.id, department: "BPO", status: "SUBMITTED" } });
    await db.activityEvent.create({ data: { userId: v2.id, eventType: "LOGIN" } });
    const s2 = await db.pushSubscription.create({ data: { userId: v2.id, endpoint: `https://push.example/tim-${STAMP}-${i}`, p256dh: "k", auth: "a" } });
    const e2 = await db.pushEvent.create({ data: { userId: v2.id, type: "ESCALATION_NEW", title: "p", body: "b" } });
    await db.pushDelivery.create({ data: { eventId: e2.id, subscriptionId: s2.id, attempt: 1, outcome: "FAILED", error: "no vapid" } });
    await db.pushPreference.create({ data: { userId: v2.id, pushEnabled: true } });
    await db.notification.create({ data: { userId: v2.id, type: "ACCOUNT_APPROVED", title: "own", message: "m" } });

    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: "PATCH", headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ userId: v2.id, action: "delete" }),
    });
    const ms = Date.now() - t0;
    const j = await res.json().catch(() => ({}));
    console.log(`round ${i}: status=${res.status} in ${ms}ms | ${String((j as Record<string, unknown>).message ?? (j as Record<string, unknown>).error ?? "")}`);
  }
  const left = await db.user.count({ where: { email: { contains: "timing-victim" } } });
  console.log(`victims left after 3 timed deletes: ${left}`);
}

main()
  .then(async () => { await purge(); await db.$disconnect(); })
  .catch((e) => { console.error("TIMING crashed:", e); process.exit(1); });
