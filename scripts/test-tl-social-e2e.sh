#!/bin/bash
# E2E: Social Media Team Lead (Enugu) report → uploaded SBTS master fill.
# Temp user + task seeded via Prisma, report submitted through the API, the
# exported DOCX and in-app preview verified, then everything purged.
set -uo pipefail
BASE=http://localhost:3000
DAY=$(date +%F)
EMAIL="tlsocial.e2e@kallmania.com"
PASS="E2eTest#2026"
T=/tmp/tl-social-e2e
mkdir -p $T

echo "== 1. seed temp user + task (bun/prisma) =="
DATABASE_URL="$(grep '^DATABASE_URL=' /home/z/my-project/.env | cut -d= -f2-)" bun -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
const hash = await bcrypt.hash('$PASS', 10);
const u = await db.user.upsert({
  where: { email: '$EMAIL' },
  update: { role: 'TEAM_LEAD', department: 'SOCIAL_MEDIA', team: 'SOCIAL', status: 'APPROVED' },
  create: { email: '$EMAIL', passwordHash: hash, fullName: 'E2E Social Lead', role: 'TEAM_LEAD', department: 'SOCIAL_MEDIA', team: 'SOCIAL', status: 'APPROVED' },
});
const dayStart = new Date('$DAY' + 'T00:00:00.000Z');
await db.task.deleteMany({ where: { title: 'E2E Prepare Enugu content calendar', assigneeId: u.id } });
const t = await db.task.create({ data: { title: 'E2E Prepare Enugu content calendar', department: 'SOCIAL_MEDIA', assigneeId: u.id, createdById: u.id, status: 'IN_PROGRESS', dateAssigned: dayStart, deadline: new Date('$DAY' + 'T16:00:00.000Z') } });
console.log('SEEDED', u.id, t.id);
await db.\$disconnect();
" | tee $T/seed.txt
UID=$(awk '{print $2}' $T/seed.txt | tail -1)
TID=$(awk '{print $3}' $T/seed.txt | tail -1)
echo "userId=$UID taskId=$TID"

echo "== 2. login as temp TL + submit TEAM_LEAD report =="
curl -s -c $T/tl.txt -X POST $BASE/api/auth -H 'Content-Type: application/json' \
  -d "{\"action\":\"login\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" -o $T/login.json -w "login: %{http_code}\n"
python3 - "$DAY" > $T/payload.json << 'PYEOF'
import json, sys
day = sys.argv[1]
metrics = [
    ["calendarItemsPrepared", "Calendar item prepared / published", 3, ""],
    ["videoEditsExports", "Video edits / exports completed", 2, "Two reels exported"],
    ["graphicsVisualAssets", "Graphics / visual assets completed", 5, ""],
    ["approvalQualityChecks", "Approval / quality checks completed", 3, ""],
    ["contentPublishedScheduled", "Content published or scheduled", 8, ""],
    ["commentsEscalationsHandled", "Comments / escalations handled", 12, ""],
    ["taskCompletionRate", "Weekly or daily task completion (%)", 92, ""],
    ["nextDayPriorities", "Next-day priorities prepared", 6, ""],
]
sections = {
    "staff-info": {"teamName": "Social Media — Enugu", "attendanceStatus": "Present"},
    "role-focus": "E2E: drive the October calendar review and approve the Friday reels batch.",
    "team-kpis": [{"key": k, "label": l, "target": None, "targetLabel": "-", "unit": "percent" if "%" in l else "count", "actual": a, "notes": n} for k, l, a, n in metrics],
    "tasks": [
        {"task": "E2E Design Diwali carousel", "platform": "Instagram", "status": "Completed", "deliverable": "6-slide carousel"},
        {"task": "E2E Cut product demo reel", "platform": "TikTok", "status": "In Progress", "deliverable": "45s cut"},
    ],
    "myday": [],  # server must auto-fill from the Tasks module
    "challenges": [{"blocker": "E2E asset drive access expired", "impact": "Design paused 2h", "support": "Renew licence", "owner": "Web & Technical"}],
    "escalations": [{"item": "E2E boost budget approval", "reason": "Finance sign-off", "escalatedTo": "Supervisor", "status": "Pending"}],
    "handoff": [{"completed": "E2E calendar v2", "pending": "Reel voice-over", "blocked": "Brand assets", "nextAction": "9am — Prosper"}],
}
print(json.dumps({
    "type": "TEAM_LEAD", "department": "SOCIAL_MEDIA", "reportDate": day,
    "shiftTime": "09:00 - 17:00", "clockIn": "08:55", "clockOut": "17:05",
    "attendanceStatus": "Present", "latenessMins": 0,
    "payload": json.dumps({"sections": sections}),
}))
PYEOF
RID=$(curl -s -b $T/tl.txt -X POST $BASE/api/reports -H 'Content-Type: application/json' -d @$T/payload.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('report',{}).get('id') or d.get('id') or '')")
echo "reportId=$RID"
[ -z "$RID" ] && { echo "FAIL: no report id — response:"; cat $T/payload.out 2>/dev/null; curl -s -b $T/tl.txt -X POST $BASE/api/reports -H 'Content-Type: application/json' -d @$T/payload.json | head -c 400; exit 1; }

echo "== 3. admin: export DOCX + preview + masters list =="
curl -s -c $T/admin.txt -X POST $BASE/api/auth -H 'Content-Type: application/json' \
  -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' -o /dev/null -w "admin login: %{http_code}\n"
curl -s -b $T/admin.txt -D $T/export.headers "$BASE/api/export?id=$RID&format=docx" -o $T/report.docx -w "export: %{http_code}\n"
grep -i "content-disposition" $T/export.headers
file $T/report.docx | head -1
echo "PK magic: $(head -c 2 $T/report.docx)"
curl -s -b $T/admin.txt "$BASE/api/export/preview?id=$RID" | python3 -c "
import json,sys
d = json.load(sys.stdin)
p = d.get('preview') or d
print('preview kind:', p.get('kind'), '| viaMaster:', p.get('viaMaster'), '| html bytes:', len(p.get('html') or ''))"
curl -s -b $T/admin.txt "$BASE/api/report-templates/master" | python3 -c "
import json,sys
d = json.load(sys.stdin)
ms = d.get('masters') or []
row = [m for m in ms if m.get('reportType') == 'TL_SOCIAL']
print('TL_SOCIAL master row:', json.dumps(row[0][:4] if row else None, default=str)[:200])"

echo "== 4. verify filled content inside the exported DOCX =="
cd $T && rm -rf x && mkdir x && cd x && unzip -qq ../report.docx word/document.xml
DOCX=word/document.xml
for needle in "Somtochukwu\|E2E Social Lead" "role-designation-Team Lead" "October\|calendar review" "Diwali carousel" "asset drive access expired" "boost budget approval" "calendar v2" "E2E Prepare Enugu content calendar" "16:00"; do
  if echo "$needle" | grep -qw "role-designation-Team Lead"; then
    grep -q ">Team Lead<" $DOCX && echo "PASS — role designation" || echo "FAIL — role designation"
  else
    grep -q "$needle" $DOCX && echo "PASS — found: $needle" || echo "FAIL — missing: $needle"
  fi
done

echo "== 5. master untouched (file hash vs DB row) =="
DATABASE_URL="$(grep '^DATABASE_URL=' /home/z/my-project/.env | cut -d= -f2-)" bun -e "
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
const db = new PrismaClient();
const row = await db.reportMasterTemplate.findUnique({ where: { reportType: 'TL_SOCIAL' } });
const buf = await readFile('/home/z/my-project/uploads-storage/' + row.storedName);
const h = createHash('sha256').update(buf).digest('hex');
console.log(h === row.fileHash ? 'PASS — master file matches DB sha256' : 'FAIL — master file MODIFIED');
await db.\$disconnect();
"

echo "== 6. purge test data =="
DATABASE_URL="$(grep '^DATABASE_URL=' /home/z/my-project/.env | cut -d= -f2-)" bun -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const r = await db.report.deleteMany({ where: { id: '$RID' } });
const t = await db.task.deleteMany({ where: { id: '$TID' } });
const u = await db.user.deleteMany({ where: { email: '$EMAIL' } });
console.log('purged report/task/user:', r.count, t.count, u.count);
await db.\$disconnect();
"
rm -rf $T
echo "E2E DONE"
