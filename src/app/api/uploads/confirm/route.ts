import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail, toDateOrNull } from "@/lib/api-utils";
import { recalcKpis, type KpiMetric } from "@/lib/kpi";
import { trackActivity } from "@/lib/intel/track";
import { audit, notifySupervisors } from "@/lib/notify";
import { defaultTemplateFor, tlTemplateKeyFor, type TlDefinition } from "@/lib/team-lead-template";
import { safeParse } from "@/lib/api-utils";

/** Supervisor template destinations for the confirmed metric grid. */
const SUP_ATTENDANCE_KEYS = new Set(["totalOnShift", "presentOnTime", "lateArrivals", "absentExcused", "absentUnexcused", "earlyDepartures"]);

/** SOCIAL template → dashboard aggregation mapping (mirrors POST /api/reports). */
const SOCIAL_SUMMARY_MAP: { from: string; to: string }[] = [
  { from: "postsCreated", to: "postsPublished" },
  { from: "storiesReels", to: "storiesPublished" },
  { from: "reachImpressions", to: "reach" },
  { from: "followerGrowth", to: "followerGrowth" },
  { from: "commentsDMs", to: "commentsHandled" },
];

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

    const reportTypeByDept: Record<string, string> = { BPO: "AGENT_BPO", INBOUND: "AGENT_BPO", WEB_DEV: "TECH", SOCIAL_MEDIA: "SOCIAL", MANAGEMENT: "SUPERVISOR" };
    // Team association, enforced server-side: a staff member's report is ALWAYS
    // created under their own team/department — a tampered payload cannot file
    // a social-media report as an outbound (or any other team's) report.
    // Supervisors and administrators keep their picker (they file on behalf of
    // the teams they oversee).
    const isManager = ["SUPERVISOR", "ADMIN"].includes(me.role);
    const effectiveDepartment = isManager
      ? department || upload.department || me.department || "BPO"
      : me.department || upload.department || "BPO";
    const deptReportType = reportTypeByDept[effectiveDepartment] || "AGENT_BPO";
    // A TEAM LEAD's upload is THEIR OWN report: filed as the TEAM LEAD daily
    // report in the lead format of their team (TL_SOCIAL / TL_TECH / …). The
    // department map — which would file it as their team's AGENT format — and
    // a spoofed payload department cannot change that.
    const reportType = !isManager && me.role === "TEAM_LEAD" ? "TEAM_LEAD" : deptReportType;

    const metrics = recalcKpis(safeParse<KpiMetric[]>(confirmedMetrics, []));
    const date = toDateOrNull(reportDate) || upload.reportDate || new Date();

    // Same-day duplicate guard: if the employee already has a submitted or
    // approved report of this type for the same day, confirming this upload
    // would double-submit that day. Block it — the existing report can be
    // corrected from the Daily Report page instead.
    const confirmDayStart = new Date(date);
    confirmDayStart.setUTCHours(0, 0, 0, 0);
    const confirmDayEnd = new Date(confirmDayStart.getTime() + 86_400_000);
    const sameDayLive = await db.report.findFirst({
      where: {
        userId: me.id, type: reportType,
        reportDate: { gte: confirmDayStart, lt: confirmDayEnd },
        status: { in: ["SUBMITTED", "APPROVED"] },
        // SBTS-imported archive copies never block the owner's own submission
        sourceType: { not: "SBTS_IMPORT" },
      },
    });
    if (sameDayLive)
      return fail(`You already have a ${sameDayLive.status === "APPROVED" ? "finalized" : "submitted"} report for this day (${sameDayLive.ref}) — a report cannot be submitted twice for the same day.`, 409);

    const refPrefix = reportType === "AGENT_BPO" ? "BPO" : reportType === "TECH" ? "TEC" : reportType === "SUPERVISOR" ? "SUP" : reportType === "TEAM_LEAD" ? "TL" : "SOC";
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

    // ── TECH / SOCIAL team formats: the metric grid becomes the structure that
    // team's report (and its dashboards) read — technical reports keep a plain
    // metricsSummary, social media reports keep the team's docx KPI table
    // (kpiMetrics) plus the derived summary. Work/task entries from the
    // team's format sections are stored verbatim; the owner's team is stamped
    // on the report. Nothing is forced into the outbound agent shape.
    let deptTeamData: Record<string, unknown> = {};
    if (reportType === "TECH" || reportType === "SOCIAL") {
      const entries = Array.isArray(body.workEntries) ? body.workEntries.filter((e: unknown) => e && typeof e === "object" && Object.values(e as Record<string, unknown>).some((v) => v && String(v).trim() !== "")) : [];
      if (reportType === "TECH") {
        const ms: Record<string, number> = {};
        for (const m of metrics) {
          if (m.actual !== null && m.actual !== undefined && Number.isFinite(Number(m.actual))) ms[m.key] = Number(m.actual);
        }
        deptTeamData = {
          kpiMetrics: null,
          metricsSummary: Object.keys(ms).length ? JSON.stringify(ms) : null,
          workEntries: entries.length ? JSON.stringify(entries) : null,
          teamName: me.team || null,
        };
      } else {
        const val = (k: string) => metrics.find((m) => m.key === k)?.actual ?? null;
        const msSummary: Record<string, number> = {};
        for (const { from, to } of SOCIAL_SUMMARY_MAP) {
          const v = val(from);
          if (v !== null && v !== undefined && Number.isFinite(Number(v))) msSummary[to] = Number(v);
        }
        deptTeamData = {
          kpiMetrics: JSON.stringify(metrics),
          metricsSummary: Object.keys(msSummary).length ? JSON.stringify(msSummary) : null,
          workEntries: entries.length ? JSON.stringify(entries) : null,
          teamName: me.team || null,
        };
      }
    }

    // ── TEAM LEAD: the confirmed grid becomes the lead's own dynamic-template
    // payload in the lead format of THEIR team (templateKey persisted, so
    // read-back, correction and the Word export all render the same format the
    // lead filled). Rows follow the lead template's KPI configuration; values
    // the lead format has no row for stay visible as extra rows — nothing the
    // document stated is silently dropped.
    let leadData: Record<string, unknown> = {};
    if (reportType === "TEAM_LEAD") {
      const tlKey = tlTemplateKeyFor(me.department, me.team);
      const row = await db.reportTemplate.findUnique({ where: { key: tlKey } });
      let def: TlDefinition | null = null;
      if (row) { try { def = JSON.parse(row.definition) as TlDefinition; } catch { def = null; } }
      if (!def) def = defaultTemplateFor(tlKey);
      const bodySections = (sections || {}) as Record<string, unknown>;
      const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
      const secs: Record<string, unknown> = {};
      for (const s of def.sections) {
        if (s.type === "fields") {
          const src = (bodySections[s.id] && typeof bodySections[s.id] === "object" && !Array.isArray(bodySections[s.id]) ? bodySections[s.id] : {}) as Record<string, unknown>;
          const info: Record<string, string> = {};
          for (const f of s.fields || []) {
            let v = str(src[f.key]);
            if (!v && f.key === "teamName") v = str(bodySections.teamName) || me.team || "";
            if (!v && ["shiftTime", "clockIn", "clockOut", "attendanceStatus", "latenessMins"].includes(f.key)) v = str(bodySections[f.key]);
            if (v) info[f.key] = v;
          }
          if (Object.keys(info).length) secs[s.id] = info;
        } else if (s.type === "metrics") {
          const rows = (s.metrics || []).map((m) => {
            const cm = metrics.find((x) => x.key === m.key);
            const actual = cm && cm.actual !== null && cm.actual !== undefined ? cm.actual : null;
            return { key: m.key, label: m.label, target: m.target, targetLabel: m.target === null ? "-" : String(m.target) + (m.unit === "percent" ? "%" : ""), unit: m.unit, actual, notes: cm?.notes || "" };
          });
          const known = new Set(rows.map((r) => r.key));
          for (const m of metrics) {
            if (known.has(m.key) || m.actual === null || m.actual === undefined) continue;
            rows.push({ key: m.key, label: m.label, target: m.target ?? null, targetLabel: m.targetLabel || "-", unit: m.unit || "count", actual: m.actual, notes: m.notes || "" });
          }
          secs[s.id] = rows;
        } else if (s.type === "table") {
          const direct = bodySections[s.id];
          let rows: Record<string, unknown>[] | null = null;
          if (Array.isArray(direct)) rows = direct as Record<string, unknown>[];
          else if (s.id === "tasks" && Array.isArray(body.workEntries) && body.workEntries.length) rows = body.workEntries;
          else if (typeof direct === "string" && str(direct)) rows = [{ [s.columns?.[0]?.key || "entry"]: str(direct) }];
          if (rows && rows.length) secs[s.id] = rows;
        } else if (typeof bodySections[s.id] === "string" && str(bodySections[s.id])) {
          secs[s.id] = str(bodySections[s.id]);
        }
      }
      // Narrative sections extracted from the document land on the matching
      // template sections (challenges / escalations / action plan / coaching),
      // wrapped into the table shape when the team's format uses one.
      const putText = (id: string, text: string) => {
        if (!text || secs[id] !== undefined || !def) return;
        const s = def.sections.find((x) => x.id === id);
        if (!s) return;
        if (s.type === "table") secs[id] = [{ [s.columns?.[0]?.key || "entry"]: text }];
        else if (s.type === "textarea") secs[id] = text;
      };
      putText("challenges", str(bodySections.challenges));
      putText("escalations", str(bodySections.escalations));
      putText("action-plan", str(bodySections.actionPlan));
      putText("coaching", str(bodySections.coaching));
      // Anything else the document stated that the lead format has no slot for
      // stays visible under ADDITIONAL COMMENTS — never silently dropped.
      const extras = str(bodySections.additionalActivities);
      if (extras && typeof secs.comments !== "string") secs.comments = `Additional activities: ${extras}`;
      leadData = {
        payload: JSON.stringify({ sections: secs, templateKey: tlKey }),
        teamName: str(bodySections.teamName) || me.team || null,
        kpiMetrics: null,
        metricsSummary: null,
        workEntries: null,
        escalations: null,
        additionalActivities: null,
        emailContext: null,
      };
    }

    const report = await db.report.create({
      data: {
        ref,
        type: reportType,
        reportDate: date,
        userId: me.id,
        department: effectiveDepartment,
        shiftTime: sections?.shiftTime || null,
        clockIn: sections?.clockIn || null,
        clockOut: sections?.clockOut || null,
        attendanceStatus: sections?.attendanceStatus || null,
        latenessMins: sections?.latenessMins ? parseInt(String(sections.latenessMins), 10) || 0 : null,
        kpiMetrics: ["SUPERVISOR", "TEAM_LEAD"].includes(reportType) ? null : JSON.stringify(metrics),
        challenges: sections?.challenges || null,
        escalations: ["SUPERVISOR", "TEAM_LEAD"].includes(reportType) ? null : sections?.escalations || null,
        additionalActivities: ["SUPERVISOR", "TEAM_LEAD"].includes(reportType) ? null : sections?.additionalActivities || null,
        emailContext: ["SUPERVISOR", "TEAM_LEAD"].includes(reportType) ? null : emailContext ? JSON.stringify(emailContext) : null,
        status: submit ? "SUBMITTED" : "DRAFT",
        sourceType: "UPLOAD_EXTRACTED",
        sourceFileId: upload.id,
        verificationStatus: "CONFIRMED_BY_EMPLOYEE",
        ...supervisorData,
        ...deptTeamData,
        ...leadData,
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
      // TEAM LEAD payload: an escalations section (text or table rows) from the
      // uploaded document alerts supervisors instantly — same rule as the
      // manual team lead form.
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
              message: `Team lead report ${ref} (from upload "${upload.originalName}") contains escalations requiring review.`,
              linkData: { view: "review", id: report.id },
              dedupeKey: `escalation:${report.id}`,
            }, { includeAdmins: true });
          }
        } catch { /* malformed payload — skip */ }
      }
    }

    // ── Normalized KPI records: an upload-confirmed submission writes the same
    // KpiResult rows as a manual submission (extracted values ARE KPI values).
    try {
      if (report.status === "SUBMITTED") {
        const owner = { id: me.id, team: me.team, department: effectiveDepartment };
        if (reportType === "TEAM_LEAD") await (await import("@/lib/kpi-results")).materializeTeamLeadKpiResults(report, owner);
        else if (reportType !== "SUPERVISOR") await (await import("@/lib/kpi-results")).materializeReportKpiResults(report, owner);
      }
    } catch (kpiErr) {
      console.error("KPI result materialization failed for", ref, kpiErr);
    }

    await audit({
      userId: me.id, actorName: me.fullName, action: "CONFIRM_EXTRACTION", entity: "Report", entityId: report.id,
      details: `${ref} confirmed from upload ${upload.originalName}${submit ? " and submitted" : ""}`,
    });
    await trackActivity({ userId: me.id, eventType: submit ? "REPORT_SUBMITTED" : "UPLOAD_CONFIRMED", relatedType: "Report", relatedId: report.id, metadata: { ref, fromUpload: true }, centre: { country: me.country, state: me.state, team: me.team } });

    return ok({ report }, 201);
  });
}
