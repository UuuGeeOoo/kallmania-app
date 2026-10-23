/* E2E verify: employment type + work schedule (register -> approve -> setSchedule -> profile edit -> cleanup). */
const BASE = "http://localhost:3000";
let cookie = "";

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function main() {
  const results = [];
  const check = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`); if (!cond) process.exitCode = 1; };

  // 1. Admin login
  let r = await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", email: "echristian@kallmania.com", password: "@21279413" }) });
  check("admin login", r.status === 200 && r.json?.success);

  // 2. Register a part-time agent (employmentType chosen at registration)
  const email = `pt-agent-${Date.now().toString(36)}@kallmania.com`;
  r = await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "register", email, password: "@parttime1", fullName: "Part Time Tester", team: "OUTBOUND", position: "AGENT", employmentType: "PART_TIME" }) });
  check("register agent with employmentType=PART_TIME", [200, 201].includes(r.status) && (r.json?.success || /Registration submitted/.test(r.json?.message || "")), r.json?.message || r.json?.error);

  // 2b. Invalid employmentType rejected
  r = await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "register", email: `bad-${email}`, password: "@parttime1", fullName: "Bad Type", team: "OUTBOUND", position: "AGENT", employmentType: "CASUAL" }) });
  check("invalid employmentType rejected", r.status === 400, r.json?.error);

  // 3. Find + approve the new user
  r = await api("/api/users");
  const created = (r.json?.users || []).find((u) => u.email === email);
  check("user list exposes schedule fields", !!created && "workDays" in created && "shiftStart" in created, created ? `${created.employmentType} ${created.workDays} ${created.shiftStart}-${created.shiftEnd}` : "not found");
  check("registered as PART_TIME", created?.employmentType === "PART_TIME");
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: created.id, action: "approve" }) });
  check("admin approves agent", r.status === 200 && r.json?.success);

  // 4. Admin sets a part-time schedule: Mon, Wed, Fri + Sat (weekend), 4h shift
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: created.id, action: "setSchedule", employmentType: "PART_TIME", workDays: "1010101", shiftStart: "09:00", shiftEnd: "13:00" }) });
  check("admin setSchedule part-time incl. weekend", r.status === 200 && r.json?.success, r.json?.schedule?.summary || r.json?.error);

  // 4b. Validation failures
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: created.id, action: "setSchedule", employmentType: "PART_TIME", workDays: "0000000", shiftStart: "09:00", shiftEnd: "13:00" }) });
  check("zero working days rejected", r.status === 400, r.json?.error);
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: created.id, action: "setSchedule", employmentType: "PART_TIME", workDays: "1111100", shiftStart: "14:00", shiftEnd: "09:00" }) });
  check("shift end before start rejected", r.status === 400, r.json?.error);

  // 5. Agent logs in, profile shows schedule; self-edits employment type
  cookie = "";
  r = await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", email, password: "@parttime1" }) });
  check("part-time agent can log in after approval", r.status === 200 && r.json?.success);
  r = await api("/api/profile");
  const p = r.json?.profile || {};
  check("profile GET carries schedule", p.employmentType === "PART_TIME" && p.workDays === "1010101" && p.shiftStart === "09:00" && p.shiftEnd === "13:00", `${p.employmentType} ${p.workDays} ${p.shiftStart}-${p.shiftEnd}`);

  r = await api("/api/profile", { method: "PATCH", body: JSON.stringify({ employmentType: "FULL_TIME" }) });
  check("agent self-edits employment type in profile", r.status === 200 && r.json?.profile?.employmentType === "FULL_TIME", r.json?.error);

  r = await api("/api/profile", { method: "PATCH", body: JSON.stringify({ employmentType: "SOMETHING" }) });
  check("profile rejects invalid employment type", r.status === 400, r.json?.error);

  // 6. Cleanup — delete test user permanently
  cookie = "";
  await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", email: "echristian@kallmania.com", password: "@21279413" }) });
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: created.id, action: "delete" }) });
  check("cleanup: test user deleted", r.status === 200 && r.json?.success);

  console.log(results.join("\n"));
}

main().catch((e) => { console.error("SCRIPT ERROR:", e); process.exit(1); });
