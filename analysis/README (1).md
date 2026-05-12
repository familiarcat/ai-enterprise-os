# AI Enterprise OS: The Sovereign Factory

> **A Living, Operational Multi-Agent Enterprise Platform**  
> Domain-Driven Design + Active Memory + 10+ Crew Personas + Real Business Domains

---

## 🎯 What This Actually Is

The **Sovereign Factory** isn't a theoretical framework anymore. It's a **live system** where:

- ✅ **10+ crew members** actively make observations (200+ for Worf alone)
- ✅ **Memory system** is operational—crew learns from observations in real-time
- ✅ **Neural pruning** happens automatically (irrelevant memories fade)
- ✅ **Multiple apps** deployed: API server, Next.js dashboard, VS Code extension
- ✅ **Real business domains**: ads, fund, outbound, revenue, seo
- ✅ **Constitution-governed**: Rules written in `PLATFORM_CONSTITUTION.md`
- ✅ **Phases executed** in sequence (phase-0 through phase-2, archival phases 3-7)
- ✅ **Observation lounge** where crew members report status and insights

---

## 👥 The Expanded Crew (10+ Personas)

The team grew beyond the original 5. Now operating:

### Strategic Layer
- **Captain Picard** – Strategic decision-maker, long-term vision
- **Counselor Troi** – Health/wellness monitoring, team morale
- **Quark** – Business/ROI perspective, profitability analysis

### Operational Layer
- **Commander Riker** – Development execution, tactical decisions
- **Commander Data** – Architecture analysis, code quality
- **Lt. Worf** – Security enforcement, threat assessment (200+ observations)
- **Chief O'Brien** – Systems integration, operations
- **Geordi La Forge** – Infrastructure, performance engineering

### Support Layer
- **Dr. Crusher** – System health, oversight, debugging
- **Lt. Uhura** – Communications, external integration
- **Tasha Yar** – Protocols, compliance enforcement

Each persona has a **live memory file** in `crew-memories/active/`:
```
observation-TIMESTAMP-persona-name.json
```

Example: `observation-1778111257-lt-worf.json` contains Worf's latest security observations.

---

## 🧠 The Active Memory System

### How It Works

1. **Crew Observes** – Each persona makes decisions, records observations
2. **Observations Stored** – JSON files in `crew-memories/active/`
3. **Neural Pruning** – `neural-pruning.js` removes outdated/irrelevant memories
4. **Learning** – Future decisions informed by past observations
5. **Timestamp-Based** – Observations timestamped (Unix milliseconds)

### Key Files

| File | Purpose |
|------|---------|
| `core/neural-pruning.js` | Removes old/irrelevant observations |
| `crew-memories/active/` | Live observation store (200+ files) |
| `core/MissionService.js` | Records mission observations |
| `core/MissionSubscriber.js` | Subscribes to mission events, stores memories |

### Example Observation (Worf Security Check)

```json
{
  "timestamp": 1778111257000,
  "persona": "lt-worf",
  "type": "security-audit",
  "observations": {
    "allowlist": ["figma_mcp", "github_mcp"],
    "violations_found": 0,
    "confidence": 0.98
  },
  "recommendation": "Clearance approved"
}
```

---

## 🏗️ The Real Architecture

### Apps (4 Deployable Services)

#### 1. **api** (Core MCP Server)
```
apps/api/
├── mcp-server.js          # MCP protocol handler
├── mcp-http-bridge.mjs    # HTTP ↔ MCP bridge
├── index.js               # Express server
├── server.js              # Server startup
├── MissionSubscriber.js    # Event listener
├── worf-ddd-audit.js      # DDD validation
└── Dockerfile             # Container image
```

**Responsibilities:**
- Exposes crew tools via MCP protocol
- HTTP bridge for non-MCP clients
- Mission event handling
- DDD compliance validation

#### 2. **dashboard** (Next.js Frontend)
```
apps/dashboard/
├── app/                   # Next.js app directory
├── components/            # React components
├── lib/                   # Utilities
├── package.json
├── tailwind.config.ts     # Styling
└── tsconfig.json
```

**What it shows:**
- Real-time crew observations
- Mission status
- Revenue/business metrics
- System health

#### 3. **vscode** (Extension - TypeScript)
```
apps/vscode/
├── src/                   # TypeScript source
├── App.tsx               # Main React app
├── webpack.config.js     # Bundling
├── package.json
└── README.md
```

**Features:**
- Access crew from VS Code
- Run missions
- View observations
- Integrated MCP client

#### 4. **platform** (Web App)
```
apps/platform/
└── index.html            # Landing page
```

---

## 📊 The Real Domains (Business Logic)

Unlike examples, these are **actual working domains**:

### domains/ads/
- Advertising system integration
- Campaign management
- Performance tracking

### domains/fund/
- Financial operations
- Investment tracking
- Fund management engine

### domains/outbound/
- Outbound communication
- Message queuing
- Delivery status

### domains/revenue/
- Revenue calculations
- Billing integration
- Payment processing

### domains/seo/
- Search optimization
- Meta-tag generation
- Content indexing

Each domain has an `index.js` with business logic.

---

## 🚀 The Phase Structure (What Gets Deployed When)

### Phase 0: Foundation
```bash
scripts/phase-0/p0-run-all.sh
```

**What happens:**
1. Secrets synchronization
2. Supabase configuration
3. Environment validation
4. Redis health check
5. Database migrations
6. MCP bridge startup
7. Dashboard wiring
8. Smoke tests

**Files touched:**
- `core/docker-compose.yml` – Database stack
- Database migrations (`.sql` files)
- Environment setup

### Phase 1: Extension Bootstrap
```bash
scripts/phase-1/p1-run-all.sh
```

**What happens:**
1. VS Code extension initialization
2. MCP client setup
3. Webview port configuration
4. Extension commands registration
5. Command execution (`runMission.ts`)
6. Civic dashboard integration
7. VSCE packaging

### Phase 2: Monorepo Orchestration
```bash
scripts/phase-2/p2-run-all.sh
```

**What happens:**
1. Platform cloning
2. Protocol mapping
3. Orchestrator packaging
4. MCP bridge packaging
5. Crew personas packaging
6. Turbo pipeline setup

### Archive Phases (3-7)
Historical phases stored in `scripts/archive/` for reference.

---

## 🛠️ Real Tools (Python-Based)

### tools/crew_manager.py
```
Usage: Manage crew personas, load/save observations
Inputs: Persona name, action (create, update, observe)
Outputs: Crew state, updated observations
```

### tools/memory_alpha_scraper.py
```
Usage: Scrape Memory Alpha (Star Trek wiki)
Purpose: Populate crew backstories, rules
Outputs: Crew context, historical references
```

### tools/unzip_search_tool.py
```
Usage: Ingest and search repository archives
Purpose: Codebase indexing, reference retrieval
Outputs: Searchable codebase index
```

### tools/youtube_transcript_tool.py
```
Usage: Extract YouTube transcripts
Purpose: Crew learning from videos, knowledge capture
Outputs: Structured transcript data
```

---

## 🎯 The Mission Flow

### 1. User Requests Mission
```
"Create a revenue report for Q3"
```

### 2. Picard Receives (orchestrator.js)
```javascript
const mission = {
  goal: "Create revenue report",
  persona: "captain-picard",
  complexity: 0.75,
  timestamp: Date.now()
};
```

### 3. MissionService Processes
```javascript
// core/MissionService.js
const result = await missionService.executeMission(mission);
```

### 4. Event Published
```javascript
// Mission completion triggers subscriber
emit('mission:completed', { mission, result, observations });
```

### 5. MissionSubscriber Records
```javascript
// core/MissionSubscriber.js
await memoryStore.save({
  persona: mission.persona,
  observation: { goal, result, learning },
  timestamp
});
```

### 6. Crew Learns
```javascript
// Neural pruning removes old observations
await neuralPruning.prune({
  maxAge: '30d',
  maxMemories: 1000
});
```

---

## 📝 Constitution & Governance

### PLATFORM_CONSTITUTION.md
Defines:
- Core principles
- Decision-making rules
- Crew authorities
- Conflict resolution
- Amendment process

### CREW_MANIFEST.md
Lists:
- All 10+ personas
- Responsibilities
- Authority levels
- Tools available
- Escalation rules

### Pre-Commit Security
```javascript
// apps/api/worf-ddd-audit.js
Validates on commit:
- DDD layer compliance
- No direct domain↔infrastructure calls
- No circular dependencies
- No secrets in code
```

---

## 🔍 Observation Lounge (Crew Monitoring)

Monitor crew status and insights:

```bash
# See what the crew observed
scripts/lounge/crew-roll-call.sh

# Get security report
scripts/lounge/worf-security-report.sh

# Get architecture analysis
scripts/lounge/data-architecture-report.sh

# Get integration status
scripts/lounge/obrien-integration-report.sh

# Make observations
scripts/lounge/crew-observe.sh
```

---

## 🗄️ Database Schema

### Missions Table
```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  goal VARCHAR NOT NULL,
  persona VARCHAR NOT NULL,
  status VARCHAR,
  complexity FLOAT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Billing/Token Usage
```sql
CREATE TABLE billing_token_usage (
  id UUID PRIMARY KEY,
  persona VARCHAR,
  tokens_used INT,
  cost DECIMAL,
  timestamp TIMESTAMP
);
```

Both live in `core/` and are migrated during Phase 0.

---

## 💻 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/familiarcat/ai-enterprise-os
cd ai-enterprise-os
pnpm install
```

### 2. Phase 0: Foundation
```bash
cd scripts/phase-0
./p0-run-all.sh
```

Sets up Redis, Supabase, environment.

### 3. Phase 1: VS Code Extension
```bash
cd scripts/phase-1
./p1-run-all.sh
```

Builds and packages the extension.

### 4. Phase 2: Monorepo
```bash
cd scripts/phase-2
./p2-run-all.sh
```

Orchestrates all apps with Turbo.

### 5. Check Crew Status
```bash
scripts/lounge/crew-roll-call.sh
```

See what crew members are doing.

---

## 📊 System Stats

| Metric | Value |
|--------|-------|
| Crew Members | 10+ personas |
| Observations Stored | 150+ active |
| Apps Deployed | 4 (API, dashboard, extension, platform) |
| Business Domains | 5 (ads, fund, outbound, revenue, seo) |
| Phases | Phase 0-2 active, 3-7 archived |
| Memory Files | crew-memories/active/ |
| Constitution Sections | Governance rules |
| Tools | 4 Python-based |
| Database Tables | 2+ with migrations |

---

## 🔐 Security (Worf's Domain)

- Pre-commit audits ensure DDD compliance
- MCP allowlist blocks unauthorized tools
- Mission tracking for accountability
- Observation logging for audit trails
- Constitution enforcement

---

## 🎓 Key Concepts

### Domain-Driven Design
Each domain (ads, revenue, etc.) has clean boundaries:
- No direct infrastructure calls from domain logic
- Repositories implement interfaces
- Application layer orchestrates

### Crew-Based Decision Making
- Strategic (Picard) vs Tactical (Riker)
- Specialists (Data, Worf, Geordi) provide input
- Decisions recorded as observations
- Team learns from patterns

### Active Learning
- Observations stored in real-time
- Neural pruning removes outdated memories
- Future missions informed by past
- Evolution through experience

---

## 📚 Next Steps

1. **Read** `PLATFORM_CONSTITUTION.md` – Understand the rules
2. **Read** `CREW_MANIFEST.md` – Meet the team
3. **Run** Phase 0 – Set up foundation
4. **Run** Phase 1 – Build extension
5. **Run** Phase 2 – Orchestrate all apps
6. **Check** `scripts/lounge/` – Monitor crew

---

**Made with ❤️ for autonomous enterprise teams**

**Sovereign Factory • May 2026 • Brady Georgen (@familiarcat)**
