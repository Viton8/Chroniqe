#!/usr/bin/env bash
# Two overlapping approvals of one pending proposal must apply once.
# Requires a migrated database and psql as a superuser (peer auth is fine):
#   sudo -u postgres bash supabase/tests/review_proposal_concurrent.sh
set -euo pipefail

DB="${CHRONIQE_TEST_DB:-chroniqe_test}"
PSQL=(psql -d "$DB" -v ON_ERROR_STOP=1 -q)
READY=/tmp/chroniqe-review-a-locked
A_LOG=/tmp/chroniqe-review-a.log
B_LOG=/tmp/chroniqe-review-b.log

owner_a=12121212-1212-4121-8121-121212121212
proposer=13131313-1313-4131-8131-131313131313
list_a=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1
prop=c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0

cleanup() {
  if [[ -n "${A_PID:-}" ]]; then
    kill "$A_PID" >/dev/null 2>&1 || true
    wait "$A_PID" >/dev/null 2>&1 || true
    A_PID=""
  fi
  # Delete items before lists. Cascading a list removal fires the item
  # activity trigger after the list row is already gone.
  "${PSQL[@]}" <<SQL >/dev/null
DELETE FROM public.items WHERE list_id = '$list_a';
DELETE FROM public.activity_events WHERE list_id = '$list_a';
DELETE FROM public.notifications WHERE user_id IN ('$owner_a', '$proposer');
DELETE FROM public.lists WHERE id = '$list_a';
DELETE FROM auth.users WHERE id IN ('$owner_a', '$proposer');
SQL
  rm -f "$READY" "$A_LOG" "$B_LOG"
}
trap cleanup EXIT
rm -f "$READY" "$A_LOG" "$B_LOG"

"${PSQL[@]}" <<SQL
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('$owner_a', 'ownera-concurrent@example.com', '{"username":"ownera2","display_name":"Owner A"}'::jsonb),
  ('$proposer', 'proposer-concurrent@example.com', '{"username":"proposer2","display_name":"Proposer"}'::jsonb);
INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
VALUES ('$list_a', '$owner_a', 'Concurrent A', 'public', 'proposals');
INSERT INTO public.change_proposals (id, list_id, item_id, user_id, action, payload)
VALUES (
  '$prop',
  '$list_a',
  NULL,
  '$proposer',
  'create',
  '{"values":{"title":"once"}}'::jsonb
);
SQL

"${PSQL[@]}" >"$A_LOG" 2>&1 <<SQL &
BEGIN;
SELECT id FROM public.change_proposals WHERE id = '$prop' FOR UPDATE;
\\! touch $READY
SELECT set_config('request.jwt.claim.sub', '$owner_a', true);
SET LOCAL ROLE authenticated;
SELECT pg_sleep(3);
SELECT public.review_proposal('$prop'::uuid, true, NULL);
COMMIT;
SQL
A_PID=$!

for _ in $(seq 1 50); do
  if [[ -f "$READY" ]]; then
    break
  fi
  sleep 0.1
done
if [[ ! -f "$READY" ]]; then
  echo "session A did not take the row lock" >&2
  cat "$A_LOG" >&2 || true
  exit 1
fi

set +e
"${PSQL[@]}" >"$B_LOG" 2>&1 <<SQL
SELECT set_config('request.jwt.claim.sub', '$owner_a', false);
SET ROLE authenticated;
SELECT public.review_proposal('$prop'::uuid, true, NULL);
SQL
B_STATUS=$?
set -e

wait "$A_PID"
A_STATUS=$?
A_PID=""

if [[ "$A_STATUS" -ne 0 ]]; then
  echo "session A failed" >&2
  cat "$A_LOG" >&2
  exit 1
fi
if [[ "$B_STATUS" -eq 0 ]]; then
  echo "session B applied a second approval" >&2
  cat "$B_LOG" >&2
  exit 1
fi
if ! grep -q 'proposal already reviewed' "$B_LOG"; then
  echo "session B failed for an unexpected reason" >&2
  cat "$B_LOG" >&2
  exit 1
fi

COUNT=$("${PSQL[@]}" -tA -c "SELECT count(*) FROM public.items WHERE list_id = '$list_a' AND values->>'title' = 'once';")
if [[ "$COUNT" != "1" ]]; then
  echo "expected 1 created item, got $COUNT" >&2
  exit 1
fi

echo "review_proposal_concurrent ok"
