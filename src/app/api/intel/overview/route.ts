import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, TEAM_META } from "@/lib/auth";
import { handle, ok, safeParse } from "@/lib/api-utils";
import { type KpiMetric } from "@/lib/kpi";
import { worksOn } from "@/lib/schedule";
import { teamDept } from "@/lib/kpi-summary";
import { resolveKpiCatalogue, type ResolvedKpiConfig } from "@/lib/kpi-resolve";
import {
  resolveIntelPeriod, parseScope, loadUsers, loadReports, loadTasks, loadLogins, loadActivityEvents,
  previousPeriod, iso, type IntelPeriod,
} from "@/lib/intel/data";
import { agentCore, rankable, type AgentCore } from "@/lib/intel/analyze";
import { loadMemberOverrides, userKpiAnalysis } from "@/lib/intel/kpi-analysis";
import { loadScoringWeights } from "@/lib/intel/scoring";

export const runtime = "nodejs";
const MS_DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/intel/overview — the Operational Intelligence & Performance Reports
 * dashboard statistics (ADMIN only). Every figure is computed from application
 * records within the selected filters; missing data stays null.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const period = resolveIntelPeriod(searchParams);
    const scope = parseScope(searchParams);
    const prev = previousPeriod(period);

    const [users, catalogue, overridesAll, weights] = await Promise.all([
      loadUsers(scope, true),
      resolveKpiCatalogue(scope.country && scope.state ? { country: scope.country, state: scope.state } : null),
      loadMemberOverrides([]),
      loadScoringWeights(),
    ]);
    const agentUsers = users.filter((u) => ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA", "TEAM_LEAD"].includes(u.role));
    const agents = agentUsers.filter((u) => u.role !== "TEAM_LEAD");
    const leads = agentUsers.filter((u) => u.role === "TEAM_LEAD");
    const supervisors = users.filter((u) => u.role === "SUPERVISOR");
    const ids = agentUsers.map((u) => u.id);

    const [reports, prevReports, tasks, logins, events] = await Promise.all([
      loadReports(ids, period),
      loadReports(ids, prev),
      loadTasks(ids, period),
      loadLogins(ids, period),
      loadActivityEvents(ids, period),
    ]);

    const reportsByUser = new Map<string, typeof reports>();
    for (const r of reports) { const a = reportsByUser.get(r.userId) ?? []; a.push(r); reportsByUser.set(r.userId, a); }
    const prevReportsByUser = new Map<string, typeof prevReports>();
    for (const r of prevReports) { const a = prevReportsByUser.get(r.userId) ?? []; a.push(r); prevReportsByUser.set(r.userId, a); }
    const loginsByUser = new Map<string, typeof logins>();
    for (const l of logins) { const a = loginsByUser.get(l.userId) ?? []; a.push(l); loginsByUser.set(l.userId, a); }
    const eventsByUser = new Map<string, typeof events>();
    for (const e of events) { const a = eventsByUser.get(e.userId) ?? []; a.push(e); eventsByUser.set(e.userId, a); }

    const cores: AgentCore[] = [];
    for (const u of agents) {
      cores.push(await agentCore(u, period, {
        reports: reportsByUser.get(u.id) ?? [],
        tasks,
        escalations: [],
        logins: loginsByUser.get(u.id) ?? [],
        events: eventsByUser.get(u.id) ?? [],
        catalogue,
        overrides: overridesAll.get(u.id),
        weights,
      }));
    }
    // prev-period KPI means for improving/declining classification
    const prevMeans = new Map<string, number | null>();
    for (const u of agents) {
      const pr = prevReportsByUser.get(u.id) ?? [];
      if (!pr.length) { prevMeans.set(u.id, null); continue; }
      const res = await userKpiAnalysis(u, pr, catalogue, overridesAll.get(u.id) ? { map: overridesAll.get(u.id) as Map<string, number> } : undefined, prev);
      prevMeans.set(u.id, res.meanAchPct);
    }

    const tasksStats = (await import("@/lib/intel/data")).taskStats(tasks, period);
    const submitted = reports.filter((r) => ["SUBMITTED", "APPROVED"].includes(r.status));
    const activeCores = cores; // loadUsers scope already status-filtered when accountStatus set
    const meeting = cores.filter((c) => c.kpi.meanAchPct !== null && c.kpi.meanAchPct >= 80);
    const below = cores.filter((c) => c.kpi.meanAchPct !== null && c.kpi.meanAchPct < 80);
    const improving = cores.filter((c) => c.kpi.meanAchPct !== null && (prevMeans.get(c.user.id) ?? null) !== null && (c.kpi.meanAchPct as number) - (prevMeans.get(c.user.id) as number) > 5);
    const declining = cores.filter((c) => c.kpi.meanAchPct !== null && (prevMeans.get(c.user.id) ?? null) !== null && (c.kpi.meanAchPct as number) - (prevMeans.get(c.user.id) as number) < -5);
    const overallKpi = (() => {
      const vals = cores.map((c) => c.kpi.meanAchPct).filter((v): v is number => v !== null);
      return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    })();
    const avgTeamPerf = (() => {
      const rank = cores.filter((c) => rankable(c.score));
      return rank.length ? round2(rank.reduce((s, c) => s + (c.score.score as number), 0) / rank.length) : null;
    })();
    const agentCompletionRate = (() => {
      const vals = cores.map((c) => c.tasks.completionRatePct).filter((v): v is number => v !== null);
      return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    })();
    const appActivity = {
      totalLogins: logins.length,
      agentsWithMeaningfulActivity: cores.filter((c) => c.activity.meaningfulWorkDays > 0).length,
      meaningfulEvents: events.filter((e) => e.eventType !== "LOGIN").length,
      totalActiveDays: cores.reduce((s, c) => s + c.activity.activeDays, 0),
    };

    // Team comparison (mean KPI achievement + mean score per team)
    const teamKeys = [...new Set(agents.map((a) => a.team).filter((t): t is string => !!t))];
    const teamComparison = teamKeys.map((t) => {
      const tc = cores.filter((c) => c.user.team === t);
      const ach = tc.map((c) => c.kpi.meanAchPct).filter((v): v is number => v !== null);
      const sc = tc.filter((c) => rankable(c.score));
      return {
        team: t,
        label: TEAM_META[t]?.label ?? t,
        agents: tc.length,
        meanKpiAchPct: ach.length ? round2(ach.reduce((s, v) => s + v, 0) / ach.length) : null,
        meanScore: sc.length ? round2(sc.reduce((s, c) => s + (c.score.score as number), 0) / sc.length) : null,
        overdue: tc.reduce((s, c) => s + c.tasks.overdue, 0),
        compliancePct: (() => {
          const sched = tc.reduce((s, c) => s + c.scheduledDays, 0);
          const sub = tc.reduce((s, c) => s + new Set(c.submittedDates).size, 0);
          return sched > 0 ? round2((sub / sched) * 100) : null;
        })(),
      };
    }).sort((a, b) => (b.meanKpiAchPct ?? -1) - (a.meanKpiAchPct ?? -1));

    // 12-week trend: submissions + roster-method KPI achievement per week
    const start = new Date(period.from + "T00:00:00.000Z").getTime();
    const end = new Date(period.to + "T00:00:00.000Z").getTime();
    const weeks = Math.min(26, Math.max(1, Math.ceil((end - start + MS_DAY) / (7 * MS_DAY))));
    const deptRowsByDept = new Map<string, ResolvedKpiConfig[]>();
    for (const c of catalogue.filter((x) => x.active)) {
      const arr = deptRowsByDept.get(c.department) ?? [];
      arr.push(c);
      deptRowsByDept.set(c.department, arr);
    }
    const trend = [] as { label: string; from: string; submitted: number; kpiPct: number | null; tasksCompleted: number }[];
    for (let w = 0; w < weeks; w++) {
      const wStart = start + w * 7 * MS_DAY;
      const wEnd = Math.min(end, wStart + 7 * MS_DAY - 1);
      const inBucket = (t: number) => t >= wStart && t <= wEnd;
      const weekReports = submitted.filter((r) => inBucket(new Date(r.reportDate).getTime()));
      const dates = [...new Set(weekReports.map((r) => iso(new Date(r.reportDate))))];
      // roster targets × actuals over count KPIs with configured targets
      let targetSum = 0;
      let actualSum = 0;
      for (const u of agents) {
        if (!["AGENT_BPO", "SOCIAL_MEDIA", "DEVELOPER"].includes(u.role)) continue;
        const dept = teamDept(u.team);
        const rows = (deptRowsByDept.get(dept) ?? []).filter((r) => r.unit === "count" && r.defaultTarget !== null);
        if (!rows.length) continue;
        const overrides = overridesAll.get(u.id);
        for (const dateStr of dates) {
          if (!worksOn(u.workDays, dateStr)) continue;
          for (const row of rows) {
            const eff = overrides?.get(row.key) ?? row.defaultTarget;
            if (eff === null || eff === undefined) continue;
            targetSum += eff;
          }
        }
        const userWeekReports = weekReports.filter((r) => r.userId === u.id);
        for (const r of userWeekReports) {
          const metrics = safeParse<KpiMetric[]>(r.kpiMetrics, []);
          for (const m of metrics) {
            if (m.actual === null || m.unit !== "count") continue;
            const row = rows.find((x) => x.key === m.key);
            if (!row) continue;
            actualSum += m.actual;
          }
        }
      }
      const tasksDone = events.filter((e) => e.eventType === "TASK_COMPLETED" && inBucket(new Date(e.createdAt).getTime())).length;
      trend.push({
        label: iso(new Date(wStart)).slice(5),
        from: iso(new Date(wStart)),
        submitted: weekReports.length,
        kpiPct: targetSum > 0 ? round2((actualSum / targetSum) * 100) : null,
        tasksCompleted: tasksDone,
      });
    }

    // agentsActive counts AGENTS only — team leads are personnel of their own
    // kind and are reported separately (stats.teamLeads), never as agents.
    const registeredTotal = await db.user.count({ where: { role: { in: ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"] }, ...(scope.country ? { country: scope.country } : {}), ...(scope.state ? { state: scope.state } : {}), ...(scope.team ? { team: scope.team } : {}) } });
    const activeTotal = await db.user.count({ where: { status: "APPROVED", role: { in: ["AGENT_BPO", "DEVELOPER", "SOCIAL_MEDIA"] }, ...(scope.country ? { country: scope.country } : {}), ...(scope.state ? { state: scope.state } : {}), ...(scope.team ? { team: scope.team } : {}) } });

    return ok({
      period,
      filters: scope,
      stats: {
        agentsRegistered: registeredTotal,
        agentsActive: activeTotal,
        agentsInactive: registeredTotal - activeTotal,
        supervisors: supervisors.length,
        teamLeads: leads.length,
        teams: teamKeys.length,
        tasksAssigned: tasksStats.assigned,
        tasksCompleted: tasksStats.completed,
        tasksPending: tasksStats.pending,
        tasksOverdue: tasksStats.overdue,
        overallKpiAchPct: overallKpi,
        avgTeamPerformance: avgTeamPerf,
        agentCompletionRatePct: agentCompletionRate,
        appActivity,
        agentsMeetingTargets: meeting.length,
        agentsBelowTargets: below.length,
        agentsDeclining: declining.length,
        agentsImproving: improving.length,
        agentsWithData: cores.filter((c) => c.kpi.meanAchPct !== null).length,
      },
      teamComparison,
      trend,
      scoringWeights: weights,
      roster: teamKeys.map((t) => ({ team: t, label: TEAM_META[t]?.label ?? t, agents: agents.filter((a) => a.team === t).length })),
      topAgents: [...cores].filter((c) => rankable(c.score)).sort((a, b) => (b.score.score as number) - (a.score.score as number)).slice(0, 8).map((c) => ({ id: c.user.id, name: c.user.fullName, team: c.teamLabel, score: c.score.score, classification: c.score.classification, kpiPct: c.kpi.meanAchPct })),
      attentionAgents: [...cores].filter((c) => c.kpi.meanAchPct !== null && (c.kpi.meanAchPct < 80 || c.tasks.overdue > 0)).sort((a, b) => (a.kpi.meanAchPct as number) - (b.kpi.meanAchPct as number)).slice(0, 8).map((c) => ({ id: c.user.id, name: c.user.fullName, team: c.teamLabel, kpiPct: c.kpi.meanAchPct, overdue: c.tasks.overdue, classification: c.score.classification })),
    });
  });
}

export type IntelOverview = {
  period: IntelPeriod;
};
