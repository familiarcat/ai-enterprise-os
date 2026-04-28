#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s1-vscode-bootstrap.sh — Phase 1, Step 1: VSCode Extension Bootstrap
#
# Scaffolds the apps/vscode package, manifest, and source directory structure.
# Assigned crew: Geordi La Forge (Engineering) & Commander Riker (Tactical).
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

STEP="p1-s1-vscode-bootstrap"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 1: Extension Bootstrap"

EXT_DIR="$ROOT/apps/vscode"
echo "  Scaffolding VSCode extension at $EXT_DIR..."

mkdir -p "$EXT_DIR/src/services" "$EXT_DIR/src/views" "$EXT_DIR/src/commands"

# ── 1. package.json ───────────────────────────────────────────────────────────
cat > "$EXT_DIR/package.json" <<'PKG'
{
  "name": "sovereign-factory",
  "displayName": "Sovereign Factory",
  "description": "AI Enterprise OS — Star Trek crew agents in your editor",
  "version": "0.1.0",
  "publisher": "familiarcat",
  "engines": { "vscode": "^1.85.0" },
  "categories": [
    "AI",
    "Programming Languages",
    "Other"
  ],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "sovereign.runMission", "title": "Sovereign: Run Factory Mission" },
      { "command": "sovereign.runMission", "title": "Sovereign: Run Factory Mission", "category": "Sovereign" },
      { "command": "sovereign.sensorSweep", "title": "Sovereign: Sensors Sweep (System State)", "category": "Sovereign" }
    ],
    "views": {
      "explorer": [
        { "id": "sovereignCrew", "name": "Sovereign Crew", "type": "webview" }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js",
    "package": "vsce package"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.3",
    "@vscode/vsce": "^2.24.0"
  }
}
PKG

# ── 2. tsconfig.json ──────────────────────────────────────────────────────────
cat > "$EXT_DIR/tsconfig.json" <<'TS'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "dist",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "types": ["node", "vscode"],
    "ignoreDeprecations": "6.0"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test"]
}
TS

# ── 3. extension.ts (Entry Point) ─────────────────────────────────────────────
cat > "$EXT_DIR/src/extension.ts" <<'EXT'
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Sovereign Factory is now active.');
    // Command registrations will follow in p1-s4
}

export function deactivate() {}
EXT

echo "  ✔ Directory structure created"
echo "  ✔ package.json and tsconfig.json initialized"

phase_pass "$STEP"