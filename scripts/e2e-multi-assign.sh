#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# E2E — Supervisor KPI config for Web Dev & Social Media + Multi-assignee tasks:
#   1. Supervisor manages WEB_DEV / SOCIAL_MEDIA KPI configuration (targets upsert,
#      custom metrics add/delete), team leads & agents still blocked
#   2. Config targets flow into GET catalogue (forms overlay source)
#   3. Tasks assigned to MULTIPLE agents (junction set, primary assignee, mine-visibility)
#   4. Centre scoping on multi-assign (out-of-centre 403), reassign replaces the set
#   5. Junction members can update the task; legacy single-assignee still works;
#      employees' personal tasks default to self and stay visible
# ─────────────────────────────────────────────────────────────────────────────
BASE="http://localhost:3000"
J='Content-Type: application/json'
CA=/tmp/ma-admin.jar; CS=/tmp/ma-sup.jar; CTL=/tmp/ma-tl.jar; CAG=/tmp/ma-agent.jar; CDV=/tmp/ma-dev.jar; CGH=/tmp/ma-gh.jar
rm -f $CA $CS $CTL $CAG $CDV $CGH
P=0; F=0
ok(){ if [ "$1" = "$2" ]; then P=$((P+1)); echo "PASS: $3"; else F=$((F+1)); echo "FAIL: $3 (expected [$2] got [$1])"; fi; }
contains(){ if echo "$1" | grep -q "$2"; then P=$((P+1)); echo "PASS: $3"; else F=$((F+1)); echo "FAIL: $3 — missing [$2] in: $(echo "$1" | head -c 300)"; fi; }
notcontains(){ if echo "$1" | grep -q "$2"; then F=$((F+1)); echo "FAIL: $3 — unexpectedly contains [$2]"; else P=$((P+1)); echo "PASS: $3"; fi; }

login(){ curl -s -c "$1" -X POST $BASE/api/auth -H "$J" -d "{\"action\":\"login\",\"email\":\"$2\",\"password\":\"$3\"}" >/dev/null; }

login $CA echristian@kallmania.com '@21279413'          # admin
login $CS sup.lagos@kallmania.test '@Test1234'          # Emeka Obi — Lagos supervisor
login $CTL social.lead.e2e@kallmania.com '@Test1234'    # Samuel Lead — Lagos team lead
login $CAG blessing.okafor@kallmania.com '@Test1234'    # Blessing — Lagos agent
login $CDV dev.tunde@kallmania.com '@Test1234'          # Tunde — Lagos developer
login $CGH kwame.mensah@kallmania.test '@Test1234'      # Kwame — Ghana agent (outside Lagos)

UIDS=$(curl -s -b $CA $BASE/api/users)
BID=$(echo "$UIDS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.find(u=>u.email==='blessing.okafor@kallmania.com').id);});")
TID=$(echo "$UIDS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.find(u=>u.email==='dev.tunde@kallmania.com').id);});")
KID=$(echo "$UIDS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.find(u=>u.email==='kwame.mensah@kallmania.test').id);});")
STAMP=$(date +%s)

# ── 1. SUPERVISOR KPI CONFIG — WEB_DEV & SOCIAL_MEDIA ───────────────────────
R=$(curl -s -b $CS -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"WEB_DEV","key":"websiteUptime","label":"Website Uptime (%)","category":"TECH","unit":"percent","defaultTarget":99.5,"mandatory":false,"active":true}')
contains "$R" '"defaultTarget":99.5' "supervisor sets WEB_DEV websiteUptime target 99.5"
R=$(curl -s -b $CS -X POST $BASE/api/kpi-config -H "$J" -d "{\"department\":\"SOCIAL_MEDIA\",\"key\":\"e2e_soc_${STAMP}\",\"label\":\"E2E Social Metric\",\"category\":\"CUSTOM\",\"unit\":\"count\",\"defaultTarget\":12,\"active\":true}")
contains "$R" '"defaultTarget":12' "supervisor adds custom SOCIAL_MEDIA metric"
SOCID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {config}=JSON.parse(s);console.log(config?config.id:'');});")
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS -X DELETE "$BASE/api/kpi-config?id=$SOCID")" "200" "supervisor deletes own SOCIAL_MEDIA metric"
R=$(curl -s -b $CS $BASE/api/kpi-config)
contains "$R" '"websiteUptime"' "catalogue exposes WEB_DEV rows to supervisor"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CTL -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"WEB_DEV","key":"e2e_tl_web","label":"x"}')" "403" "team lead still blocked from KPI config (403)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CAG -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"SOCIAL_MEDIA","key":"e2e_ag_soc","label":"x"}')" "403" "agent still blocked from KPI config (403)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CA -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"WEB_DEV","key":"ticketsAssigned","label":"Tickets / Tasks Assigned","category":"TECH","unit":"count","defaultTarget":10,"active":true}')" "201" "admin still configures WEB_DEV (201)"
# reset admin's target back to no-fixed-target
curl -s -b $CA -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"WEB_DEV","key":"ticketsAssigned","label":"Tickets / Tasks Assigned","category":"TECH","unit":"count","defaultTarget":"","active":true}' >/dev/null

# ── 2. MULTI-ASSIGNEE TASKS ─────────────────────────────────────────────────
TITLE="E2E Multi $STAMP"
R=$(curl -s -b $CA -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"$TITLE\",\"description\":\"shared task\",\"department\":\"OUTBOUND\",\"priority\":\"HIGH\",\"assigneeIds\":[\"$BID\",\"$TID\"]}")
contains "$R" '"assignees"' "admin creates multi-assignee task"
MULTI=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task&&task.assignees.length===2&&task.assigneeId==='$BID'?'ok':'bad:'+task.assignees.length+':'+task.assigneeId);});")
ok "$MULTI" "ok" "task has 2 assignees, primary = first pick"
MULTIID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")

ok "$(curl -s -b $CAG "$BASE/api/tasks?mine=1" | grep -c "$TITLE")" "1" "primary assignee sees shared task in My Tasks"
ok "$(curl -s -b $CDV "$BASE/api/tasks?mine=1" | grep -c "$TITLE")" "1" "second assignee sees shared task in My Tasks"
ok "$(curl -s -b $CGH "$BASE/api/tasks?mine=1" | grep -c "$TITLE")" "0" "unrelated agent does NOT see it"

# out-of-centre multi-assign blocked for scoped supervisor
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"x-$STAMP\",\"department\":\"OUTBOUND\",\"assigneeIds\":[\"$BID\",\"$KID\"]}")" "403" "supervisor multi-assign across centres rejected (403)"

# supervisor assigns two in-centre staff, then reassigns down to one
TITLE2="E2E Sup Multi $STAMP"
R=$(curl -s -b $CS -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"$TITLE2\",\"department\":\"WEB_DEV\",\"category\":\"Bug Fixing\",\"assigneeIds\":[\"$BID\",\"$TID\"]}")
contains "$R" '"assignees"' "supervisor assigns task to 2 centre staff (201)"
SUPID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")
R=$(curl -s -b $CS -X PATCH $BASE/api/tasks -H "$J" -d "{\"id\":\"$SUPID\",\"assigneeIds\":[\"$TID\"]}")
REASSIGN=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task&&task.assignees.length===1&&task.assignees[0].id==='$TID'&&task.assigneeId==='$TID'?'ok':'bad');});")
ok "$REASSIGN" "ok" "reassign replaces set (1 assignee, primary updated)"
ok "$(curl -s -b $CAG "$BASE/api/tasks?mine=1" | grep -c "$TITLE2")" "0" "removed assignee no longer sees the task"

# junction member (not primary, not manager) can still update the shared task
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CDV -X PATCH $BASE/api/tasks -H "$J" -d "{\"id\":\"$MULTIID\",\"status\":\"IN_PROGRESS\"}")" "200" "second assignee updates the shared task status"

# notifications reached both assignees
contains "$(curl -s -b $CDV $BASE/api/notifications)" "$TITLE" "assignee received 'New task assigned' notification"

# legacy single-assignee still works
R=$(curl -s -b $CA -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"E2E Legacy $STAMP\",\"department\":\"OUTBOUND\",\"assigneeId\":\"$BID\"}")
LEGACY=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task&&task.assignees.length===1&&task.assigneeId==='$BID'?'ok':'bad');});")
ok "$LEGACY" "ok" "legacy single assigneeId still works (1 junction row)"
LEGID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")

# employee personal task defaults to self and is visible under My Tasks
PTITLE="E2E Personal $STAMP"
R=$(curl -s -b $CAG -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"$PTITLE\",\"department\":\"OUTBOUND\"}")
PERSONAL=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task&&task.assigneeId==='$BID'?'ok':'bad:'+task.assigneeId);});")
ok "$PERSONAL" "ok" "employee personal task defaults assignee to self"
ok "$(curl -s -b $CAG "$BASE/api/tasks?mine=1" | grep -c "$PTITLE")" "1" "personal task visible in My Tasks"
PTID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")

# ── CLEANUP ─────────────────────────────────────────────────────────────────
for ID in $MULTIID $SUPID $LEGID $PTID; do
  [ -n "$ID" ] && curl -s -b $CA -X DELETE "$BASE/api/tasks?id=$ID" >/dev/null
done
# reset websiteUptime target to no-fixed-target
curl -s -b $CA -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"WEB_DEV","key":"websiteUptime","label":"Website Uptime (%)","category":"TECH","unit":"percent","defaultTarget":"","active":true}' >/dev/null

echo "───────────────────────────────"
echo "RESULTS: $P passed, $F failed"
[ $F -eq 0 ]
