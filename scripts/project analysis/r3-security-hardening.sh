#!/bin/bash

###############################################################################
# r3-security-hardening.sh — Remediation Phase 3
# Purpose: Harden security with file permissions, hooks, and guards
# Assigned crew: Worf (security hardening), La Forge (systems engineering)
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

log_step() {
  echo -e "${BLUE}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
echo "=== PHASE 3: SECURITY HARDENING ==="
echo ""

# 1. Secure ~/.zshrc permissions
log_step "Securing ~/.zshrc file permissions..."

if [[ -f ~/.zshrc ]]; then
  if [[ -z "$DRY_RUN" ]]; then
    chmod 600 ~/.zshrc
    log_success "~/.zshrc permissions set to 600 (owner read-write only) ✓"
  else
    echo "[DRY RUN] Would set ~/.zshrc to mode 600"
  fi
else
  log_warning "~/.zshrc not found - cannot secure"
fi

echo ""

# 2. Create pre-commit hook for secret detection
log_step "Installing pre-commit hook for secret detection..."

HOOK_PATH="$ROOT/.git/hooks/pre-commit"

if [[ -z "$DRY_RUN" ]]; then
  mkdir -p "$(dirname "$HOOK_PATH")"
  
  cat > "$HOOK_PATH" << 'EOF'
#!/bin/bash
# Pre-commit hook: Prevent accidental credential commits

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

DANGEROUS_PATTERNS=(
  "sk-or-v1"
  "sk-ant-"
  "AKIA[0-9A-Z]\{16\}"
  "password.*=.*['\"]"
  "secret.*=.*['\"]"
  "apiKey.*=.*['\"]"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
)

FOUND_SECRETS=0

# Check staged files
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if git diff --cached -U0 | grep -E "$pattern" > /dev/null 2>&1; then
    echo -e "${RED}✗ Found potential secret in staged changes: $pattern${NC}"
    ((FOUND_SECRETS++))
  fi
done

if [[ $FOUND_SECRETS -gt 0 ]]; then
  echo ""
  echo -e "${RED}❌ COMMIT BLOCKED: Potential secrets detected${NC}"
  echo ""
  echo "To bypass (NOT RECOMMENDED):"
  echo "  git commit --no-verify"
  echo ""
  echo "To view staged diff:"
  echo "  git diff --cached"
  echo ""
  exit 1
fi

log_success "✓ Pre-commit hook passed"
exit 0
EOF
  
  chmod +x "$HOOK_PATH"
  log_success "Pre-commit hook installed at $HOOK_PATH ✓"
else
  echo "[DRY RUN] Would install pre-commit hook"
fi

echo ""

# 3. Create pre-push hook for final verification
log_step "Installing pre-push hook for branch protection..."

PUSH_HOOK_PATH="$ROOT/.git/hooks/pre-push"

if [[ -z "$DRY_RUN" ]]; then
  mkdir -p "$(dirname "$PUSH_HOOK_PATH")"
  
  cat > "$PUSH_HOOK_PATH" << 'EOF'
#!/bin/bash
# Pre-push hook: Final check before pushing to remote

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Running pre-push verification..."

# Check if pushing to main/master
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
if [[ "$CURRENT_BRANCH" =~ ^(main|master)$ ]]; then
  echo -e "${YELLOW}⚠ WARNING: You are about to push to $CURRENT_BRANCH${NC}"
  echo "  Ensure all tests pass and no secrets are in the commit"
  echo ""
fi

exit 0
EOF
  
  chmod +x "$PUSH_HOOK_PATH"
  log_success "Pre-push hook installed at $PUSH_HOOK_PATH ✓"
else
  echo "[DRY RUN] Would install pre-push hook"
fi

echo ""

# 4. Create .env.example if it doesn't exist
log_step "Creating .env.example template..."

ENV_EXAMPLE="$ROOT/.env.example"

if [[ ! -f "$ENV_EXAMPLE" ]]; then
  if [[ -z "$DRY_RUN" ]]; then
    cat > "$ENV_EXAMPLE" << 'EOF'
# Development Environment Variables
# Copy this file to .env.local and fill in your local values
# IMPORTANT: .env.local is NOT tracked by git

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_REFERER=https://n8n.pbradygeorgen.com

# Supabase Configuration (local development)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PROJECT_ID=local
SUPABASE_PUBLIC_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Next.js Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# AWS Configuration
AWS_REGION=us-east-2
AWS_PROFILE=openrouter-deployer

# N8N Configuration
N8N_URL=https://n8n.pbradygeorgen.com
N8N_API_KEY=your-n8n-api-key-here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
NODE_ENV=development
EOF
    log_success ".env.example created ✓"
  else
    echo "[DRY RUN] Would create .env.example"
  fi
else
  log_warning ".env.example already exists"
fi

echo ""

# 5. Setup file permissions for sensitive scripts
log_step "Securing script file permissions..."

if [[ -z "$DRY_RUN" ]]; then
  chmod 700 "$ROOT"/scripts/*.sh 2>/dev/null || true
  chmod 700 "$ROOT"/scripts/remediation/*.sh 2>/dev/null || true
  log_success "Script files set to 700 (owner execute only) ✓"
else
  echo "[DRY RUN] Would set script permissions to 700"
fi

echo ""

# 6. Create a security checklist
log_step "Creating security checklist..."

CHECKLIST_PATH="$ROOT/SECURITY_CHECKLIST.md"

if [[ -z "$DRY_RUN" ]]; then
  cat > "$CHECKLIST_PATH" << 'EOF'
# Security Checklist

## Local Development

- [ ] `.gitignore` is in place and blocks `.env` files
- [ ] `.env.local` created from `.env.example` (NOT tracked by git)
- [ ] Credentials in `~/.zshrc` with mode 600
- [ ] No credentials hardcoded in source code
- [ ] Pre-commit hook installed (`./scripts/remediation/r3-security-hardening.sh`)
- [ ] Run secret audit before committing: `./scripts/remediation/r2-audit-secrets.sh`

## Before First Commit

- [ ] All API keys rotated and moved to secure storage
- [ ] `.env` files removed from git history
- [ ] Pre-push hook working

## Ongoing Maintenance

- [ ] Weekly credential rotation (API keys)
- [ ] Monthly rotation (service role keys)
- [ ] Monthly security audit: `./remediate-all.sh --phase-only 2`
- [ ] Review git log for accidental commits: `git log --all -p -- ':(exclude).gitignore'`

## Production Deployment

- [ ] Credentials in AWS SSM Parameter Store (not in code)
- [ ] AWS IAM roles configured for EC2 instances
- [ ] VPC security groups restrict access
- [ ] API keys rotated in production
- [ ] CloudTrail enabled for audit logs
- [ ] Secrets Manager configured for credential rotation

## MCP Server & Crew System

- [ ] MCP tool calls are logged and audited
- [ ] Crew agent actions are reversible (no destructive operations)
- [ ] n8n webhooks authenticated (no open endpoints)
- [ ] Supabase RLS policies enforced for crew memories
- [ ] Service role key never exposed to client-side code

## Verification Commands

```bash
# Check .gitignore is working
git check-ignore .env
git check-ignore .env.local

# Scan for remaining credentials
grep -r "sk-or-v1\|sk-ant-\|password=" . --exclude-dir=node_modules --exclude-dir=.git

# Verify file permissions
stat ~/.zshrc
stat .git/hooks/pre-commit

# Check git history (shallow)
git log --all --oneline -S "password=" | head -5
```

## References

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [AWS: Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
EOF
  log_success "Security checklist created at $CHECKLIST_PATH ✓"
else
  echo "[DRY RUN] Would create SECURITY_CHECKLIST.md"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo ""

log_success "Phase 3: Security hardening complete"
echo ""
echo "NEXT STEPS:"
echo "  1. Create .env.local from .env.example"
echo "  2. Review ~/.zshrc permissions: stat ~/.zshrc"
echo "  3. Test pre-commit hook: git add .env && git commit"
echo "  4. Review SECURITY_CHECKLIST.md"
echo ""
