#!/bin/bash

###############################################################################
# r1-gitignore.sh — Remediation Phase 1
# Purpose: Create comprehensive .gitignore to prevent credential leaks
# Assigned crew: Data (file management), Worf (security validation)
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DRY_RUN="${1:-}"

# Colors
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
echo "=== PHASE 1: .GITIGNORE SETUP ==="
echo ""

GITIGNORE_PATH="$ROOT/.gitignore"

if [[ -f "$GITIGNORE_PATH" ]]; then
  log_warning ".gitignore already exists at $GITIGNORE_PATH"
  echo "Backing up to .gitignore.bak"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$GITIGNORE_PATH" "$GITIGNORE_PATH.bak"
  fi
fi

log_step "Creating comprehensive .gitignore"

GITIGNORE_CONTENT='# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Build outputs
dist/
build/
.next/
out/
.turbo/

# Environment & Secrets
.env
.env.local
.env.*.local
.env.production.local
.zshrc.local
.bash_profile.local
~/.aws/
~/.kube/

# IDE & Editor
.vscode/
.vscode/launch.json
.vscode/settings.json
.idea/
*.swp
*.swo
*~
.DS_Store
*.sublime-workspace
.eslintcache

# OS & Temporary
.DS_Store
Thumbs.db
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Test Coverage
coverage/
.nyc_output/
*.lcov

# Crew Memory & Observations (sensitive)
crew-memories/active/*.json
crew-memories/observations/*.json
*.observation.json

# Local development artifacts
.env.development.local
tsconfig.tsbuildinfo
.eslintcache
.stylelintcache

# Docker
docker-compose.override.yml
.dockerignore

# Terraform & Infrastructure
terraform/.tfvars
terraform/.terraform/
terraform/**.tfstate*
*.tfplan

# MCP Server & Tools
.mcp-cache/
mcp-server.log
.mcp-debug

# n8n Workflows (if local)
n8n-data/
n8n.db
n8n.env

# Supabase (local)
.supabase/
supabase-local/

# AWS Credentials (never commit)
~/.aws/credentials
~/.aws/config

# Git-related
.git/
.gitmodules

# VSCode Extension packaging
*.vsix
out/

# Phase scripts artifacts
*.phase-lock
.phase-*/

# Project-specific
.analysis-cache/
PROJECT_ANALYSIS.md
analyze-*.sh
'

if [[ -z "$DRY_RUN" ]]; then
  cat > "$GITIGNORE_PATH" << 'EOF'
# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Build outputs
dist/
build/
.next/
out/
.turbo/

# Environment & Secrets
.env
.env.local
.env.*.local
.env.production.local
.zshrc.local
.bash_profile.local
~/.aws/
~/.kube/

# IDE & Editor
.vscode/
.vscode/launch.json
.vscode/settings.json
.idea/
*.swp
*.swo
*~
.DS_Store
*.sublime-workspace
.eslintcache

# OS & Temporary
.DS_Store
Thumbs.db
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Test Coverage
coverage/
.nyc_output/
*.lcov

# Crew Memory & Observations (sensitive)
crew-memories/active/*.json
crew-memories/observations/*.json
*.observation.json

# Local development artifacts
.env.development.local
tsconfig.tsbuildinfo
.eslintcache
.stylelintcache

# Docker
docker-compose.override.yml
.dockerignore

# Terraform & Infrastructure
terraform/.tfvars
terraform/.terraform/
terraform/**.tfstate*
*.tfplan

# MCP Server & Tools
.mcp-cache/
mcp-server.log
.mcp-debug

# n8n Workflows (if local)
n8n-data/
n8n.db
n8n.env

# Supabase (local)
.supabase/
supabase-local/

# AWS Credentials (never commit)
~/.aws/credentials
~/.aws/config

# Git-related
.git/
.gitmodules

# VSCode Extension packaging
*.vsix
out/

# Phase scripts artifacts
*.phase-lock
.phase-*/

# Project-specific
.analysis-cache/
PROJECT_ANALYSIS.md
analyze-*.sh
EOF
  log_success ".gitignore created at $GITIGNORE_PATH"
else
  echo "[DRY RUN] Would create .gitignore with $(echo "$GITIGNORE_CONTENT" | wc -l) lines"
fi

echo ""

# Check if .env files are currently tracked
log_step "Checking for accidentally tracked .env files..."

if git -C "$ROOT" ls-files 2>/dev/null | grep -E "\.env" > /dev/null 2>&1; then
  log_warning "Found tracked .env files in git"
  
  if [[ -z "$DRY_RUN" ]]; then
    echo ""
    echo "To remove them from git history (keeping local copy):"
    git -C "$ROOT" ls-files | grep -E "\.env" | while read file; do
      echo "  git rm --cached '$file'"
      git -C "$ROOT" rm --cached "$file"
    done
    
    echo ""
    echo "Commit the removal:"
    echo "  git commit -m 'Remove .env files from tracking'"
  else
    git -C "$ROOT" ls-files | grep -E "\.env" | while read file; do
      echo "[DRY RUN] Would remove from git: $file"
    done
  fi
else
  log_success "No .env files tracked in git ✓"
fi

echo ""

# Verify git is ignoring .env now
log_step "Verifying .gitignore is working..."

if git -C "$ROOT" check-ignore .env > /dev/null 2>&1; then
  log_success ".gitignore correctly ignores .env files ✓"
else
  log_warning ".env files may not be ignored by git"
  echo "Run: git check-ignore .env (to verify)"
fi

echo ""
echo "Phase 1 complete."
