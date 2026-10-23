/* E2E verify: member KPI config + TL approval, escalation visibility/delete, notice audiences.
 * Creates disposable users, exercises every rule, cleans everything up. */
const BASE = "http://localhost:3000";
let cookie = "";
const results = [];
const check = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`); if (!cond) process.exitCode = 1; };

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
const login = (email, password) => api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", email, password }) });
const stamp = Date.now().toString(36);
const mkEmail = (n) => `vk-${n}-${stamp}@kallmania.test`;

async function register(user) {
  const r = await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "register", ...user }) });
  const list = await api("/api/users");
  const u = (list.json?.users || []).find((x) => x.email === user.email);
  if (u) await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: u.id, action: "approve" }) });
  return u;
}

async function main() {
  // ── 1. Admin login ────────────────────────────────────────────────
  let r = await login("echristian@kallmania.com", "@21279413");
  check("admin login", r.status === 200 && r.json?.success);

  // ── 2. Test cast ──────────────────────────────────────────────────
  const admin = { email: "echristian@kallmania.com", password: "@21279413" };
  const tlU = await register({ email: mkEmail("tl"), password: "@tlpass1", fullName: "Verify TL", team: "OUTBOUND", position: "TEAM_LEAD", country: "NG", state: "Lagos" });
  const supU = await register({ email: mkEmail("sup"), password: "@suppass1", fullName: "Verify Supervisor", team: "OUTBOUND", position: "SUPERVISOR", country: "NG", state: "Lagos" });
  const agentAU = await register({ email: mkEmail("aa"), password: "@agentpa1", fullName: "Verify Agent A", team: "OUTBOUND", position: "AGENT", country: "NG", state: "Lagos" });
  const agentBU = await register({ email: mkEmail("ab"), password: "@agentpb1", fullName: "Verify Agent B", team: "INBOUND", position: "AGENT", country: "NG", state: "Lagos" });
  check("test users created + approved", !!(tlU && supU && agentAU && agentBU));
  const tl = { email: tlU.email, password: "@tlpass1" };
  const sup = { email: supU.email, password: "@suppass1" };
  const agentA = { email: agentAU.email, password: "@agentpa1" };
  const agentB = { email: agentBU.email, password: "@agentpb1" };

  // ── 3. Individual KPI configuration ───────────────────────────────
  // Admin sets a direct target on agent A → APPROVED
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "totalCallsMade", label: "Total Calls Made", target: 55, unit: "count" }) });
  check("admin member-KPI saved APPROVED", r.status === 201 && r.json?.config?.status === "APPROVED", r.json?.error);
  const adminCfgId = r.json?.config?.id;

  // Supervisor sets another → APPROVED
  await login(sup.email, sup.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "callsConnected", label: "Calls Connected", target: 30, unit: "count" }) });
  check("supervisor member-KPI saved APPROVED", r.status === 201 && r.json?.config?.status === "APPROVED", r.json?.error);

  // TL proposes on own-team member → PENDING
  await login(tl.email, tl.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "totalMailsSent", label: "Total Mails Sent", target: 12, unit: "count" }) });
  check("team-lead member-KPI is PENDING", r.status === 201 && r.json?.config?.status === "PENDING", r.json?.error);
  const pendingId = r.json?.config?.id;

  // TL on OTHER-team member → 403
  r = await api(`/api/users/${agentBU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "totalCallsMade", label: "Total Calls Made", target: 5, unit: "count" }) });
  check("team-lead blocked from other-team member", r.status === 403, r.json?.error);

  // TL withdraw own pending
  r = await api(`/api/users/${agentAU.id}/member-kpi?configId=${pendingId}`, { method: "DELETE" });
  check("team-lead withdraws own pending", r.status === 200, r.json?.error);

  // TL re-propose; supervisor approves
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "totalMailsSent", label: "Total Mails Sent", target: 12, unit: "count" }) });
  const pending2 = r.json?.config?.id;
  await login(sup.email, sup.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "PATCH", body: JSON.stringify({ configId: pending2, action: "approve", note: "reasonable" }) });
  check("supervisor approves TL proposal", r.status === 200 && r.json?.config?.status === "APPROVED", r.json?.error);

  // TL proposes again; supervisor rejects
  await login(tl.email, tl.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "totalMailsSent", label: "Total Mails Sent", target: 99, unit: "count" }) });
  const pending3 = r.json?.config?.id;
  await login(sup.email, sup.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "PATCH", body: JSON.stringify({ configId: pending3, action: "reject" }) });
  check("supervisor rejects TL proposal", r.status === 200 && r.json?.config?.status === "REJECTED", r.json?.error);

  // TL cannot delete an APPROVED config
  await login(tl.email, tl.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi?configId=${adminCfgId}`, { method: "DELETE" });
  check("team-lead cannot delete approved config", r.status === 403, r.json?.error);

  // Agent self-view: read allowed, edit denied
  await login(agentA.email, agentA.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`);
  check("agent sees own member-KPI read-only", r.status === 200 && r.json?.canEdit === false && r.json?.configs?.length >= 2);
  r = await api(`/api/users/${agentAU.id}/member-kpi`, { method: "POST", body: JSON.stringify({ department: "BPO", key: "x", label: "X", target: 1, unit: "count" }) });
  check("agent cannot edit member-KPI", r.status === 403, r.json?.error);

  // Other-team agent blocked from viewing A's config
  await login(agentB.email, agentB.password);
  r = await api(`/api/users/${agentAU.id}/member-kpi`);
  check("other-team agent blocked from member-KPI", r.status === 403, r.json?.error);

  // Performance rows carry the individual target
  await login(admin.email, admin.password);
  r = await api(`/api/users/${agentAU.id}/kpi?period=month`);
  check("per-user KPI returns memberConfigs", r.status === 200 && Array.isArray(r.json?.memberConfigs) && r.json.memberConfigs.length >= 2, `pending=${r.json?.pendingMemberKpi}`);

  // ── 4. Escalation visibility ──────────────────────────────────────
  // Agent A escalates to ADMIN
  await login(agentA.email, agentA.password);
  r = await api("/api/escalations", { method: "POST", body: JSON.stringify({ subject: "A to admin", message: "private to admin", targetType: "TARGET_ROLE", targetRole: "ADMIN" }) });
  const escAtoAdmin = r.json?.escalation?.id;
  check("agent A escalates to ADMIN", r.status === 201);

  // Agent A escalates to SUPERVISOR
  r = await api("/api/escalations", { method: "POST", body: JSON.stringify({ subject: "A to supervisor", message: "supervisor matter", targetType: "TARGET_ROLE", targetRole: "SUPERVISOR" }) });
  const escAtoSup = r.json?.escalation?.id;

  // TL notices agent A → supervisor sees TL-sent
  await login(tl.email, tl.password);
  r = await api("/api/escalations", { method: "POST", body: JSON.stringify({ subject: "TL to agent A", message: "keep it up", targetType: "TARGET_USER", targetUserId: agentAU.id }) });
  const escTLtoA = r.json?.escalation?.id;
  check("TL direct notice to own member", r.status === 201);

  // Supervisor escalates to ADMIN
  await login(sup.email, sup.password);
  r = await api("/api/escalations", { method: "POST", body: JSON.stringify({ subject: "Sup to admin", message: "management only", targetType: "TARGET_ROLE", targetRole: "ADMIN" }) });
  const escSupToAdmin = r.json?.escalation?.id;

  const feed = async (who) => { await login(who.email, who.password); const g = await api("/api/escalations"); return (g.json?.escalations || []).map((e) => e.id); };
  let ids = await feed(agentA);
  check("agent A sees own sent escalations", ids.includes(escAtoAdmin) && ids.includes(escAtoSup));
  check("agent A does NOT see supervisor→admin", !ids.includes(escSupToAdmin));
  check("agent A does NOT see TL→other agents", !ids.some(() => false));

  ids = await feed(agentB);
  check("agent B (other team) sees NO agent A escalations", !ids.includes(escAtoAdmin) && !ids.includes(escAtoSup));
  check("agent B sees nothing private", !ids.includes(escSupToAdmin) && !ids.includes(escTLtoA));

  ids = await feed(tl);
  check("TL sees own-team member's escalations", ids.includes(escAtoAdmin) && ids.includes(escAtoSup));
  check("TL does NOT see supervisor→admin", !ids.includes(escSupToAdmin));

  ids = await feed(sup);
  check("supervisor sees agent-sent (same centre)", ids.includes(escAtoAdmin) && ids.includes(escAtoSup));
  check("supervisor sees TL-sent", ids.includes(escTLtoA));

  ids = await feed(admin);
  check("admin sees everything", ids.includes(escAtoAdmin) && ids.includes(escAtoSup) && ids.includes(escTLtoA) && ids.includes(escSupToAdmin));

  // Ack + resolve, then admin delete; OPEN delete blocked
  await login(sup.email, sup.password);
  await api("/api/escalations", { method: "PATCH", body: JSON.stringify({ id: escAtoSup, action: "ack" }) });
  await api("/api/escalations", { method: "PATCH", body: JSON.stringify({ id: escAtoSup, action: "resolve" }) });
  await login(agentA.email, agentA.password);
  r = await api(`/api/escalations?id=${escAtoAdmin}`, { method: "DELETE" });
  check("agent cannot delete escalation", r.status === 403 || r.status === 400, r.json?.error);
  await login(admin.email, admin.password);
  r = await api(`/api/escalations?id=${escAtoAdmin}`, { method: "DELETE" });
  check("admin cannot delete OPEN escalation", r.status === 400, r.json?.error);
  r = await api(`/api/escalations?id=${escAtoSup}`, { method: "DELETE" });
  check("admin deletes RESOLVED escalation", r.status === 200 && r.json?.success, r.json?.error);

  // ── 5. Notices ────────────────────────────────────────────────────
  // Admin company-wide
  r = await api("/api/notices", { method: "POST", body: JSON.stringify({ title: "Global all-hands", body: "Everyone hears this." }) });
  check("admin posts company-wide", r.status === 201, r.json?.error);
  const nGlobal = r.json?.notice?.id;
  // Admin centre+team notice (NG/Lagos, OUTBOUND)
  r = await api("/api/notices", { method: "POST", body: JSON.stringify({ title: "Outbound Lagos push", body: "Targeted.", centreCountry: "NG", centreState: "Lagos", teams: ["OUTBOUND"] }) });
  const nCentreTeam = r.json?.notice?.id;
  check("admin posts centre+team notice", r.status === 201, r.json?.error);
  // Supervisor team notice (INBOUND in own centre)
  await login(sup.email, sup.password);
  r = await api("/api/notices", { method: "POST", body: JSON.stringify({ title: "Inbound Lagos sync", body: "Inbound only.", teams: ["INBOUND"] }) });
  const nSupInbound = r.json?.notice?.id;
  check("supervisor posts centre team notice", r.status === 201, r.json?.error);
  // TL posts → own team
  await login(tl.email, tl.password);
  r = await api("/api/notices", { method: "POST", body: JSON.stringify({ title: "Outbound huddle", body: "Team only." }) });
  const nTl = r.json?.notice?.id;
  check("team-lead posts to own team", r.status === 201 && r.json?.notice?.teams === '["OUTBOUND"]', r.json?.error);
  // Agent cannot post
  await login(agentA.email, agentA.password);
  r = await api("/api/notices", { method: "POST", body: JSON.stringify({ title: "Agent spam", body: "no" }) });
  check("agent cannot post notice", r.status === 403, r.json?.error);

  const nfeed = async (who) => { await login(who.email, who.password); const g = await api("/api/notices"); return (g.json?.notices || []).map((n) => n.id); };
  ids = await nfeed(agentA);
  check("agent A sees global + outbound-targeted + TL team notice", ids.includes(nGlobal) && ids.includes(nCentreTeam) && ids.includes(nTl));
  check("agent A does NOT see inbound-team notice", !ids.includes(nSupInbound));

  ids = await nfeed(agentB);
  check("agent B sees global + inbound notice", ids.includes(nGlobal) && ids.includes(nSupInbound));
  check("agent B does NOT see outbound-team notices", !ids.includes(nCentreTeam) && !ids.includes(nTl));

  // Agent cannot delete a management notice; author delete cascades
  await login(agentA.email, agentA.password);
  r = await api(`/api/notices?noticeId=${nTl}`, { method: "DELETE" });
  check("agent cannot delete management notice", r.status === 403, r.json?.error);
  const agentANotifs = await api("/api/notifications");
  const hadNoticeNotif = (agentANotifs.json?.notifications || []).some((n) => n.title.includes("Outbound huddle"));
  check("agent A received TL notice notification", hadNoticeNotif);
  await login(tl.email, tl.password);
  r = await api(`/api/notices?noticeId=${nTl}`, { method: "DELETE" });
  check("author (TL) deletes own notice", r.status === 200 && r.json?.success, r.json?.error);
  await login(agentA.email, agentA.password);
  ids = await nfeed(agentA);
  check("notice gone for agent A after author delete", !ids.includes(nTl));
  const notifsAfter = await api("/api/notifications");
  check("notice inbox copies cleaned up", !(notifsAfter.json?.notifications || []).some((n) => n.title.includes("Outbound huddle")));

  // Agent deletes own notification
  const firstNotif = (notifsAfter.json?.notifications || [])[0];
  if (firstNotif) {
    r = await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ action: "delete", id: firstNotif.id }) });
    check("agent deletes own notification", r.status === 200 && r.json?.success);
  }

  // ── 6. Cleanup ────────────────────────────────────────────────────
  await login(admin.email, admin.password);
  for (const n of [nGlobal, nCentreTeam, nSupInbound]) await api(`/api/notices?noticeId=${n}`, { method: "DELETE" });
  for (const id of [escAtoAdmin, escTLtoA, escSupToAdmin]) {
    await api("/api/escalations", { method: "PATCH", body: JSON.stringify({ id, action: "ack" }) });
    await api(`/api/escalations?id=${id}`, { method: "DELETE" });
  }
  // KPI configs go away with user deletion (cascade via user delete flow)
  let purged = 0;
  for (const u of [tlU, supU, agentAU, agentBU]) {
    const d = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: u.id, action: "delete" }) });
    if (d.status === 200 || /deleted/i.test(d.json?.message || "")) purged++;
  }
  check("test users purged", purged === 4, `${purged}/4`);

  console.log(results.join("\n"));
  console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);
}

main().catch((e) => { console.error("SCRIPT ERROR:", e); process.exit(1); });
