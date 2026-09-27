#!/usr/bin/env bash
# Apply migrations on plain Postgres and run the move_item double-call checks.
# Usage: supabase/tests/run-move-item-idempotent.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_NAME="${MOVE_ITEM_TEST_DB:-chroniqe_move_item}"
# Migrations refer to pg_trgm operators unqualified. Supabase puts `extensions` on the search path.
export PGOPTIONS="${PGOPTIONS:--c search_path=public,extensions}"

if [[ -n "${PGURL:-}" ]]; then
  psql_cmd() { psql "$PGURL" "$@"; }
  psql_db() { psql "${PGURL%/*}/$1" "${@:2}"; }
else
  psql_cmd() { sudo -u postgres env PGOPTIONS="$PGOPTIONS" psql "$@"; }
  psql_db() { sudo -u postgres env PGOPTIONS="$PGOPTIONS" psql -d "$1" "${@:2}"; }
fi

psql_cmd -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql_cmd -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};"
psql_db "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/harness.sql"

while IFS= read -r migration; do
  psql_db "$DB_NAME" -v ON_ERROR_STOP=1 -f "$migration"
done < <(find "$ROOT/supabase/migrations" -maxdepth 1 -name '*.sql' | sort)

psql_db "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/move_item_idempotent.sql"
echo "move_item_idempotent sql ok"

DB="$DB_NAME" ROOT="$ROOT" bash "$ROOT/supabase/tests/move_item_concurrent.sh"
