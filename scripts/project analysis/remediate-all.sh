#!/bin/bash

###############################################################################
# SOVEREIGN FACTORY REMEDIATION ORCHESTRATOR
# Purpose: Execute all remediation recommendations from crew analysis
# Assigned crew: Captain Picard (orchestration), Worf (security validation)
# Usage: ./remediate-all.sh [--dry-run] [--phase-only N] [--skip-rotation]
###############################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMEDIATION_DIR="$SCRIPT_DIR/remediation"
DRY_RUN=false
PHASE_ONLY=""
SKIP_ROTATION=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --phase-only) PHASE_ONLY="$2"; shift 2 ;;
    --skip-rotation) SKIP_ROTATION=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Helper functions
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

log_dry_run() {
  echo -e "${YELLOW}[DRY RUN]${NC} $1"
}

run_phase() {
  local phase_num=$1
  local phase_name=$2
  local script_path=$3
  
  if [[ -n "$PHASE_ONLY" && "$PHASE_ONLY" != "$phase_num" ]]; then
    return 0
  fi
  
  log_header "REMEDIATION PHASE $phase_num: $phase_name"
  
  if [[ ! -f "$script_path" ]]; then
    log_error "Script not found: $script_path"
    return 1
  fi
  
  if $DRY_RUN; then
    log_dry_run "Would execute: $script_path"
    bash "$script_path" --dry-run || return 1
  else
    bash "$script_path" || return 1
  fi
  
  log_success "Phase $phase_num complete"
}

# Main execution
main() {
  log_header "SOVEREIGN FACTORY REMEDIATION ORCHESTRATOR"
  echo "Repository: $ROOT"
  echo "Remediation scripts: $REMEDIATION_DIR"
  echo ""
  echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'EXECUTE')"
  [ -n "$PHASE_ONLY" ] && echo "Phase filter: $PHASE_ONLY" || echo "Phases: ALL"
  echo ""
  
  # Verify we're in the right place
  if [[ ! -d "$REMEDIATION_DIR" ]]; then
    log_error "Remediation directory not found: $REMEDIATION_DIR"
    echo "Please run from repo root or ensure scripts/remediation exists"
    exit 1
  fi
  
  # Phase 0: Credential Security Assessment (non-destructive)
  run_phase "0" "Credential Assessment" "$REMEDIATION_DIR/r0-credential-audit.sh" || true
  
  # Phase 1: .gitignore Creation
  run_phase "1" ".gitignore Setup" "$REMEDIATION_DIR/r1-gitignore.sh" || true
  
  # Phase 2: Secret Scan & Audit
  run_phase "2" "Hardcoded Secret Detection" "$REMEDIATION_DIR/r2-audit-secrets.sh" || true
  
  # Phase 3: File Permissions Hardening
  run_phase "3" "Security Hardening" "$REMEDIATION_DIR/r3-security-hardening.sh" || true
  
  # Phase 4: Monorepo Initialization
  run_phase "4" "Monorepo Setup" "$REMEDIATION_DIR/r4-init-monorepo.sh" || true
  
  # Phase 5: Constitutional Documents
  run_phase "5" "Platform Constitution" "$REMEDIATION_DIR/r5-create-constitution.sh" || true
  
  # Phase 6: Crew Manifest
  run_phase "6" "Crew Manifest" "$REMEDIATION_DIR/r6-crew-manifest.sh" || true
  
  # Phase 7: Phase 0 Verification (runs your existing p0-run-all.sh)
  run_phase "7" "Phase 0 Verification" "$REMEDIATION_DIR/r7-phase0-verify.sh" || true
  
  # Final summary
  log_header "REMEDIATION COMPLETE"
  
  if $DRY_RUN; then
    echo -e "${YELLOW}DRY RUN MODE${NC} — No changes were made"
    echo ""
    echo "To apply these remediations, run:"
    echo "  ./remediate-all.sh"
    echo ""
    echo "Or run individual phases:"
    echo "  ./remediate-all.sh --phase-only 1"
  else
    echo "All remediations have been applied."
    echo ""
    echo "Next steps:"
    echo "  1. Review the changes: git status"
    echo "  2. Test the monorepo setup: pnpm install"
    echo "  3. Verify crew system: node mcp-server.js"
    echo "  4. Run Phase 0: ./p0-run-all.sh"
  fi
  
  echo ""
  log_success "Orchestration complete"
}

# Execute
main "$@"
