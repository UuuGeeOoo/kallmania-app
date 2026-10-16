#!/bin/bash
# E2E verification for: dynamic call logs, social docx-replica report, submit state, exports
BASE=http://localhost:3000
J="Content-Type: application/json"
PASS=0; FAIL=0
ck() { if echo "$2" | grep -q "$3"; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 → $(echo "$2" | head -c 220)"; fi }

# ── login social user
C=/tmp/soc.jar
R=$(curl -s -c $C -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"social.amara@kallmania.com","password":"@soc12345"}')
ck "social login" "$R" '"success":true'

TODAY=$(date +%F)
# 7 KPI rows filled + 8 tasks (more than the 6 template rows) — dynamic rows test
KPI='[{"key":"postsCreated","label":"Posts Created / Published","target":5,"targetLabel":"5","actual":7,"variance":2,"unit":"count","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"storiesReels","label":"Stories / Reels Created","target":null,"targetLabel":"-","actual":4,"variance":null,"unit":"count","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"engagementRate","label":"Content Engagement Rate (%)","target":null,"targetLabel":"-","actual":6.5,"variance":null,"unit":"percent","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"reachImpressions","label":"Reach / Impressions","target":null,"targetLabel":"-","actual":12000,"variance":null,"unit":"count","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"followerGrowth","label":"Follower Growth (Net)","target":null,"targetLabel":"-","actual":210,"variance":null,"unit":"count","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"commentsDMs","label":"Comments / DMs Responded To","target":null,"targetLabel":"-","actual":35,"variance":null,"unit":"count","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"calendarAdherence","label":"Content Calendar Adherence (%)","target":null,"targetLabel":"-","actual":100,"variance":null,"unit":"percent","category":"SOCIAL_TEMPLATE","auto":false,"notes":""},{"key":"graphicsDesigned","label":"Graphics / Visuals Designed","target":null,"targetLabel":"-","actual":9,"variance":null,"unit":"count","category":"SOCIAL_TEMPLATE","auto":false,"notes":""}]'
TASKS='['
for i in 1 2 3 4 5 6 7 8; do
  TASKS+="{\"task\":\"Task $i - content item\",\"platform\":\"Instagram\",\"status\":\"Published\",\"deliverable\":\"Output $i\"},"
done
TASKS=${TASKS%,}']'

R=$(curl -s -b $C -X POST $BASE/api/reports -H "$J" -d "{\"type\":\"SOCIAL\",\"reportDate\":\"$TODAY\",\"department\":\"SOCIAL_MEDIA\",\"submit\":true,\"shiftTime\":\"09:00-17:00\",\"clockIn\":\"09:05\",\"clockOut\":\"17:10\",\"attendanceStatus\":\"Present\",\"latenessMins\":5,\"teamName\":\"Social Media Specialist\",\"kpiMetrics\":$KPI,\"workEntries\":$TASKS,\"challenges\":\"Trend pace\",\"escalations\":\"\"}")
ck "social submit → SUBMITTED" "$R" '"status":"SUBMITTED"'
ck "social derived metricsSummary postsPublished=7" "$R" '"postsPublished":7'
RID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  report id: $RID"

# ── login BPO agent: 9 call log rows (dynamic > 8)
C2=/tmp/agent.jar
R=$(curl -s -c $C2 -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"blessing.okafor@kallmania.com","password":"@agent123"}')
ck "agent login" "$R" '"success":true'
LOGS='['
for i in 1 2 3 4 5 6 7 8 9; do LOGS+="{\"leadName\":\"Lead $i\",\"disposition\":\"Interested\",\"followUp\":\"Yes\",\"notes\":\"note $i\"},"; done
LOGS=${LOGS%,}']'
R=$(curl -s -b $C2 -X POST $BASE/api/reports -H "$J" -d "{\"type\":\"AGENT_BPO\",\"reportDate\":\"$TODAY\",\"department\":\"BPO\",\"submit\":true,\"shiftTime\":\"09:00-17:00\",\"attendanceStatus\":\"Present\",\"kpiMetrics\":[{\"key\":\"totalCallsMade\",\"label\":\"Total Calls Made\",\"target\":30,\"targetLabel\":\"30\",\"actual\":40,\"variance\":10,\"unit\":\"count\",\"category\":\"CORE_TEMPLATE\",\"auto\":false,\"notes\":\"\"}],\"callLogs\":$LOGS,\"challenges\":\"\",\"escalations\":\"\"}")
ck "agent submit → SUBMITTED" "$R" '"status":"SUBMITTED"'
ARID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# re-POST (edit attempt) while SUBMITTED should be allowed at API level (UI locks it)
R=$(curl -s -b $C2 -X POST $BASE/api/reports -H "$J" -d "{\"id\":\"$ARID\",\"type\":\"AGENT_BPO\",\"reportDate\":\"$TODAY\",\"department\":\"BPO\",\"challenges\":\"updated-while-submitted\"}")
ck "submitted report persisted id" "$R" "\"id\":\"$ARID\""

# ── admin: verify social docx export is template replica
CA=/tmp/admin.jar
R=$(curl -s -c $CA -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
ck "admin login" "$R" '"success":true'
curl -s -b $CA -o /tmp/social-export.docx "$BASE/api/export?format=docx&id=$RID"
FILE_TYPE=$(file -b /tmp/social-export.docx 2>/dev/null || echo "unknown")
ck "social docx export valid" "$FILE_TYPE" "Word"
(cd /tmp && rm -rf sx && mkdir sx && cd sx && unzip -o -q ../social-export.docx word/document.xml && python3 -c "
import re
xml = open('word/document.xml', encoding='utf-8').read()
text = re.sub(r'<[^>]+>', '', xml).replace('&amp;', '&')
checks = ['SBTS Group Global — Social Media Team Daily Report','DAILY REPORT — SOCIAL MEDIA MANAGEMENT','STAFF INFORMATION','KEY PERFORMANCE METRICS (KPIs)','Posts Created / Published','TASKS ASSIGNED & COMPLETED','Deliverable / Output','CHALLENGES / BLOCKERS','ESCALATIONS','SUPERVISOR COMMENTS','Confidential — For Internal Use Only','Task 8 - content item','Social Media Specialist']
missing = [c for c in checks if c not in text]
print('MISSING:', missing if missing else 'none — all 13 replica markers found')
")
# KPI summary still aggregates social via derived metricsSummary
R=$(curl -s -b $CA "$BASE/api/kpi/summary?period=day&date=$TODAY")
ck "kpi summary social reach=12000" "$R" '"reach":12000'

# supervisor sees social report in review queue with new structure
C3=/tmp/sup.jar
R=$(curl -s -c $C3 -X POST $BASE/api/auth -H "$J" -d '{"action":"login","email":"sup.ngozi@kallmania.com","password":"@sup12345"}')
R=$(curl -s -b $C3 "$BASE/api/reports?type=SOCIAL&date=$TODAY")
ck "supervisor sees social report" "$R" '"postsCreated"'
# approve it → agent should see APPROVED on next load
R=$(curl -s -b $C3 -X PATCH $BASE/api/reports -H "$J" -d "{\"id\":\"$RID\",\"decision\":\"approve\",\"feedback\":\"Great content output today\"}")
ck "supervisor approve" "$R" '"status":"APPROVED"'

echo "=============================="
echo "PASS=$PASS FAIL=$FAIL"
