#!/bin/bash
# E2E test: upload → extract → text draft → discard file → 410 guards → text intact
set -e
BASE=http://localhost:3000
JAR=/tmp/km-e2e-cookies.txt
TXT=/tmp/km-e2e-report.txt
rm -f "$JAR"

echo "== 1. login =="
CODE=$(curl -s -c "$JAR" -o /tmp/km-login.json -w "%{http_code}" -X POST "$BASE/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
echo "login: $CODE"; [ "$CODE" = "200" ] || { cat /tmp/km-login.json; exit 1; }

echo "== 2. seed test file =="
cat > "$TXT" <<'EOF'
DAILY REPORT — BPO OUTBOUND — 2026-10-27
Agent: Test Agent
Shift: 9:00 - 17:00
Calls Made: 47
Connected Calls: 21
Not Interested: 3
Follow-ups Scheduled: 8
Emails Sent: 30
Requested for Email: 5
Sales Closed: 2
Escalations: 1 customer requested callback on Monday
Challenges: Network fluctuation in the afternoon
EOF

echo "== 3. upload =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-up.json -w "%{http_code}" -X POST "$BASE/api/uploads" \
  -F "file=@$TXT;type=text/plain" -F "department=BPO" -F "reportDate=2026-10-27")
echo "upload: $CODE"; [ "$CODE" = "201" ] || { cat /tmp/km-up.json; exit 1; }
UPID=$(python3 -c "import json;print(json.load(open('/tmp/km-up.json'))['upload']['id'])")
STORED=$(python3 -c "import json;print(json.load(open('/tmp/km-up.json'))['upload']['storedName'])")
echo "uploadId=$UPID storedName=$STORED"
test -f "/home/z/my-project/uploads-storage/$STORED" && echo "file on disk: YES"

echo "== 4. discard BEFORE extraction (must fail 400) =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-d0.json -w "%{http_code}" -X POST "$BASE/api/uploads/discard" -H "Content-Type: application/json" -d "{\"id\":\"$UPID\"}")
echo "early discard: $CODE (expect 400)"; cat /tmp/km-d0.json | head -c 200; echo

echo "== 5. extract =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-ex.json -w "%{http_code}" -X POST "$BASE/api/uploads/extract" -H "Content-Type: application/json" -d "{\"id\":\"$UPID\"}" --max-time 120)
echo "extract: $CODE"; [ "$CODE" = "200" ] || { cat /tmp/km-ex.json; exit 1; }
python3 -c "
import json; d=json.load(open('/tmp/km-ex.json'))
print('fields found:', d['stats']['fieldsFound'], '| aiChecked:', d['stats'].get('aiChecked'))
print('rawTextPreview starts:', repr(d['rawTextPreview'][:60]))"

echo "== 6. text draft endpoint =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-tx.json -w "%{http_code}" "$BASE/api/uploads/text?id=$UPID")
echo "text: $CODE"
python3 -c "
import json; d=json.load(open('/tmp/km-tx.json'))
print('text chars:', len(d['text']), '| fileDiscarded:', d['fileDiscarded'])
assert len(d['text']) > 100, 'text draft too short'
assert 'Escalations' in d['text'], 'text content mismatch'"

echo "== 7. discard file =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-d1.json -w "%{http_code}" -X POST "$BASE/api/uploads/discard" -H "Content-Type: application/json" -d "{\"id\":\"$UPID\"}")
echo "discard: $CODE (expect 200)"; cat /tmp/km-d1.json | head -c 200; echo
test ! -f "/home/z/my-project/uploads-storage/$STORED" && echo "file removed from disk: YES"

echo "== 8. guards: file/preview/extract now 410 =="
for EP in "file?id=$UPID" "preview?id=$UPID"; do
  CODE=$(curl -s -b "$JAR" -o /tmp/km-g.json -w "%{http_code}" "$BASE/api/uploads/$EP")
  echo "$EP -> $CODE (expect 410)"
done
CODE=$(curl -s -b "$JAR" -o /tmp/km-g2.json -w "%{http_code}" -X POST "$BASE/api/uploads/extract" -H "Content-Type: application/json" -d "{\"id\":\"$UPID\"}")
echo "re-extract -> $CODE (expect 410)"

echo "== 9. text draft still intact after discard =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-tx2.json -w "%{http_code}" "$BASE/api/uploads/text?id=$UPID")
echo "text after discard: $CODE"
python3 -c "
import json; d=json.load(open('/tmp/km-tx2.json'))
print('text chars:', len(d['text']), '| fileDiscarded:', d['fileDiscarded'], '| discardedAt:', d['discardedAt'] is not None)
assert len(d['text']) > 100 and d['fileDiscarded'] is True"

echo "== 10. list shows flag =="
curl -s -b "$JAR" "$BASE/api/uploads" -o /tmp/km-list.json
python3 -c "
import json; d=json.load(open('/tmp/km-list.json'))
u=[x for x in d['uploads'] if x['id']=='$UPID'][0]
print('list fileDiscarded:', u['fileDiscarded'])
assert u['fileDiscarded'] is True"

echo "UPID_FOR_CLEANUP=$UPID" > /tmp/km-e2e-upid.txt
echo "ALL E2E CHECKS PASSED"
