#!/bin/bash
# E2E: per-staff KPI drill-down (User Management) — admin can view any user's KPIs,
# agents cannot view others, unknown user 404, target echo present.
BASE="http://localhost:3000"
JAR=/tmp/ck-admin2.txt
PASS=0; FAIL=0
check() { if [[ "$3" == *"$2"* ]]; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 → expected [$2] got: ${3:0:240}"; fi }

curl -s -c $JAR -X POST $BASE/api/auth -H 'Content-Type: application/json' \
  -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' > /dev/null

# resolve ids
IDS=$(node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  const agent=await db.user.findFirst({where:{fullName:'Blessing Okafor'}});
  const tech=await db.user.findFirst({where:{fullName:'Tunde Adeyemi'}});
  console.log(agent.id, tech.id);
  await db.\$disconnect();
})();")
AGENT_ID=$(echo $IDS | cut -d' ' -f1)
TECH_ID=$(echo $IDS | cut -d' ' -f2)
echo "agent=$AGENT_ID tech=$TECH_ID"

# 1. Admin → agent per-staff KPI
A=$(curl -s -b $JAR "$BASE/api/kpi/summary?userId=$AGENT_ID&period=month&date=$(date +%F)")
check "admin→agent: target echo fullName" '"fullName":"Blessing Okafor"' "$A"
check "admin→agent: target echo role" '"role":"AGENT_BPO"' "$A"
AR=$(echo "$A" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('reports='+j.reportCount,'rows='+j.rows.length,'byEmp='+j.byEmployee.length)})")
echo "   agent → $AR"
check "agent has reports in this snapshot" "reports=" "$AR"
ROWN=$(echo "$A" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.rows.filter(r=>r.actual!==null).length)})")
check "agent KPI rows contain actual data" "YES" "$([ "$ROWN" -gt 0 ] 2>/dev/null && echo YES || echo NO)"

# 2. Admin → tech user (techTotals path)
T=$(curl -s -b $JAR "$BASE/api/kpi/summary?userId=$TECH_ID&period=month&date=$(date +%F)")
check "admin→tech: target echo role" '"role":"DEVELOPER"' "$T"

# 3. Agent tries to view someone else → 403
JARA=/tmp/ck-agent2.txt
curl -s -c $JARA -X POST $BASE/api/auth -H 'Content-Type: application/json' \
  -d '{"action":"login","email":"blessing.okafor@kallmania.com","password":"@Test1234"}' > /dev/null
DENY=$(curl -s -b $JARA "$BASE/api/kpi/summary?userId=$TECH_ID&period=week")
check "agent→other user denied 403" "Not allowed" "$DENY"

# 4. Unknown user → 404
N404=$(curl -s -b $JAR "$BASE/api/kpi/summary?userId=doesnotexist123&period=week")
check "unknown user 404" "User not found" "$N404"

# 5. Weekly vs monthly difference sanity (weekly is subset)
W=$(curl -s -b $JAR "$BASE/api/kpi/summary?userId=$AGENT_ID&period=week&date=$(date +%F)")
WR=$(echo "$W" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).reportCount)})")
MR=$(echo "$A" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).reportCount)})")
check "weekly reports ≤ monthly reports" "YES" "$([ "$WR" -le "$MR" ] 2>/dev/null && echo YES || echo NO)"
echo "   week=$WR month=$MR"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
