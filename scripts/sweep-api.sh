#!/usr/bin/env bash
# Full API surface sweep — verify NO database errors anywhere after the env fix.
set -u
BASE="http://localhost:3000"
JAR="/tmp/sweep.jar"
PASS=0; FAIL=0
declare -a FAILURES

req() { # method path [postbody]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -b "$JAR" -c "$JAR" -X "$method" "$BASE$path" -H 'Content-Type: application/json' -d "$body" --max-time 30 -w "\n%{http_code}"
  else
    curl -s -b "$JAR" -c "$JAR" -X "$method" "$BASE$path" --max-time 30 -w "\n%{http_code}"
  fi
}

check() { # name response expected_code
  local name="$1" resp="$2" want="$3"
  local code body
  code="$(printf '%s' "$resp" | tail -n1)"
  body="$(printf '%s' "$resp" | head -n -1)"
  if [ "$code" = "$want" ] && ! printf '%s' "$body" | grep -qiE "Environment variable not found|PrismaClient is not configured|Invalid .prisma|error: "; then
    PASS=$((PASS+1)); printf '  ✔ %-52s %s\n' "$name" "$code"
  else
    FAIL=$((FAIL+1)); FAILURES+=("$name ($code): $(printf '%s' "$body" | head -c 160)")
    printf '  ✘ %-52s %s\n' "$name" "$code"
  fi
}

echo "── auth ─────────────────────────────────────────"
R=$(req POST /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
check "POST /api/auth (login)" "$R" 200
R=$(req GET /api/auth)
check "GET  /api/auth (me)" "$R" 200

echo "── dashboard / users / kpi ──────────────────────"
R=$(req GET /api/dashboard);            check "GET  /api/dashboard" "$R" 200
R=$(req GET /api/users);                check "GET  /api/users" "$R" 200
R=$(req GET "/api/kpi/summary?period=day");   check "GET  /api/kpi/summary?period=day" "$R" 200
R=$(req GET "/api/kpi/summary?period=week");  check "GET  /api/kpi/summary?period=week" "$R" 200
R=$(req GET "/api/kpi/summary?period=month"); check "GET  /api/kpi/summary?period=month" "$R" 200
R=$(req GET "/api/kpi/summary?period=year");  check "GET  /api/kpi/summary?period=year" "$R" 200
R=$(req GET "/api/kpi/summary?period=year&country=NG&state=Rivers"); check "GET  /api/kpi/summary?country=NG&state=Rivers" "$R" 200

UID_=$(req GET /api/users | head -n -1 | python3 -c "import json,sys; print(json.load(sys.stdin)['users'][0]['id'])" 2>/dev/null)
R=$(req GET "/api/users/$UID_/kpi?period=year"); check "GET  /api/users/[id]/kpi?period=year" "$R" 200

echo "── kpi-config (all 4 departments) ───────────────"
for d in BPO INBOUND WEB_DEV SOCIAL_MEDIA; do
  R=$(req GET "/api/kpi-config?department=$d"); check "GET  /api/kpi-config?department=$d" "$R" 200
done

echo "── reports / tasks / notifications / escalations ─"
R=$(req GET "/api/reports?mine=1");     check "GET  /api/reports?mine=1" "$R" 200
R=$(req GET "/api/reports");            check "GET  /api/reports (queue)" "$R" 200
R=$(req GET /api/tasks);                check "GET  /api/tasks" "$R" 200
R=$(req GET /api/notifications);        check "GET  /api/notifications" "$R" 200
R=$(req GET /api/escalations);          check "GET  /api/escalations" "$R" 200
R=$(req GET "/api/consolidated?date=$(date +%F)"); check "GET  /api/consolidated?date=today" "$R" 200

echo "── uploads / export / geo / audit / template / health ──"
R=$(req GET /api/uploads);              check "GET  /api/uploads" "$R" 200
RID=$(req GET "/api/reports?mine=1" | head -n -1 | python3 -c "import json,sys; rs=json.load(sys.stdin).get('reports',[]); print(rs[0]['id'] if rs else '')" 2>/dev/null)
if [ -n "$RID" ]; then
  R=$(req GET "/api/export?format=docx&id=$RID"); check "GET  /api/export?format=docx" "$R" 200
  R=$(req GET "/api/export?format=xlsx&id=$RID"); check "GET  /api/export?format=xlsx" "$R" 200
  R=$(req GET "/api/export?format=csv&id=$RID");  check "GET  /api/export?format=csv" "$R" 200
fi
R=$(req GET /api/geo);                  check "GET  /api/geo (countries)" "$R" 200
R=$(req GET "/api/geo?country=NG");     check "GET  /api/geo?country=NG (states)" "$R" 200
R=$(req GET /api/audit);                check "GET  /api/audit" "$R" 200
R=$(req GET /api/report-template);      check "GET  /api/report-template" "$R" 200
R=$(req GET /api);                      check "GET  /api (health)" "$R" 200

echo "── data sanity ──────────────────────────────────"
R=$(req GET /api/geo | head -n -1)
N=$(printf '%s' "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('countries', d if isinstance(d,list) else [])))" 2>/dev/null)
printf '  ℹ countries: %s (expect 250)\n' "$N"
R=$(req GET /api/users | head -n -1)
N=$(printf '%s' "$R" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['users']))" 2>/dev/null)
printf '  ℹ users: %s\n' "$N"

echo
echo "PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then printf 'FAILED CHECKS:\n'; for f in "${FAILURES[@]}"; do echo "  - $f"; done; exit 1; fi
echo "ALL SURFACES CLEAN — no database errors."
