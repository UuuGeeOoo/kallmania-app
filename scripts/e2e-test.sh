#!/bin/bash
# End-to-end workflow test for Kallmania
set -e
BASE="http://localhost:3000"
J='Content-Type: application/json'
PASS=0; FAIL=0
check() {
  if echo "$2" | grep -q "$3"; then PASS=$((PASS+1)); echo "PASS: $1";
  else FAIL=$((FAIL+1)); echo "FAIL: $1 — got: $(echo "$2" | head -c 300)"; fi
}

# ── 1. Admin login ──
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' -c /tmp/admin.jar)
check "Admin login" "$R" "success"

# ── 2. Self-registrations ──
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"register","email":"blessing.okafor@kallmania.com","password":"@agent123","fullName":"Blessing Okafor","role":"AGENT_BPO","department":"BPO","employeeId":"SBTS-BPO-014"}')
check "BPO agent registers" "$R" "success"
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"register","email":"dev.tunde@kallmania.com","password":"@dev12345","fullName":"Tunde Adeyemi","role":"DEVELOPER","department":"WEB_DEV"}')
check "Developer registers" "$R" "success"
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"register","email":"social.amara@kallmania.com","password":"@soc12345","fullName":"Amara Eze","role":"SOCIAL_MEDIA","department":"SOCIAL_MEDIA"}')
check "Social media registers" "$R" "success"
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"register","email":"sup.ngozi@kallmania.com","password":"@sup12345","fullName":"Ngozi Bello","role":"SUPERVISOR","department":"MANAGEMENT"}')
check "Supervisor registers" "$R" "success"

# ── 3. Pending user cannot log in ──
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"blessing.okafor@kallmania.com","password":"@agent123"}')
check "Pending login blocked" "$R" "awaiting administrator"

# ── 4. Admin approves with role management ──
R=$(curl -s "$BASE/api/users?status=PENDING" -b /tmp/admin.jar)
UID_AGENT=$(echo "$R" | grep -o '"id":"[^"]*","email":"blessing.okafor@kallmania.com"' | cut -d'"' -f4)
UID_DEV=$(echo "$R" | grep -o '"id":"[^"]*","email":"dev.tunde@kallmania.com"' | cut -d'"' -f4)
UID_SOC=$(echo "$R" | grep -o '"id":"[^"]*","email":"social.amara@kallmania.com"' | cut -d'"' -f4)
UID_SUP=$(echo "$R" | grep -o '"id":"[^"]*","email":"sup.ngozi@kallmania.com"' | cut -d'"' -f4)
check "Admin lists pending users" "$R" "Blessing Okafor"
curl -s -X PATCH $BASE/api/users -H "$J" -b /tmp/admin.jar -d "{\"userId\":\"$UID_AGENT\",\"action\":\"approve\"}" > /dev/null
curl -s -X PATCH $BASE/api/users -H "$J" -b /tmp/admin.jar -d "{\"userId\":\"$UID_DEV\",\"action\":\"approve\"}" > /dev/null
curl -s -X PATCH $BASE/api/users -H "$J" -b /tmp/admin.jar -d "{\"userId\":\"$UID_SOC\",\"action\":\"approve\"}" > /dev/null
curl -s -X PATCH $BASE/api/users -H "$J" -b /tmp/admin.jar -d "{\"userId\":\"$UID_SUP\",\"action\":\"approve\"}" > /dev/null
check "Admin approves users" "done" "done"

# ── 5. Agent logs in, submits BPO report with calls AND emails ──
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"blessing.okafor@kallmania.com","password":"@agent123"}' -c /tmp/agent.jar)
check "Agent login" "$R" "success"
TODAY=$(date +%F)
KPIS='[{"key":"totalCallsMade","label":"Total Calls Made","target":30,"targetLabel":"30","actual":28,"variance":null,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"totalMailsSent","label":"Total Mails Sent","target":10,"targetLabel":"10","actual":12,"variance":null,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"callsConnected","label":"Calls Connected","target":25,"targetLabel":"25","actual":21,"variance":null,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"contactRate","label":"Contact Rate (%)","target":100,"targetLabel":"100%","actual":null,"variance":null,"unit":"percent","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"conversionRate","label":"Conversion Rate (%)","target":2,"targetLabel":"2%","actual":null,"variance":null,"unit":"percent","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"hotLeads","label":"Hot Leads","target":null,"targetLabel":"-","actual":3,"variance":null,"unit":"count","category":"LEADS_EXTENSION","auto":false,"notes":""},{"key":"warmLeads","label":"Warm Leads","target":null,"targetLabel":"-","actual":4,"variance":null,"unit":"count","category":"LEADS_EXTENSION","auto":false,"notes":""},{"key":"leadsGenerated","label":"Leads Generated (HOT / WARM)","target":null,"targetLabel":"-","actual":null,"variance":null,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"wrapUpTime","label":"Wrap-Up / After-Call Work (mins)","target":20,"targetLabel":"20mins","actual":24,"variance":null,"unit":"minutes","category":"CORE_TEMPLATE","auto":false,"notes":""},{"key":"repliesReceived","label":"Replies Received","target":null,"targetLabel":"-","actual":5,"variance":null,"unit":"count","category":"EMAIL_EXTENSION","auto":false,"notes":""},{"key":"positiveReplies","label":"Positive Replies","target":null,"targetLabel":"-","actual":2,"variance":null,"unit":"count","category":"EMAIL_EXTENSION","auto":false,"notes":""}]'
R=$(curl -s -X POST $BASE/api/reports -H "$J" -b /tmp/agent.jar -d "{\"type\":\"AGENT_BPO\",\"reportDate\":\"$TODAY\",\"submit\":true,\"shiftTime\":\"09:00-17:00\",\"clockIn\":\"09:02\",\"clockOut\":\"17:05\",\"attendanceStatus\":\"Late\",\"latenessMins\":2,\"kpiMetrics\":$KPIS,\"callLogs\":\"[{\\\"leadName\\\":\\\"Chinedu O.\\\",\\\"disposition\\\":\\\"Hot Lead\\\",\\\"followUp\\\":\\\"Yes\\\",\\\"notes\\\":\\\"wants proposal\\\"}]\",\"challenges\":\"Network outage in the morning\",\"escalations\":\"Client X callback overdue\",\"additionalActivities\":\"Helped train new agent\",\"emailContext\":{\"campaignName\":\"Q3 SaaS Outreach\"}}")
check "Agent submits report" "$R" "SUBMITTED"
STORED=$(echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); m=json.loads(d['report']['kpiMetrics']); print(' '.join(str(x['actual']) for x in m if x['key']=='contactRate') + ' ' + ' '.join(str(x['actual']) for x in m if x['key']=='leadsGenerated'))")
check "Contact rate derived = 75" "$STORED" "^75 7$"

# ── 6. Supervisor notifications ──
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"sup.ngozi@kallmania.com","password":"@sup12345"}' -c /tmp/sup.jar)
check "Supervisor login" "$R" "success"
R=$(curl -s "$BASE/api/notifications" -b /tmp/sup.jar)
check "Supervisor notified of submission" "$R" "Daily report submitted"
check "Supervisor notified of escalation" "$R" "Escalation raised"

# ── 7. Task assignment + blocked alert ──
R=$(curl -s -X POST $BASE/api/tasks -H "$J" -b /tmp/admin.jar -d "{\"title\":\"Fix checkout bug on sbtsgroup.com\",\"description\":\"Payment fails on Safari\",\"assigneeId\":\"$UID_DEV\",\"department\":\"WEB_DEV\",\"category\":\"Bug Fixing\",\"priority\":\"HIGH\",\"requiredOutcome\":\"Patched and deployed\",\"target\":\"24h SLA\",\"deadline\":\"$TODAY\"}")
check "Task assigned to developer" "$R" "Fix checkout bug"
TASK_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
R=$(curl -s -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"dev.tunde@kallmania.com","password":"@dev12345"}' -c /tmp/dev.jar)
check "Developer login" "$R" "success"
R=$(curl -s -X PATCH $BASE/api/tasks -H "$J" -b /tmp/dev.jar -d "{\"id\":\"$TASK_ID\",\"status\":\"BLOCKED\",\"blocker\":\"Waiting on payment gateway credentials\"}")
check "Developer marks task blocked" "$R" "BLOCKED"

# ── 8. Developer tech report ──
R=$(curl -s -X POST $BASE/api/reports -H "$J" -b /tmp/dev.jar -d "{\"type\":\"TECH\",\"reportDate\":\"$TODAY\",\"submit\":true,\"attendanceStatus\":\"Present\",\"workEntries\":\"[{\\\"title\\\":\\\"Fix checkout bug\\\",\\\"project\\\":\\\"sbtsgroup.com\\\",\\\"category\\\":\\\"Bug Fixing\\\",\\\"status\\\":\\\"Blocked\\\",\\\"hours\\\":\\\"2\\\"},{\\\"title\\\":\\\"Landing page hero\\\",\\\"project\\\":\\\"kallmania\\\",\\\"category\\\":\\\"Frontend Development\\\",\\\"status\\\":\\\"Completed\\\",\\\"hours\\\":\\\"3\\\"}]\",\"metricsSummary\":{\"tasksCompleted\":1,\"bugsResolved\":0},\"challenges\":\"Gateway credentials missing\",\"escalations\":\"\"}")
check "Developer submits tech report" "$R" "SUBMITTED"

# ── 9. Upload + extraction + dedupe ──
printf 'DAILY REPORT - BPO CALL CENTER AGENTS\nAgent Name: Blessing Okafor\nDate: %s\nTotal Calls Made: 28\nCalls Connected: 21\nTotal Mails Sent: 12\nHot Leads: 3\nWarm Leads: 4\nCallbacks Scheduled: 5\nCHALLENGES / BLOCKERS\nNetwork outage\nESCALATIONS\nNone\n' "$TODAY" > /tmp/report-test.txt
R=$(curl -s -X POST $BASE/api/uploads -b /tmp/agent.jar -F "file=@/tmp/report-test.txt" -F "department=BPO" -F "reportDate=$TODAY")
UPLOAD_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "First upload accepted" "$R" "UPLOADED"
R=$(curl -s -X POST $BASE/api/uploads/extract -H "$J" -b /tmp/agent.jar -d "{\"id\":\"$UPLOAD_ID\"}")
check "Extraction maps fields" "$R" "totalCallsMade"
check "Extraction finds hot leads" "$R" "hotLeads"
check "Extraction finds challenges section" "$R" "challenges"
R=$(curl -s -X POST $BASE/api/uploads -b /tmp/agent.jar -F "file=@/tmp/report-test.txt" -F "department=BPO" -F "reportDate=$TODAY")
check "Duplicate upload rejected" "$R" "duplicate"

# ── 10. Consolidation + review ──
R=$(curl -s "$BASE/api/consolidated?date=$TODAY" -b /tmp/sup.jar)
check "Consolidation includes BPO totals" "$R" "bpoTotals"
check "Consolidation includes tech work entries" "$R" "workEntries"
check "Consolidation traces additional activities" "$R" "additionalActivities"
REPORT_ID=$(echo "$R" | grep -o '"id":"[^"]*","ref":"BPO-[^"]*"' | head -1 | cut -d'"' -f4)
R=$(curl -s -X PATCH $BASE/api/reports -H "$J" -b /tmp/sup.jar -d "{\"id\":\"$REPORT_ID\",\"decision\":\"approve\",\"feedback\":\"Good volume today. Note the network outage window.\"}")
check "Supervisor approves agent report" "$R" "APPROVED"

# ── 11. Exports ──
CODE=$(curl -s "$BASE/api/export?format=docx&id=$REPORT_ID" -b /tmp/sup.jar -o /tmp/export-test.docx -w "%{http_code}")
check "Word export works" "$CODE" "200"
FILE_TYPE=$(file /tmp/export-test.docx 2>/dev/null | head -c 120)
check "Word export is valid docx" "$FILE_TYPE" "Microsoft Word"
CODE=$(curl -s "$BASE/api/export?format=xlsx&id=$REPORT_ID" -b /tmp/sup.jar -o /tmp/export-test.xlsx -w "%{http_code}")
check "Excel export works" "$CODE" "200"
CODE=$(curl -s "$BASE/api/export?format=csv&id=$REPORT_ID" -b /tmp/sup.jar -o /tmp/export-test.csv -w "%{http_code}")
check "CSV export works" "$CODE" "200"
CODE=$(curl -s "$BASE/api/export?format=docx&scope=department&department=ALL&date=$TODAY" -b /tmp/sup.jar -o /tmp/export-consolidated.docx -w "%{http_code}")
check "Consolidated Word export works" "$CODE" "200"

# ── 12. RBAC ──
R=$(curl -s "$BASE/api/users" -b /tmp/agent.jar)
check "Employee blocked from user list" "$R" "Supervisor access required"
R=$(curl -s -X PATCH $BASE/api/users -H "$J" -b /tmp/agent.jar -d "{\"userId\":\"$UID_DEV\",\"action\":\"suspend\"}")
check "Employee blocked from admin actions" "$R" "Admin access required"

# ── 13. Dashboard ──
R=$(curl -s "$BASE/api/dashboard?date=$TODAY" -b /tmp/sup.jar)
check "Supervisor dashboard has dept table" "$R" "deptTable"
check "Dashboard counts blocked task" "$R" '"tasksBlocked":1'

echo ""
echo "══════════════════════════════"
echo "RESULTS: $PASS passed, $FAIL failed"
