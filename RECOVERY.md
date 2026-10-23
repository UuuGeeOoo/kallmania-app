# Kallmania — Disaster Recovery & Work Safety

## Why work was lost before (2026-10-21 incident)

Interface work built after checkpoint V5 (`871eaf4`, Oct 20, 10:23 PM) was never
committed before the session sandbox was recycled. The next session opened from
V5 and the newer UI work was gone. Data was NOT lost (Supabase cloud DB held
everything), only source code.

## Rules that prevent this from happening again

1. **Commit after every work stage** — the agent runs `scripts/autosave.sh "<what was done>"`
   at the end of every task. Never leave uncommitted work at session end.
2. **Offsite backup (user-owned)** — push to a private GitHub/GitLab remote after each
   milestone. See "Remote setup" below. A sandbox can be recycled at any moment;
   a remote cannot.
3. **Database lives outside the sandbox** — all authoritative data stays in Supabase
   (already the case since the cloud migration). Never keep the only copy of real
   data in local SQLite.
4. **Keep `worklog.md` current** — every session appends what it did, so any future
   session can understand the state in one read.
5. **Session start ritual** — before working, a new session should check:
   `git log --oneline -5`, `git status`, and read `worklog.md` tail.

## Remote setup (one-time, user action)

1. Create a free **private** repository on GitHub (e.g. `kallmania-app`).
2. Generate a Personal Access Token (Settings → Developer settings → Tokens).
3. Paste the remote URL + token into the chat; the agent runs:
   ```
   git remote add origin https://<token>@github.com/<user>/kallmania-app.git
   git push -u origin main
   ```
4. From then on the agent pushes after every autosave checkpoint.

## Restoring into a fresh session (if a sandbox is ever lost again)

```
git clone https://<token>@github.com/<user>/kallmania-app.git
cd kallmania-app
npm install
npx prisma generate
node scripts/dev-daemon.js
```
Database connection details live in `.env` (KALLMANIA / DIRECT URLs to Supabase).
If `.env` was lost, re-create it from the Supabase project dashboard
(Project Settings → Database → Connection string / Session pooler).

## Current state pointers

- Live DB: Supabase Postgres (all 10 users, tasks, reports verified 2026-10-21).
- Delete-user flow: fixed 2026-10-21 (transactional purge + confirm dialog + toasts).
- Branding: "Kallmania — SBTS Group Global" only; all ICBM references removed.
