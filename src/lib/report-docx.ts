// ─────────────────────────────────────────────────────────────────────────────
// REPORT DOCX GENERATION — single entry point for /api/export (download) and
// /api/export/preview (in-app preview).
//
// Strategy:
//  1. If an active master template exists for the report type (AGENT_BPO,
//     SUPERVISOR, TECH, SOCIAL), fill a COPY of the original uploaded Word
//     document — the original design (logos, fonts, colours, tables, headers,
//     footers, margins, embedded fonts) is preserved exactly.
//  2. If no master applies (or the fill fails), fall back to the built-in
//     builders, so existing downloads never break.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { buildAgentDocx, buildSupervisorDocx, buildGenericDocx, buildSocialDocx, buildTeamLeadDocx } from "@/lib/word-export";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { tryFillFromMaster, type ReportLike } from "@/lib/report-fill";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportRow = any;

const dateOf = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const namePart = (name: string) => name.replace(/\s+/g, "_");

export async function generateReportDocx(report: ReportRow): Promise<{ buffer: Buffer; filename: string; viaMaster: boolean }> {
  // 1) template-preserving path — a copy of the original master, filled
  const filled = await tryFillFromMaster(report as ReportLike);
  if (filled) {
    let filename: string;
    if (report.type === "AGENT_BPO") filename = `Daily_Report_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
    else if (report.type === "SUPERVISOR") filename = `Supervisor_Daily_Report_${dateOf(report.reportDate)}.docx`;
    else if (report.type === "SOCIAL") filename = `Daily_Report_Social_Media_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
    else if (report.type === "TECH") filename = `Daily_Report_Web_Technical_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
    else filename = `Daily_Report_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
    return { buffer: filled, filename, viaMaster: true };
  }

  // 2) built-in builders (unchanged behaviour)
  let buffer: Buffer;
  let filename: string;
  if (report.type === "AGENT_BPO") {
    buffer = await buildAgentDocx(report as never);
    filename = `Daily_Report_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
  } else if (report.type === "SUPERVISOR") {
    buffer = await buildSupervisorDocx(report as never);
    filename = `Supervisor_Daily_Report_${dateOf(report.reportDate)}.docx`;
  } else if (report.type === "TEAM_LEAD") {
    const tplRow = await db.reportTemplate.findUnique({ where: { key: "TEAM_LEAD" } });
    let definition = null;
    if (tplRow) { try { definition = JSON.parse(tplRow.definition); } catch {} }
    buffer = await buildTeamLeadDocx({
      reportDate: report.reportDate,
      userName: report.user.fullName,
      employeeId: report.user.employeeId,
      department: report.department,
      teamName: report.teamName,
      payload: report.payload,
      status: report.status,
      sourceType: report.sourceType,
      verificationStatus: report.verificationStatus,
      supervisorFeedback: report.supervisorFeedback,
      reviewerName: report.reviewer?.fullName || null,
      definition,
    });
    filename = `Team_Lead_Daily_Report_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
  } else if (report.type === "SOCIAL") {
    buffer = await buildSocialDocx({
      reportDate: report.reportDate,
      userName: report.user.fullName,
      department: report.department,
      teamName: report.teamName,
      shiftTime: report.shiftTime,
      clockIn: report.clockIn,
      clockOut: report.clockOut,
      attendanceStatus: report.attendanceStatus,
      latenessMins: report.latenessMins,
      kpiMetrics: report.kpiMetrics,
      workEntries: report.workEntries,
      challenges: report.challenges,
      escalations: report.escalations,
      supervisorFeedback: report.supervisorFeedback,
      reviewerName: report.reviewer?.fullName || null,
      status: report.status,
    });
    filename = `Daily_Report_Social_Media_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
  } else {
    const title = report.type === "TECH" ? "DAILY REPORT — WEB DEVELOPMENT & TECHNICAL TEAM" : "DAILY REPORT — SOCIAL MEDIA TEAM";
    buffer = await buildGenericDocx({
      title,
      reportDate: report.reportDate,
      userName: report.user.fullName,
      employeeId: report.user.employeeId,
      department: report.department,
      shiftTime: report.shiftTime,
      attendanceStatus: report.attendanceStatus,
      workEntries: report.workEntries,
      metricsSummary: report.metricsSummary,
      metricLabels: report.type === "TECH" ? TECH_SUMMARY_METRICS : SOCIAL_SUMMARY_METRICS,
      challenges: report.challenges,
      escalations: report.escalations,
      additionalActivities: report.additionalActivities,
      status: report.status,
      sourceType: report.sourceType,
      verificationStatus: report.verificationStatus,
      supervisorFeedback: report.supervisorFeedback,
    });
    filename = `Daily_Report_${namePart(report.user.fullName)}_${dateOf(report.reportDate)}.docx`;
  }
  return { buffer, filename, viaMaster: false };
}
