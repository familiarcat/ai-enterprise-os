# SOVEREIGN FACTORY — Claude Code System Context

> **Read this file first.** It is the authoritative system prompt for all Claude Code sessions working
> on `ai-enterprise-os`. It describes the full architecture, active goals, crew routing, phase plan,
> and known failure modes. Everything in here supersedes memory, assumptions, or prior conversation.

---

## 1. What This Is

**Sovereign Factory** is a self-building AI Enterprise OS. Two repos form one unified platform:

| Repo | Role | Location |
|------|------|----------|
| `ai-enterprise-os` | Engine — Node.js orchestrator, MCP HTTP bridge, Python CrewAI, DDD scaffolding | `~/Dev/ai-enterprise-os` (this repo) |
| `openrouter-crew-platform` | UI Shell — Turbo/pnpm monorepo, Next.js alex-dashboard, 50+ components, n8n, Terraform | `~/Dev/openrouter-crew-platform` |

The **MCP HTTP bridge** (`apps/api/mcp-http-bridge.mjs`, port 3002) is the universal agent bus that
connects both repos. Any UI, VSCode extension, or script communicates with the engine exclusively
through this bridge using SSE + JSON-RPC.

---

## 2. The Unified Goal

Build a **single UI** that implicitly combines both repos into one coherent operator interface:

```
openrouter-crew-platform/apps/alex-dashboard   ←→   ai-enterprise-os/apps/dashboard
         (50+ components, Star Trek personas)              (4-step mission flow, MCP client)
```

The combined UI must support:
1. **Mission Control** — 4-step flow: Crew Selector → Task+LLM → Observation Lounge → Code Updates
2. **Crew Roster** — Live persona cards (10 Star Trek agents) with tier/model/capability display
3. **Real-Time Streaming** — SovereignAgentViewport showing agent output as it streams from bridge
4. **Cost Visibility** — Per-execution USD cost estimates (model tier × token count)
5. **Memory Browser** — Browse `crew-memories/active/` observation JSON files
6. **VSCode WebView** — Same React components rendered inside a VSCode extension panel
7. **n8n Webhook Panel** — Trigger crew workflows via HMAC-signed webhooks (Phase 3)
8. **Deploy Dashboard** — Vercel + AWS ECS status + vsce publish controls (Phase 4)

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser / VSCode WebView                                           │
│  apps/dashboard (Next.js 15)   or   apps/vscode (VSCode ext.)      │
│  ┌─────────────┐ ┌───────────────┐ ┌────────────────────────────┐  │
│  │CrewSelector │ │TaskLLMPanel   │ │ObservationLounge           │  │
│  │(Step 1)     │ │(Step 2)       │ │+ SovereignAgentViewport    │  │
│  └─────────────┘ └───────────────┘ │(Step 3)                    │  │
│  ┌──────────────────────────────┐  └────────────────────────────┘  │
│  │CodeExecutionPanel (Step 4)   │                                   │
│  └──────────────────────────────┘                                   │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ POST /api/mcp/execute  (Next.js API Route)
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MCP HTTP Bridge  apps/api/mcp-http-bridge.mjs  (port 3002)        │
│  GET /sse → SSEServerTransport (per-session MCP Server)             │
│  POST /messages?sessionId=  → JSON-RPC tool dispatch               │
│  GET /health   GET /crew/personas                                   │
│  10 Tools: search_code | run_factory_mission | run_batch_missions   │
│            run_crew_agent | manage_{project,sprint,task}            │
│            git_operation | health_check | get_versions_hierarchy    │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ require('../core/orchestrator')
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Orchestrator  core/orchestrator.js  (1200+ lines)                  │
│  ├─ runMission() / runMissions()  — DDD scaffolding lifecycle       │
│  ├─ invokeCrewAgent()             — Python CrewAI bridge (stdin)    │
│  ├─ invokeUnzipSearchTool()       — Python code search              │
│  ├─ getVersionsHierarchy()        — Git version analysis            │
│  ├─ recallMemory()                — Redis cache + Supabase vectors  │
│  ├─ scaffoldDDDComponent()        — Write domain/app/infra/ui/tests │
│  └─ verifyIntegrity()             — Health check all systems        │
└────────┬─────────────────────────┬──────────────────────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│  Redis          │    │  Supabase                                   │
│  Distributed    │    │  Tables: missions (vectors), observations   │
│  locks + 1hr    │    │  RPC: match_missions(), match_observations() │
│  memory cache   │    │  Threshold: 0.4 cosine similarity           │
└─────────────────┘    └─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Python Tools (spawned as child_process via stdin JSON)             │
│  tools/crew_manager.py       — CrewAI multi-agent workflows         │
│  tools/unzip_search_tool.py  — Codebase search in archives          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Crew Manifest — Single Source of Truth

File: `apps/dashboard/lib/crew-manifest.ts`

All 10 Star Trek personas are canonical agents. Each maps to a DDD role + OpenRouter cost tier:

| Handle | Display Name | DDD Role | Model Tier | Cost |
|--------|-------------|----------|------------|------|
| `captain_picard` | Jean-Luc Picard | CREW_MANAGER | OPUS | $15/M |
| `commander_riker` | William T. Riker | DEVELOPER | SONNET | $3/M |
| `commander_data` | Commander Data | ARCHITECT | SONNET | $3/M |
| `geordi_la_forge` | Geordi La Forge | DEVELOPER | HAIKU | $0.25/M |
| `lt_worf` | Lt. Worf | QA_AUDITOR | GPT_4O | varies |
| `dr_crusher` | Dr. Beverly Crusher | ANALYST | SONNET | $3/M |
| `counselor_troi` | Counselor Troi | ANALYST | HAIKU | $0.25/M |
| `quark` | Quark | ANALYST | GPT_4O | varies |
| `chief_obrien` | Chief O'Brien | DEVELOPER | GPT_4O | varies |
| `lt_uhura` | Lt. Uhura | ANALYST | GEMINI_1_5_PRO | low |

**Canonical Mission Flow** (8 steps, in order):
1. `captain_picard` — Decompose goal into task graph
2. `counselor_troi` — Validate budget headroom
3. `commander_data` — Analyze domain + enrich context
4. `dr_crusher` — Generate copy & documentation
5. `quark` — Financial projections & ROI
6. `lt_worf` — Validate outputs & security gate
7. `commander_riker` — Assemble final package
8. `lt_uhura` — Notify via webhook on completion

**Crew Failure Routing** (scripts/lib/crew-fail.sh):
Each pipeline step has an assigned crew member. On step failure, `crew_fail` emits a structured
Claude Code prompt routed to the responsible persona with the correct MCP tool to invoke.

---

## 5. Environment Variables

Required in `~/.env` or `.env` at repo root:

```bash
# Core (required for all phases)
OPENROUTER_API_KEY=sk-or-...
SUPABASE_URL=https://...supabase.co
SUPABASE_KEY=eyJ...
REDIS_URL=redis://127.0.0.1:6379
MCP_BRIDGE_PORT=3002
PORT=3001

# Dashboard
NEXT_PUBLIC_MCP_URL=http://localhost:3002

# Python env (optional — defaults to python3)
PYTHON_BIN=/path/to/.venv/bin/python3

# Model overrides (all optional — see MODEL_CONFIG in core/orchestrator.js)
MODEL_ANALYST=google/gemini-flash-1.5
MODEL_ARCHITECT=anthropic/claude-3-haiku
MODEL_DEVELOPER=anthropic/claude-3-5-sonnet
MODEL_QA_AUDITOR=openai/gpt-4o-mini
MODEL_EMBEDDING=openai/text-embedding-3-small

# Phase 3+
N8N_PORT=5678
N8N_WEBHOOK_SECRET=...

# Phase 4 (production)
AWS_REGION=us-east-1
AWS_PROFILE=default
ECR_REPO=...
ECS_CLUSTER=sovereign-factory
ECS_SERVICE=engine-api
NEXT_PUBLIC_MCP_URL_PROD=https://...
```

---

## 6. Phase Plan

Run `./scripts/run-pipeline.sh --list` to see all 28 registered steps.

### Phase 0 — Convergence & Validation ✅ COMPLETE
All 8 steps are production-ready. Run: `./scripts/p0-run-all.sh`

| Step | Script | Status | Crew |
|------|--------|--------|------|
| p0-s0 | `p0-s0-secrets-sync.sh` | ✅ Full | Lt. Worf |
| p0-s1 | `p0-s1-env-check.sh` | ✅ Full | Dr. Crusher |
| p0-s2 | `p0-s2-redis-ping.sh` | ✅ Full | Chief O'Brien |
| p0-s3 | `p0-s3-supabase-check.sh` | ✅ Full | Dr. Crusher |
| p0-s3b | `p0-s3b-supabase-migrate.sh` | ⚠️ Stub | Dr. Crusher |
| p0-s4 | `p0-s4-bridge-start.sh` | ✅ Full | Geordi |
| p0-s5 | `p0-s5-dashboard-wire.sh` | ✅ Full | Lt. Uhura |
| p0-s6 | `p0-s6-smoke-test.sh` | ✅ Full | Lt. Worf |

**Blocker**: `openrouter-crew-platform` must be cloned to `~/Dev/` before p0-s5.
```bash
git clone https://github.com/familiarcat/openrouter-crew-platform ~/Dev/openrouter-crew-platform
```

### Phase 1 — VSCode Extension MVP 🔴 NEXT
Run: `./scripts/p1-run-all.sh`

| Step | Script | Status | Goal |
|------|--------|--------|------|
| p1-s1 | `p1-s1-vscode-bootstrap.sh` | ⚠️ Partial | Scaffold `apps/vscode/` package.json + dirs |
| p1-s2 | `p1-s2-mcp-client.sh` | 🔴 Stub | Implement MCPClient service (EventSource SSE) |
| p1-s3 | `p1-s3-webview-port.sh` | 🔴 Stub | Port SovereignAgentViewport into WebView panel |
| p1-s4 | `p1-s4-ext-commands.sh` | 🔴 Stub | Register 7 commands + status bar item |
| p1-s5 | `p1-s5-vsce-package.sh` | 🔴 Stub | `vsce package` + local install |

**What to build in `apps/vscode/`**:
- `src/extension.ts` — activate(), register commands, create WebView panel
- `src/services/MCPClient.ts` — EventSource → SSE → /messages JSON-RPC
- `src/views/SovereignPanel.ts` — WebView wrapping the React components
- `src/commands/` — runMission, assignCrew, searchCode, scaffoldDomain, healthCheck, gitOp, openDashboard
- `package.json` — contributes.commands, contributes.views, activationEvents, publisher: "familiarcat"

### Phase 2 — Monorepo Merge 🔴 PENDING
Merge `ai-enterprise-os` INTO `openrouter-crew-platform`. Use orc-p as base (better Turbo/TS infra).

| Step | Goal |
|------|------|
| p2-s1 | Clone orc-p to `~/Dev/`, install deps |
| p2-s2 | Port `core/orchestrator.js` → `packages/orchestrator` (TypeScript) |
| p2-s3 | Move `apps/api/mcp-http-bridge.mjs` → `packages/mcp-bridge` |
| p2-s4 | Extract `CREW_PERSONAS` → `packages/crew-personas` (shared by ext + dashboard + bridge) |
| p2-s5 | Wire Turbo pipeline: single `turbo run dev` starts everything |

### Phase 3 — n8n + CrewAI Full Automation 🔴 PENDING

| Step | Goal |
|------|------|
| p3-s1 | Start n8n on :5678, import Star Trek crew workflows |
| p3-s2 | Map n8n webhook → `run_crew_agent` MCP tool with persona enrichment |
| p3-s3 | Wire Socket.io: mission progress → dashboard WebSocket AND extension EventEmitter |
| p3-s4 | Validate cost-optimized tier routing (haiku/sonnet/gpt-4o-mini/gemini-flash) |
| p3-s5 | Run BarItalia STL end-to-end under $1.50 |

### Phase 4 — Production Deploy 🔴 PENDING

| Step | Goal |
|------|------|
| p4-s1 | Multi-stage Docker build (Node 20 + Python 3.11) |
| p4-s2 | `terraform plan` — AWS ECS + ElastiCache + Lambda (reuse orc-p Terraform) |
| p4-s3 | Vercel deploy — alex-dashboard (zero-config Next.js) |
| p4-s4 | AWS deploy — ECS Fargate (engine-api + mcp-bridge) |
| p4-s5 | `vsce publish` — VSCode marketplace (publisher: familiarcat) |

---

## 7. How to Start the Stack Locally

```bash
# Terminal 1 — Redis (required)
redis-server

# Terminal 2 — MCP HTTP Bridge (required)
cd ~/Dev/ai-enterprise-os
node apps/api/mcp-http-bridge.mjs
# → listening on http://localhost:3002

# Terminal 3 — Dashboard
cd ~/Dev/ai-enterprise-os/apps/dashboard
pnpm install && pnpm dev
# → http://localhost:3000

# Optional — Express API (for direct orchestrator access)
cd ~/Dev/ai-enterprise-os
node apps/api/server.js
# → http://localhost:3001
```

**Smoke test** (verify bridge is live):
```bash
# Health check
curl http://localhost:3002/health

# Crew personas
curl http://localhost:3002/crew/personas

# Full smoke test
./scripts/p0-s6-smoke-test.sh
```

---

## 8. Key Files — Quick Reference

| File | Purpose |
|------|---------|
| `core/orchestrator.js` | Main engine — DDD scaffolding, mission lifecycle, Redis/Supabase |
| `apps/api/mcp-http-bridge.mjs` | HTTP transport layer — SSE sessions, JSON-RPC routing, 10 MCP tools |
| `apps/api/server.js` | Express API on :3001 (direct orchestrator access) |
| `apps/dashboard/app/page.tsx` | 4-step Mission Control UI (MissionControl component) |
| `apps/dashboard/lib/crew-manifest.ts` | Crew SSOT — personas, models, capabilities, mission flow |
| `apps/dashboard/app/api/mcp/execute/route.ts` | SSE session open → JSON-RPC tool call |
| `apps/dashboard/app/api/mcp/status/route.ts` | Bridge /health proxy |
| `apps/dashboard/app/api/mcp/crew/roster/route.ts` | Bridge /crew/personas + static fallback |
| `apps/dashboard/app/api/lounge/observations/route.ts` | crew-memories/active/ read/write |
| `apps/dashboard/components/CrewSelector.tsx` | Step 1 — multi-select crew with filtering |
| `apps/dashboard/components/TaskLLMPanel.tsx` | Step 2 — task + complexity estimation + tier |
| `apps/dashboard/components/ObservationLounge.tsx` | Step 3 — live agent viewport grid + history |
| `apps/dashboard/components/SovereignAgentViewport.tsx` | Individual agent output pane |
| `apps/dashboard/components/CodeExecutionPanel.tsx` | Step 4 — results summary + export |
| `crew-memories/active/` | JSON observation files from agents |
| `scripts/lib/crew-fail.sh` | Failure dispatcher — structured Claude Code prompts per crew |
| `scripts/run-pipeline.sh` | Master pipeline runner (--phase, --step, --from, --list) |
| `scripts/p0-run-all.sh` … `p4-run-all.sh` | Phase runners |

---

## 9. UI Build Guide — Merging Both Repos

The implicit combination of `ai-enterprise-os/apps/dashboard` and
`openrouter-crew-platform/apps/alex-dashboard` produces a unified UI with these layers:

### Layer 1 — Foundation (already built in apps/dashboard)
- `crew-manifest.ts` — unified crew data (merges both repos' manifests)
- `MissionControl` — 4-step state machine
- API routes for MCP bridge, observations, crew roster

### Layer 2 — Components to Port from openrouter-crew-platform
These components exist in `apps/alex-dashboard` and should be adapted for `apps/dashboard`:

| Component (orc-p) | Purpose | Integration Point |
|-------------------|---------|-------------------|
| `CostOptimizationMonitor` | Real-time budget tracking, variance circuit breaker | Step 2: alongside TaskLLMPanel |
| `CrewCoordinationPanel` | Multi-agent dependency graph visualization | Step 3: above ObservationLounge |
| `CrewAvatarCard` | Rich persona cards with capability badges | Step 1: inside CrewSelector |
| `MissionProgressBar` | Step-by-step mission flow indicator | All steps: top of page |
| `WebhookPanel` | n8n webhook trigger + HMAC signature | Phase 3: new Step 5 |
| `VersionsHierarchyTree` | Treemap of project version history | Step 4: CodeExecutionPanel tab |
| `DomainScaffoldVisualizer` | DDD layer diagram (domain/app/infra/ui) | Step 4: CodeExecutionPanel tab |

### Layer 3 — New Components to Build
| Component | Purpose |
|-----------|---------|
| `BridgeStatusBar` | Persistent top bar: bridge online/offline + active sessions |
| `CrewMemoryBrowser` | Paginated list of crew-memories/active/ JSON files with search |
| `ModelCostCalculator` | Input: task text → output: tier recommendation + USD estimate |
| `PhaseProgressPanel` | Live view of pipeline phase status (p0 ✅ p1 🔴 p2 🔴 p3 🔴 p4 🔴) |
| `VSCodeLaunchButton` | Opens the VSCode extension panel from the browser |

### Layer 4 — Integration Wiring
```typescript
// apps/dashboard/app/api/mcp/execute/route.ts — Already handles:
//   run_factory_mission, run_crew_agent, health_check

// Still needed:
// - Socket.io client in SovereignAgentViewport for streaming (currently polling)
// - WebSocket upgrade in mcp-http-bridge.mjs
// - n8n webhook proxy route: POST /api/n8n/trigger
// - Cost tracking: accumulate per-session total in page.tsx state
```

---

## 10. Known Bugs — Fixed in This Session (2026-04-15)

| Bug | File | Fix Applied |
|-----|------|-------------|
| `MODEL_CONFIG` legacy mapping created empty strings for ANALYST/ARCHITECT/DEVELOPER/CRITIC keys | `core/orchestrator.js:122` | Replaced spread with explicit role→model assignments using proper env var fallbacks |
| `gitOperation('commit')` used `shell: true` with unsanitized `message` — shell injection surface | `core/orchestrator.js:294` | Split into two sequential non-shell spawns; added control-char sanitization on message |
| `run-pipeline.sh` missing `p0-s0` (secrets-sync) and `p0-s3b` (supabase-migrate) from registry | `scripts/run-pipeline.sh:27-55` | Added both to `get_step_file()` and `STEP_ORDER`; updated banner step count to 28 |
| `mcp-http-bridge.mjs` API key guard only covered `run_factory_mission` + `run_batch_missions` — `run_crew_agent` and `search_code` could fail silently | `apps/api/mcp-http-bridge.mjs:199` | Extended guard to all 4 LLM-dependent tools |

---

## 11. Crew Failure Protocol

When any pipeline step fails, paste the generated crew prompt into Claude Code chat.
Claude Code will automatically invoke the recommended MCP tool.

**Pattern:**
```bash
# Step fails → crew_fail emits structured prompt to stderr
# + saves to .pipeline-logs/<timestamp>-<step>-crew-prompt.md

# To auto-pipe failures to Claude:
CLAUDE_CLI=claude ./scripts/p0-run-all.sh
# (requires `claude` on PATH — Claude Code CLI)
```

**Manual dispatch example:**
```
The pipeline step `p0-s3-supabase-check` has failed.
[...crew prompt from .pipeline-logs/...]

# Claude Code will respond by invoking:
Use the `health_check` MCP tool with args: {"fix": true}
```

---

## 12. DDD Domains

Five business domains are scaffolded at `domains/`:
- `ads` — Ad campaign management
- `fund` — Financial fund operations
- `outbound` — Outbound sales automation
- `revenue` — Revenue tracking and forecasting
- `seo` — SEO optimization workflows

Each domain follows the standard DDD backbone:
`domain/` → `application/` → `infrastructure/` → `ui/` → `tests/` → `docs/`

The enforcer is `enforceBackboneStructure()` in `core/orchestrator.js`.

---

## 13. openrouter-crew-platform Integration Points

When working in or integrating orc-p:

| orc-p File | ai-enterprise-os Equivalent |
|------------|----------------------------|
| `domains/shared/agent-orchestration/src/crew-manifest.ts` | `apps/dashboard/lib/crew-manifest.ts` (ai-eos is authoritative) |
| `apps/alex-dashboard/components/SovereignAgentViewport.tsx` | `apps/dashboard/components/SovereignAgentViewport.tsx` (already ported) |
| `apps/alex-dashboard/app/observation-lounge/page.tsx` | `apps/dashboard/components/ObservationLounge.tsx` (already adapted) |
| `backups/vscode-extension/` | `apps/vscode/` (to be bootstrapped from this in Phase 1) |
| `terraform/` | Phase 4 deploy (reuse as-is) |
| `.github/workflows/` | Phase 4 CI/CD (reuse ci.yml, deploy*.yml, vscode-extension-ci.yml) |

**MCP client URL** in orc-p: `NEXT_PUBLIC_MCP_URL` (set by `p0-s5-dashboard-wire.sh`).

---

## 14. Agent SDK Usage Pattern

When building new features that call the MCP bridge from Next.js:

```typescript
// POST /api/mcp/execute
const response = await fetch('/api/mcp/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'run_factory_mission',     // or any of the 10 MCP tools
    args: {
      project: 'ai-enterprise-os',
      objective: 'Scaffold the revenue domain application layer',
      persona: 'commander_riker',    // optional — defaults to orchestrator default
    }
  })
});
const { result, status, error } = await response.json();
// status: 'SUCCESS' | 'ERROR'
// result: string (tool output)
```

For streaming (future Socket.io integration):
```typescript
const es = new EventSource(`${MCP_BRIDGE_URL}/sse`);
es.onmessage = (e) => { /* parse sessionId from first event */ };
// Then POST to /messages?sessionId=<id>
```

---

## 15. Testing

```bash
# Unit tests (orchestrator)
cd ~/Dev/ai-enterprise-os
npx vitest run core/orchestrator.test.js

# Integration smoke test (requires bridge running)
./scripts/p0-s6-smoke-test.sh

# Memory retrieval test
node scripts/test-memory-retrieval.js

# Full Phase 0 validation
./scripts/p0-run-all.sh
```

---

*Last updated: 2026-04-15 — ai-enterprise-os session*
*4 bugs fixed: MODEL_CONFIG, gitOperation shell injection, run-pipeline step registry, MCP bridge API key guard*
