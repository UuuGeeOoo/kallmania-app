// API-level E2E — ADMIN PERMANENT USER DELETION (the "cannot delete users" bug):
//  1. FK-SAFE PURGE: an admin deletes a user that owns reports, KPI results,
//     notifications, escalations (sent + targeted), tasks, task-assignee links,
//     notices, uploaded files, member KPI configs, push subscriptions/events/
//     deliveries/preferences, activity events, password-reset requests, audit
//     logs, SBTS events and reviewed reports. Sole-ownership rows must vanish;
//     shared rows must survive with the link severed (reviewer → null, notice
//     author → null + name kept, task creator → the deleting admin, audit +
//     SBTS events → userId null).
//  2. DB-LEVEL CASCADE BACKSTOP: deleting a user that still has PushEvent rows
//     (the EXACT reported failure: P2003 PushEvent_userId_fkey) with a bare
//     prisma user.delete — no purge — must now succeed because every
//     sole-ownership FK is ON DELETE CASCADE in the database itself.
//  3. SECURITY: non-admin delete attempts are refused (403) and an admin
//     account can never be deleted.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-delete-2026";
const ADMIN = { email: "del-admin@kallmania.test", fullName: "E2E Delete Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: "E2E-DEL-1", country: "NG", state: "Enugu" };
const VICTIM = { email: "del-victim@kallmania.test", fullName: "E2E Delete Victim", role: "AGENT_BPO", department: "BPO", team: "INBOUND", employeeId: "E2E-DEL-2", country: "NG", state: "Enugu" };
const COLLEAGUE = { email: "del-colleague@kallmania.test", fullName: "E2E Delete Colleague", role: "TEAM_LEAD", department: "SOCIAL_MEDIA", team: "SOCIAL", employeeId: "E2E-DEL-3", country: "NG", state: "Enugu" };
const CASSETTE = { email: "del-cascade@kallmania.test", fullName: "E2E Cascade Victim", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: "E2E-DEL-4", country: "NG", state: "Enugu" };
const E2E_EMAILS = [ADMIN.email, VICTIM.email, COLLEAGUE.email, CASSETTE.email];

let failures = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!res.ok || !cookie) throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
  return cookie;
}

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await db.user.create({ data: { ...ADMIN, passwordHash, status: "APPROVED" } });
  const victim = await db.user.create({ data: { ...VICTIM, passwordHash, status: "APPROVED" } });
  const colleague = await db.user.create({ data: { ...COLLEAGUE, passwordHash, status: "APPROVED" } });
  const cassette = await db.user.create({ data: { ...CASSETTE, passwordHash, status: "APPROVED" } });

  const today = new Date();
  // Sole-ownership rows that must disappear with the victim
  const victimReport = await db.report.create({ data: { ref: `e2e-del-victim-${victim.id}`, type: "AGENT_BPO", reportDate: today, userId: victim.id, department: "BPO", payload: "{}" } });
  await db.kpiResult.create({ data: { dedupeKey: `e2e-del:${victim.id}:callsHandled`, userId: victim.id, team: "INBOUND", department: "BPO", kpiKey: "callsHandled", label: "Calls handled", unit: "count", target: 50, actual: 60, achievement: 120, statusLabel: "MET", source: "REPORT", reportId: victimReport.id, reportDate: today, periodMonth: today.toISOString().slice(0, 7) } });
  const victimEscalation = await db.escalation.create({ data: { fromId: victim.id, fromName: victim.fullName, fromRole: victim.role, subject: "e2e victim escalation", message: "owned solely by the victim", centreCountry: "NG", centreState: "Enugu" } });
  await db.escalationMessage.create({ data: { escalationId: victimEscalation.id, senderId: victim.id, senderName: victim.fullName, senderRole: victim.role, body: "thread child" } });
  await db.escalationEvent.create({ data: { escalationId: victimEscalation.id, actorId: victim.id, actorName: victim.fullName, actorRole: victim.role, action: "CREATED" } });
  await db.escalationRead.create({ data: { escalationId: victimEscalation.id, userId: victim.id } });
  const subscription = await db.pushSubscription.create({ data: { userId: victim.id, endpoint: `https://e2e.example/${victim.id}`, p256dh: "k", auth: "a" } });
  const event = await db.pushEvent.create({ data: { userId: victim.id, type: "REPORT_OVERDUE", title: "t", body: "b" } });
  await db.pushDelivery.create({ data: { eventId: event.id, subscriptionId: subscription.id, attempt: 1, outcome: "SENT" } });
  await db.pushPreference.create({ data: { userId: victim.id } });
  await db.activityEvent.create({ data: { userId: victim.id, eventType: "LOGIN", metadata: "e2e" } });
  await db.memberKpiConfig.create({ data: { userId: victim.id, department: "BPO", key: "callsHandled", label: "Calls handled", target: 50, unit: "count" } });
  await db.uploadedFile.create({ data: { originalName: "victim.pdf", storedName: `e2e-del-${victim.id}.bin`, mimeType: "application/pdf", sizeBytes: 10, fileHash: `hash-${victim.id}`, userId: victim.id } });
  await db.taskAssignee.create({ data: { taskId: (await db.task.create({ data: { title: "victim-assignee task", status: "OPEN", department: "BPO", createdById: admin.id } })).id, userId: victim.id } });
  await db.passwordResetRequest.create({ data: { email: victim.email, userId: victim.id, status: "PENDING" } });
  await db.passwordResetRequest.create({ data: { email: "del-victim@kallmania.test", status: "USED" } }); // by-email orphan from a pre-registration era
  await db.auditLog.create({ data: { userId: victim.id, actorName: victim.fullName, action: "LOGIN", entity: "User", entityId: victim.id, details: "e2e audit row" } });
  await db.sbtsEvent.create({ data: { userId: victim.id, type: "performance.score", agentEmail: victim.email, eventDate: today.toISOString().slice(0, 10), score: 10, delta: 1, raw: "{}", eventId: `e2e-del-${victim.id}`, receivedAt: today } });
  await db.notification.create({ data: { userId: victim.id, type: "ACCOUNT_APPROVED", severity: "INFO", title: "t", message: "m" } });
  // Colleague's notification that references the victim's escalation via linkData
  await db.notification.create({ data: { userId: colleague.id, type: "ESCALATION_RAISED", severity: "WARNING", title: "t", message: "m", linkData: JSON.stringify({ escalationId: victimEscalation.id, userId: victim.id }), dedupeKey: `esc:${victimEscalation.id}` } });

  // Shared rows that must survive with the link severed
  await db.report.create({ data: { ref: `e2e-del-colleague-${colleague.id}`, type: "AGENT_BPO", reportDate: today, userId: colleague.id, department: "SOCIAL_MEDIA", reviewedById: victim.id, payload: "{}" } }); // victim was the reviewer
  await db.notice.create({ data: { title: "e2e notice", body: "kept", authorId: victim.id, authorName: victim.fullName } });
  const victimTask = await db.task.create({ data: { title: "victim-created task", status: "OPEN", department: "BPO", createdById: victim.id, assigneeId: colleague.id } });
  const targetedEscalation = await db.escalation.create({ data: { fromId: colleague.id, fromName: colleague.fullName, fromRole: colleague.role, targetType: "TARGET_USER", targetUserId: victim.id, targetName: victim.fullName, subject: "e2e targeted at victim", message: "kept, link severed" } });

  // Cascade backstop cassette: ONLY a PushEvent row (the exact P2003 from the bug report)
  await db.pushEvent.create({ data: { userId: cassette.id, type: "LOGIN", title: "t", body: "b" } });

  return { admin, victim, colleague, cassette, victimTask, targetedEscalation };
}

/**
 * FK-safe purge for the e2e-only accounts. With the DB-level cascades live,
 * a plain user.delete removes every sole-ownership child automatically — the
 * only RESTRICT blockers left are escalations they SENT and tasks they
 * CREATED, which are cleared explicitly first.
 */
async function purgeTestUser(id) {
  await db.escalation.deleteMany({ where: { fromId: id } });
  await db.taskAssignee.deleteMany({ where: { task: { createdById: id } } });
  await db.task.deleteMany({ where: { createdById: id } });
  await db.user.delete({ where: { id } });
}

async function main() {
  // ── setup ──────────────────────────────────────────────────────────────────
  await db.notification.deleteMany({ where: { dedupeKey: { contains: "e2e-del" } } });
  await db.passwordResetRequest.deleteMany({ where: { email: { in: E2E_EMAILS } } });
  const stale = await db.user.findMany({ where: { email: { in: E2E_EMAILS } }, select: { id: true } });
  for (const u of stale) await purgeTestUser(u.id);

  const s = await seed();
  console.log(`seeded: admin=${s.admin.id} victim=${s.victim.id} colleague=${s.colleague.id} cassette=${s.cassette.id}`);

  // ── 1. security: non-admin cannot delete; admin cannot delete admin ────────
  const victimCookie = await login(VICTIM.email, PASSWORD);
  const forbidden = await fetch(`${BASE}/api/users`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: victimCookie },
    body: JSON.stringify({ userId: s.colleague.id, action: "delete" }),
  });
  check("non-admin delete attempt refused (403)", forbidden.status === 403, `status=${forbidden.status}`);

  const adminCookie = await login(ADMIN.email, PASSWORD);
  const adminDelete = await fetch(`${BASE}/api/users`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ userId: s.admin.id, action: "delete" }),
  });
  const adminDeleteBody = await adminDelete.json().catch(() => ({}));
  check("admin account cannot be deleted", adminDelete.status !== 200 || adminDeleteBody?.success !== true, `status=${adminDelete.status}`);

  // ── 2. the real deletion ────────────────────────────────────────────────────
  const res = await fetch(`${BASE}/api/users`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ userId: s.victim.id, action: "delete" }),
  });
  const body = await res.json().catch(() => ({}));
  check("admin delete returns success", res.ok && body?.deleted === true, `status=${res.status} body=${JSON.stringify(body).slice(0, 120)}`);

  const victimGone = await db.user.findUnique({ where: { id: s.victim.id } });
  check("user row permanently removed", victimGone === null);

  // sole-ownership children must all be gone
  const gone = async (model, where, label) => {
    const rows = await db[model].findMany({ where });
    check(label, rows.length === 0, `left=${rows.length}`);
  };
  await gone("report", { userId: s.victim.id }, "victim's reports removed");
  await gone("kpiResult", { userId: s.victim.id }, "victim's KPI results removed");
  await gone("escalation", { fromId: s.victim.id }, "victim's escalations + thread removed");
  check("victim escalation thread children cascaded", (await db.escalationMessage.count({ where: { senderId: s.victim.id } })) === 0 && (await db.escalationRead.count({ where: { userId: s.victim.id } })) === 0);
  await gone("pushSubscription", { userId: s.victim.id }, "push subscriptions removed");
  await gone("pushEvent", { userId: s.victim.id }, "push events removed");
  await gone("pushDelivery", { subscription: { userId: s.victim.id } }, "push deliveries (grandchild) removed");
  await gone("pushPreference", { userId: s.victim.id }, "push preferences removed");
  await gone("activityEvent", { userId: s.victim.id }, "activity events removed");
  await gone("memberKpiConfig", { userId: s.victim.id }, "member KPI configs removed");
  await gone("uploadedFile", { userId: s.victim.id }, "uploaded-file records removed");
  await gone("taskAssignee", { userId: s.victim.id }, "task-assignee links removed");
  await gone("notification", { dedupeKey: `esc:${s.targetedEscalation.id}` }, "colleague's notifications about the victim removed");
  const prrLeft = await db.passwordResetRequest.count({ where: { OR: [{ userId: s.victim.id }, { email: VICTIM.email }] } });
  check("password-reset requests removed (by id AND by email)", prrLeft === 0, `left=${prrLeft}`);

  // shared rows must survive with the link severed
  const colleagueReport = await db.report.findFirst({ where: { userId: s.colleague.id } });
  check("colleague's reviewed report survives", colleagueReport !== null);
  check("reviewer link severed (reviewedById → null)", colleagueReport?.reviewedById === null);
  const notice = await db.notice.findFirst({ where: { authorName: VICTIM.fullName } });
  check("authored notice survives with name kept, link severed", notice !== null && notice.authorId === null);
  const task = await db.task.findUnique({ where: { id: s.victimTask.id } });
  check("victim-created task survives, ownership handed to the deleting admin", task !== null && task.createdById === s.admin.id);
  check("task assignee untouched", task?.assigneeId === s.colleague.id);
  const targeted = await db.escalation.findUnique({ where: { id: s.targetedEscalation.id } });
  check("escalation targeted AT the victim survives, target link severed + name kept", targeted !== null && targeted.targetUserId === null && targeted.targetName === VICTIM.fullName);
  const auditRow = await db.auditLog.findFirst({ where: { actorName: VICTIM.fullName, action: "LOGIN" } });
  check("audit trail stays readable with userId severed", auditRow !== null && auditRow.userId === null);
  const sbtsRow = await db.sbtsEvent.findFirst({ where: { eventId: `e2e-del-${s.victim.id}` } });
  check("SBTS event survives with userId set null", sbtsRow !== null && sbtsRow.userId === null);
  const delAudit = await db.auditLog.findFirst({ where: { action: "DELETE_USER", entityId: s.victim.id } });
  check("DELETE_USER audited by the deleting admin", delAudit !== null && delAudit.userId === s.admin.id, delAudit ? `details="${delAudit.details}"` : "");

  // ── 3. DB-level cascade backstop (the EXACT reported failure mode) ─────────
  try {
    await db.user.delete({ where: { id: s.cassette.id } }); // bare delete, no purge, PushEvent rows present
    const cassetteGone = (await db.user.findUnique({ where: { id: s.cassette.id } })) === null
      && (await db.pushEvent.count({ where: { userId: s.cassette.id } })) === 0;
    check("bare prisma user.delete with live PushEvent rows succeeds (DB cascade backstop — the reported P2003 PushEvent_userId_fkey is gone)", cassetteGone);
  } catch (e) {
    check("bare prisma user.delete with live PushEvent rows succeeds (DB cascade backstop)", false, `${e?.code ?? ""} ${String(e?.message).slice(0, 100)}`);
  }

  // ── cleanup ────────────────────────────────────────────────────────────────
  await db.notice.deleteMany({ where: { authorName: { in: [VICTIM.fullName] } } });
  for (const u of [s.admin, s.colleague]) await purgeTestUser(u.id).catch(() => {});
  await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: [s.victim.id, s.cassette.id] } }, { actorName: { in: [ADMIN.fullName, VICTIM.fullName, COLLEAGUE.fullName, CASSETTE.fullName] } }] } });
  await db.sbtsEvent.deleteMany({ where: { eventId: { contains: "e2e-del" } } });
  await db.passwordResetRequest.deleteMany({ where: { email: { in: E2E_EMAILS } } });

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error("E2E CRASHED:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
