import { geminiGenerateJson, geminiConfigured, geminiModel } from "@/lib/gemini";
import type { AiCommentary, IntelFinding } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// AI-GENERATED MANAGEMENT COMMENTARY — Google Gemini.
//
// Guardrails (per the operational-intelligence brief):
//  - The model is supplied ONLY with verified, pre-calculated figures produced
//    by application logic; it is instructed never to invent numbers.
//  - Every claim must reference the evidence supplied; the output is shaped to
//    narrative + recommendations only — all statistics remain app-computed.
//  - Commentary is clearly labelled as AI interpretation, separate from the
//    objective measurements, and recommendations are labelled as such.
//  - When Gemini is unavailable (no key, quota, region restriction) a
//    deterministic rule-based commentary built from the same verified
//    findings is used instead and the engine note is surfaced.
// ─────────────────────────────────────────────────────────────────────────────

interface CommentaryShape {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  risks?: string[];
  recommendations?: string[];
}

const SYSTEM = `You are an operations analyst writing management commentary for a BPO performance report.
You receive ONLY verified, pre-calculated statistics from the reporting application.
Rules you must never break:
- Use ONLY the figures provided. NEVER invent, estimate or extrapolate numbers.
- Every strength/weakness/risk sentence must cite the evidence behind it (reference the figures given).
- Do not make allegations about people; describe measurable patterns only.
- Keep each bullet to one or two sentences, professional corporate tone.
- Recommendations are suggestions for management, not established facts.
Respond as JSON: { summary: string, strengths: string[], weaknesses: string[], risks: string[], recommendations: string[] }.`;

function digest(facts: Record<string, unknown>): string {
  return JSON.stringify(facts, null, 1);
}

/** Deterministic commentary built from verified findings (fallback + baseline). */
export function ruleBasedCommentary(
  subject: string,
  facts: Record<string, unknown>,
  strengths: IntelFinding[],
  weaknesses: IntelFinding[],
  risks: IntelFinding[],
): AiCommentary {
  const recommendations = [...weaknesses.slice(0, 4).map((w) => `${w.title} — address using the recorded evidence: ${w.evidence}`)];
  if (risks.length) recommendations.push(`${risks[0].title} — assign an owner and review at the next operational meeting.`);
  return {
    source: "rule-based",
    summary: `Evidence-based assessment for ${subject}: ${strengths.length} measured strength(s) and ${weaknesses.length} measured weakness(es) in the selected period, from application records only.`,
    strengths: strengths.map((s) => `${s.title} — ${s.evidence}`),
    weaknesses: weaknesses.map((w) => `${w.title} — ${w.evidence}`),
    risks: risks.map((r) => `${r.title} — ${r.evidence}`),
    recommendations,
  };
}

export async function aiCommentary(
  subject: string,
  facts: Record<string, unknown>,
  strengths: IntelFinding[],
  weaknesses: IntelFinding[],
  risks: IntelFinding[],
): Promise<AiCommentary> {
  const fallback = ruleBasedCommentary(subject, facts, strengths, weaknesses, risks);
  if (!geminiConfigured()) {
    return { ...fallback, engineNote: "Gemini commentary not enabled — set GEMINI_API_KEY on the server. Showing the rule-based assessment built from the same verified figures." };
  }
  try {
    const res = await geminiGenerateJson<CommentaryShape>(
      SYSTEM,
      `Subject: ${subject}\nVerified statistics (the only figures you may reference):\n${digest(facts)}\n\nApp-computed findings:\nStrengths: ${JSON.stringify(strengths)}\nWeaknesses: ${JSON.stringify(weaknesses)}\nRisks: ${JSON.stringify(risks)}\n\nWrite the management commentary.`,
      { timeoutMs: 45_000, maxOutputTokens: 4096, temperature: 0.3, retries: 1 },
    );
    if (!res.ok || !res.data) {
      return { ...fallback, engineNote: `Gemini commentary unavailable (${res.error ?? "unknown error"}) — showing the rule-based assessment built from the same verified figures.` };
    }
    const d = res.data;
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8) : []);
    return {
      source: "gemini",
      summary: typeof d.summary === "string" && d.summary.trim() ? d.summary.trim() : fallback.summary,
      strengths: arr(d.strengths).length ? arr(d.strengths) : fallback.strengths,
      weaknesses: arr(d.weaknesses).length ? arr(d.weaknesses) : fallback.weaknesses,
      risks: arr(d.risks).length ? arr(d.risks) : fallback.risks,
      recommendations: arr(d.recommendations).length ? arr(d.recommendations) : fallback.recommendations,
    };
  } catch (e) {
    return { ...fallback, engineNote: `Gemini commentary unavailable (${(e as Error).message}) — showing the rule-based assessment.` };
  }
}

export function aiEngineLabel(): string {
  return geminiConfigured() ? `Google Gemini (${geminiModel()})` : "rule-based (GEMINI_API_KEY not configured)";
}
