// E2E verification of the fixed kpi-config centre-scoping (uses admin session cookie from /tmp/km-cookies.txt)
const fs = require("fs");
const cookie = fs.readFileSync("/tmp/km-cookies.txt", "utf8")
  .split("\n").filter((l) => l.includes("kallmania_session"))
  .map((l) => l.split("\t").slice(-2).join("=")).join("; ");

async function api(method, path, body) {
  const res = await fetch(`http://localhost:3000/api/kpi-config${path}`, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
const show = (t, j) => {
  const c = j.config || j;
  if (c.id && c.centreCountry) console.log(`${t}: id=${c.id} centre=${c.centreCountry}/${c.centreState} target=${c.defaultTarget} mandatory=${c.mandatory}`);
  else console.log(`${t}:`, JSON.stringify(j).slice(0, 200));
};

(async () => {
  // 1. Restore the global default to 30 (undo the accidental 55)
  show("1. RESTORE global", await api("POST", "", { department: "BPO", key: "totalCallsMade", label: "Total Calls Made", defaultTarget: 30, mandatory: true }));

  // 2. Create a centre-scoped override for NG/Enugu
  const ov = await api("POST", "", { department: "BPO", key: "totalCallsMade", label: "Total Calls Made", defaultTarget: 55, centreCountry: "NG", centreState: "Enugu" });
  show("2. CREATE override", ov);

  // 3. Merged centre view must show the override + the untouched global reference
  const merged = await api("GET", "?centreCountry=NG&centreState=Enugu");
  const row = merged.configs.find((c) => c.department === "BPO" && c.key === "totalCallsMade");
  console.log(`3. MERGED centre view: target=${row.defaultTarget} isOverride=${row.isOverride} globalTarget=${row.globalTarget} centre=${row.centreCountry}/${row.centreState}`);
  console.log(`   overrides in centre view: ${merged.configs.filter((c) => c.isOverride).length}`);

  // 4. Global view must be untouched
  const global = await api("GET", "");
  const grow = global.configs.find((c) => c.department === "BPO" && c.key === "totalCallsMade");
  console.log(`4. GLOBAL view: target=${grow.defaultTarget} isOverride=${grow.isOverride} centre=${grow.centreCountry}/${grow.centreState}`);

  // 5. DELETE the override -> centre falls back to the global default
  show("5. DELETE override", await api("DELETE", `?id=${ov.config.id}`));
  const after = await api("GET", "?centreCountry=NG&centreState=Enugu");
  const arow = after.configs.find((c) => c.department === "BPO" && c.key === "totalCallsMade");
  console.log(`6. AFTER RESET: target=${arow.defaultTarget} isOverride=${arow.isOverride} globalTarget=${arow.globalTarget}`);
  console.log(`   overrides remaining: ${after.configs.filter((c) => c.isOverride).length}`);
})().catch((e) => { console.error("FAIL:", e); process.exit(1); });
