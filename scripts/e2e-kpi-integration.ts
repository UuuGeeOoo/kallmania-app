// API-level E2E — UNIFIED REPORT → KPI INTEGRATION (master implementation):
//  1. AGENT REPORT → KPI RECORDS: a submitted (not drafted) report writes
//     normalized KpiResult rows linked to the report, owner, period; drafts
//     never create records; the per-user KPI drill-down surfaces them.
//  2. REVIEW LIFECYCLE: approve → records APPROVED; reject → REJECTED;
//     resubmission → revision bump with previousActual preserved; re-running
//     the same submission never duplicates (idempotent on dedupeKey).
//  3. MEDIA SCOREBOARD → KPI RECORDS: a matched SBTS performance.score writes
//     the headline + component records; replaying the SAME eventId is a
//     duplicate and can never inflate results.
//  4. EXTERNAL SITE REPORT + TEMPLATE: a matched SBTS daily.report (with its
//     template) lands in the Report Archive as SBTS_IMPORT with the template
//     associated and flagged for review; the agent can STILL file their own
//     report for the same day; free-text imports fabricate no KPI records.
//  5. TEAM LEAD PERSONAL PERFORMANCE: a lead report's metrics sections become
//     the lead's own TL_REPORT records; /api/sbts/tl-performance shows their
//     personal breakdown, compliance and history — NEVER mixed with team score.
//  6. ARCHIVE INTEGRATION: enriched rows carry template + KPI record counts;
//     source filter finds external-site reports; deleting a report cascades
//     its KPI records.
//  7. SECURITY: agents see only their own records; a lead's private panel is
//     lead-only; archive is supervisor/admin; cross-centre/cross-role reads 403.
//  8. ALL-TEAM PIPELINE: the same submission→KPI-record path proven for a
//     call-centre (AGENT_BPO/INBOUND, mandatory-catalogue aware) and a
//     technical (DEVELOPER/TECH) agent — achievement math per unit type,
//     cross-team 403, correction idempotency (master prompt §6 + §12).
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
import { createHash, createHmac, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-kpi-2026";
const D2 = new Date().toISOString().slice(0, 10);

const AGENT = { email: "kpi-agent@kallmania.test", fullName: "E2E KPI Agent", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-KPI-1", country: "NG", state: "Enugu" };
const LEAD = { email: "kpi-lead@kallmania.test", fullName: "E2E KPI Lead", role: "TEAM_LEAD", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-KPI-2", country: "NG", state: "Enugu" };
const OTHER = { email: "kpi-other@kallmania.test", fullName: "E2E KPI Other Agent", role: "SOCIAL_MEDIA", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-KPI-3", country: "NG", state: "Enugu" };
const CCAGENT = { email: "kpi-cc@kallmania.test", fullName: "E2E KPI Call Centre Agent", role: "AGENT_BPO", department: "BPO", team: "INBOUND", employeeId: "E2E-KPI-5" };
const TECHAGENT = { email: "kpi-tech@kallmania.test", fullName: "E2E KPI Tech Agent", role: "DEVELOPER", department: "TECHNICAL", team: "TECH", employeeId: "E2E-KPI-6" };
const OUTAGENT = { email: "kpi-outbound@kallmania.test", fullName: "E2E KPI Outbound Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-KPI-7" };
const SUP = { email: "kpi-supervisor@kallmania.test", fullName: "E2E KPI Supervisor", role: "SUPERVISOR", department: "BPO", team: null, employeeId: "E2E-KPI-8" };
const ADMIN = { email: "kpi-admin@kallmania.test", fullName: "E2E KPI Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-KPI-4", country: "NG", state: "Enugu" };
const ALL = [AGENT, LEAD, OTHER, ADMIN, CCAGENT, TECHAGENT, OUTAGENT, SUP];
const E2E_EMAILS = ALL.map((u) => u.email);

let failures = 0;
function check(name: string, cond: unknown, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}
const nowTs = () => String(Math.floor(Date.now() / 1000));

async function login(u: { email: string; password?: string }) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: u.email, password: u.password ?? PASSWORD }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`login failed for ${u.email}: ${await res.text()}`);
  return cookie;
}

async function call(cookie: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", cookie, ...(init?.headers ?? {}) },
  });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function postEvent(key: string, secret: string, body: unknown) {
  const raw = JSON.stringify(body);
  const res = await fetch(`${BASE}/api/integrations/sbts/v1/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-SBTS-Signature": sign(secret, raw), "X-SBTS-Timestamp": nowTs() },
    body: raw,
  });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function purge() {
  const users = await db.user.findMany({ where: { email: { in: E2E_EMAILS } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.kpiResult.deleteMany({ where: { userId: { in: ids } } });
    await db.report.deleteMany({ where: { userId: { in: ids } } });
    await db.sbtsEvent.deleteMany({ where: { OR: [{ userId: { in: ids } }, { agentEmail: { in: E2E_EMAILS } }] } });
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
    await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  }
  await db.sbtsCredential.deleteMany({ where: { label: { startsWith: "E2E-KPI" } } });
  // Straggler retry: lazy writers (push queue drain) can insert a row a moment
  // after the deletes above — purge again until the FKs let go.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.user.deleteMany({ where: { email: { in: E2E_EMAILS } } });
      return;
    } catch {
      const again = await db.user.findMany({ where: { email: { in: E2E_EMAILS } }, select: { id: true } });
      const ids2 = again.map((u) => u.id);
      if (!ids2.length) return;
      await db.pushEvent.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await db.pushSubscription.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await db.activityEvent.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  await db.user.deleteMany({ where: { email: { in: E2E_EMAILS } } }).catch(() => {});
}

async function main() {
  await purge();

  // ── SEED ─────────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of ALL) await db.user.create({ data: { ...u, passwordHash, status: "APPROVED" } });
  const agentId = (await db.user.findUnique({ where: { email: AGENT.email } }))!.id;
  const leadId = (await db.user.findUnique({ where: { email: LEAD.email } }))!.id;
  const otherId = (await db.user.findUnique({ where: { email: OTHER.email } }))!.id;
  const adminId = (await db.user.findUnique({ where: { email: ADMIN.email } }))!.id;
  const ccId = (await db.user.findUnique({ where: { email: CCAGENT.email } }))!.id;
  const techId = (await db.user.findUnique({ where: { email: TECHAGENT.email } }))!.id;
  const outId = (await db.user.findUnique({ where: { email: OUTAGENT.email } }))!.id;
  const supId = (await db.user.findUnique({ where: { email: SUP.email } }))!.id;

  const KEY = `E2EKPIKEY${randomBytes(24).toString("hex")}`;
  const SECRET = randomBytes(32).toString("hex");
  await db.sbtsCredential.create({
    data: { label: "E2E-KPI-MAIN", keyHash: createHash("sha256").update(KEY).digest("hex"), keyHint: "e2e…KPI", secret: SECRET },
  });

  const agentCookie = await login(AGENT);
  const leadCookie = await login(LEAD);
  const otherCookie = await login(OTHER);
  const adminCookie = await login(ADMIN);
  const ccCookie = await login(CCAGENT);
  const techCookie = await login(TECHAGENT);
  const outCookie = await login(OUTAGENT);
  const supCookie = await login(SUP);

  const socialMetrics = [
    { key: "postsCreated", label: "Content Published", target: 5, targetLabel: "5", actual: 7, variance: 2, unit: "count", category: "CORE", auto: false, notes: "" },
    { key: "reachImpressions", label: "Reach / Impressions", target: 10000, targetLabel: "10000", actual: 8500, variance: -1500, unit: "count", category: "CORE", auto: false, notes: "" },
    { key: "commentsDMs", label: "Comments & DMs Handled", target: 40, targetLabel: "40", actual: null, variance: null, unit: "count", category: "CORE", auto: false, notes: "" },
  ];

  console.log("── 1. AGENT REPORT → KPI RECORDS ──");
  let reportId = "";
  {
    // Draft first — a draft must NOT create KPI records.
    const draft = await call(agentCookie, "/api/reports", { method: "POST", body: JSON.stringify({ type: "SOCIAL", reportDate: D2, kpiMetrics: socialMetrics, submit: false }) });
    check("draft saved", draft.status === 200 || draft.status === 201, JSON.stringify(draft.json).slice(0, 120));
    reportId = String((draft.json as { report?: { id: string } }).report?.id);
    const afterDraft = await call(agentCookie, "/api/kpi/results?period=day");
    check("draft creates ZERO KPI records", (afterDraft.json as { count: number }).count === 0, JSON.stringify(afterDraft.json).slice(0, 140));

    const sub = await call(agentCookie, "/api/reports", { method: "POST", body: JSON.stringify({ id: reportId, type: "SOCIAL", reportDate: D2, kpiMetrics: socialMetrics, submit: true }) });
    check("report submitted", sub.status === 200, JSON.stringify(sub.json).slice(0, 160));

    const recs = await call(agentCookie, "/api/kpi/results?period=day") as unknown as { status: number; json: { count: number; records: { kpiKey: string; label: string; target: number | null; actual: number | null; achievement: number | null; statusLabel: string | null; verification: string; source: string; report: { ref: string } | null }[]; summary: { kpiKey: string; actualTotal: number }[] } };
    check("submission created KPI records for filled metrics only", recs.json.count === 2, `count=${recs.json.count}`);
    check("record linked to the report ref", recs.json.records.every((r) => r.report?.ref), JSON.stringify(recs.json.records[0]));
    check("missing value never faked (commentsDMs absent)", !recs.json.records.some((r) => r.kpiKey === "commentsDMs"));
    const posts = recs.json.records.find((r) => r.kpiKey === "postsCreated");
    check("achievement computed (7/5 = 140% MET)", posts?.achievement === 140 && posts?.statusLabel === "MET", JSON.stringify(posts));
    const reach = recs.json.records.find((r) => r.kpiKey === "reachImpressions");
    check("below-target flagged (8500/10000 = 85% ON_TRACK)", reach?.achievement === 85 && reach?.statusLabel === "ON_TRACK");
    check("source is REPORT and verification SUBMITTED", recs.json.records[0]?.source === "REPORT" && recs.json.records[0]?.verification === "SUBMITTED");

    const drill = await call(agentCookie, `/api/users/${agentId}/kpi?period=day&date=${D2}`);
    const drillJson = drill.json as { kpiRecords?: unknown[]; kpiRecordSummary?: { kpiKey: string }[] };
    check("per-user KPI drill-down surfaces the records", Array.isArray(drillJson.kpiRecords) && drillJson.kpiRecords.length === 2);
    check("per-user drill-down roll-up present", (drillJson.kpiRecordSummary ?? []).some((s) => s.kpiKey === "postsCreated"));

    // Submitting again without changes must not duplicate (idempotent upsert).
    await call(agentCookie, "/api/reports", { method: "POST", body: JSON.stringify({ id: reportId, type: "SOCIAL", reportDate: D2, kpiMetrics: socialMetrics }) }); // correction save (still SUBMITTED)
    const recs2 = await call(agentCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number } };
    check("correction re-materialization does not duplicate", recs2.json.count === 2, `count=${recs2.json.count}`);
  }

  console.log("── 2. REVIEW LIFECYCLE ──");
  {
    const rej = await call(adminCookie, "/api/reports", { method: "PATCH", body: JSON.stringify({ id: reportId, decision: "reject", feedback: "numbers need checking" }) });
    check("admin rejected the report", rej.status === 200);
    const afterRej = await call(agentCookie, "/api/kpi/results?period=day") as unknown as { json: { records: { verification: string }[] } };
    check("records marked REJECTED on return", afterRej.json.records.every((r) => r.verification === "REJECTED"));

    // Correct + resubmit: same keys, new value → revision bump, previousActual kept
    socialMetrics[1].actual = 9200;
    await call(agentCookie, "/api/reports", { method: "POST", body: JSON.stringify({ id: reportId, type: "SOCIAL", reportDate: D2, kpiMetrics: socialMetrics, submit: false }) }); // REJECTED → DRAFT
    const resub = await call(agentCookie, "/api/reports", { method: "POST", body: JSON.stringify({ id: reportId, type: "SOCIAL", reportDate: D2, kpiMetrics: socialMetrics, submit: true }) });
    check("resubmitted after correction", resub.status === 200);
    const after = await call(agentCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number; records: { kpiKey: string; revision: number; previousActual: number | null; actual: number | null; verification: string }[] } };
    const reach = after.json.records.find((r) => r.kpiKey === "reachImpressions");
    check("no duplicates after full lifecycle (still 2)", after.json.count === 2, `count=${after.json.count}`);
    check("correction bumped revision with previousActual", reach?.revision === 2 && reach?.previousActual === 8500 && reach?.actual === 9200, JSON.stringify(reach));
    check("records back to SUBMITTED", after.json.records.every((r) => r.verification === "SUBMITTED"));

    const appr = await call(adminCookie, "/api/reports", { method: "PATCH", body: JSON.stringify({ id: reportId, decision: "approve" }) });
    check("admin approved the report", appr.status === 200);
    const afterAppr = await call(agentCookie, "/api/kpi/results?period=day") as unknown as { json: { records: { verification: string }[] } };
    check("records marked APPROVED", afterAppr.json.records.every((r) => r.verification === "APPROVED"));
  }

  console.log("── 3. MEDIA SCOREBOARD → KPI RECORDS (idempotent) ──");
  {
    const eventId = `e2e-kpi-score-${Date.now()}`;
    const evt = { eventId, type: "performance.score" as const, agent: { email: AGENT.email }, date: D2, score: 72.5, delta: 3.5, components: { content: 28.5, engagement: 24, consistency: 20 } };
    const r1 = await postEvent(KEY, SECRET, evt);
    check("score event stored+mapped", r1.status === 200 && (r1.json as { results: { status: string }[] }).results[0].status === "stored");
    const recs = await call(agentCookie, "/api/kpi/results?period=day&source=SBTS") as unknown as { json: { records: { kpiKey: string; label: string; target: number | null; statusLabel: string | null; actual: number | null; source: string; sbtsEvent: { eventId: string } | null }[] } };
    check("SBTS headline record written", recs.json.records.some((r) => r.kpiKey === "sbts_score" && r.actual === 72.5));
    check("SBTS component records written (3)", recs.json.records.filter((r) => r.kpiKey.startsWith("sbts_") && r.kpiKey !== "sbts_score").length === 3, JSON.stringify(recs.json.records.map((r) => r.kpiKey)));
    check("SBTS records linked to the event id", recs.json.records.every((r) => r.sbtsEvent?.eventId === eventId));
    const headline = recs.json.records.find((r) => r.kpiKey === "sbts_score");
    check("SBTS records honest NO_TARGET (no invented targets)", headline?.target === null && headline?.statusLabel === "NO_TARGET", JSON.stringify(headline));

    const r2 = await postEvent(KEY, SECRET, evt); // same eventId — replay
    check("replayed event reported duplicate", (r2.json as { results: { status: string }[] }).results[0].status === "duplicate");
    const recs2 = await call(agentCookie, "/api/kpi/results?period=day&source=SBTS") as unknown as { json: { records: unknown[] } };
    check("replay did NOT inflate KPI records", recs2.json.records.length === recs.json.records.length, `before=${recs.json.records.length} after=${recs2.json.records.length}`);

    // §5 integration reliability — admin error notifications (deduped).
    const ghostEvt = { eventId: `${eventId}-ghost`, type: "performance.score" as const, agent: { email: "kpi-ghost@nowhere.test" }, date: D2, score: 50 };
    const g1 = await postEvent(KEY, SECRET, ghostEvt);
    check("unmapped event stored flagged", g1.status === 200 && (g1.json as { results: { status: string; mapped?: boolean }[] }).results[0].status === "stored" && (g1.json as { results: { mapped?: boolean }[] }).results[0].mapped === false);
    const badEvt = { eventId: `${eventId}-bad`, type: "bogus.type", agent: { email: AGENT.email }, date: D2 };
    const b1 = await postEvent(KEY, SECRET, badEvt);
    check("invalid event rejected at item level (pipe stays 200)", b1.status === 200 && (b1.json as { results: { status: string; error?: string }[] }).results[0].status === "rejected", JSON.stringify((b1.json as { results: { error?: string }[] }).results[0]?.error));
    const adminNotifs = await db.notification.findMany({ where: { userId: adminId, type: { in: ["SBTS_UNMAPPED_AGENT", "SBTS_EVENT_REJECTED"] } } });
    check("admin notified of unmapped agent", adminNotifs.some((n) => n.type === "SBTS_UNMAPPED_AGENT" && n.message.includes("kpi-ghost@nowhere.test")));
    check("admin notified of rejected event", adminNotifs.some((n) => n.type === "SBTS_EVENT_REJECTED" && n.message.includes(`${eventId}-bad`)));
    await postEvent(KEY, SECRET, ghostEvt); // identical replays must NOT stack pings
    await postEvent(KEY, SECRET, badEvt);
    const adminNotifs2 = await db.notification.findMany({ where: { userId: adminId, type: { in: ["SBTS_UNMAPPED_AGENT", "SBTS_EVENT_REJECTED"] } } });
    check("notification dedupeKey stops replay spam", adminNotifs2.length === adminNotifs.length, `before=${adminNotifs.length} after=${adminNotifs2.length}`);
  }

  console.log("── 4. EXTERNAL SITE REPORT + TEMPLATE ──");
  {
    const eventId = `e2e-kpi-report-${Date.now()}`;
    const template = "SOCIAL MEDIA DAILY REPORT\n1. Posts published\n2. Engagement handled\n3. Challenges";
    const evt = { eventId, type: "daily.report" as const, agent: { email: AGENT.email }, date: D2, report: "Published 3 posts, handled 22 comments, boosted reach.", template };
    const r1 = await postEvent(KEY, SECRET, evt);
    check("daily.report with template stored+mapped", r1.status === 200 && (r1.json as { results: { status: string; mapped?: boolean }[] }).results[0].status === "stored");

    const arch = await call(adminCookie, "/api/archive?sourceType=SBTS_IMPORT") as unknown as { json: { reports: { ref: string; template: string | null; kpiRecordCount: number; pipelineStatus: string }[] } };
    const imported = arch.json.reports.find((r) => r.ref === `SBTS-${eventId}`);
    check("external report lands in the archive (source filter)", !!imported, JSON.stringify(arch.json.reports.map((r) => r.ref)).slice(0, 120));
    check("template associated with the archived report", imported?.template === "SBTS supplied template", imported?.template ?? "none");
    check("flagged for review (AWAITING_VERIFICATION)", imported?.pipelineStatus === "AWAITING_VERIFICATION");
    check("free text fabricates NO KPI records", imported?.kpiRecordCount === 0);

    const rep = await db.report.findUnique({ where: { ref: `SBTS-${eventId}` } });
    const recsByReport = await call(adminCookie, `/api/kpi/results?reportId=${rep!.id}`) as unknown as { json: { count: number } };
    check("report-scoped record lookup works (0 rows)", recsByReport.json.count === 0);

    // Replay cannot recreate the archive row (unique ref, duplicate event).
    const r2 = await postEvent(KEY, SECRET, evt);
    check("daily.report replay is duplicate", (r2.json as { results: { status: string }[] }).results[0].status === "duplicate");
    const copies = await db.report.count({ where: { ref: `SBTS-${eventId}` } });
    check("no duplicate archive entries on replay", copies === 1);

    // The SBTS copy must NOT block the agent's own submission for the same day:
    // remove the approved report, then file a fresh one — the SBTS_IMPORT copy
    // is excluded from the duplicate guard.
    await call(adminCookie, `/api/reports?id=${reportId}`, { method: "DELETE" });
    const fresh = await call(agentCookie, "/api/reports", { method: "POST", body: JSON.stringify({ type: "SOCIAL", reportDate: D2, kpiMetrics: socialMetrics, submit: true }) });
    check("agent can still file own report despite SBTS copy", fresh.status === 200 || fresh.status === 201, JSON.stringify(fresh.json).slice(0, 160));
    reportId = String((fresh.json as { report?: { id: string } }).report?.id);
  }

  console.log("── 5. TEAM LEAD PERSONAL PERFORMANCE ──");
  {
    const payload = {
      sections: {
        position: "On duty",
        "team-kpis": { teamTotalCalls: 250, teamCallsConnected: 180, teamContactRate: 72 },
        escalations: "",
        "action-plan": "Follow up on hot leads.",
      },
    };
    const tlSub = await call(leadCookie, "/api/reports", { method: "POST", body: JSON.stringify({ type: "TEAM_LEAD", reportDate: D2, department: "SOCIAL_MEDIA", payload: JSON.stringify(payload), submit: true }) });
    check("lead report submitted", tlSub.status === 200 || tlSub.status === 201, JSON.stringify(tlSub.json).slice(0, 160));
    const tlReportId = String((tlSub.json as { report?: { id: string } }).report?.id);

    const tlRecs = await call(leadCookie, "/api/kpi/results?period=day&source=TL_REPORT") as unknown as { json: { count: number; records: { kpiKey: string; label: string; source: string }[] } };
    check("lead metrics materialized as PERSONAL records", tlRecs.json.count === 3, `count=${tlRecs.json.count}`);
    check("personal records carry TL_REPORT source", tlRecs.json.records.every((r) => r.source === "TL_REPORT"));

    const perf = await call(leadCookie, "/api/sbts/tl-performance") as unknown as { status: number; json: { lead: { fullName: string }; todayStatus: string; compliance: { submittedDays: number }; kpiBreakdown: { kpiKey: string; label: string; actualTotal: number; days: number }[]; history: { ref: string }[] } };
    check("My Team Lead Performance endpoint works", perf.status === 200);
    check("personal panel shows today's report as SUBMITTED", perf.json.todayStatus === "SUBMITTED", perf.json.todayStatus);
    check("compliance counts today's filing", perf.json.compliance.submittedDays >= 1);
    check("KPI breakdown has the reported metrics", perf.json.kpiBreakdown.some((k) => k.kpiKey === "team-kpis.teamTotalCalls" && k.actualTotal === 250), JSON.stringify(perf.json.kpiBreakdown));
    check("history lists the lead's own reports", perf.json.history.some((h) => h.ref), JSON.stringify(perf.json.history).slice(0, 100));

    // Text/textarea sections must not become records (only numeric metrics)
    const weird = tlRecs.json.records.filter((r) => r.kpiKey.includes("position") || r.kpiKey.includes("action-plan"));
    check("text sections never become KPI records", weird.length === 0, JSON.stringify(tlRecs.json.records.map((r) => r.kpiKey)));

    void tlReportId;
  }

  console.log("── 6. ARCHIVE INTEGRATION & CASCADE ──");
  {
    const arch = await call(adminCookie, `/api/archive?userId=${agentId}`) as unknown as { json: { reports: { id: string; kpiRecordCount: number; sourceType: string }[]; stats: { kpiRecords: number } } };
    const mine = arch.json.reports.find((r) => r.id === reportId);
    check("archive row carries KPI record count", !!mine && mine.kpiRecordCount === 2, `count=${mine?.kpiRecordCount}`);
    check("archive stats include KPI record totals", (arch.json.stats?.kpiRecords ?? 0) >= 2);

    const before = await db.kpiResult.count({ where: { userId: agentId } });
    const del = await call(adminCookie, `/api/reports?id=${reportId}`, { method: "DELETE" });
    check("admin can delete a report", del.status === 200);
    const after = await db.kpiResult.count({ where: { userId: agentId } });
    check("deleting the report cascades its KPI records (SBTS rows survive)", after === before - 2, `before=${before} after=${after}`);
  }

  console.log("── 7. SECURITY ──");
  {
    const s1 = await call(agentCookie, "/api/sbts/tl-performance").then((r) => r.status);
    check("agent CANNOT access a lead's private panel", s1 === 403, `status=${s1}`);
    const s1b = await call(adminCookie, "/api/sbts/tl-performance").then((r) => r.status);
    check("admin also excluded from the lead-only panel", s1b === 403, `status=${s1b}`);

    const s2 = await call(agentCookie, `/api/kpi/results?userId=${otherId}&period=day`).then((r) => r.status);
    check("agent cannot read another agent's records", s2 === 403, `status=${s2}`);
    const s3 = await call(agentCookie, `/api/kpi/results?userId=${leadId}&period=day`).then((r) => r.status);
    check("agent cannot read a lead's personal records", s3 === 403, `status=${s3}`);
    const s4 = await call(leadCookie, `/api/kpi/results?userId=${agentId}&period=day`).then((r) => r.status);
    check("lead can view own-centre agent records", s4 === 200, `status=${s4}`);
    const s5 = await call(adminCookie, `/api/kpi/results?userId=${leadId}&period=day`).then((r) => r.status);
    check("admin can view any records", s5 === 200, `status=${s5}`);
    const s6 = await call(agentCookie, "/api/archive").then((r) => r.status);
    check("archive stays supervisor/admin only", s6 === 403, `status=${s6}`);
    const s7 = await call(otherCookie, `/api/kpi/results?userId=${otherId}&period=day`).then((r) => r.status);
    check("self access always allowed", s7 === 200, `status=${s7}`);
    void leadId;
  }

  console.log("── 8. ALL-TEAM PIPELINE (master §6/§12: call centre + technical) ──");
  {
    // AGENT_BPO submit-validation fills every mandatory GLOBAL catalogue key
    // the production DB requires (the CC agent has no centre → global scope;
    // centre overrides are NOT included — resolveKpiCatalogue merges those
    // only for centre-bound owners, and feeding them twice for one key would
    // legitimately bump revisions). One custom metric for exact math.
    const mandatory = await db.kpiConfig.findMany({ where: { department: "INBOUND", centreCountry: "ALL", centreState: "ALL", mandatory: true, active: true } });
    const ccMetrics = [
      ...mandatory.map((c) => ({ key: c.key, label: c.label, target: c.defaultTarget ?? 1, targetLabel: String(c.defaultTarget ?? 1), actual: c.defaultTarget ?? 1, variance: 0, unit: (c.unit as "count" | "percent" | "minutes") ?? "count", category: "CORE", auto: false, notes: "" })),
      { key: "callsHandled", label: "Calls Handled", target: 50, targetLabel: "50", actual: 60, variance: 10, unit: "count" as const, category: "CORE", auto: false, notes: "" },
    ];
    const ccSub = await call(ccCookie, "/api/reports", { method: "POST", body: JSON.stringify({ type: "AGENT_BPO", reportDate: D2, kpiMetrics: ccMetrics, attendanceStatus: "Present", submit: true }) });
    check("call-centre report submitted", ccSub.status === 200 || ccSub.status === 201, JSON.stringify(ccSub.json).slice(0, 200));
    const ccReportId = String((ccSub.json as { report?: { id: string } }).report?.id);
    const ccRecs = await call(ccCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number; records: { kpiKey: string; achievement: number | null; statusLabel: string | null; source: string; verification: string }[] } };
    const ccCalls = ccRecs.json.records.find((r) => r.kpiKey === "callsHandled");
    check("call-centre KPI records materialize", ccCalls !== undefined && ccRecs.json.count >= 1, `count=${ccRecs.json.count} mandatory=${mandatory.length}`);
    check("call-centre achievement math (60/50 = 120% MET)", ccCalls?.achievement === 120 && ccCalls?.statusLabel === "MET", JSON.stringify(ccCalls));
    check("call-centre records carry REPORT source + SUBMITTED verification", ccCalls?.source === "REPORT" && ccCalls?.verification === "SUBMITTED");

    const techMetrics = [
      { key: "ticketsResolved", label: "Tickets Resolved", target: 20, targetLabel: "20", actual: 15, variance: -5, unit: "count" as const, category: "CORE", auto: false, notes: "" },
      { key: "uptimePct", label: "Uptime", target: 99, targetLabel: "99", actual: 99.8, variance: 0.8, unit: "percent" as const, category: "CORE", auto: false, notes: "" },
    ];
    const techSub = await call(techCookie, "/api/reports", { method: "POST", body: JSON.stringify({ type: "TECH", reportDate: D2, kpiMetrics: techMetrics, submit: true }) });
    check("technical report submitted", techSub.status === 200 || techSub.status === 201, JSON.stringify(techSub.json).slice(0, 200));
    const techRecs = await call(techCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number; records: { kpiKey: string; achievement: number | null; statusLabel: string | null }[] } };
    const tickets = techRecs.json.records.find((r) => r.kpiKey === "ticketsResolved");
    const up = techRecs.json.records.find((r) => r.kpiKey === "uptimePct");
    check("technical KPI records materialize (both metrics)", techRecs.json.count === 2, `count=${techRecs.json.count}`);
    check("technical below-target labelled (15/20 = 75% BELOW_TARGET)", tickets?.achievement === 75 && tickets?.statusLabel === "BELOW_TARGET", JSON.stringify(tickets));
    check("technical percent math (99.8/99 = 100.81% MET)", up?.achievement === 100.81 && up?.statusLabel === "MET", JSON.stringify(up));

    // Drill-down shows only own team's keys; cross-team read stays blocked.
    const ccKeys = new Set(ccMetrics.map((m) => m.key));
    const ccOwn = (ccRecs.json.records ?? []).every((r) => ccKeys.has(r.kpiKey));
    check("call-centre drill-down returns only own metrics", ccOwn);
    const cross = await call(ccCookie, `/api/kpi/results?userId=${techId}&period=day`).then((r) => r.status);
    check("cross-team record read blocked (403)", cross === 403, `status=${cross}`);
    const techDrill = await call(techCookie, `/api/users/${techId}/kpi?period=day&date=${D2}`) as unknown as { json: { kpiRecords?: unknown[] } };
    check("technical per-user drill-down surfaces records", Array.isArray(techDrill.json.kpiRecords) && techDrill.json.kpiRecords.length === 2);

    // Correction re-materialization stays idempotent per team.
    await call(ccCookie, "/api/reports", { method: "POST", body: JSON.stringify({ id: ccReportId, type: "AGENT_BPO", reportDate: D2, kpiMetrics: ccMetrics, attendanceStatus: "Present" }) });
    const ccRecs2 = await call(ccCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number } };
    check("call-centre correction does not duplicate", ccRecs2.json.count === ccRecs.json.count, `before=${ccRecs.json.count} after=${ccRecs2.json.count}`);

    // OUTBOUND call centre — same AGENT_BPO path, different team. Its
    // mandatory catalogue (cfgDept "BPO" for non-INBOUND teams) must be
    // satisfied the same way before submit is accepted.
    const outMandatory = await db.kpiConfig.findMany({ where: { department: "BPO", centreCountry: "ALL", centreState: "ALL", mandatory: true, active: true } });
    const outSub = await call(outCookie, "/api/reports", { method: "POST", body: JSON.stringify({
      type: "AGENT_BPO", reportDate: D2, attendanceStatus: "Present", submit: true,
      kpiMetrics: [
        ...outMandatory.map((c) => ({ key: c.key, label: c.label, target: c.defaultTarget ?? 1, targetLabel: String(c.defaultTarget ?? 1), actual: c.defaultTarget ?? 1, variance: 0, unit: (c.unit as "count" | "percent" | "minutes") ?? "count", category: "CORE", auto: false, notes: "" })),
        { key: "outboundCallsMade", label: "Outbound Calls Made", target: 80, targetLabel: "80", actual: 96, variance: 16, unit: "count", category: "CORE", auto: false, notes: "" },
      ],
    }) });
    check("outbound report submitted", outSub.status === 200 || outSub.status === 201, JSON.stringify(outSub.json).slice(0, 200));
    const outRecs = await call(outCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number; records: { kpiKey: string; achievement: number | null; statusLabel: string | null; revision: number; previousActual: number | null }[] } };
    const outMade = outRecs.json.records.find((r) => r.kpiKey === "outboundCallsMade");
    check("outbound KPI records materialize (96/80 = 120% MET)", outMade?.achievement === 120 && outMade?.statusLabel === "MET", JSON.stringify(outRecs.json));
    check("first submission lands at revision 1 (no double materialization)", outRecs.json.records.every((r) => r.revision === 1 && r.previousActual === null), JSON.stringify(outRecs.json.records.map((r) => [r.kpiKey, r.revision, r.previousActual])));
    void outId;

    // SUPERVISOR reports carry consolidated TEAM metrics — per the §7C
    // separation principle those numbers must never become the supervisor's
    // PERSONAL KPI records (same rule as team leads).
    const supSub = await call(supCookie, "/api/reports", { method: "POST", body: JSON.stringify({ type: "SUPERVISOR", reportDate: D2, kpiMetrics: [{ key: "totalCallsMade", label: "Total Calls Made (Team)", target: 500, targetLabel: "500", actual: 610, variance: 110, unit: "count", category: "CORE", auto: false, notes: "" }], attendanceStatus: "Present", submit: true }) });
    check("supervisor report submitted", supSub.status === 200 || supSub.status === 201, JSON.stringify(supSub.json).slice(0, 200));
    const supRecs = await call(supCookie, "/api/kpi/results?period=day") as unknown as { json: { count: number } };
    check("team numbers never become the supervisor's personal records", supRecs.json.count === 0, `count=${supRecs.json.count}`);
    const supArchived = await db.report.findFirst({ where: { userId: supId, type: "SUPERVISOR", reportDate: new Date(D2 + "T00:00:00.000Z") }, select: { ref: true, status: true, sourceType: true } });
    check("supervisor report still archived with team data", !!supArchived && supArchived.status === "SUBMITTED", JSON.stringify(supArchived));
  }

  console.log("── CLEANUP ──");
  await purge();
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => { console.error("FATAL", e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
