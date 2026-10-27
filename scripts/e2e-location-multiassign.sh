#!/bin/bash
# E2E for the location-scoping / multi-assign / escalate / yearly-KPI batch
BASE="http://localhost:3000"
JAR="/tmp/km-e2e-cookies.txt"
PASS=0; FAIL=0
check() { # name, condition
  if [ "$2" == "0" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ $1"; fi
}

echo "── 1. Admin login"
code=$(curl -s -o /tmp/login.json -w "%{http_code}" -c $JAR -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
check "admin login 200" $([ "$code" == "200" ] && echo 0 || echo 1)

echo "── 2. Geo catalogue"
n=$(curl -s $BASE/api/geo -b $JAR | python3 -c "import sys,json; print(len(json.load(sys.stdin)['countries']))")
check "countries list ($n countries)" $([ "$n" -gt 200 ] && echo 0 || echo 1)
n=$(curl -s "$BASE/api/geo?country=NG" -b $JAR | python3 -c "import sys,json; print(len(json.load(sys.stdin)['states']))")
check "Nigeria states ($n)" $([ "$n" -gt 30 ] && echo 0 || echo 1)

echo "── 3. Users list + set location"
users=$(curl -s $BASE/api/users -b $JAR)
agent_id=$(echo "$users" | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; ag=[u for u in us if u['role']=='AGENT_BPO' and u['status']=='APPROVED']; print(ag[0]['id'] if ag else '')")
sup_id=$(echo "$users" | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; su=[u for u in us if u['role']=='SUPERVISOR' and u['status']=='APPROVED']; print(su[0]['id'] if su else '')")
echo "  agent=$agent_id supervisor=$sup_id"
code=$(curl -s -o /tmp/loc.json -w "%{http_code}" -b $JAR -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$agent_id\",\"action\":\"setLocation\",\"country\":\"NG\",\"state\":\"Lagos\"}")
check "set agent location Lagos" $([ "$code" == "200" ] && echo 0 || echo 1)
code=$(curl -s -o /tmp/loc2.json -w "%{http_code}" -b $JAR -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$sup_id\",\"action\":\"setLocation\",\"country\":\"NG\",\"state\":\"Lagos\"}")
check "set supervisor location Lagos" $([ "$code" == "200" ] && echo 0 || echo 1)

echo "── 4. Multi-agent task"
agent2=$(echo "$users" | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; ag=[u for u in us if u['role']=='AGENT_BPO' and u['status']=='APPROVED']; print(ag[1]['id'] if len(ag)>1 else '')")
code=$(curl -s -o /tmp/task.json -w "%{http_code}" -b $JAR -X POST $BASE/api/tasks -H 'Content-Type: application/json' -d "{\"title\":\"E2E multi-assign task\",\"department\":\"OUTBOUND\",\"category\":\"Outbound Calls\",\"priority\":\"HIGH\",\"assigneeIds\":[\"$agent_id\",\"$agent2\"],\"deadline\":\"2026-11-01\",\"requiredOutcome\":\"Both agents called\",\"target\":\"30 calls\"}")
check "create multi-assignee task 201" $([ "$code" == "201" ] && echo 0 || echo 1)
n=$(python3 -c "import json; t=json.load(open('/tmp/task.json'))['task']; print(len(t.get('assignees') or []))")
check "task has 2 assignees" $([ "$n" == "2" ] && echo 0 || echo 1)

echo "── 5. Escalation flow (agent → supervisor, admin sees)"
# login as agent
JAR2="/tmp/km-e2e-agent.txt"
agent_email=$(echo "$users" | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; ag=[u for u in us if u['role']=='AGENT_BPO' and u['status']=='APPROVED']; print(ag[0]['email'])")
code=$(curl -s -o /tmp/al.json -w "%{http_code}" -c $JAR2 -X POST $BASE/api/auth -H 'Content-Type: application/json' -d "{\"action\":\"login\",\"email\":\"$agent_email\",\"password\":\"Passw0rd!23\"}")
if [ "$code" != "200" ]; then
  # try admin reset of agent password to a known value
  curl -s -b $JAR -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$agent_id\",\"action\":\"resetPassword\",\"newPassword\":\"E2eTest#2026\"}" > /dev/null
  code=$(curl -s -o /tmp/al.json -w "%{http_code}" -c $JAR2 -X POST $BASE/api/auth -H 'Content-Type: application/json' -d "{\"action\":\"login\",\"email\":\"$agent_email\",\"password\":\"E2eTest#2026\"}")
fi
check "agent login" $([ "$code" == "200" ] && echo 0 || echo 1)
code=$(curl -s -o /tmp/esc.json -w "%{http_code}" -b $JAR2 -X POST $BASE/api/escalations -H 'Content-Type: application/json' -d '{"action":"escalate","targetLevel":"SUPERVISOR","message":"E2E: I need help with a difficult caller."}')
check "agent escalate 201" $([ "$code" == "201" ] && echo 0 || echo 1)
code=$(curl -s -o /tmp/notice.json -w "%{http_code}" -b $JAR -X POST $BASE/api/escalations -H 'Content-Type: application/json' -d "{\"action\":\"notifyAgent\",\"userId\":\"$agent_id\",\"message\":\"E2E: Great work today, keep it up!\"}")
check "admin notify agent 201" $([ "$code" == "201" ] && echo 0 || echo 1)
n=$(curl -s $BASE/api/escalations -b $JAR | python3 -c "import sys,json; print(len(json.load(sys.stdin)['notifications']))")
check "admin sees escalation inbox ($n)" $([ "$n" -ge 2 ] && echo 0 || echo 1)

echo "── 6. Yearly KPI period"
period=$(curl -s "$BASE/api/kpi/summary?period=year&date=2026-10-20" -b $JAR | python3 -c "import sys,json; print(json.load(sys.stdin)['label'])")
check "year period label ($period)" $([[ "$period" == Year* ]] && echo 0 || echo 1)

echo "── 7. Admin KPI location filter"
resp=$(curl -s "$BASE/api/kpi/summary?period=day&date=2026-10-20&country=NG&state=Lagos" -b $JAR)
check "kpi summary with country/state filter" $([ -n "$resp" ] && echo 0 || echo 1)

echo "── 8. Per-user KPI endpoint"
code=$(curl -s -o /tmp/uk.json -w "%{http_code}" "$BASE/api/users/$agent_id/kpi?period=week" -b $JAR)
check "user KPI endpoint 200" $([ "$code" == "200" ] && echo 0 || echo 1)

echo "── 9. Supervisor scoping"
JAR3="/tmp/km-e2e-sup.txt"
if [ -n "$sup_id" ]; then
  sup_email=$(echo "$users" | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; su=[u for u in us if u['role']=='SUPERVISOR']; print(su[0]['email'])")
  curl -s -b $JAR -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$sup_id\",\"action\":\"resetPassword\",\"newPassword\":\"E2eSup#2026\"}" > /dev/null
  code=$(curl -s -o /dev/null -w "%{http_code}" -c $JAR3 -X POST $BASE/api/auth -H 'Content-Type: application/json' -d "{\"action\":\"login\",\"email\":\"$sup_email\",\"password\":\"E2eSup#2026\"}")
  check "supervisor login" $([ "$code" == "200" ] && echo 0 || echo 1)
  scoped=$(curl -s $BASE/api/users -b $JAR3 | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; print(all((u.get('state')=='Lagos') for u in us))")
  check "supervisor sees only Lagos staff" $([ "$scoped" == "True" ] && echo 0 || echo 1)
  code=$(curl -s -o /dev/null -w "%{http_code}" -b $JAR3 -X POST $BASE/api/kpi-config -H 'Content-Type: application/json' -d '{"department":"SOCIAL_MEDIA","key":"e2e_metric","label":"E2E Metric","defaultTarget":"5","unit":"count"}')
  check "supervisor can configure social KPI 201" $([ "$code" == "201" ] && echo 0 || echo 1)
  code=$(curl -s -o /dev/null -w "%{http_code}" -b $JAR3 -X POST $BASE/api/kpi-config -H 'Content-Type: application/json' -d '{"department":"MANAGEMENT","key":"e2e_bad","label":"Bad","unit":"count"}')
  check "supervisor blocked from management catalogue 403" $([ "$code" == "403" ] && echo 0 || echo 1)
fi

echo "── 10. Team lead team tasks"
tl_email=$(curl -s "$BASE/api/users" -b $JAR | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; tl=[u for u in us if u['role']=='TEAM_LEAD']; print(tl[0]['email'] if tl else '')")
if [ -n "$tl_email" ]; then
  tl_id=$(echo "$users" | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; tl=[u for u in us if u['role']=='TEAM_LEAD']; print(tl[0]['id'] if tl else '')")
  curl -s -b $JAR -X PATCH $BASE/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$tl_id\",\"action\":\"resetPassword\",\"newPassword\":\"E2eTL#2026\"}" > /dev/null
  JAR4="/tmp/km-e2e-tl.txt"
  code=$(curl -s -o /dev/null -w "%{http_code}" -c $JAR4 -X POST $BASE/api/auth -H 'Content-Type: application/json' -d "{\"action\":\"login\",\"email\":\"$tl_email\",\"password\":\"E2eTL#2026\"}")
  check "team lead login" $([ "$code" == "200" ] && echo 0 || echo 1)
  n=$(curl -s "$BASE/api/tasks" -b $JAR4 | python3 -c "import sys,json; print(len(json.load(sys.stdin)['tasks']))")
  check "team lead task list ($n)" $([ -n "$n" ] && echo 0 || echo 1)
fi

echo "── 11. Register with country/state (no OTP)"
email="e2e-geo-$(date +%s)@kallmania-test.com"
code=$(curl -s -o /tmp/reg.json -w "%{http_code}" -X POST $BASE/api/auth -H 'Content-Type: application/json' -d "{\"action\":\"register\",\"email\":\"$email\",\"password\":\"Test#12345\",\"fullName\":\"E2E Geo Tester\",\"team\":\"OUTBOUND\",\"position\":\"AGENT\",\"country\":\"NG\",\"state\":\"Rivers\"}")
check "register with country/state 201" $([ "$code" == "201" ] && echo 0 || echo 1)
check "register response has NO otp challenge fields" "$(python3 -c "import json; d=json.load(open('/tmp/reg.json')); print(0 if ('challengeId' not in d and 'previewCode' not in d) else 1)")"
has_state=$(curl -s "$BASE/api/users" -b $JAR | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; u=[x for x in us if x['email']=='$email']; print(bool(u and u[0].get('state')=='Rivers'))")
check "new user stored state=Rivers" $([ "$has_state" == "True" ] && echo 0 || echo 1)
# cleanup
uid=$(curl -s "$BASE/api/users" -b $JAR | python3 -c "import sys,json; us=json.load(sys.stdin)['users']; u=[x for x in us if x['email']=='$email']; print(u[0]['id'] if u else '')")
[ -n "$uid" ] && curl -s -b $JAR -X DELETE "$BASE/api/users?id=$uid" > /dev/null

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
rm -f $JAR $JAR2 $JAR3 $JAR4
# DB-level cleanup of test artifacts (users route has no DELETE handler)
bun -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient({ datasourceUrl: process.env.KALLMANIA_DATABASE_URL });
const emails = ['e2e-geo-', 'dbg.otp.test'].map(p => ({ email: { startsWith: p } }));
const us = await db.user.findMany({ where: { OR: emails } });
for (const u of us) {
  await db.taskAssignee.deleteMany({ where: { userId: u.id } }).catch(()=>{});
  await db.auditLog.deleteMany({ where: { userId: u.id } }).catch(()=>{});
  await db.notification.deleteMany({ where: { userId: u.id } }).catch(()=>{});
  await db.user.delete({ where: { id: u.id } }).catch(()=>{});
}
const ts = await db.task.findMany({ where: { title: { contains: 'E2E multi-assign' } } });
for (const t of ts) await db.task.delete({ where: { id: t.id } }).catch(()=>{});
const esc = await db.notification.deleteMany({ where: { message: { contains: 'E2E:' } } }).catch(()=>{});
console.log('E2E_CLEANUP_OK users:' + us.length + ' tasks:' + ts.length);
await db.\$disconnect();
" >/dev/null 2>&1
# cleanup test artifacts
curl -s -b /dev/null -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"action":"logout"}' > /dev/null
