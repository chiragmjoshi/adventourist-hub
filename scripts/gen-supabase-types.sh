#!/usr/bin/env bash
# Regenerate src/integrations/supabase/types.ts from the live schema.
#
# Why: audit (ROLLOUT_PLAN.md phase 3) found ~140 `as any` casts, most caused
# by the generated types lagging behind the live schema (newer tables like
# reminders, travel_stories, automation_queue, feature_flags, error_logs).
# Running this before each `as any` cleanup PR keeps the fixes aligned with
# what the DB actually looks like.
#
# Usage:
#   scripts/gen-supabase-types.sh              # production project (from config.toml)
#   scripts/gen-supabase-types.sh --staging    # explicit staging project
#   SUPABASE_PROJECT_ID=xxx scripts/gen-supabase-types.sh  # override
#
# Prerequisites:
#   * supabase CLI installed (`brew install supabase/tap/supabase` or
#     `npm i -g supabase`).
#   * `supabase login` has been run with a token that can read the project.
#
# Safety:
#   * The script writes to a temp file first, diffs against the current
#     types, and only replaces if the output is non-empty + valid TS. On
#     any error the existing types.ts is left untouched.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET="src/integrations/supabase/types.ts"
TMP="$(mktemp --suffix=.ts)"
trap 'rm -f "$TMP"' EXIT

# Resolve project id
if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  PROJECT_ID="$SUPABASE_PROJECT_ID"
elif [[ "${1:-}" == "--staging" ]]; then
  if [[ -z "${SUPABASE_STAGING_PROJECT_ID:-}" ]]; then
    echo "Error: pass --staging, set SUPABASE_STAGING_PROJECT_ID in env." >&2
    exit 1
  fi
  PROJECT_ID="$SUPABASE_STAGING_PROJECT_ID"
else
  PROJECT_ID="$(grep -E '^project_id\s*=' supabase/config.toml | sed -E 's/^project_id\s*=\s*"([^"]+)".*/\1/')"
  if [[ -z "$PROJECT_ID" ]]; then
    echo "Error: could not read project_id from supabase/config.toml. Set SUPABASE_PROJECT_ID." >&2
    exit 1
  fi
fi

echo "Regenerating $TARGET from project $PROJECT_ID…"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not installed. See https://supabase.com/docs/guides/cli." >&2
  exit 1
fi

supabase gen types typescript --project-id "$PROJECT_ID" --schema public > "$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "Error: supabase CLI produced empty output. Not writing $TARGET." >&2
  exit 1
fi

# Basic sanity: types file must contain the `Database` export.
if ! grep -q "export type Database" "$TMP"; then
  echo "Error: output does not contain 'export type Database'. Not writing $TARGET." >&2
  echo "First 20 lines of output were:" >&2
  head -20 "$TMP" >&2
  exit 1
fi

mv "$TMP" "$TARGET"
echo "Wrote $TARGET"

# Immediately typecheck so a bad schema regen is caught before commit.
echo "Running tsc --noEmit…"
if ! npx tsc --noEmit; then
  echo
  echo "tsc errors after regeneration. These are expected: 'as any' casts in"
  echo "src/pages and src/services need to be replaced with real types. Fix"
  echo "them in a dedicated 'Phase 3.1/3.2' PR (one page per PR per the plan)."
  exit 1
fi

echo "Types regenerated cleanly. Commit on a 'chore: regen supabase types' PR."
