#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s3b-supabase-migrate.sh — Phase 0, Step 3b: Run Supabase Migrations
#
# Applies pending migrations to the local Supabase instance.
# Assigned crew: Chief O'Brien (maintenance and structural integrity).
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s3b-supabase-migrate"
step_header "PHASE 0" "Supabase Migration Sync"

# ── Pre-flight Docker Check ──────────────────────────────────────────────────
echo "  Verifying Docker daemon..."
if ! docker info > /dev/null 2>&1; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "health_check" \
    --tool-args '{"fix": false}' \
    --context "Docker is not running or unreachable. Supabase local development requires Docker." \
    --error   "Docker daemon not detected. Please start Docker Desktop or the colima/docker service."
  exit 1
fi

echo "  Checking migration status..."

if ! npx supabase migration up; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "health_check" \
    --tool-args '{"fix": false}' \
    --context "Failed to apply Supabase migrations. Ensure Docker is running and the database is started." \
    --error   "Supabase CLI exited with error."
  exit 1
fi

echo "  ✔  Migrations applied successfully."
phase_pass "$STEP"
