#!/bin/bash

###############################################################################
# r7-phase0-verify.sh — Remediation Phase 7
# Purpose: Run existing Phase 0 verification scripts (p0-run-all.sh)
# Assigned crew: Tasha (tactical), La Forge (systems)
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DRY_RUN="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_header() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════════════════════╗"
  echo "║ $1"
  echo "╚════════════════════════════════════════════════════════════════════════════════╝"
  echo ""
}

log_step() {
  echo -e "${BLUE}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_header "REMEDIATION PHASE 7: PHASE 0 VERIFICATION"

echo "This phase runs the existing Phase 0 setup scripts."
echo "Phase 0 initializes: Secrets, Supabase, Redis, and health checks."
echo ""

# Check if Phase 0 script exists
P0_SCRIPT="$ROOT/p0-run-all.sh"

if [[ ! -f "$P0_SCRIPT" ]]; then
  log_error "Phase 0 script not found: $P0_SCRIPT"
  echo ""
  echo "Phase 0 must be executed from the repo root."
  echo "The phase scripts should be in the root directory:"
  echo "  - p0-run-all.sh"
  echo "  - p1-run-all.sh"
  echo "  - p2-run-all.sh"
  echo "  - p3-run-all.sh"
  echo "  - p4-run-all.sh"
  echo ""
  echo "Are these files present? Run:"
  echo "  ls -la $ROOT/p*.sh"
  echo ""
  exit 1
fi

log_success "Phase 0 script found ✓"

echo ""
echo "Pre-flight checks:"
echo "─────────────────"
echo ""

# Check 1: pnpm installed
if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm --version)
  log_success "pnpm installed: v$PNPM_VERSION ✓"
else
  log_warning "pnpm not installed"
  echo "  Install: npm install -g pnpm"
  echo ""
fi

# Check 2: Node.js version
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  log_success "Node.js installed: $NODE_VERSION ✓"
else
  log_error "Node.js not found - required for Phase 0"
  exit 1
fi

# Check 3: Supabase CLI (optional for Phase 0)
if command -v supabase &> /dev/null; then
  log_success "Supabase CLI installed ✓"
else
  log_warning "Supabase CLI not installed (optional for Phase 0)"
  echo "  Install: npm install -g @supabase/cli"
  echo ""
fi

# Check 4: Environment variables
echo ""
echo "Environment check:"
echo "──────────────────"
echo ""

REQUIRED_VARS=(
  "OPENROUTER_API_KEY"
  "OPENROUTER_REFERER"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING_VARS+=("$var")
    log_error "Missing: $var"
  else
    # Show first 20 chars + "..." for security
    VAL="${!var}"
    if [[ ${#VAL} -gt 20 ]]; then
      DISPLAY="${VAL:0:20}..."
    else
      DISPLAY="$VAL"
    fi
    log_success "$var = $DISPLAY ✓"
  fi
done

echo ""

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  log_error "Missing environment variables"
  echo ""
  echo "Set these in ~/.zshrc or source them before running Phase 0:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  export $var=<your-value>"
  done
  echo ""
  echo "Then reload: source ~/.zshrc"
  echo ""
  exit 1
fi

log_success "All required environment variables are set ✓"

echo ""
echo "Ready to execute Phase 0"
echo "───────────────────────"
echo ""

if [[ -n "$DRY_RUN" ]]; then
  echo "[DRY RUN] Would execute: $P0_SCRIPT"
  echo ""
  echo "To run Phase 0 verification, execute:"
  echo "  ./p0-run-all.sh"
  echo ""
  exit 0
fi

# Execute Phase 0
echo "Executing Phase 0 setup..."
echo ""

if bash "$P0_SCRIPT"; then
  log_success "Phase 0 completed successfully ✓"
  
  echo ""
  echo "═══════════════════════════════════════════════"
  echo ""
  
  log_success "ALL REMEDIATION PHASES COMPLETE"
  echo ""
  echo "You now have:"
  echo "  ✓ Secured credentials and secrets"
  echo "  ✓ Created .gitignore (prevents leaks)"
  echo "  ✓ Initialized monorepo (pnpm + Turbo)"
  echo "  ✓ Hardened security (hooks, permissions)"
  echo "  ✓ Created governance documents"
  echo "  ✓ Defined crew system and agents"
  echo "  ✓ Verified Phase 0 setup"
  echo ""
  echo "NEXT STEPS:"
  echo "  1. Commit changes: git add . && git commit -m 'Apply all remediation phases'"
  echo "  2. Install dependencies: pnpm install"
  echo "  3. Verify monorepo: pnpm list --depth=-1"
  echo "  4. Continue with Phase 1-4: ./p1-run-all.sh"
  echo ""
  
else
  log_error "Phase 0 failed - see errors above"
  exit 1
fi
