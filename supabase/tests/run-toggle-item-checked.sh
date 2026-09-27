#!/usr/bin/env bash
# Apply migrations on plain Postgres and run the check-off / proposal-move checks.
# Usage: supabase/tests/run-toggle-item-checked.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_NAME="${CHECK_TEST_DB:-chroniqe_toggle_item_checked}"
# Migrations refer to pg_trgm operators unqualified. Supabase puts `extensions` on the search path.
export PGOPTIONS="${PGOPTIONS:--c search_path=public,extensions}"

if [[ -n "${PGURL:-}" ]]; then
  psql_cmd() { psql "$PGURL" "$@"; }
  psql_db() { psql "${PGURL%/*}/$1" "${@:2}"; }
else
  psql_cmd() { psql "$@"; }
  psql_db() { psql -d "$1" "${@:2}"; }
fi

psql_cmd -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql_cmd -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};"
psql_db "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/harness.sql"

while IFS= read -r migration; do
  psql_db "$DB_NAME" -v ON_ERROR_STOP=1 -f "$migration"
done < <(find "$ROOT/supabase/migrations" -maxdepth 1 -name '*.sql' | sort)

psql_db "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/toggle_item_checked.sql"
