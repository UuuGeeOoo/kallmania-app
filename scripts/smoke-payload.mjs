// Deploy payload smoke test — runs against the TRIMMED standalone dist that
// the FC deployment will actually execute (next-service-dist). Proves the
// outputFileTracingExcludes surgery broke nothing: page render, auth+DB
// roundtrip, admin user listing, and the full admin permanent-delete path.
const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
let failures = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
};

async function main() {
  // 1. page render
  const home = await fetch(`${BASE}/`);
  const html = await home.text();
  check("home page 200", home.status === 200, `status=${home.status}`);
  check("home page renders app HTML", /Kallmania/i.test(html), html.length + " bytes");

  // 2. auth API up (login-screen poll endpoint)
  const auth = await fetch(`${BASE}/api/auth`);
  check("GET /api/auth responds", auth.status === 200 || auth.status === 401 || auth.status === 400, `status=${auth.status}`);

  // 3. DB roundtrip: real account + wrong password must reach the DB and bcrypt-verify
  const bad = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "opeace@kallmania.com", password: "definitely-wrong-smoke-test" }),
  });
  check("login with wrong password → 401 (DB+bcrypt roundtrip OK)", bad.status === 401, `status=${bad.status}`);

  // 4. admin path: create temp admin via Prisma, list users, delete temp agent
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash("smoke-delete-2026", 10);
    const admin = await db.user.create({ data: { email: "smoke-admin@kallmania.test", fullName: "Smoke Admin", role: "ADMIN", department: "MANAGEMENT", employeeId: "SMOKE-1", passwordHash, status: "APPROVED", country: "NG", state: "Enugu" } });
    const agent = await db.user.create({ data: { email: "smoke-agent@kallmania.test", fullName: "Smoke Agent", role: "AGENT_BPO", department: "BPO", team: "INBOUND", employeeId: "SMOKE-2", passwordHash, status: "APPROVED", country: "NG", state: "Enugu" } });
    // give the agent FK children (push event etc.) so the delete exercises the cascade path
    await db.pushEvent.create({ data: { userId: agent.id, type: "LOGIN", title: "t", body: "b" } });
    await db.activityEvent.create({ data: { userId: agent.id, eventType: "LOGIN" } });

    const login = await fetch(`${BASE}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email: admin.email, password: "smoke-delete-2026" }),
    });
    const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
    const loginOk = login.status === 200 && cookie;
    check("temp admin login via trimmed dist", loginOk, `status=${login.status}`);

    if (loginOk) {
      const list = await fetch(`${BASE}/api/users`, { headers: { cookie } });
      const listBody = await list.json().catch(() => ({}));
      check("admin user list works", list.status === 200 && Array.isArray(listBody?.users), `status=${list.status} count=${listBody?.users?.length}`);

      const del = await fetch(`${BASE}/api/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ userId: agent.id, action: "delete" }),
      });
      const delBody = await del.json().catch(() => ({}));
      check("permanent user delete works in trimmed dist", del.status === 200 && delBody?.deleted === true, `status=${del.status} ${JSON.stringify(delBody).slice(0, 80)}`);
      const gone = (await db.user.findUnique({ where: { id: agent.id } })) === null;
      check("deleted user really gone from DB", gone);
    }

    await db.user.delete({ where: { id: admin.id } }).catch(async () => {
      await db.escalation.deleteMany({ where: { fromId: admin.id } });
      await db.user.delete({ where: { id: admin.id } });
    });
    await db.auditLog.deleteMany({ where: { entityId: { in: [admin.id, agent.id] } } });
  } finally {
    await db.$disconnect();
  }

  console.log(failures === 0 ? "\nSMOKE ALL PASS" : `\n${failures} SMOKE FAILURE(S)`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("SMOKE CRASHED:", e);
  process.exitCode = 1;
});
