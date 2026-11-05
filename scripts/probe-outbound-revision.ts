// Probe: does a single fresh outbound AGENT_BPO POST materialize revision-1 rows
// (healthy) or revision-2 rows (double materialization bug)?
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
const EMAIL = "probe-outbound@kallmania.test";

async function purgeProbe() {
  const olds = await db.user.findMany({ where: { email: EMAIL } });
  for (const o of olds) {
    await db.kpiResult.deleteMany({ where: { userId: o.id } });
    await db.report.deleteMany({ where: { userId: o.id } });
    await db.notification.deleteMany({ where: { userId: o.id } });
    await db.pushEvent.deleteMany({ where: { userId: o.id } });
    await db.pushSubscription.deleteMany({ where: { userId: o.id } });
    await db.pushPreference.deleteMany({ where: { userId: o.id } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { userId: o.id } });
    await db.activityEvent.deleteMany({ where: { userId: o.id } });
    await db.user.delete({ where: { id: o.id } }).catch(() => {});
  }
}

async function main() {
  await purgeProbe();
  await db.user.create({ data: { email: EMAIL, fullName: "Probe Outbound", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "PROBE-1", passwordHash: await bcrypt.hash("probe-pass-1", 10), status: "APPROVED" } });
  const me = (await db.user.findUnique({ where: { email: EMAIL } }))!;
  const login = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: EMAIL, password: "probe-pass-1" }) });
  const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

  const mandatory = await db.kpiConfig.findMany({ where: { department: "BPO", centreCountry: "ALL", centreState: "ALL", mandatory: true, active: true } });
  const metrics = [
    ...mandatory.map((c) => ({ key: c.key, label: c.label, target: c.defaultTarget ?? 1, targetLabel: String(c.defaultTarget ?? 1), actual: c.defaultTarget ?? 1, variance: 0, unit: c.unit as "count", category: "CORE", auto: false, notes: "" })),
    { key: "outboundCallsMade", label: "Outbound Calls Made", target: 80, targetLabel: "80", actual: 96, variance: 16, unit: "count" as const, category: "CORE", auto: false, notes: "" },
  ];
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ type: "AGENT_BPO", reportDate: new Date().toISOString().slice(0, 10), kpiMetrics: metrics, attendanceStatus: "Present", submit: true }) });
  console.log("POST status:", res.status, "in", Date.now() - t0, "ms");
  const rows = await db.kpiResult.findMany({ where: { userId: me.id }, select: { kpiKey: true, revision: true, previousActual: true, actual: true, target: true, updatedAt: true } });
  for (const r of rows) console.log(r.kpiKey, "rev", r.revision, "prev", r.previousActual, "actual", r.actual, "target", r.target, r.updatedAt.toISOString().slice(11, 23));

  // cleanup
  await purgeProbe();
  console.log("probe cleaned");
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; }).finally(() => db.$disconnect());
