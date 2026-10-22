// API verification: TL team-scoped assignment + per-team templates
const BASE = "http://localhost:3000";
async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email, password }) });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`login failed for ${email}: ${await res.text()}`);
  return cookie;
}
async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
(async () => {
  const tl = await login("tl.outbound@test.kallmania.com", "testpass123");
  const admin = await login("echristian@kallmania.com", "@21279413");
  const { json: { users } } = await api(admin, "GET", "/api/users");
  const out1 = users.find((u) => u.email === "agent.out1@test.kallmania.com");
  const email1 = users.find((u) => u.email === "agent.email1@test.kallmania.com");

  // 1. TL assigns to SAME-team agent -> success
  const same = await api(tl, "POST", "/api/tasks", { title: "TL team test — same team", assigneeIds: [out1.id], department: "BPO" });
  console.log(`1. TL -> same-team agent: ${same.status === 201 ? "PASS" : "FAIL"} (${same.status})`);

  // 2. TL assigns to DIFFERENT-team agent -> 403 with team message
  const cross = await api(tl, "POST", "/api/tasks", { title: "TL team test — cross team", assigneeIds: [email1.id], department: "BPO" });
  console.log(`2. TL -> other-team agent: ${cross.status === 403 && String(cross.json.error).includes("not in your team") ? "PASS" : "FAIL"} (${cross.status}: ${cross.json.error})`);

  // 3. TL tries whole-centre broadcast -> 403
  const centre = await api(tl, "POST", "/api/tasks", { title: "TL broadcast attempt", centreCountry: "NG", centreState: "Enugu" });
  console.log(`3. TL -> whole-centre broadcast: ${centre.status === 403 ? "PASS" : "FAIL"} (${centre.status}: ${centre.json.error})`);

  // 4. TL picker list (/api/users) contains ONLY own team
  const { json: { users: tlUsers } } = await api(tl, "GET", "/api/users");
  const teams = [...new Set(tlUsers.map((u) => u.team))];
  console.log(`4. TL staff list teams: ${teams.length === 1 && teams[0] === "OUTBOUND" ? "PASS" : "FAIL"} (${JSON.stringify(tlUsers.map((u) => `${u.fullName}:${u.team}`))})`);

  // 5. Admin assigns across teams -> success
  const adminBoth = await api(admin, "POST", "/api/tasks", { title: "Admin cross-team test", assigneeIds: [out1.id, email1.id] });
  console.log(`5. Admin -> cross-team pair: ${adminBoth.status === 201 ? "PASS" : "FAIL"} (${adminBoth.status})`);

  // 6. Templates: GET each key -> distinct defaults
  for (const key of ["TL_OUTBOUND", "TL_INBOUND", "TL_SOCIAL", "TL_TECH", "TEAM_LEAD"]) {
    const r = await api(tl, "GET", `/api/report-template?key=${key}`);
    const t = r.json.template;
    console.log(`6. ${key}: ${r.status === 200 && t.definition.title ? `PASS (${r.json.isCustom ? "custom" : "default"} — ${t.definition.title}, ${t.definition.sections.length} sections)` : "FAIL " + JSON.stringify(r.json).slice(0, 100)}`);
  }

  // 7. Template edit + reset on TL_INBOUND
  const inb = await api(tl, "GET", "/api/report-template?key=TL_INBOUND");
  const def = inb.json.template.definition;
  def.sections[1].metrics[0].target = 999;
  const put = await api(tl, "PUT", "/api/report-template", { key: "TL_INBOUND", name: "Inbound Call Centre — Team Lead Daily Report Template", definition: def });
  const after = await api(tl, "GET", "/api/report-template?key=TL_INBOUND");
  const edited = after.json.isCustom && after.json.template.definition.sections[1].metrics[0].target === 999;
  const del = await api(tl, "DELETE", "/api/report-template?key=TL_INBOUND");
  const restored = await api(tl, "GET", "/api/report-template?key=TL_INBOUND");
  console.log(`7. TL_INBOUND edit/reset: ${put.status === 200 && edited && del.status === 200 && !restored.json.isCustom ? "PASS" : "FAIL"} (put=${put.status}, custom=${after.json.isCustom}, reset=${del.status}, back-to-default=${!restored.json.isCustom})`);

  // 8. Unknown key rejected
  const bad = await api(tl, "GET", "/api/report-template?key=NOPE");
  console.log(`8. Unknown key: ${bad.status === 404 ? "PASS" : "FAIL"} (${bad.status})`);

  // cleanup tasks created during the test
  const { json: { tasks } } = await api(admin, "GET", "/api/tasks");
  for (const t of tasks.filter((x) => x.title.includes("test") || x.title.includes("attempt"))) {
    await api(admin, "DELETE", `/api/tasks?id=${t.id}`);
  }
  console.log("cleanup: test tasks deleted");
})().catch((e) => { console.error("FAIL:", e); process.exit(1); });
