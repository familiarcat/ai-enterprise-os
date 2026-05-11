# Architecture Guide: Sovereign Factory Structure

## The Map: How Everything Connects

```
┌─────────────────────────────────────────────────────────────────┐
│ User / Human / External Agent (Claude Desktop, Cursor, etc.)    │
└────────────────────┬────────────────────────────────────────────┘
                     │ (MCP Protocol)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ apps/api/mcp-server.js                                          │
│ ├─ Exposes all tools via MCP 2026 SDK                          │
│ └─ Routes to core framework                                    │
└────────────┬──────────────────────────────────────────────────┘
             │
             ├──────────────────┬──────────────────┬──────────────────┐
             ↓                  ↓                  ↓                  ↓
    ┌─────────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐
    │ PICARD          │ │ DATA         │ │ WORF       │ │ RIKER        │
    │ Orchestrator    │ │ Architect    │ │ Security   │ │ Executor     │
    │ core/         │ │ core/        │ │ core/      │ │ core/        │
    │ orchestrator/ │ │ scaffold/    │ │ mcp-       │ │ orchestrator/│
    │              │ │ analyze-     │ │ manifest/  │ │ executor.js  │
    │              │ │ history.js   │ │ worf-gate  │ │              │
    └────────┬──────┘ └──────┬───────┘ └──────┬─────┘ └────┬─────────┘
             │                │               │             │
             └────────────────┼───────────────┼─────────────┘
                              │               │
                              ↓               ↓
                    ┌──────────────────────────────────┐
                    │ domains/                         │
                    │ ├─ [bounded-context]/            │
                    │ │  ├─ domain/                   │
                    │ │  ├─ application/              │
                    │ │  │  └─ mcp-tools/            │
                    │ │  ├─ infrastructure/           │
                    │ │  └─ ui/                       │
                    │ └─ [more contexts...]          │
                    └──────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────────────────────┐
                    │ Execution Layer                  │
                    │ ├─ Claude (Opus/Sonnet/Haiku)   │
                    │ ├─ Gemini                        │
                    │ └─ Other LLMs (via OpenRouter)  │
                    └──────────────────────────────────┘
```

---

## The Five Core Modules

### 1. **core/orchestrator/** (Picard's Brain)

**Files:**
- `planner.js` – Breaks goals into missions
- `executor.js` – Executes missions step-by-step
- `state-machine.js` – Tracks progress

**What Happens:**
```javascript
// User: "Scaffold a payment-processing domain"
const mission = await orchestrator.planMission(goal);

// Internally asks crew:
data.analyze(goal);
worf.assessRisks(goal);
geordi.checkCapacity(goal);
riker.planExecution(goal);

// Picard synthesizes → Sends mission to Riker
```

**Complexity Routing:**
- High complexity (0.7–1.0) → Picard uses **Opus**
- Routes analysis to Data (0.3–0.7) → Uses **Sonnet**
- Routes execution to Riker (0.0–0.3) → Uses **Haiku**

---

### 2. **core/router/** (Brain Wiring)

**Files:**
- `complexity-scorer.js` – Computes task complexity (0–1)
- `model-selector.js` – Maps complexity → model

**How It Works:**
```javascript
const complexity = scorer.compute({
  inputTokens: 2000,
  requiresReasoning: true,
  domainSpecificity: 0.5
});
// Returns: 0.52 → SELECT SONNET

// Score ranges:
// 0.0–0.3 → Haiku
// 0.3–0.7 → Sonnet
// 0.7–1.0 → Opus
```

**Cost Impact:**
- Without routing: Everything uses Opus ($15/1M tokens)
- With routing: Mix of Haiku ($0.80), Sonnet ($3), Opus ($15)
- **Result: 60-80% cost savings**

---

### 3. **core/crew-manifest/** (Team Definition)

**Files:**
- `personas.json` – All 5 personas with:
  - Role & responsibilities
  - System prompt (behavior guidelines)
  - Allowed tools
  - Escalation rules
- `[persona]-prompt.md` – Detailed system prompts

**Example Persona:**
```json
{
  "picard": {
    "role": "Orchestrator",
    "emoji": "🎓",
    "expertise": "Strategic planning, synthesis",
    "authority": "Final decision maker",
    "systemPrompt": "You are Picard...",
    "allowedTools": ["all_for_planning"],
    "complexityBand": "0.7-1.0",
    "escalationRules": "Only escalate to humans if uncertain"
  }
}
```

---

### 4. **core/mcp-manifest/** (Security & Registry)

**Files:**
- `worf-gate.js` – Security validation engine
- `allowlist.yaml` – Tool registry & permissions

**Worf's Job:**
```
Before any MCP tool call:
  1. Is persona recognized? → YES
  2. Is tool allowlisted? → YES
  3. Does persona have clearance? → YES
  4. Is resource valid? → YES
     ↓
  ALL YES → Tool executes, audit logged
  ANY NO → Tool blocked, reason given
```

**Allowlist Example:**
```yaml
mcp_allowlist:
  - server: figma_mcp
    tools: [figma_create_frame, figma_query_page]
    personas: [Picard, Riker]
    rateLimit: 100/hour
    audit: true
```

---

### 5. **domains/** (Where Business Logic Lives)

**Structure of Each Domain:**
```
domains/[domain-name]/
├── domain/                      # ZERO dependencies
│   ├── models/                  # Entities, Value Objects
│   ├── services/                # Business logic services
│   ├── repositories/            # Repository interfaces (contracts)
│   └── events/                  # Domain events
├── application/                 # Use cases + MCP adapters
│   ├── usecases/               # ProcessPaymentUseCase, etc.
│   ├── dtos/                   # Data Transfer Objects
│   ├── mappers/                # Domain ↔ DTO mappers
│   └── mcp-tools/              # ← MCP TOOLS LIVE HERE
│       ├── process-payment-tool.js
│       └── query-payment-tool.js
├── infrastructure/              # Implementations + external APIs
│   ├── repositories/           # StripePaymentRepository (implements interface)
│   ├── services/               # EmailNotificationService, etc.
│   └── config/                 # API credentials, configs
└── ui/                         # HTTP & other adapters
    ├── http/                   # REST controllers
    └── webhooks/               # Webhook handlers
```

**The "MCP Tools in Application" Rule:**
```javascript
// ✅ CORRECT: Application layer MCP tool
domains/payment-processing/application/mcp-tools/process-payment-tool.js

// Tool wraps a use case:
export const processPaymentTool = {
  handler: async (input) => {
    // 1. Transform input
    const dto = new ProcessPaymentDTO(input);
    
    // 2. Call use case (application)
    const result = await useCase.execute(dto);
    
    // 3. Return agent-friendly output
    return toPaymentDTO(result);
  }
};

// ❌ WRONG: Putting MCP tool in ui/http/
// MCP tools aren't HTTP routes—they're semantic adapters for agents
```

---

## Scripts: Automation & Analysis

### **scripts/scaffold-domain.js** (Data's Scaffolder)

**What it does:**
```bash
node scripts/scaffold-domain.js \
  --name payment-processing \
  --learned-patterns patterns.json
```

**Generates:**
```
domains/payment-processing/
├── domain/
│   ├── models/Payment.ts
│   ├── services/PaymentValidator.ts
│   └── repositories/PaymentRepository.ts
├── application/
│   ├── usecases/ProcessPaymentUseCase.ts
│   ├── dtos/ProcessPaymentDTO.ts
│   ├── mappers/PaymentMapper.ts
│   └── mcp-tools/
│       ├── process-payment-tool.js
│       └── query-payment-tool.js
├── infrastructure/
│   ├── repositories/StripePaymentRepository.ts
│   └── services/EmailNotificationService.ts
└── ui/
    ├── http/PaymentController.ts
    └── webhooks/StripeWebhookHandler.ts
```

**Learned Patterns:**
From `versions/`, Data extracts:
- Naming conventions
- Module structure
- DDD patterns used
- Common services
- Error handling approaches

---

### **scripts/analyze-history.js** (Data's Archaeology)

**What it does:**
```bash
node scripts/analyze-history.js --versions-dir ./versions --output patterns.json
```

**Output:**
```json
{
  "ddd_patterns": [
    "aggregate-root-per-entity",
    "value-objects-for-money",
    "event-sourcing-optional"
  ],
  "naming_conventions": [
    "UseCase suffix for use cases",
    "PascalCase for entities"
  ],
  "infrastructure_choices": [
    "stripe-for-payments",
    "sendgrid-for-email"
  ],
  "decisions": [
    {
      "date": "2026-01-15",
      "title": "Use pnpm workspaces",
      "rationale": "Faster installs, no node_modules duplication",
      "impact": "All scripts must use pnpm"
    }
  ]
}
```

**Used By:**
- `scaffold-domain.js` – Applies patterns to new code
- Picard's mission planner – Informs architectural decisions
- Data's recommendations – References past decisions

---

### **scripts/deploy-mcp.sh** (Geordi's Deployment)

```bash
./scripts/deploy-mcp.sh \
  --host ec2-instance.amazonaws.com \
  --port 3000 \
  --env production
```

**Deploys:**
- Docker image to EC2
- Environment variables
- MCP server startup
- Health checks
- Monitoring setup

---

## tools/: MCP Tool Implementations

**Directory:**
```
tools/
├── unzip-search-tool/          # Repository ingest & query
│   ├── index.js
│   ├── ingester.js
│   ├── searcher.js
│   └── README.md
├── figma-generator/            # UI generation
│   ├── figma-mcp.js
│   ├── svg-renderer.js
│   └── README.md
└── [custom-tools]/
    ├── index.js
    └── README.md
```

**Each tool:**
1. Implements MCP protocol
2. Gets registered in `apps/api/mcp-server.js`
3. Goes through Worf's gate before execution
4. Returns structured output for agents

---

## versions/: The Brain's Memory

**Directory:**
```
versions/
├── v1-initial-setup.md           # Why pnpm, why DDD
├── v2-crew-integration.md        # Persona architecture
├── v3-mcp-in-application.md      # Tool placement decision
├── v4-complexity-routing.md      # Model selection formula
└── [ongoing decisions].md
```

**Each Decision File:**
```markdown
---
date: 2026-05-10
personas: [Picard, Data]
title: MCP Tools in Application Layer
status: implemented
impactArea: [architecture, agentic-design]
---

## Decision
Place MCP tools in the application layer alongside use cases.

## Rationale
- MCP is agent-native, not HTTP-native
- Semantic adapter pattern (like REST controllers)
- Enables agent-first design

## Trade-offs
- Slightly more code organization
- But: Clear separation of concerns

## Implementation
See: domains/[domain]/application/mcp-tools/

## Lessons Learned
[Post-implementation notes]
```

---

## How The Crew Coordinates (Sequence)

```
1. USER ASKS PICARD
   "Create a new payment domain"
   
2. PICARD → PLANNER
   "Break this into a mission"
   
3. PICARD → DATA
   "What patterns apply?"
   DATA → analyze-history.js
   DATA ← returns patterns
   
4. PICARD → WORF
   "What are the risks?"
   WORF ← checks allowlists, security requirements
   WORF ← returns risk assessment
   
5. PICARD → GEORDI
   "Infrastructure ready?"
   GEORDI → check AWS capacity
   GEORDI ← returns capacity report
   
6. PICARD → RIKER
   "Execute this mission"
   
7. RIKER → ROUTER
   "What model for this step?"
   ROUTER ← computes complexity
   ROUTER ← returns Haiku/Sonnet/Opus
   
8. RIKER → WORF
   "Can we call this MCP tool?"
   WORF ← validates clearance
   WORF ← logs audit trail
   WORF → allows execution
   
9. RIKER → MCP TOOL
   Calls the tool via MCP protocol
   
10. RESULT
    Domain scaffolded
    Decision recorded in /versions
    Team learned for future
```

---

## Testing Strategy

```bash
# Test Picard's mission planning
pnpm test -- orchestrator.test.js

# Test Data's scaffolding
pnpm test -- scaffold.test.js

# Test Worf's validation
pnpm test -- worf-gate.test.js

# Test complexity scoring
pnpm test -- router.test.js

# Test all domains
pnpm test

# Test specific domain
cd domains/[domain]
pnpm test
```

---

## Key Takeaway

The Sovereign Factory isn't just code. It's a **team**.

- **Picard** decides what to build
- **Data** analyzes how to build it
- **Worf** ensures it's safe to build
- **Riker** builds it
- **Geordi** keeps the engines running

Together, they scaffold a business. Automatically. 🚀
