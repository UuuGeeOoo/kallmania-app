// API-level verification of the report workflow guards:
//  1. same-day duplicate submission blocked (create + update paths)
//  2. submitted report cannot be submitted twice
//  3. corrections allowed while awaiting approval (status stays SUBMITTED)
//  4. approved reports locked: no corrections, no resubmission
//  5. other days are unaffected
const BASE = "http://localhost:3000";
const AGENT = { email: "e2e-agent@kallmania.test", password: "e2e-test-2026" };
const SUP = { email: "e2e-sup@kallmania.test", password: "e2e-test-2026" };

let failures = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` | ${extra}` : ""}`);
  if (!cond) failures++;
}

async function login(u) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", ...u }),
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login failed: " + (await res.text()));
  return cookie;
}

async function post(cookie, body) {
  const res = await fetch(`${BASE}/api/reports`, {
    method: "POST", headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const agent = await login(AGENT);
const sup = await login(SUP);

// ── 1. First submission for today: allowed ──
const r1 = await post(agent, { type: "AGENT_BPO", reportDate: today, submit: true, shiftTime: "09:00-17:00", attendanceStatus: "Present", kpiMetrics: [{ key: "totalCallsMade", label: "Total Calls Made", target: 30, targetLabel: "30", actual: 32, variance: 2, unit: "count", category: "CORE_TEMPLATE", auto: false, notes: "" }] });
check("first submit for today succeeds", r1.status === 201 || r1.status === 200, `status=${r1.status}`);
const report = r1.json?.report;
check("report is SUBMITTED", report?.status === "SUBMITTED", `status=${report?.status} ref=${report?.ref}`);

// ── 2. Duplicate: new report (no id), same day, submit → 409 ──
const r2 = await post(agent, { type: "AGENT_BPO", reportDate: today, submit: true });
check("duplicate create+submit same day blocked (409)", r2.status === 409, `status=${r2.status} msg=${r2.json?.error?.slice(0, 80)}`);

// ── 3. Duplicate: even a DRAFT create for a day with a live report is blocked ──
const r3 = await post(agent, { type: "AGENT_BPO", reportDate: today, submit: false });
check("draft create same day blocked while live report exists (409)", r3.status === 409, `status=${r3.status}`);

// ── 4. Resubmit the SAME report (submit=true on SUBMITTED id) → 409 ──
const r4 = await post(agent, { id: report.id, type: "AGENT_BPO", reportDate: today, submit: true });
check("re-submit of submitted report blocked (409)", r4.status === 409, `status=${r4.status} msg=${r4.json?.error?.slice(0, 80)}`);

// ── 5. Correction while awaiting approval: submit=false → 200, stays SUBMITTED ──
const r5 = await post(agent, { id: report.id, type: "AGENT_BPO", reportDate: today, submit: false, challenges: "corrected note while awaiting approval" });
check("correction on submitted report allowed", r5.status === 200, `status=${r5.status}`);
check("correction keeps status SUBMITTED", r5.json?.report?.status === "SUBMITTED", `status=${r5.json?.report?.status}`);
check("correction content saved", (r5.json?.report?.challenges || "").includes("corrected note"), "");

// ── 6. Other day: fresh draft + submit is fine ──
const r6 = await post(agent, { type: "AGENT_BPO", reportDate: yesterday, submit: false });
check("draft for another day allowed", r6.status === 201, `status=${r6.status}`);
const draftId = r6.json?.report?.id;
const r7 = await post(agent, { id: draftId, type: "AGENT_BPO", reportDate: yesterday, submit: true });
check("submit of yesterday draft allowed", r7.status === 200 && r7.json?.report?.status === "SUBMITTED", `status=${r7.status}`);
const r8 = await post(agent, { type: "AGENT_BPO", reportDate: yesterday, submit: true });
check("second submit for yesterday blocked (409)", r8.status === 409, `status=${r8.status}`);

// ── 7. Supervisor approves today's report ──
const pr = await fetch(`${BASE}/api/reports`, {
  method: "PATCH", headers: { "Content-Type": "application/json", cookie: sup },
  body: JSON.stringify({ id: report.id, decision: "approve", feedback: "well done" }),
});
const prj = await pr.json().catch(() => ({}));
check("supervisor approval succeeds", pr.status === 200 && prj?.report?.status === "APPROVED", `status=${pr.status}`);

// ── 8. Approved report: corrections blocked (403), resubmission blocked ──
const r9 = await post(agent, { id: report.id, type: "AGENT_BPO", reportDate: today, submit: false, challenges: "try to correct approved" });
check("correction on APPROVED report blocked (403)", r9.status === 403, `status=${r9.status} msg=${r9.json?.error?.slice(0, 70)}`);
const r10 = await post(agent, { id: report.id, type: "AGENT_BPO", reportDate: today, submit: true });
check("resubmit on APPROVED report blocked", r10.status === 403 || r10.status === 409, `status=${r10.status}`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
