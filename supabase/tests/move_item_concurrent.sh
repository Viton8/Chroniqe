#!/usr/bin/env bash
# Two overlapping move_item calls must produce one target row.
# Requires a migrated database. Invoked by run-move-item-idempotent.sh.
set -euo pipefail

DB="${DB:-${MOVE_ITEM_TEST_DB:-chroniqe_move_item}}"
if [[ -n "${PGURL:-}" ]]; then
  PSQL=(psql "${PGURL%/*}/$DB" -v ON_ERROR_STOP=1 -q)
else
  PSQL=(sudo -u postgres env PGOPTIONS="$PGOPTIONS" psql -d "$DB" -v ON_ERROR_STOP=1 -q)
fi
export PGOPTIONS="${PGOPTIONS:--c search_path=public,extensions}"

READY=/tmp/chroniqe-move-a-locked
A_LOG=/tmp/chroniqe-move-a.log
B_LOG=/tmp/chroniqe-move-b.log

owner=13131313-1313-4131-8131-131313131313
source_list=dddddddd-dddd-4ddd-8ddd-ddddddddddd1
target_list=dddddddd-dddd-4ddd-8ddd-ddddddddddd2
item=eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1

cleanup() {
  if [[ -n "${A_PID:-}" ]]; then
    kill "$A_PID" >/dev/null 2>&1 || true
    wait "$A_PID" >/dev/null 2>&1 || true
    A_PID=""
  fi
  "${PSQL[@]}" <<SQL >/dev/null
DELETE FROM public.items WHERE list_id IN ('$source_list', '$target_list');
DELETE FROM public.activity_events WHERE list_id IN ('$source_list', '$target_list');
DELETE FROM public.lists WHERE id IN ('$source_list', '$target_list');
DELETE FROM auth.users WHERE id = '$owner';
SQL
  rm -f "$A_LOG" "$B_LOG"
  sudo rm -f "$READY" 2>/dev/null || true
}
trap cleanup EXIT
rm -f "$A_LOG" "$B_LOG"
sudo rm -f "$READY" 2>/dev/null || true

"${PSQL[@]}" <<SQL
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('$owner', 'owner-concurrent-move@example.com', '{"username":"ownermove2","display_name":"Owner"}'::jsonb);
INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
VALUES
  ('$source_list', '$owner', 'Concurrent inbox', 'private', 'owner'),
  ('$target_list', '$owner', 'Concurrent archive', 'private', 'owner');
INSERT INTO public.items (id, list_id, values, position, created_by, updated_by)
VALUES ('$item', '$source_list', '{"title":"once"}'::jsonb, 1, '$owner', '$owner');
INSERT INTO public.item_ratings (item_id, field_id, user_id, value)
VALUES ('$item', 'stars', '$owner', 5);
INSERT INTO public.item_comments (item_id, user_id, body)
VALUES ('$item', '$owner', 'note');
SQL

"${PSQL[@]}" >"$A_LOG" 2>&1 <<SQL &
BEGIN;
SELECT id FROM public.items WHERE id = '$item' FOR UPDATE;
\\! touch $READY
SELECT set_config('request.jwt.claim.sub', '$owner', true);
SELECT set_config('request.jwt.claims', '{"sub":"$owner","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT pg_sleep(3);
SELECT public.move_item('$item'::uuid, '$target_list'::uuid);
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
SELECT set_config('request.jwt.claim.sub', '$owner', false);
SELECT set_config('request.jwt.claims', '{"sub":"$owner","role":"authenticated"}', false);
SET ROLE authenticated;
SELECT public.move_item('$item'::uuid, '$target_list'::uuid);
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
if [[ "$B_STATUS" -ne 0 ]]; then
  echo "session B failed" >&2
  cat "$B_LOG" >&2
  exit 1
fi

A_ID=$(grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$A_LOG" | tail -n 1)
B_ID=$(grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$B_LOG" | tail -n 1)
if [[ -z "$A_ID" || -z "$B_ID" ]]; then
  echo "could not read moved item ids" >&2
  echo "A:" >&2
  cat "$A_LOG" >&2
  echo "B:" >&2
  cat "$B_LOG" >&2
  exit 1
fi
if [[ "$A_ID" != "$B_ID" ]]; then
  echo "overlapping moves returned different ids: $A_ID vs $B_ID" >&2
  exit 1
fi

COUNT=$("${PSQL[@]}" -tA -c "SELECT count(*) FROM public.items WHERE list_id = '$target_list';")
SOURCE=$("${PSQL[@]}" -tA -c "SELECT count(*) FROM public.items WHERE id = '$item';")
RATINGS=$("${PSQL[@]}" -tA -c "SELECT count(*) FROM public.item_ratings WHERE item_id = '$A_ID';")
COMMENTS=$("${PSQL[@]}" -tA -c "SELECT count(*) FROM public.item_comments WHERE item_id = '$A_ID';")
EVENTS=$("${PSQL[@]}" -tA -c "SELECT count(*) FROM public.activity_events WHERE event_type = 'item_moved' AND payload ->> 'source_item_id' = '$item';")

if [[ "$COUNT" != "1" ]]; then
  echo "expected 1 target item, got $COUNT" >&2
  exit 1
fi
if [[ "$SOURCE" != "0" ]]; then
  echo "source item is still present" >&2
  exit 1
fi
if [[ "$RATINGS" != "1" ]]; then
  echo "expected 1 copied rating, got $RATINGS" >&2
  exit 1
fi
if [[ "$COMMENTS" != "1" ]]; then
  echo "expected 1 copied comment, got $COMMENTS" >&2
  exit 1
fi
if [[ "$EVENTS" != "1" ]]; then
  echo "expected 1 item_moved event, got $EVENTS" >&2
  exit 1
fi

echo "move_item_concurrent ok"
