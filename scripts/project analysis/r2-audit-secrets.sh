#!/bin/bash

###############################################################################
# r2-audit-secrets.sh — Remediation Phase 2
# Purpose: Detect hardcoded secrets and suspicious patterns in codebase
# Assigned crew: Worf (security), Data (pattern analysis)
# MCP tool: search_code (for pattern matching)
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
  echo "=== PHASE 2: HARDCODED SECRET DETECTION ==="
  echo ""
}

log_found() {
  echo -e "${RED}FOUND:${NC} $1"
}

log_info() {
  echo -e "${BLUE}INFO:${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_header

SEARCH_DIRS=(
  "apps"
  "packages"
  "core"
  "scripts"
)

DANGEROUS_PATTERNS=(
  "sk-or-v1"                           # OpenRouter API key
  "sk-ant-"                            # Anthropic API key
  "sk-proj-"                           # OpenAI project key
  "AKIA[0-9A-Z]\{16\}"               # AWS access key
  "aws_secret_access_key"             # AWS secret
  "password.*=.*['\"]"                # password assignments
  "secret.*=.*['\"]"                  # secret assignments
  "apiKey.*=.*['\"]"                  # API key assignments
  "api_key.*=.*['\"]"                 # API key assignments
  "token.*=.*['\"]"                   # Token assignments
  "DATABASE_URL=postgresql"           # Database connection strings
  "SUPABASE_SERVICE_ROLE"             # Supabase service role
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"  # JWT token (base64)
)

SAFE_FILES=(
  ".gitignore"
  "package.json"
  "tsconfig.json"
  "*.test.ts"
  "*.spec.ts"
  ".md"
  "EXAMPLE"
  "TEMPLATE"
)

EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  "dist"
  "build"
  ".next"
  ".turbo"
  ".supabase"
)

FINDINGS=0

log_info "Scanning for dangerous patterns..."
echo ""

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  pattern_name=$(echo "$pattern" | cut -d' ' -f1)
  
  # Build grep command with exclusions
  grep_cmd="grep -r \"$pattern\" \"$ROOT\" --include='*.js' --include='*.ts' --include='*.tsx' --include='*.sh' --include='*.env*' --include='*.json'"
  
  for dir in "${EXCLUDE_DIRS[@]}"; do
    grep_cmd="$grep_cmd --exclude-dir=$dir"
  done
  
  if eval "$grep_cmd" 2>/dev/null | head -5; then
    log_found "Pattern detected: $pattern_name"
    ((FINDINGS++))
    echo ""
  fi
done

if [[ $FINDINGS -eq 0 ]]; then
  log_success "No hardcoded secrets detected ✓"
else
  log_warning "Found $FINDINGS pattern(s) - review and remediate above"
fi

echo ""

# Additional checks for suspicious config files
log_info "Checking for suspicious configuration files..."
echo ""

SUSPICIOUS_FILES=(
  ".env"
  ".env.local"
  ".env.production"
  "config.local.js"
  "secrets.json"
  ".zshrc"
  ".bashrc"
  ".bash_profile"
)

for file in "${SUSPICIOUS_FILES[@]}"; do
  if find "$ROOT" -maxdepth 3 -name "$file" -type f 2>/dev/null | grep -v node_modules | grep -v .git; then
    log_warning "Suspicious file found: $file"
    echo "  → Ensure this file is in .gitignore"
    echo "  → Use mode 600 for sensitive files"
    echo ""
  fi
done

echo ""

# Check for credential patterns in git history (shallow check)
log_info "Checking recent git commits for patterns..."
echo ""

if command -v git &> /dev/null; then
  commit_findings=0
  
  for pattern in "password=" "secret=" "api_key=" "token=" "sk-"; do
    if git -C "$ROOT" log --all --oneline -S "$pattern" 2>/dev/null | head -3; then
      log_warning "Pattern '$pattern' found in git history"
      ((commit_findings++))
    fi
  done
  
  if [[ $commit_findings -gt 0 ]]; then
    echo ""
    echo "To clean git history, consider:"
    echo "  1. Using BFG Repo-Cleaner: bfg --delete-files .env"
    echo "  2. Or: git-filter-branch (slower, but built-in)"
    echo "  3. Force push: git push origin --force-with-lease"
    echo ""
    log_warning "After cleanup, ROTATE all exposed credentials immediately"
  fi
else
  log_warning "git not found - cannot scan commit history"
fi

echo ""

# Summary
echo "═══════════════════════════════════════════════"
echo ""

if [[ $FINDINGS -eq 0 ]]; then
  log_success "Secret audit complete - no issues found ✓"
else
  log_warning "Secret audit found $FINDINGS issue(s)"
  echo ""
  echo "REMEDIATION STEPS:"
  echo "  1. Remove from source code"
  echo "  2. Move to ~/.zshrc (dev) or AWS SSM (production)"
  echo "  3. Rotate all exposed credentials"
  echo "  4. Clean git history (BFG Repo-Cleaner)"
  echo "  5. Force push: git push --force-with-lease"
fi

echo ""

if [[ -z "$DRY_RUN" ]]; then
  log_success "Phase 2 complete"
else
  echo "[DRY RUN] No modifications made"
fi
