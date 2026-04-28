#!/usr/bin/env bash
# p2-s1-clone-platform.sh — Phase 2, Step 1: Clone openrouter-crew-platform
# Assigned crew: Captain Picard (strategic coordination, ensure the fleet is assembled).
# MCP tool on failure: git_operation
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p2-s1-clone-platform"
step_header "PHASE 2 — MONOREPO MERGE" "Step 1: Clone openrouter-crew-platform"

PARENT="$(dirname "$ROOT")"
ORC_TARGET="$PARENT/openrouter-crew-platform"
ORC_REPO="https://github.com/familiarcat/openrouter-crew-platform.git"

if [[ -d "$ORC_TARGET/.git" ]]; then
  echo "  ✔  openrouter-crew-platform already cloned at $ORC_TARGET"
  echo "  Pulling latest..."
  git -C "$ORC_TARGET" pull --ff-only 2>/tmp/p2s1-pull.txt || {
    echo "  ⚠  Pull failed (diverged?): $(cat /tmp/p2s1-pull.txt)"
    echo "     Non-fatal — continuing with local state"
  }
else
  echo "  Cloning $ORC_REPO → $ORC_TARGET..."
  if ! git clone "$ORC_REPO" "$ORC_TARGET" 2>/tmp/p2s1-clone.txt; then
    crew_fail \
      --step    "$STEP" \
      --persona "captain_picard" \
      --tool    "git_operation" \
      --tool-args '{"action": "status"}' \
      --context "git clone failed for openrouter-crew-platform. Check network, GitHub auth, and repo visibility." \
      --error   "$(cat /tmp/p2s1-clone.txt)"
    exit 1
  fi
  echo "  ✔  Cloned to $ORC_TARGET"
fi

# ── Verify key directories ────────────────────────────────────────────────────
for dir in "apps/alex-dashboard" "packages" "agents"; do
  if [[ ! -d "$ORC_TARGET/$dir" ]]; then
    echo "  ⚠  Expected directory missing: $ORC_TARGET/$dir"
  else
    echo "  ✔  $dir present"
  fi
done

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo "  Installing openrouter-crew-platform dependencies..."
cd "$ORC_TARGET"
if ! pnpm install --silent 2>/tmp/p2s1-install.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "captain_picard" \
    --tool    "manage_project" \
    --tool-args '{"project": "openrouter-crew-platform", "action": "update", "details": {"status": "dependency-install-failed"}}' \
    --context "pnpm install failed in $ORC_TARGET. The lockfile or workspace config may be incompatible." \
    --error   "$(cat /tmp/p2s1-install.txt | tail -30)"
  exit 1
fi
echo "  ✔  Dependencies installed"

phase_pass "$STEP"
