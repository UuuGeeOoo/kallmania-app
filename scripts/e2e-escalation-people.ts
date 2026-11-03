// API-level E2E for the escalation composer's NAMED recipients with the
// TEAM-LEAD-ONLY-SEEN-BY-OWN-TEAM rule (role-based routing is removed):
//  1. ADMIN composer lists every centre's SUPERVISORS (centre-labelled) but NO
//     team leads by default; an ADMIN who explicitly scopes to ONE team
//     (?country=&state=&team=) gets EXACTLY that team's lead — never a list;
//     non-admin scope params are IGNORED entirely (no spoofing)
//  2. Supervisors / team leads / agents stay scoped to their OWN centre;
//     agents get a team lead ONLY when their own team has one (no fallback);
//     a team lead is never offered themselves
//  3. ADMIN can still escalate BY NAME to another centre's supervisor
//     (201 → notified → sees it → acks → resolves); a cross-team /
//     cross-centre TEAM LEAD attempt without a scope is refused (403),
//     WITH the correct scope it succeeds (201 → notified → seen → acked),
//     and a WRONG scope (recipient not that team's lead) is refused (403)
//  4. Non-admins are refused cross-centre AND cross-team named recipients
//     (403) — even with a spoofed recipientTeamScope
//  5. Role-route creation (TARGET_ROLE / ALL_MANAGEMENT) is refused for
//     EVERYONE and creates nothing
//  6. The 3 legacy TARGET_ROLE rows keep rendering (read-compat only)
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
const CENTRE = { country: "NG", state: "Enugu" };
const OTHER_CENTRE = { country: "NG", state: "Abuja Federal Capital Territory" };
const AGENT = { email: "esc-people-agent@kallmania.test", fullName: "E2E People Agent", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-PPL-1", ...CENTRE };
const AGENT_WEB = { email: "esc-people-agent-web@kallmania.test", fullName: "E2E People Web Agent", role: "AGENT_BPO", department: "BPO", team: "WEB", employeeId: "E2E-PPL-2", ...CENTRE };
const TL1 = { email: "esc-people-tl1@kallmania.test", fullName: "E2E People Lead Enugu", role: "TEAM_LEAD", department: "BPO", team: "OUTBOUND", employeeId: "E2E-PPL-T1", ...CENTRE };
const TL2 = { email: "esc-people-tl2@kallmania.test", fullName: "E2E People Lead Abuja", role: "TEAM_LEAD", department: "BPO", team: "INBOUND", employeeId: "E2E-PPL-T2", ...OTHER_CENTRE };
const TL3 = { email: "esc-people-tl3@kallmania.test", fullName: "E2E People Lead Enugu Inbound", role: "TEAM_LEAD", department: "BPO", team: "INBOUND", employeeId: "E2E-PPL-T3", ...CENTRE };
const SUP1 = { email: "esc-people-sup1@kallmania.test", fullName: "E2E People Sup Enugu", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-PPL-S1", ...CENTRE };
const SUP3 = { email: "esc-people-sup3@kallmania.test", fullName: "E2E People Sup Abuja", role: "SUPERVISOR", department: "MANAGEMENT", team: null, employeeId: "E2E-PPL-S3", ...OTHER_CENTRE };
const ADMIN = { email: "esc-people-admin@kallmania.test", fullName: "E2E People Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-PPL-AD", ...CENTRE };
const ALL_USERS = [AGENT, AGENT_WEB, TL1, TL2, TL3, SUP1, SUP3, ADMIN];

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

interface Person { id: string; fullName: string; role: string; team: string | null; country: string | null; state: string | null }
interface Groups { teamLead: Person | null; teamLeads?: Person[]; supervisors: Person[]; admins: Person[]; roles?: unknown }

// ── Setup ──
const hash = await bcrypt.hash(PASSWORD, 10);
for (const u of ALL_USERS) {
  await db.user.upsert({ where: { email: u.email }, update: { passwordHash: hash, status: "APPROVED", country: u.country, state: u.state, team: u.team }, create: { ...u, passwordHash: hash, status: "APPROVED" } });
}
// Clean slate from any previous run.
const oldUsers = await db.user.findMany({ where: { email: { in: ALL_USERS.map((u) => u.email) } }, select: { id: true } });
const oldIds = oldUsers.map((u) => u.id);
const oldEscs = await db.escalation.findMany({ where: { OR: [{ fromId: { in: oldIds } }, { targetUserId: { in: oldIds } }, { ackById: { in: oldIds } }] }, select: { id: true } });
await db.escalation.deleteMany({ where: { id: { in: oldEscs.map((e) => e.id) } } });
await db.notification.deleteMany({ where: { userId: { in: oldIds } } });
await db.auditLog.deleteMany({ where: { userId: { in: oldIds } } });

const agent = await login({ email: AGENT.email, password: PASSWORD });
const agentWeb = await login({ email: AGENT_WEB.email, password: PASSWORD });
const tl1 = await login({ email: TL1.email, password: PASSWORD });
const tl2 = await login({ email: TL2.email, password: PASSWORD });
const sup1 = await login({ email: SUP1.email, password: PASSWORD });
const admin = await login({ email: ADMIN.email, password: PASSWORD });
console.log("setup ok — 8 test users approved (6 logged in)");

const adminUser = await db.user.findUnique({ where: { email: ADMIN.email } });
const sup3User = await db.user.findUnique({ where: { email: SUP3.email } });
const tl2User = await db.user.findUnique({ where: { email: TL2.email } });
const tl3User = await db.user.findUnique({ where: { email: TL3.email } });
const sup1User = await db.user.findUnique({ where: { email: SUP1.email } });
const tl1User = await db.user.findUnique({ where: { email: TL1.email } });

// ── §1: ADMIN composer — every centre's supervisors, but NO team leads ──
const adminRec = await call(admin, "/api/escalations/recipients");
const adminGroups = adminRec.json as unknown as Groups;
check("1a. admin recipients: cross-centre supervisor (Abuja) IS listed", adminGroups.supervisors.some((s) => s.id === sup3User!.id), `count=${adminGroups.supervisors.length}`);
check("1b. admin recipients: own-centre supervisor ALSO listed", adminGroups.supervisors.some((s) => s.id === sup1User!.id));
check("1c. admin recipients: NO team leads of ANY centre (leads are own-team only)", !("teamLeads" in adminRec.json), `teamLeads=${(adminGroups as { teamLeads?: unknown }).teamLeads}`);
check("1d. admin recipients: every supervisor carries centre info (country+state)", adminGroups.supervisors.every((s) => !!s.country && !!s.state));
check("1e. admin recipients: admins listed by name", adminGroups.admins.some((a) => a.id === adminUser!.id));
check("1f. admin recipients: no teamLead (admin belongs to no team)", adminGroups.teamLead === null);
check("1g. recipients response no longer offers role-targeting (no roles key)", !("roles" in adminRec.json));

// Admin EXPLICIT team scope: ?country=&state=&team= resolves exactly ONE lead.
const adminScoped = await call(admin, "/api/escalations/recipients?country=NG&state=Enugu&team=OUTBOUND");
const adminScopedGroups = adminScoped.json as unknown as Groups;
check("1h. admin + explicit team scope (Enugu OUTBOUND) → EXACTLY that team's lead", adminScopedGroups.teamLead?.id === tl1User!.id, `teamLead=${JSON.stringify(adminScopedGroups.teamLead)}`);
check("1i. scoped admin response still lists every supervisor (scope only adds the lead)", adminScopedGroups.supervisors.some((s) => s.id === sup3User!.id) && adminScopedGroups.supervisors.some((s) => s.id === sup1User!.id));
const adminScopedNone = await call(admin, "/api/escalations/recipients?country=NG&state=Enugu&team=WEB");
check("1j. admin scope on a team with NO lead → teamLead null (no fallback)", (adminScopedNone.json as unknown as Groups).teamLead === null);
const adminScopeHalf = await call(admin, "/api/escalations/recipients?country=NG&team=OUTBOUND");
check("1k. admin scope missing state → ignored, teamLead null (all three parts required)", (adminScopeHalf.json as unknown as Groups).teamLead === null);
const agentScoped = await call(agent, "/api/escalations/recipients?country=NG&state=Enugu&team=INBOUND");
check("1l. NON-admin scope params IGNORED — agent still gets ONLY their own team's lead", (agentScoped.json as unknown as Groups).teamLead?.id === tl1User!.id, `teamLead=${JSON.stringify((agentScoped.json as unknown as Groups).teamLead)}`);

// ── §2: non-admins stay scoped to their OWN centre ──
const supRec = await call(sup1, "/api/escalations/recipients");
const supGroups = supRec.json as unknown as Groups;
check("2a. supervisor recipients: cross-centre supervisor NOT listed", !supGroups.supervisors.some((s) => s.id === sup3User!.id));
check("2b. supervisor recipients: own-centre supervisor IS listed", supGroups.supervisors.some((s) => s.id === sup1User!.id));
check("2c. supervisor recipients: NO all-centre teamLeads array", !("teamLeads" in supRec.json));
check("2d. supervisor recipients: teamLead (if any) is their own centre's", !supGroups.teamLead || (supGroups.teamLead.country === "NG" && supGroups.teamLead.state === "Enugu"));
const agentRec = await call(agent, "/api/escalations/recipients");
const agentGroups = agentRec.json as unknown as Groups;
check("2e. agent recipients: team lead is their OWN team's lead (Enugu OUTBOUND)", agentGroups.teamLead?.id === tl1User!.id);
check("2f. agent recipients: cross-centre supervisor NOT listed", !agentGroups.supervisors.some((s) => s.id === sup3User!.id));
check("2g. agent recipients: NO all-centre teamLeads array", !("teamLeads" in agentRec.json));
check("2h. agent recipients: SAME-centre OTHER-team lead (Enugu INBOUND) NOT listed anywhere", agentGroups.teamLead?.id !== tl3User!.id && !agentGroups.supervisors.some((s) => s.id === tl3User!.id) && !agentGroups.admins.some((a) => a.id === tl3User!.id));
const agentWebRec = await call(agentWeb, "/api/escalations/recipients");
const agentWebGroups = agentWebRec.json as unknown as Groups;
check("2i. WEB-team agent (team has NO lead): teamLead is null — no cross-team fallback", agentWebGroups.teamLead === null, `teamLead=${JSON.stringify(agentWebGroups.teamLead)}`);
const tl1Rec = await call(tl1, "/api/escalations/recipients");
const tl1Groups = tl1Rec.json as unknown as Groups;
check("2j. team lead is never offered THEMSELVES as recipient", tl1Groups.teamLead === null, `teamLead=${JSON.stringify(tl1Groups.teamLead)}`);
const tl2Rec = await call(tl2, "/api/escalations/recipients");
const tl2Groups = tl2Rec.json as unknown as Groups;
check("2k. cross-centre TL (Abuja INBOUND): no teamLead, own-centre supervisors only", tl2Groups.teamLead === null && !tl2Groups.supervisors.some((s) => s.id === sup1User!.id) && tl2Groups.supervisors.some((s) => s.id === sup3User!.id));

// ── §3: ADMIN escalates BY NAME across centres (the whole point) ──
const crossRes = await call(admin, "/api/escalations", { subject: "Abuja printer audit", message: "Please audit the Abuja floor printers this week — the Enugu fix should be replicated there.", severity: "NORMAL", recipientId: sup3User!.id });
const crossEsc = crossRes.json.escalation as { id: string; targetType: string; targetUserId: string; status: string };
check("3a. admin → cross-centre supervisor BY NAME → 201 TARGET_USER", crossRes.status === 201 && crossEsc.targetType === "TARGET_USER" && crossEsc.targetUserId === sup3User!.id);
const sup3Notif = await db.notification.findMany({ where: { userId: sup3User!.id, type: "ESCALATION" } });
check("3b. the Abuja supervisor is notified with the thread link", sup3Notif.length === 1 && (sup3Notif[0].linkData || "").includes(crossEsc.id));
const sup3Login = await login({ email: SUP3.email, password: PASSWORD });
const sup3Feed = await call(sup3Login, "/api/escalations");
check("3c. the Abuja supervisor SEES the escalation in their feed", (sup3Feed.json.escalations as { id: string }[]).some((e) => e.id === crossEsc.id));
const sup3Ack = await call(sup3Login, "/api/escalations", { id: crossEsc.id, action: "ack", note: "On it — scheduling the Abuja audit." }, "PATCH");
check("3d. cross-centre recipient acknowledges → handler recorded", sup3Ack.status === 200 && (sup3Ack.json.escalation as { status: string; ackByName: string }).status === "ACKNOWLEDGED" && (sup3Ack.json.escalation as { ackByName: string }).ackByName === SUP3.fullName);
const adminPost = await call(admin, `/api/escalations/${crossEsc.id}`, { body: "Thanks — flag anything unusual in the report." });
check("3e. admin can post into the cross-centre thread", adminPost.status === 201);
const sup3Resolve = await call(sup3Login, "/api/escalations", { id: crossEsc.id, action: "resolve", resolutionNote: "Audit done — all Abuja printers patched like Enugu." }, "PATCH");
check("3f. cross-centre recipient resolves with a note", sup3Resolve.status === 200 && (sup3Resolve.json.escalation as { status: string }).status === "RESOLVED");

// Admin can NO LONGER escalate to another centre's (or team's) TEAM LEAD by
// name — team leads are visible/reachable only through their own team.
const crossTL = await call(admin, "/api/escalations", { subject: "Abuja queue staffing", message: "Please rebalance the Abuja inbound queue for Friday.", severity: "NORMAL", recipientId: tl2User!.id });
check("3g. admin → cross-centre TEAM LEAD BY NAME → REFUSED (403)", crossTL.status === 403, `status=${crossTL.status}`);
const crossTLRow = await db.escalation.count({ where: { subject: "Abuja queue staffing" } });
check("3h. refused cross-team lead escalation created NO row", crossTLRow === 0, `rows=${crossTLRow}`);

// With an EXPLICIT team scope the admin CAN reach that one team's lead by name.
const scopedTL = await call(admin, "/api/escalations", { subject: "Abuja inbound coaching", message: "Please coach the Abuja inbound agents on the new queue flow.", severity: "NORMAL", recipientId: tl2User!.id, recipientTeamScope: { country: "NG", state: "Abuja Federal Capital Territory", team: "INBOUND" } });
const scopedTLEsc = scopedTL.json.escalation as { id: string; targetType: string; targetUserId: string };
check("3i. admin → cross-centre TEAM LEAD WITH correct team scope → 201 TARGET_USER", scopedTL.status === 201 && scopedTLEsc.targetType === "TARGET_USER" && scopedTLEsc.targetUserId === tl2User!.id, `status=${scopedTL.status}`);
const tl2Notif = await db.notification.findMany({ where: { userId: tl2User!.id, type: "ESCALATION" } });
check("3j. the scoped team lead is notified with the thread link", tl2Notif.some((n) => (n.linkData || "").includes(scopedTLEsc.id)));
const tl2Feed = await call(tl2, "/api/escalations");
check("3k. the scoped team lead SEES the escalation in their feed", (tl2Feed.json.escalations as { id: string }[]).some((e) => e.id === scopedTLEsc.id));
const tl2Ack = await call(tl2, "/api/escalations", { id: scopedTLEsc.id, action: "ack", note: "Coaching scheduled for Thursday." }, "PATCH");
check("3l. the scoped team lead acknowledges the admin's escalation", tl2Ack.status === 200 && (tl2Ack.json.escalation as { status: string }).status === "ACKNOWLEDGED", `status=${tl2Ack.status}`);
const wrongScope = await call(admin, "/api/escalations", { subject: "Wrong scope attempt", message: "Scope names OUTBOUND but the recipient is the INBOUND lead — must be refused.", severity: "NORMAL", recipientId: tl2User!.id, recipientTeamScope: { country: "NG", state: "Abuja Federal Capital Territory", team: "OUTBOUND" } });
check("3m. admin + WRONG team scope (recipient is not that team's lead) → 403", wrongScope.status === 403, `status=${wrongScope.status}`);

// ── §4: non-admins CANNOT cross centres OR teams (scope enforcement) ──
const supCross = await call(sup1, "/api/escalations", { subject: "Out of scope", message: "A supervisor must not reach another centre's supervisor.", severity: "NORMAL", recipientId: sup3User!.id });
check("4a. supervisor → cross-centre supervisor named escalation REFUSED (403)", supCross.status === 403);
const agentCross = await call(agent, "/api/escalations", { subject: "Out of scope", message: "An agent must not reach another centre's supervisor.", severity: "NORMAL", recipientId: sup3User!.id });
check("4b. agent → cross-centre supervisor named escalation REFUSED (403)", agentCross.status === 403);
const agentCrossTeam = await call(agent, "/api/escalations", { subject: "Cross team", message: "An OUTBOUND agent must not reach the INBOUND team lead of the same centre.", severity: "NORMAL", recipientId: tl3User!.id });
check("4c. agent → same-centre OTHER-team lead REFUSED (403)", agentCrossTeam.status === 403, `status=${agentCrossTeam.status}`);
const agentWebCross = await call(agentWeb, "/api/escalations", { subject: "Cross team web", message: "A WEB agent (no lead of their own) must not reach ANOTHER team's lead.", severity: "NORMAL", recipientId: tl1User!.id });
check("4d. WEB-team agent → OTHER team's lead REFUSED (403)", agentWebCross.status === 403, `status=${agentWebCross.status}`);
const agentSpoof = await call(agent, "/api/escalations", { subject: "Spoofed scope", message: "An agent spoofing recipientTeamScope must not reach another team's lead.", severity: "NORMAL", recipientId: tl3User!.id, recipientTeamScope: { country: "NG", state: "Enugu", team: "INBOUND" } });
check("4e. agent + SPOOFED recipientTeamScope → REFUSED (403, scope ignored)", agentSpoof.status === 403, `status=${agentSpoof.status}`);
const supSpoof = await call(sup1, "/api/escalations", { subject: "Spoofed scope sup", message: "A supervisor spoofing recipientTeamScope must not reach another centre's supervisor.", severity: "NORMAL", recipientId: sup3User!.id, recipientTeamScope: { country: "NG", state: "Abuja Federal Capital Territory", team: "INBOUND" } });
check("4f. supervisor + SPOOFED recipientTeamScope → REFUSED (403)", supSpoof.status === 403, `status=${supSpoof.status}`);

// ── §5: role-route creation is GONE for everyone ──
const adminRole = await call(admin, "/api/escalations", { subject: "Admin role attempt", message: "Should be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
check("5a. admin TARGET_ROLE → 400", adminRole.status === 400);
const supRole = await call(sup1, "/api/escalations", { subject: "Supervisor role attempt", message: "Should be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "TEAM_LEAD" });
check("5b. supervisor TARGET_ROLE → 400", supRole.status === 400);
const agentRole = await call(agent, "/api/escalations", { subject: "Agent role attempt", message: "Should be refused.", severity: "NORMAL", targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" });
check("5c. agent TARGET_ROLE → 400", agentRole.status === 400);
const allMgmt = await call(admin, "/api/escalations", { subject: "Broadcast attempt", message: "Should be refused.", severity: "NORMAL", targetType: "ALL_MANAGEMENT" });
check("5d. ALL_MANAGEMENT broadcast → 400", allMgmt.status === 400);
const roleCreations = await db.escalation.count({ where: { subject: { in: ["Admin role attempt", "Supervisor role attempt", "Agent role attempt", "Broadcast attempt"] }, targetType: { in: ["TARGET_ROLE", "ALL_MANAGEMENT"] } } });
check("5e. refused role attempts created NO escalation rows", roleCreations === 0);

// ── §6: legacy TARGET_ROLE rows untouched (read-compat only) ──
const legacyRows = await db.escalation.count({ where: { targetType: "TARGET_ROLE" } });
check("6a. legacy TARGET_ROLE rows still exist (untouched)", legacyRows >= 3, `count=${legacyRows}`);
const adminFeed = await call(admin, "/api/escalations");
const adminSeesLegacy = (adminFeed.json.escalations as { id: string; targetType: string }[]).filter((e) => e.targetType === "TARGET_ROLE").length;
check("6b. admin feed still renders the legacy role-routed rows", adminFeed.status === 200 && adminSeesLegacy >= 3, `visible=${adminSeesLegacy}`);

// ── Cleanup (transactional + retried vs the background overdue-checker) ──
let cleanupOk = false;
for (let attempt = 1; attempt <= 6 && !cleanupOk; attempt++) {
  try {
    await db.$transaction([
      db.escalation.deleteMany({ where: { OR: [{ fromId: { in: oldIds } }, { targetUserId: { in: oldIds } }, { ackById: { in: oldIds } }] } }),
      db.auditLog.deleteMany({ where: { userId: { in: oldIds } } }),
      db.escalationRead.deleteMany({ where: { userId: { in: oldIds } } }),
      db.pushDelivery.deleteMany({ where: { subscription: { userId: { in: oldIds } } } }),
      db.pushEvent.deleteMany({ where: { userId: { in: oldIds } } }),
      db.pushSubscription.deleteMany({ where: { userId: { in: oldIds } } }),
      db.notification.deleteMany({ where: { userId: { in: oldIds } } }),
      db.activityEvent.deleteMany({ where: { userId: { in: oldIds } } }), // LOGIN tracking (intel module) — FK on User
      db.user.deleteMany({ where: { id: { in: oldIds } } }),
    ]);
    cleanupOk = true;
  } catch (e) {
    if (attempt === 6) throw e;
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await db.notification.deleteMany({ where: { userId: { in: oldIds } } });
console.log(`cleanup ok — ${oldIds.length} test users + their escalations removed (legacy data untouched)`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
