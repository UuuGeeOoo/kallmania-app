// API-level E2E — ADMIN PERMANENT USER DELETION (the "delete does nothing" bug):
//  1. BUG REPRODUCTION: the pre-fix transaction cleared reports/notifications/
//     escalations/memberKpiConfig/uploadedFile/tasks/taskAssignee/notices/
//     auditLog — but NOT ActivityEvent, PushSubscription, PushEvent or
//     PushPreference (REQUIRED User FKs, RESTRICT). Any login/report/notification
//     creates those rows, so db.user.delete threw P2003 and the whole
//     transaction rolled back: the admin clicked "Delete permanently" and
//     nothing happened. The legacy transaction shape is replayed here against a
//     seeded victim to prove it fails exactly that way.
//  2. REAL DELETE: PATCH /api/users {action:"delete"} as admin must return
//     deleted:true and physically remove the account.
//  3. FULL FOOTPRINT VERIFICATION: every FK child gone or honestly re-pointed —
//     reports+KPI results purged, notifications (own, about-the-user, escalation
//     inbox copies) purged, sent escalations purged, targeted escalations kept
//     with the name preserved, tasks unassigned/re-owned, task-assignee links
//     gone, notices kept with authorName, activity/push rows purged, the
//     physical upload file unlinked, DELETE_USER audit entry written.
//  4. GUARDS: non-admin 403, admin accounts undeletable, missing user 404,
//     unrelated canary notification survives (empty-OR safety on the escalation
//     inbox-copy branch is locked in by a victim with zero escalations).
const BASE = "http://localhost:3000";
import { readFileSync, mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();

const PASSWORD = "e2e-del-2026";
const STORAGE_DIR = "/home/z/my-project/uploads-storage";
const STAMP = Date.now().toString(36);

const ADMIN = { email: `del-admin-${STAMP}@kallmania.test`, fullName: "E2E Delete Admin", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: `E2E-DEL-A-${STAMP}`, country: "NG", state: "Enugu" };
const ADMIN2 = { email: `del-admin2-${STAMP}@kallmania.test`, fullName: "E2E Delete Admin Two", role: "ADMIN", department: "MANAGEMENT", team: null, employeeId: `E2E-DEL-A2-${STAMP}`, country: "NG", state: "Enugu" };
const VICTIM = { email: `del-victim-${STAMP}@kallmania.test`, fullName: "E2E Delete Victim", role: "AGENT_BPO", department: "BPO", team: "INBOUND", employeeId: `E2E-DEL-V-${STAMP}`, country: "NG", state: "Enugu" };
const VICTIM2 = { email: `del-victim2-${STAMP}@kallmania.test`, fullName: "E2E Delete Victim Two", role: "AGENT_BPO", department: "BPO", team: "OUTBOUND", employeeId: `E2E-DEL-V2-${STAMP}`, country: "NG", state: "Enugu" };
const E2E_EMAILS = [ADMIN.email, ADMIN2.email, VICTIM.email, VICTIM2.email];

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

async function call(cookie: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", cookie, ...(init?.headers ?? {}) },
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
    await db.activityEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.pushDelivery.deleteMany({ where: { OR: [{ event: { userId: { in: ids } } }, { subscription: { userId: { in: ids } } }] } });
    await db.pushEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
    await db.pushPreference.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.memberKpiConfig.deleteMany({ where: { userId: { in: ids } } });
    await db.taskAssignee.deleteMany({ where: { userId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try { await db.user.deleteMany({ where: { email: { in: E2E_EMAILS } } }); return; }
    catch {
      const again = await db.user.findMany({ where: { email: { in: E2E_EMAILS } }, select: { id: true } });
      const ids2 = again.map((u) => u.id);
      if (!ids2.length) return;
      await db.pushDelivery.deleteMany({ where: { OR: [{ event: { userId: { in: ids2 } } }, { subscription: { userId: { in: ids2 } } }] } }).catch(() => {});
      await db.pushEvent.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await db.pushSubscription.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await db.activityEvent.deleteMany({ where: { userId: { in: ids2 } } }).catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

/** Seed the victim with the FULL FK footprint the delete transaction must handle. */
async function seedVictimFootprint(victimId: string, adminId: string) {
  const day = new Date();
  // Report + materialized KPI result (REPORT source, like the KPI engine writes)
  const report = await db.report.create({
    data: { ref: `E2E-DEL-${STAMP}-R1`, type: "DAILY_REPORT", reportDate: day, userId: victimId, department: "BPO", status: "SUBMITTED", attendanceStatus: "Present" },
  });
  await db.kpiResult.create({
    data: {
      dedupeKey: `e2e-del:${STAMP}:callsHandled`, userId: victimId, team: "INBOUND", department: "BPO",
      kpiKey: "callsHandled", label: "Calls handled", unit: "count", target: 50, actual: 60,
      achievement: 120, statusLabel: "MET", source: "REPORT", reportId: report.id,
      reportDate: day, periodMonth: day.toISOString().slice(0, 7), verification: "SUBMITTED",
    },
  });
  // Member-level KPI config
  await db.memberKpiConfig.create({
    data: { userId: victimId, department: "BPO", key: "callsHandled", label: "Calls handled", target: 50, unit: "count", status: "APPROVED" },
  });
  // Uploaded file — DB row + PHYSICAL file that must be unlinked
  mkdirSync(STORAGE_DIR, { recursive: true });
  const storedName = `e2e-del-${STAMP}.txt`;
  writeFileSync(`${STORAGE_DIR}/${storedName}`, "e2e upload payload");
  await db.uploadedFile.create({
    data: { originalName: "e2e-delete.txt", storedName, mimeType: "text/plain", sizeBytes: 18, fileHash: `e2e-${STAMP}`, userId: victimId, department: "BPO" },
  });
  // Escalations both directions + the admin's inbox copy about the victim's escalation
  const sent = await db.escalation.create({
    data: { fromId: victimId, fromName: "E2E Delete Victim", fromRole: "AGENT_BPO", targetRole: "ADMIN", subject: "Sent by victim", message: "must be deleted with the account", severity: "NORMAL", status: "OPEN", team: "INBOUND" },
  });
  const sentEscalationId = sent.id;
  await db.notification.create({
    data: { userId: adminId, type: "ESCALATION_NEW", title: "New escalation", message: "inbox copy held by the admin", linkData: JSON.stringify({ escalationId: sent.id }), dedupeKey: `e2e-del-inboxcopy:${STAMP}` },
  });
  const targeted = await db.escalation.create({
    data: { fromId: adminId, fromName: "E2E Delete Admin", fromRole: "ADMIN", targetUserId: victimId, targetName: "E2E Delete Victim", subject: "Targeted at victim", message: "must survive with the link severed", severity: "URGENT", status: "OPEN" },
  });
  // Tasks: one created by the victim, one assigned to them (+ multi-assignee link)
  const createdTask = await db.task.create({
    data: { title: `E2E created-by ${STAMP}`, department: "BPO", createdById: victimId, priority: "MEDIUM", status: "NOT_STARTED" },
  });
  const assignedTask = await db.task.create({
    data: { title: `E2E assigned-to ${STAMP}`, department: "BPO", createdById: adminId, assigneeId: victimId, priority: "HIGH", status: "IN_PROGRESS" },
  });
  await db.taskAssignee.create({ data: { taskId: assignedTask.id, userId: victimId, status: "IN_PROGRESS" } });
  // Notice authored by the victim (must survive with the name kept)
  await db.notice.create({
    data: { title: `E2E notice ${STAMP}`, body: "authored by the victim", authorId: victimId, authorName: "E2E Delete Victim", authorRole: "AGENT_BPO", allCentres: true },
  });
  // Activity feed + push rows — the four models the old transaction MISSED
  await db.activityEvent.create({ data: { userId: victimId, eventType: "LOGIN", centreCountry: "NG", centreState: "Enugu", team: "INBOUND" } });
  await db.activityEvent.create({ data: { userId: victimId, eventType: "REPORT_SUBMITTED", relatedType: "Report", relatedId: report.id } });
  const sub = await db.pushSubscription.create({ data: { userId: victimId, endpoint: `https://push.example/e2e-${STAMP}`, p256dh: "k", auth: "a" } });
  const pev1 = await db.pushEvent.create({ data: { userId: victimId, type: "ESCALATION_NEW", title: "push", body: "b", dedupeKey: `e2e-del-push:${STAMP}:1` } });
  const pev2 = await db.pushEvent.create({ data: { userId: victimId, type: "REPORT_REVIEWED", title: "push2", body: "b2", dedupeKey: `e2e-del-push:${STAMP}:2` } });
  // PushDelivery grandchildren (required RESTRICT FKs to BOTH event and subscription)
  await db.pushDelivery.create({ data: { eventId: pev1.id, subscriptionId: sub.id, attempt: 1, outcome: "ACCEPTED", statusCode: 201 } });
  await db.pushDelivery.create({ data: { eventId: pev2.id, subscriptionId: sub.id, attempt: 2, outcome: "FAILED", error: "endpoint gone", retryEligible: false } });
  await db.pushPreference.create({ data: { userId: victimId, pushEnabled: true, categories: JSON.stringify(["escalations"]) } });
  // Victim's own notification + admin's alerts ABOUT the victim (both branch patterns)
  await db.notification.create({ data: { userId: victimId, type: "ACCOUNT_APPROVED", title: "own notification", message: "gone with the account" } });
  await db.notification.create({ data: { userId: adminId, type: "OVERDUE_REPORT", title: "alert about victim", message: "linkData userId branch", linkData: JSON.stringify({ userId: victimId }), dedupeKey: `e2e-del-about:${STAMP}` } });
  await db.notification.create({ data: { userId: adminId, type: "OVERDUE_REPORT", title: "alert about victim 2", message: "dedupeKey branch", dedupeKey: `overdue:${victimId}:${STAMP}` } });
  return { reportId: report.id, sentEscalationId, createdTaskId: createdTask.id, assignedTaskId: assignedTask.id, noticeTitle: `E2E notice ${STAMP}` };
}

/** Minimal footprint: only the four previously-missed models + own notification. NO escalations. */
async function seedVictim2Footprint(victim2Id: string) {
  await db.activityEvent.create({ data: { userId: victim2Id, eventType: "LOGIN" } });
  await db.pushSubscription.create({ data: { userId: victim2Id, endpoint: `https://push.example/e2e2-${STAMP}`, p256dh: "k2", auth: "a2" } });
  await db.pushEvent.create({ data: { userId: victim2Id, type: "REPORT_SUBMITTED", title: "p", body: "b", dedupeKey: `e2e-del2-push:${STAMP}` } });
  await db.pushPreference.create({ data: { userId: victim2Id, pushEnabled: false } });
  await db.notification.create({ data: { userId: victim2Id, type: "ACCOUNT_APPROVED", title: "own notification", message: "gone with the account" } });
}

async function main() {
  console.log("=== ADMIN PERMANENT USER DELETION — E2E ===\n");
  await purge();

  // ── SEED ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of [ADMIN, ADMIN2, VICTIM, VICTIM2]) {
    await db.user.create({ data: { ...u, passwordHash, status: "APPROVED" } });
  }
  const admin = await db.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
  const admin2 = await db.user.findUniqueOrThrow({ where: { email: ADMIN2.email } });
  const victim = await db.user.findUniqueOrThrow({ where: { email: VICTIM.email } });
  const victim2 = await db.user.findUniqueOrThrow({ where: { email: VICTIM2.email } });
  const fp = await seedVictimFootprint(victim.id, admin.id);
  await seedVictim2Footprint(victim2.id);

  // Unrelated canary in the admin's inbox — must survive BOTH deletes
  const canary = await db.notification.create({
    data: { userId: admin.id, type: "NOTICE_NEW", title: "unrelated canary", message: "must survive", dedupeKey: `e2e-del-canary:${STAMP}` },
  });

  // Blocker rows present (the bug precondition)
  const [act, psub, pevt, ppref] = await Promise.all([
    db.activityEvent.count({ where: { userId: victim.id } }),
    db.pushSubscription.count({ where: { userId: victim.id } }),
    db.pushEvent.count({ where: { userId: victim.id } }),
    db.pushPreference.count({ where: { userId: victim.id } }),
  ]);
  check("seed: victim carries RESTRICT-FK children (activity/push)", act === 2 && psub === 1 && pevt === 2 && ppref === 1, `activity=${act} pushSub=${psub} pushEvents=${pevt} pushPrefs=${ppref}`);

  // ── 1. LEGACY-PATH REPRODUCTION (old transaction shape) ────────────────────
  let legacyThrew = "";
  try {
    await db.$transaction([
      db.report.deleteMany({ where: { userId: victim2.id } }),
      db.report.updateMany({ where: { reviewedById: victim2.id }, data: { reviewedById: null } }),
      db.reportTemplate.updateMany({ where: { updatedById: victim2.id }, data: { updatedById: null } }),
      db.notification.deleteMany({ where: { userId: victim2.id } }),
      db.escalation.deleteMany({ where: { fromId: victim2.id } }),
      db.escalation.updateMany({ where: { targetUserId: victim2.id }, data: { targetUserId: null, targetName: victim2.fullName } }),
      db.memberKpiConfig.deleteMany({ where: { userId: victim2.id } }),
      db.uploadedFile.deleteMany({ where: { userId: victim2.id } }),
      db.auditLog.updateMany({ where: { userId: victim2.id }, data: { userId: null } }),
      db.task.updateMany({ where: { assigneeId: victim2.id }, data: { assigneeId: null } }),
      db.taskAssignee.deleteMany({ where: { userId: victim2.id } }),
      db.notice.updateMany({ where: { authorId: victim2.id }, data: { authorId: null, authorName: victim2.fullName } }),
      db.task.updateMany({ where: { createdById: victim2.id }, data: { createdById: admin.id } }),
      db.user.delete({ where: { id: victim2.id } }),
    ]);
  } catch (e) {
    legacyThrew = e instanceof Error ? e.message : String(e);
  }
  check("reproduction: OLD transaction fails with FK constraint (P2003)", /P2003|Foreign key constraint/i.test(legacyThrew), legacyThrew.slice(0, 90));
  const victim2StillThere = await db.user.findUnique({ where: { id: victim2.id } });
  check("reproduction: account silently SURVIVES the old delete", !!victim2StillThere);

  // ── 2. AUTH + GUARDS ───────────────────────────────────────────────────────
  const victimCookie = await login(VICTIM);
  const forbidden = await call(victimCookie, "/api/users", { method: "PATCH", body: JSON.stringify({ userId: admin2.id, action: "delete" }) });
  check("guard: non-admin cannot invoke delete (403)", forbidden.status === 403, `status=${forbidden.status}`);

  const adminCookie = await login(ADMIN);
  const adminDelete = await call(adminCookie, "/api/users", { method: "PATCH", body: JSON.stringify({ userId: admin2.id, action: "delete" }) });
  check("guard: administrator accounts cannot be deleted", adminDelete.status >= 400 && /administrator/i.test(String(adminDelete.json.error || "")), `status=${adminDelete.status} err=${String(adminDelete.json.error || "")}`);

  // ── 3. REAL DELETE via the API (fixed route) ──────────────────────────────
  const del2 = await call(adminCookie, "/api/users", { method: "PATCH", body: JSON.stringify({ userId: victim2.id, action: "delete" }) });
  check("delete: minimal-footprint victim (escalation-free) succeeds", del2.status === 200 && del2.json.deleted === true, `status=${del2.status} msg=${String(del2.json.message || del2.json.error || "")}`);

  const del1 = await call(adminCookie, "/api/users", { method: "PATCH", body: JSON.stringify({ userId: victim.id, action: "delete" }) });
  check("delete: full-footprint victim succeeds", del1.status === 200 && del1.json.deleted === true, `status=${del1.status} msg=${String(del1.json.message || del1.json.error || "")}`);
  check("delete: response names the removed account", /E2E Delete Victim/.test(String(del1.json.message || "")));

  const delAgain = await call(adminCookie, "/api/users", { method: "PATCH", body: JSON.stringify({ userId: victim.id, action: "delete" }) });
  check("delete: repeat attempt answers 404 User not found", delAgain.status === 404, `status=${delAgain.status}`);

  // ── 4. FULL FOOTPRINT VERIFICATION ────────────────────────────────────────
  const vGone = await db.user.findUnique({ where: { id: victim.id } });
  check("db: user row gone", !vGone);

  const [rep, kpi, mkc, upf] = await Promise.all([
    db.report.count({ where: { userId: victim.id } }),
    db.kpiResult.count({ where: { userId: victim.id } }),
    db.memberKpiConfig.count({ where: { userId: victim.id } }),
    db.uploadedFile.count({ where: { userId: victim.id } }),
  ]);
  check("db: reports + KPI results + member config + uploads purged", rep === 0 && kpi === 0 && mkc === 0 && upf === 0, `reports=${rep} kpi=${kpi} mkc=${mkc} uploads=${upf}`);
  check("db: physical upload file unlinked", !existsSync(`${STORAGE_DIR}/e2e-del-${STAMP}.txt`));

  const [actV, psubV, pevtV, pprefV, pdelV] = await Promise.all([
    db.activityEvent.count({ where: { userId: victim.id } }),
    db.pushSubscription.count({ where: { userId: victim.id } }),
    db.pushEvent.count({ where: { userId: victim.id } }),
    db.pushPreference.count({ where: { userId: victim.id } }),
    db.pushDelivery.count({ where: { OR: [{ event: { userId: victim.id } }, { subscription: { userId: victim.id } }] } }),
  ]);
  check("db: activity + push rows purged (incl. PushDelivery grandchildren)", actV === 0 && psubV === 0 && pevtV === 0 && pprefV === 0 && pdelV === 0, `activity=${actV} pushSub=${psubV} pushEvents=${pevtV} pushPrefs=${pprefV} pushDeliveries=${pdelV}`);

  const [ownN, aboutN, inboxN] = await Promise.all([
    db.notification.count({ where: { userId: victim.id } }),
    db.notification.count({ where: { OR: [{ linkData: { contains: `"userId":"${victim.id}"` } }, { dedupeKey: { contains: `:${victim.id}:` } }] } }),
    db.notification.count({ where: { linkData: { contains: fp.sentEscalationId } } }),
  ]);
  check("db: victim's notifications gone; alerts-about-victim gone (both branch patterns)", ownN === 0 && aboutN === 0, `own=${ownN} about=${aboutN}`);
  const inboxCopyGone = (await db.notification.findUnique({ where: { dedupeKey: `e2e-del-inboxcopy:${STAMP}` } })) === null;
  check("db: admin's escalation inbox-copy about the victim purged", inboxCopyGone && inboxN === 0);
  const canaryAlive = await db.notification.findUnique({ where: { id: canary.id } });
  check("db: unrelated canary notification SURVIVES", !!canaryAlive);

  const sentEsc = await db.escalation.count({ where: { fromId: victim.id } });
  const targetedEsc = await db.escalation.findFirst({ where: { subject: "Targeted at victim" } });
  check("db: sent escalation purged; targeted escalation kept with link severed + name kept",
    sentEsc === 0 && !!targetedEsc && targetedEsc.targetUserId === null && targetedEsc.targetName === "E2E Delete Victim",
    `sent=${sentEsc} targetUserId=${targetedEsc?.targetUserId} targetName=${targetedEsc?.targetName}`);

  const tCreated = await db.task.findUnique({ where: { id: fp.createdTaskId } });
  const tAssigned = await db.task.findUnique({ where: { id: fp.assignedTaskId } });
  const taCount = await db.taskAssignee.count({ where: { userId: victim.id } });
  check("db: created-by task re-owned by the deleting admin; assigned task unassigned; assignee link gone",
    tCreated?.createdById === admin.id && tAssigned?.assigneeId === null && taCount === 0,
    `createdById=${tCreated?.createdById} assigneeId=${tAssigned?.assigneeId} taskAssignee=${taCount}`);

  const notice = await db.notice.findFirst({ where: { title: fp.noticeTitle } });
  check("db: notice survives with author link severed but name preserved",
    !!notice && notice.authorId === null && notice.authorName === "E2E Delete Victim",
    `authorId=${notice?.authorId} authorName=${notice?.authorName}`);

  const auditEntry = await db.auditLog.findFirst({ where: { action: "DELETE_USER", entityId: victim.id } });
  check("db: DELETE_USER audit entry written with provenance",
    !!auditEntry && auditEntry.details?.includes(VICTIM.email) === true && auditEntry.userId === admin.id,
    `details=${(auditEntry?.details || "").slice(0, 70)}`);

  // victim2 minimal-footprint checks
  const v2Gone = await db.user.findUnique({ where: { id: victim2.id } });
  const v2OwnN = await db.notification.count({ where: { userId: victim2.id } });
  const v2Push = await db.pushEvent.count({ where: { userId: victim2.id } });
  check("db: victim2 (no escalations) fully removed incl. push rows — empty-OR path safe", !v2Gone && v2OwnN === 0 && v2Push === 0, `user=${!!v2Gone} notif=${v2OwnN} push=${v2Push}`);

  console.log(`\n=== ${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} ===`);
  await purge();
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch(async (e) => {
    console.error("E2E crashed:", e);
    await purge();
    process.exit(1);
  });
