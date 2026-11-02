// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE GEMINI CLIENT — server-side only.
//
// The primary AI engine for the document-intelligence extraction pipeline
// (document understanding + image OCR). Never import from client components;
// the API key is read from the server-side environment (GEMINI_API_KEY) and is
// never hardcoded, never sent to the browser, never logged.
//
// Configuration (server-side environment):
//   GEMINI_API_KEY  — Google AI Studio API key (required to enable Gemini)
//   GEMINI_MODEL    — model id, default "gemini-flash-latest" (configurable so
//                     a retired model id never breaks the pipeline)
//
// Error handling per spec: timeouts, retry with backoff on transient failures
// (429/5xx/network), short UI-safe error reasons (no secrets, no document
// contents), and a hard no-retry on configuration errors (invalid key).
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiResult<T> {
  ok: boolean;
  data?: T;
  text?: string;
  /** Short, UI-safe failure reason — safe to show in the review interface. */
  error?: string;
  /** True when a later retry may succeed (quota, service error, timeout). */
  retryable?: boolean;
  httpStatus?: number;
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel(): string {
  return (process.env.GEMINI_MODEL || "gemini-flash-latest").trim();
}

interface GeminiApiError {
  error?: { code?: number; message?: string; status?: string };
}

/** Map an API failure to a short UI-safe reason + retryability. */
function mapFailure(status: number, payload: unknown): { error: string; retryable: boolean } {
  const msg =
    (payload as GeminiApiError)?.error?.message ||
    `HTTP ${status}`;
  const m = msg.toLowerCase();
  if (m.includes("api key not valid") || m.includes("api_key_invalid"))
    return { error: "Gemini API key rejected — check the server-side GEMINI_API_KEY configuration", retryable: false };
  if (m.includes("location is not supported") || m.includes("user location"))
    return { error: "Gemini is not available from this server's region (Google geo-restriction)", retryable: false };
  if (m.includes("no longer available") || m.includes("not found"))
    return { error: `Gemini model "${geminiModel()}" is unavailable for this key/region — set GEMINI_MODEL to a supported model`, retryable: false };
  if (status === 429 || m.includes("quota") || m.includes("rate limit") || m.includes("resource_exhausted"))
    return { error: "Gemini quota/rate limit reached", retryable: true };
  if (m.includes("permission") || m.includes("permission_denied"))
    return { error: "Gemini API key lacks permission for this model", retryable: false };
  if (status >= 500)
    return { error: `Gemini service error (HTTP ${status})`, retryable: true };
  return { error: `Gemini request failed (HTTP ${status})`, retryable: false };
}

interface CallOptions {
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  /** Extra retry attempts for transient failures (default 2 → 3 calls total). */
  retries?: number;
}

async function callGemini(
  parts: unknown[],
  system: string | null,
  opts: CallOptions,
): Promise<GeminiResult<string>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "Gemini is not configured on the server (GEMINI_API_KEY missing)", retryable: false };

  const model = encodeURIComponent(geminiModel());
  const url = `${API_BASE}/models/${model}:generateContent`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.15,
      maxOutputTokens: opts.maxOutputTokens ?? 16384,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const timeoutMs = opts.timeoutMs ?? 120_000;
  const retries = opts.retries ?? 2;
  let last: { error: string; retryable: boolean; status?: number } | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 4000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        const candidates = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates;
        const text = (candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
        if (!text) {
          const reason = (payload as { candidates?: { finishReason?: string }[] })?.candidates?.[0]?.finishReason;
          last = { error: reason === "SAFETY" ? "Gemini blocked the response (safety filter)" : "Gemini returned an empty response", retryable: true };
          continue;
        }
        return { ok: true, text };
      }
      const mapped = mapFailure(res.status, payload);
      last = { ...mapped, status: res.status };
      if (!mapped.retryable) return { ok: false, error: mapped.error, retryable: false, httpStatus: res.status };
    } catch (e) {
      clearTimeout(timer);
      const aborted = (e as Error).name === "AbortError";
      last = aborted
        ? { error: `Gemini request timed out after ${Math.round(timeoutMs / 1000)}s`, retryable: true }
        : { error: "Gemini could not be reached (network error)", retryable: true };
    }
  }
  return { ok: false, error: last?.error || "Gemini request failed", retryable: last?.retryable, httpStatus: last?.status };
}

/** Plain-text generation (e.g. image OCR transcription). */
export function geminiGenerateText(system: string, user: string, opts?: CallOptions): Promise<GeminiResult<string>> {
  return callGemini([{ text: user }], system, { ...opts, jsonMode: false });
}

/** Vision generation — inline image + instruction (document OCR). */
export function geminiVisionText(prompt: string, imageBase64: string, mimeType: string, opts?: CallOptions): Promise<GeminiResult<string>> {
  return callGemini([{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }], null, { ...opts, jsonMode: false });
}

const stripFences = (s: string) => s.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

/** JSON-mode generation with strict parsing (fence-stripping + brace-slice). */
export async function geminiGenerateJson<T>(system: string, user: string, opts?: CallOptions): Promise<GeminiResult<T>> {
  const res = await callGemini([{ text: user }], system, { ...opts, jsonMode: true });
  if (!res.ok || !res.text) return { ok: false, error: res.error, retryable: res.retryable, httpStatus: res.httpStatus };
  const cleaned = stripFences(res.text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return { ok: true, data: JSON.parse(slice) as T };
  } catch {
    return { ok: false, error: "Gemini returned unparseable JSON", retryable: true };
  }
}
