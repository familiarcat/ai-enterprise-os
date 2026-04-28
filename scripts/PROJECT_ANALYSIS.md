# PROJECT ANALYSIS: ai-enterprise-os
Generated: 2026-04-18 03:56:51

## 1. PROJECT STRUCTURE & TOPOLOGY

### Repo Root Contents
```
. (1792 bytes)
.. (992 bytes)
.DS_Store (6148 bytes)
20240414000000_create_missions_table.sql (1271 bytes)
PROJECT_ANALYSIS.md (132 bytes)
analyze-ai-enterprise-os.sh (14970 bytes)
apply_factory_fixes.sh (1783 bytes)
lib (96 bytes)
lounge (192 bytes)
mcp-server.js (7607 bytes)
merge_phase_1_backbone.sh (854 bytes)
merge_phase_2_features.sh (1110 bytes)
merge_phase_3_hierarchy.sh (1092 bytes)
p0-run-all.sh (2350 bytes)
p0-s0-secrets-sync.sh (4867 bytes)
p0-s0-supabase-config.sh (2304 bytes)
p0-s1-env-check.sh (4608 bytes)
p0-s2-redis-ping.sh (4653 bytes)
p0-s3-supabase-check.sh (6292 bytes)
p0-s3b-supabase-migrate.sh (1999 bytes)
p0-s4-bridge-start.sh (6206 bytes)
p0-s5-dashboard-wire.sh (6123 bytes)
p0-s6-smoke-test.sh (6510 bytes)
p1-run-all.sh (2016 bytes)
p1-s1-vscode-bootstrap.sh (8094 bytes)
p1-s2-mcp-client.sh (10679 bytes)
p1-s3-webview-port.sh (12637 bytes)
p1-s4-ext-commands.sh (11636 bytes)
p1-s5-vsce-package.sh (6540 bytes)
p2-run-all.sh (1505 bytes)
p2-s1-clone-platform.sh (2667 bytes)
p2-s2-pkg-orchestrator.sh (7075 bytes)
p2-s3-pkg-mcp-bridge.sh (7203 bytes)
p2-s4-pkg-crew-personas.sh (4785 bytes)
p2-s5-turbo-pipeline.sh (3767 bytes)
p3-run-all.sh (1600 bytes)
p3-s1-n8n-start.sh (3074 bytes)
p3-s2-crew-webhook-map.sh (5984 bytes)
p3-s3-socketio-verify.sh (4541 bytes)
p3-s4-cost-routing-test.sh (6516 bytes)
p3-s5-baritalia-e2e.sh (6640 bytes)
p4-run-all.sh (1698 bytes)
p4-s1-docker-build.sh (6617 bytes)
p4-s2-terraform-plan.sh (5698 bytes)
p4-s3-vercel-deploy.sh (4408 bytes)
p4-s4-aws-deploy.sh (7427 bytes)
p4-s5-vsce-publish.sh (5432 bytes)
phase-00-prereqs.sh (1354 bytes)
phase-01-foundation.sh (935 bytes)
run-pipeline.sh (7766 bytes)
seed.sql (1194 bytes)
setup_credentials.sh (1162 bytes)
sync_secrets.sh (1802 bytes)
test-memory-retrieval.js (2451 bytes)
ui-build-prompt.md (12177 bytes)
verify_health.sh (1897 bytes)
```

### Monorepo Package Structure
```
⚠️  pnpm-workspace.yaml not found
```

### Directory Tree (apps/ and packages/)
```
apps  [error opening dir]
packages  [error opening dir]

0 directories, 0 files
```

## 2. CREW SYSTEM ARCHITECTURE

### Crew Agent Manifest
```typescript
No packages directory found
```

### CrewAI Agent Definitions (Picard → Uhura)
```
No packages directory found
```

### Model Tier Routing Strategy
```typescript
```

## 3. MCP SERVER CONFIGURATION & INTEGRATION

### MCP Server Definitions
```json
=== ./p2-s3-pkg-mcp-bridge.sh ===
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
=== ./mcp-server.js ===
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { 
  invokeUnzipSearchTool, runMission, runMissions, getVersionsHierarchy, 
  manageProject, manageSprint, manageTask, invokeCrewAgent, gitOperation,
  verifyIntegrity
} = require("../core/orchestrator.js");

const server = new Server({
  name: "sovereign-factory",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
    logging: {},
  },
});

/**
 * List available tools for the MCP Agent
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_code",
      description: "Search for functions, classes, or patterns in a zip or folder",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          function_name: { type: "string" },
          item_type: { type: "string", enum: ["function", "class", "type", "enum"] }
        },
        required: ["path", "function_name"]
      }
    },
    {
      name: "run_factory_mission",
      description: "Trigger a full mission to analyze evolution and scaffold new DDD domains",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string" },
          objective: { type: "string" }
        },
        required: ["project", "objective"]
=== ./p1-s2-mcp-client.sh ===
#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s2-mcp-client.sh — Phase 1, Step 2: MCP client service stub
#
# Generates the MCPClient TypeScript service (EventSource SSE + JSON-RPC POST)
# inside the VSCode extension's src/services/ directory if it doesn't exist.
# Assigned crew: Geordi La Forge (engineer robust systems, MCP integration).
# MCP tool on failure: run_factory_mission
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p1-s2-mcp-client"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 2: MCP Client Service"

EXT_DIR="$ROOT/apps/vscode"
SERVICES_DIR="$EXT_DIR/src/services"
MCP_CLIENT="$SERVICES_DIR/MCPClient.ts"

mkdir -p "$SERVICES_DIR"

if [[ -f "$MCP_CLIENT" ]]; then
  # Validate key signatures exist
  MISSING_SIG=()
  for sig in "listTools" "callTool" "openSSE" "sessionId"; do
    grep -q "$sig" "$MCP_CLIENT" || MISSING_SIG+=("$sig")
  done

  if [[ ${#MISSING_SIG[@]} -eq 0 ]]; then
    echo "  ✔  MCPClient.ts exists and has required method signatures"
    phase_pass "$STEP"
    exit 0
  else
    echo "  ⚠  MCPClient.ts exists but missing: ${MISSING_SIG[*]} — regenerating"
  fi
fi

echo "  Writing MCPClient.ts..."
cat > "$MCP_CLIENT" <<'MCPCLIENT'
/**
 * MCPClient.ts — Sovereign Factory VSCode Extension
 *
 * Implements the MCP client over HTTP/SSE transport, matching the protocol
 * exposed by apps/api/mcp-http-bridge.mjs.
 *
 * Protocol:
 *   GET  /sse          → EventSource SSE stream; receives sessionId via endpoint event
 *   POST /messages     → JSON-RPC 2.0 method calls routed by ?sessionId=
```

### MCP Server Registration & Tool Mapping
```typescript
```

### Available MCP Tools & Capabilities
```
```

## 4. MEMORY SYSTEM & CONTEXT PERSISTENCE

### CLAUDE.md Project Memory
```
⚠️  CLAUDE.md not found
```

### Memory Sync System (Supabase Integration)
```typescript
```

## 5. MONOREPO HEALTH & DEPENDENCIES

### Root package.json
```json
⚠️  package.json not found
```

### pnpm Dependencies Status
```
pnpm version: 9.12.3

=== Workspace packages ===
Legend: production dependency, optional only, dev only

ai-enterprise-os-root /Users/bradygeorgen/Dev/ai-enterprise-os (PRIVATE)

dependencies:
@modelcontextprotocol/sdk 0.6.1
@supabase/supabase-js 2.103.0
dotenv 16.6.1
express 4.22.1
ioredis 5.10.1

devDependencies:
turbo 1.13.4
vitest 1.6.1

=== Checking for missing dependencies ===
```

### Package Count by Type
```
```

### TypeScript Build Status
```

=== Build Errors (if any) ===
undefined
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "build" not found
```

## 6. DEPLOYMENT ARCHITECTURE

### Vercel Frontend Configuration
```json
⚠️  vercel.json not found
```

### Docker & Infrastructure (AWS EC2)
```
```

### Environment Configuration
```bash
=== .env.example (if exists) ===
⚠️  .env.example not found

=== Environment Variable Requirements ===
```

## 7. CREDENTIAL & SECURITY MANAGEMENT

### Local Credential Sources (~/.zshrc)
```bash
=== Exported variables in ~/.zshrc ===
export OPENROUTER_API_KEY="REDACTED"
export OPENROUTER_REFERER="https://n8n.pbradygeorgen.com"
export SUPABASE_URL="[REDACTED]"
export SUPABASE_PROJECT_ID="local"
export SUPABASE_PUBLIC_KEY="REDACTED"
export SUPABASE_SERVICE_ROLE_KEY="REDACTED"
export SUPABASE_DB_URL="REDACTED"
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_PUBLIC_KEY"
export NEXTJS_SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
export AWS_REGION="us-east-2"
export AWS_PROFILE="openrouter-deployer"
export SUPABASE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
```

### AWS SSM Parameter Store References
```typescript
```

### Security Checklist
```
=== Checking for hardcoded secrets ===
       0
matches found (inspect these!)

=== Checking for .gitignore ===
⚠️  .gitignore not found
```

## 8. ARCHITECTURAL GOVERNANCE & DOCUMENTATION

### Platform Constitution
```
⚠️  No constitution file found
```

### Comparative Analysis (Merger Strategy)
```
⚠️  COMPARATIVE_ANALYSIS.md not found
```

### Migration Scripts Status (Phases 0-7)
```bash
⚠️  scripts/ directory not found
```

## 9. GIT REPOSITORY STATUS

### Branch & Commit History
```
=== Current branch ===
* main 89920e9 updated orchistrator with worf security tests

=== Recent commits (last 10) ===
89920e9 updated orchistrator with worf security tests
8a19133 added mcp search rules
26d3f4a ui is now swiss but needs treatment
dde712c brtockmann applied
fea724f finally working on design
4cb1c02 base local host running
63c4e08  gemini to claude query
b8139ae moving between code bases
c21597a merging claude to gemini responses
5d5bc6f add .gitignore and .env.example; remove .env from tracking

=== Uncommitted changes ===
 M ../apps/api/mcp-server.js
 M ../core/orchestrator.js
?? ../crew-memories/active/observation-1776404555-lt-worf.json
?? ../master-architecture.skill
?? PROJECT_ANALYSIS.md
?? analyze-ai-enterprise-os.sh
```

### File Statistics
```
```

## 10. ISSUES & WARNINGS

### Critical Checks
```
Status checks:

❌ CRITICAL: No root package.json
❌ CRITICAL: No pnpm-workspace.yaml
⚠️  apps/ directory not found
⚠️  packages/ directory not found

=== Checking for circular dependencies ===
No obvious circular dependencies detected
```

## 11. PRELIMINARY OBSERVATIONS

Please review the following sections in detail:

1. **CREW SYSTEM** - Verify agent definitions match Star Trek manifest
2. **MCP SERVERS** - Confirm all MCP servers are properly registered
3. **MEMORY SYSTEM** - Test CLAUDE.md ↔ Supabase sync
4. **BUILD HEALTH** - Address any TypeScript compilation errors
5. **DEPENDENCIES** - Check for orphaned or unused packages
6. **SECURITY** - Audit credential management strategy
7. **DEPLOYMENT** - Validate Vercel + AWS EC2 architecture

---

**Analysis Complete**

To use this output:
1. Save to a file: `./analyze-ai-enterprise-os.sh > analysis_report.md`
2. Review each section for configuration details
3. Address any ⚠️  or ❌ markers
4. Share with Claude for deep architectural review

For questions about MCP crew configuration, memory system, or deployment topology,
paste this entire report into Claude and request comprehensive analysis.
