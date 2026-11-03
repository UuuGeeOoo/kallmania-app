"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, type SessionUser } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Activity, AlertCircle, ChevronDown, ChevronUp, Copy, KeyRound, Loader2, RefreshCw, Radio, ScrollText, TrendingDown, TrendingUp, Minus } from "lucide-react";

// ── SBTS Media Command Centre scoreboard ────────────────────────────────────
// Scores are computed by the external SBTS Media Command Centre and pushed
// here as signed events; this view stores nothing and recomputes nothing —
// it displays the verified, stored events. Bars animate on every poll so a
// new event is instantly visible; movement direction comes from the change
// against the previously rendered score (and SBTS's own delta is shown).

interface ScoreEvent {
  eventId: string;
  date: string;
  score: number | null;
  delta: number | null;
  components: string | null;
  receivedAt: string;
}
interface AgentRow {
  email: string;
  fullName: string;
  role: string;
  division: string;
  team: string | null;
  status: string;
  latest: ScoreEvent | null;
  previous: { eventId: string; date: string; score: number | null; delta: number | null; receivedAt: string } | null;
  lastReportAt: string | null;
  lastReportDate: string | null;
  latestReportExcerpt: string | null;
  reports7d: number;
}
interface ScoresPayload {
  scope: "own" | "team" | "all";
  version: string;
  agents: AgentRow[];
  unmapped: { email: string; latest: ScoreEvent | null; lastEventAt: string | null }[];
}
interface ReportRow {
  eventId: string;
  agentEmail: string;
  agentName: string | null;
  date: string;
  report: string | null;
  receivedAt: string;
}
interface PipePayload {
  credentials: { id: string; label: string; keyHint: string; active: boolean; revokedAt: string | null; graceUntil: string | null; createdAt: string }[];
  events24h: number;
  lastEvent: { receivedAt: string; type: string; agentEmail: string } | null;
  unmappedCount: number;
}

function scoreBandColor(score: number): string {
  if (score >= 75) return "from-emerald-400 to-emerald-500";
  if (score >= 50) return "from-amber-300 to-amber-500";
  return "from-rose-400 to-rose-500";
}

function DeltaChip({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined || !Number.isFinite(delta))
    return <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Minus className="h-3 w-3" /> no change</span>;
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", flat ? "text-slate-400" : up ? "text-emerald-400" : "text-rose-400")}>
      {up ? <TrendingUp className="h-3 w-3" /> : flat ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{Number(delta).toFixed(1)} vs previous
    </span>
  );
}

function ScoreBar({ score, prevScore }: { score: number; prevScore: number | null }) {
  // Width transition animates up/down whenever a new event changes the score.
  const width = Math.max(0, Math.min(100, score));
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", scoreBandColor(score))}
        style={{ width: `${width}%` }}
      />
      {prevScore !== null && Math.abs(prevScore - score) >= 0.5 && (
        <span
          className="absolute top-1/2 h-5 w-[2px] -translate-y-1/2 rounded bg-white/60"
          style={{ left: `calc(${Math.max(0, Math.min(100, prevScore))}% - 1px)` }}
          title={`previous ${prevScore.toFixed(1)}`}
        />
      )}
      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-white/90">{score.toFixed(1)}</span>
    </div>
  );
}

function ComponentChips({ components }: { components: string | null }) {
  if (!components) return null;
  let parsed: Record<string, number> = {};
  try {
    parsed = JSON.parse(components) as Record<string, number>;
  } catch {
    return null;
  }
  const entries = Object.entries(parsed).slice(0, 12);
  if (!entries.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <span key={k} className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] text-slate-300">
          {k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}: <span className="font-semibold text-slate-100">{Number(v).toFixed(1)}</span>
        </span>
      ))}
    </div>
  );
}

function AgentCard({ agent, flash }: { agent: AgentRow; flash: "up" | "down" | null }) {
  const score = agent.latest?.score ?? null;
  const prevScore = agent.previous?.score ?? null;
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition-all duration-500",
        flash === "up" && "border-emerald-400/60 shadow-[0_0_24px_rgba(52,211,153,0.25)]",
        flash === "down" && "border-rose-400/60 shadow-[0_0_24px_rgba(251,113,133,0.25)]"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{agent.fullName}</p>
          <p className="truncate text-[11px] text-slate-400">{agent.email}</p>
        </div>
        {agent.status !== "APPROVED" && <Badge variant="outline" className="shrink-0 border-amber-400/40 text-[10px] text-amber-300">{agent.status}</Badge>}
      </div>
      {score === null ? (
        <p className="py-3 text-xs text-slate-500">No SBTS score events yet.</p>
      ) : (
        <>
          <ScoreBar score={score} prevScore={prevScore} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <DeltaChip delta={agent.latest?.delta} />
            <span className="text-[10px] text-slate-500">{agent.latest?.date}</span>
          </div>
          <ComponentChips components={agent.latest?.components ?? null} />
        </>
      )}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
        {agent.reports7d > 0 && (
          <span className="inline-flex items-center gap-1"><ScrollText className="h-3 w-3" /> {agent.reports7d} report{agent.reports7d > 1 ? "s" : ""} (7d)</span>
        )}
        {agent.lastReportDate && <span>last report {agent.lastReportDate}</span>}
      </div>
    </div>
  );
}

export function MediaScoreboard({ user }: { user: SessionUser }) {
  const [data, setData] = useState<ScoresPayload | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [pipe, setPipe] = useState<PipePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flashBy, setFlashBy] = useState<Record<string, "up" | "down">>({});
  const prevScoresRef = useRef<Record<string, number>>({});
  const [rotation, setRotation] = useState<{ key: string; secret: string; keyHint: string } | null>(null);
  const [rotating, setRotating] = useState(false);

  const isManagement = user.role === "ADMIN" || user.role === "SUPERVISOR";
  const isAdmin = user.role === "ADMIN";

  const load = useCallback(async () => {
    try {
      const scores = await api<ScoresPayload>("/api/sbts/scores");
      // Movement flash: compare against the previously rendered scores
      const flashes: Record<string, "up" | "down"> = {};
      for (const a of scores.agents) {
        if (a.latest?.score === null || a.latest?.score === undefined) continue;
        const prev = prevScoresRef.current[a.email];
        if (prev !== undefined && Math.abs(prev - a.latest.score) >= 0.5)
          flashes[a.email] = a.latest.score > prev ? "up" : "down";
        prevScoresRef.current[a.email] = a.latest.score;
      }
      setFlashBy(flashes);
      setData(scores);
      setError(null);
      const rep = await api<{ reports: ReportRow[] }>("/api/sbts/reports");
      setReports(rep.reports);
      if (isAdmin) api<PipePayload>("/api/integrations/sbts/v1/credentials").then(setPipe).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scoreboard");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000); // live pipe — poll for new events
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!Object.keys(flashBy).length) return;
    const t = setTimeout(() => setFlashBy({}), 2500);
    return () => clearTimeout(t);
  }, [flashBy]);

  const rotate = async (graceHours: number) => {
    setRotating(true);
    try {
      const res = await api<{ rotated: boolean; key: string; secret: string; keyHint: string }>("/api/integrations/sbts/v1/credentials", {
        method: "POST",
        body: JSON.stringify({ action: "rotate", graceHours }),
      });
      setRotation({ key: res.key, secret: res.secret, keyHint: res.keyHint });
      api<PipePayload>("/api/integrations/sbts/v1/credentials").then(setPipe).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rotation failed");
    } finally {
      setRotating(false);
    }
  };

  const scopeLabel = data?.scope === "own" ? "Your performance" : data?.scope === "team" ? "Your team" : "All divisions";
  const own = data?.scope === "own" ? data.agents[0] : null;
  const cards = data?.agents ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <Radio className="h-5 w-5 text-[#eda06a]" /> SBTS Media Scoreboard
          </h2>
          <p className="text-xs text-slate-400">
            Live scores from the SBTS Media Command Centre · contract v1 · {scopeLabel}
            {data && <span> · updated {new Date().toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
            <Activity className="h-3 w-3" /> auto-refresh 30s
          </span>
          <Button variant="outline" size="sm" className="border-white/15 bg-white/[0.05]" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {own ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          {own.latest ? (
            <>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-4xl font-extrabold tracking-tight text-slate-50">{own.latest.score?.toFixed(1)}</p>
                  <p className="text-xs text-slate-400">performance score · {own.latest.date}</p>
                </div>
                <DeltaChip delta={own.latest.delta} />
              </div>
              <ScoreBar score={own.latest.score ?? 0} prevScore={own.previous?.score ?? null} />
              <ComponentChips components={own.latest.components} />
              {own.latestReportExcerpt && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-1 text-[11px] font-semibold text-slate-300">Latest daily report · {own.lastReportDate}</p>
                  <p className="whitespace-pre-wrap text-xs text-slate-400">{own.latestReportExcerpt}{(own.latestReportExcerpt.length ?? 0) >= 240 ? "…" : ""}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">
              No SBTS score events received for your account yet. Scores appear here the moment the Media Command Centre pushes them.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((a) => (
            <AgentCard key={a.email} agent={a} flash={flashBy[a.email] ?? null} />
          ))}
          {!cards.length && !loading && (
            <p className="col-span-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
              No media agents in scope yet.
            </p>
          )}
        </div>
      )}

      {data?.scope === "all" && !!data.unmapped.length && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
          <p className="mb-2 text-xs font-semibold text-amber-200">
            {data.unmapped.length} unmapped agent email{data.unmapped.length > 1 ? "s" : ""} — events received but no Kallmania account matches (exact email match required)
          </p>
          <div className="flex flex-wrap gap-2">
            {data.unmapped.map((u) => (
              <Badge key={u.email} variant="outline" className="border-amber-400/40 text-[11px] text-amber-100">
                {u.email}{u.latest ? ` · ${u.latest.score?.toFixed(0)}` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200"><ScrollText className="h-4 w-4 text-[#8b7ff5]" /> Daily reports</h3>
        <div className="space-y-2">
          {reports.slice(0, 20).map((r) => (
            <div key={r.eventId} className="rounded-xl border border-white/10 bg-white/[0.03]">
              <button className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left" onClick={() => setExpanded(expanded === r.eventId ? null : r.eventId)}>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-200">{r.agentName ?? r.agentEmail}</span>
                  <span className="ml-2 text-[11px] text-slate-500">{r.date} · received {new Date(r.receivedAt).toLocaleDateString()}</span>
                </div>
                {expanded === r.eventId ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
              </button>
              {expanded === r.eventId && (
                <p className="whitespace-pre-wrap border-t border-white/10 px-3 py-2 text-xs text-slate-300">{r.report}</p>
              )}
            </div>
          ))}
          {!reports.length && !loading && <p className="text-xs text-slate-500">No daily reports received yet.</p>}
          {reports.length > 20 && <p className="text-[11px] text-slate-500">Showing the 20 most recent of {reports.length}.</p>}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200"><KeyRound className="h-4 w-4 text-[#eda06a]" /> Integration pipe (admin)</h3>
          {pipe ? (
            <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
              <p>Active credential: <span className="font-mono text-slate-100">{pipe.credentials.find((c) => c.active)?.keyHint ?? "none"}</span></p>
              <p>Events (24h): <span className="font-semibold text-slate-100">{pipe.events24h}</span></p>
              <p>Last event: <span className="text-slate-100">{pipe.lastEvent ? new Date(pipe.lastEvent.receivedAt).toLocaleString() : "never"}</span></p>
              <p>Unmapped events: <span className="font-semibold text-amber-300">{pipe.unmappedCount}</span></p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Pipe status unavailable.</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-white/15 bg-white/[0.05]" disabled={rotating} onClick={() => void rotate(24)}>
              {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rotate key &amp; secret (24h grace)
            </Button>
          </div>
          {rotation && (
            <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-3 text-xs">
              <p className="mb-2 font-semibold text-emerald-200">New credential — shown ONCE, copy it now and send it to the Media Command Centre securely:</p>
              <div className="space-y-1 font-mono">
                <p className="flex items-center gap-2"><span className="text-slate-400">API key:</span><span className="break-all text-slate-100">{rotation.key}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void navigator.clipboard.writeText(rotation.key)}><Copy className="h-3 w-3" /></Button></p>
                <p className="flex items-center gap-2"><span className="text-slate-400">HMAC secret:</span><span className="break-all text-slate-100">{rotation.secret}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void navigator.clipboard.writeText(rotation.secret)}><Copy className="h-3 w-3" /></Button></p>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">The previous credential keeps verifying for 24 hours (grace), then stops.</p>
              <Button size="sm" variant="outline" className="mt-2 border-white/15" onClick={() => setRotation(null)}>I saved it — hide</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
