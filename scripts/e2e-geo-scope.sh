#!/bin/bash
# E2E: countries/states + state-supervisor scoping + admin KPI scope bar
# Snapshot: date=2026-10-16 (week Mon 10-12 → Sun 10-18 covers 10-13 + 10-16)
#   kpi/summary week: global=17 (Lagos 15 + Ghana 2, SUP type excluded)
#   dashboard 10-16:  global staff=8 submitted=11 · Lagos staff=7 submitted=9 · Ghana staff=1 submitted=2
BASE="http://localhost:3000"
PASS=0; FAIL=0
check() { if [[ "$3" == *"$2"* ]]; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 → expected [$2] got: ${3:0:300}"; fi }
J() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);$2}catch(e){console.log('PARSE_ERR')}})"; }

D="2026-10-16"; W="period=week&date=$D"

# ── logins ──
JA=/tmp/geo-admin.txt; JL=/tmp/geo-lagosup.txt; JN=/tmp/geo-ngozi.txt; JB=/tmp/geo-agent.txt
curl -s -c $JA -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' > /dev/null
curl -s -c $JL -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"login","email":"sup.lagos@kallmania.test","password":"@Test1234"}' > /dev/null
curl -s -c $JN -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"login","email":"sup.ngozi@kallmania.com","password":"@Test1234"}' > /dev/null
curl -s -c $JB -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"login","email":"blessing.okafor@kallmania.com","password":"@Test1234"}' > /dev/null
MEK=$(curl -s -b $JL $BASE/api/auth); check "Lagos supervisor login + scope in session" '"country":"Nigeria","state":"Lagos"' "$MEK"

# ── resolve ids ──
IDS=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const k=await db.user.findFirst({where:{fullName:'Kwame Mensah'}});const b=await db.user.findFirst({where:{fullName:'Blessing Okafor'}});const i=await db.user.findFirst({where:{fullName:'Ivy Inbound'}});console.log(k.id,b.id,i.id);await db.\$disconnect();})()")
KID=$(echo $IDS | cut -d' ' -f1); BID=$(echo $IDS | cut -d' ' -f2); IID=$(echo $IDS | cut -d' ' -f3)

# ── 1. /api/geo ──
G=$(curl -s $BASE/api/geo)
GC=$(echo "$G" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).countries.length))")
check "geo: 250 countries" "250" "$GC"
GN=$(curl -s "$BASE/api/geo?country=Nigeria")
check "geo: Nigeria states include Lagos" '"Lagos"' "$GN"
GNF=$(echo "$GN" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).country.flag))")
check "geo: Nigeria flag emoji" "🇳🇬" "$GNF"
GX=$(curl -s "$BASE/api/geo?country=Atlantis")
check "geo: unknown country → empty states" '"states":[]' "$GX"

# ── 2. admin kpi/summary geo drill ──
AW=$(curl -s -b $JA "$BASE/api/kpi/summary?$W")
AWC=$(echo "$AW" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).reportCount))")
check "admin global week reports=17" "17" "$AWC"
check "admin global echo country=null" '"country":null' "$AW"

AL=$(curl -s -b $JA "$BASE/api/kpi/summary?$W&country=Nigeria&state=Lagos")
ALC=$(echo "$AL" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.reportCount+'|'+j.byEmployee.filter(e=>e.userName==='Kwame Mensah').length)})")
check "admin Lagos drill reports=15, no Kwame" "15|0" "$ALC"
check "admin Lagos echo" '"country":"Nigeria","state":"Lagos"' "$AL"

AG=$(curl -s -b $JA "$BASE/api/kpi/summary?$W&country=Ghana&state=Greater%20Accra")
AGC=$(echo "$AG" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.reportCount+'|'+j.byEmployee.length+'|'+j.byEmployee[0].callsMade)})")
check "admin Ghana drill reports=2, byEmployee=1 Kwame callsMade=99" "2|1|99" "$AGC"
AGK=$(echo "$AG" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.rows.find(r=>r.key==='totalCallsMade')?.actual)})")
check "admin Ghana cumulative callsMade=99" "99" "$AGK"

AK=$(curl -s -b $JA "$BASE/api/kpi/summary?$W&country=Kenya")
AKC=$(echo "$AK" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).reportCount))")
check "admin Kenya (empty centre) reports=0, no error" "0" "$AKC"

# ── 3. admin dashboard geo drill ──
DG=$(curl -s -b $JA "$BASE/api/dashboard?date=$D")
DGV=$(echo "$DG" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s).supervisor;console.log(j.totalActiveEmployees+'|'+j.reportsSubmitted+'|'+j.centres.length+'|'+(j.centres.find(c=>c.country==='Ghana')?1:0)+'|'+j.unassignedStaff)})")
check "admin dash global: staff=8 submitted=11 centres=2 Ghana-present unassigned=1" "8|11|2|1|1" "$DGV"

DL=$(curl -s -b $JA "$BASE/api/dashboard?date=$D&country=Nigeria&state=Lagos")
DLV=$(echo "$DL" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.supervisor.totalActiveEmployees+'|'+j.supervisor.reportsSubmitted+'|'+j.supervisor.centres.length+'|'+j.supervisor.centreFilter.state)})")
check "admin dash Lagos: staff=6 submitted=9 centres STILL 2 (global) echo Lagos" "6|9|2|Lagos" "$DLV"
DLK=$(echo "$DL" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.supervisor.submittedReportList.some(r=>r.userName==='Kwame Mensah'))})")
check "admin dash Lagos: Kwame absent from submissions" "false" "$DLK"

DGh=$(curl -s -b $JA "$BASE/api/dashboard?date=$D&country=Ghana&state=Greater%20Accra")
DGhV=$(echo "$DGh" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s).supervisor;console.log(j.totalActiveEmployees+'|'+j.reportsSubmitted)})")
check "admin dash Ghana: staff=1 submitted=2" "1|2" "$DGhV"

# ── 4. Lagos supervisor hard scoping (Emeka) ──
SW=$(curl -s -b $JL "$BASE/api/kpi/summary?$W")
SWC=$(echo "$SW" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).reportCount))")
check "scoped sup default week reports=15 (Lagos only)" "15" "$SWC"
check "scoped sup echo own centre" '"country":"Nigeria","state":"Lagos"' "$SW"
SG=$(curl -s -b $JL "$BASE/api/kpi/summary?$W&country=Ghana&state=Greater%20Accra")
SGC=$(echo "$SG" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.reportCount+'|'+j.state+'|'+j.country)})")
check "scoped sup geo params IGNORED → still 15 + Lagos echo" "15|Lagos|Nigeria" "$SGC"

SD=$(curl -s -b $JL "$BASE/api/dashboard?date=$D&country=Ghana")
SDV=$(echo "$SD" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s).supervisor;console.log(j.totalActiveEmployees+'|'+j.reportsSubmitted)})")
check "scoped sup dashboard params IGNORED → staff=6 submitted=9" "6|9" "$SDV"

SU=$(curl -s -b $JL "$BASE/api/users")
SUC=$(echo "$SU" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.users.length+'|'+j.users.some(u=>u.fullName==='Kwame Mensah'))})")
check "scoped sup users list = 7 Lagos staff, no Kwame" "7|false" "$SUC"

SK=$(curl -s -b $JL "$BASE/api/kpi/summary?$W&userId=$KID")
check "scoped sup → Kwame KPI denied (outside centre)" "outside your centre" "$SK"
SB=$(curl -s -b $JL "$BASE/api/kpi/summary?$W&userId=$BID")
check "scoped sup → Blessing KPI allowed (in centre)" '"fullName":"Blessing Okafor"' "$SB"
SR=$(curl -s -b $JL "$BASE/api/reports?userId=$KID")
check "scoped sup → Kwame report history denied" "outside your centre" "$SR"

# ── 5. unscoped supervisor (Ngozi) regression guard ──
NW=$(curl -s -b $JN "$BASE/api/kpi/summary?$W")
NWC=$(echo "$NW" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).reportCount))")
check "unscoped sup sees ALL centres (17 incl. Kwame)" "17" "$NWC"
check "unscoped sup echo country=null" '"country":null' "$NW"

# ── 6. agent: geo params ignored, own data only ──
BA=$(curl -s -b $JB "$BASE/api/kpi/summary?$W&country=Ghana")
BAC=$(echo "$BA" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.reportCount+'|'+j.country)})")
check "agent geo params ignored → own 6 reports, echo null" "6|null" "$BAC"

# ── 7. registration + admin setLocation ──
RG=$(curl -s -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"register","email":"geo.register.e2e@kallmania.test","password":"@Test1234","fullName":"Geo Reg Tester","team":"OUTBOUND","position":"AGENT","country":"Kenya","state":"Nairobi City"}')
check "register with centre (Kenya/Nairobi City)" '"success":true' "$RG"
RU=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.user.findUnique({where:{email:'geo.register.e2e@kallmania.test'}}).then(u=>{console.log(u.country+'|'+u.state);return db.\$disconnect()})")
check "registered user persisted with centre" "Kenya|Nairobi City" "$RU"
RB=$(curl -s -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"register","email":"geo.bad.e2e@kallmania.test","password":"@Test1234","fullName":"Geo Bad","team":"OUTBOUND","position":"AGENT","country":"Nigeria","state":"Not A State"}')
check "register invalid state rejected" "not a known state" "$RB"

SL=$(curl -s -b $JA -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$IID\",\"action\":\"setLocation\",\"country\":\"Kenya\",\"state\":\"Nairobi City\"}")
check "admin setLocation Ivy → Kenya" '"success":true' "$SL"
SLV=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.user.findFirst({where:{fullName:'Ivy Inbound'}}).then(u=>{console.log(u.country+'|'+u.state);return db.\$disconnect()})")
check "setLocation persisted" "Kenya|Nairobi City" "$SLV"
SLB=$(curl -s -b $JA -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$IID\",\"action\":\"setLocation\",\"country\":\"Nigeria\",\"state\":\"Lagos\"}")
check "revert Ivy → Lagos" '"success":true' "$SLB"
SLE=$(curl -s -b $JA -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$IID\",\"action\":\"setLocation\",\"country\":\"Nowhereland\",\"state\":\"\"}")
check "setLocation invalid country rejected" "Unknown country" "$SLE"
SLD=$(curl -s -b $JA -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$IID\",\"action\":\"setLocation\",\"country\":\"\",\"state\":\"\"}")
check "setLocation clear works" '"success":true' "$SLD"
SLR=$(curl -s -b $JA -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$IID\",\"action\":\"setLocation\",\"country\":\"Nigeria\",\"state\":\"Lagos\"}")
check "restore Ivy → Lagos, Nigeria" '"success":true' "$SLR"

# cleanup registration test user
node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.user.deleteMany({where:{email:{in:['geo.register.e2e@kallmania.test','geo.bad.e2e@kallmania.test']}}}).then(r=>{console.log('cleaned',r.count);return db.\$disconnect()})" > /dev/null

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
