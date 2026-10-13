"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api, fmtDate, todayISO, DEPT_LABELS, type SessionUser } from "@/lib/client";
import { PageHeader, SectionCard, EmptyState, StatusBadge, StatCard } from "@/components/kallmania/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, FileDown, Layers, Send, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

const BPO_LABELS: Record<string, string> = {
  totalCallsMade: "Total calls made (team)",
  callsConnected: "Calls connected",
  totalMailsSent: "Total emails sent",
  successfulMailsSent: "Successful deliveries",
  hotLeads: "Hot leads (calls)",
  warmLeads: "Warm leads (calls)",
  emailHotLeads: "Hot leads via email",
  emailWarmLeads: "Warm leads via email",
  repliesReceived: "Email replies",
  positiveReplies: "Positive replies",
  meetingsBookedEmail: "Meetings booked via email",
  appointmentsBooked: "Appointments booked",
  callbacksScheduled: "Callbacks scheduled",
  positiveDispositions: "Positive dispositions",
  notInterested: "Not interested / declined",
};

interface ConsolidatedData {
  date: string;
  departments: Record<string, {
    expected: number;
    submitted: number;
    pending: number;
    employeesMissing: string[];
    bpoTotals?: Record<string, number>;
    teamKpiRows?: { key: string; label: string; teamTarget: number | null; teamAvg: number | null; best: string | null; bestVal: number | null; lowest: string | null; lowestVal: number | null }[];
    shortfalls?: string[];
    metricsTotals?: Record<string, number>;
    workEntries?: Record<string, unknown>[];
    challenges?: { employee: string; reportRef: string; text: string | null }[];
    escalations?: { employee: string; reportRef: string; text: string | null }[];
    additionalActivities?: { employee: string; reportRef: string; source: string; description: string | null }[];
    reports: { id: string; ref: string; userName: string; status: string; verificationStatus: string; sourceType: string; type: string }[];
  }>;
  existingSupervisorReport?: { id: string; status: string } | null;
}

export default function ConsolidatedView({ user, onOpenSupervisorForm }: { user: SessionUser; onOpenSupervisorForm: (date: string) => void }) {
  const [date, setDate] = useState(todayISO());
  const [includeUnconfirmed, setIncludeUnconfirmed] = useState(false);
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api<ConsolidatedData>(`/api/consolidated?date=${date}${includeUnconfirmed ? "&includeUnconfirmed=1" : ""}`);
      setData(d);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load();   }, [date, includeUnconfirmed]);

  const exportDocx = () => window.open(`/api/export?format=docx&scope=department&department=ALL&date=${date}`, "_blank");

  return (
    <div>
      <PageHeader
        title="Consolidated Daily Report"
        subtitle="Cross-department consolidation — every metric traces to a source report"
        actions={
          <>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger className="w-40 border-slate-600/50 bg-[#1b2a3b] text-xs text-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>{getLast14Days().map((d) => <SelectItem key={d} value={d}>{fmtDate(d)}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/10" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            <Button className="bg-[#6c5ce7] hover:bg-[#5b4bd4]" onClick={exportDocx}><FileDown className="mr-2 h-4 w-4" /> Export Word</Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
        <Switch id="unconfirmed" checked={includeUnconfirmed} onCheckedChange={setIncludeUnconfirmed} />
        <Label htmlFor="unconfirmed" className="cursor-pointer text-xs text-slate-300">
          Include drafts & unconfirmed reports in totals
          <span className="ml-2 text-[10px] text-slate-500">(off = only confirmed submissions; the report records this decision)</span>
        </Label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data ? (
        <EmptyState title="No data" />
      ) : (
        <div className="space-y-5">
          {/* BPO */}
          <SectionCard title="BPO & Outbound Call Centre" subtitle={DEPT_LABELS.BPO}>
            <BpoSection dept={data.departments.BPO} />
          </SectionCard>
          {/* WEB DEV */}
          <SectionCard title="Web Development & Technical" subtitle={DEPT_LABELS.WEB_DEV}>
            <TechSection dept={data.departments.WEB_DEV} />
          </SectionCard>
          {/* SOCIAL */}
          <SectionCard title="Social Media" subtitle={DEPT_LABELS.SOCIAL_MEDIA}>
            <TechSection dept={data.departments.SOCIAL_MEDIA} social />
          </SectionCard>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6c5ce7]/30 bg-[#6c5ce7]/5 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">Next step: complete your supervisor daily report</p>
              <p className="mt-0.5 text-xs text-slate-400">The supervisor template consolidates this data — add your own activities, coaching and action plan.</p>
            </div>
            <Button className="bg-[#6c5ce7] hover:bg-[#5b4bd4]" onClick={() => onOpenSupervisorForm(date)}>
              <Send className="mr-2 h-4 w-4" /> Open supervisor report for {fmtDate(date)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeptHeaderLine({ dept }: { dept: NonNullable<ConsolidatedData["departments"][string]> }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Expected to report" value={dept.expected} />
      <StatCard label="Submitted" value={dept.submitted} tone="good" />
      <StatCard label="Pending" value={dept.pending} tone={dept.pending > 0 ? "warn" : "default"} />
      <StatCard label="Missing" value={dept.employeesMissing.length ? dept.employeesMissing.join(", ").slice(0, 40) : "—"} sub={dept.employeesMissing.length ? "reports not received" : "everyone reported"} tone={dept.employeesMissing.length ? "warn" : "good"} />
    </div>
  );
}

function BpoSection({ dept }: { dept: ConsolidatedData["departments"]["BPO"] }) {
  if (!dept) return <EmptyState title="No data" />;
  const totals = dept.bpoTotals || {};
  return (
    <div>
      <DeptHeaderLine dept={dept} />
      {dept.teamKpiRows && dept.teamKpiRows.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/[0.03]">
                <TableHead className="text-[11px] text-slate-400">KPI</TableHead>
                <TableHead className="text-[11px] text-slate-400">Team target</TableHead>
                <TableHead className="text-[11px] text-slate-400">Team average</TableHead>
                <TableHead className="text-[11px] text-slate-400">Best performer</TableHead>
                <TableHead className="text-[11px] text-slate-400">Lowest performer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dept.teamKpiRows.map((k) => (
                <TableRow key={k.key} className="border-white/5">
                  <TableCell className="py-2 text-xs text-slate-200">{k.label}</TableCell>
                  <TableCell className="py-2 text-xs tabular-nums text-slate-400">{k.teamTarget ?? "—"}</TableCell>
                  <TableCell className="py-2 text-xs font-semibold tabular-nums text-[#b3a5ff]">{k.teamAvg ?? "—"}</TableCell>
                  <TableCell className="py-2 text-xs text-emerald-300">{k.best ? `${k.best} (${k.bestVal})` : "—"}</TableCell>
                  <TableCell className="py-2 text-xs text-amber-300">{k.lowest ? `${k.lowest} (${k.lowestVal})` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(BPO_LABELS).filter(([k]) => totals[k] !== undefined).map(([k, label]) => (
          <div key={k} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="truncate text-[10px] text-slate-500">{label}</p>
            <p className="text-lg font-bold tabular-nums text-slate-100">{totals[k]}</p>
          </div>
        ))}
      </div>
      {dept.shortfalls && dept.shortfalls.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-300"><ShieldAlert className="h-3.5 w-3.5" /> KPI shortfalls detected</p>
          {dept.shortfalls.map((s, i) => <p key={i} className="text-[11px] text-amber-200/80">• {s}</p>)}
        </div>
      )}
      <ProvenanceLists dept={dept} />
    </div>
  );
}

function TechSection({ dept, social }: { dept: ConsolidatedData["departments"]["WEB_DEV"]; social?: boolean }) {
  if (!dept) return <EmptyState title="No data" />;
  const totals = dept.metricsTotals || {};
  return (
    <div>
      <DeptHeaderLine dept={dept} />
      {Object.keys(totals).length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(totals).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="truncate text-[10px] text-slate-500">{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</p>
              <p className="text-lg font-bold tabular-nums text-slate-100">{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={social ? "No social media submissions yet" : "No technical submissions yet"} />
      )}
      {dept.workEntries && dept.workEntries.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold uppercase text-[#b3a5ff]">▸ Work entries</p>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {dept.workEntries.map((e, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-[11px]">
                <span className="font-medium text-slate-200">{String(e.employee || "")}</span>
                <span className="text-slate-300">{String(e.title || e.platform || "Entry")}</span>
                {e.status ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">{String(e.status)}</span> : null}
                <span className="ml-auto font-mono text-[10px] text-slate-600">{String(e.reportRef || "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <ProvenanceLists dept={dept} />
    </div>
  );
}

function ProvenanceLists({ dept }: { dept: NonNullable<ConsolidatedData["departments"][string]> }) {
  return (
    <div className="space-y-3">
      {dept.additionalActivities && dept.additionalActivities.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-[#b3a5ff]">▸ Additional activities (with source)</p>
          <div className="space-y-1">
            {dept.additionalActivities.map((a, i) => (
              <div key={i} className="rounded border border-white/10 px-2.5 py-1.5 text-[11px]">
                <p className="text-slate-200"><span className="font-medium">{a.employee}</span> · <span className="text-slate-500">source: {a.source} · {a.reportRef}</span></p>
                <p className="mt-0.5 whitespace-pre-wrap text-slate-400">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {dept.challenges && dept.challenges.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-[#b3a5ff]">▸ Challenges</p>
          {dept.challenges.map((c, i) => (
            <p key={i} className="rounded border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300"><span className="font-medium text-slate-200">{c.employee}:</span> {c.text}</p>
          ))}
        </div>
      )}
      {dept.escalations && dept.escalations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-rose-300">▸ Escalations</p>
          {dept.escalations.map((c, i) => (
            <p key={i} className="rounded border border-rose-500/30 bg-rose-500/5 px-2.5 py-1.5 text-[11px] text-rose-200"><span className="font-medium">{c.employee}:</span> {c.text}</p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Included reports:</span>
        {dept.reports.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            {r.status === "APPROVED" || r.status === "SUBMITTED" ? <ShieldCheck className="h-3 w-3 text-emerald-400" /> : <ShieldAlert className="h-3 w-3 text-amber-400" />}
            {r.ref}
          </span>
        ))}
      </div>
    </div>
  );
}

function getLast14Days(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const off = d.getTimezoneOffset();
    out.push(new Date(d.getTime() - off * 60000).toISOString().slice(0, 10));
  }
  return out;
}
