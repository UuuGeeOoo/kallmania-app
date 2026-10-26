import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike } from "@/lib/auth";
import { handle, fail, safeParse } from "@/lib/api-utils";
import { generateReportDocx } from "@/lib/report-docx";
import { TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { audit } from "@/lib/notify";

/**
 * GET /api/export?format=docx|xlsx|csv&id=<reportId>
 *     /api/export?format=docx&scope=department&department=BPO&date=YYYY-MM-DD
 * Word (.docx) is the primary format — built from the attached master templates.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "docx").toLowerCase();
    const id = searchParams.get("id");
    const scope = searchParams.get("scope");
    const department = searchParams.get("department");
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let report: any = null;
    if (id) {
      report = await db.report.findUnique({ where: { id }, include: { user: true, reviewer: { select: { fullName: true } } } });
      if (!report) return fail("Report not found", 404);
      if (report.userId !== me.id && !isSupervisorLike(me)) return fail("Not authorized", 403);
    } else if (scope === "department" || scope === "consolidated") {
      if (!isSupervisorLike(me)) return fail("Supervisor access required", 403);
      // Consolidated: merge all reports for dept(s) into a single export document
      const where: Record<string, unknown> = { reportDate: { gte: dayStart, lte: dayEnd }, status: { in: ["SUBMITTED", "APPROVED"] }, type: { not: "SUPERVISOR" } };
      if (department && department !== "ALL") where.department = department;
      const reports = await db.report.findMany({ where, include: { user: true }, orderBy: { department: "asc" } });

      if (format === "docx") {
        const sections: { label: string; lines: string[] }[] = [];
        for (const r of reports) {
          const lines: string[] = [];
          lines.push(`Employee: ${r.user.fullName} (${r.ref}) · Status: ${r.status} · Source: ${r.sourceType === "UPLOAD_EXTRACTED" ? "Uploaded document" : "Manual entry"}`);
          if (r.type === "AGENT_BPO") {
            const metrics = safeParse<{ label: string; actual: number | null; target: number | null; unit: string }[]>(r.kpiMetrics, []);
            const called = metrics.filter((m) => m.actual !== null);
            lines.push(`KPIs reported: ${called.length ? called.map((m) => `${m.label}: ${m.actual}${m.unit === "percent" ? "%" : ""}`).join(" · ") : "none recorded"}`);
          } else {
            const ms = safeParse<Record<string, number>>(r.metricsSummary, {});
            const labels = r.type === "TECH" ? TECH_SUMMARY_METRICS : SOCIAL_SUMMARY_METRICS;
            const parts = labels.filter((l) => ms[l.key] !== undefined && ms[l.key] !== null).map((l) => `${l.label}: ${ms[l.key]}`);
            lines.push(`Metrics: ${parts.length ? parts.join(" · ") : "none recorded"}`);
          }
          if (r.challenges) lines.push(`Challenges: ${r.challenges}`);
          if (r.escalations) lines.push(`Escalations: ${r.escalations}`);
          if (r.additionalActivities) lines.push(`Additional activities: ${r.additionalActivities}`);
          sections.push({ label: `${r.department} — ${r.user.fullName}`, lines });
        }
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = await import("docx");
        const thin = { style: BorderStyle.SINGLE, size: 4, color: "D8D4F0" };
        const rows = [
          new TableRow({
            children: [new TableCell({
              columnSpan: 1,
              shading: { type: ShadingType.CLEAR, fill: "EDEAFB" },
              borders: { top: thin, bottom: thin, left: thin, right: thin },
              children: [new Paragraph({ children: [new TextRun({ text: `CONSOLIDATED MULTI-DEPARTMENT DAILY REPORT — ${date}`, bold: true, color: "6C5CE7", fontSize: 24 })] })],
            })],
          }),
          ...sections.flatMap((s) => [
            new TableRow({
              children: [new TableCell({
                borders: { top: thin, bottom: thin, left: thin, right: thin },
                shading: { type: ShadingType.CLEAR, fill: "F4F2FB" },
                children: [new Paragraph({ children: [new TextRun({ text: s.label, bold: true, fontSize: 21 })] })],
              })],
            }),
            new TableRow({
              children: [new TableCell({
                borders: { top: thin, bottom: thin, left: thin, right: thin },
                children: [new Paragraph({ children: [new TextRun({ text: s.lines.join("\n"), fontSize: 19 })] })],
              })],
            }),
          ]),
        ];
        const doc = new Document({ sections: [{ children: [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })] }] });
        const buf = Buffer.from(await Packer.toBuffer(doc));
        await audit({ userId: me.id, actorName: me.fullName, action: "EXPORT_REPORT", entity: "Report", details: `Consolidated ${department || "ALL"} ${date} docx` });
        return new Response(new Uint8Array(buf), {
          headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="Consolidated_Report_${date}.docx"` },
        });
      }
      return fail("Consolidated export supports docx format");
    }

    if (!report) return fail("Report id is required");

    if (format === "docx") {
      // Template-preserving generation first (fills a copy of the original
      // uploaded master document); falls back to the built-in builders.
      const { buffer: buf, filename, viaMaster } = await generateReportDocx(report);
      await audit({ userId: me.id, actorName: me.fullName, action: "EXPORT_REPORT", entity: "Report", entityId: report.id, details: `${report.ref} docx${viaMaster ? " (original master template)" : " (built-in builder)"}` });
      return new Response(new Uint8Array(buf), {
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${filename}"` },
      });
    }

    // XLSX / CSV exports
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
    } else if (report.type === "TEAM_LEAD") {
      sheetName = "Team Lead Report";
      try {
        const payload = JSON.parse(report.payload || "{}") as { sections?: Record<string, unknown> };
        const secs = payload.sections || {};
        const flat: Record<string, unknown>[] = [];
        for (const [id, raw] of Object.entries(secs)) {
          if (typeof raw === "string") flat.push({ Section: id.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), Entry: raw });
          else if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
            for (const [k, v] of Object.entries(raw as Record<string, unknown>)) flat.push({ Section: id.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), Entry: `${k}: ${String(v ?? "")}` });
          } else if (Array.isArray(raw)) {
            for (const row of raw as Record<string, unknown>[]) {
              const parts = Object.entries(row).filter(([, v]) => String(v ?? "").trim() !== "").map(([k, v]) => `${k}: ${String(v)}`);
              flat.push({ Section: id.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), Entry: parts.join(" | ") });
            }
          }
        }
        rows = flat;
      } catch { rows = []; }
    } else {
      sheetName = "Metrics";
      const ms = safeParse<Record<string, number>>(report.metricsSummary, {});
      const labels = report.type === "TECH" ? TECH_SUMMARY_METRICS : SOCIAL_SUMMARY_METRICS;
      rows = labels.map((l) => ({ Metric: l.label, Value: ms[l.key] ?? "" }));
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      await audit({ userId: me.id, actorName: me.fullName, action: "EXPORT_REPORT", entity: "Report", entityId: report.id, details: `${report.ref} csv` });
      return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${report.ref}.csv"` } });
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    await audit({ userId: me.id, actorName: me.fullName, action: "EXPORT_REPORT", entity: "Report", entityId: report.id, details: `${report.ref} xlsx` });
    return new Response(new Uint8Array(out), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${report.ref}.xlsx"` },
    });
  });
}
