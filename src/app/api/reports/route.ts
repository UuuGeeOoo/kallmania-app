import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, ok, fail, safeParse, toDateOrNull } from "@/lib/api-utils";
import { recalcKpis, isShortfall, type KpiMetric } from "@/lib/kpi";
import { resolveKpiCatalogue } from "@/lib/kpi-resolve";
import { audit, notify, notifySupervisors } from "@/lib/notify";

function genRef(type: string): string {
  const prefix = type === "AGENT_BPO" ? "BPO" : type === "TECH" ? "TEC" : type === "SOCIAL" ? "SOC" : type === "TEAM_LEAD" ? "TL" : "SUP";
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}

const REPORT_TYPE_BY_ROLE: Record<string, string> = {
  AGENT_BPO: "AGENT_BPO",
  DEVELOPER: "TECH",
  SOCIAL_MEDIA: "SOCIAL",
  SUPERVISOR: "SUPERVISOR",
  TEAM_LEAD: "TEAM_LEAD",
};

/**
 * Submit-time validation — the configured KPI requirements must be met before a
 * report leaves Draft. Only the AGENT_BPO template carries mandatory metrics
 * (configured per centre under KPI Configuration); an agent marked Absent is
 * exempt since they have no numbers to report. Returns the error message or
 * null when the report may be submitted. Nothing is persisted when this fails,
 * so every entered value stays in the agent's form (and any saved draft).
 * Mandatory flags are resolved through the centre-aware catalogue: the report
 * owner's centre overrides replace the global defaults — one centre's
 * "required" never leaks into another centre's validation.
 */
async function validateMandatoryKpis(
  reportType: string,
  owner: { team: string | null | undefined; country: string | null | undefined; state: string | null | undefined } | null | undefined,
  attendance: string | null | undefined,
  metricsJson: unknown,
): Promise<string | null> {
  if (reportType !== "AGENT_BPO" || attendance === "Absent") return null;
  const cfgDept = owner?.team === "INBOUND" ? "INBOUND" : "BPO";
  const catalogue = await resolveKpiCatalogue(
    owner?.country && owner?.state ? { country: owner.country, state: owner.state } : null,
  );
  const cfgs = catalogue.filter((c) => c.department === cfgDept && c.mandatory && c.active);
  if (!cfgs.length) return null;
  const metrics = safeParse<KpiMetric[]>(metricsJson as string | unknown[] | object | null | undefined, []);
  const missing = [...new Set(cfgs
    .filter((c) => {
      const m = metrics.find((x) => x.key === c.key);
      return !m || m.actual === null || m.actual === undefined || Number.isNaN(Number(m.actual));
    })
    .map((c) => c.label))];
  return missing.length
    ? `Cannot submit yet — the required KPI field(s) are still empty: ${missing.join(", ")}. Nothing was lost: click "Save Draft" to keep your entries, fill the highlighted fields, then submit again.`
    : null;
}

/** GET /api/reports?mine=1&date=YYYY-MM-DD&department=&status=&type=&userId= */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    const date = searchParams.get("date");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};
    if (mine || !isSupervisorLike(me)) where.userId = me.id;
    else if (userId) where.userId = userId;
    if (date) {
      const d = new Date(date + "T00:00:00.000Z");
      where.reportDate = { gte: d, lte: new Date(date + "T23:59:59.999Z") };
    }
    if (department && isSupervisorLike(me)) where.department = department;
    if (status) where.status = status;
    if (type) where.type = type;

    const reports = await db.report.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true, department: true, employeeId: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
    });
    return ok({ reports });
  });
}

/** POST — create or update a report (draft or direct submit). */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const body = await req.json();
    const { id, submit, ...fields } = body;

    const reportType = fields.type || (me.role === "SUPERVISOR" ? "SUPERVISOR" : me.role === "TEAM_LEAD" ? "TEAM_LEAD" : REPORT_TYPE_BY_ROLE[me.role]);
    if (!["AGENT_BPO", "TECH", "SOCIAL", "SUPERVISOR", "TEAM_LEAD"].includes(reportType)) return fail("Invalid report type");
    if (reportType === "SUPERVISOR" && !["SUPERVISOR", "ADMIN"].includes(me.role))
      return fail("Only supervisors can submit the supervisor daily report", 403);
    if (reportType === "TEAM_LEAD" && !["TEAM_LEAD", "SUPERVISOR", "ADMIN"].includes(me.role))
      return fail("Only team leads can submit the team lead daily report", 403);

    const reportDate = toDateOrNull(fields.reportDate) || new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    // Same-day window (UTC) used by the duplicate-submission guards below.
    const dayStart = new Date(reportDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    // Prepare data
    const data: Partial<Prisma.ReportUncheckedCreateInput> = {
      type: reportType,
      reportDate,
      department: fields.department || me.department,
    };

    // Shared attendance
    for (const k of ["shiftTime", "clockIn", "clockOut", "attendanceStatus"]) {
      if (k in fields) (data as Record<string, unknown>)[k] = fields[k] || null;
    }
    if ("latenessMins" in fields) data.latenessMins = fields.latenessMins === "" || fields.latenessMins === null ? null : parseInt(String(fields.latenessMins), 10) || 0;

    // Recompute derived KPIs server-side before persisting
    if ("kpiMetrics" in fields) {
      const metrics = safeParse<KpiMetric[]>(fields.kpiMetrics, []);
      const recalculated = recalcKpis(metrics);
      data.kpiMetrics = JSON.stringify(recalculated);
      // SOCIAL template: derive metricsSummary from the docx KPI rows so multi-period
      // KPI aggregation keeps working regardless of the client that submitted the report
      if (reportType === "SOCIAL") {
        const val = (k: string) => recalculated.find((m) => m.key === k)?.actual ?? null;
        const ms: Record<string, number> = {};
        const put = (target: string, v: number | null) => { if (v !== null && v !== undefined) ms[target] = v; };
        put("postsPublished", val("postsCreated"));
        put("storiesPublished", val("storiesReels"));
        put("reach", val("reachImpressions"));
        put("followerGrowth", val("followerGrowth"));
        put("commentsHandled", val("commentsDMs"));
        data.metricsSummary = JSON.stringify(ms);
      }
    }
    for (const k of ["callLogs", "emailContext", "workEntries", "attendanceSummary", "teamKpiAverages", "coachingEntries", "escalatedIssues", "actionPlan", "payload"]) {
      if (k in fields) (data as Record<string, unknown>)[k] = typeof fields[k] === "string" ? fields[k] : fields[k] ? JSON.stringify(fields[k]) : null;
    }
    // metricsSummary: explicit values win; otherwise the SOCIAL derivation above already set it
    if ("metricsSummary" in fields) data.metricsSummary = typeof fields.metricsSummary === "string" ? fields.metricsSummary : fields.metricsSummary ? JSON.stringify(fields.metricsSummary) : null;
    else if (!("kpiMetrics" in fields) && reportType === "SOCIAL") data.metricsSummary = data.metricsSummary ?? null;
    for (const k of ["challenges", "escalations", "additionalActivities", "teamName", "campusLocation", "qaObservations", "highlights", "lowlights", "managerReview"]) {
      if (k in fields) (data as Record<string, unknown>)[k] = fields[k] || null;
    }
    if ("agentsManaged" in fields) data.agentsManaged = fields.agentsManaged === "" || fields.agentsManaged === null ? null : parseInt(String(fields.agentsManaged), 10) || 0;

    // Provenance
    if (fields.sourceType) data.sourceType = fields.sourceType;
    if (fields.sourceFileId) data.sourceFileId = fields.sourceFileId;
    if (fields.verificationStatus) data.verificationStatus = fields.verificationStatus;

    let correction = false;
    let report;
    if (id) {
      const existing = await db.report.findUnique({ where: { id } });
      if (!existing) return fail("Report not found", 404);
      if (existing.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);
      if (["APPROVED"].includes(existing.status) && !isSupervisorLike(me))
        return fail("Approved reports are locked and cannot be corrected. Ask your supervisor to return it for correction.", 403);
      // ── Workflow guards ──
      // A submitted report awaits approval: it cannot be submitted twice.
      // Corrections (save WITHOUT submit) stay possible until approval.
      // Approved reports are locked entirely — no corrections, no resubmission.
      if (submit && existing.status === "SUBMITTED")
        return fail(`Report ${existing.ref} has already been submitted and is awaiting approval — a report cannot be submitted twice. Use "Make Correction" to update it while it awaits approval.`, 409);
      if (submit && existing.status === "APPROVED")
        return fail(`Report ${existing.ref} is approved and finalized — it cannot be submitted again.`, 409);
      if (submit) {
        const dup = await db.report.findFirst({
          where: {
            userId: existing.userId, type: reportType,
            reportDate: { gte: dayStart, lt: dayEnd },
            status: { in: ["SUBMITTED", "APPROVED"] },
            NOT: { id: existing.id },
          },
        });
        if (dup) return fail(`A ${dup.status === "APPROVED" ? "finalized" : "submitted"} report for this day already exists (${dup.ref}) — a report cannot be submitted twice for the same day.`, 409);
      }
      if (!submit && existing.status === "SUBMITTED") correction = true;
      if (submit) {
        const owner = await db.user.findUnique({ where: { id: existing.userId }, select: { team: true, country: true, state: true } });
        const err = await validateMandatoryKpis(
          reportType,
          owner,
          (data.attendanceStatus as string | null | undefined) ?? existing.attendanceStatus,
          "kpiMetrics" in fields ? fields.kpiMetrics : existing.kpiMetrics,
        );
        if (err) return fail(err, 422);
      }
      report = await db.report.update({ where: { id }, data: { ...data, status: submit ? "SUBMITTED" : existing.status === "REJECTED" && !submit ? "DRAFT" : existing.status } });
    } else {
      // Same-day duplicate guard: one live (submitted/approved) report per
      // person per report type per day — creating a second one is blocked so
      // the agent corrects the existing report instead of double-submitting.
      const dup = await db.report.findFirst({
        where: {
          userId: me.id, type: reportType,
          reportDate: { gte: dayStart, lt: dayEnd },
          status: { in: ["SUBMITTED", "APPROVED"] },
        },
      });
      if (dup) return fail(`You already have a ${dup.status === "APPROVED" ? "finalized" : "submitted"} report for this day (${dup.ref}). A report cannot be submitted twice for the same day — open the Daily Report page for that date to make corrections instead.`, 409);
      if (submit) {
        const err = await validateMandatoryKpis(reportType, me, (data.attendanceStatus as string | null | undefined) ?? null, fields.kpiMetrics);
        if (err) return fail(err, 422);
      }
      report = await db.report.create({
        data: { ...(data as Prisma.ReportUncheckedCreateInput), ref: genRef(reportType), userId: me.id, status: submit ? "SUBMITTED" : "DRAFT" },
      });
    }

    // ── SUBMIT workflow: notifications & exception detection ──
    if (submit) {
      const metrics = safeParse<KpiMetric[]>(report.kpiMetrics, []);
      const shortfalls = metrics.filter((m) => isShortfall(m));
      const supervisors = await db.user.findMany({ where: { role: { in: ["SUPERVISOR", "ADMIN"] }, status: "APPROVED" } });

      for (const sup of supervisors) {
        await notify({
          userId: sup.id,
          type: "REPORT_SUBMITTED",
          severity: "INFO",
          title: `Daily report submitted — ${me.fullName}`,
          message: `${me.fullName} (${report.department}) submitted report ${report.ref} for ${new Date(report.reportDate).toISOString().slice(0, 10)}.`,
          linkData: { view: "review", id: report.id },
        });
      }
      if (shortfalls.length) {
        const detail = shortfalls.map((m) => `${m.label}: actual ${m.actual} vs target ${m.target}`).join("; ");
        await notifySupervisors({
          type: "KPI_SHORTFALL",
          severity: "WARNING",
          title: `KPI shortfall — ${me.fullName}`,
          message: `${shortfalls.length} KPI(s) below target in ${report.ref}: ${detail}`,
          linkData: { view: "review", id: report.id },
          dedupeKey: `kpi-shortfall:${report.id}`,
        }, { includeAdmins: true });
      }
      if (report.escalations) {
        await notifySupervisors({
          type: "ESCALATION",
          severity: "CRITICAL",
          title: `Escalation raised — ${me.fullName}`,
          message: `Report ${report.ref} contains escalations requiring review.`,
          linkData: { view: "review", id: report.id },
          dedupeKey: `escalation:${report.id}`,
        }, { includeAdmins: true });
      }
      // Incomplete tasks mentioned in work entries
      if (reportType === "TECH" || reportType === "SOCIAL") {
        const entries = safeParse<Record<string, unknown>[]>(report.workEntries, []);
        const incomplete = entries.filter((e) => {
          const st = String(e.status || "");
          return st && !["Completed", "Under Review", "Pending Deployment", "Awaiting Approval", "Published"].includes(st);
        });
        if (incomplete.length) {
          await notifySupervisors({
            type: "TASK_INCOMPLETE",
            severity: "WARNING",
            title: `Incomplete tasks reported — ${me.fullName}`,
            message: `${incomplete.length} task(s) reported incomplete/not completed in ${report.ref}. Sent for review.`,
            linkData: { view: "review", id: report.id },
            dedupeKey: `task-incomplete:${report.id}`,
          }, { includeAdmins: true });
        }
      }
      // TEAM_LEAD dynamic payload: escalation section triggers an instant alert
      if (reportType === "TEAM_LEAD" && report.payload) {
        try {
          const payload = JSON.parse(report.payload) as { sections?: Record<string, unknown> };
          const esc = payload.sections?.escalations;
          const hasEscalation = typeof esc === "string" ? esc.trim().length > 0 : Array.isArray(esc) ? esc.length > 0 : false;
          if (hasEscalation) {
            await notifySupervisors({
              type: "ESCALATION",
              severity: "CRITICAL",
              title: `Escalation raised — ${me.fullName} (team lead)`,
              message: `Team lead report ${report.ref} contains escalations requiring review.`,
              linkData: { view: "review", id: report.id },
              dedupeKey: `escalation:${report.id}`,
            }, { includeAdmins: true });
          }
        } catch { /* malformed payload — skip */ }
      }
      // If extracted from upload, mark upload as SUBMITTED
      if (report.sourceFileId) {
        await db.uploadedFile.updateMany({ where: { id: report.sourceFileId }, data: { extractStatus: "SUBMITTED" } });
      }
      // verification upgrade
      await db.report.update({ where: { id: report.id }, data: { verificationStatus: report.sourceType === "UPLOAD_EXTRACTED" ? "CONFIRMED_BY_EMPLOYEE" : "MANUAL_ENTRY" } });
    }

    await audit({
      userId: me.id, actorName: me.fullName, action: submit ? "SUBMIT_REPORT" : "SAVE_REPORT",
      entity: "Report", entityId: report.id, details: `${report.ref} (${reportType})${submit ? " SUBMITTED" : correction ? " — corrected while awaiting approval" : " draft"}`,
    });

    const fresh = await db.report.findUnique({ where: { id: report.id } });
    return ok({ report: fresh }, id ? 200 : 201);
  });
}

/** PATCH — supervisor review: approve / reject / feedback */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);
    const body = await req.json();
    const { id, decision, feedback } = body;
    if (!id || !decision) return fail("id and decision are required");
    const report = await db.report.findUnique({ where: { id }, include: { user: true } });
    if (!report) return fail("Report not found", 404);

    const data: Record<string, unknown> = { reviewedById: me.id, reviewedAt: new Date() };
    if (feedback !== undefined) data.supervisorFeedback = feedback || null;

    if (decision === "approve") {
      data.status = "APPROVED";
      data.verificationStatus = "REVIEWED_BY_SUPERVISOR";
    } else if (decision === "reject") {
      data.status = "REJECTED";
    } else {
      return fail("decision must be approve or reject");
    }

    const updated = await db.report.update({ where: { id }, data });
    await notify({
      userId: report.userId,
      type: decision === "approve" ? "REPORT_APPROVED" : "REPORT_RETURNED",
      severity: decision === "approve" ? "INFO" : "WARNING",
      title: decision === "approve" ? `Report approved — ${report.ref}` : `Report returned for correction — ${report.ref}`,
      message: `${me.fullName} ${decision === "approve" ? "approved" : "returned"} your report ${report.ref}.${feedback ? ` Feedback: ${feedback}` : ""}`,
      linkData: { view: "my-reports", id: report.id },
      dedupeKey: `review:${report.id}:${decision}`,
    });
    await audit({ userId: me.id, actorName: me.fullName, action: `REPORT_${decision.toUpperCase()}`, entity: "Report", entityId: id, details: `${report.ref} by ${report.user.fullName}` });
    return ok({ report: updated });
  });
}
