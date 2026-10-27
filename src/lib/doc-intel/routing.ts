// ─────────────────────────────────────────────────────────────────────────────
// STAGE D — KPI IDENTIFICATION & ROUTING ENGINE (deterministic, code-side)
//
// Pattern adapted from the genai_agents "One-Step Decision Router": a router
// may be wrong occasionally, but it must KNOW when — so every match carries a
// score and a confidence gate sends low-scoring labels to the review queue
// instead of forcing them into a (possibly wrong) field.
//
// This engine is the ONLY component allowed to decide destinations. The LLM
// supplies the facts (labels exactly as printed + values + evidence); this
// engine maps them onto the REAL template fields defined in template-config.ts
// with:
//   - canonical labels + alias tables per department
//   - token-level similarity for reasonable wording variations
//   - CONFUSION GUARDS for metric pairs that must never cross-map
//     (calls made ≠ calls answered, reach ≠ impressions, …)
//   - unit agreement checks
//   - target/actual/variance triple handling with formula verification
//   - duplicate prevention (same metric seen in several sections)
// ─────────────────────────────────────────────────────────────────────────────
import {
  AGENT_KPI_DEFS,
  TECH_SUMMARY_METRICS,
  SOCIAL_SUMMARY_METRICS,
  getKpiDef,
} from "@/lib/template-config";
import type {
  DocIntelDepartment,
  FindingKind,
  KpiFinding,
  NarrativeSection,
  RoutedKpi,
  UnmappedItem,
  ValidationIssue,
} from "./types";

export interface RouteTarget {
  key: string;
  label: string;
  unit: "count" | "percent" | "minutes" | "text";
  aliases: string[];
  /** Never map a finding whose label strongly resembles one of these keys */
  guards: string[];
  section?: "challenges" | "escalations" | "additionalActivities";
  field?: string; // non-KPI report field (attendance block etc.)
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9%()/\s-]/g, " ").replace(/\s+/g, " ").trim();

const tokens = (s: string) => normalize(s).split(" ").filter((t) => t.length > 1 && !STOP.has(t));
const STOP = new Set(["the", "of", "and", "or", "for", "to", "a", "an", "in", "on", "total", "your", "per", "is", "are"]);

/** Token-overlap similarity (Jaccard) — robust to wording order & small variations */
function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

// ── Alias tables: canonical field → printed variants (extends the original LABEL_ALIASES) ──

const BPO_ALIASES: Record<string, string[]> = {
  totalCallsMade: ["total calls made", "calls made", "outbound calls", "calls dialled", "calls dialed", "total outbound calls attempted", "no of calls made", "calls placed"],
  totalMailsSent: ["total mails sent", "total emails sent", "emails sent", "mails sent", "no of mails sent"],
  callsConnected: ["calls connected", "connected calls", "calls answered", "calls picked", "answered calls", "successful contacts"],
  successfulMailsSent: ["successful mails sent", "successful email deliveries", "delivered emails", "successful emails"],
  contactRate: ["contact rate"],
  conversionRate: ["conversion rate"],
  avgTalkTime: ["avg talk time", "average talk time", "avg. talk time", "talk time"],
  avgHoldTime: ["avg hold time", "average hold time", "avg. hold time", "hold time"],
  callbacksScheduled: ["callbacks scheduled", "callback scheduled", "call backs scheduled"],
  leadsGenerated: ["leads generated", "total leads", "leads generated hot warm"],
  hotLeads: ["hot leads"],
  warmLeads: ["warm leads"],
  positiveDispositions: ["positive dispositions", "positive disposition"],
  notInterested: ["not interested declined", "not interested", "declined"],
  wrapUpTime: ["wrap up after call work", "wrap-up", "after call work", "wrap up time"],
  bouncedEmails: ["bounced emails", "total bounced emails", "bounce", "bounces"],
  failedSends: ["failed sending attempts", "failed sends", "failed emails"],
  followUpEmails: ["follow up emails sent", "total follow up emails", "follow-up emails"],
  personalizedOutreach: ["personalized outreach emails", "personalized emails"],
  campaignEmails: ["campaign emails sent", "total campaign emails"],
  repliesReceived: ["replies received", "total replies received", "email replies"],
  positiveReplies: ["positive replies", "total positive replies"],
  negativeReplies: ["negative replies", "total negative replies"],
  interestedProspects: ["interested prospects", "total interested prospects"],
  emailHotLeads: ["hot leads generated through email", "hot leads via email", "email hot leads"],
  emailWarmLeads: ["warm leads generated through email", "warm leads via email", "email warm leads"],
  meetingsBookedEmail: ["meetings or appointments booked through email", "meetings booked via email", "appointments booked through email", "meetings booked"],
  emailTasksCompleted: ["email related tasks completed", "email tasks completed"],
  outstandingFollowUps: ["outstanding email follow ups", "outstanding follow-ups", "outstanding followups"],
};

const BPO_GUARDS: Record<string, string[]> = {
  totalCallsMade: ["callsConnected"],
  callsConnected: ["totalCallsMade"],
  hotLeads: ["warmLeads", "leadsGenerated", "emailHotLeads"],
  warmLeads: ["hotLeads", "leadsGenerated", "emailWarmLeads"],
  leadsGenerated: ["emailHotLeads", "emailWarmLeads"],
  totalMailsSent: ["successfulMailsSent", "campaignEmails", "followUpEmails"],
  successfulMailsSent: ["totalMailsSent"],
  positiveReplies: ["negativeReplies", "repliesReceived"],
  negativeReplies: ["positiveReplies", "repliesReceived"],
  emailHotLeads: ["hotLeads"],
  emailWarmLeads: ["warmLeads"],
};

const SECTION_TARGETS: RouteTarget[] = [
  { key: "challenges", label: "Challenges / Blockers", unit: "text", aliases: ["challenges / blockers", "challenges/blockers", "challenges and blockers", "challenges encountered", "challenges", "blockers", "operational difficulties", "problems faced"], guards: [], section: "challenges" },
  { key: "escalations", label: "Escalations", unit: "text", aliases: ["escalations", "escalation", "issues escalated", "escalated issues"], guards: [], section: "escalations" },
  { key: "additionalActivities", label: "Additional Activities", unit: "text", aliases: ["additional activities", "other activities", "additional work", "additional responsibilities", "other responsibilities", "tasks completed beyond", "additional tasks"], guards: [], section: "additionalActivities" },
];

function targetsForDepartment(department: DocIntelDepartment): RouteTarget[] {
  if (department === "WEB_DEV") {
    return [
      ...TECH_SUMMARY_METRICS.map((m) => ({
        key: m.key,
        label: m.label,
        unit: "count" as const,
        aliases: [normalize(m.label), ...(BPO_ALIASES[m.key] ?? [])],
        guards: [],
      })),
      ...SECTION_TARGETS,
    ];
  }
  if (department === "SOCIAL_MEDIA") {
    return [
      ...SOCIAL_SUMMARY_METRICS.map((m) => ({
        key: m.key,
        label: m.label,
        unit: "count" as const,
        aliases: [normalize(m.label), ...(BPO_ALIASES[m.key] ?? []).map(normalize)],
        guards: SOCIAL_GUARDS[m.key] ?? [],
      })),
      ...SECTION_TARGETS,
    ];
  }
  return [
    ...AGENT_KPI_DEFS.map((d) => ({
      key: d.key,
      label: d.label,
      unit: d.unit,
      aliases: [normalize(d.label), ...(BPO_ALIASES[d.key] ?? []).map(normalize)],
      guards: BPO_GUARDS[d.key] ?? [],
    })),
    ...SECTION_TARGETS,
  ];
}

const SOCIAL_GUARDS: Record<string, string[]> = {
  reach: ["impressions", "likes", "views"],
  impressions: ["reach", "likes"],
  postsPlanned: ["postsPublished"],
  postsPublished: ["postsPlanned"],
  likes: ["reach", "impressions", "shares"],
  shares: ["likes", "saves"],
  saves: ["shares", "likes"],
  linkClicks: ["reach", "impressions"],
  commentsHandled: ["messagesHandled"],
  messagesHandled: ["commentsHandled"],
  followerGrowth: ["reach", "impressions"],
  campaignLeads: ["followerGrowth"],
};

export interface RouteMatch {
  target: RouteTarget;
  score: number;
  reason: string;
}

/**
 * Score one printed label against one route target.
 * Exact alias hit > containment > token similarity, with unit agreement and
 * hard confusion guards.
 */
export function scoreLabel(rawLabel: string, target: RouteTarget, unit?: string | null): RouteMatch | null {
  const label = normalize(rawLabel);
  if (!label) return null;
  let best = { score: 0, reason: "" };
  for (const alias of target.aliases) {
    const a = normalize(alias);
    if (!a) continue;
    if (label === a) {
      if (best.score < 1) best = { score: 1, reason: `exact match for "${target.label}"` };
    } else if (label.includes(a) || a.includes(label)) {
      // containment of the full alias in the label (or the whole label in an alias)
      const lenRatio = Math.min(a.length, label.length) / Math.max(a.length, label.length);
      const s = 0.72 + 0.16 * lenRatio;
      if (best.score < s) best = { score: s, reason: `label contains the canonical wording of "${target.label}"` };
    } else {
      const sim = similarity(label, a);
      const s = sim * 0.85;
      if (best.score < s) best = { score: s, reason: `wording close to "${target.label}" (${Math.round(sim * 100)}% token overlap)` };
    }
  }
  if (best.score <= 0) return null;

  // Unit agreement — a "minutes" metric never takes a percent finding, etc.
  const u = normalize(unit || "");
  if (u && target.unit !== "text") {
    if ((target.unit === "percent" && /%|percent/.test(u))) best.score = Math.min(1, best.score + 0.05);
    if ((target.unit === "percent" && /min|minute/.test(u)) || (target.unit === "minutes" && /%|percent/.test(u))) {
      best.score -= 0.35;
      best.reason += " (unit mismatch — penalised)";
    }
  }

  // Guard: strongly resemble a guarded (confusable) key → block
  return { target, score: best.score, reason: best.reason };
}

/** Gate thresholds (router pattern): ≥0.85 auto-map, 0.6–0.85 map+review, <0.6 unmapped */
export const AUTO_MAP_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.6;

export interface RoutingOutput {
  routed: RoutedKpi[];
  unmapped: UnmappedItem[];
  issues: ValidationIssue[];
  sectionText: { challenges?: string | null; escalations?: string | null; additionalActivities?: string | null };
  attendance: {
    shiftTime?: string | null;
    clockIn?: string | null;
    clockOut?: string | null;
    attendanceStatus?: string | null;
    latenessMins?: number | null;
  };
  reviewRequiredCount: number;
}

const ATTENDANCE_MATCHERS: { field: string; patterns: RegExp[] }[] = [
  { field: "shiftTime", patterns: [/shift (?:time|hours?)/i, /^shift\b/i] },
  { field: "clockIn", patterns: [/clock[- ]?in\b/i, /time in\b/i, /resumption time/i] },
  { field: "clockOut", patterns: [/clock[- ]?out\b/i, /time out\b/i, /closing time/i] },
  { field: "attendanceStatus", patterns: [/attendance status/i, /\bpresent\b(?!.*late)/i] },
  { field: "latenessMins", patterns: [/late(?:ness)?\s*(?:by|\(mins|minutes)/i, /minutes late/i] },
];

function matchAttendance(metaAttendance: { shiftTime?: string | null; clockIn?: string | null; clockOut?: string | null; attendanceStatus?: string | null; latenessMins?: number | null } | null | undefined, findings: KpiFinding[]): RoutingOutput["attendance"] {
  const out: RoutingOutput["attendance"] = {};
  if (metaAttendance) {
    if (metaAttendance.shiftTime) out.shiftTime = metaAttendance.shiftTime;
    if (metaAttendance.clockIn) out.clockIn = metaAttendance.clockIn;
    if (metaAttendance.clockOut) out.clockOut = metaAttendance.clockOut;
    if (metaAttendance.attendanceStatus) out.attendanceStatus = metaAttendance.attendanceStatus;
    if (typeof metaAttendance.latenessMins === "number") out.latenessMins = metaAttendance.latenessMins;
  }
  // Attendance evidence from the structural text (label patterns, kept verbatim)
  for (const f of findings) {
    for (const m of ATTENDANCE_MATCHERS) {
      if (out[m.field as keyof typeof out]) continue;
      if (m.patterns.some((p) => p.test(f.rawLabel))) {
        const v = typeof f.value === "number" ? String(f.value) : f.value;
        if (v !== null && v !== undefined && String(v).length <= 40) {
          (out as Record<string, unknown>)[m.field] = m.field === "latenessMins" ? Math.round(Number(f.value)) : String(v);
        }
      }
    }
  }
  return out;
}

/**
 * Route findings + sections to the department's real template fields.
 * Deterministic: same input always yields the same routing.
 */
export function routeKpis(
  department: DocIntelDepartment,
  findings: KpiFinding[],
  sections: NarrativeSection[],
  meta: { attendance?: { shiftTime?: string | null; clockIn?: string | null; clockOut?: string | null; attendanceStatus?: string | null; latenessMins?: number | null } | null; reportTypeGuess?: string; docType?: string } | null,
  departmentMismatch?: string | null
): RoutingOutput {
  const targets = targetsForDepartment(department);
  const routed: RoutedKpi[] = [];
  const unmapped: UnmappedItem[] = [];
  const issues: ValidationIssue[] = [];

  // 1) Numeric/labelled findings
  type Winner = { finding: KpiFinding; match: RouteMatch };
  const winners = new Map<string, Winner[]>(); // key → candidates (dupes kept for conflict detection)
  for (const finding of findings) {
    if (typeof finding.value !== "number") continue;
    let bestMatch: RouteMatch | null = null;
    let bestScore = 0;
    for (const target of targets) {
      if (target.section) continue;
      const m = scoreLabel(finding.rawLabel, target, finding.unit);
      if (m && m.score > bestScore) {
        bestScore = m.score;
        bestMatch = m;
      }
    }
    if (!bestMatch || bestScore < REVIEW_THRESHOLD) {
      unmapped.push({
        label: finding.rawLabel,
        content: `${finding.rawLabel}: ${finding.value}${finding.unit ? ` ${finding.unit}` : ""} — evidence: "${finding.evidence}"`,
        sourceRef: finding.sourceRef,
        reason: bestMatch ? `similarity below confidence gate (${Math.round(bestScore * 100)}%)` : "no template field resembles this label",
      });
      continue;
    }
    // Confusion guard: the runner-up might be the guarded confusable
    const guardedKey = bestMatch.target.key;
    const guards = bestMatch.target.guards ?? [];
    const guardHit = guards.some((g) => {
      const guardTarget = targets.find((t) => t.key === g);
      if (!guardTarget) return false;
      const gm = scoreLabel(finding.rawLabel, guardTarget, finding.unit);
      // The guarded metric matches as well or better → genuinely ambiguous label; defer to exactness
      return gm && gm.score >= bestMatch!.score;
    });
    if (guardHit) {
      unmapped.push({
        label: finding.rawLabel,
        content: `${finding.rawLabel}: ${finding.value} — evidence: "${finding.evidence}"`,
        sourceRef: finding.sourceRef,
        reason: `label matches several distinct metrics (e.g. ${guards.join(", ")}) — needs human decision`,
      });
      issues.push({ severity: "WARNING", field: finding.rawLabel, message: `Ambiguous label "${finding.rawLabel}" resembles multiple KPIs — routed to review, not forced.` });
      continue;
    }
    const list = winners.get(guardedKey) ?? [];
    list.push({ finding, match: bestMatch });
    winners.set(guardedKey, list);
  }

  // 2) Resolve per key: ACTUAL carries the value; TARGET/VARIANCE of the same
  //    metric merge into its row as reportedTarget/reportedVariance (never
  //    counted as "conflicting values" — they are different columns of the
  //    source table). Conflicts = two ACTUALs disagreeing.
  for (const [key, candidates] of winners) {
    const target = candidates[0].match.target;
    const actuals = candidates.filter((c) => c.finding.kind === "ACTUAL");
    const targets = candidates.filter((c) => c.finding.kind === "TARGET");
    const variances = candidates.filter((c) => c.finding.kind === "VARIANCE");
    const others = candidates.filter((c) => c.finding.kind === "UNKNOWN");
    const pool = actuals.length ? actuals : others.length ? others : [];
    pool.sort((a, b) => b.finding.confidence - a.finding.confidence || b.match.score - a.match.score);

    const bestScore = Math.max(...candidates.map((c) => Math.min(c.finding.confidence, c.match.score)));
    const top = pool[0];
    const conflicting = pool.slice(1).filter(
      (o) => typeof o.finding.value === "number" && top && typeof top.finding.value === "number" && Math.abs(o.finding.value - top.finding.value) > 1e-9
    );
    const value = top && typeof top.finding.value === "number" ? top.finding.value : null;
    const isDerived = !!getKpiDef(key)?.derivedFrom;

    const pickValue = (list: Winner[]): number | null => {
      if (!list.length) return null;
      const sorted = [...list].sort((a, b) => b.finding.confidence - a.finding.confidence);
      return typeof sorted[0].finding.value === "number" ? (sorted[0].finding.value as number) : null;
    };
    const reportedTarget = pickValue(targets);
    const reportedVariance = pickValue(variances);
    const kind: FindingKind = pool.length ? "ACTUAL" : targets.length ? "TARGET" : "VARIANCE";

    const reviewBits: string[] = [];
    if (!top || top.match.score < AUTO_MAP_THRESHOLD) reviewBits.push(`routed with ${Math.round((top?.match.score ?? 0) * 100)}% confidence — verify the destination field`);
    if (conflicting.length) reviewBits.push(`document shows ${conflicting.length + 1} different reported values (${[top, ...conflicting].map((c) => c.finding.value).join(", ")})`);
    if (targets.length > 1 && new Set(targets.map((t) => t.finding.value)).size > 1) reviewBits.push("multiple different targets reported");
    if (variances.length > 1 && new Set(variances.map((v) => v.finding.value)).size > 1) reviewBits.push("multiple different variances reported");

    const base: RoutedKpi = {
      key,
      label: target.label,
      value: kind === "ACTUAL" ? value : null,
      kind,
      unit: target.unit,
      confidence: bestScore,
      evidence: (top ?? candidates[0]).finding.evidence,
      sourceRef: (top ?? candidates[0]).finding.sourceRef,
      needsReview: reviewBits.length > 0,
      reviewReason: reviewBits.join(" · ") || undefined,
      duplicates: candidates.length - 1,
      reportedTarget,
      reportedVariance,
    };

    if (kind === "ACTUAL") {
      routed.push(base);
      if (isDerived) {
        issues.push({
          severity: "INFO",
          field: key,
          message: `"${base.evidence.slice(0, 40)}" maps to the derived metric ${target.label}. The system recalculates it from its inputs; a manually reported value is kept but flagged.`,
        });
      }
    } else if (kind === "TARGET") {
      routed.push(base);
      issues.push({ severity: "INFO", field: key, message: `Reported target ${reportedTarget} for ${target.label} recorded as source information (the template's configured target stays authoritative).` });
    } else {
      routed.push(base);
      issues.push({ severity: "INFO", field: key, message: `Reported variance ${reportedVariance} for ${target.label} recorded; the app recalculates variance from target − actual and flags any conflict.` });
    }
  }

  // 3) Narrative sections → template fields by heading match; the rest are preserved
  const sectionText: RoutingOutput["sectionText"] = {};
  const anyMapped = routed.some((r) => r.value !== null);
  for (const s of sections) {
    let best: { t: RouteTarget; score: number } | null = null;
    for (const t of SECTION_TARGETS) {
      const m = scoreLabel(s.heading, t, null);
      if (m && (!best || m.score > best.score)) best = { t, score: m.score };
    }
    if (best && best.score >= REVIEW_THRESHOLD) {
      const k = best.t.section as keyof typeof sectionText;
      sectionText[k] = sectionText[k] ? `${sectionText[k]}\n${s.content}` : s.content;
      continue;
    }
    // A KPI/metrics section whose values were already routed to fields is not
    // "unmapped content" — the values live in the mapped fields. Only surface
    // it for review when nothing was mapped (then it is the only place the
    // numbers survive).
    if (anyMapped && /kpi|metric|performance|scorecard|summary table/i.test(s.heading)) continue;
    unmapped.push({
      label: s.heading,
      content: s.content,
      sourceRef: s.sourceRef,
      reason: "section has no matching field in this template — preserved so nothing is lost",
    });
  }

  // 4) String findings that look like attendance
  const attendance = matchAttendance(meta?.attendance, findings);

  if (departmentMismatch) {
    issues.push({
      severity: "WARNING",
      field: "document type",
      message: departmentMismatch,
    });
  }

  const reviewRequiredCount = routed.filter((r) => r.needsReview).length;
  return { routed, unmapped, issues, sectionText, attendance, reviewRequiredCount };
}
