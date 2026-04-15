#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lounge/worf-security-report.sh — Worf's CI/CD security observation
#
# Lt. Worf audits the current git state and credential posture, then writes
# his findings to the Observation Lounge. Called by:
#   - .git/hooks/pre-push (security gate)
#   - scripts/p0-s0-secrets-sync.sh (after sync)
#   - GitHub Actions secrets-audit.yml
#
# Usage:
#   bash scripts/lounge/worf-security-report.sh [--context "push|sync|ci"]
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/crew-observe.sh"

CONTEXT="${2:-manual}"
TODAY="$(date +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

FINDINGS=()
CONCLUSIONS=()
RECOMMENDATIONS=()
STATUS="CLEARED"

cd "$ROOT"

# ── 1. Check for .env files in tracked git index ──────────────────────────────
TRACKED_ENV=$(git ls-files | grep -E "(^|\/)\.env($|\.)" | grep -v ".env.example" || true)
if [[ -n "$TRACKED_ENV" ]]; then
  STATUS="CRITICAL"
  FINDINGS+=("CRITICAL: .env file(s) tracked in git index: $TRACKED_ENV")
  RECOMMENDATIONS+=("Run: git rm --cached <file> then add to .gitignore")
else
  FINDINGS+=("Git index: no .env files tracked (clean)")
fi

# ── 2. Check .gitignore covers .env ──────────────────────────────────────────
if [[ -f "$ROOT/.gitignore" ]]; then
  if grep -q "^\.env$\|^\*\.env$\|^\.env\." "$ROOT/.gitignore" 2>/dev/null; then
    FINDINGS+=(".gitignore: .env patterns present and enforced")
  else
    STATUS="WARNING"
    FINDINGS+=("WARNING: .gitignore exists but may not cover all .env variants")
    RECOMMENDATIONS+=("Add '*.env' and '.env.*' patterns to .gitignore")
  fi
else
  STATUS="CRITICAL"
  FINDINGS+=("CRITICAL: No .gitignore found — credentials unprotected")
  RECOMMENDATIONS+=("Run: bash scripts/p0-s1-env-check.sh to generate .gitignore")
fi

# ── 3. Scan last 5 commits for accidental credential commits ──────────────────
RECENT_ENV_COMMITS=$(git log --oneline -10 --diff-filter=A --name-only --format="%H %s" -- "*.env" ".env*" 2>/dev/null \
  | grep -v ".env.example" | grep -E "\.(env)" || true)
if [[ -n "$RECENT_ENV_COMMITS" ]]; then
  STATUS="CRITICAL"
  FINDINGS+=("CRITICAL: Recent commits contain .env files: $RECENT_ENV_COMMITS")
  RECOMMENDATIONS+=("Amend or rebase to remove committed secrets, then rotate affected keys")
else
  FINDINGS+=("Git history (last 10 commits): no .env files detected")
fi

# ── 4. Check GitHub Secrets are set (requires gh CLI) ─────────────────────────
REQUIRED_SECRETS=("OPENROUTER_API_KEY" "SUPABASE_URL" "SUPABASE_KEY" "REDIS_URL")
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  MISSING_SECRETS=()
  EXISTING_SECRETS=()
  for secret in "${REQUIRED_SECRETS[@]}"; do
    if gh secret list 2>/dev/null | grep -q "^$secret"; then
      EXISTING_SECRETS+=("$secret")
    else
      MISSING_SECRETS+=("$secret")
    fi
  done
  [[ ${#EXISTING_SECRETS[@]} -gt 0 ]] && FINDINGS+=("GitHub Secrets present: ${EXISTING_SECRETS[*]}")
  if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    [[ "$STATUS" == "CLEARED" ]] && STATUS="WARNING"
    FINDINGS+=("WARNING: GitHub Secrets missing: ${MISSING_SECRETS[*]}")
    RECOMMENDATIONS+=("Run: bash scripts/p0-s0-secrets-sync.sh to sync from .env")
  fi
else
  FINDINGS+=("GitHub CLI not authenticated — remote secrets not validated")
  RECOMMENDATIONS+=("Run: gh auth login then bash scripts/p0-s0-secrets-sync.sh")
fi

# ── 5. Check .env has all required vars ───────────────────────────────────────
if [[ -f "$ROOT/.env" ]]; then
  set -a; source "$ROOT/.env" 2>/dev/null || true; set +a
  MISSING_LOCAL=()
  for var in "OPENROUTER_API_KEY" "SUPABASE_URL" "SUPABASE_KEY" "REDIS_URL"; do
    [[ -z "${!var:-}" ]] && MISSING_LOCAL+=("$var")
  done
  if [[ ${#MISSING_LOCAL[@]} -gt 0 ]]; then
    [[ "$STATUS" == "CLEARED" ]] && STATUS="WARNING"
    FINDINGS+=("Local .env missing values: ${MISSING_LOCAL[*]}")
    RECOMMENDATIONS+=("Fill in missing vars in .env then re-run p0-s0-secrets-sync.sh")
  else
    FINDINGS+=("Local .env: all required vars populated")
  fi
else
  STATUS="CRITICAL"
  FINDINGS+=("CRITICAL: .env file missing — run p0-s1-env-check.sh")
fi

# ── 6. Compose Worf summary ───────────────────────────────────────────────────
case "$STATUS" in
  CLEARED)  SUMMARY="Security audit cleared. All credential safeguards are in place. The honour of this pipeline is intact." ;;
  WARNING)  SUMMARY="Security audit completed with warnings. These are not dishonourable — but they must be addressed before production deployment." ;;
  CRITICAL) SUMMARY="Security breaches detected. This is DISHONOURABLE. Immediate remediation is required before any push to remote." ;;
esac

CONCLUSIONS+=("Overall security status: $STATUS")
CONCLUSIONS+=("Context: $CONTEXT — $TODAY")
[[ "$STATUS" == "CLEARED" ]] && CONCLUSIONS+=("Cleared for push to remote") || CONCLUSIONS+=("HOLD: Do not push until remediation is complete")

# ── Write observation ─────────────────────────────────────────────────────────
crew_observe \
  --member    "Lt. Worf" \
  --role      "Chief of Security, Senior QA Auditor" \
  --title     "Security Audit — $TODAY ($CONTEXT)" \
  --summary   "$SUMMARY" \
  $(for f in "${FINDINGS[@]}"; do echo "--finding"; echo "$f"; done) \
  $(for c in "${CONCLUSIONS[@]}"; do echo "--conclusion"; echo "$c"; done) \
  $(for r in "${RECOMMENDATIONS[@]}"; do echo "--recommend"; echo "$r"; done) \
  --tags      "security,ci-cd,worf,$CONTEXT"

# ── Exit non-zero if critical ─────────────────────────────────────────────────
[[ "$STATUS" == "CRITICAL" ]] && exit 1 || exit 0
