#!/usr/bin/env bash
# p2-s2-pkg-orchestrator.sh — Phase 2, Step 2: Extract orchestrator as shared package
# Validates or creates packages/orchestrator with re-exports from core/orchestrator.js.
# Assigned crew: Commander Data (DDD Architect, enforces package boundaries).
# MCP tool on failure: run_factory_mission
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p2-s2-pkg-orchestrator"
step_header "PHASE 2 — MONOREPO MERGE" "Step 2: packages/orchestrator Extraction"

PKG_DIR="$ROOT/packages/orchestrator"
CORE="$ROOT/core/orchestrator.js"

if [[ ! -f "$CORE" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Restore core/orchestrator.js — the main orchestration engine is missing"}' \
    --context "core/orchestrator.js not found at $CORE. This is the orchestration engine and cannot be missing." \
    --error   "File not found: $CORE"
  exit 1
fi
echo "  ✔  core/orchestrator.js verified ($(wc -l < "$CORE") lines)"

mkdir -p "$PKG_DIR/src"

# ── package.json ──────────────────────────────────────────────────────────────
if [[ ! -f "$PKG_DIR/package.json" ]]; then
  cat > "$PKG_DIR/package.json" <<'PKG'
{
  "name": "@sovereign/orchestrator",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": {
      "require": "./src/index.js",
      "import": "./src/index.mjs"
    }
  },
  "scripts": {
    "build": "echo 'orchestrator is CJS — no build step required'",
    "test": "vitest run"
  }
}
PKG
  echo "  ✔  packages/orchestrator/package.json created"
fi

# ── index.js — CJS re-export from core ───────────────────────────────────────
if [[ ! -f "$PKG_DIR/src/index.js" ]]; then
  cat > "$PKG_DIR/src/index.js" <<'IDX'
/**
 * @sovereign/orchestrator
 *
 * Re-exports all public functions from core/orchestrator.js so that
 * other packages (mcp-bridge, extension API service) can import from
 * '@sovereign/orchestrator' rather than a relative path.
 *
 * During the monorepo merge, core/orchestrator.js will be ported to
 * TypeScript and this will become the canonical source.
 */
const orchestrator = require('../../core/orchestrator.js');

module.exports = orchestrator;
IDX
  echo "  ✔  packages/orchestrator/src/index.js created"
fi

# ── ESM wrapper (index.mjs) ───────────────────────────────────────────────────
if [[ ! -f "$PKG_DIR/src/index.mjs" ]]; then
  cat > "$PKG_DIR/src/index.mjs" <<'MJS'
// ESM shim — allows `import { runMission } from '@sovereign/orchestrator'`
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const orch = require('./index.js');
export const {
  runMission,
  runMissions,
  invokeCrewAgent,
  invokeUnzipSearchTool,
  verifyIntegrity,
  recallMemory,
  storeMissionResult,
  getVersionsHierarchy,
  manageProject,
  manageSprint,
  manageTask,
  gitOperation,
  scaffoldDDDComponent,
  enforceBackboneStructure,
  generateEmbedding,
  resetMemorySystems,
} = orch;
export default orch;
MJS
  echo "  ✔  packages/orchestrator/src/index.mjs created"
fi

# ── TypeScript declaration stub ───────────────────────────────────────────────
if [[ ! -f "$PKG_DIR/src/index.d.ts" ]]; then
  cat > "$PKG_DIR/src/index.d.ts" <<'DTS'
/** @sovereign/orchestrator — type declarations */
export interface MissionResult { status: string; output: string; [k: string]: unknown; }
export interface Mission { project: string; objective: string; }
export interface AgentConfig { role: string; goal: string; backstory?: string; model?: string; persona?: string; }

export function runMission(project: string, objective: string): Promise<MissionResult>;
export function runMissions(missions: Mission[], limit?: number, onProgress?: (p: unknown) => void): Promise<MissionResult[]>;
export function invokeCrewAgent(options: { objective: string; agents: AgentConfig[] }): Promise<string>;
export function invokeUnzipSearchTool(options: { path: string; function_name: string; item_type?: string }): Promise<string>;
export function verifyIntegrity(): Promise<{ redis: boolean; supabase: boolean; openrouter: boolean; python: boolean }>;
export function recallMemory(objective: string): Promise<unknown[]>;
export function storeMissionResult(content: string, metadata: Record<string, unknown>): Promise<void>;
export function getVersionsHierarchy(): Promise<unknown>;
export function manageProject(project: string, action: 'create'|'update'|'archive', details?: Record<string, unknown>): Promise<unknown>;
export function manageSprint(project: string, action: 'create'|'start'|'close', sprintName: string, details?: Record<string, unknown>): Promise<unknown>;
export function manageTask(project: string, action: 'create'|'assign'|'move'|'complete', taskId?: string, details?: Record<string, unknown>): Promise<unknown>;
export function gitOperation(project: string, action: 'commit'|'push'|'status', message?: string): Promise<string>;
export function scaffoldDDDComponent(name: string, generatedLayers: Record<string, string>): Promise<void>;
export function generateEmbedding(text: string): Promise<number[]>;
export function resetMemorySystems(): void;
DTS
  echo "  ✔  packages/orchestrator/src/index.d.ts created"
fi

# ── Verify the package loads ───────────────────────────────────────────────────
echo ""
echo "  Verifying package loads..."
if ! node -e "const o = require('$PKG_DIR/src/index.js'); if(typeof o.runMission !== 'function') throw new Error('runMission not exported')" 2>/tmp/p2s2-verify.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Fix the packages/orchestrator package — it cannot load or is missing runMission export"}' \
    --context "packages/orchestrator/src/index.js fails to load or does not export runMission." \
    --error   "$(cat /tmp/p2s2-verify.txt)"
  exit 1
fi
echo "  ✔  @sovereign/orchestrator loads and exports runMission"

# ── Update pnpm-workspace.yaml to include packages/* ─────────────────────────
WS="$ROOT/pnpm-workspace.yaml"
if ! grep -q "packages/\*" "$WS" 2>/dev/null; then
  echo "" >> "$WS"
  echo "  - 'packages/*'" >> "$WS"
  echo "  ✔  Added packages/* to pnpm-workspace.yaml"
fi

phase_pass "$STEP"
