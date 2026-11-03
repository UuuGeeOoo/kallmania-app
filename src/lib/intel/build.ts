import { NextRequest } from "next/server";
import { resolveIntelPeriod, parseScope } from "./data";
import { buildAgentReport } from "./agent";
import { buildTeamReport } from "./team";
import { buildCentreReport } from "./centre";

/** Shared report dispatch for the report + export routes. */
export async function buildReportFromParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "centre";
  const period = resolveIntelPeriod(searchParams);
  if (type === "agent") {
    const agentId = searchParams.get("agentId");
    if (!agentId) return { error: "agentId is required for an individual report" as const };
    return { type: "agent" as const, period, report: await buildAgentReport(agentId, period) };
  }
  if (type === "team") {
    const report = await buildTeamReport({
      team: parseScope(searchParams).team,
      teamLeadId: searchParams.get("teamLeadId"),
      country: searchParams.get("country"),
      state: searchParams.get("state"),
      period,
    });
    return { type: "team" as const, period, report };
  }
  const report = await buildCentreReport({ country: searchParams.get("country"), state: searchParams.get("state"), period });
  return { type: "centre" as const, period, report };
}

export function reportFileName(type: string, report: unknown): string {
  const ts = new Date().toISOString().slice(0, 10);
  if (type === "agent") {
    const p = (report as { profile?: { fullName?: string } }).profile;
    return `Agent_Report_${(p?.fullName ?? "agent").replace(/[^a-z0-9]+/gi, "_")}_${ts}.xlsx`;
  }
  if (type === "team") {
    const t = (report as { team?: { label?: string } }).team;
    return `Team_Report_${(t?.label ?? "team").replace(/[^a-z0-9]+/gi, "_")}_${ts}.xlsx`;
  }
  const c = (report as { centre?: { label?: string } }).centre;
  return `Centre_Report_${(c?.label ?? "centre").replace(/[^a-z0-9]+/gi, "_")}_${ts}.xlsx`;
}
