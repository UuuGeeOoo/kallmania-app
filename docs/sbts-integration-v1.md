# SBTS Media Command Centre → Kallmania — Integration Contract v1

> Governance: the payload contract below is **frozen**. Any change ships only as a
> new version (`/api/integrations/sbts/v2/...`) with advance notice to both sides —
> never a silent edit. Scoring and the event format are owned by the Media Command
> Centre; Kallmania stores, displays and scopes. Credential material (API key +
> HMAC secret) lives in the server `.env` / the SbtsCredential table and is NEVER
> committed to this repository.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/integrations/sbts/v1/events` | Bearer key + HMAC + timestamp | Ingest performance scores and daily reports (idempotent) |
| GET  | `/api/integrations/sbts/v1/health` | none | Pipe monitoring — `{"status":"ok"}` when healthy, 503 when the DB check fails |
| GET  | `/api/integrations/sbts/v1/credentials` | ADMIN session | Pipe status: credential hints, 24 h event counts, last event, unmapped count |
| POST | `/api/integrations/sbts/v1/credentials` | ADMIN session | `{action:"create"}` first credential (409 if one exists); `{action:"rotate","graceHours":n,"credentialId?"}` zero-downtime rotation |
| GET  | `/api/sbts/scores` | session (scoped) | Scoreboard data — agent: own only; SOCIAL team lead: own team; supervisor/admin: all + unmapped |
| GET  | `/api/sbts/reports?from&to&email` | session (scoped) | Daily reports — same scoping, agent email param ignored (forced self) |

## Authentication (in strict order)

1. `Authorization: Bearer <API key>` — matched against the SHA-256 digest stored in `SbtsCredential` (plaintext never stored).
2. `X-SBTS-Timestamp` — unix seconds or milliseconds; `|now − ts| > 300 s` → 401 (5-minute freshness window).
3. `X-SBTS-Signature` — lowercase hex `hmac_sha256(secret, rawBody)` (optional `sha256=` prefix), constant-time compare.

Revoked credentials keep verifying until `graceUntil` (rotation grace window, default 24 h) so the pipe never breaks mid-rotation.

## Event envelope (v1)

```
{
  "eventId": "sbts-20261104-000123",      // unique forever — idempotency key
  "type": "performance.score",            // or "daily.report"
  "agent": { "email": "agent@kallmania.com" },  // exact, case-insensitive match
  "date": "2026-11-04",                   // business date YYYY-MM-DD, ≤ +2 days ahead
  "sentAt": "2026-11-04T09:35:12Z"        // optional, informational
}
```

- `performance.score`: `score` (0–100, required), `delta` (optional), `components` (object, ≤ 25 finite-number keys, optional).
- `daily.report`: `report` (required, non-empty, ≤ 20 000 chars).
- Limits: body ≤ 1 MB, batch ≤ 100 events (`{"events":[...]}`), `eventId` ≤ 128 chars.
- Unmapped emails are stored flagged (`matched=false`) and surfaced to admins — the pipe never breaks on a roster miss.
- Response: always 200 once authenticated, with per-item `stored | duplicate | rejected` results.

## Display rules

- Latest score per agent = highest `eventDate`, tie-break most recently received.
- Scoreboard (`SBTS Scores` nav item): 0–100 animated bars, delta chip, component chips, 30 s polling.
- Reports visibility: agent → own (matched by account email); SOCIAL team lead → own team; supervisor/admin → all.
- Data fixes: `opeace@kallmainia.com` (typo domain) was corrected to `opeace@kallmania.com` on 2026-11-03.

## Verification

- `scripts/e2e-sbts.ts` — 45-check API suite (auth gates, idempotency, validation, scoping, rotation).
- `scripts/e2e-sbts-browser.mjs` — 14-check real-browser suite (hero card, isolation, admin grid, rotation button).
- `scripts/sbts-live-smoke.ts` — signed round-trip with the production credential (env-provided), cleans up after itself.
- `scripts/sbts-credentials.ts` — `create | rotate [graceHours] | status` CLI.
