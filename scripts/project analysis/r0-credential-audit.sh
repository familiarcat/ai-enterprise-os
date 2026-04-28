#!/bin/bash

###############################################################################
# r0-credential-audit.sh — Remediation Phase 0
# Purpose: Audit credential exposure and provide rotation guidance
# Assigned crew: Worf (security scan), Data (analysis)
# MCP tool: detect_hardcoded_secrets
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
  echo "=== CREDENTIAL AUDIT ==="
  echo ""
}

log_finding() {
  echo -e "${RED}FINDING:${NC} $1"
}

log_info() {
  echo -e "${BLUE}INFO:${NC} $1"
}

log_success() {
  echo -e "${GREEN}OK:${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}WARNING:${NC} $1"
}

log_header

echo "Scanning for exposed credentials in common locations..."
echo ""

# Check 1: OpenRouter API key in various locations
echo "Check 1: OpenRouter API Key Exposure"
echo "─────────────────────────────────────"

if grep -r "sk-or-v1" "$ROOT" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.sh" \
  --include="*.json" \
  --include="*.env*" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  2>/dev/null | head -10; then
  log_finding "OpenRouter API key found in source code"
  echo "  → This key should ONLY be in ~/.zshrc (mode 600) or AWS SSM"
else
  log_success "No OpenRouter keys found in source code ✓"
fi

echo ""

# Check 2: Supabase keys
echo "Check 2: Supabase Key Exposure"
echo "──────────────────────────────"

if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" "$ROOT" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.sh" \
  --include="*.json" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  2>/dev/null | head -10; then
  log_finding "Supabase JWT key found in source code"
  echo "  → Service role keys are HIGHLY SENSITIVE"
else
  log_success "No Supabase keys found in source code ✓"
fi

echo ""

# Check 3: .env files in git
echo "Check 3: .env Files in Git"
echo "───────────────────────────"

if git -C "$ROOT" ls-files | grep -E "\.env" 2>/dev/null; then
  log_finding ".env files are tracked in git (security risk)"
  echo "  → Run: git rm --cached .env && git commit"
else
  log_success "No .env files tracked in git ✓"
fi

echo ""

# Check 4: ~/.zshrc permissions
echo "Check 4: ~/.zshrc File Permissions"
echo "──────────────────────────────────"

if [[ -f ~/.zshrc ]]; then
  PERMS=$(stat -f "%A" ~/.zshrc 2>/dev/null || stat -c "%a" ~/.zshrc 2>/dev/null)
  if [[ "$PERMS" == "600" ]]; then
    log_success "~/.zshrc has secure permissions (600) ✓"
  else
    log_finding "~/.zshrc has permissive permissions ($PERMS)"
    echo "  → Run: chmod 600 ~/.zshrc"
  fi
else
  log_warning "~/.zshrc not found (check if credentials are elsewhere)"
fi

echo ""

# Check 5: AWS credentials
echo "Check 5: AWS Credential Exposure"
echo "────────────────────────────────"

if grep -r "AKIA\|aws_access_key" "$ROOT" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.sh" \
  --include="*.json" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  2>/dev/null | head -10; then
  log_finding "AWS credentials found in source code"
  echo "  → Move to ~/.aws/credentials or AWS SSM Parameter Store"
else
  log_success "No AWS keys found in source code ✓"
fi

echo ""

# Check 6: n8n credentials
echo "Check 6: n8n Configuration Exposure"
echo "────────────────────────────────────"

if grep -r "n8n\.pbradygeorgen\|n8n.*auth\|n8n.*token" "$ROOT" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.sh" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  2>/dev/null | head -10; then
  log_warning "n8n configuration references found"
  echo "  → Verify that credentials are NOT hardcoded in n8n webhook mappings"
else
  log_success "No hardcoded n8n credentials detected ✓"
fi

echo ""
echo "─────────────────────────────────────"
echo ""

# Summary and recommendations
echo "REMEDIATION RECOMMENDATIONS:"
echo ""
echo "1. IMMEDIATE (if findings above):"
echo "   - Rotate ALL exposed credentials immediately"
echo "   - Remove from git history: git-filter-branch or BFG Repo-Cleaner"
echo ""
echo "2. FOR DEVELOPMENT:"
echo "   - Store secrets in ~/.zshrc (mode 600 only)"
echo "   - Or use .env.local (add to .gitignore)"
echo ""
echo "3. FOR PRODUCTION:"
echo "   - Use AWS SSM Parameter Store"
echo "   - Reference via: aws ssm get-parameter --name /sovereign/openrouter-key"
echo "   - Rotate keys monthly"
echo ""
echo "4. CONTINUOUS MONITORING:"
echo "   - Run this audit before every commit"
echo "   - Add to pre-commit hook: git hook install"
echo ""

if [[ -n "$DRY_RUN" ]]; then
  echo "[DRY RUN] No actions taken."
fi

echo ""
echo "Audit complete. Review findings above."
