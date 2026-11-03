/**
 * Live verification of the ROSTER cumulative KPI method on the running server.
 * Logs in as a real ADMIN, drills into NG/Enugu (the user's screenshot centre)
 * and validates:  totalCallsMade day target = (agents working that weekday) × 25
 * (Enugu centre override), social rows present with roster-scaled targets,
 * teamCounts transparency, and actuals = Σ of all agents' submitted values.
 */
const BASE = "http://localhost:3000";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login failed: " + (await res.text()));
  return cookie;
}

async function main() {
  const admin = await db.user.findFirst({ where: { email: "verify-admin@kallmania.test" }, select: { email: true } });
  if (!admin) throw new AdminMissing();
  const pwd = process.env.ADMIN_PWD as string;
  const cookie = await login(admin.email, pwd);

  const get = async (q: string) => {
    const r = await fetch(`${BASE}/api/kpi/summary?${q}`, { headers: { cookie } });
    if (r.status !== 200) throw new Error(`${q} → ${r.status} ${await r.text()}`);
    return r.json();
  };

  const day = "2026-11-02"; // the screenshot's Monday
  const d = await get(`period=day&date=${day}&country=NG&state=Enugu`);
  const w = await get(`period=week&date=${day}&country=NG&state=Enugu`);

  const show = (rows: any[]) => rows.map((r) => `  ${r.group?.padEnd(6)} ${r.label.padEnd(34)} ${String(r.actual ?? "—").padStart(8)} / ${r.targetLabel.padEnd(28)} ${r.pct !== null ? r.pct + "%" : ""}`).join("\n");
  console.log(`== DAY ${day} (Enugu) — reportCount=${d.reportCount} distinctDates=${d.distinctDates}`);
  console.log(`   teamCounts: ${d.teamCounts.map((t: any) => `${t.label}=${t.count}`).join(", ")}`);
  console.log(show(d.rows));
  console.log(`\n== WEEK of ${day} (Enugu) — reportCount=${w.reportCount} distinctDates=${w.distinctDates}`);
  console.log(show(w.rows));

  // ── validate against DB truth ──
  let fail = 0;
  const check = (name: string, cond: unknown, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`); if (!cond) fail++; };

  const centre = { country: "NG", state: "Enugu" };
  const roster = await db.user.findMany({
    where: { status: "APPROVED", role: { in: ["AGENT_BPO", "SOCIAL_MEDIA", "DEVELOPER"] }, ...centre },
    select: { team: true, workDays: true },
  });
  const outbound = roster.filter((u) => u.team === "OUTBOUND");
  const dow = (new Date(day + "T00:00:00.000Z").getUTCDay() + 6) % 7;
  const outWorkingMonday = outbound.filter((u) => (u.workDays && u.workDays.length === 7 ? u.workDays[dow] === "1" : true)).length;
  const expectedDayTarget = outWorkingMonday * 25; // Enugu override BPO.totalCallsMade=25

  const dayCall = d.rows.find((r: any) => r.key === "totalCallsMade");
  check("day totalCallsMade target = agents working Monday × 25", dayCall?.target === expectedDayTarget, `got=${dayCall?.target} expected=${expectedDayTarget} (${outWorkingMonday} agents)`);
  check("day target label mentions per-agent breakdown", /25\/agent/.test(dayCall?.targetLabel ?? ""), dayCall?.targetLabel);

  const actuals: Record<string, number> = {};
  const reps = await db.report.findMany({
    where: { type: "AGENT_BPO", status: { in: ["SUBMITTED", "APPROVED"] }, reportDate: { gte: new Date(day + "T00:00:00.000Z"), lte: new Date(day + "T23:59:59.999Z") }, user: centre },
    select: { kpiMetrics: true },
  });
  for (const r of reps) for (const m of JSON.parse(r.kpiMetrics ?? "[]") as any[]) if (typeof m.actual === "number") actuals[m.key] = (actuals[m.key] || 0) + m.actual;
  check("day totalCallsMade actual = Σ all Enugu agents' reports", dayCall?.actual === (actuals.totalCallsMade ?? null), `api=${dayCall?.actual} db=${actuals.totalCallsMade ?? null}`);

  const wkCall = w.rows.find((r: any) => r.key === "totalCallsMade");
  const wkDates = [...new Set(w.rows.length ? (await db.report.findMany({ where: { type: "AGENT_BPO", status: { in: ["SUBMITTED", "APPROVED"] }, reportDate: { gte: new Date("2026-11-02T00:00:00.000Z"), lte: new Date("2026-11-08T23:59:59.999Z") }, user: centre }, select: { reportDate: true } })).map((r) => r.reportDate.toISOString().slice(0, 10)) : [])];
  const expectedWeek = wkDates.reduce((s, ds) => s + outbound.filter((u) => (u.workDays && u.workDays.length === 7 ? u.workDays[(new Date(ds + "T00:00:00.000Z").getUTCDay() + 6) % 7] === "1" : true)).length, 0) * 25;
  check("week totalCallsMade target = Σ per-day working agents × 25", wkCall?.target === expectedWeek, `got=${wkCall?.target} expected=${expectedWeek} over ${wkDates.length} report day(s)`);

  const socialDay = w.rows.filter((r: any) => r.group === "social"); // week of Nov 2 has any social reports?
  const socDate = "2026-10-27"; // a date with real Enugu social reports
  const sd: any = await get(`period=day&date=${socDate}&country=NG&state=Enugu`);
  const socialDayRows = sd.rows.filter((r: any) => r.group === "social");
  check("social group present with roster-scaled rows (2026-10-27)", socialDayRows.length >= 8, `rows=${socialDayRows.length}`);
  const socialAgents = roster.filter((u) => u.team === "SOCIAL");
  const dowSoc = (new Date(socDate + "T00:00:00.000Z").getUTCDay() + 6) % 7;
  const socialWorking = socialAgents.filter((u) => (u.workDays && u.workDays.length === 7 ? u.workDays[dowSoc] === "1" : true)).length;
  const postsRow = socialDayRows.find((r: any) => r.key === "postsCreated");
  check(`social postsCreated target = social agents working ${socDate} × 4`, postsRow?.target === socialWorking * 4, `got=${postsRow?.target} expected=${socialWorking * 4} (${socialWorking} agents)`);
  check("social percent target NOT multiplied (engagementRate stays 5%)", socialDayRows.find((r: any) => r.key === "engagementRate")?.target === 5);

  check("teamCounts include outbound + social + tech", ["OUTBOUND", "SOCIAL", "TECH"].every((t) => d.teamCounts.some((x: any) => x.team === t)), JSON.stringify(d.teamCounts));
  check("call rows grouped under call label", d.rows.find((r: any) => r.key === "totalCallsMade")?.groupLabel === "Call Centre — Outbound · Inbound · Email");

  console.log(fail === 0 ? "\nROSTER METHOD VERIFIED ✅" : `\n${fail} CHECK(S) FAILED ❌`);
  process.exit(fail === 0 ? 0 : 1);
}

function AdminMissing(): never { throw new Error("No APPROVED admin found"); }

main()
  .finally(() => db.$disconnect());
