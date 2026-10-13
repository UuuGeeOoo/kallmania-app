import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireSupervisorOrAdmin } from "@/lib/auth";
import { handle, ok, fail, safeParse, toDateOrNull } from "@/lib/api-utils";
import { aggregateTeamKpis, isShortfall, type KpiMetric } from "@/lib/kpi";
import { audit } from "@/lib/notify";
import { SUPERVISOR_TEAM_KPIS } from "@/lib/template-config";

/** GET /api/consolidated?date=YYYY-MM-DD — cross-department consolidation for the supervisor report */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireSupervisorOrAdmin();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

    const includeUnconfirmed = searchParams.get("includeUnconfirmed") === "1";

    const departments = ["BPO", "WEB_DEV", "SOCIAL_MEDIA"];
    const result: Record<string, unknown> = { date, departments: {} };

    const staff = await db.user.findMany({
      where: { status: "APPROVED", role: { in: ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"] } },
      select: { id: true, fullName: true, role: true, department: true },
    });

    const allReports = await db.report.findMany({
      where: {
        reportDate: { gte: dayStart, lte: dayEnd },
        type: { not: "SUPERVISOR" },
        status: includeUnconfirmed ? undefined : { in: ["SUBMITTED", "APPROVED"] },
      },
      include: { user: { select: { id: true, fullName: true, role: true, department: true, employeeId: true } } },
    });

    for (const dept of departments) {
      const deptReports = allReports.filter((r) => r.department === dept);
      const deptStaff = staff.filter((s) => s.department === dept);
      const confirmed = deptReports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
      const unconfirmed = deptReports.filter((r) => !["SUBMITTED", "APPROVED"].includes(r.status));

      const deptData: Record<string, unknown> = {
        expected: deptStaff.length,
        submitted: confirmed.length,
        pending: Math.max(0, deptStaff.length - confirmed.length),
        employeesMissing: deptStaff.filter((s) => !confirmed.some((r) => r.userId === s.id)).map((s) => s.fullName),
        reports: deptReports.map((r) => ({
          id: r.id, ref: r.ref, userName: r.user.fullName, status: r.status,
          verificationStatus: r.verificationStatus, sourceType: r.sourceType, type: r.type,
        })),
      };

      if (dept === "BPO") {
        const totals: Record<string, number> = {};
        const shortfalls: string[] = [];
        const kpiRows = aggregateTeamKpis(confirmed.map((r) => ({ userName: r.user.fullName, kpiMetrics: r.kpiMetrics })));
        for (const r of confirmed) {
          const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []);
          for (const m of metrics) {
            if (m.actual !== null) totals[m.key] = (totals[m.key] || 0) + m.actual;
            if (isShortfall(m)) shortfalls.push(`${r.user.fullName}: ${m.label} (${m.actual} vs target ${m.target})`);
          }
        }
        // additional activities & escalations & challenges consolidated with provenance
        const activities = confirmed
          .filter((r) => r.additionalActivities)
          .map((r) => ({ employee: r.user.fullName, department: dept, date, source: r.sourceType === "UPLOAD_EXTRACTED" ? "Uploaded report" : "Manual entry", reportRef: r.ref, description: r.additionalActivities }));
        const challenges = confirmed.filter((r) => r.challenges).map((r) => ({ employee: r.user.fullName, reportRef: r.ref, text: r.challenges }));
        const escalations = confirmed.filter((r) => r.escalations).map((r) => ({ employee: r.user.fullName, reportRef: r.ref, text: r.escalations }));
        const callLogs = confirmed.flatMap((r) => safeParse<{ leadName?: string; disposition?: string }[]>(r.callLogs, []).map((l) => ({ employee: r.user.fullName, ...l })));
        Object.assign(deptData, { bpoTotals: totals, teamKpiRows: kpiRows, shortfalls, additionalActivities: activities, challenges, escalations, callLogs });
      } else {
        const msTotals: Record<string, number> = {};
        const workEntries: Record<string, unknown>[] = [];
        const challenges: unknown[] = [];
        const escalations: unknown[] = [];
        const activities: unknown[] = [];
        for (const r of confirmed) {
          const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
          for (const [k, v] of Object.entries(ms)) if (typeof v === "number") msTotals[k] = (msTotals[k] || 0) + v;
          for (const e of safeParse<Record<string, unknown>[]>(r.workEntries, [])) workEntries.push({ employee: r.user.fullName, reportRef: r.ref, ...e });
          if (r.challenges) challenges.push({ employee: r.user.fullName, reportRef: r.ref, text: r.challenges });
          if (r.escalations) escalations.push({ employee: r.user.fullName, reportRef: r.ref, text: r.escalations });
          if (r.additionalActivities) activities.push({ employee: r.user.fullName, reportRef: r.ref, source: r.sourceType === "UPLOAD_EXTRACTED" ? "Uploaded report" : "Manual entry", text: r.additionalActivities });
        }
        Object.assign(deptData, { metricsTotals: msTotals, workEntries, challenges, escalations, additionalActivities: activities });
      }
      result.departments = result.departments as Record<string, unknown>;
      (result.departments as Record<string, unknown>)[dept] = deptData;
    }

    // Existing supervisor report for the date (if any)
    const existing = await db.report.findFirst({
      where: { type: "SUPERVISOR", reportDate: { gte: dayStart, lte: dayEnd }, userId: me.id },
    });
    result.existingSupervisorReport = existing;

    return ok(result);
  });
}

/** POST — save the supervisor consolidated daily report */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const me = await requireSupervisorOrAdmin();
    const body = await req.json();
    const { id, submit, ...fields } = body;
    const reportDate = toDateOrNull(fields.reportDate) || new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    const data: Record<string, unknown> = { type: "SUPERVISOR", reportDate, department: "MANAGEMENT" };
    for (const k of ["shiftTime", "clockIn", "clockOut", "teamName", "campusLocation", "qaObservations", "highlights", "lowlights", "managerReview"]) {
      if (k in fields) data[k] = fields[k] || null;
    }
    if ("agentsManaged" in fields) data.agentsManaged = fields.agentsManaged === "" || fields.agentsManaged === null ? null : parseInt(String(fields.agentsManaged), 10) || 0;
    if ("attendanceStatus" in fields) data.attendanceStatus = fields.attendanceStatus || null;
    for (const k of ["attendanceSummary", "teamKpiAverages", "coachingEntries", "escalatedIssues", "actionPlan"]) {
      if (k in fields) data[k] = typeof fields[k] === "string" ? fields[k] : fields[k] ? JSON.stringify(fields[k]) : null;
    }
    if ("ownActivities" in fields) data.additionalActivities = fields.ownActivities || null;

    let report;
    if (id) {
      const existing = await db.report.findUnique({ where: { id } });
      if (!existing) return fail("Report not found", 404);
      if (existing.userId !== me.id) return fail("Not authorized", 403);
      report = await db.report.update({ where: { id }, data: { ...data, status: submit ? "SUBMITTED" : existing.status } });
    } else {
      report = await db.report.create({
        data: { ...data, ref: `SUP-${Date.now().toString(36).toUpperCase()}`, userId: me.id, status: submit ? "SUBMITTED" : "DRAFT" },
      });
    }
    await audit({ userId: me.id, actorName: me.fullName, action: submit ? "SUBMIT_SUPERVISOR_REPORT" : "SAVE_SUPERVISOR_REPORT", entity: "Report", entityId: report.id, details: report.ref });
    const fresh = await db.report.findUnique({ where: { id: report.id } });
    return ok({ report: fresh }, id ? 200 : 201);
  });
}
