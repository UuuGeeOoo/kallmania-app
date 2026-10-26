#!/bin/bash
# End-to-end test: create AGENT_BPO report via API → download docx → verify master template fill
set -e
CK=/tmp/ck.txt
BASE=http://localhost:3000

KPIS='[{"key":"totalCallsMade","label":"Total Calls Made","target":30,"targetLabel":"30","actual":34,"variance":4,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":"","mandatory":true},{"key":"totalMailsSent","label":"Total Mails Sent","target":10,"targetLabel":"10","actual":12,"variance":2,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":"","mandatory":true},{"key":"callsConnected","label":"Calls Connected","target":25,"targetLabel":"25","actual":21,"variance":-4,"unit":"count","category":"CORE_TEMPLATE","auto":false,"notes":"3 voicemails","mandatory":true},{"key":"contactRate","label":"Contact Rate (%)","target":100,"targetLabel":"100%","actual":61.76,"variance":-38.24,"unit":"percent","category":"CORE_TEMPLATE","auto":true,"notes":"","mandatory":false},{"key":"wrapUpTime","label":"Wrap-Up / After-Call Work (mins)","target":20,"targetLabel":"20mins","actual":18,"variance":-2,"unit":"minutes","category":"CORE_TEMPLATE","auto":false,"notes":"","mandatory":false},{"key":"bouncedEmails","label":"Bounced Emails","target":null,"targetLabel":"-","actual":1,"variance":null,"unit":"count","category":"EMAIL_EXTENSION","auto":false,"notes":"mailbox full","mandatory":false}]'
CALLS='[{"leadName":"Eastlake Motors","disposition":"Interested","followUp":"Yes","notes":"Send quote tomorrow"},{"leadName":"Mrs. Adeyemi","disposition":"Requested for Email","followUp":"Yes","notes":"Wants price list by mail"},{"leadName":"Bluegate Ltd","disposition":"Callback Requested","followUp":"Yes","notes":"Call Thursday 10am"},{"leadName":"Dr. Hassan","disposition":"Not Interested","followUp":"No","notes":"Current contract runs to Q3"}]'

REPORT=$(curl -s -b $CK -X POST $BASE/api/reports -H "Content-Type: application/json" -d "{
  \"type\": \"AGENT_BPO\",
  \"reportDate\": \"$(date +%F)\",
  \"department\": \"BPO\",
  \"shiftTime\": \"09:00 - 17:00\",
  \"clockIn\": \"08:57\",
  \"clockOut\": \"17:04\",
  \"attendanceStatus\": \"Present\",
  \"latenessMins\": 0,
  \"kpiMetrics\": $KPIS,
  \"callLogs\": $CALLS,
  \"challenges\": \"Network outage between 11am and 12pm slowed dialing.\",
  \"escalations\": \"Granite Works proposal needs management pricing approval.\"
}")
RID=$(echo "$REPORT" | python3 -c "import json,sys; print(json.load(sys.stdin)['report']['id'])")
REF=$(echo "$REPORT" | python3 -c "import json,sys; print(json.load(sys.stdin)['report']['ref'])")
echo "Created report $REF ($RID)"

# 1) download docx
curl -s -b $CK -o /tmp/e2e_agent.docx "$BASE/api/export?format=docx&id=$RID"
echo "docx size: $(stat -c%s /tmp/e2e_agent.docx)"

# 2) preview endpoint
curl -s -b $CK "$BASE/api/export/preview?id=$RID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('preview kind:', d.get('kind'), '| viaMaster:', d.get('viaMaster'), '| html len:', len(d.get('html','')), '| filename:', d.get('filename'))
"

echo "RID=$RID" > /tmp/e2e_rid.txt
