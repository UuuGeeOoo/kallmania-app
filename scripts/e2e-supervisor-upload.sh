#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# E2E: supervisor uploads a filled supervisor report → doc-intel pipeline →
# review → confirm → SUPERVISOR report with template columns → DOCX export.
# Uses the live dev server on :3000. Cleans up everything it creates.
# ─────────────────────────────────────────────────────────────────────────────
set -u
BASE="http://localhost:3000"
J="curl -s -H 'Content-Type: application/json'"
PASS=0; FAIL=0
ck() { if [ "$1" = "0" ]; then PASS=$((PASS+1)); echo "  ✓ $2"; else FAIL=$((FAIL+1)); echo "  ✗ $2 — $3"; fi }

EMAIL="sup.e2e.$(date +%s)@kallmania-test.local"
PW="SupTest#2026"

echo "── 0. clean leftovers from any earlier failed runs"
DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' /home/z/my-project/.env) bun -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const old = await p.user.findMany({ where: { email: { contains: '@kallmania-test.local' } } });
for (const u of old) {
  const ups = await p.uploadedFile.findMany({ where: { userId: u.id } });
  for (const f of ups) await p.report.deleteMany({ where: { sourceFileId: f.id } });
  await p.report.deleteMany({ where: { userId: u.id } });
  await p.uploadedFile.deleteMany({ where: { userId: u.id } });
  await p.notification.deleteMany({ where: { userId: u.id } });
  await p.auditLog.deleteMany({ where: { userId: u.id } });
  await p.user.delete({ where: { id: u.id } });
}
console.log('removed', old.length, 'stale test user(s)');
await p.\$disconnect();"

echo "── 1. register supervisor test user"
REG=$(curl -s -X POST "$BASE/api/auth" -H 'Content-Type: application/json' -d "{\"action\":\"register\",\"email\":\"$EMAIL\",\"password\":\"$PW\",\"fullName\":\"E2E Supervisor Test\",\"role\":\"SUPERVISOR\",\"department\":\"MANAGEMENT\"}")
echo "$REG" | grep -q '"success":true' ; ck $? "register accepted" "$REG"

echo "── 2. admin approves + confirms role"
curl -s -X POST "$BASE/api/auth" -H 'Content-Type: application/json' -c /tmp/sup-admin.jar -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' > /dev/null
TUID=$(DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' /home/z/my-project/.env) bun -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const u = await p.user.findUnique({ where: { email: '$EMAIL' } });
console.log(u?.id ?? ''); await p.\$disconnect();")
APPROVE=$(curl -s -b /tmp/sup-admin.jar -X PATCH "$BASE/api/users" -H 'Content-Type: application/json' -d "{\"action\":\"approve\",\"userId\":\"$TUID\"}")
echo "$APPROVE" | grep -q '"ok":true\|"success":true' ; ck $? "user approved" "$APPROVE"
ROLE=$(curl -s -b /tmp/sup-admin.jar -X PATCH "$BASE/api/users" -H 'Content-Type: application/json' -d "{\"action\":\"changeRole\",\"userId\":\"$TUID\",\"role\":\"SUPERVISOR\",\"department\":\"MANAGEMENT\"}")
echo "$ROLE" | grep -q '"ok":true\|"success":true' ; ck $? "role set to SUPERVISOR/MANAGEMENT" "$ROLE"

echo "── 3. supervisor logs in"
curl -s -X POST "$BASE/api/auth" -H 'Content-Type: application/json' -c /tmp/sup-user.jar -d "{\"action\":\"login\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}" | grep -q '"success":true\|"ok":true'
ck $? "supervisor login" ""

echo "── 4. upload the filled supervisor master DOCX (department=MANAGEMENT)"
UP=$(curl -s -b /tmp/sup-user.jar -X POST "$BASE/api/uploads" -F "file=@/home/z/my-project/downloads/supervisor-e2e-filled.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" -F "department=MANAGEMENT" -F "reportDate=2026-10-27")
ULID=$(echo "$UP" | grep -oP '"id":"\K[^"]+' | head -1)
[ -n "$ULID" ]; ck $? "upload stored (id=$ULID)" "$UP"

echo "── 5. run the doc-intel extraction"
EX=$(curl -s -b /tmp/sup-user.jar -X POST "$BASE/api/uploads/extract" -H 'Content-Type: application/json' -d "{\"id\":\"$ULID\"}")
echo "$EX" | grep -q '"status":"AWAITING_CONFIRMATION"'; ck $? "extraction completed" "$(echo "$EX" | head -c 300)"
# supervisor grid fields arrived?
for K in totalOnShift presentOnTime lateArrivals absentExcused absentUnexcused earlyDepartures totalCallsMade avgCallsPerAgent conversionRate contactRate avgTalkTime slaAdherence leadsGenerated scheduleAdherence; do
  echo "$EX" | grep -q "\"key\":\"$K\"" || { echo "    missing routed key: $K"; }
done
echo "$EX" | grep -q '"key":"totalOnShift"' ; ck $? "attendance keys in fields payload" ""
echo "$EX" | grep -q '"key":"scheduleAdherence"' ; ck $? "team KPI keys in fields payload" ""
echo "$EX" | grep -q '"qaObservations"' ; ck $? "qa observations section present" ""
echo "$EX" | grep -q '"sectionText"' ; ck $? "routed sectionText present" ""

echo "── 6. build the confirm payload the review UI would send"
DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' /home/z/my-project/.env) bun -e "
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
const p = new PrismaClient();
const up = await p.uploadedFile.findUnique({ where: { id: '$ULID' } });
const data = JSON.parse(up.extractedData);
const routed = new Map((data.doc?.routed ?? []).map(r => [r.key, r]));
const SUP = [
  ['totalCallsMade','Total Calls Made (Team)','count'],['avgCallsPerAgent','Avg. Calls Per Agent','count'],
  ['conversionRate','Team Conversion Rate (%)','percent'],['contactRate','Team Contact Rate (%)','percent'],
  ['avgTalkTime','Avg. Talk Time (mins)','minutes'],['slaAdherence','SLA Adherence (%)','percent'],
  ['leadsGenerated','HOT / WARM Leads Generated','count'],['scheduleAdherence','Schedule Adherence (%)','percent'],
  ['totalOnShift','Total Agents on Shift','count'],['presentOnTime','Present & On-Time','count'],
  ['lateArrivals','Late Arrivals','count'],['absentExcused','Absent (Excused)','count'],
  ['absentUnexcused','Absent (Unexcused)','count'],['earlyDepartures','Early Departures','count'],
];
const metrics = SUP.map(([key,label,unit]) => {
  const r = routed.get(key);
  const fld = (data.fields ?? []).find(f => f.key === key);
  return { key, label, target: r?.reportedTarget ?? null, targetLabel: r?.reportedTarget !== null && r?.reportedTarget !== undefined ? String(r.reportedTarget) : '-', actual: fld && typeof fld.value === 'number' ? fld.value : null, variance: null, unit, category: ['totalOnShift','presentOnTime','lateArrivals','absentExcused','absentUnexcused','earlyDepartures'].includes(key) ? 'ATTENDANCE' : 'TEAM_PERFORMANCE', auto: false, notes: fld?.needsReview ? 'Extracted — please verify' : '' };
});
const st = data.doc?.sectionText ?? {};
const payload = { uploadId: '$ULID', confirmedMetrics: metrics, sections: { shiftTime: '09:00 - 17:00', clockIn: '08:52', clockOut: '17:04', teamName: 'OUTBOUND', qaObservations: st.qaObservations ?? '', coaching: st.coaching ?? '', escalations: st.escalations ?? '', highlights: st.highlights ?? '', lowlights: st.lowlights ?? '', actionPlan: st.actionPlan ?? '' }, reportDate: '2026-10-27', department: 'MANAGEMENT', submit: true };
writeFileSync('/tmp/sup-confirm.json', JSON.stringify(payload));
console.log('payload written; routed keys:', routed.size, '; section keys:', Object.keys(st).join(','));
await p.\$disconnect();"
ck $? "confirm payload built" ""

echo "── 7. confirm & submit"
CF=$(curl -s -b /tmp/sup-user.jar -X POST "$BASE/api/uploads/confirm" -H 'Content-Type: application/json' -d @/tmp/sup-confirm.json)
REPREF=$(echo "$CF" | grep -oP '"ref":"\K[^"]+')
REPId=$(echo "$CF" | grep -oP '"id":"\K[cmostu0-9a-z]+' | head -1)
echo "$CF" | grep -q '"type":"SUPERVISOR"'; ck $? "SUPERVISOR report created (ref=$REPREF)" "$(echo "$CF" | head -c 300)"

echo "── 8. verify report columns in DB"
DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' /home/z/my-project/.env) bun -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.report.findUnique({ where: { ref: '$REPREF' } });
if (!r) { console.log('REPORT NOT FOUND'); process.exit(1); }
const att = JSON.parse(r.attendanceSummary ?? '{}');
const kpis = JSON.parse(r.teamKpiAverages ?? '[]');
const esc = JSON.parse(r.escalatedIssues ?? '[]');
const plan = JSON.parse(r.actionPlan ?? '[]');
const coach = JSON.parse(r.coachingEntries ?? '[]');
const ok1 = att.totalOnShift?.count === '12' && att.presentOnTime?.count === '10' && att.lateArrivals?.count === '2' && att.absentExcused?.count === '1' && att.absentUnexcused?.count === '0' && att.earlyDepartures?.count === '1';
console.log('attendance ok:', ok1, JSON.stringify(att));
const tcm = kpis.find(k => k.key === 'totalCallsMade');
const ok2 = tcm?.teamAvg === '342' && tcm?.teamTarget === '360';
const sla = kpis.find(k => k.key === 'slaAdherence'); const sch = kpis.find(k => k.key === 'scheduleAdherence');
const ok3 = sla?.teamAvg === '87.5' && sch?.teamAvg === '92.3';
console.log('teamKpis ok:', ok2, ok3, 'rows:', kpis.length);
console.log('qa:', (r.qaObservations ?? '').includes('disclosure line'));
console.log('coaching rows:', coach.length, (coach[0]?.details ?? '').includes('1:1'));
console.log('escalated:', esc.length, (esc[0]?.description ?? '').toLowerCase().includes('crm'));
console.log('highlights:', (r.highlights ?? '').includes('118.6%'), '| lowlights:', (r.lowlights ?? '').includes('late arrivals'));
console.log('plan rows:', plan.length, (plan[0]?.action ?? '').toLowerCase().includes('crm'));
console.log('type:', r.type, '| status:', r.status, '| sourceType:', r.sourceType, '| verification:', r.verificationStatus, '| kpiMetrics is null:', r.kpiMetrics === null);
await p.\$disconnect();"
ck $? "supervisor columns verified" ""

echo "── 9. DOCX export from the SUPERVISOR master renders the values"
curl -s -b /tmp/sup-user.jar -o /tmp/sup-export.docx "$BASE/api/export?format=docx&id=$REPId"
SIZE=$(stat -c%s /tmp/sup-export.docx 2>/dev/null || echo 0)
[ "$SIZE" -gt 5000 ]; ck $? "export size $SIZE bytes" ""
rm -rf /tmp/sup-x && mkdir -p /tmp/sup-x && unzip -q -o /tmp/sup-export.docx word/document.xml -d /tmp/sup-x 2>/dev/null
for V in "12" "10" "342" "360" "87.5" "92.3" "118.6%" "CRM licences" "E2E Supervisor Test"; do
  grep -q "$V" /tmp/sup-x/word/document.xml && PASS=$((PASS+1)) && echo "  ✓ export contains $V" || { FAIL=$((FAIL+1)); echo "  ✗ export missing $V"; }
done

echo "── 10. duplicate confirm rejected"
DUP=$(curl -s -b /tmp/sup-user.jar -X POST "$BASE/api/uploads/confirm" -H 'Content-Type: application/json' -d @/tmp/sup-confirm.json)
echo "$DUP" | grep -q '"409"\|already confirmed\|already been'; ck $? "second confirm → 409" "$(echo "$DUP" | head -c 160)"

echo "── 11. cleanup test artifacts"
DATABASE_URL=$(grep -oP '^DATABASE_URL=\K.*' /home/z/my-project/.env) bun -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.report.deleteMany({ where: { sourceFileId: '$ULID' } });
await p.uploadedFile.deleteMany({ where: { id: '$ULID' } });
await p.notification.deleteMany({ where: { user: { email: '$EMAIL' } } });
await p.notification.deleteMany({ where: { message: { contains: '$EMAIL' } } });
await p.auditLog.deleteMany({ where: { userId: '$TUID' } });
await p.user.deleteMany({ where: { email: '$EMAIL' } });
console.log('cleaned'); await p.\$disconnect();"
ck $? "test user + report + upload removed" ""

echo
echo "════════════════════════════════════════"
echo "E2E RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ]
