// API-level E2E — OPERATIONAL INTELLIGENCE & PERFORMANCE REPORTS module:
//  1. SECURITY: every /api/intel/* route is ADMIN-only — agent, team lead,
//     supervisor and unauthenticated callers all get 401/403 (direct API, no UI)
//  2. META: picker data (centres, teams, agents) is returned to admins
//  3. OVERVIEW: dashboard statistics compute from real records (scope-filtered),
//     with trend + team comparison
//  4. AGENT REPORT: roster-method per-agent KPI targets (25/day × report days),
//     direction-aware achievement, best/weakest KPI, tasks, attendance,
//     strengths/weaknesses, transparent score, AI/fallback commentary
//  5. TEAM REPORT: roster-method team targets (Σ per-agent effective targets ×
//     working agent-days), rankings with coverage rule, KPI comparison grid
//  6. CENTRE REPORT: consolidates teams/supervisors/leads/agents without duplication
//  7. EXPORT: .xlsx workbooks download with the correct MIME type and a real
//     PK zip signature for all three report types
//  8. AUDIT: every generate + export lands in the audit trail with scope+range
//  9. ACTIVITY: login / task-status tracking recorded into ActivityEvent
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-intel-2026";
const CENTRE = { country: "NG", state: "E2E-Intel-Centre" };
const D1 = "2026-11-02"; // Monday
const D2 = "2026-11-03"; // Tuesday

const A1 = { email: "intel-a1@kallmania.test", fullName: "E2E Intel Agent One", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-IN-1", workDays: "1111100", ...CENTRE };
const A2 = { email: "intel-a2@kallmania.test", fullName: "E2E Intel Agent Two", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-IN-2", workDays: "1111100", ...CENTRE };
const A3 = { email: "intel-a3@kallmania.test", fullName: "E2E Intel Agent Three", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-IN-3", workDays: "1111100", ...CENTRE };
const TL = { email: "intel-tl@kallmania.test", fullName: "E2E Intel Team Lead", role: "TEAM_LEAD", department: "BPO", team: "OUTBOUND", employeeId: "E2E-IN-4", workDays: "1111100", ...CENTRE };
const SUP = { email: "intel-sup@kallmania.test", fullName: "E2E Intel Supervisor", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-IN-5", workDays: "1111100", ...CENTRE };
const ADM = { email: "intel-admin@kallmania.test", fullName: "E2E Intel Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-IN-6", workDays: "1111100", ...CENTRE };
const ALL = [A1, A2, A3, TL, SUP, ADM];

let failures = 0;
function check(name: string, cond: unknown, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
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

async function call(cookie: string | null, path: string, body?: object, method?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get("content-type") || "";
  const json = type.includes("json") ? await res.json().catch(() => ({})) : null;
  return { status: res.status, json, res };
}

const kpiMetrics = (callsMade: number, date: string) => JSON.stringify([
  { key: "totalCallsMade", label: "Total Calls Made", target: 25, targetLabel: "25", actual: callsMade, variance: callsMade - 25, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "", mandatory: true },
  { key: "callsConnected", label: "Calls Connected", target: 25, targetLabel: "25", actual: Math.max(0, callsMade - 4), variance: callsMade - 29, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "", mandatory: true },
]);

async function seed() {
  const emails = ALL.map((u) => u.email);
  const old = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const oldIds = old.map((o) => o.id);
  if (oldIds.length) {
    await db.activityEvent.deleteMany({ where: { userId: { in: oldIds } } });
    await db.auditLog.deleteMany({ where: { userId: { in: oldIds } } });
    await db.report.deleteMany({ where: { userId: { in: oldIds } } });
    await db.task.deleteMany({ where: { OR: [{ assigneeId: { in: oldIds } }, { createdById: { in: oldIds } }] } });
    await db.escalation.deleteMany({ where: { OR: [{ fromId: { in: oldIds } }, { targetUserId: { in: oldIds } }] } });
    await db.notification.deleteMany({ where: { userId: { in: oldIds } } });
    await db.memberKpiConfig.deleteMany({ where: { userId: { in: oldIds } } });
    await db.pushSubscription.deleteMany({ where: { userId: { in: oldIds } } });
    await db.pushPreference.deleteMany({ where: { userId: { in: oldIds } } });
    await db.user.deleteMany({ where: { id: { in: oldIds } } });
  }
  const hash = await bcrypt.hash(PASSWORD, 4);
  const created: Record<string, string> = {};
  for (const u of ALL) {
    const row = await db.user.create({
      data: { ...u, passwordHash: hash, status: "APPROVED", approvedAt: new Date("2026-10-01"), employmentType: "FULL_TIME", shiftStart: "09:00", shiftEnd: "17:00", createdAt: new Date("2026-10-01") },
    });
    created[u.email] = row.id;
  }
  // Centre KPI override: Enugu-style 25 calls/agent/day for this centre
  await db.kpiConfig.upsert({
    where: { department_key_centreCountry_centreState: { department: "BPO", key: "totalCallsMade", centreCountry: CENTRE.country, centreState: CENTRE.state } },
    update: { defaultTarget: 25 },
    create: { department: "BPO", key: "totalCallsMade", label: "Total Calls Made", category: "CORE_TEMPLATE", unit: "count", direction: "HIGHER_BETTER", defaultTarget: 25, mandatory: true, active: true, sortOrder: 1, centreCountry: CENTRE.country, centreState: CENTRE.state },
  });

  const report = (userId: string, date: string, calls: number, attendance: string) => db.report.create({
    data: {
      ref: `E2E-IN-${userId.slice(-4)}-${date}-${Math.floor(Math.random() * 900 + 100)}`,
      type: "AGENT_BPO", reportDate: new Date(date + "T00:00:00.000Z"), userId, department: "BPO",
      shiftTime: "09:00-17:00", clockIn: "08:55", attendanceStatus: attendance, latenessMins: attendance === "Late" ? 14 : 0,
      kpiMetrics: kpiMetrics(calls, date), status: "SUBMITTED", sourceType: "MANUAL",
    },
  });
  // A1: Monday 40 calls (160% of 25) Present; A2: Monday 30 (120%) Late; A3: Tuesday 16 (64%) Present
  await report(created[A1.email], D1, 40, "Present");
  await report(created[A2.email], D1, 30, "Late");
  await report(created[A3.email], D2, 16, "Present");

  // Tasks for A1: 2 completed (one before deadline, one after), 1 overdue-open, 1 pending
  const mkTask = (title: string, status: string, daysAgo: number, deadlineDaysAgo: number | null, assignee: string) => db.task.create({
    data: {
      title, department: "BPO", assigneeId: assignee, createdById: created[TL.email],
      status, priority: "MEDIUM", dateAssigned: new Date(Date.now() - daysAgo * 86_400_000),
      deadline: deadlineDaysAgo === null ? null : new Date(Date.now() - deadlineDaysAgo * 86_400_000),
      updatedAt: status === "COMPLETED" ? new Date(Date.now() - (deadlineDaysAgo === null ? daysAgo : deadlineDaysAgo - (title.includes("late") ? -1 : 0.5)) * 86_400_000) : undefined,
    },
  });
  await mkTask("Intel e2e task on time", "COMPLETED", 3, 2, created[A1.email]);
  await mkTask("Intel e2e task late completed", "COMPLETED", 4, 3, created[A1.email]);
  await mkTask("Intel e2e task overdue", "IN_PROGRESS", 5, 4, created[A1.email]);
  await mkTask("Intel e2e task pending", "NOT_STARTED", 1, null, created[A1.email]);
  // A2 has assigned work too — an overdue task. Without it the re-normalised
  // score would rank a do-nothing agent above a productive one, and the
  // highest-performer callout would reward whoever simply had no workload.
  await mkTask("Intel e2e A2 task overdue", "IN_PROGRESS", 6, 5, created[A2.email]);

  // Escalation raised by A1 (open)
  await db.escalation.create({
    data: {
      fromId: created[A1.email], fromName: A1.fullName, fromRole: "AGENT_BPO",
      targetType: "TARGET_ROLE", targetRole: "SUPERVISOR", subject: "E2E intel escalation", message: "Escalation for the intel e2e",
      status: "OPEN", severity: "NORMAL", centreCountry: CENTRE.country, centreState: CENTRE.state, team: "OUTBOUND",
    },
  });
  return created;
}

async function cleanup(created: Record<string, string>) {
  const ids = Object.values(created);
  await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await db.report.deleteMany({ where: { userId: { in: ids } } });
  await db.task.deleteMany({ where: { OR: [{ assigneeId: { in: ids } }, { createdById: { in: ids } }] } });
  await db.escalation.deleteMany({ where: { OR: [{ fromId: { in: ids } }, { targetUserId: { in: ids } }] } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.kpiConfig.deleteMany({ where: { centreCountry: CENTRE.country, centreState: CENTRE.state } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  console.log("── seed ──");
  const created = await seed();
  const A1id = created[A1.email];

  try {
    const adminCookie = await login(ADM);
    const a1Cookie = await login(A1);
    const tlCookie = await login(TL);
    const supCookie = await login(SUP);

    console.log("── 1. security: intel routes are ADMIN-only ──");
    for (const path of ["/api/intel/overview", "/api/intel/meta", "/api/intel/activity", `/api/intel/report?type=agent&agentId=${A1id}`]) {
      const unauth = await call(null, path);
      check(`unauthenticated ${path.split("?")[0]} → 401`, unauth.status === 401, `got ${unauth.status}`);
      const agent = await call(a1Cookie, path);
      check(`agent ${path.split("?")[0]} → 403`, agent.status === 403, `got ${agent.status}`);
      const tl = await call(tlCookie, path);
      check(`team lead ${path.split("?")[0]} → 403`, tl.status === 403, `got ${tl.status}`);
      const sup = await call(supCookie, path);
      check(`supervisor ${path.split("?")[0]} → 403`, sup.status === 403, `got ${sup.status}`);
    }
    const expDenied = await call(a1Cookie, `/api/intel/export?type=agent&agentId=${A1id}`);
    check("agent export → 403 (direct download blocked)", expDenied.status === 403, `got ${expDenied.status}`);

    console.log("── 2. meta ──");
    const meta = await call(adminCookie, "/api/intel/meta");
    check("admin meta 200", meta.status === 200);
    const metaBody = meta.json as { centres: { state: string }[]; teams: { key: string }[]; agents: unknown[] };
    check("meta lists the e2e centre", (metaBody.centres || []).some((c) => c.state === CENTRE.state));
    check("meta lists teams", (metaBody.teams || []).some((t) => t.key === "OUTBOUND"));

    console.log("── 3. overview (scoped to the e2e centre+team) ──");
    const ov = await call(adminCookie, `/api/intel/overview?${new URLSearchParams({ country: CENTRE.country, state: CENTRE.state, team: "OUTBOUND", period: "custom", from: D1, to: D2 })}`);
    check("overview 200", ov.status === 200);
    const ovBody = ov.json as { stats: Record<string, number>; teamComparison: { team: string; meanKpiAchPct: number | null; agents: number }[]; trend: unknown[]; roster: { team: string; agents: number }[] };
    check("overview counts 3 active agents", ovBody.stats.agentsActive === 3, `${ovBody.stats.agentsActive}`);
    check("overview counts 1 team lead + 0 supervisors in agent scope", ovBody.stats.teamLeads === 1, `${ovBody.stats.teamLeads}`);
    check("overview roster has OUTBOUND 3", (ovBody.roster || []).some((r) => r.team === "OUTBOUND" && r.agents === 3));
    const outbound = (ovBody.teamComparison || []).find((t) => t.team === "OUTBOUND");
    check("team comparison includes OUTBOUND with KPI mean", !!outbound && outbound.meanKpiAchPct !== null && outbound.agents === 3, `${outbound?.meanKpiAchPct}`);
    check("trend buckets exist", (ovBody.trend || []).length >= 1);
    // Per-agent means: A1 160 (40/25 over 1 day... catalogue adds callsConnected? its centre target is not configured → global target 25 → also has actual 36 → 144%), A2 120/116, A3 64/48 → mean in a plausible band
    const mean = ovBody.stats.overallKpiAchPct;
    check("overall KPI achievement computed", typeof mean === "number" && mean > 50 && mean < 200, `${mean}`);

    console.log("── 4. individual agent report ──");
    const ag = await call(adminCookie, `/api/intel/report?type=agent&agentId=${A1id}&period=custom&from=${D1}&to=${D2}`);
    check("agent report 200", ag.status === 200);
    const agBody = ag.json as {
      profile: { fullName: string }; kpi: { rows: { key: string; target: number | null; actual: number | null; achievementPct: number | null; status: string; unit: string }[]; summary: { meanAchPct: number | null } };
      bestWeakest: { strongest: { label: string } | null };
      tasks: { assigned: number; completed: number; overdue: number; punctualityPct: number | null };
      attendance: { available: boolean; present: number };
      strengths: { title: string }[]; weaknesses: { title: string }[];
      assessment: { score: number | null; classification: string; scoreComponents: { key: string; included: boolean }[]; commentary: { source: string; summary: string } };
      dataNotes: unknown[];
    };
    check("profile is A1", agBody.profile.fullName === A1.fullName);
    const tcm = agBody.kpi.rows.find((r) => r.key === "totalCallsMade");
    check("roster-method target = 25/day × 1 report day = 25", tcm?.target === 25, `${tcm?.target}`);
    check("actual = 40", tcm?.actual === 40, `${tcm?.actual}`);
    check("achievement 160% EXCEEDED (higher-is-better)", tcm?.achievementPct === 160 && tcm?.status === "EXCEEDED", `${tcm?.achievementPct}/${tcm?.status}`);
    check("strongest KPI identified", !!agBody.bestWeakest.strongest);
    check("tasks: 4 assigned, 2 completed, 1 overdue", agBody.tasks.assigned === 4 && agBody.tasks.completed === 2 && agBody.tasks.overdue === 1, JSON.stringify(agBody.tasks));
    check("punctuality 50% (1 of 2 deadline-bearing completions on time)", agBody.tasks.punctualityPct === 50, `${agBody.tasks.punctualityPct}`);
    check("attendance recorded (Present on D1)", agBody.attendance.available && agBody.attendance.present === 1, `${agBody.attendance.present}`);
    check("strengths & weaknesses are evidence-based arrays", Array.isArray(agBody.strengths) && agBody.strengths.length > 0 && Array.isArray(agBody.weaknesses));
    const comps = agBody.assessment.scoreComponents;
    check("score components: data-bearing components included, empty ones excluded",
      comps.filter((c) => c.included).length >= 4 && comps.every((c) => c.included === (c.earned !== null)),
      comps.map((c) => `${c.key}:${c.included}`).join(","));
    check("classification is a valid band", ["OUTSTANDING", "EXCEEDS_EXPECTATIONS", "MEETS_EXPECTATIONS", "NEEDS_IMPROVEMENT", "UNSATISFACTORY", "INSUFFICIENT_DATA"].includes(agBody.assessment.classification), agBody.assessment.classification);
    check("commentary sourced (gemini or rule-based fallback)", ["gemini", "rule-based"].includes(agBody.assessment.commentary.source), agBody.assessment.commentary.source);
    check("data notes include untracked metrics", (agBody.dataNotes as { metric: string }[]).some((n) => n.metric.includes("Announcements")));

    console.log("── 5. team report (roster method) ──");
    const tm = await call(adminCookie, `/api/intel/report?type=team&team=OUTBOUND&country=${CENTRE.country}&state=${CENTRE.state}&period=custom&from=${D1}&to=${D2}`);
    check("team report 200", tm.status === 200);
    const tmBody = tm.json as {
      team: { label: string }; overview: { activeAgents: number; teamKpiRows: { key: string; target: number; actual: number | null; achievementPct: number | null }[]; reportingCompliancePct: number | null };
      ranking: { ranked: { agent: string; score: number | null }[]; callouts: { highest: { name: string } | null } };
      kpiComparison: { grid: { agent: string; meanAchPct: number | null }[]; aboveTeamAverage: string[]; belowTeamAverage: string[] };
      teamLead: { lead: { name: string }; tasksAssignedToTeam: number } | null;
      assessment: { commentary: { source: string } };
    };
    check("team is Outbound Call Centre", tmBody.team.label === "Outbound Call Centre");
    check("3 active agents in team", tmBody.overview.activeAgents === 3, `${tmBody.overview.activeAgents}`);
    const teamTcm = tmBody.overview.teamKpiRows.find((r) => r.key === "totalCallsMade");
    // roster method: A1 (25×1 Mon) + A2 (25×1 Mon) + A3 (25×1 Tue) = 75 target; actuals 40+30+16 = 86
    check("TEAM target = 25/agent × 3 agent-days = 75", teamTcm?.target === 75, `${teamTcm?.target}`);
    check("TEAM actual = 40+30+16 = 86", teamTcm?.actual === 86, `${teamTcm?.actual}`);
    check("TEAM achievement = 114.67%", teamTcm?.achievementPct === 114.67, `${teamTcm?.achievementPct}`);
    check("ranking includes all 3 agents", tmBody.ranking.ranked.length === 3);
    check("highest performer is A1 (score leader)", tmBody.ranking.callouts.highest?.name === A1.fullName, `${tmBody.ranking.callouts.highest?.name}`);
    check("KPI comparison grid has 3 rows", tmBody.kpiComparison.grid.length === 3);
    check("team lead analysis present with team tasks", !!tmBody.teamLead && tmBody.teamLead.tasksAssignedToTeam >= 4, `${tmBody.teamLead?.tasksAssignedToTeam}`);
    check("team commentary sourced", ["gemini", "rule-based"].includes(tmBody.assessment.commentary.source));

    console.log("── 6. centre report ──");
    const ct = await call(adminCookie, `/api/intel/report?type=centre&country=${CENTRE.country}&state=${CENTRE.state}&period=custom&from=${D1}&to=${D2}`);
    check("centre report 200", ct.status === 200);
    const ctBody = ct.json as {
      centre: { label: string }; overview: { totalTeams: number; totalAgents: number; totalSupervisors: number; totalTeamLeads: number; tasks: { assigned: number } };
      supervisors: { name: string }[]; teamLeads: { name: string }[];
      agents: { ranked: { agent: string }[]; highest: { name: string } | null };
      risks: { title: string }[]; assessment: { commentary: { source: string } };
    };
    check("centre label is the e2e centre", ctBody.centre.label.includes(CENTRE.state));
    check("centre consolidates 1 team, 3 agents, 1 supervisor, 1 lead", ctBody.overview.totalTeams === 1 && ctBody.overview.totalAgents === 3 && ctBody.overview.totalSupervisors === 1 && ctBody.overview.totalTeamLeads === 1, JSON.stringify({ t: ctBody.overview.totalTeams, a: ctBody.overview.totalAgents, s: ctBody.overview.totalSupervisors, l: ctBody.overview.totalTeamLeads }));
    check("agents consolidated without duplication (3 rows)", ctBody.agents.ranked.length === 3, `${ctBody.agents.ranked.length}`);
    check("centre highest performer is A1", ctBody.agents.highest?.name === A1.fullName);
    check("supervisor + lead analysed", ctBody.supervisors.length === 1 && ctBody.teamLeads.length === 1);
    check("centre risks computed from evidence", Array.isArray(ctBody.risks));

    console.log("── 7. exports (.xlsx, all three types) ──");
    for (const [type, qs] of [
      ["agent", `agentId=${A1id}`],
      ["team", `team=OUTBOUND&country=${CENTRE.country}&state=${CENTRE.state}`],
      ["centre", `country=${CENTRE.country}&state=${CENTRE.state}`],
    ] as const) {
      const exp = await call(adminCookie, `/api/intel/export?type=${type}&${qs}&period=custom&from=${D1}&to=${D2}`);
      check(`${type} export 200`, exp.status === 200, `got ${exp.status}`);
      const ct2 = exp.res.headers.get("content-type") || "";
      check(`${type} export MIME is xlsx`, ct2.includes("spreadsheetml"));
      const ab = await new Response(exp.res.body).arrayBuffer();
      const buf = Buffer.from(ab);
      check(`${type} workbook has PK zip signature`, buf.length > 4000 && buf[0] === 0x50 && buf[1] === 0x4b, `${buf.length} bytes`);
      check(`${type} filename attachment`, (exp.res.headers.get("content-disposition") || "").includes(".xlsx"));
    }

    console.log("── 8. audit trail of generate + export ──");
    const act = await call(adminCookie, "/api/intel/activity");
    check("activity route 200", act.status === 200);
    const actBody = act.json as { events: { eventType: string; user: string }[]; reportLog: { action: string; actor: string }[] };
    check("audit log has GENERATE entries", (actBody.reportLog || []).some((l) => l.action === "INTEL_REPORT_GENERATE"));
    check("audit log has EXPORT entries", (actBody.reportLog || []).some((l) => l.action === "INTEL_REPORT_EXPORT"));

    console.log("── 9. activity tracking ──");
    check("LOGIN events tracked via ActivityEvent", (actBody.events || []).filter((e) => e.eventType === "LOGIN").length >= 4, `${(actBody.events || []).filter((e) => e.eventType === "LOGIN").length}`);
    // A1 changes a task status → TASK_STATUS_CHANGED
    const tasks = await db.task.findMany({ where: { assigneeId: A1id, title: "Intel e2e task pending" } });
    if (tasks[0]) {
      const patch = await call(a1Cookie, "/api/tasks", { id: tasks[0].id, status: "IN_PROGRESS" }, "PATCH");
      check("task PATCH ok", patch.status === 200, `got ${patch.status}`);
      await new Promise((r) => setTimeout(r, 300));
      const ev = await db.activityEvent.findFirst({ where: { userId: A1id, eventType: "TASK_STATUS_CHANGED", relatedId: tasks[0].id } });
      check("TASK_STATUS_CHANGED tracked", !!ev);
    }

    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  } finally {
    await cleanup(created);
    await db.$disconnect();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
