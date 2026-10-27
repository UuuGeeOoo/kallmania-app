import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { recalcKpis, type KpiMetric } from "@/lib/kpi";
import { audit } from "@/lib/notify";
import { safeParse } from "@/lib/api-utils";

/** Supervisor template destinations for the confirmed metric grid. */
const SUP_ATTENDANCE_KEYS = new Set(["totalOnShift", "presentOnTime", "lateArrivals", "absentExcused", "absentUnexcused", "earlyDepartures"]);

/**
 * POST /api/uploads/confirm
 * Body: { uploadId, confirmedMetrics: KpiMetric[], sections: {...}, emailContext, submit }
 * Employee reviews uncertain extraction results, corrects them, then confirms.
 * Creates the structured report linked to the source document.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { uploadId, confirmedMetrics, sections, emailContext, reportDate, department, submit } = body;
    if (!uploadId) return fail("uploadId is required");

    const upload = await db.uploadedFile.findUnique({ where: { id: uploadId } });
    if (!upload) return fail("Upload not found", 404);
    if (upload.userId !== me.id) return fail("Only the uploader can confirm this extraction", 403);
    // Duplicate-record guard: one confirmation per upload — a second submit
    // would double-count the document's metrics in KPI dashboards.
    if (upload.reportId) return fail("This upload was already confirmed as a report. Check your reports list — avoid submitting the same document twice.", 409);
    if (upload.extractStatus === "SUBMITTED") return fail("This upload has already been confirmed and submitted", 409);

    const reportTypeByDept: Record<string, string> = { BPO: "AGENT_BPO", WEB_DEV: "TECH", SOCIAL_MEDIA: "SOCIAL", MANAGEMENT: "SUPERVISOR" };
    const reportType = reportTypeByDept[department || upload.department || "BPO"] || "AGENT_BPO";

    const metrics = recalcKpis(safeParse<KpiMetric[]>(confirmedMetrics, []));
    const date = toDateOrNull(reportDate) || upload.reportDate || new Date();

    const refPrefix = reportType === "AGENT_BPO" ? "BPO" : reportType === "TECH" ? "TEC" : reportType === "SUPERVISOR" ? "SUP" : "SOC";
    const ref = `${refPrefix}-UP-${Date.now().toString(36).toUpperCase()}`;

    // ── SUPERVISOR: confirmed metrics split into attendance counts and team
    // KPI rows; narrative sections map onto the supervisor template columns.
    // Unknown metric keys are preserved as extra team rows (template fill
    // ignores labels it does not know; nothing is silently dropped).
    let supervisorData: Record<string, unknown> = {};
    if (reportType === "SUPERVISOR") {
      const attendanceRows: Record<string, { count: string; details: string }> = {};
      const teamRows: { key: string; label: string; teamTarget: string; teamAvg: string; best: string; lowest: string; notes: string }[] = [];
      for (const m of metrics) {
        if (m.actual === null || m.actual === undefined) continue;
        const targetStr = m.target !== null && m.target !== undefined ? String(m.target) : "";
        if (SUP_ATTENDANCE_KEYS.has(m.key)) {
          attendanceRows[m.key] = { count: String(m.actual), details: m.notes || "" };
        } else {
          teamRows.push({ key: m.key, label: m.label, teamTarget: targetStr, teamAvg: String(m.actual), best: "", lowest: "", notes: m.notes || "" });
        }
      }
      supervisorData = {
        teamName: sections?.teamName || null,
        attendanceSummary: Object.keys(attendanceRows).length ? JSON.stringify(attendanceRows) : null,
        teamKpiAverages: teamRows.length ? JSON.stringify(teamRows) : null,
        coachingEntries: sections?.coaching ? JSON.stringify([{ agentName: "", type: "", details: sections.coaching }]) : null,
        qaObservations: sections?.qaObservations || null,
        escalatedIssues: sections?.escalations ? JSON.stringify([{ description: sections.escalations, priority: "", status: "", action: "" }]) : null,
        highlights: sections?.highlights || null,
        lowlights: sections?.lowlights || null,
        actionPlan: sections?.actionPlan ? JSON.stringify([{ action: sections.actionPlan, owner: "", priority: "", deadline: "" }]) : null,
      };
    }

    const report = await db.report.create({
      data: {
        ref,
        type: reportType,
        reportDate: date,
        userId: me.id,
        department: department || upload.department || me.department,
        shiftTime: sections?.shiftTime || null,
        clockIn: sections?.clockIn || null,
        clockOut: sections?.clockOut || null,
        attendanceStatus: sections?.attendanceStatus || null,
        latenessMins: sections?.latenessMins ? parseInt(String(sections.latenessMins), 10) || 0 : null,
        kpiMetrics: reportType === "SUPERVISOR" ? null : JSON.stringify(metrics),
        challenges: sections?.challenges || null,
        escalations: reportType === "SUPERVISOR" ? null : sections?.escalations || null,
        additionalActivities: reportType === "SUPERVISOR" ? null : sections?.additionalActivities || null,
        emailContext: reportType === "SUPERVISOR" ? null : emailContext ? JSON.stringify(emailContext) : null,
        status: submit ? "SUBMITTED" : "DRAFT",
        sourceType: "UPLOAD_EXTRACTED",
        sourceFileId: upload.id,
        verificationStatus: "CONFIRMED_BY_EMPLOYEE",
        ...supervisorData,
      },
    });

    await db.uploadedFile.update({
      where: { id: uploadId },
      data: { extractStatus: submit ? "SUBMITTED" : "EXTRACTION_COMPLETED", reportId: report.id, confirmedAt: new Date() },
    });

    // Submit notifications (mirror reports route)
    if (submit) {
      const supervisors = await db.user.findMany({ where: { role: { in: ["SUPERVISOR", "ADMIN"] }, status: "APPROVED" } });
      for (const sup of supervisors) {
        await import("@/lib/notify").then(({ notify }) =>
          notify({
            userId: sup.id,
            type: "REPORT_SUBMITTED",
            severity: "INFO",
            title: `Daily report submitted — ${me.fullName}`,
            message: `${me.fullName} submitted report ${ref} (extracted from "${upload.originalName}") for ${new Date(date).toISOString().slice(0, 10)}.`,
            linkData: { view: "review", id: report.id },
          })
        );
      }
    }

    await audit({
      userId: me.id, actorName: me.fullName, action: "CONFIRM_EXTRACTION", entity: "Report", entityId: report.id,
      details: `${ref} confirmed from upload ${upload.originalName}${submit ? " and submitted" : ""}`,
    });

    return ok({ report }, 201);
  });
}
