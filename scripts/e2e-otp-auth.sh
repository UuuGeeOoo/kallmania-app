#!/usr/bin/env bash
# Kallmania E2E — auth flows on Supabase Postgres
#  • Login: direct email + password (NO OTP)
#  • Registration: creates PENDING account + 6-digit REGISTER OTP (caps: 3 sends / 15 min)
#  • Forgot password: 3-step PASSWORD_RESET OTP flow (anti-enumeration)
set -u
BASE="http://localhost:3000"
JAR=/tmp/km-e2e.jar
PASS=0; FAIL=0
DEMO_TS=$(date +%s)
E1="e2e-otp-a.${DEMO_TS}@kallmania.test"
E2="e2e-otp-b.${DEMO_TS}@kallmania.test"
E3="e2e-otp-c.${DEMO_TS}@kallmania.test"

post() { curl -s -b "$JAR" -c "$JAR" -H "Content-Type: application/json" -d "$2" "$BASE$1"; }
getme() { curl -s -b "$JAR" -c "$JAR" -H "Accept: application/json" "$BASE$1"; }
patch() { curl -s -b "$JAR" -c "$JAR" -X PATCH -H "Content-Type: application/json" -d "$2" "$BASE$1"; }
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
const emails = ['e2e-otp-a.', 'e2e-otp-b.', 'e2e-otp-c.'].map(p => ({ startsWith: p }));
await db.auditLog.deleteMany({ where: { OR: [ { user: { email: { in: [] } } }, { user: { is: { OR: emails.map(e => ({ email: e })) } } } ] } }).catch(()=>{});
const users = await db.user.findMany({ where: { OR: emails.map(e => ({ email: e })) } });
const ids = users.map(u => u.id);
await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
await db.notification.deleteMany({ where: { userId: { in: ids } } });
await db.otpToken.deleteMany({});
await db.user.deleteMany({ where: { id: { in: ids } } });
console.log('CLEANUP_OK');
await db.\$disconnect();
" >/dev/null 2>&1
}
trap cleanup EXIT
echo "── cleanup ──"; cleanup

echo "══ 1. LOGIN — direct, no OTP ══"
rm -f $JAR
R=$(post /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}')
check "admin login succeeds" "$(echo "$R" | jq -r '.success')" "true"
check "no otpRequired in login response" "$(echo "$R" | jq 'has("otpRequired") or has("challengeId")')" "false"
R=$(getme /api/auth)
check "session established (me)" "$(echo "$R" | jq -r '.user.role')" "ADMIN"
check "wrong password rejected (401)" "$(code /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"wrong"}')" "401"

echo "══ 2. REGISTER — OTP required ══"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E1\",\"password\":\"@E2ePass1\",\"fullName\":\"E2E OTP A\",\"country\":\"NG\",\"state\":\"Rivers\",\"team\":\"OUTBOUND\",\"position\":\"AGENT\"}")
check "register returns otpRequired" "$(echo "$R" | jq -r '.otpRequired')" "true"
CH_A=$(echo "$R" | jq -r '.challengeId'); CODE_A=$(echo "$R" | jq -r '.previewCode')
check "challenge issued" "$([ -n "$CH_A" ] && [ "$CH_A" != "null" ] && echo yes)" "yes"
check "demo preview code present" "$(echo "$CODE_A" | grep -cE '^[0-9]{6}$')" "1"
check "email masked" "$(echo "$R" | jq -r '.maskedEmail' | grep -c '\*\*\*')" "1"

echo "══ 3. REGISTER OTP — wrong code countdown ══"
R=$(post /api/auth "{\"action\":\"verifyRegisterOtp\",\"challengeId\":\"$CH_A\",\"code\":\"000000\"}")
check "wrong code → 4 attempts left" "$(echo "$R" | jq -r '.error')" "Incorrect code. 4 attempts remaining."
R=$(post /api/auth "{\"action\":\"verifyRegisterOtp\",\"challengeId\":\"$CH_A\",\"code\":\"$CODE_A\"}")
check "correct code verifies" "$(echo "$R" | jq -r '.verified')" "true"
check "message: awaiting admin" "$(echo "$R" | jq -r '.message' | grep -c 'awaiting administrator confirmation')" "1"
R=$(post /api/auth "{\"action\":\"verifyRegisterOtp\",\"challengeId\":\"$CH_A\",\"code\":\"$CODE_A\"}")
check "replay of consumed challenge rejected" "$(echo "$R" | jq -r '.error' | grep -c 'already been used')" "1"
check "PENDING user cannot login (403)" "$(code /api/auth "{\"action\":\"login\",\"email\":\"$E1\",\"password\":\"@E2ePass1\"}")" "403"

echo "══ 4. DUPLICATE EMAIL ══"
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E1\",\"password\":\"@E2ePass1\",\"fullName\":\"Dup\",\"country\":\"NG\",\"state\":\"Rivers\",\"team\":\"EMAIL\",\"position\":\"AGENT\"}")
check "duplicate register blocked" "$(echo "$R" | jq -r '.error' | grep -c 'already exists')" "1"

echo "══ 5. RESEND — new code invalidates old ══"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E2\",\"password\":\"@E2ePass2\",\"fullName\":\"E2E OTP B\",\"country\":\"NG\",\"state\":\"Lagos\",\"team\":\"TECH\",\"position\":\"AGENT\"}")
CH_B=$(echo "$R" | jq -r '.challengeId'); OLD_CODE=$(echo "$R" | jq -r '.previewCode')
R=$(post /api/auth "{\"action\":\"resendOtp\",\"challengeId\":\"$CH_B\"}")
NEW_CODE=$(echo "$R" | jq -r '.previewCode'); CH_B=$(echo "$R" | jq -r '.challengeId')
check "resend issues new code" "$([ -n "$NEW_CODE" ] && [ "$NEW_CODE" != "null" ] && [ "$NEW_CODE" != "$OLD_CODE" ] && echo yes)" "yes"
R=$(post /api/auth "{\"action\":\"verifyRegisterOtp\",\"challengeId\":\"$CH_B\",\"code\":\"$OLD_CODE\"}")
check "old code dead after resend" "$(echo "$R" | jq -r '.error' | grep -cE 'expired|Incorrect|Invalid')" "1"
R=$(post /api/auth "{\"action\":\"verifyRegisterOtp\",\"challengeId\":\"$CH_B\",\"code\":\"$NEW_CODE\"}")
check "new code verifies" "$(echo "$R" | jq -r '.verified')" "true"

echo "══ 6. REGISTER SEND CAP — 3 / 15 min ══"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"register\",\"email\":\"$E3\",\"password\":\"@E2ePass3\",\"fullName\":\"E2E OTP C\",\"country\":\"GH\",\"state\":\"Greater Accra\",\"team\":\"SOCIAL\",\"position\":\"AGENT\"}")
CH_C=$(echo "$R" | jq -r '.challengeId')
R=$(post /api/auth "{\"action\":\"resendOtp\",\"challengeId\":\"$CH_C\"}"); check "resend 2 ok" "$(echo "$R" | jq -r '.otpRequired')" "true"
CH_C=$(echo "$R" | jq -r '.challengeId')
R=$(post /api/auth "{\"action\":\"resendOtp\",\"challengeId\":\"$CH_C\"}"); check "resend 3 ok" "$(echo "$R" | jq -r '.otpRequired')" "true"
CH_C=$(echo "$R" | jq -r '.challengeId')
R=$(post /api/auth "{\"action\":\"resendOtp\",\"challengeId\":\"$CH_C\"}")
check "resend 4 → 429 rate-limited" "$(code /api/auth "{\"action\":\"resendOtp\",\"challengeId\":\"$CH_C\"}")" "429"

echo "══ 7. FORGOT PASSWORD — anti-enumeration ══"
rm -f $JAR
R=$(post /api/auth '{"action":"forgotPassword","email":"nobody.here@kallmania.test"}')
check "unknown email → generic success" "$(echo "$R" | jq -r '.success')" "true"
check "unknown email → NO challengeId" "$(echo "$R" | jq 'has("challengeId")')" "false"

echo "══ 8. FORGOT PASSWORD — full 3-step flow ══"
# Need an APPROVED account: admin approves user A, then resets their password via OTP.
rm -f $JAR
post /api/auth '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' >/dev/null
UID_A=$(bun -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient({ datasourceUrl: process.env.KALLMANIA_DATABASE_URL });
console.log(await db.user.findUnique({ where: { email: '$E1' } }).then(u => u?.id || ''));
await db.\$disconnect();")
check "admin approve user A" "$(pcode /api/users "{\"userId\":\"$UID_A\",\"action\":\"approve\"}")" "200"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"forgotPassword\",\"email\":\"$E1\"}")
check "known email → challenge issued" "$(echo "$R" | jq 'has("challengeId")')" "true"
CH_R=$(echo "$R" | jq -r '.challengeId'); CODE_R=$(echo "$R" | jq -r '.previewCode')
R=$(post /api/auth "{\"action\":\"resetPassword\",\"resetToken\":\"$CH_R\",\"newPassword\":\"@NewPass9\"}")
check "reset without verifying code blocked" "$(echo "$R" | jq -r '.error' | grep -c 'verify the code')" "1"
R=$(post /api/auth "{\"action\":\"verifyResetOtp\",\"challengeId\":\"$CH_R\",\"code\":\"$CODE_R\"}")
check "verify reset code → resetToken" "$(echo "$R" | jq -r '.resetToken')" "$CH_R"
R=$(post /api/auth "{\"action\":\"resetPassword\",\"resetToken\":\"$CH_R\",\"newPassword\":\"short\"}")
check "weak new password rejected" "$(echo "$R" | jq -r '.error' | grep -c 'at least 6')" "1"
R=$(post /api/auth "{\"action\":\"resetPassword\",\"resetToken\":\"$CH_R\",\"newPassword\":\"@BrandNew9\"}")
check "password reset succeeds" "$(echo "$R" | jq -r '.success')" "true"
R=$(post /api/auth "{\"action\":\"resetPassword\",\"resetToken\":\"$CH_R\",\"newPassword\":\"@Again123\"}")
check "resetToken replay rejected" "$(echo "$R" | jq -r '.error' | grep -c 'already been used')" "1"
rm -f $JAR
check "old password dead (401)" "$(code /api/auth "{\"action\":\"login\",\"email\":\"$E1\",\"password\":\"@E2ePass1\"}")" "401"
R=$(post /api/auth "{\"action\":\"login\",\"email\":\"$E1\",\"password\":\"@BrandNew9\"}")
check "new password logs in directly (no OTP)" "$(echo "$R" | jq -r '.success')" "true"
R=$(getme /api/auth)
check "session is user A" "$(echo "$R" | jq -r '.user.email')" "$E1"

echo "══ 9. FORGOT PASSWORD — resend keeps flow intact ══"
rm -f $JAR
R=$(post /api/auth "{\"action\":\"forgotPassword\",\"email\":\"$E1\"}")
CH_R2=$(echo "$R" | jq -r '.challengeId')
R=$(post /api/auth "{\"action\":\"resendOtp\",\"challengeId\":\"$CH_R2\"}")
check "reset resend works" "$(echo "$R" | jq -r '.otpRequired')" "true"

echo
echo "════════ RESULT: $PASS passed, $FAIL failed ════════"
[ $FAIL -eq 0 ]
