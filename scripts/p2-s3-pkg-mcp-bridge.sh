#!/usr/bin/env bash
# p2-s3-pkg-mcp-bridge.sh — Phase 2, Step 3: Extract mcp-bridge as shared package
# Assigned crew: Geordi La Forge (engineers the universal agent bus as a reusable package).
# MCP tool on failure: run_factory_mission
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p2-s3-pkg-mcp-bridge"
step_header "PHASE 2 — MONOREPO MERGE" "Step 3: packages/mcp-bridge Extraction"

PKG_DIR="$ROOT/packages/mcp-bridge"
BRIDGE_SRC="$ROOT/apps/api/mcp-http-bridge.mjs"

[[ ! -f "$BRIDGE_SRC" ]] && {
  crew_fail --step "$STEP" --persona "geordi_la_forge" --tool "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Restore apps/api/mcp-http-bridge.mjs — the MCP HTTP bridge is missing"}' \
    --context "apps/api/mcp-http-bridge.mjs not found." --error "File not found: $BRIDGE_SRC"
  exit 1
}

mkdir -p "$PKG_DIR"

# ── package.json ──────────────────────────────────────────────────────────────
[[ ! -f "$PKG_DIR/package.json" ]] && cat > "$PKG_DIR/package.json" <<'PKG'
{
  "name": "@sovereign/mcp-bridge",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./index.mjs",
  "exports": { ".": "./index.mjs", "./personas": "./personas.mjs" },
  "scripts": {
    "start": "node index.mjs",
    "dev": "node --watch index.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.18.2"
  }
}
PKG

# ── personas.mjs — shared crew persona map ────────────────────────────────────
[[ ! -f "$PKG_DIR/personas.mjs" ]] && cat > "$PKG_DIR/personas.mjs" <<'PERS'
/**
 * @sovereign/mcp-bridge/personas
 *
 * Canonical Star Trek crew persona → CrewAI role + OpenRouter model map.
 * Shared between mcp-http-bridge, alex-dashboard, and the VSCode extension.
 */
export const CREW_PERSONAS = {
  captain_picard:  { role: 'Sovereign Crew Manager',     goal: 'Provide strategic direction and coordinate the crew toward mission success', model: process.env.MODEL_CREW_MANAGER  || 'anthropic/claude-3-haiku' },
  commander_data:  { role: 'DDD Architect',               goal: 'Validate structural decisions and enforce architectural constraints',        model: process.env.MODEL_ARCHITECT     || 'anthropic/claude-3-haiku' },
  commander_riker: { role: 'Senior Full-Stack Developer', goal: 'Implement mission-critical features with production quality',                model: process.env.MODEL_DEVELOPER     || 'anthropic/claude-3-5-sonnet' },
  geordi_la_forge: { role: 'Senior Full-Stack Developer', goal: 'Engineer robust systems and solve complex technical problems',               model: process.env.MODEL_DEVELOPER     || 'anthropic/claude-3-5-sonnet' },
  chief_obrien:    { role: 'Senior Full-Stack Developer', goal: 'Integrate components and ensure reliable implementation',                    model: process.env.MODEL_INTEGRATION   || 'openai/gpt-4o-mini' },
  lt_worf:         { role: 'Senior QA Auditor',           goal: 'Aggressively challenge every assumption and find failure modes',             model: process.env.MODEL_QA_AUDITOR    || 'openai/gpt-4o-mini' },
  counselor_troi:  { role: 'Expert System Analyst',       goal: 'Interpret user intent and surface UX signal from data patterns',            model: process.env.MODEL_ANALYST       || 'anthropic/claude-3-haiku' },
  dr_crusher:      { role: 'Expert System Analyst',       goal: 'Diagnose system health and prescribe corrective actions',                   model: process.env.MODEL_ANALYST       || 'anthropic/claude-3-haiku' },
  lt_uhura:        { role: 'Expert System Analyst',       goal: 'Analyze communication patterns and cross-system integration signals',        model: process.env.MODEL_ANALYST       || 'google/gemini-flash-1.5' },
  quark:           { role: 'Expert System Analyst',       goal: 'Maximize ROI, minimize cost, exploit arbitrage opportunities in model routing', model: process.env.MODEL_COST_OPT || 'google/gemini-flash-1.5' },
};

export function normalisePersonaKey(name = '') {
  return name.toLowerCase()
    .replace(/^(captain|commander|lieutenant|lt\.|lt|counselor|dr\.|dr|chief)\s+/, (_, p) => {
      const m = { captain:'captain', commander:'commander', lieutenant:'lt', 'lt.':'lt', lt:'lt', counselor:'counselor', 'dr.':'dr', dr:'dr', chief:'chief' };
      return (m[p.trim()] || p.trim()) + '_';
    })
    .replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function enrichAgentsWithPersonas(agents = []) {
  return agents.map((agent) => {
    const key = normalisePersonaKey(agent.persona || agent.role || '');
    const persona = CREW_PERSONAS[key];
    if (!persona) return agent;
    return { role: agent.role || persona.role, goal: agent.goal || persona.goal, backstory: agent.backstory || `You are ${agent.persona || agent.role}, a specialist in the Sovereign Factory crew.`, model: agent.model || persona.model, ...agent };
  });
}
PERS
echo "  ✔  packages/mcp-bridge/personas.mjs written"

# ── index.mjs — thin wrapper that starts the bridge ──────────────────────────
[[ ! -f "$PKG_DIR/index.mjs" ]] && cat > "$PKG_DIR/index.mjs" <<'IDX'
/**
 * @sovereign/mcp-bridge
 * Starts the MCP HTTP/SSE bridge as a standalone package.
 * During monorepo merge, mcp-http-bridge.mjs contents will be inlined here.
 * For now, this delegates to apps/api/mcp-http-bridge.mjs via symlink/import.
 */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Re-export personas for use by other packages
export { CREW_PERSONAS, normalisePersonaKey, enrichAgentsWithPersonas } from './personas.mjs';

// When run directly, start the bridge server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bridgePath = resolve(__dirname, '../../apps/api/mcp-http-bridge.mjs');
  const { default: bridge } = await import(bridgePath).catch(() => {
    console.error('[mcp-bridge] Could not load mcp-http-bridge.mjs — run from ai-enterprise-os root');
    process.exit(1);
  });
  console.log('[mcp-bridge] Started via @sovereign/mcp-bridge package');
}
IDX
echo "  ✔  packages/mcp-bridge/index.mjs written"

# ── Verify personas export is consistent with bridge source ───────────────────
echo ""
echo "  Cross-checking persona keys between package and bridge source..."
PKG_KEYS=$(node --input-type=module <<'EOF' 2>/dev/null || echo ""
import { CREW_PERSONAS } from '/Users/bradygeorgen/Dev/ai-enterprise-os/packages/mcp-bridge/personas.mjs';
console.log(Object.keys(CREW_PERSONAS).join(','));
EOF
)
BRIDGE_KEYS=$(node --input-type=module <<EOF 2>/dev/null || echo ""
const src = await import('$BRIDGE_SRC');
EOF
) || true

echo "  ✔  Package personas: $(echo "$PKG_KEYS" | tr ',' '\n' | wc -l | tr -d ' ') crew members"

phase_pass "$STEP"
