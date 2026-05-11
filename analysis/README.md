# AI Enterprise OS: The Sovereign Factory

> **Business-as-Code for Autonomous Enterprise Units**  
> A Domain-Driven Design framework for building self-maintaining agent ecosystems through Model Context Protocol (MCP) standardization and agentic orchestration.

---

## 🎯 Quick Summary

The **Sovereign Factory** is a platform that treats your codebase as a **self-learning product factory**. Using Domain-Driven Design and a 5-person crew of specialized agents (Picard, Riker, Data, Worf, Geordi), it automatically scaffolds new business units while learning from your architectural decisions.

**Key Innovation:** Instead of building isolated agents, you get a coordinated team that makes decisions together, enforces security uniformly, and routes work to the right model based on task complexity.

---

## 📁 Repository Structure

```
ai-enterprise-os/
├── apps/                          # Applications & servers
│   └── api/
│       ├── mcp-server.js          # MCP 2026 SDK implementation
│       └── setup_credentials.sh   # Unified credential configuration
│
├── core/                          # Core framework (shared across domains)
│   ├── orchestrator/              # Mission planning & execution
│   ├── router/                    # Complexity scoring & model selection
│   ├── crew-manifest/             # Agent personas & system prompts
│   └── mcp-manifest/              # Tool registry + Worf security gate
│
├── domains/                       # DDD Bounded Contexts
│   ├── executive-decisions/       # Strategic planning domain
│   ├── security-compliance/       # Governance & audit trails
│   ├── architecture-design/       # Code analysis & scaffolding
│   └── infrastructure-operations/ # DevOps & deployment
│
├── scripts/                       # Automation & analysis
│   ├── scaffold-domain.js         # Generate new bounded context
│   ├── analyze-history.js         # Mine decision patterns
│   └── deploy-mcp.sh              # Deploy to EC2
│
├── tools/                         # MCP Tool implementations
│   ├── unzip-search-tool/         # Repository ingest & query
│   ├── figma-generator/           # UI generation from specs
│   └── [custom-tools]/
│
├── versions/                      # Decision journal (the "brain")
│   ├── v1-initial-setup.md        # Why pnpm, why DDD
│   ├── v2-crew-integration.md     # Persona architecture
│   └── [ongoing decisions]/       # Every major decision
│
├── orchestrator.test.js           # Main test suite
├── package.json                   # Root package config
├── pnpm-workspace.yaml            # Monorepo workspace config
├── main.yml                       # GitHub Actions CI/CD
└── setup_credentials.sh           # Environment setup
```

---

## 🎭 The Five-Person Crew

Your AI agents aren't generic LLM calls. They're specialized personalities, each with clear responsibilities and authority:

### **1. 🎓 Picard: The Orchestrator**
**Role:** Strategic mission planning, high-level synthesis, final decision authority

**What Picard Does:**
- Receives goals from humans or other agents
- Breaks them into sub-missions
- Asks the crew for input: Data→"analyze", Worf→"check risks", Geordi→"capacity?", Riker→"execute"
- Synthesizes crew feedback into a final decision
- Routes high-complexity tasks (0.7-1.0) to Claude Opus for deep reasoning

**Where Picard Lives:** `core/orchestrator/planner.js`

**Example Picard Decision:**
```javascript
// User asks: "Scaffold a new payment-processing domain"
const mission = await picard.planMission({
  goal: "Create payment-processing domain",
  context: currentProjectState
});
// Picard internally:
// 1. Asks Data: "Analyze project patterns"
// 2. Asks Worf: "What security concerns?"
// 3. Asks Geordi: "Infrastructure ready?"
// 4. Asks Riker: "Execution plan?"
// 5. Synthesizes → Returns mission with approval
```

---

### **2. ⚡ Riker: The Executor**
**Role:** Action-oriented, tactical decisions, quick execution

**What Riker Does:**
- Executes planned missions step-by-step
- Makes quick tactical decisions when conditions change
- Handles errors and contingencies
- Routes medium-complexity tasks (0.0-0.3) to Claude Haiku for speed
- Reports blockers immediately to Picard

**Where Riker Lives:** `core/orchestrator/executor.js`

**Example Riker Execution:**
```javascript
// Executing a step from Picard's mission plan
for (const step of mission.steps) {
  const model = await riker.selectModelByComplexity(step);
  // 0.0-0.3 → Haiku (fast)
  // 0.3-0.7 → Sonnet (balanced)
  const result = await riker.executeStep(step, model);
  
  if (result.blockers) {
    await picard.escalate(result.blockers); // Not Riker's problem anymore
  }
}
```

---

### **3. 🧠 Data: The Architect**
**Role:** Technical analysis, codebase archaeology, pattern extraction

**What Data Does:**
- Analyzes current codebase structure
- Mines `/versions` for architectural patterns and decisions
- Validates DDD compliance
- Scaffolds new domains following learned patterns
- Routes analysis tasks (0.3-0.7) to Claude Sonnet for reasoning
- Provides detailed technical recommendations (doesn't make final decisions)

**Where Data Lives:** `core/scaffold/` and `scripts/analyze-history.js`

**Example Data Analysis:**
```javascript
// Data analyzes the project
const analysis = await data.analyzeCodebase();
const patterns = await data.extractPatternsFromVersions('/versions');
const newDomain = await data.scaffoldDomain('payment-processing', patterns);

// Data says: "Based on v1-initial-setup.md and v2-crew-integration.md,
// I recommend this structure following our established patterns"
// But Picard makes the final call
```

---

### **4. 🛡️ Worf: The Security Officer**
**Role:** Governance gatekeeper, risk assessment, policy enforcement

**What Worf Does:**
- Validates **all** MCP tool calls before execution (the "Worf Gate")
- Enforces tool allowlists
- Assesses security and compliance risks
- Maintains audit trails for regulatory requirements
- Can **veto** (block action), but cannot approve
- Implements PKCE + resource indicators (RFC 8707)

**Where Worf Lives:** `core/mcp-manifest/worf-gate.js`

**Example Worf Validation:**
```javascript
// Before ANY MCP tool executes:
const clearance = await worf.validateToolCall({
  persona: 'Riker',           // Who's asking?
  tool: 'figma_create_frame', // What tool?
  action: 'CREATE',
  resourceId: 'file_xyz'
});

if (!clearance.allowed) {
  throw new Error(`Worf denies: ${clearance.reason}`);
  // Common reasons: tool not allowlisted, persona lacks clearance, resource invalid
}

// If allowed, audit trail recorded automatically
await worf.auditLog.record({
  timestamp: now,
  persona: 'Riker',
  tool: 'figma_create_frame',
  auditId: '...' // For compliance
});
```

**Why This Matters:**
- Tool poisoning attacks achieve 84.2% success with auto-approval
- 43% of public MCP servers contain command injection flaws
- **One gate beats scattered checks** across 20 agent configs
- Compliance teams get audit trails automatically

---

### **5. 🔧 Geordi: The Engineer**
**Role:** Infrastructure architect, deployment, operations

**What Geordi Does:**
- Sets up and maintains infrastructure (Docker, EC2, GitHub Actions)
- Configures API gateways and service connections
- Deploys MCP server updates
- Manages credentials and secrets
- Monitors system health and performance
- Reports infrastructure constraints to Picard and Data

**Where Geordi Lives:** `apps/api/` and `scripts/deploy-mcp.sh`

**Example Geordi Setup:**
```javascript
// Geordi prepares infrastructure
await geordi.setupInfrastructure({
  docker: {
    image: 'sovereign-factory:latest',
    ports: [3000]
  },
  aws: {
    ec2_instance: 't3.medium',
    vpc_config: {...}
  },
  cicd: {
    github_actions: true,
    deployment_target: 'production'
  }
});

// Geordi reports: "MCP server ready on port 3000, 4GB RAM available"
```

---

## 🏗️ The Four-Layer Architecture

Every bounded context follows **Domain-Driven Design** with strict layer separation:

```
DOMAIN LAYER (business rules, zero dependencies)
    ↓ (uses interfaces)
APPLICATION LAYER (use cases + MCP tools) ← MCP TOOLS LIVE HERE
    ↓ (depends on)
INFRASTRUCTURE LAYER (implementations, external APIs)
    ↓ (returns)
UI/ADAPTER LAYER (REST, HTTP, webhooks)
```

### **Why MCP Tools in Application Layer?**

MCP tools are **semantic adapters wrapping use cases**, not just HTTP routes:

```javascript
// domains/payment-processing/application/mcp-tools/process-payment-tool.js

export const processPaymentTool = {
  name: 'process_payment',
  description: 'Process a payment for an invoice',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number' },
      invoiceId: { type: 'string' },
      currency: { type: 'string' }
    }
  },
  
  handler: async (input) => {
    // 1. Transform agent input into DTO
    const dto = new ProcessPaymentDTO(input.amount, input.invoiceId);
    
    // 2. Call use case (application orchestration)
    const useCase = new ProcessPaymentUseCase(
      stripePaymentRepository,    // from infrastructure
      paymentValidator           // from domain
    );
    const result = await useCase.execute(dto);
    
    // 3. Map domain result to agent-friendly output
    return toPaymentDTO(result);
  }
};
```

**Key Points:**
- ✅ Thin adapter (no business logic)
- ✅ Wraps application use case
- ✅ Part of "agent-first" design (not an afterthought)
- ✅ Sits with other application concerns (use cases, DTOs, mappers)
- ✅ Subject to Worf's security gate

---

## 🔀 Complexity Routing & Model Selection

Tasks are automatically routed to the right model based on computed complexity (0–1):

```
0.0–0.3: HAIKU (Riker)   → Simple tasks, speed critical
0.3–0.7: SONNET (Data)   → Reasoning required, balanced cost/quality
0.7–1.0: OPUS (Picard)   → Deep synthesis, complex analysis
```

**The Formula:**
```
Complexity = (inputTokens / 4000) 
           + (requiresReasoning ? 0.2 : 0) 
           + (domainSpecificity × 0.3) 
           + randomVariance(±0.05)
```

**Real Examples:**

| Task | Complexity | Model | Why |
|------|-----------|-------|-----|
| Summarize 2KB doc | 0.15 | Haiku | No reasoning needed |
| Generate TypeScript module | 0.52 | Sonnet | Needs reasoning |
| Design payment system | 0.85 | Opus | Multi-step synthesis |

**Cost Impact:** By routing simple tasks to Haiku, you save **60-80% on LLM costs** at scale.

---

## 🔐 Worf's Security Clearance Gate

All MCP tool calls pass through one validation function:

```yaml
# core/mcp-manifest/allowlist.yaml

mcp_allowlist:
  - server: figma_mcp
    tools: [figma_create_frame, figma_query_page]
    personas: [Data, Riker]           # Only these can use it
    rateLimit: 100/hour
    audit: true                       # Log every call
    
  - server: github_mcp
    tools: [github_read_file, github_list_branches]
    personas: [Geordi, Data]
    rateLimit: 500/hour
    audit: false
```

**The Gate:**
```javascript
async validateToolCall(request) {
  const { agentPersona, tool, action, resourceId } = request;
  
  // 1. Persona recognized?
  if (!this.personas.includes(agentPersona)) {
    return { allowed: false, reason: 'Persona not recognized' };
  }
  
  // 2. Tool allowlisted?
  if (!this.allowlist.includes(tool)) {
    return { allowed: false, reason: 'Tool not in allowlist' };
  }
  
  // 3. Persona cleared for tool?
  if (!this.personaTools[agentPersona].includes(tool)) {
    return { allowed: false, reason: 'Insufficient clearance' };
  }
  
  // 4. Resource valid?
  if (!await this.validateResource(resourceId)) {
    return { allowed: false, reason: 'Resource validation failed' };
  }
  
  // 5. Audit & allow
  await this.auditLog.record({ agentPersona, tool, action, resourceId });
  return { allowed: true, auditId: generateId() };
}
```

---

## 💡 Modern Prompt Engineering: Activating the Crew

To use the Sovereign Factory effectively, structure your prompts for crew coordination:

### **System Prompt Template**

```markdown
# Sovereign Factory Crew Activation

You are part of the ai-enterprise-os crew. Your role: [PICARD | RIKER | DATA | WORF | GEORDI]

## Your Authority
- PICARD: Final strategic decisions
- DATA: Technical recommendations (not final)
- WORF: Can veto; cannot approve
- RIKER: Tactical decisions only
- GEORDI: Infrastructure domain

## Your Constraints
- DDD: Domain layer = ZERO external dependencies
- Application layer = Use cases + MCP tools only
- Infrastructure layer = Implements domain interfaces
- Follow established patterns from /versions/

## Your Tools
- MCP Tools: Available via Worf Gate validation
- Memory: Access past decisions from this session
- Reasoning: Use appropriate model (Haiku/Sonnet/Opus)

## Communication
- Ask crew members for input (Picard asks Data, Riker, etc.)
- Wait for responses before deciding
- Escalate to Picard if crew disagrees
```

### **Multi-Agent Reasoning Prompt**

```markdown
# Mission: [Goal Name]

## Step 1: Analysis
@Data: Analyze this requirement. What patterns apply from /versions/?
→ Data responds with technical analysis

## Step 2: Risk Assessment
@Worf: What are security/compliance implications?
→ Worf responds with risk assessment

## Step 3: Feasibility
@Geordi: Can our infrastructure handle this?
→ Geordi responds with capacity report

## Step 4: Execution Plan
@Riker: What's the step-by-step plan?
→ Riker responds with tactical plan

## Step 5: Synthesis
@Picard: Integrate all inputs. Approve or modify.
→ Picard makes final decision

## Expected Output
```json
{
  "missionApproved": true,
  "plan": [...],
  "selectedModel": "claude-sonnet-4-5",
  "complexity": 0.65,
  "rationale": "..."
}
```
```

---

## 🚀 Getting Started (5 Minutes)

### 1. Setup Credentials
```bash
zsh ./setup_credentials.sh
# Prompts for: SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start MCP Server
```bash
node ./apps/api/mcp-server.js
# Output: MCP server listening on http://localhost:3000
```

### 4. Run Tests
```bash
pnpm test
# Runs vitest suite
```

### 5. Use in Claude Desktop
Add to `~/.claude-desktop/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "sovereign-factory": {
      "command": "node",
      "args": ["/path/to/apps/api/mcp-server.js"],
      "env": {
        "SUPABASE_URL": "$SUPABASE_URL",
        "SUPABASE_KEY": "$SUPABASE_KEY",
        "OPENROUTER_API_KEY": "$OPENROUTER_API_KEY"
      }
    }
  }
}
```

Now in Claude, use the crew:
```
@sovereign-factory: Scaffold a new payment-processing domain

Let Picard coordinate with the crew:
- Data analyzes patterns
- Worf checks security
- Geordi verifies capacity
- Riker executes
```

---

## 📚 Core Files Explained

| File | Purpose |
|------|---------|
| `core/orchestrator/planner.js` | Picard's mission planning engine |
| `core/orchestrator/executor.js` | Riker's step executor |
| `core/router/complexity-scorer.js` | Compute task complexity (0–1) |
| `core/crew-manifest/personas.json` | All 5 personas + system prompts |
| `core/mcp-manifest/worf-gate.js` | Security validation gate |
| `scripts/scaffold-domain.js` | Generate new DDD bounded context |
| `scripts/analyze-history.js` | Mine patterns from `/versions` |
| `apps/api/mcp-server.js` | MCP 2026 SDK server |
| `apps/api/setup_credentials.sh` | Environment setup script |

---

## 🎯 Key Principles

1. **Specialization** – Each crew member has ONE responsibility
2. **Clear Authority** – No ambiguity about who decides what
3. **Complexity Routing** – Right model for right task (save 60-80% on costs)
4. **DDD Architecture** – Domain layer ZERO dependencies; clean separation
5. **Unified Security** – One Worf Gate validates all actions
6. **Decision Memory** – `/versions` holds architectural rationale
7. **Agent-First** – MCP tools in Application Layer, not an afterthought

---

## 📈 Roadmap

- ✅ Crew personas (Picard, Riker, Data, Worf, Geordi)
- ✅ Complexity routing (Haiku/Sonnet/Opus)
- ✅ Worf security gate
- ✅ MCP server (2026 SDK)
- ✅ DDD scaffolding
- 🔄 CI/CD pipeline (GitHub Actions → EC2)
- 📅 Figma MCP integration
- 📅 Dashboard (web UI)
- 📅 Multi-provider failover

---

## 🤝 Contributing

Follow DDD patterns when adding code:
1. Domain logic in `domain/` (no dependencies)
2. Use cases in `application/` (including MCP tools)
3. Implementations in `infrastructure/`
4. Adapters in `ui/`

Document decisions in `/versions/v[N]-title.md`

---

**Made with ❤️ for autonomous enterprise teams**  
**Sovereign Factory • May 2026 • Brady Georgen (@familiarcat)**
