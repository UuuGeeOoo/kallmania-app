#!/usr/bin/env bash
# Kallmania E2E — auth flows on Supabase Postgres (no-OTP edition)
#  • Login: direct email + password
#  • Registration: creates PENDING account — NO OTP/email verification (no mail server)
#  • Forgot password: direct two-step reset (email → new password), no mailed code
set -u
BASE="http://localhost:3000"
JAR=/tmp/km-e2e.jar
PASS=0; FAIL=0
TS=$(date +%s)
E1="e2e-auth-a.${TS}@kallmania.test"
E2="e2e-auth-b.${TS}@kallmania.test"

post() { curl -s -b "$JAR" -c "$JAR" -H "Content-Type: application/json" -d "$2" "$BASE$1"; }
getme() { curl -s -b "$JAR" -c "$JAR" -H "Accept: application/json" "$BASE$1"; }
code() { curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -H "Content-Type: application/json" -d "$2" "$BASE$1"; }
pcode() { curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X PATCH -H "Content-Type: application/json" -d "$2" "$BASE$1"; }
check() { # $1 name  $2 expr-result  $3 expected
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✔ $1";
  else FAIL=$((FAIL+1)); echo "  ✘ $1  → got: $(echo "$2" | head -c 200)"; fi
}
cleanup() {
  bun -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient({ datasourceUrl: process.env.KALLMANIA_DATABASE_URL });
const prefixes = ['e2e-auth-a.', 'e2e-auth-b.'].map(p => ({ email: { startsWith: p } }));
const users = await db.user.findMany({ where: { OR: prefixes } });
const ids = users.map(u => u.id);
await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.taskAssignee.deleteMany({ where: { userId: { in: ids } } }).catch(()=>{});
await db.user.deleteMany({ where: { id: { in: ids } } });
console.log('CLEANUP_OK users:' + ids.length);
await db.\$disconnect();
" >/dev/null 2>&1
}
trap cleanup EXIT
echo "── cleanup ──"; cleanup

echo "══ 1. LOGIN — direct email + password ══"
rm -f $JAR
R=$(post /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
check "admin login succeeds" "$(echo "$R" | jq -r '.success')" "true"
check "no OTP keys in login response" "$(echo "$R" | jq 'has("otpRequired") or has("challengeId") or has("previewCode")')" "false"
R=$(getme /api/auth)
check "session established (me)" "$(echo "$R" | jq -r '.user.role')" "ADMIN"
check "wrong password rejected (401)" "$(code /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"wrong"}')" "401"

echo "══ 2. REGISTER — no OTP, straight to PENDING ══"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E1\",\"password\":\"@E2ePass1\",\"fullName\":\"E2E Auth A\",\"country\":\"NG\",\"state\":\"Rivers\",\"team\":\"OUTBOUND\",\"position\":\"AGENT\"}")
check "register response has otpRequired=false" "$(echo "$R" | jq -r '.otpRequired')" "false"
check "register response has NO challengeId" "$(echo "$R" | jq 'has("challengeId") or has("previewCode")')" "false"
check "message: awaiting administrator confirmation" "$(echo "$R" | jq -r '.message' | grep -c 'awaiting administrator confirmation')" "1"
check "PENDING user A cannot login (403)" "$(code /api/auth "{\"action\":\"login\",\"email\":\"$E1\",\"password\":\"@E2ePass1\"}")" "403"
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E2\",\"password\":\"@E2ePass2\",\"fullName\":\"E2E Auth B\",\"country\":\"NG\",\"state\":\"Lagos\",\"team\":\"TECH\",\"position\":\"AGENT\"}")
check "register response has otpRequired=false" "$(echo "$R" | jq -r '.otpRequired')" "false"
check "register response has NO challengeId" "$(echo "$R" | jq 'has("challengeId") or has("previewCode")')" "false"
check "message: awaiting administrator confirmation" "$(echo "$R" | jq -r '.message' | grep -c 'awaiting administrator confirmation')" "1"
check "PENDING user cannot login (403)" "$(code /api/auth "{\"action\":\"login\",\"email\":\"$E2\",\"password\":\"@E2ePass2\"}")" "403"

echo "══ 3. DUPLICATE EMAIL ══"
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E2\",\"password\":\"@E2ePass2\",\"fullName\":\"Dup\",\"country\":\"NG\",\"state\":\"Lagos\",\"team\":\"EMAIL\",\"position\":\"AGENT\"}")
check "duplicate register blocked" "$(echo "$R" | jq -r '.error' | grep -c 'already exists')" "1"

echo "══ 4. ADMIN APPROVAL → LOGIN ══"
UID_B=$(bun -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient({ datasourceUrl: process.env.KALLMANIA_DATABASE_URL });
console.log(await db.user.findUnique({ where: { email: '$E2' } }).then(u => u?.id || ''));
await db.\$disconnect();")
rm -f $JAR
post /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' >/dev/null
check "admin approve user B" "$(pcode /api/users "{\"userId\":\"$UID_B\",\"action\":\"approve\"}")" "200"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"login\",\"email\":\"$E2\",\"password\":\"@E2ePass2\"}")
check "approved user logs in directly (no OTP)" "$(echo "$R" | jq -r '.success')" "true"
R=$(getme /api/auth)
check "session is user B" "$(echo "$R" | jq -r '.user.email')" "$E2"

echo "══ 5. FORGOT PASSWORD — direct reset (no mailed code) ══"
R=$(post /api/auth "{\"action\":\"forgotPassword\",\"email\":\"nobody.here@kallmania.test\"}")
check "unknown email → generic success" "$(echo "$R" | jq -r '.success')" "true"
check "unknown email → NO challengeId/previewCode" "$(echo "$R" | jq 'has("challengeId") or has("previewCode")')" "false"
R=$(post /api/auth "{\"action\":\"forgotPassword\",\"email\":\"$E2\"}")
check "known email → step-1 success" "$(echo "$R" | jq -r '.success')" "true"
check "step-1 response has NO OTP fields" "$(echo "$R" | jq 'has("challengeId") or has("previewCode") or has("maskedEmail")')" "false"
R=$(post /api/auth "{\"action\":\"resetPassword\",\"email\":\"$E2\",\"newPassword\":\"short\"}")
check "weak new password rejected" "$(echo "$R" | jq -r '.error' | grep -c 'at least 6')" "1"
R=$(post /api/auth "{\"action\":\"resetPassword\",\"email\":\"ghost.${TS}@kallmania.test\",\"newPassword\":\"@Whatever9\"}")
check "unknown email reset rejected (404)" "$(echo "$R" | jq -r '.error' | grep -c 'No eligible account')" "1"
R=$(post /api/auth "{\"action\":\"resetPassword\",\"email\":\"$E2\",\"newPassword\":\"@BrandNew9\"}")
check "direct password reset succeeds" "$(echo "$R" | jq -r '.success')" "true"
rm -f $JAR
check "old password dead (401)" "$(code /api/auth "{\"action\":\"login\",\"email\":\"$E2\",\"password\":\"@E2ePass2\"}")" "401"
R=$(post /api/auth "{\"action\":\"login\",\"email\":\"$E2\",\"password\":\"@BrandNew9\"}")
check "new password logs in" "$(echo "$R" | jq -r '.success')" "true"

echo "══ 6. CHANGE PASSWORD (self) & LOGOUT ══"
R=$(post /api/auth '{"action":"changePassword","currentPassword":"wrong","newPassword":"@Nope1234"}')
check "wrong current password rejected" "$(echo "$R" | jq -r '.error' | grep -c 'Current password is incorrect')" "1"
R=$(post /api/auth '{"action":"changePassword","currentPassword":"@BrandNew9","newPassword":"@FinalPass7"}')
check "self password change succeeds" "$(echo "$R" | jq -r '.success')" "true"
R=$(post /api/auth '{"action":"logout"}')
check "logout succeeds" "$(echo "$R" | jq -r '.success')" "true"
check "session cleared" "$(code /api/auth '{}')" "400"
R=$(post /api/auth "{\"action\":\"login\",\"email\":\"$E2\",\"password\":\"@FinalPass7\"}")
check "changed password logs in" "$(echo "$R" | jq -r '.success')" "true"

echo
echo "════════ RESULT: $PASS passed, $FAIL failed ════════"
[ $FAIL -eq 0 ]
