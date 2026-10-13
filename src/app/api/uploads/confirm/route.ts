import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { recalcKpis, type KpiMetric } from "@/lib/kpi";
import { audit } from "@/lib/notify";
import { safeParse } from "@/lib/api-utils";

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

    const reportTypeByDept: Record<string, string> = { BPO: "AGENT_BPO", WEB_DEV: "TECH", SOCIAL_MEDIA: "SOCIAL" };
    const reportType = reportTypeByDept[department || upload.department || "BPO"] || "AGENT_BPO";

    const metrics = recalcKpis(safeParse<KpiMetric[]>(confirmedMetrics, []));
    const date = toDateOrNull(reportDate) || upload.reportDate || new Date();

    const ref = `${reportType === "AGENT_BPO" ? "BPO" : reportType === "TECH" ? "TEC" : "SOC"}-UP-${Date.now().toString(36).toUpperCase()}`;

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
        kpiMetrics: JSON.stringify(metrics),
        challenges: sections?.challenges || null,
        escalations: sections?.escalations || null,
        additionalActivities: sections?.additionalActivities || null,
        emailContext: emailContext ? JSON.stringify(emailContext) : null,
        status: submit ? "SUBMITTED" : "DRAFT",
        sourceType: "UPLOAD_EXTRACTED",
        sourceFileId: upload.id,
        verificationStatus: "CONFIRMED_BY_EMPLOYEE",
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
