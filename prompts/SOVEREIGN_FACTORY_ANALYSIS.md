# Sovereign Factory — Project Goals & Execution Gap Analysis
**Analyzed:** May 15, 2026 | **Repository:** github.com/familiarcat/ai-enterprise-os

---

## Executive Summary

**Sovereign Factory** is an agentic "Business-as-Code" platform designed to autonomously scaffold new business domains using AI agents coordinated via the Model Context Protocol (MCP). 

### Current Status
- ✅ **Phase 0 (Convergence):** COMPLETE — 11 foundation steps working
- 🔴 **Phase 1 (VSCode Extension MVP):** NEXT — 50% infrastructure, needs component porting
- 🔴 **Phase 2 (Monorepo Merge):** BLOCKED — Requires Phase 1 completion
- 🔴 **Phase 3–4 (Production):** PENDING — Terraform, Docker, EC2 deploy scripts (Vercel deferred)

### Key Insight
The **core orchestrator engine is production-ready**, but the **UI/UX layer (dashboard + VSCode extension)** is the critical bottleneck blocking all downstream phases.

---

## Part 1: Project Goals

### 1.1 Primary Mission
Build a **unified operator interface** that implicitly merges two monorepos into one coherent platform:

```
ai-enterprise-os/apps/dashboard        ← Mission Control + Observation Lounge (React)
            ↔
openrouter-crew-platform/apps/alex-dashboard     ← 50+ rich components + Crew avatars
```

**Target Capability**: A single UI from which operators can:
1. **Select crew members** (10 Star Trek personas with specific roles)
2. **Define missions** (task + LLM model tier selection)
3. **Monitor execution** (real-time streaming agent output)
4. **Review results** (code diffs, cost breakdowns, memory observations)
5. **Deploy** (push to prod via integrated Vercel/AWS controls)

### 1.2 Architectural Vision
The system operates as a **self-building factory**:

```
┌─────────────────────────────────────────────────┐
│         Human Operator (Web UI)                 │
│  Dashboard + VSCode Extension (React)           │
└──────────────────┬──────────────────────────────┘
                   │ SSE + JSON-RPC
┌──────────────────▼──────────────────────────────┐
│  MCP HTTP Bridge (apps/api/mcp-http-bridge.mjs) │
│  10 MCP Tools: run_factory_mission, etc.        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│   Orchestrator (core/orchestrator.js)           │
│   ├─ Mission lifecycle management               │
│   ├─ DDD domain scaffolding                     │
│   ├─ Crew agent routing (Python CrewAI)        │
│   └─ Persistence (Supabase + Redis)            │
└────────┬──────────────────────────────────────┬─┘
         │                                      │
    ┌────▼──────┐                    ┌─────────▼──────┐
    │  Python   │                    │  File System   │
    │  CrewAI   │                    │  domains/      │
    │  Agents   │                    │  scripts/      │
    └───────────┘                    └────────────────┘
```

### 1.3 The Crew — 10 Star Trek Personas
Each persona maps to a DDD role with a specific OpenRouter model tier:

| Persona | Role | Model | Cost/M | Authority |
|---------|------|-------|--------|-----------|
| **Captain Picard** | Crew Manager | Opus | $15 | Mission decomposition |
| **Commander Data** | Architect | Sonnet | $3 | Domain design |
| **Geordi La Forge** | Developer | Haiku | $0.25 | Implementation |
| **Lt. Worf** | QA/Auditor | GPT-4O | varies | Security gate (pre-commit) |
| **Dr. Crusher** | Analyst | Sonnet | $3 | Documentation + health |
| **Counselor Troi** | Analyst | Haiku | $0.25 | Budget validation |
| **Quark** | Analyst | GPT-4O | varies | Financial projections |
| **Lt. Uhura** | Analyst | Gemini Flash | low | Notifications |
| **Tasha Yar** | QA | Gemini Flash | low | QA auditing |
| **Chief O'Brien** | DevOps | GPT-4O | varies | Infrastructure |

**Canonical Mission Flow** (8 steps):
1. Picard decomposes goal → task graph
2. Troi validates budget headroom
3. Data analyzes domain + enriches context
4. Crusher generates copy & docs
5. Quark projects ROI
6. Worf validates outputs & gates security
7. Riker assembles final package
8. Uhura notifies via webhook

### 1.4 Business Domains (DDD)
Five real business domains currently scaffolded:

- **Ads** — Advertising spend optimization + bidding strategy
- **Fund** — Investment portfolio tracking + allocation
- **Revenue** — Recurring revenue modeling + forecasting
- **Outbound** — Sales pipeline + prospecting automation
- **SEO** — Content performance tracking + optimization

Each domain has:
- `Domain/` — Entity/Value Object definitions
- `Application/` — Use case orchestration
- `Infrastructure/` — Persistence + external service bindings
- `UI/` — React components (future)
- `Tests/` — Vitest suite

---

## Part 2: Current Implementation Status

### 2.1 What's Complete ✅

#### Phase 0 — Foundation (11/11 steps)

| Step | Script | Status | Validates |
|------|--------|--------|-----------|
| p0-s0 | `p0-s0-secrets-sync.sh` | ✅ | GitHub Secrets → local .env |
| p0-s1 | `p0-s1-env-check.sh` | ✅ | Required env vars present |
| p0-s2 | `p0-s2-redis-ping.sh` | ✅ | Redis connectivity |
| p0-s3 | `p0-s3-supabase-check.sh` | ✅ | Supabase JWT + tables exist |
| p0-s3b | `p0-s3b-supabase-migrate.sh` | ⚠️ | Runs migrations (stub) |
| p0-s4 | `p0-s4-bridge-start.sh` | ✅ | MCP HTTP bridge on :3002 |
| p0-s5 | `p0-s5-dashboard-wire.sh` | ✅ | Dashboard wireup + port :3000 |
| p0-s6 | `p0-s6-smoke-test.sh` | ✅ | Bridge health, crew personas |
| p0-s7 | `deploy-pre-flight.sh` | ✅ | Docker Compose + deps |
| p0-s8 | `seed-architecture.sh` | ✅ | Populate domains/ with schemas |
| p0-s9 | `p0-s9-project-summary-seed.sh` | 🟢 | Project manifest generation |
| p0-s10 | Python Documentation & Test Seed | ✅ | CrewAI docs + test templates |
| p0-s11 | Deployment Strategy Finalization | ✅ | Vercel + AWS ECS readiness |

**Smoke Test Command**: `./scripts/p0-s6-smoke-test.sh`
- ✅ MCP bridge health: `curl http://localhost:3002/health`
- ✅ Crew rosters: `curl http://localhost:3002/crew/personas`
- ✅ Dashboard startup: `pnpm dev` in `apps/dashboard`

#### Core Engine (1200+ LOC)

**File**: `core/orchestrator.js`

**Implemented Functions**:
- ✅ `runMission(missionSpec)` — Full DDD scaffolding lifecycle
- ✅ `runMissions(batch)` — Batch processing with parallelization
- ✅ `invokeCrewAgent(agentType, task)` — Python CrewAI subprocess spawn
- ✅ `scaffoldDDDComponent(domainName, layer)` — Writes domain/{layer}/ files
- ✅ `recallMemory(query, threshold)` — Supabase vector search + Redis cache
- ✅ `verifyIntegrity(fix)` — Health check all subsystems
- ✅ `getVersionsHierarchy()` — Git history analysis for ADRs

**Health Status**:
```bash
node core/orchestrator.js health_check --fix
# → All systems green (Redis, Supabase, OpenRouter auth)
```

#### MCP HTTP Bridge (350 LOC)

**File**: `apps/api/mcp-http-bridge.mjs`

**10 Exposed Tools**:
1. ✅ `search_code` — Code search via Python unzip-search tool
2. ✅ `run_factory_mission` — Full mission orchestration
3. ✅ `run_batch_missions` — Parallel batch execution
4. ✅ `run_crew_agent` — Single crew agent invocation
5. ✅ `manage_project` — CRUD project metadata
6. ✅ `manage_sprint` — CRUD sprint definitions
7. ✅ `manage_task` — CRUD task tracking
8. ✅ `git_operation` — Commit, branch, push (with shell injection fixes)
9. ✅ `health_check` — System verification
10. ✅ `get_versions_hierarchy` — ADR analysis

**Uptime**: Stateless SSE server, handles 10+ concurrent sessions.

#### Dashboard (React + Next.js 15)

**File**: `apps/dashboard/`

**Implemented Components**:
- ✅ `CrewSelector.tsx` — Multi-select with filtering
- ✅ `TaskLLMPanel.tsx` — Task input + complexity estimation + model tier selector
- ✅ `ObservationLounge.tsx` — 4-pane grid layout for agent output
- ✅ `SovereignAgentViewport.tsx` — Individual agent streaming viewport
- ✅ `CodeExecutionPanel.tsx` — Results summary + cost breakdown
- ✅ `BridgeStatusBar.tsx` — Live bridge health indicator
- ✅ `BridgeSidebar.tsx` — Navigation + session switcher
- ✅ `CrewMemoryBrowser.tsx` — Paginated observation JSON browser
- ✅ `CostOptimizationMonitor.tsx` — Real-time budget tracking

**4-Step Mission Control Flow**:
```
Step 1: CrewSelector              [Select crew + filter by model tier]
   ↓
Step 2: TaskLLMPanel              [Define task + LLM choice + budget]
   ↓
Step 3: ObservationLounge         [Watch agents execute in real-time]
   ↓
Step 4: CodeExecutionPanel        [Review diffs + cost + export]
```

**Startup**: `cd apps/dashboard && pnpm dev` → http://localhost:3000

#### Database Schema (Supabase)

**File**: `core/20240522000000_create_billing_token_usage.sql`

Tables:
- ✅ `missions` — Mission metadata + vector embeddings
- ✅ `observations` — Crew memory observations + cost tracking
- ✅ `billing_token_usage` — Per-model token accounting

RPC Functions:
- ✅ `match_missions(query_embedding, threshold)` — Vector similarity
- ✅ `match_observations(query_embedding, threshold)` — Observation search

#### Python Tools

**tools/** directory:

1. ✅ `crew_manager.py` — CrewAI multi-agent orchestration
2. ✅ `unzip_search_tool.py` — Archive extraction + code search
3. ✅ `youtube_transcript_tool.py` — Transcript ingestion
4. ✅ `memory_alpha_scraper.py` — Star Trek lore ingestion (reference data)

---

### 2.2 What's Partially Built ⚠️

#### VSCode Extension (`apps/vscode/`) — 30% Complete

**File**: `apps/vscode/package.json`

**Implemented**:
- ✅ Extension manifest + activation events configured
- ✅ Contributes: 6 commands registered (`runMission`, `sensorSweep`, etc.)
- ✅ WebView panel structure sketched

**Missing**:
- 🔴 `src/extension.ts` — Main entry point (activate function)
- 🔴 `src/services/MCPClient.ts` — EventSource + SSE integration (critical)
- 🔴 `src/views/SovereignPanel.ts` — React WebView wrapper
- 🔴 `src/commands/` — Command handlers for all 6 commands
- 🔴 Local testing + vsce packaging

**Blocker**: Phase 1 depends 100% on VSCode extension MVP completion.

#### CI/CD Pipeline — 10% Functional

**File**: `main.yml` (at **repo root**, not `.github/workflows/`)

**Critical Issue**: GitHub Actions **will never execute** this file. It must be moved to `.github/workflows/main.yml` to be recognized.

**What's Defined**:
- Node 20 + Python 3.11 matrix build
- `pnpm install` + `pnpm build`
- `docker build` + push to ECR

**What's Broken**:
- 🔴 File location wrong (repo root vs. `.github/workflows/`)
- 🔴 Deploy step is a **non-functional stub** (just comments)
- 🔴 No Vercel deployment step (currently manual)
- 🔴 No AWS ECS deploy step (currently manual)

---

### 2.3 What's Missing or Stubbed 🔴

#### Phase 1 — VSCode Extension MVP (0% Complete)

**Goal**: Make Sovereign Factory accessible from the IDE.

| Step | Status | Gap |
|------|--------|-----|
| p1-s1 | ⚠️ Partial | VSCode scaffolding exists; `src/` directory empty |
| p1-s2 | 🔴 Stub | `MCPClient.ts` service — needs EventSource + SSE polling loop |
| p1-s3 | 🔴 Stub | WebView port of dashboard components |
| p1-s4 | ⚠️ Partial | Commands registered but handlers missing |
| p1-s5 | 🟢 New | Bootstrap Civic Intelligence domain for STL |
| p1-s6 | 🔴 Stub | `vsce package` + marketplace publish |

**Estimated LOC to Complete Phase 1**: ~1500 lines (TypeScript + React)

#### Phase 2 — Monorepo Merge (0% Complete)

**Goal**: Unify `ai-enterprise-os` + `openrouter-crew-platform` into single pnpm workspace.

**Blocked on**: Phase 1 completion. Cannot merge until VSCode extension works end-to-end.

**Tasks**:
- Port `core/orchestrator.js` → TypeScript in `packages/orchestrator`
- Move MCP bridge → `packages/mcp-bridge`
- Extract crew personas → `packages/crew-personas` (shared by ext + dashboard)
- Port unzip-search to TypeScript (eliminate Python subprocess call)
- Wire Turbo pipeline: `turbo run dev` starts everything

#### Phase 3 — n8n + CrewAI Automation (0% Complete)

**Goal**: Enable webhook-triggered workflows + full orchestration via n8n.

**Tasks**:
- Start n8n on `:5678` with imported workflows
- Map n8n webhook → `run_crew_agent` MCP tool
- Wire Socket.io for real-time mission progress
- Run BarItalia end-to-end for <$1.50

#### Phase 4 — Production Deployment (0% Complete)

**Goal**: Multi-cloud deployment (Vercel + AWS ECS).

**Tasks**:
- Multi-stage Docker (Node 20 + Python 3.11)
- `terraform plan` — ECS + ElastiCache + Lambda
- Vercel deploy (alex-dashboard)
- AWS deploy (engine-api + mcp-bridge on Fargate)
- DNS Route53 subdomain routing
- VSCode marketplace publish (`vsce publish`)

---

## Part 3: Functional Execution Gaps

### 3.1 Critical Infrastructure Issues 🔴

#### Issue #1: Hardcoded Absolute Paths in Version-Controlled Script

**File**: `setup_credentials.sh` (root + `apps/api/`)

```bash
ZSHRC="/Users/bradygeorgen/.zshrc"
PROJECT_PATH="/Users/bradygeorgen/Dev/ai-enterprise-os"
```

**Impact**:
- ❌ Any collaborator running this fails immediately (wrong home dir)
- ❌ CI/CD (GitHub Actions) fails
- ❌ Leaks developer's local filesystem layout publicly

**Fix Required**:
```bash
PROJECT_PATH="$(cd "$(dirname "$0")" && pwd)"
ZSHRC="${HOME}/.zshrc"
```

**Priority**: P0 (blocks all deployment and collaboration)

#### Issue #2: Duplicate `setup_credentials.sh` — Canonical Version Unclear

**Files**:
- Root: `/setup_credentials.sh`
- App: `/apps/api/setup_credentials.sh`

**Impact**:
- ❌ README says to run `apps/api/` version
- ❌ Root version also exists — which is source of truth?
- ❌ Both can diverge silently during updates

**Fix Required**:
- Delete root version
- Use `apps/api/setup_credentials.sh` as the single source
- Update all references in README + CI

**Priority**: P0

#### Issue #3: GitHub Actions Workflow in Wrong Directory

**File**: `main.yml` (should be `.github/workflows/main.yml`)

**Impact**:
- ❌ GitHub Actions **never executes** this file
- ❌ CI/CD is completely inert
- ❌ Merges to main bypass all checks

**Fix Required**:
```bash
mkdir -p .github/workflows
mv main.yml .github/workflows/main.yml
```

**Priority**: P0 (CI/CD non-functional)

#### Issue #4: `exec zsh` Kills Parent Shell

**File**: `setup_credentials.sh` (line ~60)

```bash
echo "🚀 Refreshing your shell session..."
exec zsh    # ← Replaces current process; kills CI runner
```

**Impact**:
- ❌ Terminates any parent script or CI pipeline
- ❌ GitHub Actions runner killed mid-execution
- ❌ Manual terminal session hangs

**Fix Required**: Remove `exec zsh`. Use `source ~/.zshrc` or prompt user.

**Priority**: P1

---

### 3.2 Dependency & Version Management Issues 🟡

#### Issue #5: Python Dependencies Unpinned

**Files**: `main.yml` (CI), `tools/requirements-dev.txt`

**Current**: `pip install crewai pydantic` (bare, no versions)

**Impact**:
- ❌ Builds are non-deterministic (any new CrewAI version breaks)
- ❌ Local dev ≠ CI environment
- ❌ Zero reproducibility across machines

**Fix Required**:
```bash
# Add to root:
cat > requirements.txt <<EOF
crewai==0.55.0
pydantic==2.5.0
python-dotenv==1.0.0
ioredis-py==2.0.0
EOF
```

Then: `pip install -r requirements.txt`

**Priority**: P1 (affects reliability)

#### Issue #6: MCP SDK Pre-1.0 (API Instability Risk)

**File**: `package.json`

```json
"@modelcontextprotocol/sdk": "^0.6.0"
```

**Impact**:
- ⚠️ Pre-1.0 means breaking API changes possible
- ⚠️ `^0.6.0` allows jump to `0.7.x` or `0.8.x` with incompatibilities

**Recommendation**:
Lock to exact version: `"@modelcontextprotocol/sdk": "0.6.0"` until 1.0 release.

**Priority**: P2 (monitor)

---

### 3.3 Workspace & Directory Structure Issues 🟡

#### Issue #7: Dangling Workspace Glob

**File**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'  # ← This directory doesn't exist
  - 'domains/*'
  - 'core'
```

**Impact**:
- ⚠️ `pnpm` silently ignores non-existent globs
- ⚠️ Tool confusion (is `packages/` intentional or dead code?)
- ⚠️ Future `packages/` creation won't auto-register

**Fix Required**:
Either:
- Create actual `packages/` directory (for shared utilities like `crew-personas`)
- Or remove the glob from workspace config

**Priority**: P2 (clarification)

#### Issue #8: `tools/` Directory on PATH Without Audit

**File**: `setup_credentials.sh` adds `tools/` to PATH globally

**Impact**:
- ⚠️ No documentation of what executables exist
- ⚠️ No `.gitignore` audit for security
- ⚠️ World-writable binaries would be a privilege escalation vector

**Fix Required**:
- Add `tools/README.md` documenting all executables
- Add `.gitignore` for any generated/built binaries
- Audit Python scripts in `tools/` for input validation

**Priority**: P2 (security posture)

---

### 3.4 Missing Onboarding Documentation 🟡

#### Issue #9: No `.env.example` File

**Current State**: Developers must know all required env vars:
- `OPENROUTER_API_KEY`
- `SUPABASE_URL`, `SUPABASE_KEY`
- `REDIS_URL`, `MCP_BRIDGE_PORT`, `PORT`
- `NEXT_PUBLIC_MCP_URL`
- `PYTHON_BIN` (optional)
- `MODEL_*` overrides (optional, 5 vars)
- Phase 3+: `N8N_PORT`, `N8N_WEBHOOK_SECRET`
- Phase 4: `AWS_REGION`, `AWS_PROFILE`, `ECR_REPO`, `ECS_*`, `NEXT_PUBLIC_MCP_URL_PROD`

**Impact**:
- ❌ New developers waste 30 min guessing required vars
- ❌ No way to know which vars are optional
- ❌ IDE autocomplete doesn't help

**Fix Required**:
```bash
cat > .env.example <<EOF
# Core (required)
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=ey-YOUR_ANON_KEY
REDIS_URL=redis://127.0.0.1:6379
MCP_BRIDGE_PORT=3002
PORT=3001

# Dashboard
NEXT_PUBLIC_MCP_URL=http://localhost:3002

# Optional
PYTHON_BIN=/path/to/.venv/bin/python3
MODEL_ANALYST=google/gemini-flash-1.5
# ... etc

# Phase 4+ (production)
AWS_REGION=us-east-1
# ... etc
EOF
```

**Priority**: P2 (improves DX)

---

### 3.5 Testing & Quality Gaps 🟡

#### Issue #10: MCP Tools Lack Integration Tests

**Current**: `core/orchestrator.test.js` has unit tests only

**Missing**:
- ❌ End-to-end test of full MCP tool → orchestrator → Supabase flow
- ❌ Test that `run_factory_mission` actually scaffolds domain files
- ❌ Crew agent failure recovery tests
- ❌ Cost calculation validation

**Fix Required**:
Add integration test suite:
```bash
vitest apps/dashboard app/api/mcp/execute/route.test.ts
```

**Priority**: P2 (catches regressions)

#### Issue #11: No ADR Schema Validation

**File**: `versions/` contains decision records

**Impact**:
- ⚠️ Analyst agent depends on ADR quality
- ⚠️ No machine-parseable format spec
- ⚠️ Analyst can fail silently on malformed ADRs

**Fix Required**:
Add JSON Schema validator in CI:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "status": { "enum": ["proposed", "accepted", "deprecated"] },
    "context": { "type": "string" },
    "decision": { "type": "string" },
    "consequences": { "type": "string" }
  },
  "required": ["title", "date", "status", "context", "decision"]
}
```

**Priority**: P3 (nice-to-have)

---

### 3.6 Feature Gaps 🔴

#### Gap #1: No Live Streaming (Currently Polling)

**Status**: `SovereignAgentViewport.tsx` polls `/api/lounge/observations` every 2s

**Impact**:
- ⚠️ 2s latency before operator sees agent output
- ⚠️ Scales poorly with many concurrent sessions
- ⚠️ Wastes bandwidth on empty polls

**Solution**: Implement WebSocket or Server-Sent Events (SSE) in dashboard:

```typescript
// apps/dashboard/app/api/mcp/stream/route.ts
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to crew-memories changes
      const { data, error } = await supabase
        .from('observations')
        .on('*', (payload) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        })
        .subscribe();
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Priority**: P1 (improves UX significantly)

#### Gap #2: No Cost Accumulation Per Session

**Status**: Individual agent costs calculated, but session totals not summed

**Impact**:
- ⚠️ Operator can't see total mission cost until after completion
- ⚠️ No budget circuit breaker to stop expensive missions

**Solution**:
```typescript
// apps/dashboard/app/page.tsx
const [sessionCost, setSessionCost] = useState(0);

// After each agent completes:
setSessionCost(prev => prev + agentCost);

// Budget guard:
if (sessionCost > budgetLimit) {
  await orchestrator.cancelMission(missionId);
}
```

**Priority**: P1 (critical for cost control)

#### Gap #3: No Webhook Integration with n8n

**Status**: n8n is documented but not wired to platform

**Impact**:
- ❌ Can't trigger missions from external systems (Slack, scheduled tasks, etc.)
- ❌ No audit trail of external invocations

**Solution**: Implement Phase 3 webhook handler:

```typescript
// apps/dashboard/app/api/n8n/trigger/route.ts
import crypto from 'crypto';

export async function POST(req: Request) {
  const signature = req.headers.get('X-N8N-Signature');
  const body = await req.text();
  
  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (hash !== signature) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Invoke mission
  const payload = JSON.parse(body);
  const result = await orchestrator.runMission(payload);
  return Response.json(result);
}
```

**Priority**: P3 (Phase 3 feature)

#### Gap #4: No Vercel/AWS Deployment Controls in Dashboard

**Status**: Deployment scripts exist but not exposed in UI

**Impact**:
- ❌ Operators must use CLI to deploy
- ❌ No pre-flight checks in UI
- ❌ No deployment history visible

**Solution**: Add Phase 4 panel:

```typescript
// apps/dashboard/components/DeploymentPanel.tsx
export function DeploymentPanel() {
  return (
    <div>
      <h2>Deployment</h2>
      <button onClick={() => deploy('vercel')}>
        Deploy Dashboard to Vercel
      </button>
      <button onClick={() => deploy('aws')}>
        Deploy API to AWS ECS
      </button>
      <button onClick={() => deploy('vsce')}>
        Publish to VSCode Marketplace
      </button>
    </div>
  );
}
```

**Priority**: P3 (Phase 4 feature)

---

## Part 4: Functional Readiness Matrix

### By Component

| Component | Phase | Status | Blocker? |
|-----------|-------|--------|----------|
| Orchestrator | 0 | ✅ 100% | No |
| MCP Bridge | 0 | ✅ 100% | No |
| Dashboard UI | 1 | ⚠️ 80% | **YES** |
| VSCode Extension | 1 | 🔴 30% | **YES** |
| Python Tools | 0 | ✅ 100% | No |
| Database | 0 | ✅ 100% | No |
| CI/CD | 0 | 🔴 10% | **YES** |
| n8n Integration | 3 | 🔴 0% | No (Phase 3) |
| Production Deploy | 4 | 🔴 0% | No (Phase 4) |

### By Phase

| Phase | Target | Complete | Blockers | ETA |
|-------|--------|----------|----------|-----|
| 0 | Foundation | ✅ 100% | None | ✅ Done |
| 1 | VSCode MVP | ⚠️ 30% | MCPClient.ts, WebView | 1–2 weeks |
| 2 | Monorepo Merge | 🔴 0% | Phase 1 completion | 2–3 weeks |
| 3 | n8n Automation | 🔴 0% | Phase 2 completion | 3–4 weeks |
| 4 | Production | 🔴 0% | Phase 3 completion | 4–6 weeks |

---

## Part 5: Priority Roadmap

### Immediate (This Week)

**P0 Fixes** (blocking everything):

1. **Fix hardcoded paths** in `setup_credentials.sh`
   - Effort: 15 min
   - Impact: Unblock CI/CD and collaboration

2. **Move `main.yml` to `.github/workflows/`**
   - Effort: 5 min
   - Impact: Enable GitHub Actions

3. **Canonicalize credential script** (delete root copy)
   - Effort: 10 min
   - Impact: Reduce confusion, single source of truth

4. **Remove `exec zsh`** from setup script
   - Effort: 5 min
   - Impact: Unblock CI/CD

**Estimated Time**: 35 min total

---

### Short-Term (Next 1–2 Weeks)

**Phase 1 — VSCode Extension MVP**:

1. Implement `src/extension.ts` (main entry point)
   - Effort: 300 LOC
   - Time: 4–6 hours

2. Implement `src/services/MCPClient.ts` (SSE integration)
   - Effort: 400 LOC
   - Time: 6–8 hours

3. Port dashboard components to WebView
   - Effort: 400 LOC
   - Time: 6–8 hours

4. Implement command handlers
   - Effort: 300 LOC
   - Time: 4–6 hours

5. Local testing + `vsce package`
   - Effort: 200 LOC
   - Time: 3–4 hours

**Subtotal**: ~1600 LOC, ~25 hours of focused work

---

### Medium-Term (2–4 Weeks)

**Phase 2 — Monorepo Merge**:

1. Port `core/orchestrator.js` to TypeScript
   - Effort: 1500 LOC (same logic, typed)
   - Time: 12–16 hours

2. Extract shared `packages/`
   - Effort: 300 LOC
   - Time: 3–4 hours

3. Port unzip-search to TypeScript
   - Effort: 500 LOC
   - Time: 6–8 hours

4. Wire Turbo pipeline
   - Effort: 200 LOC
   - Time: 2–3 hours

**Subtotal**: ~2500 LOC, ~23–31 hours

---

### Long-Term (4+ Weeks)

**Phases 3–4**:

- Phase 3 (n8n + CrewAI): ~20–30 hours
- Phase 4 (Production Deploy): ~20–30 hours

---

## Part 6: Recommendations

### For Immediate Impact

1. **Fix all P0 issues this week** — Unblocks everything downstream
   - 35 min of work
   - Enables team collaboration
   - Enables CI/CD automation

2. **Pin Python dependencies** — Ensures reproducibility
   - 15 min of work
   - Add `requirements.txt` to root
   - Update CI to use it

3. **Add `.env.example`** — Improves onboarding
   - 20 min of work
   - Save developers 30 min each

### For Strategic Progress

1. **Prioritize Phase 1 (VSCode Extension)** — This is the critical blocker
   - 25 hours of focused work
   - Enables Phase 2 (monorepo merge)
   - Makes system accessible from IDE

2. **Consider outsourcing or pair-programming Phase 1**
   - Component porting is formulaic
   - MCPClient.ts is the trickiest part (SSE integration)
   - Could be completed in 1 week with focus

3. **Establish clear definition of "Phase 1 Complete"**
   - VSCode extension loads without errors
   - Can invoke `runMission` from extension
   - Mission executes end-to-end
   - Smoke test passes

### For Long-Term Health

1. **Establish ADR schema validation** in CI
   - Protects Analyst agent from malformed inputs
   - Takes 30 min to implement

2. **Add integration tests for MCP tools**
   - End-to-end test of mission flow
   - Catches regressions early
   - Worth ~2 hours investment

3. **Implement live streaming (WebSocket/SSE)** in dashboard
   - Improves UX significantly
   - Takes ~4 hours
   - High ROI on user satisfaction

---

## Summary

### Current State
- ✅ **Core engine is production-ready** (orchestrator, MCP bridge, database)
- ⚠️ **UI layer is 80% complete** (dashboard mostly done, VSCode extension 30% done)
- 🔴 **Infrastructure has critical issues** (hardcoded paths, CI/CD broken, missing docs)
- 🔴 **Phases 1–4 blocked** on VSCode extension MVP completion

### Critical Path to MVP
1. Fix P0 infrastructure issues (35 min)
2. Complete Phase 1 VSCode extension (25 hours)
3. Run Phase 2 monorepo merge (25–30 hours)
4. Deploy to production (Phase 4, 20–30 hours)

### Total Estimate to Production
**~70–90 hours of focused development** (2–3 weeks full-time)

### Key Insight
The **vision is sound** and the **core system is solid**. The bottleneck is **UI/component implementation**, not architecture. With focused effort on Phase 1, the entire platform unblocks and can progress rapidly to production.

---

**Generated**: May 15, 2026 | **Repository**: github.com/familiarcat/ai-enterprise-os
