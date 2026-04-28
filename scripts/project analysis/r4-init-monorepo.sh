#!/bin/bash

###############################################################################
# r4-init-monorepo.sh — Remediation Phase 4
# Purpose: Initialize pnpm workspaces and Turbo for monorepo management
# Assigned crew: La Forge (systems engineering), Data (architecture)
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
echo "=== PHASE 4: MONOREPO INITIALIZATION ==="
echo ""

# 1. Create pnpm-workspace.yaml
log_step "Creating pnpm-workspace.yaml..."

WORKSPACE_PATH="$ROOT/pnpm-workspace.yaml"

if [[ -f "$WORKSPACE_PATH" ]]; then
  log_warning "pnpm-workspace.yaml already exists"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$WORKSPACE_PATH" "$WORKSPACE_PATH.bak"
    echo "  Backed up to $WORKSPACE_PATH.bak"
  fi
fi

if [[ -z "$DRY_RUN" ]]; then
  cat > "$WORKSPACE_PATH" << 'EOF'
packages:
  - 'apps/**'
  - 'packages/**'

shared-workspace-lockfile: true
EOF
  log_success "pnpm-workspace.yaml created ✓"
else
  echo "[DRY RUN] Would create pnpm-workspace.yaml"
fi

echo ""

# 2. Create root package.json
log_step "Creating root package.json..."

PKG_JSON_PATH="$ROOT/package.json"

if [[ -f "$PKG_JSON_PATH" ]]; then
  log_warning "package.json already exists at root"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$PKG_JSON_PATH" "$PKG_JSON_PATH.bak"
    echo "  Backed up to $PKG_JSON_PATH.bak"
  fi
fi

if [[ -z "$DRY_RUN" ]]; then
  cat > "$PKG_JSON_PATH" << 'EOF'
{
  "name": "ai-enterprise-os-root",
  "version": "0.1.0",
  "description": "Sovereign Factory: MCP-native platform with Star Trek-named crew agents",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev --parallel",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "turbo format",
    "clean": "turbo clean && rm -rf node_modules pnpm-lock.yaml",
    "install:fresh": "pnpm clean && pnpm install",
    "audit": "pnpm audit --recursive",
    "mcp:start": "node mcp-server.js",
    "phase0": "./p0-run-all.sh",
    "phase1": "./p1-run-all.sh",
    "phase2": "./p2-run-all.sh",
    "phase3": "./p3-run-all.sh",
    "phase4": "./p4-run-all.sh",
    "remediate": "./scripts/remediate-all.sh",
    "remediate:dry-run": "./scripts/remediate-all.sh --dry-run"
  },
  "devDependencies": {
    "turbo": "^1.13.4"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.1",
    "@supabase/supabase-js": "^2.103.0",
    "dotenv": "^16.6.1",
    "express": "^4.22.1",
    "ioredis": "^5.10.1"
  },
  "pnpm": {
    "overrides": {}
  }
}
EOF
  log_success "Root package.json created ✓"
else
  echo "[DRY RUN] Would create root package.json"
fi

echo ""

# 3. Create turbo.json
log_step "Creating turbo.json configuration..."

TURBO_JSON_PATH="$ROOT/turbo.json"

if [[ -f "$TURBO_JSON_PATH" ]]; then
  log_warning "turbo.json already exists"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$TURBO_JSON_PATH" "$TURBO_JSON_PATH.bak"
  fi
fi

if [[ -z "$DRY_RUN" ]]; then
  cat > "$TURBO_JSON_PATH" << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDotEnv": [".env.local"],
  "globalEnv": [
    "NODE_ENV",
    "LOG_LEVEL"
  ],
  "tasks": {
    "build": {
      "outputs": ["dist/**", "out/**", ".next/**", "build/**"],
      "cache": true,
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [".eslintcache"],
      "cache": true
    },
    "format": {
      "cache": false
    }
  }
}
EOF
  log_success "turbo.json created ✓"
else
  echo "[DRY RUN] Would create turbo.json"
fi

echo ""

# 4. Create .npmrc for pnpm
log_step "Creating .npmrc for pnpm configuration..."

NPMRC_PATH="$ROOT/.npmrc"

if [[ -f "$NPMRC_PATH" ]]; then
  log_warning ".npmrc already exists"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$NPMRC_PATH" "$NPMRC_PATH.bak"
  fi
fi

if [[ -z "$DRY_RUN" ]]; then
  cat > "$NPMRC_PATH" << 'EOF'
# pnpm configuration
shamefully-hoist=true
strict-peer-dependencies=false
resolution-mode=highest
prefer-workspace-packages=true

# npm registry
registry=https://registry.npmjs.org/

# Safety
prefer-frozen-lockfile=true
EOF
  log_success ".npmrc created ✓"
else
  echo "[DRY RUN] Would create .npmrc"
fi

echo ""

# 5. Create workspace directories if needed
log_step "Creating workspace directories (if missing)..."

if [[ -z "$DRY_RUN" ]]; then
  mkdir -p "$ROOT/apps"
  mkdir -p "$ROOT/packages"
  mkdir -p "$ROOT/lib"
  
  # Create .gitkeep files so directories are tracked
  touch "$ROOT/apps/.gitkeep"
  touch "$ROOT/packages/.gitkeep"
  touch "$ROOT/lib/.gitkeep"
  
  log_success "Workspace directories created ✓"
else
  echo "[DRY RUN] Would create workspace directories"
fi

echo ""

# 6. Verify monorepo setup
log_step "Verifying monorepo configuration..."

ERRORS=0

# Check for required files
for file in "$WORKSPACE_PATH" "$PKG_JSON_PATH" "$TURBO_JSON_PATH" "$NPMRC_PATH"; do
  if [[ -f "$file" ]]; then
    log_success "$(basename $file) exists ✓"
  else
    echo "✗ $(basename $file) missing"
    ((ERRORS++))
  fi
done

echo ""

if [[ $ERRORS -eq 0 ]]; then
  log_success "Monorepo configuration complete ✓"
else
  log_warning "Some configuration files are missing"
fi

echo ""

# 7. Next steps
echo "═══════════════════════════════════════════════"
echo ""
log_success "Phase 4: Monorepo initialization complete"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Verify pnpm is installed:"
echo "   pnpm --version"
echo ""
echo "2. Install dependencies:"
echo "   pnpm install"
echo ""
echo "3. Verify workspace structure:"
echo "   pnpm list --depth=-1"
echo ""
echo "4. Build the monorepo:"
echo "   pnpm build"
echo ""
echo "5. Start development server:"
echo "   pnpm dev"
echo ""
echo "WORKSPACE STRUCTURE:"
echo "  apps/              - Web applications (Next.js dashboard, VSCode extension)"
echo "  packages/          - Shared packages (mcp-bridge, crew-personas, etc.)"
echo "  lib/               - Low-level libraries"
echo ""
echo "USEFUL COMMANDS:"
echo "  pnpm build         - Build all packages"
echo "  pnpm dev           - Start dev servers"
echo "  pnpm test          - Run all tests"
echo "  pnpm lint          - Lint all packages"
echo "  pnpm format        - Format code"
echo "  turbo run build    - Run build task (respects dependencies)"
echo ""
