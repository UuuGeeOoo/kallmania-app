/**
 * E2E: forgot-password flow — request → admin approves → agent sets new password.
 * Covers: unknown email, PENDING account, live-request dedupe, status polling,
 * admin list + approve + deny, one-time consumption, old/new password login,
 * reuse rejection, non-admin access to the admin API.
 * Cleans up every row it created.
 *
 * Run: DATABASE_URL=<real> node scripts/e2e-password-reset-flow.mjs
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = process.env.BASE_URL || "http://localhost:3000";
const TS = Date.now();
const AGENT_EMAIL = `pwreset-e2e-${TS}@kallmania.test`;
const ADMIN = { email: "verify-admin@kallmania.test", password: "verify-2026" };

let results = [];
const ok = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
};

function jarClient() {
  let cookie = "";
  return {
    async post(path, body) {
      const res = await fetch(BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      });
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      let json = null;
      try { json = await res.json(); } catch { /* html */ }
      return { status: res.status, json };
    },
    async req(method, path, body) {
      const res = await fetch(BASE + path, {
        method,
        headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try { json = await res.json(); } catch { /* html */ }
      return { status: res.status, json };
    },
  };
}

const admin = jarClient();
const agent = jarClient();

const main = async () => {
  // 0. Admin session (seeded verify admin)
  const login = await admin.post("/api/auth", { action: "login", ...ADMIN });
  ok("admin login", login.status === 200, `status ${login.status}`);

  // 1. Register a fresh test agent (PENDING until approved)
  const reg = await agent.post("/api/auth", {
    action: "register", email: AGENT_EMAIL, password: "OldPass-2026!", fullName: "PW Reset E2E",
    team: "OUTBOUND", position: "AGENT",
  });
  ok("test agent registered", reg.status === 201 || reg.status === 200, `status ${reg.status}`);
  const created = await prisma.user.findUnique({ where: { email: AGENT_EMAIL } });
  ok("test agent exists in DB", !!created);

  // 2. Forgot-password for a PENDING account is refused (admin confirms those)
  const pendingReq = await agent.post("/api/auth", { action: "requestPasswordReset", email: AGENT_EMAIL });
  ok("PENDING account refused", pendingReq.status === 403, `status ${pendingReq.status}`);
  // approve the account so it is a normal agent
  const approveUser = await admin.req("PATCH", "/api/users", { userId: created.id, action: "approve" });
  ok("admin approves test agent", approveUser.status === 200, `status ${approveUser.status}`);
  // sign the agent in — later checks need a real NON-admin session
  const agentLogin = await agent.post("/api/auth", { action: "login", email: AGENT_EMAIL, password: "OldPass-2026!" });
  ok("test agent logs in", agentLogin.status === 200, `status ${agentLogin.status}`);

  // 3. Unknown email → explicit 404
  const unknown = await agent.post("/api/auth", { action: "requestPasswordReset", email: `nobody-${TS}@kallmania.test` });
  ok("unknown email → 404", unknown.status === 404, `status ${unknown.status}`);

  // 4. Agent requests a reset
  const req1 = await agent.post("/api/auth", { action: "requestPasswordReset", email: AGENT_EMAIL });
  ok("reset request accepted", req1.status === 200 && req1.json?.status === "PENDING", `status ${req1.status}`);
  // 5. Duplicate request dedupes to the same live request
  const req2 = await agent.post("/api/auth", { action: "requestPasswordReset", email: AGENT_EMAIL });
  ok("duplicate request stays PENDING (no dup)", req2.status === 200 && req2.json?.status === "PENDING");
  const dbReqs = await prisma.passwordResetRequest.findMany({ where: { email: AGENT_EMAIL } });
  ok("exactly one request row", dbReqs.length === 1, `${dbReqs.length} rows`);

  // 6. Status polling from the login screen
  const st1 = await agent.post("/api/auth", { action: "passwordResetStatus", email: AGENT_EMAIL });
  ok("status polls PENDING", st1.status === 200 && st1.json?.status === "PENDING");

  // 7. Complete WITHOUT approval is rejected
  const early = await agent.post("/api/auth", { action: "completePasswordReset", email: AGENT_EMAIL, newPassword: "Hacked-123!" });
  ok("set-password before approval rejected", early.status === 403, `status ${early.status}`);

  // 8. Admin API is admin-only
  const anonList = await agent.req("GET", "/api/password-resets");
  ok("non-admin list → 403", anonList.status === 403, `status ${anonList.status}`);
  const noAuth = await fetch(BASE + "/api/password-resets");
  ok("anonymous list → 401", noAuth.status === 401, `status ${noAuth.status}`);

  // 9. Admin sees the request and approves it
  const list = await admin.req("GET", "/api/password-resets");
  const mine = (list.json?.requests || []).find((r) => r.email === AGENT_EMAIL);
  ok("request visible to admin", !!mine, mine ? `status ${mine.status}` : "");
  ok("request carries account info", mine?.fullName === "PW Reset E2E" && mine?.role === "AGENT_BPO");
  const appr = await admin.req("PATCH", "/api/password-resets", { id: mine.id, action: "approve" });
  ok("admin approves request", appr.status === 200 && appr.json?.status === "APPROVED", `status ${appr.status}`);
  const again = await admin.req("PATCH", "/api/password-resets", { id: mine.id, action: "approve" });
  ok("re-approve rejected", again.status === 400, `status ${again.status}`);

  // 10. Agent polls → APPROVED (the go-ahead)
  const st2 = await agent.post("/api/auth", { action: "passwordResetStatus", email: AGENT_EMAIL });
  ok("status polls APPROVED (go-ahead)", st2.json?.status === "APPROVED");

  // 11. Short password refused
  const shortPw = await agent.post("/api/auth", { action: "completePasswordReset", email: AGENT_EMAIL, newPassword: "123" });
  ok("short password refused", shortPw.status === 400, `status ${shortPw.status}`);

  // 12. Set the new password (one-time consumption)
  const done = await agent.post("/api/auth", { action: "completePasswordReset", email: AGENT_EMAIL, newPassword: "NewPass-2026!" });
  ok("new password set", done.status === 200, `status ${done.status}`);

  // 13. Old password no longer works; new one does
  const oldLogin = await agent.post("/api/auth", { action: "login", email: AGENT_EMAIL, password: "OldPass-2026!" });
  ok("old password rejected", oldLogin.status === 401, `status ${oldLogin.status}`);
  const newLogin = await agent.post("/api/auth", { action: "login", email: AGENT_EMAIL, password: "NewPass-2026!" });
  ok("new password logs in", newLogin.status === 200, `status ${newLogin.status}`);

  // 14. The approval is consumed exactly once
  const reuse = await agent.post("/api/auth", { action: "completePasswordReset", email: AGENT_EMAIL, newPassword: "Again-123!" });
  ok("approval reuse rejected", reuse.status === 403, `status ${reuse.status}`);
  const st3 = await agent.post("/api/auth", { action: "passwordResetStatus", email: AGENT_EMAIL });
  ok("status polls USED", st3.json?.status === "USED");

  // 15. Deny path: fresh request → deny → no go-ahead
  const req3 = await agent.post("/api/auth", { action: "requestPasswordReset", email: AGENT_EMAIL });
  ok("fresh request after use", req3.status === 200 && req3.json?.status === "PENDING");
  const list2 = await admin.req("GET", "/api/password-resets");
  const mine2 = (list2.json?.requests || []).find((r) => r.email === AGENT_EMAIL && r.status === "PENDING");
  const deny = await admin.req("PATCH", "/api/password-resets", { id: mine2.id, action: "deny" });
  ok("admin denies request", deny.status === 200 && deny.json?.status === "DENIED");
  const st4 = await agent.post("/api/auth", { action: "passwordResetStatus", email: AGENT_EMAIL });
  ok("status polls DENIED", st4.json?.status === "DENIED");
  const deniedSet = await agent.post("/api/auth", { action: "completePasswordReset", email: AGENT_EMAIL, newPassword: "Denied-123!" });
  ok("denied request cannot set password", deniedSet.status === 403, `status ${deniedSet.status}`);

  // 16. Cleanup — remove the test user and everything referencing it
  await prisma.passwordResetRequest.deleteMany({ where: { email: AGENT_EMAIL } });
  await prisma.notification.deleteMany({ where: { user: { email: AGENT_EMAIL } } });
  await prisma.pushEvent.deleteMany({ where: { userId: created.id } });
  await prisma.pushSubscription.deleteMany({ where: { userId: created.id } });
  await prisma.pushPreference.deleteMany({ where: { userId: created.id } }).catch(() => {});
  await prisma.activityEvent.deleteMany({ where: { userId: created.id } });
  await prisma.auditLog.deleteMany({ where: { userId: created.id } });
  await prisma.auditLog.deleteMany({ where: { entityId: created.id } });
  await prisma.user.delete({ where: { id: created.id } });
  const gone = await prisma.user.findUnique({ where: { email: AGENT_EMAIL } });
  ok("cleanup: test user removed", !gone);

  await admin.post("/api/auth", { action: "logout" });
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
