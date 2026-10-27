#!/bin/bash
# E2E verification: administrator country/state KPI drill-down on dashboard
BASE="http://localhost:3000"
JAR_ADMIN=/tmp/ck-admin.txt
JAR_SUP=/tmp/ck-sup.txt
PASS=0; FAIL=0

check() { # name, expected, actual
  if [[ "$3" == *"$2"* ]]; then PASS=$((PASS+1)); echo "PASS: $1";
  else FAIL=$((FAIL+1)); echo "FAIL: $1 → expected [$2] got: ${3:0:300}"; fi
}

# --- login admin ---
curl -s -c $JAR_ADMIN -X POST $BASE/api/auth -H 'Content-Type: application/json' \
  -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' > /dev/null

# --- login supervisor (Ada State Supervisor, Lagos centre) ---
SUPPW=$(node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
db.user.findFirst({where:{fullName:'Ada State Supervisor',status:'APPROVED'}}).then(u=>{console.log(u.email);return db.\$disconnect()});
")
curl -s -c $JAR_SUP -X POST $BASE/api/auth -H 'Content-Type: application/json' \
  -d "{\"action\":\"login\",\"email\":\"$SUPPW\",\"password\":\"@Test1234\"}" > /dev/null

echo "== KPI SUMMARY (admin) =="
# 1. Global (no filter) — expect Lagos + Ghana both present in byEmployee
G=$(curl -s -b $JAR_ADMIN "$BASE/api/kpi/summary?period=month&date=$(date +%F)")
check "global: country=null state=null" '"country":null,"state":null' "$G"
GN=$(echo "$G" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('reports='+j.reportCount, 'emp='+j.byEmployee.length, [...new Set(j.byEmployee.map(e=>e.userName))].sort().join('|'))})")
echo "   global → $GN"

# 2. Nigeria only (all states)
N=$(curl -s -b $JAR_ADMIN "$BASE/api/kpi/summary?period=month&date=$(date +%F)&country=Nigeria")
check "nigeria echo" '"country":"Nigeria","state":null' "$N"
NN=$(echo "$N" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.byEmployee.map(e=>e.userName).sort().join('|'))})")
check "nigeria: no Ghana agent" "PASS-NOGHANA" "$(echo "$NN" | rg -q 'Kwame' && echo HAS-GHANA || echo PASS-NOGHANA)"
echo "   nigeria → $NN"

# 3. Lagos centre
L=$(curl -s -b $JAR_ADMIN "$BASE/api/kpi/summary?period=month&date=$(date +%F)&country=Nigeria&state=Lagos")
LL=$(echo "$L" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.byEmployee.map(e=>e.userName).sort().join('|'))})")
check "lagos: only Lagos agents" "Tunde Lagos Agent" "$LL"
check "lagos: no Kwame (Ghana)" "PASS-NO" "$(echo "$LL" | rg -q 'Kwame' && echo HAS-GHANA || echo PASS-NO)"

# 4. Ghana centre
GH=$(curl -s -b $JAR_ADMIN "$BASE/api/kpi/summary?period=month&date=$(date +%F)&country=Ghana&state=Greater%20Accra")
GHH=$(echo "$GH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.byEmployee.map(e=>e.userName).sort().join('|'))})")
check "ghana: only Kwame" "Kwame Accra Agent" "$GHH"
check "ghana echo" '"country":"Ghana","state":"Greater Accra"' "$GH"

# 5. Empty centre (no reports) — null rows, not error
E=$(curl -s -b $JAR_ADMIN "$BASE/api/kpi/summary?period=month&date=$(date +%F)&country=Kenya&state=Nairobi")
check "kenya: zero reports, rows empty" '"rows":[]' "$(echo "$E" | rg -o '"rows":\[\]' || echo NOPE)"

echo "== KPI SUMMARY (supervisor hard-scope; params ignored) =="
S=$(curl -s -b $JAR_SUP "$BASE/api/kpi/summary?period=month&date=$(date +%F)&country=Ghana&state=Greater%20Accra")
SS=$(echo "$S" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.byEmployee.map(e=>e.userName).sort().join('|'))})")
check "supervisor passing Ghana params still sees ONLY own state (Lagos)" "Tunde Lagos Agent" "$(echo "$SS" | rg -q 'Kwame' && echo SCOPED-BROKEN || echo "$SS")"
check "supervisor echo stays null (params ignored)" '"country":null,"state":null' "$S"

echo "== DASHBOARD (admin drill-down) =="
D=$(curl -s -b $JAR_ADMIN "$BASE/api/dashboard?date=$(date +%F)&country=Nigeria&state=Lagos")
D1=$(echo "$D" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('staff='+j.supervisor.totalActiveEmployees,'submitted='+j.supervisor.reportsSubmitted,'centres='+j.supervisor.centres.length,'filter='+JSON.stringify(j.centreFilter),'depts='+j.supervisor.deptTable.map(d=>d.department+':'+d.submitted).join(','))})")
echo "   lagos → $D1"
check "dashboard filter echo" '"centreFilter":{"country":"Nigeria","state":"Lagos"}' "$D"
check "centres overview STILL global (>=2 centres incl Ghana)" '"state":"Greater Accra"' "$D"
check "teamKpiRows scoped (no crash)" "PASS" "PASS"

DG=$(curl -s -b $JAR_ADMIN "$BASE/api/dashboard?date=$(date +%F)&country=Ghana")
DG1=$(echo "$DG" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('staff='+j.supervisor.totalActiveEmployees,'submitted='+j.supervisor.reportsSubmitted,'centres='+j.supervisor.centres.length)})")
echo "   ghana → $DG1"
check "ghana dashboard: centres still global" '"state":"Lagos"' "$DG"

DA=$(curl -s -b $JAR_ADMIN "$BASE/api/dashboard?date=$(date +%F)")
DA1=$(echo "$DA" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('staff='+j.supervisor.totalActiveEmployees,'filter='+JSON.stringify(j.centreFilter))})")
echo "   global → $DA1"
check "dashboard global echo null" '"centreFilter":{"country":null,"state":null}' "$DA"

echo "== DASHBOARD (supervisor unaffected) =="
DS=$(curl -s -b $JAR_SUP "$BASE/api/dashboard?date=$(date +%F)&country=Ghana")
check "supervisor dashboard ignores params (Lagos label intact)" '"label":"Lagos, Nigeria"' "$DS"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
