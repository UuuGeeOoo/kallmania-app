// Unit test: fill the uploaded SBTS Social Media Team-Lead master with a
// realistic TL_SOCIAL report payload and verify every section landed in the
// right cells — and that the master itself is untouched (sha256).
import { readFileSync } from "fs";
import {
  editDocxCopy, bodyTables, rowsOf, cellsOf, cellText, norm, tableTitle,
  type Doc,
} from "@/lib/docx-template-fill";
import { getMasterBuffer } from "@/lib/report-masters";
import { tryFillFromMaster, type ReportLike } from "@/lib/report-fill";
import { defaultSocialLeadTemplate } from "@/lib/team-lead-template";

const today = new Date();
const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const tpl = defaultSocialLeadTemplate();
const metrics = (tpl.sections.find((s) => s.id === "team-kpis")!.metrics || []).map((m, i) => ({
  ...m, targetLabel: m.target === null ? "-" : String(m.target), actual: [4, 2, 6, 3, 9, 14, 92, 8][i] ?? null, notes: i === 0 ? "All calendar items signed off" : "",
}));

const payload = JSON.stringify({
  sections: {
    "staff-info": { teamName: "Social Media — Enugu", shiftTime: "09:00 - 17:00", clockIn: "08:55", clockOut: "17:05", attendanceStatus: "Present", latenessMins: 0 },
    "role-focus": "Drive the October campaign calendar review and approve the reels batch for Friday.",
    "team-kpis": metrics,
    tasks: [
      { task: "Design Diwali carousel", platform: "Instagram", status: "Completed", deliverable: "6-slide carousel" },
      { task: "Cut product demo reel", platform: "TikTok / Reels", status: "In Progress", deliverable: "45s vertical cut" },
      { task: "Schedule weekend posts", platform: "Meta Business Suite", status: "Completed", deliverable: "4 scheduled posts" },
    ],
    myday: [], // left empty on purpose → export keeps template rows (no userId in this unit test)
    challenges: [
      { blocker: "Brand asset drive access expired", impact: "Design work paused for 2 hrs", support: "Renew drive licence", owner: "Web & Technical" },
      { blocker: "Late client feedback on captions", impact: "Scheduling slipped to 4pm", support: "Set 24h feedback SLA", owner: "Supervisor" },
    ],
    escalations: [
      { item: "Paid boost budget approval", reason: "Finance sign-off needed for ₦50k boost", escalatedTo: "Supervisor", status: "Pending" },
    ],
    handoff: [
      { completed: "Campaign calendar v2", pending: "Reel voice-over", blocked: "Awaiting brand assets", nextAction: "Voice-over by 9am — Prosper" },
    ],
  },
});

const report: ReportLike = {
  type: "TEAM_LEAD",
  reportDate: day,
  department: "SOCIAL_MEDIA",
  userId: null,
  shiftTime: "09:00 - 17:00",
  clockIn: "08:55",
  clockOut: "17:05",
  attendanceStatus: "Present",
  latenessMins: 0,
  payload,
  status: "SUBMITTED",
  supervisorFeedback: null,
  user: { fullName: "Somtochukwu Prosper Ali", role: "TEAM_LEAD", email: "somtochukwu@sbtsgroup.com", team: "SOCIAL" },
  reviewer: { fullName: "Patrick Onwurah" },
  reviewedAt: day,
};

const before = await getMasterBuffer("TL_SOCIAL");
if (!before) { console.error("FAIL: no TL_SOCIAL master"); process.exit(1); }
console.log("master:", before.originalName, `${(before.buffer.length / 1024).toFixed(1)}KB`, before.fileHash.slice(0, 16));

const filled = await tryFillFromMaster(report);
if (!filled) { console.error("FAIL: tryFillFromMaster returned null (fallback would be used)"); process.exit(1); }
console.log("filled:", `${(filled.length / 1024).toFixed(1)}KB`);

const after = await getMasterBuffer("TL_SOCIAL");
console.log("master hash unchanged:", after?.fileHash === before.fileHash ? "YES" : "NO — FAIL");

// ── verify cell placement in the generated copy ──
await editDocxCopy(filled, (doc: Doc) => {
  const tables = bodyTables(doc);
  // mirror the fill's resolution: heading table → the body table AFTER it
  const dump = (needle: string) => {
    const idx = tables.findIndex((x) => tableTitle(x).includes(norm(needle)));
    if (idx === -1 || idx + 1 >= tables.length) return null;
    return rowsOf(tables[idx + 1]).map((tr) => cellsOf(tr).map((c) => cellText(c)));
  };

  const check = (name: string, cond: boolean) => console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);

  const info = dump("staff information");
  check("staff name", info?.[1]?.includes("Somtochukwu Prosper Ali") ?? false);
  check("role designation", info?.[1]?.some((c) => c === "Team Lead") ?? false);
  check("date filled", info?.[1]?.some((c) => c.includes(String(today.getDate()))) ?? false);
  check("attendance kept/filled", info?.[2]?.includes("Present") ?? false);
  check("email filled", info?.[2]?.some((c) => c.includes("@sbtsgroup.com")) ?? false);

  const kpi = dump("key performance metrics");
  check("KPI actual col 1 (calendar=4)", kpi?.[1]?.[2] === "4" ?? false);
  check("KPI evidence note", JSON.stringify(kpi?.[1]).includes("calendar items signed off") ?? false);
  check("KPI percent formatted", kpi?.[7]?.[2] === "92%" ?? false);

  const tasks = dump("tasks assigned");
  check("task 1 row", JSON.stringify(tasks?.[1]).includes("Diwali carousel") ?? false);
  check("task status", JSON.stringify(tasks?.[2]).includes("In Progress") ?? false);

  const myday = dump("work done from my day");
  check("myday rows untouched (empty payload, no tasks in unit test)", myday?.[1]?.[1] === "" || myday?.[1]?.[1] === undefined);

  const chal = dump("challenges");
  check("challenge 1", JSON.stringify(chal?.[1]).includes("Brand asset drive") ?? false);
  check("challenge 2 impact", JSON.stringify(chal?.[2]).includes("Scheduling slipped") ?? false);

  const esc = dump("escalations and approvals");
  check("escalation item", JSON.stringify(esc?.[1]).includes("boost budget approval") ?? false);

  const hand = dump("end-of-day handoff");
  check("handoff row", JSON.stringify(hand?.[1]).includes("Campaign calendar v2") ?? false);

  const sup = dump("supervisor comments");
  check("supervisor name", JSON.stringify(sup?.[1]).includes("Patrick Onwurah"));
});

// standalone paragraph probe (module-level, outside editDocxCopy callback scope issue)
await editDocxCopy(filled, (doc: Doc) => {
  const body = (doc as unknown as { documentElement: { textContent: string } }).documentElement;
  const ok = body.textContent.includes("October campaign calendar review");
  console.log(`${ok ? "PASS" : "FAIL"} — role focus text present in document body`);
});
console.log("UNIT TEST DONE");
