# Architecture Guide: Sovereign Factory Live System

## System Map

```
┌─────────────────────────────────────────────────────┐
│ Crew Members (10+)                                  │
│ Living in crew-memories/active/                    │
│ Captain Picard, Worf, Data, Riker, etc.            │
└─────────────┬───────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────┐
│ apps/api/mcp-server.js                             │
│ ├─ MCP Protocol Handler                            │
│ ├─ HTTP Bridge (mcp-http-bridge.mjs)              │
│ ├─ Mission Event Subscriber                        │
│ └─ DDD Audit (worf-ddd-audit.js)                  │
└────┬──────────────────────────────────────┬────────┘
     │                                      │
     ↓                                      ↓
┌──────────────────┐          ┌──────────────────────┐
│ apps/dashboard   │          │ apps/vscode          │
│ (Next.js)        │          │ (Extension)          │
│ ├─ Crew status   │          │ ├─ Run missions      │
│ ├─ Observations  │          │ ├─ View crew         │
│ └─ Metrics       │          │ └─ Integrated MCP    │
└──────────────────┘          └──────────────────────┘
     ↑                                      ↑
     └──────────────────┬───────────────────┘
                        │
                        ↓
        ┌───────────────────────────────┐
        │ core/                         │
        ├─ orchestrator.js              │
        ├─ crew-manifest.js             │
        ├─ MissionService.js            │
        ├─ MissionSubscriber.js         │
        ├─ neural-pruning.js            │
        └─ Memory system                │
        └───────────────────────────────┘
                        │
                        ↓
        ┌───────────────────────────────┐
        │ domains/                      │
        ├─ ads/                         │
        ├─ fund/                        │
        ├─ revenue/                     │
        ├─ outbound/                    │
        └─ seo/                         │
        └───────────────────────────────┘
                        │
                        ↓
        ┌───────────────────────────────┐
        │ Supabase + Redis              │
        ├─ Missions table               │
        ├─ Billing table                │
        └─ Cache layer                  │
        └───────────────────────────────┘
```

## Core Components Deep Dive

### 1. orchestrator.js (The Brain)

**What it does:**
- Receives mission requests
- Selects appropriate crew member
- Tracks mission progress
- Handles completion/failure

**Key methods:**
```javascript
orchestrator.executeMission(goal)
orchestrator.selectPersona(complexity)
orchestrator.trackProgress(missionId)
```

### 2. crew-manifest.js (Team Registry)

**Defines:**
- 10+ personas with attributes
- Tools available to each
- Authority levels
- Specialization areas

**Example:**
```javascript
{
  'lt-worf': {
    role: 'Security Officer',
    tools: ['validate-ddd', 'security-audit'],
    authority: 'veto',
    specialization: 'governance'
  }
}
```

### 3. MissionService.js (Mission Orchestration)

**Handles:**
```javascript
const mission = {
  id: UUID,
  goal: string,
  persona: string,
  complexity: number,
  status: 'pending|executing|completed|failed',
  result?: object,
  createdAt: timestamp,
  completedAt?: timestamp
};
```

**Process:**
1. Create mission
2. Validate DDD compliance
3. Route to persona
4. Execute
5. Publish event

### 4. MissionSubscriber.js (Event Listener)

**Listens for:**
```
mission:created
mission:executing
mission:completed
mission:failed
```

**On event:**
1. Extract observations
2. Create memory record
3. Store in crew-memories/active/
4. Trigger neural pruning if needed

### 5. neural-pruning.js (Memory Management)

**Removes:**
- Observations older than X days
- Duplicates
- Irrelevant patterns
- Low-confidence data

**Keeps:**
- Recent observations
- High-value patterns
- Key decisions
- Learning trends

---

## Phase Structure (Deployment)

### Phase 0: Foundation
```bash
scripts/phase-0/p0-run-all.sh
```

**Steps:**
1. **p0-s0-secrets-sync.sh** → Load env secrets
2. **p0-s1-env-check.sh** → Validate config
3. **p0-s2-redis-ping.sh** → Check Redis
4. **p0-s3-supabase-check.sh** → Validate DB
5. **p0-s3b-supabase-migrate.sh** → Run migrations
6. **p0-s4-bridge-start.sh** → Start HTTP bridge
7. **p0-s5-dashboard-wire.sh** → Connect dashboard
8. **p0-s6-smoke-test.sh** → Verify working
9. **p0-s9-project-summary-seed.sh** → Initialize

**Database created:**
```
missions (from scripts/20240414000000_create_missions_table.sql)
billing_token_usage (from core/20240522000000_create_billing_token_usage.sql)
```

### Phase 1: Extension Bootstrap
```bash
scripts/phase-1/p1-run-all.sh
```

**Steps:**
1. **p1-s1-vscode-bootstrap.sh** → Compile extension
2. **p1-s2-mcp-client.sh** → Setup MCP client
3. **p1-s3-webview-port.sh** → Configure webview
4. **p1-s4-ext-commands.sh** → Register commands
5. **p1-s5-civic-bootstrap.sh** → Dashboard setup
6. **p1-s5-vsce-package.sh** → Package extension

**Output:** Packaged VS Code extension ready to install.

### Phase 2: Monorepo Orchestration
```bash
scripts/phase-2/p2-run-all.sh
```

**Steps:**
1. **p2-s1-clone-platform.sh** → Clone all apps
2. **p2-s1-protocol-mapping.sh** → Map MCP protocol
3. **p2-s2-pkg-orchestrator.sh** → Package core
4. **p2-s3-pkg-mcp-bridge.sh** → Package bridge
5. **p2-s4-pkg-crew-personas.sh** → Package crew
6. **p2-s5-turbo-pipeline.sh** → Setup Turbo build

**Orchestration:** Turbo manages parallel builds.

---

## Apps & Entry Points

### API Server
```
apps/api/index.js (Express server)
   └─ Starts on port (configurable)
   └─ Loads mcp-server.js
   └─ Loads mcp-http-bridge.mjs
   └─ Subscribes to missions
```

### Dashboard
```
apps/dashboard/app/
   └─ Next.js server on port 3001
   └─ Displays real-time crew status
   └─ Shows observations
   └─ Displays metrics
```

### VS Code Extension
```
apps/vscode/App.tsx (React component)
   └─ Webpack bundles to apps/vscode/dist/
   └─ Loads as VS Code extension
   └─ Commands registered in package.json
   └─ Webview communicates with MCP server
```

---

## Real Business Domains

### domains/ads/index.js
```javascript
// Advertising system
- Campaign management
- Performance tracking
- Budget allocation
```

### domains/fund/engine.js
```javascript
// Financial operations
- Fund calculations
- Investment tracking
- Profitability analysis
```

### domains/revenue/engine.js
```javascript
// Revenue system
- Billing integration
- Payment processing
- Invoice generation
```

### domains/outbound/index.js
```javascript
// Communication
- Message queuing
- Delivery tracking
- Notification handling
```

### domains/seo/index.js
```javascript
// Search optimization
- Meta-tag generation
- Content indexing
- Ranking tracking
```

---

## Memory Architecture

### Observation File Format
```
crew-memories/active/
├── observation-TIMESTAMP-PERSONA.json
└── Example: observation-1778111257-lt-worf.json

{
  "timestamp": 1778111257000,
  "persona": "lt-worf",
  "type": "security-audit|architecture|metrics|etc",
  "subject": "mission-xyz or domain-ads",
  "observations": {
    "key": "value",
    ...
  },
  "confidence": 0.98,
  "actionable": true
}
```

### Lifecycle
```
1. Mission executes
2. MissionSubscriber captures result
3. Creates observation JSON
4. Stores in crew-memories/active/
5. Next day: neural-pruning.js runs
6. Old/irrelevant removed
7. Future missions use remaining observations
```

---

## Security (Worf's Domain)

### Pre-Commit Audit
```
apps/api/worf-ddd-audit.js runs on:
├─ DDD layer compliance
├─ No circular dependencies
├─ No hardcoded secrets
├─ No direct domain→infrastructure calls
└─ Blocks commit if violations found
```

### Mission Validation
```
Before executing mission:
├─ Worf checks persona clearance
├─ Validates tool allowlist
├─ Confirms resource access
└─ Records audit trail
```

### Constitution Enforcement
```
PLATFORM_CONSTITUTION.md defines:
├─ Decision rules
├─ Authority hierarchy
├─ Conflict resolution
└─ Amendment process
```

---

## Tools (Python-Based)

### crew_manager.py
```
Manages crew personas:
- Load crew configuration
- Update observations
- Query crew memory
- Export crew state
```

### memory_alpha_scraper.py
```
Scrapes Star Trek wiki:
- Character backstories
- Ship systems
- Protocols
- Learning material
```

### unzip_search_tool.py
```
Archives and search:
- Indexes codebase
- Searchable snapshots
- Diff analysis
- Codebase archaeology
```

### youtube_transcript_tool.py
```
Video learning:
- Extracts transcripts
- Structures knowledge
- Indexes for search
- Crew consumption
```

---

## Deployment Artifacts

### Docker
```
apps/api/Dockerfile (container)
core/docker-compose.yml (stack)
├─ Supabase
├─ Redis
└─ API service
```

### Turbo Build
```
turbo.json (build config)
├─ Parallel builds
├─ Dependency graph
└─ Caching strategy
```

### pnpm Workspace
```
pnpm-workspace.yaml
├─ apps/*
├─ packages/*
├─ core/*
└─ tools/*
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `core/orchestrator.js` | Mission orchestration |
| `core/crew-manifest.js` | Persona definitions |
| `core/MissionService.js` | Mission execution |
| `core/MissionSubscriber.js` | Event handling |
| `core/neural-pruning.js` | Memory management |
| `apps/api/mcp-server.js` | MCP protocol |
| `apps/api/worf-ddd-audit.js` | Security validation |
| `crew-memories/active/` | Live memory store |
| `PLATFORM_CONSTITUTION.md` | Governance |
| `CREW_MANIFEST.md` | Team registry |

---

**Architecture is living. System evolves. Crew learns.**
