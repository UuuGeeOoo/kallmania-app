#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Kallmania self-healing production runtime for the preview (:3000).
#
# Why: the user-facing preview was served by `next dev` (Turbopack). Dev mode
# compiles every route on demand (5–12s white screen on first hit / after any
# restart), grows past 1GB RSS, and dies with the sandbox recycle — the direct
# cause of "takes a long time to load" and "sometimes doesn't load at all".
# This script serves the PRODUCTION standalone build instead: ~1s boot, every
# page load in double-digit milliseconds, a fraction of the memory.
#
# Self-healing:
#   - restores .env from the committed Supabase fallback if the platform's
#     workspace sync wiped it (the recurring corruption from worklog Task 43)
#   - rebuilds when the standalone output is missing or older than src/
#   - health-checks after boot; falls back to the dev daemon on failure so
#     the preview is never left dead
#
# Usage: bash scripts/serve-prod.sh [--build]   (FORCE_BUILD=1 to skip staleness check)
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd /home/z/my-project

FALLBACK_URL='postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs&connection_limit=5&pool_timeout=20'
LOG=/home/z/my-project/server.log

log() { echo "[serve-prod] $*"; }

# ── 1. Heal .env (CLI tools read it directly; the app has an in-code guard) ──
if [ ! -s .env ] || ! grep -q '^DATABASE_URL=postgresql://' .env 2>/dev/null; then
  log ".env missing or not a postgres URL — restoring Supabase URL"
  echo "DATABASE_URL=$FALLBACK_URL" > .env
fi

# ── 2. Stop whatever occupies :3000 (dev server, old prod server) ──
pkill -f "next-server" 2>/dev/null && sleep 1
pkill -f "next dev" 2>/dev/null && sleep 1
pkill -f ".next/standalone/server.js" 2>/dev/null && sleep 1
fuser -k 3000/tcp 2>/dev/null && sleep 1
log "port 3000 cleared"

# ── 3. Build when needed ──
need_build=0
if [ "${FORCE_BUILD:-0}" = "1" ] || [ "${1:-}" = "--build" ]; then
  need_build=1
elif [ ! -f .next/standalone/server.js ]; then
  need_build=1
else
  newer=$(find src prisma/migrations -newer .next/standalone/server.js -type f 2>/dev/null | head -1)
  [ -n "$newer" ] && need_build=1
fi

if [ "$need_build" = "1" ]; then
  BUILD_ID_VALUE="${BUILD_ID:-prod$(date +%m%d%H%M)}"
  log "building production bundle (BUILD_ID=$BUILD_ID_VALUE)…"
  NEXT_TELEMETRY_DISABLED=1 BUILD_ID="$BUILD_ID_VALUE" bun run build > /tmp/serve-prod-build.log 2>&1
  if [ $? -ne 0 ]; then
    log "BUILD FAILED — tail of build log:"; tail -20 /tmp/serve-prod-build.log
    log "falling back to the dev daemon so the preview stays alive"
    node scripts/dev-daemon.js
    exit 2
  fi
  # The standalone server loads .env from its own directory (platform build
  # convention) — keep the healed URL next to it.
  cp .env .next/standalone/.env 2>/dev/null
  log "build complete"
fi

# ── 4. Start the standalone server ──
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
nohup bun .next/standalone/server.js >> "$LOG" 2>&1 &
PROD_PID=$!
log "standalone server starting (pid $PROD_PID)…"

# ── 5. Health check with budget; fall back to dev if it never comes up ──
ok=0
for i in $(seq 1 30); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then ok=1; break; fi
done

if [ "$ok" = "1" ]; then
  boot_ms=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 http://localhost:3000/ 2>/dev/null)
  log "HEALTHY — GET / 200 (warm check ${boot_ms}s). Production runtime live on :3000 (pid $(pgrep -f '.next/standalone/server.js' | head -1))"
  exit 0
fi

log "production server did not become healthy — falling back to the dev daemon"
node scripts/dev-daemon.js
for i in $(seq 1 45); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { log "dev fallback HEALTHY on :3000"; exit 3; }
done
log "FATAL: neither production nor dev server became healthy — check $LOG and dev.log"
exit 1
