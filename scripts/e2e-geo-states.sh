#!/bin/bash
# E2E: countries/states registration + state-supervisor scoping
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "PASS: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL: $1"; }
check(){ if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (expected=$1 got=$2)"; fi; }

api() { # api <jar> <method> <path> [json]
  local jar="$1" m="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -b "$jar" -c "$jar" -X "$m" -H "Content-Type: application/json" -d "$d" "$BASE$p"
  else
    curl -s -b "$jar" -c "$jar" -X "$m" "$BASE$p"
  fi
}

T="$(mktemp -d)"
A="$T/admin.jar"; S="$T/sup.jar"; LA="$T/lagos.jar"; GH="$T/ghana.jar"

# ── 0. bootstrap + admin login ──
api "$A" POST /api/bootstrap >/dev/null
r=$(api "$A" POST /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
check "true" "$(echo "$r" | jq -r '.success // false')" "admin login"

# ── 1. geo endpoints ──
n=$(curl -s "$BASE/api/geo" | jq '.countries | length')
[ "$n" -ge 200 ] && ok "geo countries >= 200 ($n)" || bad "geo countries ($n)"
n=$(curl -s "$BASE/api/geo?country=Nigeria" | jq '.states | length')
[ "$n" -ge 30 ] && ok "Nigeria states ($n)" || bad "Nigeria states ($n)"
n=$(curl -s "$BASE/api/geo?country=Nigeria&state=Lagos" | jq '.cities | length')
[ "$n" -ge 1 ] && ok "Lagos cities ($n)" || bad "Lagos cities ($n)"
n=$(curl -s "$BASE/api/geo?country=GH" | jq '[.states[] | select(.name=="Greater Accra")] | length')
check "1" "$n" "Ghana has Greater Accra"

# ── 2. registrations with location ──
STAMP=$(date +%s)
SUP="sup.lagos.$STAMP@kallmania.test"; LAG="agent.lagos.$STAMP@kallmania.test"; GHA="agent.accra.$STAMP@kallmania.test"
PW='@Test1234'
r=$(api "$S" POST /api/auth "{\"action\":\"register\",\"email\":\"$SUP\",\"password\":\"$PW\",\"fullName\":\"Ada State Supervisor\",\"team\":\"OUTBOUND\",\"position\":\"SUPERVISOR\",\"country\":\"Nigeria\",\"state\":\"Lagos\",\"city\":\"Ikeja\"}")
check "true" "$(echo "$r" | jq -r '.success // false')" "register state supervisor (Nigeria/Lagos)"
r=$(api "$LA" POST /api/auth "{\"action\":\"register\",\"email\":\"$LAG\",\"password\":\"$PW\",\"fullName\":\"Tunde Lagos Agent\",\"team\":\"OUTBOUND\",\"position\":\"AGENT\",\"country\":\"Nigeria\",\"state\":\"Lagos\"}")
check "true" "$(echo "$r" | jq -r '.success // false')" "register Lagos agent"
r=$(api "$GH" POST /api/auth "{\"action\":\"register\",\"email\":\"$GHA\",\"password\":\"$PW\",\"fullName\":\"Kwame Accra Agent\",\"team\":\"OUTBOUND\",\"position\":\"AGENT\",\"country\":\"Ghana\",\"state\":\"Greater Accra\",\"city\":\"Accra\"}")
check "true" "$(echo "$r" | jq -r '.success // false')" "register Ghana agent"
r=$(api "$GH" POST /api/auth "{\"action\":\"register\",\"email\":\"x.$STAMP@k.test\",\"password\":\"$PW\",\"fullName\":\"Bad State\",\"team\":\"OUTBOUND\",\"position\":\"AGENT\",\"country\":\"Nigeria\",\"state\":\"Nowhereland\"}")
check "null" "$(echo "$r" | jq -r '.success // null')" "register with invalid state rejected"

# ── 3. admin approves all three ──
for E in "$SUP" "$LAG" "$GHA"; do
  USR=$(api "$A" GET /api/users | jq -r ".users[] | select(.email==\"$E\") | .id")
  r=$(api "$A" PATCH /api/users "{\"userId\":\"$USR\",\"action\":\"approve\"}")
  check "true" "$(echo "$r" | jq -r '.success // false')" "admin approve $E"
done
# admin sets supervisor location explicitly via setLocation (same values, exercises endpoint)
USR=$(api "$A" GET /api/users | jq -r ".users[] | select(.email==\"$SUP\") | .id")
r=$(api "$A" PATCH /api/users "{\"userId\":\"$USR\",\"action\":\"setLocation\",\"country\":\"Nigeria\",\"state\":\"Lagos\",\"city\":\"Ikeja\"}")
check "true" "$(echo "$r" | jq -r '.success // false')" "admin setLocation on supervisor"

# ── 4. logins ──
for J in "$S" "$LA" "$GH"; do :; done
api "$S" POST /api/auth "{\"action\":\"login\",\"email\":\"$SUP\",\"password\":\"$PW\"}" >/dev/null
api "$LA" POST /api/auth "{\"action\":\"login\",\"email\":\"$LAG\",\"password\":\"$PW\"}" >/dev/null
api "$GH" POST /api/auth "{\"action\":\"login\",\"email\":\"$GHA\",\"password\":\"$PW\"}" >/dev/null

# ── 5. supervisor user list scoped to Lagos ──
r=$(api "$S" GET /api/users)
INLAG=$(echo "$r" | jq "[.users[] | select(.email==\"$LAG\")] | length")
INGH=$(echo "$r" | jq "[.users[] | select(.email==\"$GHA\")] | length")
check "1" "$INLAG" "supervisor sees Lagos agent"
check "0" "$INGH" "supervisor does NOT see Ghana agent"

# ── 6. both agents submit BPO reports ──
r=$(api "$LA" POST /api/reports "{\"type\":\"AGENT_BPO\",\"submit\":true,\"kpiMetrics\":[{\"key\":\"totalCallsMade\",\"label\":\"Total Calls Made\",\"target\":30,\"targetLabel\":\"30\",\"actual\":35,\"variance\":5,\"unit\":\"count\",\"category\":\"CORE_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"callsConnected\",\"label\":\"Calls Connected\",\"target\":10,\"targetLabel\":\"10\",\"actual\":8,\"variance\":-2,\"unit\":\"count\",\"category\":\"CORE_TEMPLATE\",\"auto\":false,\"notes\":\"\"}]}")
check "true" "$(echo "$r" | jq -r '.report.ref != null')" "Lagos agent submits report"
LAGREPORT=$(echo "$r" | jq -r '.report.id')
r=$(api "$GH" POST /api/reports "{\"type\":\"AGENT_BPO\",\"submit\":true,\"kpiMetrics\":[{\"key\":\"totalCallsMade\",\"label\":\"Total Calls Made\",\"target\":30,\"targetLabel\":\"30\",\"actual\":20,\"variance\":-10,\"unit\":\"count\",\"category\":\"CORE_TEMPLATE\",\"auto\":false,\"notes\":\"\"}]}")
check "true" "$(echo "$r" | jq -r '.report.ref != null')" "Ghana agent submits report"
GHREPORT=$(echo "$r" | jq -r '.report.id')

# ── 7. supervisor report list scoping ──
r=$(api "$S" GET /api/reports)
SEELAG=$(echo "$r" | jq "[.reports[] | select(.id==\"$LAGREPORT\")] | length")
SEEGH=$(echo "$r" | jq "[.reports[] | select(.id==\"$GHREPORT\")] | length")
check "1" "$SEELAG" "supervisor review list contains Lagos report"
check "0" "$SEEGH" "supervisor review list excludes Ghana report"

# ── 8. supervisor cannot review out-of-state report ──
r=$(api "$S" PATCH /api/reports "{\"id\":\"$GHREPORT\",\"decision\":\"approve\"}")
check "null" "$(echo "$r" | jq -r '.report // null')" "supervisor review of Ghana report denied (403)"
echo "$r" | grep -q "Out of your centre" && ok "denial message mentions centre" || bad "denial message missing (got: $r)"

# ── 9. admin CAN review out-of-state report ──
r=$(api "$A" PATCH /api/reports "{\"id\":\"$GHREPORT\",\"decision\":\"approve\"}")
check "APPROVED" "$(echo "$r" | jq -r '.report.status // "none"')" "admin approves Ghana report (sees every centre)"

# ── 10. task control scoping ──
LAGUID=$(api "$S" GET /api/users | jq -r ".users[] | select(.email==\"$LAG\") | .id")
r=$(api "$S" POST /api/tasks "{\"title\":\"Lagos follow-up calls\",\"assigneeId\":\"$LAGUID\"}")
check "true" "$(echo "$r" | jq -r '.task.id != null')" "supervisor assigns task to own-state agent"
r=$(api "$S" POST /api/tasks "{\"title\":\"Ghana attempt\",\"assigneeId\":\"$(api "$A" GET /api/users | jq -r ".users[] | select(.email==\"$GHA\") | .id")\"}")
echo "$r" | grep -q "Out of your centre" && ok "supervisor task assignment to Ghana agent denied" || bad "task assignment denial missing (got: $r)"

# ── 11. dashboard scoping ──
r=$(api "$S" GET /api/dashboard)
STAFFN=$(echo "$r" | jq '.supervisor.totalActiveEmployees')
[ "$STAFFN" -ge 1 ] && ok "supervisor dashboard staff scoped ($STAFFN)" || bad "supervisor staff count odd ($STAFFN)"
LBL=$(echo "$r" | jq -r '.centre.label // "none"')
check "Lagos, Nigeria" "$LBL" "supervisor centre label"
GHSEEN=$(echo "$r" | jq '[.supervisor.submittedReportList[] | select(.userName=="Kwame Accra Agent")] | length')
check "0" "$GHSEEN" "supervisor dashboard has no Ghana submissions"
CENTRES=$(echo "$r" | jq -r '.supervisor.centres // "absent"')
check "absent" "$CENTRES" "supervisor does not get centres overview"

r=$(api "$A" GET /api/dashboard)
CN=$(echo "$r" | jq '[.supervisor.centres[]? | select(.country=="Ghana")] | length')
[ "$CN" -ge 1 ] && ok "admin centres overview includes Ghana centre" || bad "admin centres overview missing Ghana"
CNGH=$(echo "$r" | jq '[.supervisor.submittedReportList[] | select(.userName=="Kwame Accra Agent")] | length')
[ "$CNGH" -ge 1 ] && ok "admin dashboard sees Ghana submission" || bad "admin dashboard missing Ghana submission"

# ── 12. KPI summary scoping ──
r=$(api "$S" GET "/api/kpi/summary?period=day")
BYGH=$(echo "$r" | jq '[.byEmployee[] | select(.userName=="Kwame Accra Agent")] | length')
check "0" "$BYGH" "supervisor KPI summary excludes Ghana agent"
CALLS=$(echo "$r" | jq '[.rows[] | select(.key=="totalCallsMade") | .actual // 0] | add // 0')
[ "$(awk -v n="$CALLS" 'BEGIN{print (n>0)?1:0}')" = "1" ] && ok "supervisor KPI rows have Lagos calls ($CALLS)" || bad "supervisor KPI calls empty"
r=$(api "$A" GET "/api/kpi/summary?period=day")
BYGH=$(echo "$r" | jq '[.byEmployee[] | select(.userName=="Kwame Accra Agent")] | length')
[ "$BYGH" -ge 1 ] && ok "admin KPI summary includes Ghana agent" || bad "admin KPI summary missing Ghana"

# ── 13. consolidated scoping ──
r=$(api "$S" GET /api/consolidated)
GHIN=$(echo "$r" | jq '[.departments.BPO.reports[] | select(.userName=="Kwame Accra Agent")] | length')
check "0" "$GHIN" "supervisor consolidated excludes Ghana"
r=$(api "$A" GET /api/consolidated)
GHIN=$(echo "$r" | jq '[.departments.BPO.reports[] | select(.userName=="Kwame Accra Agent")] | length')
[ "$GHIN" -ge 1 ] && ok "admin consolidated includes Ghana" || bad "admin consolidated missing Ghana"

# ── 14. uploaded files scoping (supervisor sees only own centre's uploads) ──
r=$(api "$S" GET /api/uploads)
GHUP=$(echo "$r" | jq '[.uploads[] | select(.user.fullName=="Kwame Accra Agent")] | length')
check "0" "$GHUP" "supervisor uploads list excludes Ghana users"

echo
echo "RESULT: $PASS passed, $FAIL failed"
rm -rf "$T"
[ "$FAIL" = "0" ]
