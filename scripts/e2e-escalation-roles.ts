// API-level E2E for ROLE-targeted escalations ("Escalate to a role"):
//  1. Recipients API returns ROLE options per author role — admins get every
//     role across ALL centres (management + agent roles, live counts),
//     supervisors/team leads get their centre's leadership tiers, agents get none
//  2. Admin (WITH a centre) routes to SUPERVISOR → EVERY supervisor in ALL
//     centres notified (the bug being fixed: it used to stop at the admin's centre)
//  3. Admin routes to TEAM_LEAD → all team leads notified; TL sees feed + detail,
//     supervisor does not see it; TL can ack (global route ⇒ may manage)
//  4. Admin routes to AGENT_BPO → agents of EVERY centre notified + visible to
//     them (feed + detail); TL/supervisors not notified; agent can ack
//  5. Centre-scoped routing for non-admin authors (supervisor → TEAM_LEAD = own centre only)
//  6. Authorization: agents cannot route to roles; supervisors cannot target
//     agent roles; unknown roles rejected; roles with no active occupants rejected
//  7. Thread semantics on role routes: before ack the WHOLE role hears author
//     replies; after ack notifications narrow to author ↔ handler; occupants are
//     read-only until they acknowledge; handler lifecycle (ack→in_progress→resolve
//     with note→close) works on a role-routed escalation
//  8. Named-recipient path regression (agents still escalate to a person by name)
//  9. Every test escalation is DELETED via the admin cascade so real users'
//     notification inboxes stay clean
const BASE = "http://localhost:3000";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── DATABASE_URL self-heal (mirrors src/lib/db.ts) ──
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-test-2026";
const CENTRE_A = { country: "NG", state: "Enugu" };
const CENTRE_B = { country: "NG", state: "Abuja Federal Capital Territory" };
const RADMIN = { email: "esc-role-e2e-admin@kallmania.test", fullName: "E2E Role Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-ROLE-AD", ...CENTRE_A };
const RSUP_A1 = { email: "esc-role-e2e-sup-a1@kallmania.test", fullName: "E2E Role Sup A1", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ROLE-SA1", ...CENTRE_A };
const RSUP_A2 = { email: "esc-role-e2e-sup-a2@kallmania.test", fullName: "E2E Role Sup A2", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ROLE-SA2", ...CENTRE_A };
const RSUP_B1 = { email: "esc-role-e2e-sup-b1@kallmania.test", fullName: "E2E Role Sup B1", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ROLE-SB1", ...CENTRE_B };
const RTL_A1 = { email: "esc-role-e2e-tl-a1@kallmania.test", fullName: "E2E Role Lead A1", role: "TEAM_LEAD", department: "BPO", team: "OUTBOUND", employeeId: "E2E-ROLE-TA1", ...CENTRE_A };
const RAG_A1 = { email: "esc-role-e2e-ag-a1@kallmania.test", fullName: "E2E Role Agent A1", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-ROLE-AA1", ...CENTRE_A };
const RAG_B1 = { email: "esc-role-e2e-ag-b1@kallmania.test", fullName: "E2E Role Agent B1", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-ROLE-AB1", ...CENTRE_B };
const RDEV_A1 = { email: "esc-role-e2e-dev-a1@kallmania.test", fullName: "E2E Role Dev A1", role: "DEVELOPER", department: "WEB_DEV", team: "TECH", employeeId: "E2E-ROLE-DA1", ...CENTRE_A };
// Synthetic centre C — used to test the empty-role guard WITHOUT touching real centres:
// the supervisor author stays APPROVED, the only TEAM_LEAD occupant is flipped to PENDING.
const CENTRE_C = { country: "NG", state: "E2E Role State" };
const RSUP_C1 = { email: "esc-role-e2e-sup-c1@kallmania.test", fullName: "E2E Role Sup C1", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-ROLE-SC1", ...CENTRE_C };
const RTL_C1 = { email: "esc-role-e2e-tl-c1@kallmania.test", fullName: "E2E Role Lead C1", role: "TEAM_LEAD", department: "BPO", team: "OUTBOUND", employeeId: "E2E-ROLE-TC1", ...CENTRE_C };
const ALL_USERS = [RADMIN, RSUP_A1, RSUP_A2, RSUP_B1, RTL_A1, RAG_A1, RAG_B1, RDEV_A1, RSUP_C1, RTL_C1];

let failures = 0;
function check(name: string, cond: unknown, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

async function login(u: { email: string; password: string }) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", ...u }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login failed: " + (await res.text()));
  return cookie;
}
async function call(cookie: string, path: string, body?: object, method = body ? "POST" : "GET") {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) as Record<string, unknown> };
}

/** Assert + remove a role-routed escalation (admin cascade deletes its notifications). */
async function consume(escId: string, adminCookie: string) {
  const del = await call(adminCookie, `/api/escalations?id=${escId}`, undefined, "DELETE");
  if (del.status !== 200) console.log(`WARN — cleanup delete of ${escId} returned ${del.status}`);
}
const notifsFor = (userId: string, escId: string) =>
  db.notification.count({ where: { userId, linkData: { contains: escId } } });

// ── Setup ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of ALL_USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team, role: u.role }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
const users = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } } });
const uid = (email: string) => users.find((u) => u.email === email)!.id;
const oldIds = users.map((u) => u.id);
// Clean slate from any previous run (test-user escalations + their notifications).
await db.escalation.deleteMany({ where: { OR: [{ fromId: { in: oldIds } }, { targetUserId: { in: oldIds } }] } });
await db.notification.deleteMany({ where: { userId: { in: oldIds } } });
await db.auditLog.deleteMany({ where: { userId: { in: oldIds } } });

const admin = await login({ email: RADMIN.email, password: PASSWORD });
const supA1 = await login({ email: RSUP_A1.email, password: PASSWORD });
const supA2 = await login({ email: RSUP_A2.email, password: PASSWORD });
const supB1 = await login({ email: RSUP_B1.email, password: PASSWORD });
const tlA1 = await login({ email: RTL_A1.email, password: PASSWORD });
const agA1 = await login({ email: RAG_A1.email, password: PASSWORD });
const agB1 = await login({ email: RAG_B1.email, password: PASSWORD });
const devA1 = await login({ email: RDEV_A1.email, password: PASSWORD });
const supC1 = await login({ email: RSUP_C1.email, password: PASSWORD });
console.log("setup ok — 10 test users approved & logged in");

// ── §1 Role options per author role ──
const recAdmin = (await call(admin, "/api/escalations/recipients")).json as { roles: { role: string; scopeLabel: string; count: number }[] };
const recSup = (await call(supA1, "/api/escalations/recipients")).json as { roles: { role: string; scopeLabel: string; count: number }[] };
const recAgent = (await call(agA1, "/api/escalations/recipients")).json as { roles: { role: string }[] };
check("1a. admin role options include agent roles (all-centre reach)", ["TEAM_LEAD", "SUPERVISOR", "ADMIN", "AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"].every((r) => recAdmin.roles.some((o) => o.role === r)), recAdmin.roles.map((o) => `${o.role}:${o.count}`).join(","));
check("1b. admin role options are scoped 'all centres'", recAdmin.roles.every((o) => o.scopeLabel === "all centres"));
check("1c. supervisor role options are centre leadership tiers only", recSup.roles.every((o) => ["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(o.role)) && recSup.roles.length > 0, recSup.roles.map((o) => `${o.role}:${o.count}`).join(","));
check("1d. supervisor's ADMIN option is global regardless of centre", recSup.roles.find((o) => o.role === "ADMIN")?.scopeLabel === "all centres");
check("1e. supervisor's TEAM_LEAD option is 'your centre'", recSup.roles.find((o) => o.role === "TEAM_LEAD")?.scopeLabel === "your centre");
check("1f. agents get NO role-targeting options (named picker only)", recAgent.roles.length === 0);

// ── §2 Admin (centre-bound!) routes to SUPERVISOR — reaches ALL centres ──
const escSup = await call(admin, "/api/escalations", { subject: "All-centre supervisor route", message: "Process change: every supervisor must acknowledge the new shift handover sheet.", severity: "URGENT", targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
const supEsc = escSup.json.escalation as { id: string; targetType: string; targetRole: string; targetUserId: string | null; centreCountry: string | null };
check("2a. admin role-route → 201, TARGET_ROLE/SUPERVISOR, no named target", escSup.status === 201 && supEsc.targetType === "TARGET_ROLE" && supEsc.targetRole === "SUPERVISOR" && supEsc.targetUserId === null);
check("2b. notification went to centre-A supervisor #1", (await notifsFor(uid(RSUP_A1.email), supEsc.id)) === 1);
check("2c. notification went to centre-A supervisor #2", (await notifsFor(uid(RSUP_A2.email), supEsc.id)) === 1);
check("2d. notification went to the CROSS-CENTRE supervisor (the fix)", (await notifsFor(uid(RSUP_B1.email), supEsc.id)) === 1);
check("2e. author (admin) NOT self-notified", (await notifsFor(uid(RADMIN.email), supEsc.id)) === 0);
const supB1Feed = await call(supB1, "/api/escalations");
check("2f. cross-centre supervisor sees it in the feed", (supB1Feed.json.escalations as { id: string }[]).some((e) => e.id === supEsc.id));
const supB1Detail = await call(supB1, `/api/escalations/${supEsc.id}`);
check("2g. cross-centre supervisor can open the thread", supB1Detail.status === 200);
const tlSupRouteView = await call(tlA1, `/api/escalations/${supEsc.id}`);
check("2h. team lead does NOT see a supervisor-routed escalation", tlSupRouteView.status === 404);
await consume(supEsc.id, admin);

// ── §3 Admin routes to TEAM_LEAD — global visibility + TL lifecycle ──
const escTL = await call(admin, "/api/escalations", { subject: "All-centre team-lead route", message: "Submit Thursday attendance by 6pm today.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "TEAM_LEAD" });
const tlEsc = escTL.json.escalation as { id: string };
check("3a. admin→TEAM_LEAD route created", escTL.status === 201);
check("3b. team lead notified", (await notifsFor(uid(RTL_A1.email), tlEsc.id)) === 1);
check("3c. supervisors NOT notified (routed to leads, not supervisors)", (await notifsFor(uid(RSUP_A1.email), tlEsc.id)) === 0 && (await notifsFor(uid(RSUP_B1.email), tlEsc.id)) === 0);
const tlFeed = await call(tlA1, "/api/escalations");
check("3d. team lead sees the all-centre route in their feed", (tlFeed.json.escalations as { id: string }[]).some((e) => e.id === tlEsc.id));
const tlDetail = await call(tlA1, `/api/escalations/${tlEsc.id}`);
check("3e. team lead can open the thread", tlDetail.status === 200);
const supSeesTLRoute = await call(supA1, `/api/escalations/${tlEsc.id}`);
check("3f. supervisor cannot open a lead-routed escalation", supSeesTLRoute.status === 404);
const tlAck = await call(tlA1, "/api/escalations", { id: tlEsc.id, action: "ack" }, "PATCH");
check("3g. team lead acknowledges the global route (may manage)", tlAck.status === 200 && (tlAck.json.escalation as { ackByName: string }).ackByName === RTL_A1.fullName);
check("3h. author notified of the acknowledgement", (await db.notification.count({ where: { userId: uid(RADMIN.email), type: "ESCALATION_ACK", linkData: { contains: tlEsc.id } } })) >= 1);
const tlReply = await call(tlA1, `/api/escalations/${tlEsc.id}`, { body: "Attendance will be in before the deadline." });
check("3i. handler (team lead) can post into the thread", tlReply.status === 201);
await consume(tlEsc.id, admin);

// ── §4 Admin routes to AGENT_BPO — every agent, every centre ──
const escAG = await call(admin, "/api/escalations", { subject: "All-centre agent broadcast", message: "Dialer maintenance at 9pm — log off before then.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "AGENT_BPO" });
const agEsc = escAG.json.escalation as { id: string };
check("4a. admin→AGENT_BPO route created", escAG.status === 201);
check("4b. centre-A agent notified", (await notifsFor(uid(RAG_A1.email), agEsc.id)) === 1);
check("4c. centre-B agent notified (all centres)", (await notifsFor(uid(RAG_B1.email), agEsc.id)) === 1);
check("4d. developer (different agent role) NOT notified", (await notifsFor(uid(RDEV_A1.email), agEsc.id)) === 0);
check("4e. supervisors/team lead NOT notified", (await notifsFor(uid(RSUP_A1.email), agEsc.id)) === 0 && (await notifsFor(uid(RTL_A1.email), agEsc.id)) === 0);
const agA1Feed = await call(agA1, "/api/escalations");
const agB1Feed = await call(agB1, "/api/escalations");
check("4f. BOTH agents see the broadcast in their feeds", (agA1Feed.json.escalations as { id: string }[]).some((e) => e.id === agEsc.id) && (agB1Feed.json.escalations as { id: string }[]).some((e) => e.id === agEsc.id));
check("4g. developer does NOT see it (other role)", !((await call(devA1, "/api/escalations")).json.escalations as { id: string }[]).some((e) => e.id === agEsc.id));
const agAck = await call(agA1, "/api/escalations", { id: agEsc.id, action: "ack" }, "PATCH");
check("4h. agent can acknowledge the role broadcast (takes ownership)", agAck.status === 200);
await consume(agEsc.id, admin);

// ── §5 Centre-scoped routing for non-admin authors ──
const escSupTL = await call(supA1, "/api/escalations", { subject: "Centre lead route", message: "Team leads: submit call-dispute logs this week.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "TEAM_LEAD" });
const supTlEsc = escSupTL.json.escalation as { id: string };
check("5a. supervisor→TEAM_LEAD route created", escSupTL.status === 201);
check("5b. own-centre team lead notified", (await notifsFor(uid(RTL_A1.email), supTlEsc.id)) === 1);
const supB1TLRouteFeed = await call(supB1, "/api/escalations");
check("5c. cross-centre supervisor does not get the centre route notification", (await notifsFor(uid(RSUP_B1.email), supTlEsc.id)) === 0);
await consume(supTlEsc.id, admin);

// ── §6 Authorization + validation ──
const agentRoute = await call(agA1, "/api/escalations", { subject: "Agent role attempt", message: "Should be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
check("6a. AGENT cannot route to a role (403)", agentRoute.status === 403);
const supAgentRole = await call(supA1, "/api/escalations", { subject: "Sup to agent role", message: "Should be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "AGENT_BPO" });
check("6b. SUPERVISOR cannot target agent roles (400)", supAgentRole.status === 400);
const badRole = await call(admin, "/api/escalations", { subject: "Bad role", message: "Should be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "MANAGER" });
check("6c. unknown role rejected (400)", badRole.status === 400);

// ── §7 Thread semantics on role routes (whole role before ack, pair after) ──
const escThread = await call(admin, "/api/escalations", { subject: "Route thread semantics", message: "Checking who is on duty this weekend.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
const thEsc = escThread.json.escalation as { id: string };
const preAckPost = await call(supA1, `/api/escalations/${thEsc.id}`, { body: "occupant injects before ack" });
check("7a. role occupant is READ-ONLY before acknowledging", [403, 404].includes(preAckPost.status));
await call(admin, `/api/escalations/${thEsc.id}`, { body: "Admin follow-up: reply with your shift numbers." });
const a1Msg = await db.notification.count({ where: { userId: uid(RSUP_A1.email), type: "ESCALATION_MESSAGE", linkData: { contains: thEsc.id } } });
const b1Msg = await db.notification.count({ where: { userId: uid(RSUP_B1.email), type: "ESCALATION_MESSAGE", linkData: { contains: thEsc.id } } });
check("7b. BEFORE ack: author reply reaches the WHOLE role (both centres)", a1Msg >= 1 && b1Msg >= 1);
const ackA2 = await call(supA2, "/api/escalations", { id: thEsc.id, action: "ack" }, "PATCH");
check("7c. second-centre supervisor acknowledges → becomes handler", ackA2.status === 200 && (ackA2.json.escalation as { ackByName: string }).ackByName === RSUP_A2.fullName);
await call(admin, `/api/escalations/${thEsc.id}`, { body: "Thanks — A2 has it." });
const a1Msg2 = await db.notification.count({ where: { userId: uid(RSUP_A1.email), type: "ESCALATION_MESSAGE", linkData: { contains: thEsc.id } } });
const a2Msg2 = await db.notification.count({ where: { userId: uid(RSUP_A2.email), type: "ESCALATION_MESSAGE", linkData: { contains: thEsc.id } } });
check("7d. AFTER ack: notifications narrow to the handler (A2), A1 gets no new message ping", a2Msg2 >= 1 && a1Msg2 === a1Msg);
const handlerReply = await call(supA2, `/api/escalations/${thEsc.id}`, { body: "On duty — covered." });
check("7e. handler can reply to the author", handlerReply.status === 201);
const prog = await call(supA2, "/api/escalations", { id: thEsc.id, action: "in_progress" }, "PATCH");
const resNo = await call(supA2, "/api/escalations", { id: thEsc.id, action: "resolve" }, "PATCH");
const res = await call(supA2, "/api/escalations", { id: thEsc.id, action: "resolve", resolutionNote: "Weekend roster confirmed and shared." }, "PATCH");
check("7f. handler lifecycle on a role route: in_progress → resolve requires note → RESOLVED", prog.status === 200 && resNo.status === 400 && res.status === 200 && (res.json.escalation as { status: string }).status === "RESOLVED");
await consume(thEsc.id, admin);

// ── §8 Empty/inactive roles are refused with a clear error (synthetic centre C) ──
const recC1 = (await call(supC1, "/api/escalations/recipients")).json as { roles: { role: string; scopeLabel: string; count: number }[] };
check("8a. composer offers the centre's occupied role with live count", recC1.roles.some((o) => o.role === "TEAM_LEAD" && o.count === 1 && o.scopeLabel === "your centre"), recC1.roles.map((o) => `${o.role}:${o.count}`).join(","));
const escC = await call(supC1, "/api/escalations", { subject: "Occupied role route", message: "One active team lead — should work.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "TEAM_LEAD" });
check("8b. routing to a role with 1 active occupant works", escC.status === 201);
check("8b2. the synthetic team lead is the notified occupant", (await notifsFor(uid(RTL_C1.email), (escC.json.escalation as { id: string }).id)) === 1);
await consume((escC.json.escalation as { id: string }).id, admin);
await db.user.update({ where: { email: RTL_C1.email }, data: { status: "PENDING" } });
const escDead = await call(supC1, "/api/escalations", { subject: "Dead role route", message: "No active occupants — must be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "TEAM_LEAD" });
check("8c. routing to a role with NO active occupants refused (400, clear error)", escDead.status === 400 && String(escDead.json.error || "").toLowerCase().includes("no active"), String(escDead.json.error || ""));
const recC1b = (await call(supC1, "/api/escalations/recipients")).json as { roles: { role: string }[] };
check("8d. emptied role disappears from the composer options", !recC1b.roles.some((o) => o.role === "TEAM_LEAD"));
await db.user.update({ where: { email: RTL_C1.email }, data: { status: "APPROVED" } });

// ── §9 Named-recipient path regression (agents escalate to a person) ──
const named = await call(agA1, "/api/escalations", { subject: "Named still works", message: "Agent escalates to supervisor A1 by name.", severity: "URGENT", recipientId: uid(RSUP_A1.email) });
check("9a. agent→NAMED supervisor path unchanged (201, TARGET_USER)", named.status === 201 && (named.json.escalation as { targetType: string }).targetType === "TARGET_USER");
check("9b. named recipient notified exactly once", (await notifsFor(uid(RSUP_A1.email), (named.json.escalation as { id: string }).id)) === 1);
await consume((named.json.escalation as { id: string }).id, admin);

// ── Cleanup (transactional + retried against the overdue-checker race) ──
// First sweep any role-routed leftovers authored by test users, then remove users.
let cleanupOk = false;
for (let attempt = 1; attempt <= 6 && !cleanupOk; attempt++) {
  try {
    await db.$transaction([
      db.escalation.deleteMany({ where: { OR: [{ fromId: { in: oldIds } }, { targetUserId: { in: oldIds } }, { ackById: { in: oldIds } }] } }),
      db.auditLog.deleteMany({ where: { userId: { in: oldIds } } }),
      db.escalationRead.deleteMany({ where: { userId: { in: oldIds } } }),
      db.notification.deleteMany({ where: { userId: { in: oldIds } } }),
      db.user.deleteMany({ where: { id: { in: oldIds } } }),
    ]);
    cleanupOk = true;
  } catch (e) {
    if (attempt === 6) throw e;
    await new Promise((r) => setTimeout(r, 2000));
  }
}
// Any notification that pointed a REAL user at a test escalation (should be none — every route was consumed).
const stray = await db.notification.deleteMany({ where: { OR: [{ linkData: { contains: "esc-role-e2e" } }, { title: { contains: "E2E Role" } }, { message: { contains: "E2E Role" } }] } });
console.log(`cleanup ok — ${oldIds.length} test users removed, ${stray.count} stray real-user notifications swept`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
