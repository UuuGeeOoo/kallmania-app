#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# E2E — Centre operations batch:
#   1. Yearly KPI period (dashboard + per-staff)
#   2. Supervisor access to KPI configuration (BPO/INBOUND/WEB_DEV/SOCIAL_MEDIA, core rows protected)
#   3. Centre Staff listing (supervisor + team lead centre-scoped, agents rejected)
#   4. Per-agent KPI drills (inside centre OK, outside centre 403)
#   5. Team Lead task assignment & monitoring (centre-scoped)
#   6. Admin & supervisor individual task assignment (centre-scoped lists)
#   7. Notify / Escalate bar (team lead + supervisor + manager; admin always copied)
#   8. Web & Technical Team Report replica (TECH submit → aggregates → docx export)
#   9. Task departments: no new BPO tasks; OUTBOUND/INBOUND accepted
# ─────────────────────────────────────────────────────────────────────────────
BASE="http://localhost:3000"
J='Content-Type: application/json'
CA=/tmp/centre-admin.jar; CS=/tmp/centre-sup.jar; CTL=/tmp/centre-tl.jar; CAG=/tmp/centre-agent.jar; CDV=/tmp/centre-dev.jar; CGH=/tmp/centre-gh.jar
rm -f $CA $CS $CTL $CAG $CDV $CGH
P=0; F=0
ok(){ if [ "$1" = "$2" ]; then P=$((P+1)); echo "PASS: $3"; else F=$((F+1)); echo "FAIL: $3 (expected [$2] got [$1])"; fi; }
contains(){ if echo "$1" | grep -q "$2"; then P=$((P+1)); echo "PASS: $3"; else F=$((F+1)); echo "FAIL: $3 — missing [$2] in: $(echo "$1" | head -c 300)"; fi; }
notcontains(){ if echo "$1" | grep -q "$2"; then F=$((F+1)); echo "FAIL: $3 — unexpectedly contains [$2]"; else P=$((P+1)); echo "PASS: $3"; fi; }

login(){ curl -s -c "$1" -X POST $BASE/api/auth -H "$J" -d "{\"action\":\"login\",\"email\":\"$2\",\"password\":\"$3\"}" >/dev/null; }

login $CA echristian@kallmania.com '@21279413'          # admin
login $CS sup.lagos@kallmania.test '@Test1234'          # Emeka Obi — Lagos supervisor
login $CTL social.lead.e2e@kallmania.com '@Test1234'    # Samuel Lead — Lagos team lead (SOCIAL)
login $CAG blessing.okafor@kallmania.com '@Test1234'    # Blessing — Lagos agent
login $CDV dev.tunde@kallmania.com '@Test1234'          # Tunde — developer (Lagos)
login $CGH kwame.mensah@kallmania.test '@Test1234'      # Kwame — Ghana agent (outside Lagos)

BID=$(curl -s -b $CA $BASE/api/users | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.find(u=>u.email==='blessing.okafor@kallmania.com').id);});")
KID=$(curl -s -b $CA $BASE/api/users | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.find(u=>u.email==='kwame.mensah@kallmania.test').id);});")
TID=$(curl -s -b $CA $BASE/api/users | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.find(u=>u.email==='dev.tunde@kallmania.com').id);});")

# ── 1. YEARLY KPI PERIOD ─────────────────────────────────────────────────────
R=$(curl -s -b $CA "$BASE/api/kpi/summary?period=year&date=2026-10-20")
ok "$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.label||'none');})")" "Year 2026" "yearly label = Year 2026"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS "$BASE/api/kpi/summary?period=year")" "200" "supervisor yearly summary 200"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS "$BASE/api/kpi/summary?period=year&userId=$BID")" "200" "supervisor per-agent yearly drill 200"

# ── 2. SUPERVISOR KPI CONFIGURATION ─────────────────────────────────────────
R=$(curl -s -b $CS -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"BPO","key":"e2e_sup_metric","label":"E2E Sup Metric","defaultTarget":5,"unit":"count"}')
contains "$R" '"e2e_sup_metric"' "supervisor creates BPO metric (201)"
SUPCFG=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {config}=JSON.parse(s);console.log(config?config.id:'');});")
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"WEB_DEV","key":"e2e_sup_web","label":"E2E Web","defaultTarget":99.5,"unit":"percent"}')" "201" "supervisor configures WEB_DEV targets (201)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"SOCIAL_MEDIA","key":"e2e_sup_social","label":"E2E Social","defaultTarget":10,"unit":"count"}')" "201" "supervisor configures SOCIAL_MEDIA targets (201)"
for E2EKEY in e2e_sup_web e2e_sup_social; do
  E2EID=$(curl -s -b $CS $BASE/api/kpi-config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {configs}=JSON.parse(s);const c=configs.find(c=>(c.department==='WEB_DEV'||c.department==='SOCIAL_MEDIA')&&c.key==='$E2EKEY');console.log(c?c.id:'');});")
  [ -n "$E2EID" ] && curl -s -b $CS -X DELETE "$BASE/api/kpi-config?id=$E2EID" >/dev/null
done
COREID=$(curl -s -b $CS $BASE/api/kpi-config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {configs}=JSON.parse(s);const c=configs.find(c=>c.department==='BPO'&&c.key==='totalCallsMade');console.log(c?c.id:'');});")
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS -X DELETE "$BASE/api/kpi-config?id=$COREID")" "403" "supervisor cannot delete protected core row (403)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS -X DELETE "$BASE/api/kpi-config?id=$SUPCFG")" "200" "supervisor deletes own custom metric (200)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CAG -X POST $BASE/api/kpi-config -H "$J" -d '{"department":"BPO","key":"e2e_agent_metric","label":"x"}')" "403" "agent blocked from editing configs (403)"

# ── 3. CENTRE STAFF LIST ────────────────────────────────────────────────────
R=$(curl -s -b $CS $BASE/api/users)
ok "$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log((users.length>0)+'|'+users.every(u=>u.country==='Nigeria'&&u.state==='Lagos')+'|'+!users.some(u=>u.country==='Ghana'));})")" "true|true|true" "supervisor sees only Lagos centre staff (no Ghana)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CAG $BASE/api/users)" "403" "agent blocked from staff list (403)"
R=$(curl -s -b $CTL $BASE/api/users)
ok "$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {users}=JSON.parse(s);console.log(users.length>0&&users.every(u=>u.country==='Nigeria'&&u.state==='Lagos'));})")" "true" "team lead sees centre staff (Lagos-scoped)"

# ── 4. PER-AGENT KPI DRILLS ─────────────────────────────────────────────────
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS "$BASE/api/kpi/summary?period=week&userId=$BID")" "200" "supervisor drills Blessing (Lagos) 200"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CS "$BASE/api/kpi/summary?period=week&userId=$KID")" "403" "supervisor blocked from Kwame (Ghana) 403"

# ── 5. TEAM LEAD TASK ASSIGNMENT & MONITORING ───────────────────────────────
R=$(curl -s -b $CTL -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"E2E TL task for Blessing\",\"assigneeId\":\"$BID\",\"department\":\"OUTBOUND\",\"priority\":\"HIGH\"}")
contains "$R" '"title":"E2E TL task for Blessing"' "team lead assigns task to centre agent (201)"
TLTASK=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CTL -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"E2E TL out-of-centre\",\"assigneeId\":\"$KID\"}")" "403" "team lead blocked from out-of-centre assignee (403)"
R=$(curl -s -b $CTL "$BASE/api/tasks")
contains "$R" 'E2E TL task for Blessing' "team lead monitors centre tasks (sees created task)"
notcontains "$R" 'Ghana-only-marker' "team lead task list centre-scoped"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CTL -X PATCH $BASE/api/tasks -H "$J" -d "{\"id\":\"$TLTASK\",\"status\":\"IN_PROGRESS\"}")" "200" "team lead updates agent task status (200)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CAG -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"E2E agent to dev\",\"assigneeId\":\"$TID\"}")" "403" "agent cannot assign to another employee (403)"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CTL -X DELETE "$BASE/api/tasks?id=$TLTASK")" "200" "team lead deletes own created task (200)"

# ── 6. ADMIN & SUPERVISOR INDIVIDUAL ASSIGNMENT ─────────────────────────────
R=$(curl -s -b $CS -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"E2E supervisor individual task\",\"assigneeId\":\"$BID\",\"department\":\"OUTBOUND\"}")
contains "$R" 'E2E supervisor individual task' "supervisor assigns individual task to agent (201)"
SUPTASK=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")
R=$(curl -s -b $CA -X POST $BASE/api/tasks -H "$J" -d "{\"title\":\"E2E admin individual task\",\"assigneeId\":\"$BID\",\"department\":\"INBOUND\"}")
contains "$R" 'E2E admin individual task' "admin assigns individual INBOUND task (201)"
ADMTASK=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {task}=JSON.parse(s);console.log(task?task.id:'');});")
R=$(curl -s -b $CS "$BASE/api/tasks")
contains "$R" 'E2E admin individual task' "supervisor task list shows centre tasks"
notcontains "$R" '"department":"BPO"' "no legacy BPO department among tasks"

# ── 7. NOTIFY / ESCALATE BAR ────────────────────────────────────────────────
R=$(curl -s -b $CAG -X POST $BASE/api/notifications -H "$J" -d '{"action":"escalate","recipients":["TEAM_LEAD","SUPERVISOR","MANAGER"],"message":"E2E escalation — need manager approval","severity":"CRITICAL"}')
contains "$R" '"success":true' "agent sends escalation (200)"
DELIV=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.delivered||0);});")
if [ "$DELIV" -ge 3 ]; then P=$((P+1)); echo "PASS: escalation delivered to $DELIV recipients (TL+sup+admin)"; else F=$((F+1)); echo "FAIL: escalation delivered to only $DELIV"; fi
contains "$(curl -s -b $CS $BASE/api/notifications)" 'E2E escalation' "supervisor received the notice"
contains "$(curl -s -b $CTL $BASE/api/notifications)" 'E2E escalation' "team lead received the notice"
contains "$(curl -s -b $CA $BASE/api/notifications)" 'E2E escalation' "administrator received the notice too"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CAG -X POST $BASE/api/notifications -H "$J" -d '{"action":"escalate","recipients":[],"message":"x"}')" "400" "escalation without recipients rejected"
ok "$(curl -s -o /dev/null -w '%{http_code}' -b $CAG -X POST $BASE/api/notifications -H "$J" -d '{"action":"escalate","recipients":["MANAGER"],"message":""}')" "400" "empty message rejected"

# ── 8. WEB & TECHNICAL TEAM REPORT REPLICA ──────────────────────────────────
TODAY=$(date +%F)
R=$(curl -s -b $CDV -X POST $BASE/api/reports -H "$J" -d "{\"type\":\"TECH\",\"reportDate\":\"$TODAY\",\"department\":\"WEB_DEV\",\"submit\":true,\"shiftTime\":\"09:00-17:00\",\"clockIn\":\"09:05\",\"clockOut\":\"17:10\",\"attendanceStatus\":\"Present\",\"latenessMins\":5,\"teamName\":\"Frontend Developer\",\"challenges\":\"E2E challenge\",\"escalations\":\"E2E escalation note\",\"kpiMetrics\":[{\"key\":\"ticketsAssigned\",\"label\":\"Tickets / Tasks Assigned\",\"target\":8,\"targetLabel\":\"8\",\"actual\":9,\"variance\":1,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"tasksCompleted\",\"label\":\"Tickets / Tasks Completed\",\"target\":7,\"targetLabel\":\"7\",\"actual\":7,\"variance\":0,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"bugsReported\",\"label\":\"Bugs Reported\",\"target\":null,\"targetLabel\":\"-\",\"actual\":2,\"variance\":null,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"bugsResolved\",\"label\":\"Bugs Resolved\",\"target\":null,\"targetLabel\":\"-\",\"actual\":2,\"variance\":null,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"pagesUpdated\",\"label\":\"Pages / Sites Updated\",\"target\":null,\"targetLabel\":\"-\",\"actual\":3,\"variance\":null,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"websiteUptime\",\"label\":\"Website Uptime (%)\",\"target\":99,\"targetLabel\":\"99\",\"actual\":99.9,\"variance\":0.9,\"unit\":\"percent\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"avgResponseHrs\",\"label\":\"Avg. Response Time to Tickets (hrs)\",\"target\":null,\"targetLabel\":\"-\",\"actual\":1.5,\"variance\":null,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"codeReviewsDone\",\"label\":\"Code Reviews Completed\",\"target\":null,\"targetLabel\":\"-\",\"actual\":2,\"variance\":null,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"},{\"key\":\"deploymentsCompleted\",\"label\":\"Deployments Made\",\"target\":null,\"targetLabel\":\"-\",\"actual\":1,\"variance\":null,\"unit\":\"count\",\"category\":\"DEPT_TEMPLATE\",\"auto\":false,\"notes\":\"\"}],\"workEntries\":[{\"description\":\"Fix checkout bug\",\"clientProject\":\"sbts-store\",\"status\":\"Completed\",\"output\":\"Patch deployed\"}]}")
contains "$R" '"ref":"TEC-' "developer submits Web & Technical replica report (201)"
TECHID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {report}=JSON.parse(s);console.log(report?report.id:'');});")
R=$(curl -s -b $CA "$BASE/api/kpi/summary?period=day&date=$TODAY&userId=$TID")
contains "$R" '"ticketsAssigned"' "TECH aggregates flow into KPI summary (ticketsAssigned key)"
contains "$R" '"websiteUptime"' "TECH aggregates websiteUptime key"
R=$(curl -s -b $CA -o /tmp/tech-export.docx -w '%{http_code}' "$BASE/api/export?format=docx&id=$TECHID")
ok "$R" "200" "TECH docx export 200"
file /tmp/tech-export.docx | grep -qi "word\|microsoft" && { P=$((P+1)); echo "PASS: export is a real .docx"; } || { F=$((F+1)); echo "FAIL: export not docx: $(file /tmp/tech-export.docx)"; }
python3 -c "
from docx import Document
d = Document('/tmp/tech-export.docx')
tables = [t for t in d.tables]
texts = []
for t in tables:
    for row in t.rows:
        texts.append(' | '.join(c.text for c in row.cells))
blob = '\n'.join(texts)
checks = ['Tickets / Tasks Assigned','Bugs Resolved','Website Uptime (%)','Code Reviews Completed','Deployments Made','TASKS ASSIGNED & COMPLETED','Task / Ticket Description','Client / Project','Output / Deliverable','SUPERVISOR COMMENTS','Supervisor Name','Signature / Date','Staff Name','Lateness (mins)']
missing = [c for c in checks if c not in blob]
print('MISSING:'+';'.join(missing) if missing else 'ALL-TEMPLATE-SECTIONS-PRESENT')
" 2>/dev/null | grep -q "ALL-TEMPLATE-SECTIONS-PRESENT" && { P=$((P+1)); echo "PASS: docx contains every template section (exact replica)"; } || { F=$((F+1)); echo "FAIL: docx template replica check"; }

# ── 9. CLEANUP ──────────────────────────────────────────────────────────────
curl -s -b $CS -X DELETE "$BASE/api/tasks?id=$SUPTASK" > /dev/null
curl -s -b $CA -X DELETE "$BASE/api/tasks?id=$ADMTASK" > /dev/null
echo "── cleanup done ──"
echo "RESULT: $P passed, $F failed"
[ "$F" = "0" ]
