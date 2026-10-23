#!/usr/bin/env bash
# =====================================================================
# Ontenna backend — safe, self-cleaning smoke test.
#
# Exercises the full signup → verify (incl. brute-force) → login →
# entitlement flow end-to-end, then DELETES the throwaway user it made.
# It only ever touches a uniquely-named test account, so it will not
# affect real users. Exit code 0 = all green, non-zero = a check failed.
#
# Usage (point at a STAGING project when possible; prod is acceptable
# because the script cleans up after itself):
#   SUPABASE_URL=https://<ref>.supabase.co \
#   ANON_KEY=<anon key> \
#   SERVICE_KEY=<service_role key> \
#   ./scripts/smoke.sh
#
# SERVICE_KEY is used ONLY to read the generated code and to delete the
# test user at the end. Never commit real keys — pass them via env.
# =====================================================================
set -uo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${ANON_KEY:?set ANON_KEY}"
: "${SERVICE_KEY:?set SERVICE_KEY}"

STAMP="$(date +%s)"
EMAIL="smoke.ci+${STAMP}@nagaretech.com"
PASS="Smoke#${STAMP}aA"
UID_VAL=""
FAILURES=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILURES=$((FAILURES+1)); }

cleanup() {
  if [ -n "$UID_VAL" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
      "$SUPABASE_URL/auth/v1/admin/users/$UID_VAL" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY")
    [ "$code" = "200" ] && printf '  cleanup: deleted test user (%s)\n' "$code" \
                        || printf '  cleanup: WARNING delete returned %s\n' "$code"
  fi
}
trap cleanup EXIT

jqget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]) if d else '')" "$1" 2>/dev/null; }

echo "== Ontenna smoke test =="
echo "   target: $SUPABASE_URL"
echo "   test user: $EMAIL"
echo

# 1) Signup (must NOT send a Supabase confirmation email; returns user_id)
UID_VAL=$(curl -s -X POST "$SUPABASE_URL/functions/v1/mobile-signup" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Smoke\",\"last_name\":\"Test\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | jqget "['user_id']")
[ -n "$UID_VAL" ] && pass "signup returned user_id" || { fail "signup did not return user_id"; exit 1; }

sleep 1
CODE=$(curl -s "$SUPABASE_URL/rest/v1/verification_codes?user_id=eq.$UID_VAL&used=eq.false&select=code&order=created_at.desc&limit=1" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" | jqget "[0]['code']")
[ -n "$CODE" ] && pass "verification code was created" || fail "no active verification code"

# 2) Wrong code → invalid_code (brute-force counter increments)
RC=$(curl -s -X POST "$SUPABASE_URL/functions/v1/mobile-verify-email" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"code\":\"000000\"}" | jqget "['error']['code']")
[ "$RC" = "invalid_code" ] && pass "wrong code rejected (invalid_code)" || fail "wrong code returned '$RC' (expected invalid_code)"

# 3) Correct code → email_verified
MSG=$(curl -s -X POST "$SUPABASE_URL/functions/v1/mobile-verify-email" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}" | jqget "['message']")
[ "$MSG" = "email_verified" ] && pass "correct code verified" || fail "verify returned '$MSG' (expected email_verified)"

# 4) Login → token
TOK=$(curl -s -X POST "$SUPABASE_URL/functions/v1/mobile-login" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jqget "['access_token']")
[ -n "$TOK" ] && pass "login returned access_token" || fail "login did not return a token"

# 5) Entitlement shape (new user → is_entitled present, not entitled)
if [ -n "$TOK" ]; then
  ENT=$(curl -s "$SUPABASE_URL/functions/v1/mobile-subscription" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOK" | jqget "['subscription']['is_entitled']")
  [ "$ENT" = "False" ] || [ "$ENT" = "True" ] && pass "mobile-subscription returns is_entitled ($ENT)" \
                                              || fail "mobile-subscription missing is_entitled"
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "== ALL CHECKS PASSED =="
  exit 0
else
  echo "== $FAILURES CHECK(S) FAILED =="
  exit 1
fi
