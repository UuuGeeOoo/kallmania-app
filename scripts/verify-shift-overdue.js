/* E2E verify: shift-aware overdue-report notifications.
 * A part-timer scheduled Tue+Thu (mask 0101000) must be alerted when they miss a
 * TUESDAY report, and must NEVER be alerted for their off days (Friday).
 * Also checks consolidated "missing" and dashboard "expected to report" honour the
 * shift, and that deleting a user purges alerts about them from every inbox. */
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
const PART_TIMER = { email: `sv-pt-${stamp}@kallmania.test`, password: "@ptpass1", fullName: `Verify PartTimer ${stamp}`, team: "OUTBOUND", position: "AGENT", country: "NG", state: "Lagos" };
const WORKDAY = "2026-10-20"; // Tuesday — scheduled (mask 0101000)
const OFFDAY = "2026-10-23";  // Friday — off

async function overdueFor(agentId, dateISO) {
  const r = await api("/api/notifications");
  return (r.json?.notifications || []).filter(
    (n) => n.type === "REPORT_OVERDUE" && (n.linkData || "").includes(agentId) && (n.linkData || "").includes(dateISO)
  );
}

async function main() {
  // ── 1. Admin login ────────────────────────────────────────────────
  let r = await login("echristian@kallmania.com", "@21279413");
  check("admin login", r.status === 200 && r.json?.success);

  // ── 2. Create part-timer with Tue+Thu schedule ────────────────────
  await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "register", ...PART_TIMER }) });
  const list = await api("/api/users");
  const u = (list.json?.users || []).find((x) => x.email === PART_TIMER.email);
  check("part-timer created", !!u);
  if (!u) return finish();
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: u.id, action: "approve" }) });
  check("part-timer approved", r.status === 200 && r.json?.success, r.json?.error);
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: u.id, action: "setSchedule", employmentType: "PART_TIME", workDays: "0101000", shiftStart: "09:00", shiftEnd: "13:00" }) });
  check("schedule set to Tue+Thu part-time", r.status === 200 && r.json?.success && r.json?.schedule?.summary?.includes("Tue"), r.json?.schedule?.summary || r.json?.error);

  // ── 3. Trigger the lazy overdue check for both dates (dashboard loads) ──
  await api(`/api/dashboard?date=${OFFDAY}`);
  await api(`/api/dashboard?date=${WORKDAY}`);

  // ── 4. Poll the admin inbox (check runs fire-and-forget) ──────────
  let workdayAlerts = [];
  for (let i = 0; i < 24; i++) {
    workdayAlerts = await overdueFor(u.id, WORKDAY);
    if (workdayAlerts.length) break;
    await new Promise((res) => setTimeout(res, 500));
  }
  check("missed WORKDAY (Tue 2026-10-20) report → alert generated", workdayAlerts.length >= 1);

  const offdayAlerts = await overdueFor(u.id, OFFDAY);
  check("OFF day (Fri 2026-10-23) → NO alert generated", offdayAlerts.length === 0, `found=${offdayAlerts.length}`);

  // ── 5. Consolidated "missing" list honours the shift ──────────────
  r = await api(`/api/consolidated?date=${OFFDAY}`);
  const offMissing = r.json?.departments?.BPO?.employeesMissing || [];
  check("consolidated OFF day: part-timer NOT listed missing", !offMissing.includes(PART_TIMER.fullName), `BPO missing=${offMissing.length}`);
  r = await api(`/api/consolidated?date=${WORKDAY}`);
  const workMissing = r.json?.departments?.BPO?.employeesMissing || [];
  check("consolidated WORKDAY: part-timer listed missing", workMissing.includes(PART_TIMER.fullName));

  // ── 6. Dashboard "expected to report" honours the shift ───────────
  const dOff = await api(`/api/dashboard?date=${OFFDAY}`);
  const dWork = await api(`/api/dashboard?date=${WORKDAY}`);
  const expOff = dOff.json?.supervisor?.expectedToReport;
  const expWork = dWork.json?.supervisor?.expectedToReport;
  check("dashboard expectedToReport: workday > offday", typeof expOff === "number" && typeof expWork === "number" && expWork > expOff, `off=${expOff} work=${expWork}`);
  const outOff = dOff.json?.supervisor?.outstandingReports;
  const outWork = dWork.json?.supervisor?.outstandingReports;
  check("dashboard outstandingReports: workday > offday", typeof outOff === "number" && typeof outWork === "number" && outWork > outOff, `off=${outOff} work=${outWork}`);

  // ── 7. Cleanup: delete the part-timer; alerts about them must vanish ──
  r = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId: u.id, action: "delete" }) });
  check("test user deleted", r.status === 200 && r.json?.deleted, r.json?.error);
  const leftovers = await overdueFor(u.id, WORKDAY);
  check("alerts about deleted user purged from inboxes", leftovers.length === 0, `left=${leftovers.length}`);

  finish();
}
function finish() {
  console.log(results.join("\n"));
  console.log(process.exitCode ? "\nRESULT: FAIL" : "\nRESULT: ALL PASS");
}
main().catch((e) => { console.error(e); process.exitCode = 1; finish(); });
