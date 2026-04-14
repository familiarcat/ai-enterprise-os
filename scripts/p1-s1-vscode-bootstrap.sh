#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s1-vscode-bootstrap.sh — Phase 1, Step 1: VSCode extension scaffold
#
# Bootstraps apps/vscode/ as a real publishable VSCode extension with the
# correct package.json structure, activation events, and contribution points.
# Assigned crew: Commander Data (DDD Architect, enforces structural constraints).
# MCP tool on failure: run_factory_mission
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p1-s1-vscode-bootstrap"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 1: Extension Scaffold"

EXT_DIR="$ROOT/apps/vscode"
REQUIRED_FIELDS=("publisher" "name" "version" "engines" "main" "contributes" "activationEvents")

mkdir -p "$EXT_DIR/src/commands" "$EXT_DIR/src/services" "$EXT_DIR/src/views"

# ── Check if package.json already exists and is a valid extension ─────────────
PKG="$EXT_DIR/package.json"
NEEDS_BOOTSTRAP=false

if [[ ! -f "$PKG" ]]; then
  NEEDS_BOOTSTRAP=true
  echo "  package.json missing — will create"
else
  echo "  package.json exists — validating..."
  for field in "${REQUIRED_FIELDS[@]}"; do
    HAS=$(node -e "const p=require('$PKG');console.log(p.$field?'yes':'no')" 2>/dev/null || echo "no")
    if [[ "$HAS" == "no" ]]; then
      echo "  ⚠  Missing field: $field"
      NEEDS_BOOTSTRAP=true
    else
      echo "  ✔  $field present"
    fi
  done
fi

if [[ "$NEEDS_BOOTSTRAP" == true ]]; then
  echo ""
  echo "  Writing extension package.json..."
  cat > "$PKG" <<'EXTPKG'
{
  "name": "sovereign-factory",
  "displayName": "Sovereign Factory",
  "description": "AI Enterprise OS — create, develop, deploy, and orchestrate DDD business units via MCP agents and Star Trek crew personas",
  "version": "0.1.0",
  "publisher": "familiarcat",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["AI", "Other"],
  "keywords": ["ai", "mcp", "crewai", "openrouter", "ddd", "agents"],
  "icon": "media/icon.png",
  "main": "./dist/extension.js",
  "activationEvents": [
    "onStartupFinished"
  ],
  "contributes": {
    "commands": [
      { "command": "sovereign.runMission",       "title": "Sovereign: Run Factory Mission" },
      { "command": "sovereign.assignCrew",       "title": "Sovereign: Assign to Crew Member" },
      { "command": "sovereign.searchCode",       "title": "Sovereign: Search Codebase" },
      { "command": "sovereign.scaffoldDomain",   "title": "Sovereign: Scaffold DDD Domain" },
      { "command": "sovereign.healthCheck",      "title": "Sovereign: Health Check" },
      { "command": "sovereign.gitOperation",     "title": "Sovereign: Git Commit & Push" },
      { "command": "sovereign.openDashboard",    "title": "Sovereign: Open Mission Dashboard" }
    ],
    "viewsContainers": {
      "activitybar": [
        { "id": "sovereign-factory", "title": "Sovereign Factory", "icon": "media/sidebar-icon.svg" }
      ]
    },
    "views": {
      "sovereign-factory": [
        { "type": "webview", "id": "sovereign.agentViewport", "name": "Agent Viewport" },
        { "id": "sovereign.crewPanel",           "name": "Crew" },
        { "id": "sovereign.missionsPanel",        "name": "Missions" }
      ]
    },
    "configuration": {
      "title": "Sovereign Factory",
      "properties": {
        "sovereign.mcpUrl": {
          "type": "string",
          "default": "http://localhost:3002",
          "description": "MCP HTTP bridge URL (mcp-http-bridge.mjs)"
        },
        "sovereign.defaultPersona": {
          "type": "string",
          "default": "commander_riker",
          "enum": ["captain_picard","commander_data","commander_riker","geordi_la_forge","chief_obrien","lt_worf","counselor_troi","dr_crusher","lt_uhura","quark"],
          "description": "Default Star Trek crew persona for new missions"
        },
        "sovereign.autoConnect": {
          "type": "boolean",
          "default": true,
          "description": "Auto-connect to MCP bridge on extension activation"
        }
      }
    },
    "menus": {
      "editor/context": [
        { "command": "sovereign.runMission",     "group": "sovereign@1", "when": "editorHasSelection" },
        { "command": "sovereign.searchCode",     "group": "sovereign@2" }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "pnpm run build",
    "build": "esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --minify",
    "dev":   "esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --watch",
    "lint":  "eslint src --ext ts",
    "test":  "node ./out/test/runTest.js",
    "package": "vsce package --no-dependencies"
  },
  "dependencies": {
    "eventsource": "^2.0.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^2.22.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.3.0"
  }
}
EXTPKG
  echo "  ✔  package.json written"
fi

# ── tsconfig.json ─────────────────────────────────────────────────────────────
if [[ ! -f "$EXT_DIR/tsconfig.json" ]]; then
  cat > "$EXT_DIR/tsconfig.json" <<'TSCONFIG'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
TSCONFIG
  echo "  ✔  tsconfig.json written"
fi

# ── .vscodeignore ─────────────────────────────────────────────────────────────
if [[ ! -f "$EXT_DIR/.vscodeignore" ]]; then
  cat > "$EXT_DIR/.vscodeignore" <<'IGNORE'
.vscode/**
src/**
out/test/**
node_modules/**
.gitignore
tsconfig.json
IGNORE
  echo "  ✔  .vscodeignore written"
fi

# ── media dir placeholder ─────────────────────────────────────────────────────
mkdir -p "$EXT_DIR/media"
[[ ! -f "$EXT_DIR/media/sidebar-icon.svg" ]] && cat > "$EXT_DIR/media/sidebar-icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
</svg>
SVG

# ── Install deps ──────────────────────────────────────────────────────────────
echo ""
echo "  Installing extension dependencies..."
cd "$EXT_DIR"
if ! pnpm install --silent 2>/tmp/p1s1-pnpm-err.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Fix pnpm install failure in apps/vscode/ VSCode extension"}' \
    --context "pnpm install failed in $EXT_DIR. The extension devDependencies or workspace config may be malformed." \
    --error   "$(cat /tmp/p1s1-pnpm-err.txt)"
  exit 1
fi
echo "  ✔  Dependencies installed"

echo ""
echo "  Extension scaffold:"
echo "    Root : $EXT_DIR"
echo "    src/ : commands/  services/  views/"
echo "    Commands: sovereign.runMission, assignCrew, searchCode, scaffoldDomain, healthCheck, gitOperation, openDashboard"

phase_pass "$STEP"
