"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLASSIFICATION_LABELS, KPI_STATUS_LABELS } from "@/lib/intel/labels";

// ─────────────────────────────────────────────────────────────────────────────
// Report preview renderers — one section per brief requirement (A–H individual,
// A–G team, A–F centre). All figures come from the API payload (already
// computed server-side from application records).
// ─────────────────────────────────────────────────────────────────────────────

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="k-card p-4 sm:p-5">
      <h3 className="text-sm font-bold text-slate-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-lg font-bold leading-tight", tone === "good" && "text-emerald-400", tone === "warn" && "text-amber-400", tone === "bad" && "text-rose-400", !tone && "text-slate-100")}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

const statusTone = (status: string) =>
  status === "EXCEEDED" || status === "MET" ? "good" : status === "APPROACHING" ? "warn" : status === "BELOW" || status === "CRITICAL" ? "bad" : "muted";

export function KpiTable({ rows }: { rows: { label: string; unit: string; target: number | null; actual: number | null; achievementPct: number | null; status: string; variance?: number | null; notes?: string | null; trend?: string | null; trendDeltaPct?: number | null }[] }) {
  if (!rows.length) return <p className="text-xs italic text-slate-500">No KPI rows with data or targets in the period.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-semibold">KPI</th>
            <th className="px-3 py-2 font-semibold">Target</th>
            <th className="px-3 py-2 font-semibold">Actual</th>
            <th className="px-3 py-2 font-semibold">Achievement</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tone = statusTone(r.status);
            return (
              <tr key={i} className="border-b border-white/[0.04] last:border-0">
                <td className="px-3 py-2 font-medium text-slate-200">
                  {r.label}
                  {r.unit !== "count" && <span className="ml-1 text-[10px] text-slate-500">({r.unit === "percent" ? "%" : "mins"})</span>}
                  {r.notes && <p className="text-[10px] italic text-slate-500">{r.notes}</p>}
                </td>
                <td className="px-3 py-2 text-slate-300">{r.target ?? "—"}</td>
                <td className="px-3 py-2 text-slate-300">{r.actual ?? "—"}</td>
                <td className={cn("px-3 py-2 font-bold", tone === "good" && "text-emerald-400", tone === "warn" && "text-amber-400", tone === "bad" && "text-rose-400", tone === "muted" && "text-slate-500")}>
                  {r.achievementPct !== null ? `${r.achievementPct}%` : "Insufficient data"}
                </td>
                <td className="px-3 py-2 text-slate-400">{KPI_STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="px-3 py-2 text-slate-400">
                  {r.trend && r.trend !== "no_history" ? (
                    <span className={cn(r.trend === "improving" && "text-emerald-400", r.trend === "declining" && "text-rose-400", (r.trend === "stable" || r.trend === "new") && "text-slate-400")}>
                      {r.trend}{r.trendDeltaPct !== null && r.trendDeltaPct !== undefined ? ` (${r.trendDeltaPct > 0 ? "+" : ""}${r.trendDeltaPct} pts)` : ""}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Findings({ items, emptyLabel }: { items: { title: string; evidence: string }[]; emptyLabel: string }) {
  if (!items.length) return <p className="text-xs italic text-slate-500">{emptyLabel}</p>;
  return (
    <ul className="space-y-2">
      {items.map((f, i) => (
        <li key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <p className="text-xs font-semibold text-slate-200">{f.title}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{f.evidence}</p>
        </li>
      ))}
    </ul>
  );
}

export function CommentaryBlock({ c }: { c: { source: string; engineNote?: string; summary: string; strengths: string[]; weaknesses: string[]; risks: string[]; recommendations: string[] } }) {
  const label = c.source === "gemini" ? "AI interpretation — Google Gemini" : c.source === "rule-based" ? "Rule-based assessment (application engine)" : "Unavailable";
  const List = ({ title, arr }: { title: string; arr: string[] }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {arr.length ? (
        <ul className="mt-1 space-y-1">
          {arr.map((s, i) => (
            <li key={i} className="text-[11px] leading-relaxed text-slate-300">• {s}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] italic text-slate-500">—</p>
      )}
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-[#e8935a]/40 text-[#eda06a]">{label}</Badge>
        <span className="text-[10px] text-slate-500">Interpretations & recommendations — clearly separate from the objective measurements above.</span>
      </div>
      {c.engineNote && <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">{c.engineNote}</p>}
      <p className="text-xs leading-relaxed text-slate-300">{c.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <List title="Strengths" arr={c.strengths} />
        <List title="Weaknesses" arr={c.weaknesses} />
        <List title="Risks" arr={c.risks} />
        <List title="Recommendations" arr={c.recommendations} />
      </div>
    </div>
  );
}

export function ScorePanel({ score, components, includedWeights, classification, coverageNote }: { score: number | null; components: { key: string; label: string; weight: number; earned: number | null; included: boolean; basis: string }[]; includedWeights: number; classification: string; coverageNote?: string | null }) {
  const tone = score === null ? "muted" : score >= 75 ? "good" : score >= 60 ? "warn" : "bad";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Overall score</p>
          <p className={cn("text-2xl font-black", tone === "good" && "text-emerald-400", tone === "warn" && "text-amber-400", tone === "bad" && "text-rose-400", tone === "muted" && "text-slate-500")}>{score ?? "N/A"}</p>
          <p className="text-[10px] text-slate-500">from {includedWeights} of 100 weight points</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Classification</p>
          <p className="text-lg font-bold text-slate-100">{CLASSIFICATION_LABELS[classification] ?? classification}</p>
        </div>
      </div>
      {coverageNote && <p className="text-[11px] italic text-amber-300/90">{coverageNote}</p>}
      <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-semibold">Component</th>
              <th className="px-3 py-2 font-semibold">Weight</th>
              <th className="px-3 py-2 font-semibold">Earned</th>
              <th className="px-3 py-2 font-semibold">Basis</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.key} className="border-b border-white/[0.04] last:border-0">
                <td className="px-3 py-2 font-medium text-slate-200">{c.label}</td>
                <td className="px-3 py-2 text-slate-300">{c.weight}</td>
                <td className={cn("px-3 py-2 font-semibold", c.earned === null ? "italic text-slate-500" : "text-slate-100")}>{c.earned ?? "Excluded (no data)"}</td>
                <td className="px-3 py-2 text-[11px] text-slate-400">{c.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataNotes({ notes }: { notes: { metric: string; note: string }[] }) {
  return (
    <ul className="space-y-1.5">
      {notes.map((n, i) => (
        <li key={i} className="text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">{n.metric}:</span> <span className="italic">{n.note}</span>
        </li>
      ))}
    </ul>
  );
}

function Kv({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-2 border-b border-white/[0.04] pb-1">
          <span className="text-[11px] font-medium text-slate-500">{k}</span>
          <span className="text-right text-[11px] font-semibold text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  );
}

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

// ── Individual agent report ──
type AgentReport = {
  profile: Record<string, string | number | null>;
  kpi: { rows: Record<string, unknown>[]; summary: { meanAchPct: number | null; exceeded: number; met: number; approaching: number; below: number; critical: number; insufficient: number }; submittedDates?: string[] };
  cumulativeKpi?: { kpis: { kpiKey: string; label: string; unit: string; dailyTarget: number | null; cumulativeTarget: number | null; cumulativeActual: number | null; cumulativeVariance: number | null; achievementPct: number | null; status: string; days: { reported: number; met: number; exceeded: number; missed: number; noData: number }; evidence: string[] }[]; weekly: { kpiKey: string; label: string; cumulativeTarget: number | null; cumulativeActual: number | null }[]; reporting: { expectedDays: number; reportedDays: number; missingDates: string[]; missingCount: number; consistencyPct: number | null; incompleteExtractionDays: number; supersededSameDay: number; note: string }; overall: { achievementPct: number | null; basis: string; cumulativeTarget: number | null; cumulativeActual: number | null } };
  techTaskProfile?: { assignedDeliverables: number; completedDeliverables: number; outstandingDeliverables: number; overdueDeliverables: number; completionRatePct: number | null; onTimeCompletionRatePct: number | null; tasksCompletedBeyondExpectation: number; carriedIn: number; blocked: number; bugsReported: number; bugsResolved: number; outstandingWork: { label: string; kind: string; detail: string }[]; notes: string[]; basis: Record<string, string> } | null;
  workCompleted?: { task: string; project: string | null; dates: string[]; deliverables: string[]; timesCompleted: number; reportRefs: string[] }[];
  bestWeakest: { strongest: { label: string; why: string } | null; weakest: { label: string; why: string } | null; largestNegativeVariance: { label: string; variance: number } | null; greatestImprovement: { label: string; deltaPct: number } | null; greatestDecline: { label: string; deltaPct: number } | null; mostConsistent: { label: string; why: string } | null; requiringAttention: { label: string; status: string }[] };
  activity: Record<string, unknown> & { activityTrend: { label: string; submitted: number | null; tasksCompleted: number | null }[] };
  tasks: Record<string, number | null> & { prev: { assigned: number; completed: number; overdue: number } };
  attendance: Record<string, unknown>;
  strengths: { title: string; evidence: string }[];
  weaknesses: { title: string; evidence: string }[];
  risks: { title: string; evidence: string }[];
  assessment: { score: number | null; scoreComponents: never[]; includedWeights: number; classification: string; coverageNote: string | null; commentary: { source: string; engineNote?: string; summary: string; strengths: string[]; weaknesses: string[]; risks: string[]; recommendations: string[] } };
  dataNotes: { metric: string; note: string }[];
};

export function AgentReportView({ r }: { r: AgentReport }) {
  const p = r.profile;
  const act = r.activity;
  const t = r.tasks;
  const at = r.attendance;
  return (
    <div className="space-y-4">
      <Section title="A. Agent Profile & Employment Information" subtitle="Use existing application records — nothing is invented.">
        <Kv rows={[
          ["Full name", String(p.fullName)], ["Email", String(p.email)], ["Employee ID", (p.employeeId as string) ?? "—"],
          ["Role / position", String(p.roleLabel)], ["Team", (p.teamLabel as string) ?? "—"], ["Centre", String(p.centre)],
          ["Account status", String(p.accountStatus)], ["Employment", String(p.employmentType)], ["Shift", String(p.shift)],
          ["Work days", String(p.workDays)], ["Date joined", String(p.dateJoined)], ["Days with recorded activity", String(p.daysWithRecordedActivity)],
          ["Reporting period", String(p.reportingPeriod)],
        ]} />
      </Section>

      <Section title="B. KPI Performance Analysis" subtitle={`Mean achievement ${r.kpi.summary.meanAchPct !== null ? `${r.kpi.summary.meanAchPct}%` : "insufficient data"} — exceeded ${r.kpi.summary.exceeded} · met ${r.kpi.summary.met} · approaching ${r.kpi.summary.approaching} · below ${r.kpi.summary.below} · critical ${r.kpi.summary.critical}`}>
        <KpiTable rows={r.kpi.rows as never} />
      </Section>

      {r.cumulativeKpi && (
        <Section
          title="B2. Cumulative KPI Records (report-based engine)"
          subtitle="Σ actuals ÷ Σ targets per KPI from filed reports and parsed scoreboard rows — never an average of daily percentages; days without a report are flagged MISSING, never zeroed."
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Overall achievement" value={r.cumulativeKpi.overall.achievementPct !== null ? `${r.cumulativeKpi.overall.achievementPct}%` : "n/a"} hint={`Σ${r.cumulativeKpi.overall.cumulativeActual ?? 0} / Σ${r.cumulativeKpi.overall.cumulativeTarget ?? 0}`} />
            <Stat label="Reporting days" value={`${r.cumulativeKpi.reporting.reportedDays}/${r.cumulativeKpi.reporting.expectedDays}`} hint={r.cumulativeKpi.reporting.consistencyPct !== null ? `${r.cumulativeKpi.reporting.consistencyPct}% consistency` : "no expected days"} />
            <Stat label="Missing reports" value={String(r.cumulativeKpi.reporting.missingCount)} hint={r.cumulativeKpi.reporting.missingDates.length ? r.cumulativeKpi.reporting.missingDates.slice(0, 3).join(", ") : "none in period"} />
            <Stat label="Incomplete extractions" value={String(r.cumulativeKpi.reporting.incompleteExtractionDays)} hint="values the source report never stated" />
          </div>
          <div className="mt-3 space-y-1.5">
            {r.cumulativeKpi.kpis.map((k) => (
              <div key={k.kpiKey} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-200">{k.label}</span>
                  <span className="tabular-nums text-slate-300">
                    {k.cumulativeActual ?? "—"} <span className="text-slate-500">/ Σ{k.cumulativeTarget ?? "no target"}</span>
                    {k.cumulativeVariance !== null && <span className={cn("ml-1 font-semibold", k.cumulativeVariance >= 0 ? "text-emerald-400" : "text-rose-400")}>(variance {k.cumulativeVariance >= 0 ? "+" : ""}{k.cumulativeVariance})</span>}
                    <span className={cn("ml-1.5 font-bold", k.achievementPct === null ? "text-slate-500" : k.achievementPct >= 100 ? "text-emerald-400" : k.achievementPct >= 80 ? "text-amber-400" : "text-rose-400")}>
                      {k.achievementPct !== null ? `${k.achievementPct}%` : k.status}
                    </span>
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {k.days.reported} reported day(s) · exceeded {k.days.exceeded} · met {k.days.met} · missed {k.days.missed}{k.days.noData > 0 ? ` · NOT REPORTED ${k.days.noData}` : ""}
                  {k.evidence.length ? ` · evidence: ${k.evidence.slice(0, 3).join(", ")}` : ""}
                </p>
              </div>
            ))}
            {r.cumulativeKpi.kpis.length === 0 && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                No verifiable KPI records in this period — absence of data is reported as a gap for review, never as zero achievement or failure.
              </p>
            )}
          </div>
          {r.cumulativeKpi.weekly.length > 0 && (
            <p className="mt-2 text-[10px] text-slate-500">Weekly scoreboard rows kept separately (never daily-summed): {r.cumulativeKpi.weekly.map((w) => w.label).join("; ")}.</p>
          )}
        </Section>
      )}

      {(r.workCompleted?.length || r.techTaskProfile) && (
        <Section
          title="B3. Work Completed & Outstanding Work (evidence register)"
          subtitle={r.techTaskProfile ? "Task-based view for a variable-target team — the assignment scope each report declares is the target; counts never substitute for quality." : "Grouped from the submitted reports' own work entries — repeated duties show once with their dates."}
        >
          {r.techTaskProfile && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Assigned deliverables" value={String(r.techTaskProfile.assignedDeliverables)} />
              <Stat label="Completed" value={String(r.techTaskProfile.completedDeliverables)} hint={r.techTaskProfile.completionRatePct !== null ? `${r.techTaskProfile.completionRatePct}%` : "no assignments"} />
              <Stat label="Outstanding / overdue" value={`${r.techTaskProfile.outstandingDeliverables} / ${r.techTaskProfile.overdueDeliverables}`} />
              <Stat label="Bugs resolved / reported" value={`${r.techTaskProfile.bugsResolved} / ${r.techTaskProfile.bugsReported}`} hint="kept strictly separate" />
            </div>
          )}
          {r.techTaskProfile && (
            <Kv rows={[
              ["On-time completion", r.techTaskProfile.onTimeCompletionRatePct !== null ? `${r.techTaskProfile.onTimeCompletionRatePct}%` : "no deadline-bearing completions on record (not computable, never guessed)"],
              ["Beyond expectation", String(r.techTaskProfile.tasksCompletedBeyondExpectation)],
              ["Blocked (external dependency)", String(r.techTaskProfile.blocked)],
              ["Carried-in tasks preserved", String(r.techTaskProfile.carriedIn)],
            ]} />
          )}
          {r.workCompleted && r.workCompleted.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400/80">Verified work completed</p>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {r.workCompleted.map((w) => (
                  <div key={w.task} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-200">{w.task}</span>
                      <span className="text-[10px] text-slate-500">×{w.timesCompleted} · {w.dates.slice(0, 3).join(", ")}{w.dates.length > 3 ? "…" : ""}</span>
                    </div>
                    {w.deliverables.length > 0 && <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{w.deliverables[0]}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.techTaskProfile && r.techTaskProfile.outstandingWork.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-400/80">Outstanding / overdue / blocked</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {r.techTaskProfile.outstandingWork.map((w, i) => (
                  <div key={`${w.label}-${i}`} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs">
                    <span className={cn("mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold", w.kind === "OVERDUE" ? "bg-rose-400/15 text-rose-300" : w.kind === "BLOCKED" ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-slate-300")}>{w.kind}</span>
                    <span className="font-medium text-slate-200">{w.label}</span>
                    <p className="mt-0.5 text-[10px] text-slate-500">{w.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="C. Best & Weakest KPI Identification" subtitle="Every classification carries its supporting figures.">
        <Kv rows={[
          ["Strongest KPI", r.bestWeakest.strongest ? `${r.bestWeakest.strongest.label} — ${r.bestWeakest.strongest.why}` : "Insufficient data"],
          ["Weakest KPI", r.bestWeakest.weakest ? `${r.bestWeakest.weakest.label} — ${r.bestWeakest.weakest.why}` : "Insufficient data"],
          ["Largest negative variance", r.bestWeakest.largestNegativeVariance ? `${r.bestWeakest.largestNegativeVariance.label} (${r.bestWeakest.largestNegativeVariance.variance})` : "None negative"],
          ["Greatest improvement", r.bestWeakest.greatestImprovement ? `${r.bestWeakest.greatestImprovement.label} (${r.bestWeakest.greatestImprovement.deltaPct > 0 ? "+" : ""}${r.bestWeakest.greatestImprovement.deltaPct} pts)` : "No comparable history"],
          ["Greatest decline", r.bestWeakest.greatestDecline ? `${r.bestWeakest.greatestDecline.label} (${r.bestWeakest.greatestDecline.deltaPct} pts)` : "No decline recorded"],
          ["Most consistent", r.bestWeakest.mostConsistent?.label ?? "Insufficient historical data"],
          ["Requiring attention", r.bestWeakest.requiringAttention.length ? r.bestWeakest.requiringAttention.map((x) => x.label).join(", ") : "None"],
        ]} />
      </Section>

      <Section title="D. Application Usage & Activity Analysis" subtitle="A login is authentication, not productivity — the two are measured separately.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Logins" value={String(act.successfulLogins)} hint={`prev period: ${String(act.prevLogins)}`} />
          <Stat label="Active days" value={String(act.activeDays)} hint={`meaningful work days: ${String(act.meaningfulWorkDays)}`} />
          <Stat label="Reports submitted" value={String(act.reportsSubmitted)} hint={`drafts ${String(act.draftsSaved)} · rejected ${String(act.reportsRejected)}`} />
          <Stat label="Escalations raised" value={String(act.escalationsRaised)} hint={`replies ${String(act.escalationReplies)}`} />
        </div>
        <Kv rows={[
          ["Last login", d(act.lastLoginAt as string | null)],
          ["First recorded activity", d(act.firstRecordedActivity as string | null)],
          ["Most recent activity", d(act.mostRecentActivity as string | null)],
          ["Announcements acknowledged", "Not currently tracked by the application."],
        ]} />
      </Section>

      <Section title="E. Task Management & Completion Analysis">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Assigned" value={String(t.assigned)} />
          <Stat label="Completed" value={String(t.completed)} tone={(t.completionRatePct ?? 0) >= 80 ? "good" : undefined} hint={`${t.completionRatePct ?? "—"}%`} />
          <Stat label="Overdue" value={String(t.overdue)} tone={Number(t.overdue) > 0 ? "bad" : "good"} />
          <Stat label="Punctuality" value={t.punctualityPct !== null ? `${t.punctualityPct}%` : "No deadlines"} hint={`before deadline ${String(t.completedBeforeDeadline)} · after ${String(t.completedAfterDeadline)}`} />
        </div>
        <Kv rows={[
          ["Pending (open)", String(t.pending)], ["Blocked", String(t.blocked)],
          ["Not completed (distinct from completed)", String(t.cancelledOrNotCompleted)],
          ["Avg completion time", t.avgCompletionHours !== null ? `${t.avgCompletionHours} hrs` : "—"],
          ["Previous period", `completed ${t.prev.completed} · overdue ${t.prev.overdue}`],
        ]} />
      </Section>

      <Section title="F. Attendance, Punctuality & Work Compliance" subtitle="A missing record is never counted as an absence.">
        {at.available ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Attendance" value={at.attendancePct !== null ? `${at.attendancePct}%` : "—"} hint={`${Number(at.present) + Number(at.late)}/${Number(at.daysWithRecord)} recorded days`} />
              <Stat label="Punctuality" value={at.punctualityPct !== null ? `${at.punctualityPct}%` : "—"} hint={`${at.late} late`} />
              <Stat label="Scheduled days" value={String(at.scheduledDays)} hint={`${at.missingRecords} without record`} />
              <Stat label="Avg lateness" value={at.avgLatenessMins !== null ? `${at.avgLatenessMins} mins` : "—"} />
            </div>
          </>
        ) : (
          <p className="text-xs italic text-slate-500">No attendance records in the period — attendance is only recorded when the daily report carries the attendance block.</p>
        )}
      </Section>

      <Section title="G. Strengths & Weaknesses" subtitle="Every item is backed by measurable evidence from application records.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400/80">Strengths</p>
            <Findings items={r.strengths} emptyLabel="No strengths met the evidence thresholds in this period." />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-400/80">Weaknesses</p>
            <Findings items={r.weaknesses} emptyLabel="No weaknesses met the evidence thresholds in this period." />
          </div>
        </div>
        {r.risks.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-400/80">Performance risks</p>
            <Findings items={r.risks} emptyLabel="" />
          </div>
        )}
      </Section>

      <Section title="H. Overall Performance Assessment" subtitle="Transparent, configurable scoring — components without data are excluded, never counted against the agent.">
        <ScorePanel score={r.assessment.score} components={r.assessment.scoreComponents} includedWeights={r.assessment.includedWeights} classification={r.assessment.classification} coverageNote={r.assessment.coverageNote} />
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <CommentaryBlock c={r.assessment.commentary} />
        </div>
      </Section>

      <Section title="Data availability notes" subtitle="What the application does and does not track.">
        <DataNotes notes={r.dataNotes} />
      </Section>
    </div>
  );
}

// ── Team report ──
type TeamReport = {
  team: { key: string; label: string; centre: string };
  overview: { totalRegistered: number; activeAgents: number; inactive: number; teamLead: { name: string } | null; supervisors: { name: string; centre: string }[]; tasks: Record<string, number | null>; teamKpiRows: Record<string, unknown>[]; meanAgentScore: number | null; reportingCompliancePct: number | null; scheduledAgentDays: number; submittedAgentDays: number; appActivity: { logins: number; meaningfulEvents: number; activeAgents: number }; trend: { label: string; submitted: number | null }[] };
  ranking: { ranked: Record<string, unknown>[]; callouts: Record<string, { name?: string; why?: string; score?: number | null; tasksCompleted?: number; overdue?: number; punctualityPct?: number | null; meaningfulWorkDays?: number; submittedDays?: number } | null> };
  kpiComparison: { teamAverages: { label: string; teamAvg: number | null; row: { target: number | null; actual: number | null } | null }[]; grid: { agent: string; meanAchPct: number | null; strongest: string | null; weakest: string | null; scores: { key: string; achievementPct: number | null }[] }[]; aboveTeamAverage: string[]; belowTeamAverage: string[] };
  kpiEngineRankings?: { rankings: { id: string; label: string; basis: string; higherIsBetter: boolean; leaders: { agent: string; display: string }[]; needsAttention: { agent: string; display: string; detail: string }[] }[]; measurementNotes: string[] };
  productivity: { usage: Record<string, unknown>[]; mostActive: string | null; leastActive: string | null };
  strengths: { title: string; evidence: string }[];
  weaknesses: { title: string; evidence: string }[];
  risks: { title: string; evidence: string }[];
  teamLead: Record<string, unknown> | null;
  assessment: { commentary: { source: string; engineNote?: string; summary: string; strengths: string[]; weaknesses: string[]; risks: string[]; recommendations: string[] } };
  dataNotes: { metric: string; note: string }[];
};

export function TeamReportView({ r }: { r: TeamReport }) {
  const o = r.overview;
  const t = o.tasks;
  const tl = r.teamLead as Record<string, unknown> | null;
  return (
    <div className="space-y-4">
      <Section title="A. Team Overview">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Active agents" value={String(o.activeAgents)} hint={`${o.totalRegistered} registered · ${o.inactive} inactive`} />
          <Stat label="Mean agent score" value={o.meanAgentScore ?? "N/A"} tone={typeof o.meanAgentScore === "number" ? (o.meanAgentScore >= 75 ? "good" : o.meanAgentScore >= 60 ? "warn" : "bad") : undefined} />
          <Stat label="Reporting compliance" value={o.reportingCompliancePct !== null ? `${o.reportingCompliancePct}%` : "—"} hint={`${o.submittedAgentDays}/${o.scheduledAgentDays} agent-days`} />
          <Stat label="App activity" value={String(o.appActivity.activeAgents)} hint={`${o.appActivity.logins} logins · ${o.appActivity.meaningfulEvents} events`} />
        </div>
        <Kv rows={[
          ["Team Lead", o.teamLead?.name ?? "None assigned"],
          ["Supervisors", o.supervisors.map((s) => `${s.name} (${s.centre})`).join("; ") || "—"],
          ["Tasks", `${t.completed}/${t.assigned} completed · ${t.overdue} overdue · ${t.pending} pending`],
        ]} />
        <KpiTable rows={o.teamKpiRows as never} />
      </Section>

      <Section title="B. Agent Performance Ranking" subtitle="Ranked on the transparent score (≥50 weight points required); most-active-in-app is reported separately from productivity.">
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Agent</th>
                <th className="px-3 py-2 font-semibold">Score</th>
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">KPI %</th>
                <th className="px-3 py-2 font-semibold">Tasks</th>
                <th className="px-3 py-2 font-semibold">Overdue</th>
                <th className="px-3 py-2 font-semibold">Punct.</th>
                <th className="px-3 py-2 font-semibold">Meaningful days</th>
              </tr>
            </thead>
            <tbody>
              {r.ranking.ranked.map((row, i) => {
                const num = row.position as number | null;
                const score = row.score as number | null;
                return (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 font-bold text-slate-400">{num ?? "—"}</td>
                    <td className="px-3 py-2 font-medium text-slate-200">{String(row.agent)}</td>
                    <td className={cn("px-3 py-2 font-bold", score === null ? "text-slate-500" : score >= 75 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400")}>{score ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{String(row.classification)}</td>
                    <td className="px-3 py-2 text-slate-300">{row.meanKpiAchPct !== null ? `${row.meanKpiAchPct}%` : "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{String(row.tasksCompleted)}</td>
                    <td className={cn("px-3 py-2", Number(row.tasksOverdue) > 0 ? "font-semibold text-rose-400" : "text-slate-300")}>{String(row.tasksOverdue)}</td>
                    <td className="px-3 py-2 text-slate-300">{row.punctualityPct !== null ? `${row.punctualityPct}%` : "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{String(row.meaningfulWorkDays)}</td>
                  </tr>
                );
              })}
              {!r.ranking.ranked.length && <tr><td colSpan={9} className="px-3 py-4 text-center text-xs italic text-slate-500">No active agents in this team for the period.</td></tr>}
            </tbody>
          </table>
        </div>
        <Kv rows={Object.entries(r.ranking.callouts).filter(([, v]) => v).map(([k, v]) => [k, `${v!.name} — ${v!.why ?? (v!.score !== undefined && v!.score !== null ? `score ${v!.score}` : "")}${v!.tasksCompleted !== undefined ? ` (${v!.tasksCompleted} tasks)` : ""}${v!.overdue !== undefined ? ` (${v!.overdue} overdue)` : ""}${v!.punctualityPct !== undefined && v!.punctualityPct !== null ? ` (${v!.punctualityPct}%)` : ""}${v!.meaningfulWorkDays !== undefined ? ` (${v!.meaningfulWorkDays} meaningful days)` : ""}${v!.submittedDays !== undefined ? ` (${v!.submittedDays} days)` : ""}`] as [string, string])} />
      </Section>

      <Section title="C. Team KPI Comparison">
        <Kv rows={r.kpiComparison.teamAverages.map((k) => [k.label, `${k.teamAvg !== null ? `${k.teamAvg}%` : "insufficient data"} (target ${k.row?.target ?? "—"} · actual ${k.row?.actual ?? "—"})`] as [string, string])} />
        <p className="text-[11px] text-slate-400"><span className="font-semibold text-emerald-400">Above team average:</span> {r.kpiComparison.aboveTeamAverage.join(", ") || "—"} · <span className="font-semibold text-rose-400">below team average:</span> {r.kpiComparison.belowTeamAverage.join(", ") || "—"}</p>
      </Section>

      {r.kpiEngineRankings && r.kpiEngineRankings.rankings.length > 0 && (
        <Section title="C2. KPI-Engine Rankings — each with its measurement basis" subtitle="Different measures stay in separate rankings; raw task counts never substitute for quality, deadlines and verified completion; agents without verifiable data appear in no ranking (never scored as zero).">
          <div className="space-y-2">
            {r.kpiEngineRankings.rankings.map((rk) => (
              <div key={rk.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{rk.label}</span>
                  <span className="text-[10px] text-slate-500">{rk.higherIsBetter ? "higher is better" : "lower is better"}</span>
                </div>
                <p className="mt-0.5 text-[10px] italic text-slate-500">Basis: {rk.basis}</p>
                <div className="mt-1.5 space-y-1">
                  {rk.leaders.map((l, i) => (
                    <div key={l.agent} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/[0.06] px-2 py-1">
                      <span className="font-medium text-slate-200">{i + 1}. {l.agent}</span>
                      <span className="tabular-nums text-slate-300">{l.display}</span>
                    </div>
                  ))}
                  {rk.leaders.length === 0 && <p className="text-[11px] text-slate-500">No agent has data for this measure in the period.</p>}
                </div>
                {rk.needsAttention.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-amber-400/90">Needs attention: {rk.needsAttention.map((a) => `${a.agent} (${a.display})`).join(" · ")}</p>
                )}
              </div>
            ))}
            {r.kpiEngineRankings.measurementNotes.map((n, i) => (
              <p key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-slate-400">{n}</p>
            ))}
          </div>
        </Section>
      )}

      <Section title="D. Team Productivity & Application Usage" subtitle={`Most active: ${r.productivity.mostActive ?? "—"} · least active: ${r.productivity.leastActive ?? "—"} — activity and productivity are separate measurements.`}>
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-semibold">Agent</th><th className="px-3 py-2 font-semibold">Logins</th><th className="px-3 py-2 font-semibold">Meaningful days</th><th className="px-3 py-2 font-semibold">Reports</th><th className="px-3 py-2 font-semibold">Tasks done</th><th className="px-3 py-2 font-semibold">Overdue</th><th className="px-3 py-2 font-semibold">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {r.productivity.usage.map((u, i) => (
                <tr key={i} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-3 py-2 font-medium text-slate-200">{String(u.agent)}</td>
                  <td className="px-3 py-2 text-slate-300">{String(u.logins)}</td>
                  <td className="px-3 py-2 text-slate-300">{String(u.meaningfulWorkDays)}</td>
                  <td className="px-3 py-2 text-slate-300">{String(u.reportsSubmitted)}</td>
                  <td className="px-3 py-2 text-slate-300">{String(u.tasksCompleted)}</td>
                  <td className={cn("px-3 py-2", Number(u.tasksOverdue) > 0 ? "text-rose-400" : "text-slate-300")}>{String(u.tasksOverdue)}</td>
                  <td className="px-3 py-2 text-slate-400">{u.lastActivityAt ? d(u.lastActivityAt as string) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="E. Team Strengths & Weaknesses">
        <div className="grid gap-4 lg:grid-cols-2">
          <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400/80">Strengths</p><Findings items={r.strengths} emptyLabel="No strengths met the evidence thresholds." /></div>
          <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-400/80">Weaknesses</p><Findings items={r.weaknesses} emptyLabel="No weaknesses met the evidence thresholds." /></div>
        </div>
        {r.risks.length > 0 && <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-400/80">Risks</p><Findings items={r.risks} emptyLabel="" /></div>}
      </Section>

      <Section title="F. Team Lead Performance & Oversight" subtitle="Only recorded activities are analysed — team outcomes are reported separately from the lead's own activities.">
        {tl ? (
          <Kv rows={[
            ["Team Lead", String(tl.lead ? (tl.lead as { name: string }).name : "—")],
            ["Own reports submitted", String(tl.ownReportsSubmitted)],
            ["Tasks assigned to the team", String(tl.tasksAssignedToTeam)],
            ["Completion of assigned tasks", tl.taskCompletionOfAssigned !== null ? `${tl.taskCompletionOfAssigned}%` : "—"],
            ["Escalations resolved", String(tl.escalationsResolved)],
            ["Escalation replies / updates", String(tl.escalationReplies)],
            ["Open team escalations", String(tl.openTeamEscalations)],
          ]} />
        ) : (
          <p className="text-xs italic text-slate-500">No team lead assigned to this team in the period.</p>
        )}
      </Section>

      <Section title="G. Team Recommendations">
        <CommentaryBlock c={r.assessment.commentary} />
      </Section>

      <Section title="Data availability notes"><DataNotes notes={r.dataNotes} /></Section>
    </div>
  );
}

// ── Centre report ──
type CentreReport = {
  centre: { label: string };
  overview: { totalTeams: number; totalSupervisors: number; totalTeamLeads: number; totalAgents: number; activeAgents: number; inactiveAgents: number; tasks: Record<string, number | null>; centreKpiAchPct: number | null; meanAgentScore: number | null; reportingCompliancePct: number | null; escalations: { total: number; open: number; resolved: number }; teamOverviews: { label: string; agents: number; meanKpiAchPct: number | null; meanScore: number | null; tasksCompleted: number; tasksOverdue: number; compliancePct: number | null }[]; trend: { label: string; submitted: number | null }[] };
  supervisors: Record<string, unknown>[];
  teamLeads: Record<string, unknown>[];
  agents: { ranked: Record<string, unknown>[]; highest: { name: string; score: number | null } | null; lowest: { name: string; score: number | null } | null; mostActive: { name: string; meaningfulWorkDays: number } | null; mostOverdue: { name: string; overdue: number } | null; repeatedKpiDeficiencies: { name: string; belowOrCritical: number }[]; strongestReporting: { name: string; compliancePct: number | null } | null };
  risks: { title: string; evidence: string }[];
  strengths: { title: string; evidence: string }[];
  assessment: { commentary: { source: string; engineNote?: string; summary: string; strengths: string[]; weaknesses: string[]; risks: string[]; recommendations: string[] } };
  dataNotes: { metric: string; note: string }[];
};

export function CentreReportView({ r }: { r: CentreReport }) {
  const o = r.overview;
  const t = o.tasks;
  return (
    <div className="space-y-4">
      <Section title="A. Centre Overview">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Teams" value={String(o.totalTeams)} hint={`${o.totalAgents} agents (${o.activeAgents} active)`} />
          <Stat label="Supervisors" value={String(o.totalSupervisors)} hint={`${o.totalTeamLeads} team leads`} />
          <Stat label="Centre KPI achievement" value={o.centreKpiAchPct !== null ? `${o.centreKpiAchPct}%` : "—"} tone={typeof o.centreKpiAchPct === "number" ? (o.centreKpiAchPct >= 80 ? "good" : o.centreKpiAchPct >= 60 ? "warn" : "bad") : undefined} />
          <Stat label="Reporting compliance" value={o.reportingCompliancePct !== null ? `${o.reportingCompliancePct}%` : "—"} />
        </div>
        <Kv rows={[
          ["Tasks", `${t.completed}/${t.assigned} completed · ${t.overdue} overdue · ${t.pending} pending`],
          ["Escalations", `${o.escalations.open} open / ${o.escalations.total} total`],
        ]} />
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Team</th><th className="px-3 py-2">Agents</th><th className="px-3 py-2">Mean KPI %</th><th className="px-3 py-2">Mean score</th><th className="px-3 py-2">Tasks done</th><th className="px-3 py-2">Overdue</th><th className="px-3 py-2">Compliance</th></tr></thead>
            <tbody>
              {o.teamOverviews.map((tm, i) => (
                <tr key={i} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-3 py-2 font-medium text-slate-200">{tm.label}</td>
                  <td className="px-3 py-2 text-slate-300">{tm.agents}</td>
                  <td className={cn("px-3 py-2 font-semibold", tm.meanKpiAchPct === null ? "text-slate-500" : tm.meanKpiAchPct >= 80 ? "text-emerald-400" : tm.meanKpiAchPct >= 60 ? "text-amber-400" : "text-rose-400")}>{tm.meanKpiAchPct !== null ? `${tm.meanKpiAchPct}%` : "—"}</td>
                  <td className="px-3 py-2 text-slate-300">{tm.meanScore ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-300">{tm.tasksCompleted}</td>
                  <td className={cn("px-3 py-2", tm.tasksOverdue > 0 ? "text-rose-400" : "text-slate-300")}>{tm.tasksOverdue}</td>
                  <td className="px-3 py-2 text-slate-300">{tm.compliancePct !== null ? `${tm.compliancePct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="B. Supervisor Performance Analysis" subtitle="Recorded activities only.">
        {r.supervisors.length ? (
          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Supervisor</th><th className="px-3 py-2">Reports reviewed</th><th className="px-3 py-2">Avg review (hrs)</th><th className="px-3 py-2">Esc received</th><th className="px-3 py-2">Resolved</th><th className="px-3 py-2">Outstanding</th></tr></thead>
              <tbody>
                {r.supervisors.map((s, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-200">{String(s.name)}</td>
                    <td className="px-3 py-2 text-slate-300">{String(s.reportsReviewed)}</td>
                    <td className="px-3 py-2 text-slate-300">{s.avgReviewHours !== null ? String(s.avgReviewHours) : "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{String(s.escalationsReceived)}</td>
                    <td className="px-3 py-2 text-slate-300">{String(s.escalationsResolved)}</td>
                    <td className={cn("px-3 py-2", Number(s.outstandingEscalations) > 0 ? "text-amber-400" : "text-slate-300")}>{String(s.outstandingEscalations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs italic text-slate-500">No supervisors registered in this centre.</p>}
      </Section>

      <Section title="C. Team Lead Analysis">
        {r.teamLeads.length ? (
          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Team Lead</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Agents</th><th className="px-3 py-2">Team KPI %</th><th className="px-3 py-2">Own reports</th><th className="px-3 py-2">Tasks assigned</th><th className="px-3 py-2">Esc resolved</th></tr></thead>
              <tbody>
                {r.teamLeads.map((l, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-200">{String(l.name)}</td>
                    <td className="px-3 py-2 text-slate-300">{String(l.teamLabel ?? "—")}</td>
                    <td className="px-3 py-2 text-slate-300">{String(l.agentsInTeam)}</td>
                    <td className="px-3 py-2 text-slate-300">{l.teamMeanKpiAchPct !== null ? `${l.teamMeanKpiAchPct}%` : "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{String(l.ownReportsSubmitted)}</td>
                    <td className="px-3 py-2 text-slate-300">{String(l.tasksAssigned)}</td>
                    <td className="px-3 py-2 text-slate-300">{String(l.escalationsResolved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs italic text-slate-500">No team leads registered in this centre.</p>}
      </Section>

      <Section title="D. Centre Agent Analysis" subtitle={`Highest: ${r.agents.highest?.name ?? "—"} · lowest: ${r.agents.lowest?.name ?? "—"} · most active: ${r.agents.mostActive?.name ?? "—"} (activity ≠ productivity)`}>
        <div className="max-h-80 overflow-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="sticky top-0 bg-[#11141c]"><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Agent</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">KPI %</th><th className="px-3 py-2">Tasks</th><th className="px-3 py-2">Overdue</th><th className="px-3 py-2">Compliance</th></tr></thead>
            <tbody>
              {r.agents.ranked.map((a, i) => {
                const score = a.score as number | null;
                return (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-200">{String(a.agent)}</td>
                    <td className="px-3 py-2 text-slate-400">{String(a.team ?? "—")}</td>
                    <td className={cn("px-3 py-2 font-bold", score === null ? "text-slate-500" : score >= 75 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400")}>{score ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{a.meanKpiAchPct !== null ? `${a.meanKpiAchPct}%` : "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{String(a.tasksCompleted)}</td>
                    <td className={cn("px-3 py-2", Number(a.tasksOverdue) > 0 ? "text-rose-400" : "text-slate-300")}>{String(a.tasksOverdue)}</td>
                    <td className="px-3 py-2 text-slate-300">{a.compliancePct !== null ? `${a.compliancePct}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {r.agents.repeatedKpiDeficiencies.length > 0 && (
          <p className="text-[11px] text-amber-300"><span className="font-semibold">Repeated KPI deficiencies:</span> {r.agents.repeatedKpiDeficiencies.map((x) => `${x.name} (${x.belowOrCritical})`).join(", ")}</p>
        )}
      </Section>

      <Section title="E. Centre Operational Risk Analysis">
        <Findings items={r.risks} emptyLabel="No operational risks met the evidence thresholds in this period." />
        {r.strengths.length > 0 && <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400/80">Major achievements</p><Findings items={r.strengths} emptyLabel="" /></div>}
      </Section>

      <Section title="F. Centre Recommendations">
        <CommentaryBlock c={r.assessment.commentary} />
      </Section>

      <Section title="Data availability notes"><DataNotes notes={r.dataNotes} /></Section>
    </div>
  );
}
