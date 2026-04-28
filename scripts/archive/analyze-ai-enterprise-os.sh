#!/bin/bash

###############################################################################
# COMPREHENSIVE AI-ENTERPRISE-OS PROJECT ANALYZER
# Purpose: Deep analysis of MCP crew platform architecture, dependencies,
#          and health status for architectural review
# Usage: ./analyze-ai-enterprise-os.sh > PROJECT_ANALYSIS.md 2>&1
###############################################################################

set -e

# Linkage Fix: Navigate to project root relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Color output (safe for markdown, will be stripped if piping to file)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "# PROJECT ANALYSIS: ai-enterprise-os"
echo "Generated: $timestamp"
echo ""

###############################################################################
# 1. PROJECT STRUCTURE & TOPOLOGY
###############################################################################
echo "## 1. PROJECT STRUCTURE & TOPOLOGY"
echo ""
echo "### Repo Root Contents"
echo "\`\`\`"
ls -la | grep -E "^d|^-" | awk '{print $9, "(" $5 " bytes)"}'
echo "\`\`\`"
echo ""

echo "### Monorepo Package Structure"
echo "\`\`\`"
if [ -f "pnpm-workspace.yaml" ]; then
    echo "=== WORKSPACE CONFIGURATION ==="
    cat pnpm-workspace.yaml
else
    echo "⚠️  pnpm-workspace.yaml not found"
fi
echo "\`\`\`"
echo ""

echo "### Directory Tree (apps/ and packages/)"
echo "\`\`\`"
if command -v tree &> /dev/null; then
    tree -L 2 -I 'node_modules|dist|build' apps packages 2>/dev/null || find apps packages -maxdepth 2 -type d | sort
else
    find apps packages -maxdepth 2 -type d 2>/dev/null | head -50 | sort
fi
echo "\`\`\`"
echo ""

###############################################################################
# 2. CREW SYSTEM ANALYSIS
###############################################################################
echo "## 2. CREW SYSTEM ARCHITECTURE"
echo ""

echo "### Crew Agent Manifest"
echo "\`\`\`typescript"
# Look for crew manifest definitions
if [ -d "packages" ]; then
    find packages -name "*manifest*" -o -name "*crew*" -type f | grep -E "\.(ts|js|json)$" | head -5 | while read file; do
        echo "=== $file ==="
        head -100 "$file"
    done
else
    echo "No packages directory found"
fi
echo "\`\`\`"
echo ""

echo "### CrewAI Agent Definitions (Picard → Uhura)"
echo "\`\`\`"
# Search for agent definitions
if [ -d "packages" ]; then
    grep -r "Picard\|Riker\|Data\|Worf\|Crusher\|La Forge\|Tasha\|Wesley\|Guinan\|Uhura" packages --include="*.ts" --include="*.js" -l 2>/dev/null | head -10
    echo ""
    echo "=== Agent Configuration ==="
    grep -r "agent.*model\|model.*tier\|router.*complexity" packages --include="*.ts" -A 2 2>/dev/null | head -50
else
    echo "No packages directory found"
fi
echo "\`\`\`"
echo ""

echo "### Model Tier Routing Strategy"
echo "\`\`\`typescript"
# Look for routing logic
find packages -name "*.ts" -type f 2>/dev/null | xargs grep -l "Haiku\|Sonnet\|Opus\|complexity.*0\.[0-7]" 2>/dev/null | head -3 | while read file; do
    echo "=== From: $file ==="
    grep -A 10 -B 2 "complexity\|Haiku\|routing" "$file" | head -30
done
echo "\`\`\`"
echo ""

###############################################################################
# 3. MCP SERVER INTEGRATION
###############################################################################
echo "## 3. MCP SERVER CONFIGURATION & INTEGRATION"
echo ""

echo "### MCP Server Definitions"
echo "\`\`\`json"
find . -name "*mcp*" -type f ! -path "*/node_modules/*" 2>/dev/null | head -10 | while read file; do
    echo "=== $file ==="
    if [[ "$file" == *.json ]]; then
        cat "$file" 2>/dev/null | head -50
    else
        cat "$file" 2>/dev/null | head -50
    fi
done
echo "\`\`\`"
echo ""

echo "### MCP Server Registration & Tool Mapping"
echo "\`\`\`typescript"
# Look for MCP server registration
grep -r "mcp.*server\|register.*mcp\|MCP_SERVER" packages --include="*.ts" -B 2 -A 5 2>/dev/null | head -100
echo "\`\`\`"
echo ""

echo "### Available MCP Tools & Capabilities"
echo "\`\`\`"
# Search for tool definitions
find packages -name "*tool*" -type f ! -path "*/node_modules/*" 2>/dev/null | head -10 | while read file; do
    echo "=== $file ==="
    grep -E "export.*tool|tool.*export|@tool|Tool" "$file" 2>/dev/null | head -10
done
echo "\`\`\`"
echo ""

###############################################################################
# 4. MEMORY SYSTEM (CLAUDE.md & Supabase Sync)
###############################################################################
echo "## 4. MEMORY SYSTEM & CONTEXT PERSISTENCE"
echo ""

echo "### CLAUDE.md Project Memory"
echo "\`\`\`"
if [ -f "CLAUDE.md" ]; then
    wc -l CLAUDE.md
    echo ""
    echo "=== MEMORY LAYERS ==="
    grep -E "\[MEMORY:|Layer:" CLAUDE.md | head -20
    echo ""
    echo "=== FIRST 100 LINES ==="
    head -100 CLAUDE.md
    echo ""
    echo "... (see full CLAUDE.md for complete context)"
else
    echo "⚠️  CLAUDE.md not found"
fi
echo "\`\`\`"
echo ""

echo "### Memory Sync System (Supabase Integration)"
echo "\`\`\`typescript"
find packages -name "*memory*" -o -name "*sync*" | grep -E "\.(ts|js)$" | head -5 | while read file; do
    echo "=== $file ==="
    head -80 "$file"
done
echo "\`\`\`"
echo ""

###############################################################################
# 5. DEPENDENCY & BUILD HEALTH
###############################################################################
echo "## 5. MONOREPO HEALTH & DEPENDENCIES"
echo ""

echo "### Root package.json"
echo "\`\`\`json"
if [ -f "package.json" ]; then
    cat package.json | head -50
else
    echo "⚠️  package.json not found"
fi
echo "\`\`\`"
echo ""

echo "### pnpm Dependencies Status"
echo "\`\`\`"
if command -v pnpm &> /dev/null; then
    echo "pnpm version: $(pnpm --version)"
    echo ""
    echo "=== Workspace packages ==="
    pnpm list --depth=0 2>/dev/null || echo "Could not list packages"
    echo ""
    echo "=== Checking for missing dependencies ==="
    pnpm install --dry-run 2>&1 | grep -E "^added|^removed|^error" | head -20
else
    echo "⚠️  pnpm not installed or not in PATH"
fi
echo "\`\`\`"
echo ""

echo "### Package Count by Type"
echo "\`\`\`"
if [ -d "packages" ]; then
    echo "Total packages: $(find packages -maxdepth 1 -type d | wc -l)"
    echo ""
    echo "=== By Category ==="
    find packages -maxdepth 1 -type d ! -name "packages" | sed 's|packages/||' | sort
fi
if [ -d "apps" ]; then
    echo ""
    echo "Total apps: $(find apps -maxdepth 1 -type d | wc -l)"
    echo ""
    echo "=== Apps ==="
    find apps -maxdepth 1 -type d ! -name "apps" | sed 's|apps/||' | sort
fi
echo "\`\`\`"
echo ""

echo "### TypeScript Build Status"
echo "\`\`\`"
if [ -f "tsconfig.json" ]; then
    echo "=== TypeScript Config (tsconfig.json) ==="
    cat tsconfig.json | jq '.compilerOptions | keys' 2>/dev/null || cat tsconfig.json | head -40
fi
echo ""
echo "=== Build Errors (if any) ==="
if command -v pnpm &> /dev/null; then
    pnpm build 2>&1 | tail -50 || echo "Build had issues (see above)"
else
    echo "Cannot check build status (pnpm not available)"
fi
echo "\`\`\`"
echo ""

###############################################################################
# 6. DEPLOYMENT ARCHITECTURE
###############################################################################
echo "## 6. DEPLOYMENT ARCHITECTURE"
echo ""

echo "### Vercel Frontend Configuration"
echo "\`\`\`json"
if [ -f "vercel.json" ]; then
    cat vercel.json
elif [ -f "apps/dashboard/vercel.json" ]; then
    cat apps/dashboard/vercel.json
else
    echo "⚠️  vercel.json not found"
fi
echo "\`\`\`"
echo ""

echo "### Docker & Infrastructure (AWS EC2)"
echo "\`\`\`"
find . -name "Dockerfile*" -o -name "docker-compose*" -o -name "*.tf" -o -name "terraform*" ! -path "*/node_modules/*" | head -10 | while read file; do
    echo "=== $file ==="
    cat "$file" | head -50
done
echo "\`\`\`"
echo ""

echo "### Environment Configuration"
echo "\`\`\`bash"
echo "=== .env.example (if exists) ==="
if [ -f ".env.example" ]; then
    cat .env.example
else
    echo "⚠️  .env.example not found"
fi
echo ""
echo "=== Environment Variable Requirements ==="
if [ -f "packages/crew-captain/src/index.ts" ]; then
    grep -E "process\.env\.|process\.env" packages/crew-captain/src/index.ts 2>/dev/null | head -20
fi
echo "\`\`\`"
echo ""

###############################################################################
# 7. CREDENTIAL & SECURITY MANAGEMENT
###############################################################################
echo "## 7. CREDENTIAL & SECURITY MANAGEMENT"
echo ""

echo "### Local Credential Sources (~/.zshrc)"
echo "\`\`\`bash"
if [ -f ~/.zshrc ]; then
    echo "=== Exported variables in ~/.zshrc ==="
    grep -E "export.*OPENROUTER|export.*ANTHROPIC|export.*AWS|export.*SUPABASE" ~/.zshrc 2>/dev/null || echo "No credential exports found"
else
    echo "⚠️  ~/.zshrc not found (check your setup)"
fi
echo "\`\`\`"
echo ""

echo "### AWS SSM Parameter Store References"
echo "\`\`\`typescript"
grep -r "ssm\|SSM\|Parameter\|getParameter" packages --include="*.ts" 2>/dev/null | head -20
echo "\`\`\`"
echo ""

echo "### Security Checklist"
echo "\`\`\`"
echo "=== Checking for hardcoded secrets ==="
grep -r "apiKey\|api_key\|secret\|password" packages --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules\|test\|spec\|example" | wc -l
echo "matches found (inspect these!)"
echo ""
echo "=== Checking for .gitignore ==="
if [ -f ".gitignore" ]; then
    echo "✓ .gitignore exists"
    grep -E "\.env|secrets|credentials|\.key" .gitignore
else
    echo "⚠️  .gitignore not found"
fi
echo "\`\`\`"
echo ""

###############################################################################
# 8. ARCHITECTURAL DOCUMENTS & GOVERNANCE
###############################################################################
echo "## 8. ARCHITECTURAL GOVERNANCE & DOCUMENTATION"
echo ""

echo "### Platform Constitution"
echo "\`\`\`"
if [ -f "PLATFORM_CONSTITUTION.md" ]; then
    echo "✓ PLATFORM_CONSTITUTION.md found"
    wc -l PLATFORM_CONSTITUTION.md
    head -50 PLATFORM_CONSTITUTION.md
elif [ -f ".ai-project-constitution.md" ]; then
    echo "✓ .ai-project-constitution.md found"
    wc -l .ai-project-constitution.md
    head -50 .ai-project-constitution.md
else
    echo "⚠️  No constitution file found"
fi
echo "\`\`\`"
echo ""

echo "### Comparative Analysis (Merger Strategy)"
echo "\`\`\`"
if [ -f "COMPARATIVE_ANALYSIS.md" ]; then
    wc -l COMPARATIVE_ANALYSIS.md
    head -50 COMPARATIVE_ANALYSIS.md
else
    echo "⚠️  COMPARATIVE_ANALYSIS.md not found"
fi
echo "\`\`\`"
echo ""

echo "### Migration Scripts Status (Phases 0-7)"
echo "\`\`\`bash"
if [ -d "scripts" ]; then
    echo "=== Available migration scripts ==="
    ls -lah scripts/ | grep -E "phase|\.sh"
    echo ""
    echo "=== Script status ==="
    for script in scripts/phase*.sh; do
        if [ -f "$script" ]; then
            echo "$(basename $script): $(head -3 $script | grep -E "^#|Purpose")"
        fi
    done
else
    echo "⚠️  scripts/ directory not found"
fi
echo "\`\`\`"
echo ""

###############################################################################
# 9. RECENT CHANGES & GIT STATUS
###############################################################################
echo "## 9. GIT REPOSITORY STATUS"
echo ""

echo "### Branch & Commit History"
echo "\`\`\`"
if command -v git &> /dev/null; then
    echo "=== Current branch ==="
    git branch -v 2>/dev/null || echo "Not a git repo"
    echo ""
    echo "=== Recent commits (last 10) ==="
    git log --oneline -10 2>/dev/null || echo "Git history unavailable"
    echo ""
    echo "=== Uncommitted changes ==="
    git status --short 2>/dev/null | head -20 || echo "Git status unavailable"
else
    echo "⚠️  git not installed or not in PATH"
fi
echo "\`\`\`"
echo ""

echo "### File Statistics"
echo "\`\`\`"
if [ -d "packages" ]; then
    echo "=== TypeScript files ==="
    find packages -name "*.ts" -o -name "*.tsx" | wc -l
    echo ""
    echo "=== Configuration files ==="
    find . -maxdepth 2 -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) ! -path "*/node_modules/*" | wc -l
fi
echo "\`\`\`"
echo ""

###############################################################################
# 10. IDENTIFIED ISSUES & WARNINGS
###############################################################################
echo "## 10. ISSUES & WARNINGS"
echo ""

echo "### Critical Checks"
echo "\`\`\`"
echo "Status checks:"
echo ""

# Check for node_modules size
if [ -d "node_modules" ]; then
    size=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "⚠️  node_modules size: $size"
fi

# Check package.json in root
if [ ! -f "package.json" ]; then
    echo "❌ CRITICAL: No root package.json"
else
    echo "✓ Root package.json exists"
fi

# Check pnpm-workspace
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ CRITICAL: No pnpm-workspace.yaml"
else
    echo "✓ pnpm-workspace.yaml configured"
fi

# Check main apps/packages
if [ ! -d "apps" ]; then
    echo "⚠️  apps/ directory not found"
fi
if [ ! -d "packages" ]; then
    echo "⚠️  packages/ directory not found"
fi

# Check for circular dependencies
echo ""
echo "=== Checking for circular dependencies ==="
if command -v pnpm &> /dev/null; then
    pnpm ls 2>&1 | grep -i "circular\|cycle" || echo "No obvious circular dependencies detected"
fi

echo "\`\`\`"
echo ""

###############################################################################
# 11. RECOMMENDATIONS & NEXT STEPS
###############################################################################
echo "## 11. PRELIMINARY OBSERVATIONS"
echo ""
echo "Please review the following sections in detail:"
echo ""
echo "1. **CREW SYSTEM** - Verify agent definitions match Star Trek manifest"
echo "2. **MCP SERVERS** - Confirm all MCP servers are properly registered"
echo "3. **MEMORY SYSTEM** - Test CLAUDE.md ↔ Supabase sync"
echo "4. **BUILD HEALTH** - Address any TypeScript compilation errors"
echo "5. **DEPENDENCIES** - Check for orphaned or unused packages"
echo "6. **SECURITY** - Audit credential management strategy"
echo "7. **DEPLOYMENT** - Validate Vercel + AWS EC2 architecture"
echo ""

###############################################################################
# FOOTER
###############################################################################
echo "---"
echo ""
echo "**Analysis Complete**"
echo ""
echo "To use this output:"
echo "1. Save to a file: \`./analyze-ai-enterprise-os.sh > analysis_report.md\`"
echo "2. Review each section for configuration details"
echo "3. Address any ⚠️  or ❌ markers"
echo "4. Share with Claude for deep architectural review"
echo ""
echo "For questions about MCP crew configuration, memory system, or deployment topology,"
echo "paste this entire report into Claude and request comprehensive analysis."
echo ""