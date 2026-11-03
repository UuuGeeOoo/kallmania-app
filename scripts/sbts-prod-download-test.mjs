// End-to-end test of the REAL production host: login as admin, download both
// SBTS handover deliverables, validate the bytes.
const BASE = "https://kallmaniareportingcentre.space-z.ai";

const login = async () => {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "verify-admin@kallmania.test", password: "verify-2026" }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  if (!res.ok || !setCookie) throw new Error(`production login failed: ${res.status}`);
  return setCookie.split(";")[0];
};

const grab = async (cookie, file) => {
  const res = await fetch(`${BASE}/api/sbts/handover?file=${file}`, { headers: { cookie } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get("content-type") ?? "", disposition: res.headers.get("content-disposition") ?? "", buf };
};

const main = async () => {
  const cookie = await login();
  console.log("production login: OK");
  for (const [file, magic, label] of [
    ["pdf", "%PDF", "handover PDF"],
    ["xlsx", "PK", "roster XLSX"],
  ]) {
    const { status, type, disposition, buf } = await grab(cookie, file);
    const ok = status === 200 && buf.subarray(0, magic.length).toString() === magic;
    console.log(`${ok ? "PASS" : "FAIL"} — ${label}: HTTP ${status}, ${buf.length} bytes, type=${type}, disposition=${disposition || "none"}`);
    if (!ok) process.exitCode = 1;
  }
  console.log(process.exitCode ? "PRODUCTION DOWNLOAD TEST: FAILED ❌" : "PRODUCTION DOWNLOAD TEST: ALL PASS ✅");
};

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
