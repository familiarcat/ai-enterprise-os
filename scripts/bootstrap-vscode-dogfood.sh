#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/bootstrap-vscode-dogfood.sh — Autonomous Extension Scaffolding
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "🚀 Sovereign Factory: Initiating Self-Scaffolding for VSCode Extension..."

# We invoke the orchestrator to run a mission using the UI Build Prompt as the directive
node -e "
  const { handleToolCall } = require('./core/orchestrator');
  const fs = require('fs');
  const prompt = fs.readFileSync('./scripts/ui-build-prompt.md', 'utf8');
  
  handleToolCall('run_factory_mission', { 
    context: { sessionId: 'bootstrap-ext-' + Date.now(), task: 'Execute Phase 1 of the UI Build Prompt to bootstrap the apps/vscode directory.', persona: 'commander_riker' } 
  }).then(res => console.log(JSON.stringify(res, null, 2)));
"