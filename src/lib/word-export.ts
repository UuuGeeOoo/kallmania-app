// ─────────────────────────────────────────────────────────────────────────────
// WORD (.docx) EXPORT ENGINE — replicates the attached master templates
// "Daily Report Call Centre.docx" / "Daily_Report_Supervisor.docx"
// Headings, field order, tables and KPI targets are preserved.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType,
} from "docx";
import { COMPANY_HEADER, AGENT_TEMPLATE_TITLE, SUPERVISOR_TEMPLATE_TITLE, AGENT_KPI_DEFS, SUPERVISOR_TEAM_KPIS, ATTENDANCE_ROWS, CALL_LOG_ROWS } from "@/lib/template-config";
import { defaultTeamLeadTemplate, type TlDefinition, type TlSection } from "@/lib/team-lead-template";
import { formatMetricValue, type KpiMetric } from "@/lib/kpi";

const VIOLET = "6C5CE7";
const DARK = "1F2937";
const LIGHT_FILL = "F4F2FB";
const HEADER_FILL = "EDEAFB";

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const thin = { style: BorderStyle.SINGLE, size: 4, color: "D8D4F0" };
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

function sectionHeading(text: string) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        shading: { type: ShadingType.CLEAR, fill: HEADER_FILL },
        borders: cellBorders,
        children: [new Paragraph({ children: [new TextRun({ text: `▸ ${text}`, bold: true, color: VIOLET, fontSize: 22 })] })],
      }),
    ],
  });
}

function headerRow(cells: string[]) {
  return new TableRow({
    tableHeader: true,
    children: cells.map(
      (c) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: HEADER_FILL },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, fontSize: 20, color: DARK })] })],
        })
    ),
  });
}

function dataRow(cells: (string | null | undefined)[], bold = false, fill?: string) {
  return new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          borders: cellBorders,
          ...(fill ? { shading: { type: ShadingType.CLEAR, fill } } : {}),
          children: [new Paragraph({ children: [new TextRun({ text: c ?? "", bold, fontSize: 20, color: DARK })] })],
        })
    ),
  });
}

function infoGrid(pairs: [string, string | null | undefined][]) {
  const rows: TableRow[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const p1 = pairs[i];
    const p2 = pairs[i + 1];
    rows.push(
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: p1[0], bold: true, fontSize: 20 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 28, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: p1[1] || "", fontSize: 20 })] })] }),
          new TableCell({ borders: cellBorders, shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: p2?.[0] ?? "", bold: true, fontSize: 20 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 28, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: p2?.[1] || "", fontSize: 20 })] })] }),
        ],
      })
    );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function titleBlock(title: string) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: title, bold: true, fontSize: 30, color: DARK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: COMPANY_HEADER, fontSize: 22, color: VIOLET, bold: true })],
    }),
  ];
}

function docShell(sections: (Table | Paragraph)[]) {
  return new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: {}, children: sections }],
  });
}

const fmtDate = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function kvTable5(heading: string, headers: string[], rows: (string | null)[][], firstColBold = true) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      sectionHeading(heading),
      headerRow(headers),
      ...rows.map((r) =>
        new TableRow({
          children: r.map(
            (c, ci) =>
              new TableCell({
                borders: cellBorders,
                ...(firstColBold && ci === 0 ? { shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL } } : {}),
                children: [new Paragraph({ children: [new TextRun({ text: c ?? "", bold: firstColBold && ci === 0, fontSize: 19 })] })],
              })
          ),
        })
      ),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 200 }, children: [] });
}

function textSection(heading: string, content: string | null | undefined) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      sectionHeading(heading),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: content || "", fontSize: 20 })] })],
          }),
        ],
      }),
    ],
  });
}

// ─────────────────────────── AGENT REPORT EXPORT ───────────────────────────

export async function buildAgentDocx(report: {
  reportDate: Date | string;
  shiftTime?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  attendanceStatus?: string | null;
  latenessMins?: number | null;
  kpiMetrics?: string | null;
  callLogs?: string | null;
  challenges?: string | null;
  escalations?: string | null;
  additionalActivities?: string | null;
  emailContext?: string | null;
  status?: string | null;
  sourceType?: string | null;
  verificationStatus?: string | null;
  supervisorFeedback?: string | null;
  user: { fullName: string; employeeId?: string | null; email?: string };
}): Promise<Buffer> {
  let metrics: KpiMetric[] = [];
  try {
    metrics = report.kpiMetrics ? JSON.parse(report.kpiMetrics) : [];
  } catch {}
  let logs: { leadName?: string; disposition?: string; followUp?: string; notes?: string }[] = [];
  try {
    logs = report.callLogs ? JSON.parse(report.callLogs) : [];
  } catch {}
  let emailCtx: Record<string, unknown> = {};
  try {
    emailCtx = report.emailContext ? JSON.parse(report.emailContext) : {};
  } catch {}

  const mVal = (key: string) => {
    const m = metrics.find((x) => x.key === key);
    if (!m) return "";
    return m.actual === null ? "" : formatMetricValue(m.actual, m.unit);
  };
  const mVar = (key: string) => {
    const m = metrics.find((x) => x.key === key);
    if (!m || m.variance === null) return "";
    return String(m.variance);
  };
  const mNotes = (key: string) => metrics.find((x) => x.key === key)?.notes || "";
  const mTarget = (key: string) => metrics.find((x) => x.key === key)?.targetLabel || "";

  const orderedKeys = [...AGENT_KPI_DEFS].sort((a, b) => a.sortOrder - b.sortOrder).map((d) => d.key);

  const kpiRows = orderedKeys.map((key) => {
    const def = AGENT_KPI_DEFS.find((d) => d.key === key)!;
    return [def.label, mTarget(key), mVal(key), mVar(key), mNotes(key)];
  });

  const logRows: (string | null)[][] = [];
  for (let i = 0; i < CALL_LOG_ROWS; i++) {
    const e = logs[i];
    logRows.push([String(i + 1), e?.leadName || "", e?.disposition || "", e?.followUp || "", e?.notes || ""]);
  }

  const sections: (Table | Paragraph)[] = [
    ...titleBlock(AGENT_TEMPLATE_TITLE),
    infoGrid([
      ["Agent Name", report.user.fullName],
      ["Date", fmtDate(report.reportDate)],
      ["Agent ID", report.user.employeeId || ""],
      ["Shift Time", report.shiftTime || ""],
      ["Clock-In Time", report.clockIn || ""],
      ["Clock-Out Time", report.clockOut || ""],
      ["Attendance Status", report.attendanceStatus || ""],
      ["Lateness (mins)", report.latenessMins !== null && report.latenessMins !== undefined ? String(report.latenessMins) : ""],
    ]),
    spacer(),
    kvTable5("KEY PERFORMANCE METRICS (KPIs)", ["KPI", "Target", "Actual", "Variance", "Notes"], kpiRows),
    spacer(),
  ];

  if (emailCtx.campaignName || emailCtx.notes) {
    sections.push(
      infoGrid([
        ["Campaign / Outreach Name", (emailCtx.campaignName as string) || ""],
        ["Email Notes", (emailCtx.notes as string) || ""],
      ]),
      spacer()
    );
  }

  sections.push(kvTable5("CALL LOG SUMMARY", ["#", "Lead / Contact Name", "Disposition", "Follow-Up Required?", "Notes"], logRows));
  sections.push(spacer());
  sections.push(textSection("CHALLENGES / BLOCKERS", report.challenges));
  sections.push(spacer());
  sections.push(textSection("ESCALATIONS", report.escalations));
  sections.push(spacer());
  sections.push(textSection("ADDITIONAL ACTIVITIES", report.additionalActivities));
  sections.push(spacer());

  const provenance = `Data provenance: ${report.sourceType === "UPLOAD_EXTRACTED" ? "Extracted from uploaded document" : "Manually entered"} · Verification: ${report.verificationStatus?.replace(/_/g, " ")} · Status: ${report.status}`;
  sections.push(new Paragraph({ children: [new TextRun({ text: provenance, italics: true, fontSize: 16, color: "6B7280" })] }));

  if (report.supervisorFeedback) {
    sections.push(spacer());
    sections.push(textSection("SUPERVISOR FEEDBACK", report.supervisorFeedback));
  }

  return Buffer.from(await Packer.toBuffer(docShell(sections)));
}

// ───────────────────────── SUPERVISOR REPORT EXPORT ────────────────────────

export async function buildSupervisorDocx(report: {
  reportDate: Date | string;
  shiftTime?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  teamName?: string | null;
  campusLocation?: string | null;
  agentsManaged?: number | null;
  attendanceSummary?: string | null;
  teamKpiAverages?: string | null;
  coachingEntries?: string | null;
  qaObservations?: string | null;
  escalatedIssues?: string | null;
  highlights?: string | null;
  lowlights?: string | null;
  actionPlan?: string | null;
  managerReview?: string | null;
  user: { fullName: string };
  status?: string | null;
}): Promise<Buffer> {
  let attendance: Record<string, { count?: number | string; details?: string }> = {};
  try { attendance = report.attendanceSummary ? JSON.parse(report.attendanceSummary) : {}; } catch {}
  let kpis: { key: string; label: string; teamTarget: number | null; teamAvg: number | null; best: string | null; lowest: string | null }[] = [];
  try { kpis = report.teamKpiAverages ? JSON.parse(report.teamKpiAverages) : []; } catch {}
  let coaching: { agentName?: string; type?: string; details?: string }[] = [];
  try { coaching = report.coachingEntries ? JSON.parse(report.coachingEntries) : []; } catch {}
  let escalated: { description?: string; priority?: string; status?: string; action?: string }[] = [];
  try { escalated = report.escalatedIssues ? JSON.parse(report.escalatedIssues) : []; } catch {}
  let plan: { action?: string; owner?: string; priority?: string; deadline?: string }[] = [];
  try { plan = report.actionPlan ? JSON.parse(report.actionPlan) : []; } catch {}

  const sections: (Table | Paragraph)[] = [
    ...titleBlock(SUPERVISOR_TEMPLATE_TITLE),
    infoGrid([
      ["Supervisor Name", report.user.fullName],
      ["Date", fmtDate(report.reportDate)],
      ["Team Name", report.teamName || ""],
      ["Shift Time", report.shiftTime || ""],
      ["Campus / Location", report.campusLocation || ""],
      ["No. of Agents Managed", report.agentsManaged !== null && report.agentsManaged !== undefined ? String(report.agentsManaged) : ""],
      ["Clock-In Time", report.clockIn || ""],
      ["Clock-Out Time", report.clockOut || ""],
    ]),
    spacer(),
    kvTable5(
      "TEAM ATTENDANCE SUMMARY",
      ["Metric", "Count", "Names / Details"],
      ATTENDANCE_ROWS.map((r) => [r.label, attendance[r.key]?.count ? String(attendance[r.key].count) : "", attendance[r.key]?.details || ""])
    ),
    spacer(),
    kvTable5(
      "TEAM PERFORMANCE SUMMARY (KPI AVERAGES)",
      ["KPI", "Team Target", "Team Average", "Best Performer", "Lowest Performer"],
      SUPERVISOR_TEAM_KPIS.map((k) => {
        const row = kpis.find((x) => x.key === k.key);
        return [
          k.label,
          row?.teamTarget !== null && row?.teamTarget !== undefined ? String(row.teamTarget) : "",
          row?.teamAvg !== null && row?.teamAvg !== undefined ? String(row.teamAvg) : "",
          row?.best || "",
          row?.lowest || "",
        ];
      })
    ),
    spacer(),
    kvTable5(
      "COACHING & FEEDBACK PROVIDED",
      ["#", "Agent Name", "Type (Coaching / Warning / Kudos)", "Details"],
      Array.from({ length: 5 }, (_, i) => [String(i + 1), coaching[i]?.agentName || "", coaching[i]?.type || "", coaching[i]?.details || ""])
    ),
    spacer(),
    textSection("QUALITY ASSURANCE OBSERVATIONS", report.qaObservations),
    spacer(),
    kvTable5(
      "ISSUES ESCALATED TO MANAGEMENT",
      ["#", "Issue Description", "Priority (High/Med/Low)", "Status", "Action Required"],
      Array.from({ length: 4 }, (_, i) => [String(i + 1), escalated[i]?.description || "", escalated[i]?.priority || "", escalated[i]?.status || "", escalated[i]?.action || ""])
    ),
    spacer(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        sectionHeading("SHIFT HIGHLIGHTS & LOWLIGHTS"),
        dataRow(["Highlights", report.highlights || ""], false, LIGHT_FILL),
        dataRow(["Lowlights", report.lowlights || ""]),
      ],
    }),
    spacer(),
    kvTable5(
      "ACTION PLAN FOR NEXT DAY",
      ["#", "Action Item", "Owner / Responsible", "Priority", "Deadline"],
      Array.from({ length: 5 }, (_, i) => [String(i + 1), plan[i]?.action || "", plan[i]?.owner || "", plan[i]?.priority || "", plan[i]?.deadline || ""])
    ),
    spacer(),
    textSection("MANAGER REVIEW", report.managerReview),
    spacer(),
    infoGrid([["BPO Manager Name", ""], ["Signature / Date", ""]]),
  ];

  return Buffer.from(await Packer.toBuffer(docShell(sections)));
}

// ───────────────────── TECH / SOCIAL REPORT EXPORT ─────────────────────────

export async function buildGenericDocx(opts: {
  title: string;
  reportDate: Date | string;
  userName: string;
  employeeId?: string | null;
  department: string;
  shiftTime?: string | null;
  attendanceStatus?: string | null;
  workEntries?: string | null;
  metricsSummary?: string | null;
  metricLabels?: { key: string; label: string }[];
  challenges?: string | null;
  escalations?: string | null;
  additionalActivities?: string | null;
  status?: string | null;
  sourceType?: string | null;
  verificationStatus?: string | null;
  supervisorFeedback?: string | null;
}): Promise<Buffer> {
  let entries: Record<string, unknown>[] = [];
  try { entries = opts.workEntries ? JSON.parse(opts.workEntries) : []; } catch {}
  let metrics: Record<string, number | null> = {};
  try { metrics = opts.metricsSummary ? JSON.parse(opts.metricsSummary) : {}; } catch {}

  const sections: (Table | Paragraph)[] = [
    ...titleBlock(opts.title),
    infoGrid([
      ["Employee Name", opts.userName],
      ["Date", fmtDate(opts.reportDate)],
      ["Employee ID", opts.employeeId || ""],
      ["Department", opts.department],
      ["Shift Time", opts.shiftTime || ""],
      ["Attendance Status", opts.attendanceStatus || ""],
    ]),
    spacer(),
  ];

  if (opts.metricLabels?.length) {
    sections.push(
      kvTable5(
        "KEY METRICS",
        ["Metric", "Value"],
        opts.metricLabels.map((m) => [m.label, metrics[m.key] !== null && metrics[m.key] !== undefined ? String(metrics[m.key]) : ""])
      ),
      spacer()
    );
  }

  if (entries.length) {
    const keys = Object.keys(entries[0]);
    sections.push(
      kvTable5(
        "WORK / ACTIVITY ENTRIES",
        keys.map((k) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())),
        entries.map((e) => keys.map((k) => (e[k] === null || e[k] === undefined ? "" : String(e[k]))))
      ),
      spacer()
    );
  }

  sections.push(textSection("CHALLENGES / BLOCKERS", opts.challenges));
  sections.push(spacer());
  sections.push(textSection("ESCALATIONS", opts.escalations));
  sections.push(spacer());
  sections.push(textSection("ADDITIONAL ACTIVITIES", opts.additionalActivities));

  const provenance = `Data provenance: ${opts.sourceType === "UPLOAD_EXTRACTED" ? "Extracted from uploaded document" : "Manually entered"} · Verification: ${opts.verificationStatus?.replace(/_/g, " ")} · Status: ${opts.status}`;
  sections.push(new Paragraph({ children: [new TextRun({ text: provenance, italics: true, fontSize: 16, color: "6B7280" })] }));
  if (opts.supervisorFeedback) {
    sections.push(spacer());
    sections.push(textSection("SUPERVISOR FEEDBACK", opts.supervisorFeedback));
  }

  return Buffer.from(await Packer.toBuffer(docShell(sections)));
}

// ───────────────────── SOCIAL MEDIA TEAM — exact replica of Daily_Report_Social_Media_Team.docx ─────────────────────────

const SOCIAL_TEMPLATE_KPI_DEFS = [
  { key: "postsCreated", label: "Posts Created / Published" },
  { key: "storiesReels", label: "Stories / Reels Created" },
  { key: "engagementRate", label: "Content Engagement Rate (%)" },
  { key: "reachImpressions", label: "Reach / Impressions" },
  { key: "followerGrowth", label: "Follower Growth (Net)" },
  { key: "commentsDMs", label: "Comments / DMs Responded To" },
  { key: "calendarAdherence", label: "Content Calendar Adherence (%)" },
  { key: "graphicsDesigned", label: "Graphics / Visuals Designed" },
];

export async function buildSocialDocx(report: {
  reportDate: Date | string;
  userName: string;
  department: string;
  teamName?: string | null; // Role / Designation
  shiftTime?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  attendanceStatus?: string | null;
  latenessMins?: number | null;
  kpiMetrics?: string | null;
  workEntries?: string | null;
  challenges?: string | null;
  escalations?: string | null;
  supervisorFeedback?: string | null;
  reviewerName?: string | null;
  status?: string | null;
}): Promise<Buffer> {
  let kpis: { key: string; target: number | null; actual: number | null; variance: number | null; notes?: string }[] = [];
  try { kpis = report.kpiMetrics ? JSON.parse(report.kpiMetrics) : []; } catch {}
  let tasks: { task?: string; platform?: string; status?: string; deliverable?: string }[] = [];
  try { tasks = report.workEntries ? JSON.parse(report.workEntries) : []; } catch {}
  tasks = tasks.filter((t) => t.task || t.platform || t.status || t.deliverable);
  while (tasks.length < 6) tasks.push({}); // template shows six numbered rows

  const sections: (Table | Paragraph)[] = [
    // Document header — three lines, exactly like the uploaded document
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "SBTS Group Global — Social Media Team Daily Report", bold: true, fontSize: 30, color: DARK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "DAILY REPORT — SOCIAL MEDIA MANAGEMENT & CONTENT CREATION TEAM", bold: true, fontSize: 21, color: VIOLET })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "SBTS Group Global", fontSize: 20, color: "6B7280" })],
    }),

    // ▸ STAFF INFORMATION
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        sectionHeading("STAFF INFORMATION"),
        ...[
          ["Staff Name", report.userName, "Date", fmtDate(report.reportDate)],
          ["Role / Designation", report.teamName || "", "Shift Time", report.shiftTime || ""],
          ["Clock-In Time", report.clockIn || "", "Clock-Out Time", report.clockOut || ""],
          ["Attendance Status", report.attendanceStatus || "", "Lateness (mins)", report.latenessMins !== null && report.latenessMins !== undefined ? String(report.latenessMins) : ""],
        ].map(([l1, v1, l2, v2]) =>
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: l1, bold: true, fontSize: 20 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 28, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: v1, fontSize: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: l2, bold: true, fontSize: 20 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 28, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: v2, fontSize: 20 })] })] }),
            ],
          })
        ),
      ],
    }),
    spacer(),

    // ▸ KEY PERFORMANCE METRICS (KPIs)
    kvTable5(
      "KEY PERFORMANCE METRICS (KPIs)",
      ["KPI", "Target", "Actual", "Variance", "Notes"],
      SOCIAL_TEMPLATE_KPI_DEFS.map((d) => {
        const m = kpis.find((x) => x.key === d.key);
        return [
          d.label,
          m?.target !== null && m?.target !== undefined ? String(m.target) : "",
          m?.actual !== null && m?.actual !== undefined ? String(m.actual) : "",
          m?.variance !== null && m?.variance !== undefined ? String(m.variance) : "",
          m?.notes || "",
        ];
      })
    ),
    spacer(),

    // ▸ TASKS ASSIGNED & COMPLETED
    kvTable5(
      "TASKS ASSIGNED & COMPLETED",
      ["#", "Task Description", "Platform", "Status", "Deliverable / Output"],
      tasks.map((t, i) => [String(i + 1), t.task || "", t.platform || "", t.status || "", t.deliverable || ""])
    ),
    spacer(),

    // ▸ CHALLENGES / BLOCKERS
    textSection("CHALLENGES / BLOCKERS", report.challenges),
    spacer(),

    // ▸ ESCALATIONS
    textSection("ESCALATIONS", report.escalations),
    spacer(),

    // ▸ SUPERVISOR COMMENTS
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        sectionHeading("SUPERVISOR COMMENTS"),
        ...(report.supervisorFeedback ? [dataRow([report.supervisorFeedback])] : []),
        new TableRow({
          children: [
            new TableCell({ borders: cellBorders, shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL }, width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Supervisor Name", bold: true, fontSize: 20 })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: report.reviewerName || "", fontSize: 20 })] })] }),
            new TableCell({ borders: cellBorders, shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL }, width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Signature / Date", bold: true, fontSize: 20 })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "", fontSize: 20 })] })] }),
          ],
        }),
      ],
    }),
    spacer(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Confidential — For Internal Use Only", italics: true, fontSize: 16, color: "6B7280" })],
    }),
  ];

  return Buffer.from(await Packer.toBuffer(docShell(sections)));
}

// ───────────────────── TEAM LEAD REPORT — dynamic template export ─────────────────────────

export async function buildTeamLeadDocx(report: {
  reportDate: Date | string;
  userName: string;
  employeeId?: string | null;
  department: string;
  teamName?: string | null;
  payload?: string | null;
  status?: string | null;
  sourceType?: string | null;
  verificationStatus?: string | null;
  supervisorFeedback?: string | null;
  reviewerName?: string | null;
  definition?: TlDefinition | null;
}): Promise<Buffer> {
  const def = report.definition || defaultTeamLeadTemplate();
  let sectionsData: Record<string, unknown> = {};
  try { sectionsData = report.payload ? (JSON.parse(report.payload) as { sections?: Record<string, unknown> }).sections || {} : {}; } catch {}

  const titleize = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  const out: (Table | Paragraph)[] = [...titleBlock(def.title || "DAILY REPORT — TEAM LEAD")];

  for (const s of def.sections as TlSection[]) {
    const raw = sectionsData[s.id];
    const empty = raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0) || (typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw as object).length === 0);
    if (s.type === "fields") {
      const vals = (typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {}) as Record<string, string>;
      const pairs: [string, string][] = [
        ["Team Lead Name", report.userName],
        ["Team / Squad", report.teamName || ""],
        ...(s.fields || []).map((f) => [f.label, vals[f.key] ?? ""] as [string, string]),
      ];
      out.push(kvTable5(s.title, ["Field", "Entry"], pairs), spacer());
      continue;
    }
    if (s.type === "metrics" && Array.isArray(raw) && raw.length > 0) {
      out.push(
        kvTable5(
          s.title,
          ["KPI", "Target", "Actual", "Variance", "Notes"],
          (raw as Record<string, unknown>[]).map((m) => {
            const actual = m.actual;
            const target = m.target;
            const variance = actual !== null && actual !== undefined && actual !== "" && target !== null && target !== undefined ? String(Math.round((Number(actual) - Number(target)) * 100) / 100) : "";
            return [String(m.label ?? ""), String(m.targetLabel ?? target ?? "-"), actual === null || actual === undefined || actual === "" ? "" : String(actual), variance, String(m.notes ?? "")];
          })
        ),
        spacer()
      );
      continue;
    }
    if (s.type === "table" && Array.isArray(raw) && raw.some((r) => Object.values(r as object).some((v) => String(v ?? "").trim() !== ""))) {
      const cols = s.columns || [];
      out.push(
        kvTable5(
          s.title,
          ["#", ...cols.map((c) => c.label)],
          (raw as Record<string, unknown>[]).map((r, i) => [String(i + 1), ...cols.map((c) => String(r[c.key] ?? ""))])
        ),
        spacer()
      );
      continue;
    }
    if (s.type === "textarea" && !empty) {
      out.push(textSection(s.title, String(raw)), spacer());
      continue;
    }
    if (s.type === "textarea" && empty) {
      // keep the section heading present (template replica) with an empty body
      out.push(textSection(s.title, ""), spacer());
    }
  }

  const provenance = `Data provenance: ${report.sourceType === "UPLOAD_EXTRACTED" ? "Extracted from uploaded document" : "Manually entered"} · Verification: ${report.verificationStatus?.replace(/_/g, " ")} · Status: ${report.status}`;
  out.push(new Paragraph({ children: [new TextRun({ text: provenance, italics: true, fontSize: 16, color: "6B7280" })] }));

  out.push(spacer());
  out.push(
    kvTable5("REVIEW", ["Supervisor Name", "Signature / Date"], [[report.reviewerName || "", ""]], false)
  );
  out.push(spacer());
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Confidential — For Internal Use Only", italics: true, fontSize: 16, color: "6B7280" })] }));

  return Buffer.from(await Packer.toBuffer(docShell(out)));
}
