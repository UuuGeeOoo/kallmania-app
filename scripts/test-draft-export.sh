#!/bin/bash
# E2E: text draft export (DOCX) — inline, download, preview, works after discard
set -e
BASE=http://localhost:3000
JAR=/tmp/km-dx-cookies.txt
TXT=/tmp/km-dx-report.txt
rm -f "$JAR"

CODE=$(curl -s -c "$JAR" -o /tmp/km-dx-login.json -w "%{http_code}" -X POST "$BASE/api/auth" -H "Content-Type: application/json" \
  -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
echo "login: $CODE"; [ "$CODE" = "200" ] || { cat /tmp/km-dx-login.json; exit 1; }

cat > "$TXT" <<'EOF'
DAILY REPORT — BPO OUTBOUND — 2026-10-27
Agent: Draft Export Test
Calls Made: 12
Emails Sent: 9
Challenges: none
EOF

CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-up.json -w "%{http_code}" -X POST "$BASE/api/uploads" -F "file=@$TXT;type=text/plain" -F "department=BPO" -F "reportDate=2026-10-27")
echo "upload: $CODE"; [ "$CODE" = "201" ] || { cat /tmp/km-dx-up.json; exit 1; }
UPID=$(python3 -c "import json;print(json.load(open('/tmp/km-dx-up.json'))['upload']['id'])")

CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-ex.json -w "%{http_code}" -X POST "$BASE/api/uploads/extract" -H "Content-Type: application/json" -d "{\"id\":\"$UPID\"}" --max-time 120)
echo "extract: $CODE"; [ "$CODE" = "200" ] || { cat /tmp/km-dx-ex.json; exit 1; }

echo "== draft-export inline =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-file.docx -w "%{http_code}" -D /tmp/km-dx-h1.txt "$BASE/api/uploads/draft-export?id=$UPID")
echo "export: $CODE"; grep -i "content-type\|content-disposition" /tmp/km-dx-h1.txt
head -c 2 /tmp/km-dx-file.docx | grep -q "PK" && echo "DOCX zip magic: OK ($(stat -c%s /tmp/km-dx-file.docx) bytes)"

echo "== draft-export download=1 =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-file2.docx -w "%{http_code}" -D /tmp/km-dx-h2.txt "$BASE/api/uploads/draft-export?id=$UPID&download=1")
grep -i "content-disposition" /tmp/km-dx-h2.txt
python3 -c "
import re
h=open('/tmp/km-dx-h2.txt').read()
m=re.search(r'attachment; filename=\"([^\"]+)\"', h)
assert m and m.group(1)=='text-draft-km-dx-report.docx', m
print('attachment filename: OK ->', m.group(1))"

echo "== draft-preview =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-prev.json -w "%{http_code}" "$BASE/api/uploads/draft-preview?id=$UPID")
echo "preview: $CODE"
python3 -c "
import json; d=json.load(open('/tmp/km-dx-prev.json'))
assert d['kind']=='docx' and len(d['html'])>200
assert 'Draft Export Test' in d['html'] and 'TEXT DRAFT' in d['html'].upper()
assert 'Calls Made' in d['html']
print('preview payload: OK — kind docx, html', len(d['html']), 'chars, content present')"

echo "== discard file, then export/preview must STILL work =="
CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-dis.json -w "%{http_code}" -X POST "$BASE/api/uploads/discard" -H "Content-Type: application/json" -d "{\"id\":\"$UPID\"}")
echo "discard: $CODE"; [ "$CODE" = "200" ] || { cat /tmp/km-dx-dis.json; exit 1; }
CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-file3.docx -w "%{http_code}" "$BASE/api/uploads/draft-export?id=$UPID")
echo "export after discard: $CODE"; [ "$CODE" = "200" ]
CODE=$(curl -s -b "$JAR" -o /tmp/km-dx-prev2.json -w "%{http_code}" "$BASE/api/uploads/draft-preview?id=$UPID")
echo "preview after discard: $CODE"; [ "$CODE" = "200" ]
python3 -c "
import json; d=json.load(open('/tmp/km-dx-prev2.json'))
assert 'text-only copy retained' in d['html'] or 'discarded' in d['html'].lower()
print('discarded note present in exported document: OK')"

echo "UPID_FOR_CLEANUP=$UPID" > /tmp/km-dx-upid.txt
echo "ALL DRAFT-EXPORT E2E CHECKS PASSED"
