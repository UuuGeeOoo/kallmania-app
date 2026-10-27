// ─────────────────────────────────────────────────────────────────────────────
// REPORT FILE GENERATION — shared by /api/export (on-the-fly download) and
// /api/archive (online storage snapshots). Produces Word (.docx), Excel
// (.xlsx) and CSV files that replicate the master report templates.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { safeParse } from "@/lib/api-utils";
import { buildAgentDocx, buildSupervisorDocx, buildGenericDocx, buildSocialDocx } from "@/lib/word-export";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS, SOCIAL_TEMPLATE_KPIS } from "@/lib/template-config";

export type StoreFormat = "docx" | "xlsx" | "csv";

export const STORE_FORMAT_META: Record<StoreFormat, { label: string; mime: string }> = {
  docx: { label: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  xlsx: { label: "Excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  csv: { label: "CSV", mime: "text/csv" },
};

interface ReportLike {
  id: string;
  ref: string;
  type: string;
  reportDate: Date | string;
  department: string;
  user: { fullName: string; employeeId?: string | null };
  reviewedById?: string | null;
  kpiMetrics?: string | null;
  metricsSummary?: string | null;
  workEntries?: string | null;
  challenges?: string | null;
  escalations?: string | null;
  additionalActivities?: string | null;
  status?: string;
  sourceType?: string;
  verificationStatus?: string;
  supervisorFeedback?: string | null;
  shiftTime?: string | null;
  attendanceStatus?: string | null;
}

/** Load a full report with its owner (fresh from DB) */
export async function loadReportForFile(reportId: string) {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { user: { select: { id: true, fullName: true, employeeId: true, email: true, department: true } } },
  });
  return report;
}

/** Build the Word document replicating the department master template */
export async function buildReportDocxBuffer(report: ReportLike): Promise<{ buffer: Buffer; fileName: string }> {
  const dateStr = new Date(report.reportDate).toISOString().slice(0, 10);
  let buffer: Buffer;
  let fileName: string;

  if (report.type === "AGENT_BPO") {
    buffer = await buildAgentDocx(report as never);
    fileName = `Daily_Report_${report.user.fullName.replace(/\s+/g, "_")}_${dateStr}.docx`;
  } else if (report.type === "SUPERVISOR") {
    buffer = await buildSupervisorDocx(report as never);
    fileName = `Supervisor_Daily_Report_${dateStr}.docx`;
  } else if (report.type === "SOCIAL") {
    const reviewer = report.reviewedById
      ? await db.user.findUnique({ where: { id: report.reviewedById }, select: { fullName: true } })
      : null;
    buffer = await buildSocialDocx({ ...report, reviewer } as never);
    fileName = `Social_Media_Daily_Report_${report.user.fullName.replace(/\s+/g, "_")}_${dateStr}.docx`;
  } else {
    buffer = await buildGenericDocx({
      title: "DAILY REPORT — WEB DEVELOPMENT & TECHNICAL TEAM",
      reportDate: report.reportDate,
      userName: report.user.fullName,
      employeeId: report.user.employeeId,
      department: report.department,
      shiftTime: report.shiftTime,
      attendanceStatus: report.attendanceStatus,
      workEntries: report.workEntries,
      metricsSummary: report.metricsSummary,
      metricLabels: TECH_SUMMARY_METRICS,
      challenges: report.challenges,
      escalations: report.escalations,
      additionalActivities: report.additionalActivities,
      status: report.status,
      sourceType: report.sourceType,
      verificationStatus: report.verificationStatus,
      supervisorFeedback: report.supervisorFeedback,
    });
    fileName = `Daily_Report_${report.user.fullName.replace(/\s+/g, "_")}_${dateStr}.docx`;
  }
  return { buffer, fileName };
}

/** Build the KPI spreadsheet (xlsx) or CSV for a report */
export async function buildReportSheetBuffer(
  report: ReportLike,
  format: "xlsx" | "csv"
): Promise<{ buffer: Buffer; fileName: string }> {
  const XLSX = await import("xlsx");
  let rows: Record<string, unknown>[] = [];
  let sheetName = "Report";

  if (report.type === "AGENT_BPO") {
    sheetName = "KPIs";
    const metrics = safeParse<{ label: string; target: number | null; targetLabel: string; actual: number | null; variance: number | null; unit: string; notes: string }[]>(report.kpiMetrics, []);
    rows = metrics.map((m) => ({
      KPI: m.label, Target: m.targetLabel, Actual: m.actual ?? "", Variance: m.variance ?? "", Unit: m.unit, Notes: m.notes || "",
    }));
  } else if (report.type === "SUPERVISOR") {
    sheetName = "Team KPIs";
    const kpis = safeParse<{ label: string; teamTarget: number | null; teamAvg: number | null; best: string | null; lowest: string | null }[]>(report.teamKpiAverages, []);
    rows = kpis.map((k) => ({ KPI: k.label, "Team Target": k.teamTarget ?? "", "Team Average": k.teamAvg ?? "", "Best Performer": k.best || "", "Lowest Performer": k.lowest || "" }));
  } else if (report.type === "SOCIAL" && report.kpiMetrics) {
    sheetName = "KPIs";
    const metrics = safeParse<{ label: string; target: number | null; actual: number | null; variance: number | null; unit: string; notes?: string }[]>(report.kpiMetrics, []);
    rows = metrics.length
      ? metrics.map((m) => ({ KPI: m.label || SOCIAL_TEMPLATE_KPIS.find((d) => d.key === (m as { key?: string }).key)?.label || "", Target: m.target ?? "", Actual: m.actual ?? "", Variance: m.variance ?? "", Notes: m.notes || "" }))
      : [];
    if (!rows.length) {
      const ms = safeParse<Record<string, number>>(report.metricsSummary, {});
      rows = SOCIAL_SUMMARY_METRICS.filter((l) => ms[l.key] !== undefined && ms[l.key] !== null).map((l) => ({ KPI: l.label, Target: "", Actual: ms[l.key], Variance: "", Notes: "" }));
    }
  } else {
    sheetName = "Metrics";
    const ms = safeParse<Record<string, number>>(report.metricsSummary, {});
    const labels = report.type === "TECH" ? TECH_SUMMARY_METRICS : SOCIAL_SUMMARY_METRICS;
    rows = labels.map((l) => ({ Metric: l.label, Value: ms[l.key] ?? "" }));
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return { buffer: Buffer.from(csv, "utf8"), fileName: `${report.ref}.csv` };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return { buffer: Buffer.from(out), fileName: `${report.ref}.xlsx` };
}

/** Generate a file snapshot for online storage */
export async function generateReportFile(
  report: ReportLike,
  format: StoreFormat
): Promise<{ format: StoreFormat; fileName: string; mimeType: string; data: string; sizeBytes: number }> {
  const meta = STORE_FORMAT_META[format];
  const { buffer, fileName } =
    format === "docx" ? await buildReportDocxBuffer(report) : await buildReportSheetBuffer(report, format);
  return {
    format,
    fileName,
    mimeType: meta.mime,
    data: buffer.toString("base64"),
    sizeBytes: buffer.length,
  };
}

/**
 * Store a report snapshot online (idempotent per format — regenerates in place).
 * Returns the list of stored file records.
 */
export async function storeReportFiles(
  reportId: string,
  formats: StoreFormat[],
  storedById: string | null,
  auto = false
) {
  const report = await loadReportForFile(reportId);
  if (!report) throw new Error("Report not found");
  const stored: { id: string; format: string; fileName: string; sizeBytes: number }[] = [];
  for (const format of formats) {
    const file = await generateReportFile(report, format);
    const existing = await db.storedReport.findFirst({ where: { reportId, format } });
    const record = existing
      ? await db.storedReport.update({
          where: { id: existing.id },
          data: { fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, data: file.data, storedById, auto },
        })
      : await db.storedReport.create({
          data: {
            reportId,
            format: file.format,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            data: file.data,
            storedById,
            auto,
          },
        });
    stored.push({ id: record.id, format: record.format, fileName: record.fileName, sizeBytes: record.sizeBytes });
  }
  return stored;
}
