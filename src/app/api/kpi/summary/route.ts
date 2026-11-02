import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSupervisorLike, TEAM_META } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import {
  periodRange, cumulativeKpiRows, teamPeriodTargets, teamDept,
  type KpiPeriod, type KpiRowDef, type RosterMember, type CumRow,
} from "@/lib/kpi-summary";
import { SOCIAL_TEMPLATE_KPIS, TECH_SUMMARY_METRICS, SOCIAL_SUMMARY_METRICS } from "@/lib/template-config";
import { resolveKpiCatalogue, kpiTargetMap, hasCentre } from "@/lib/kpi-resolve";
import { type KpiMetric } from "@/lib/kpi";

/**
 * GET /api/kpi/summary?period=day|week|month|year&date=YYYY-MM-DD[&country=NG&state=Lagos]
 *
 * Multi-period cumulative KPI aggregation:
 *  - day   → the single calendar date
 *  - week  → Monday–Sunday ISO week containing the date
 *  - month → calendar month containing the date
 *  - year  → calendar year containing the date
 *
 * Scoping:
 *  - ADMIN sees every centre; may narrow with country/state query params
 *    (the dashboard country + state selectors).
 *  - SUPERVISOR is always scoped to their own centre (their country+state) —
 *    they can only ever see the agents of their state.
 *  - Everyone else sees their own cumulative numbers.
 *
 * TEAM CUMULATIVE METHOD — every team is measured the same way:
 *  count target = Σ over the team's ACTIVE roster (APPROVED agents in scope) of
 *  each agent's effective daily target, counted on the report days that agent
 *  actually works (workDays mask). Example — Enugu outbound, 5 agents × 25/day
 *  ⇒ daily team target 125; the actuals of every agent are summed and compared
 *  against 125. Per-member overrides, centre overrides and global defaults feed
 *  the per-agent effective target in that order. Percent/minutes metrics are
 *  rates/averages and are never multiplied by headcount.
 *
 * Rows are grouped per division: call centre (outbound/inbound/email agents),
 * social media and web/technical — each group carries its own roster-scaled
 * targets, actuals summed across the group's reports.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "day") as KpiPeriod;
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const { start, end, label, periodDays } = periodRange(period, date);
    const supervisor = isSupervisorLike(me);

    const where: Record<string, unknown> = {
      reportDate: { gte: start, lte: end },
      status: { in: ["SUBMITTED", "APPROVED"] },
    };

    if (supervisor) {
      where.type = { not: "SUPERVISOR" };
      if (me.role === "SUPERVISOR") {
        // Centre scoping — a state supervisor only sees their own state's agents.
        if (me.country && me.state) {
          where.user = { country: me.country, state: me.state };
        }
      } else {
        // Admin country/state drill-down from the dashboard selectors.
        const country = searchParams.get("country");
        const state = searchParams.get("state");
        if (country || state) {
          where.user = {
            ...(country ? { country } : {}),
            ...(state ? { state } : {}),
          };
        }
      }
    } else {
      where.userId = me.id;
    }

    const reports = await db.report.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, role: true, department: true, team: true, employeeId: true, country: true, state: true } } },
      orderBy: { reportDate: "asc" },
    });

    const distinctDates = new Set(reports.map((r) => new Date(r.reportDate).toISOString().slice(0, 10))).size;
    const callReports = reports.filter((r) => r.type === "AGENT_BPO");
    const socialReports = reports.filter((r) => r.type === "SOCIAL");
    const techReports = reports.filter((r) => r.type === "TECH");

    const sumMetricsSummary = (list: typeof techReports) => {
      const out: Record<string, number> = {};
      for (const r of list) {
        const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
        for (const [k, v] of Object.entries(ms)) if (typeof v === "number") out[k] = (out[k] || 0) + v;
      }
      return out;
    };

    const techTotals = sumMetricsSummary(techReports);
    const socialTotals = sumMetricsSummary(socialReports);

    // ── KPI catalogue (centre-aware) grouped into per-department row defs ──
    const centre =
      me.role === "SUPERVISOR" && hasCentre(me)
        ? { country: me.country, state: me.state }
        : me.role === "ADMIN" && searchParams.get("country") && searchParams.get("state")
          ? { country: searchParams.get("country"), state: searchParams.get("state") }
          : !isSupervisorLike(me) && hasCentre(me)
            ? { country: me.country, state: me.state }
            : null; // admins without drill-down see the global defaults
    const catalogue = await resolveKpiCatalogue(centre);
    const activeCatalogue = catalogue.filter((c) => c.active);
    const deptRows = new Map<string, KpiRowDef[]>();
    for (const c of activeCatalogue) {
      const arr = deptRows.get(c.department) ?? [];
      arr.push({ key: c.key, label: c.label, unit: (c.unit === "percent" || c.unit === "minutes" ? c.unit : "count") as KpiRowDef["unit"], category: "DEPT_CATALOGUE", target: c.defaultTarget, sortOrder: c.sortOrder });
      deptRows.set(c.department, arr);
    }
    for (const arr of deptRows.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);

    // ── Roster: the ACTIVE agents behind the team targets ──
    // Supervisors/admins: every approved agent in scope (centre / drill-down /
    // global). Staff: just themselves (headcount 1 — their own target).
    let roster: { id: string; team: string | null; workDays: string | null }[] = [];
    if (supervisor) {
      const rosterWhere: Record<string, unknown> = {
        status: "APPROVED",
        role: { in: ["AGENT_BPO", "SOCIAL_MEDIA", "DEVELOPER"] },
      };
      if (me.role === "SUPERVISOR" && me.country && me.state) {
        rosterWhere.country = me.country;
        rosterWhere.state = me.state;
      } else if (me.role === "ADMIN") {
        const country = searchParams.get("country");
        const state = searchParams.get("state");
        if (country) rosterWhere.country = country;
        if (state) rosterWhere.state = state;
      }
      roster = await db.user.findMany({ where: rosterWhere, select: { id: true, team: true, workDays: true } });
    } else {
      const self = await db.user.findUnique({ where: { id: me.id }, select: { id: true, team: true, workDays: true } });
      if (self) roster = [self];
    }

    // Approved per-member target overrides (they beat the department catalogue).
    const overrideMap = new Map<string, Map<string, number>>();
    if (roster.length) {
      const memberCfg = await db.memberKpiConfig.findMany({
        where: { userId: { in: roster.map((m) => m.id) }, status: "APPROVED", target: { not: null } },
        select: { userId: true, department: true, key: true, target: true },
      });
      for (const cfg of memberCfg) {
        const member = roster.find((m) => m.id === cfg.userId);
        if (!member || cfg.department !== teamDept(member.team) || cfg.target === null) continue;
        const m = overrideMap.get(cfg.userId) ?? new Map<string, number>();
        m.set(cfg.key, cfg.target);
        overrideMap.set(cfg.userId, m);
      }
    }
    const members: RosterMember[] = roster.map((m) => ({ id: m.id, team: m.team, workDays: m.workDays, overrides: overrideMap.get(m.id) }));

    // Roster transparency for the dashboard meta line.
    const teamCounts = Object.values(
      members.reduce<Record<string, { team: string; label: string; count: number }>>((acc, m) => {
        const t = m.team ?? "UNASSIGNED";
        acc[t] ??= { team: t, label: TEAM_META[t]?.label ?? (t === "UNASSIGNED" ? "Unassigned" : t), count: 0 };
        acc[t].count += 1;
        return acc;
      }, {}),
    ).sort((a, b) => a.label.localeCompare(b.label));

    const datesOf = (rs: { reportDate: Date }[]) =>
      [...new Set(rs.map((r) => new Date(r.reportDate).toISOString().slice(0, 10)))];

    const tagRows = (rows: CumRow[], group: string, groupLabel: string) =>
      rows.map((r) => ({ ...r, group, groupLabel }));

    const rows: CumRow[] = [];

    // ── Call centre group (outbound / inbound / email agents) ──
    if (callReports.length) {
      const callDates = datesOf(callReports);
      const dominantDept = callReports[0]?.department === "INBOUND" ? "INBOUND" : "BPO";
      const targets = kpiTargetMap(activeCatalogue, [dominantDept, "BPO", "INBOUND"]);
      const callMembers = members.filter((m) => (m.team ?? "BPO") !== "SOCIAL" && (m.team ?? "WEB_DEV") !== "TECH");
      const periodTargets = teamPeriodTargets(callMembers, deptRows, callDates);
      rows.push(...tagRows(
        cumulativeKpiRows(callReports.map((r) => r.kpiMetrics), callDates.length, targets, undefined, periodTargets),
        "call",
        "Call Centre — Outbound · Inbound · Email",
      ));
    }

    // ── Social media group ──
    if (socialReports.length) {
      const socialDates = datesOf(socialReports);
      const socialDefs =
        deptRows.get("SOCIAL_MEDIA") ??
        SOCIAL_TEMPLATE_KPIS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, category: "SOCIAL_TEMPLATE", target: null, sortOrder: i }));
      const targets = kpiTargetMap(activeCatalogue, ["SOCIAL_MEDIA"]);
      const socialMembers = members.filter((m) => m.team === "SOCIAL");
      const periodTargets = teamPeriodTargets(socialMembers, deptRows, socialDates);
      rows.push(...tagRows(
        cumulativeKpiRows(socialReports.map((r) => r.kpiMetrics), socialDates.length, targets, socialDefs, periodTargets),
        "social",
        "Social Media & Campaign",
      ));
    }

    // ── Web & technical group ──
    if (techReports.length) {
      const techDates = datesOf(techReports);
      const techDefs =
        deptRows.get("WEB_DEV") ??
        TECH_SUMMARY_METRICS.map((m, i) => ({ key: m.key, label: m.label, unit: "count" as const, category: "TECH_TEMPLATE", target: null, sortOrder: i }));
      const targets = kpiTargetMap(activeCatalogue, ["WEB_DEV"]);
      const techMembers = members.filter((m) => m.team === "TECH");
      const periodTargets = teamPeriodTargets(techMembers, deptRows, techDates);
      // TECH reports carry template kpiMetrics and/or a metricsSummary roll-up —
      // merge both into one blob per report (units from the department rows).
      const blobs = techReports.map((r) => {
        const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []).filter((m) => m?.key);
        const seen = new Set(metrics.map((m) => m.key));
        const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
        for (const [k, v] of Object.entries(ms)) {
          if (typeof v !== "number" || Number.isNaN(v) || seen.has(k)) continue;
          const def = techDefs.find((d) => d.key === k);
          metrics.push({
            key: k, label: def?.label ?? k, target: null, targetLabel: "-", actual: v, variance: null,
            unit: (def?.unit as KpiMetric["unit"]) ?? "count", category: "TECH_SUMMARY", auto: false, notes: "",
          });
        }
        return JSON.stringify(metrics);
      });
      rows.push(...tagRows(
        cumulativeKpiRows(blobs, techDates.length, targets, techDefs, periodTargets).filter((r) => r.actual !== null || r.target !== null),
        "tech",
        "Web & Technical",
      ));
    }

    // Supervisor per-employee breakdown
    const byEmployee = supervisor
      ? Object.values(
          reports.reduce<Record<string, { userId: string; userName: string; department: string; location: string; reports: number; callsMade: number; callsConnected: number; mailsSent: number; leads: number; tasksCompleted: number; postsPublished: number }>>((acc, r) => {
            const e = (acc[r.userId] ??= {
              userId: r.userId,
              userName: r.user.fullName,
              department: r.department,
              location: [r.user.state, r.user.country].filter(Boolean).join(", "),
              reports: 0,
              callsMade: 0,
              callsConnected: 0,
              mailsSent: 0,
              leads: 0,
              tasksCompleted: 0,
              postsPublished: 0,
            });
            e.reports += 1;
            const ms = safeParse<Record<string, number | null>>(r.metricsSummary, {});
            if (r.type === "AGENT_BPO") {
              const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []);
              for (const m of metrics) {
                if (m.actual === null) continue;
                if (m.key === "totalCallsMade") e.callsMade += m.actual;
                if (m.key === "callsConnected") e.callsConnected += m.actual;
                if (m.key === "totalMailsSent") e.mailsSent += m.actual;
                if (m.key === "hotLeads" || m.key === "warmLeads") e.leads += m.actual;
              }
            }
            if (typeof ms.tasksCompleted === "number") e.tasksCompleted += ms.tasksCompleted;
            if (typeof ms.postsPublished === "number") e.postsPublished += ms.postsPublished;
            return acc;
          }, {}),
        ).sort((a, b) => a.department.localeCompare(b.department) || b.reports - a.reports)
      : [];

    return ok({
      period,
      label,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      periodDays,
      reportCount: reports.length,
      distinctDates,
      teamCounts,
      rows,
      techTotals,
      socialTotals,
      byEmployee,
      techLabels: TECH_SUMMARY_METRICS,
      socialLabels: SOCIAL_SUMMARY_METRICS,
    });
  });
}
