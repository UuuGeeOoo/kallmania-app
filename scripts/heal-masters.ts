// Self-heal master template files after platform reset:
// for every master type, call getMasterBuffer() which re-materialises
// the bundled copy into uploads-storage/ if the stored file is missing,
// then verify disk hash === DB hash for each.
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

const { getMasterBuffer, MASTER_REPORT_TYPES, STORAGE_DIR, sha256 } = require("../src/lib/report-masters");
const { db } = require("../src/lib/db");

async function main() {
  let allOk = true;
  for (const t of MASTER_REPORT_TYPES) {
    const m = await getMasterBuffer(t);
    if (!m) {
      console.log(`${t}: no master (null) — TEAM_LEAD is dynamic, others must exist`);
      if (t !== "TEAM_LEAD") allOk = false;
      continue;
    }
    const row = await db.reportMasterTemplate.findUnique({ where: { reportType: t } });
    const disk = await readFile(path.join(STORAGE_DIR, row.storedName));
    const diskHash = createHash("sha256").update(disk).digest("hex");
    const ok = diskHash === row.fileHash && disk.length === row.sizeBytes;
    if (!ok) allOk = false;
    console.log(
      `${t}: ${ok ? "OK ✓" : "MISMATCH ✗"} | ${row.originalName} | ${disk.length}B | ${diskHash.slice(0, 12)}`
    );
  }
  console.log(allOk ? "ALL MASTERS HEALTHY" : "SOME MASTERS FAILED");
  await db.$disconnect();
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
