# MASTER ORCHESTRATION PROMPT — Phased Execution Controller

> **Purpose**: Top-level routing logic for autonomous crew execution across all phases  
> **Authority**: SYSTEM_PROMPT_UNIVERSAL.md + Phase-specific execution prompts  
> **Feedback Loop**: Crew observations → memory system → next phase initialization  
> **Multi-LLM**: Works with Claude Code, Gemini, OpenAI

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│           USER INVOCATION                                       │
│  (Claude Code: paste prompt | Gemini/OpenAI: API call)         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│       MASTER ORCHESTRATION PROMPT (THIS FILE)                  │
│  1. Determine current phase + status                            │
│  2. Retrieve crew memory + observations                         │
│  3. Route to appropriate phase prompt                           │
│  4. Initialize crew context                                    │
└──────────────────────────────┬────────────────────────────────┬─┘
                               │                                │
                    ┌──────────▼──────────┐        ┌────────────▼────────┐
                    │ Phase-Specific      │        │ Crew Agent Routing  │
                    │ Execution Prompt    │        │ (Star Trek personas)│
                    │                     │        │                     │
                    ├─ PHASE-0-EXEC.md   │        ├─ Data (Architect)   │
                    ├─ PHASE-1-EXEC.md   │        ├─ Geordi (Developer) │
                    ├─ PHASE-2-EXEC.md   │        ├─ Worf (Security)    │
                    ├─ PHASE-3-EXEC.md   │        ├─ Uhura (Comms)      │
                    └─ PHASE-4-EXEC.md   │        └─ Etc. (8 more)      │
                               │                       │
                               └───────┬───────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │  MCP Tool Invocation             │
                    │  (10 tools available)            │
                    ├─ run_factory_mission              │
                    ├─ run_crew_agent                   │
                    ├─ search_code                      │
                    ├─ health_check                     │
                    ├─ git_operation                    │
                    └─ [6 others]                       │
                               │
                               ▼
                    ┌──────────────────────────────────┐
                    │  MCP HTTP Bridge                 │
                    │  (localhost:3002)                │
                    │  Orchestrator dispatch           │
                    │  Supabase state + Redis cache    │
                    └──────────┬───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────────┐
                    │  Crew Observation Output         │
                    │  crew-memories/active/*.json     │
                    │  + Cost tracking                 │
                    │  + Status & next_step_input      │
                    └──────────┬───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────────┐
                    │  FEEDBACK LOOP                   │
                    │  Store in Supabase vectors       │
                    │  Next crew member recalls        │
                    │  iteration continues...          │
                    └──────────────────────────────────┘
```

---

## 1. Initialization: Determine Current State

### Step 1a: Identify Current Phase

Use **CLAUDE.md §6 Phase Status**:

```
Phase 0: Foundation          ✅ COMPLETE (11/11 steps)
Phase 1: VSCode Extension    🔴 NEXT    (p1-s1 → p1-s7)
Phase 2: Monorepo Merge      🔴 BLOCKED (depends on Phase 1)
Phase 3: n8n Automation      🔴 PENDING (depends on Phase 2)
Phase 4: Production Deploy   🔴 PENDING (depends on Phase 3)
```

**Decision Logic**:

```python
def get_current_phase():
    # Query Supabase for latest mission status
    mission = query("SELECT phase, status FROM missions ORDER BY created_at DESC LIMIT 1")
    
    if mission is None:
        # First-time execution
        return PHASE_0  # Assume foundation complete
    
    if mission.phase == 0 and mission.status == 'complete':
        return PHASE_1
    elif mission.phase == 1 and mission.status == 'complete':
        return PHASE_2
    elif mission.phase == 2 and mission.status == 'complete':
        return PHASE_3
    elif mission.phase == 3 and mission.status == 'complete':
        return PHASE_4
    else:
        # Continue current phase
        return mission.phase

current_phase = get_current_phase()
```

### Step 1b: Retrieve Crew Context

**Invoke MCP Tool**: `recall_memory`

```json
{
  "tool": "recall_memory",
  "args": {
    "query": "phase {current_phase} mission objectives crew assignments",
    "tags": ["phase-{current_phase}", "crew-routing"],
    "threshold": 0.5,
    "limit": 20
  }
}
```

**Expected Result**: List of prior observations from crew on this phase (if any).

### Step 1c: Health Check

**Invoke MCP Tool**: `health_check`

```json
{
  "tool": "health_check",
  "args": {
    "fix": false
  }
}
```

**Validate**:
- ✅ Redis online
- ✅ Supabase online
- ✅ OpenRouter credentials valid
- ✅ Python tools available

If any check fails: `run health_check --fix` and retry.

---

## 2. Route to Phase Prompt

Based on `current_phase`, load the corresponding execution prompt:

### Phase 0 Routing (Reference Only)

**Status**: ✅ Already complete  
**Prompt**: PHASE-0-EXECUTION.md (reference only)

If you need to verify Phase 0 is still passing:
```bash
./scripts/p0-run-all.sh
```

### Phase 1 Routing (NEXT PRIORITY)

**Status**: 🔴 Current phase — Execute this now  
**Prompt**: PHASE-1-EXECUTION.md  

**When to Use**:
- You're building VSCode extension
- You need MCPClient.ts, WebView components, command handlers
- Your goal is to unblock Phase 2

**Crew Assignment**:
- Commander Data (Architecture)
- Geordi La Forge (Implementation)
- Lt. Worf (Security Review)
- Lt. Uhura (Packaging)

**Execution Pattern**:

```
🎯 CURRENT TASK: Phase 1 — VSCode Extension MVP

Load PHASE-1-EXECUTION.md

For each step (p1-s1 through p1-s7):
  1. Identify assigned crew member
  2. Inject crew persona into system context
  3. Execute step-specific task
  4. Crew writes observation to crew-memories/active/
  5. Next crew reads prior observations + retrieves context
  6. Cycle continues until step complete

On Phase 1 complete:
  → Emit: "Phase 1 complete. VSCode extension ready."
  → Next: Phase 2 becomes current
  → Proceed to Phase 2 Routing
```

### Phase 2 Routing (After Phase 1)

**Status**: 🔴 Blocked until Phase 1 complete  
**Prompt**: PHASE-2-EXECUTION.md  

**When to Use**:
- Phase 1 smoke test passed ✅
- VSCode extension is packaged and signed
- Ready to merge monorepos

**Crew Assignment**:
- Commander Data (TypeScript port strategy)
- Geordi La Forge (Implementation)
- Chief O'Brien (Turbo pipeline)
- Lt. Worf (Integration testing)

**Tasks**:
- Port orchestrator.js → TypeScript
- Extract crew-personas → shared package
- Move MCP bridge → packages/mcp-bridge
- Unify dashboard + extension dashboards
- Wire Turbo pipeline

### Phase 3 Routing (After Phase 2)

**Status**: 🔴 Pending Phase 2 completion  
**Prompt**: PHASE-3-EXECUTION.md  

**When to Use**:
- Monorepo merge complete
- Single `turbo run dev` command works
- Ready for webhook automation

**Crew Assignment**:
- Lt. Uhura (Webhook integration)
- Chief O'Brien (n8n configuration)

**Tasks**:
- Start n8n on :5678
- Wire n8n webhook → run_crew_agent
- Real-time progress via Socket.io
- Cost-optimized tier routing test

### Phase 4 Routing (After Phase 3)

**Status**: 🔴 Pending Phase 3 completion  
**Prompt**: PHASE-4-EXECUTION.md  

**When to Use**:
- n8n workflows operational
- Ready for multi-cloud production

**Crew Assignment**:
- Chief O'Brien (DevOps, Terraform, Docker)
- Captain Picard (Oversight)

**Tasks**:
- Multi-stage Docker build
- AWS ECS + ElastiCache Terraform
- Vercel dashboard deploy
- VSCode marketplace publish

---

## 3. Context Injection for Crew

Before executing any phase prompt, **inject crew context**:

### Template: Crew Persona Injection

```
═══════════════════════════════════════════════════════════════
🎭 CREW ASSIGNMENT

You are: [PERSONA_NAME]
Role: [DDD_ROLE]
Model Tier: [OPENROUTER_MODEL]
Authority: [DECISION_AUTHORITY]
Assigned Steps: [PHASE_STEPS]

═══════════════════════════════════════════════════════════════
📋 PHASE CONTEXT

Current Phase: Phase [N]
Goal: [PHASE_OBJECTIVE]
Status: [p1-s1 | p1-s2 | ... | complete]
Prior Observations: [COUNT] from prior crew members

═══════════════════════════════════════════════════════════════
🔗 GROUND TRUTH INTEGRATION

Prior crew observations on this domain/task:
[JSON snippet from crew-memories/active/]

Your task builds on their work. Incorporate:
  - Their decisions (tagged in observations)
  - Their cost estimates (for budget tracking)
  - Their discovered entities/patterns (for consistency)

═══════════════════════════════════════════════════════════════
⚙️ EXECUTION

Load: PHASE-[N]-EXECUTION.md, Step p[N]-s[X]
Execute your assigned task using patterns from SYSTEM_PROMPT_UNIVERSAL.md §5
Write observation to crew-memories/active/ on completion

═══════════════════════════════════════════════════════════════
```

---

## 4. Feedback Loop Integration

After each step completes, the crew writes an observation file.

### Observation File Format (Canonical)

```json
{
  "timestamp": "2026-05-15T14:32:00Z",
  "crew_member": "commander_data",
  "mission_id": "mission-2026-05-15-001",
  "phase": 1,
  "step": 3,
  
  "observation_text": "[Human-readable summary of what was accomplished]",
  
  "output": {
    "[deliverable_key]": "[deliverable_value]",
    "decisions": ["decision 1", "decision 2"],
    "entities_discovered": [...],
    "code_patterns": [...],
    "schema": {...}
  },
  
  "cost": {
    "model_tier": "sonnet",
    "tokens_used": 4250,
    "usd_cost": 0.0127,
    "cost_efficiency": 0.85
  },
  
  "tags": ["phase-1", "domain-civic", "architecture"],
  "status": "success | partial | failed",
  
  "next_step_input": {
    "predecessor_step": "p1-s3",
    "task_description": "[What the next crew should do]",
    "reference_data": "[Relevant data for next step]",
    "tools_needed": ["tool1", "tool2"]
  },
  
  "errors": null | ["error 1", "error 2"],
  "recovery_notes": "[If status is failed, how to recover]"
}
```

### Feedback Loop Pseudocode

```python
# At start of next crew member's task:

# 1. Query prior observations
prior_obs = recall_memory(
    query=f"observations for phase {phase}, domain {domain}",
    threshold=0.4,
    limit=50
)

# 2. Extract decisions
decisions = [o['output']['decisions'] for o in prior_obs if o['status'] == 'success']
entities = [o['output']['entities_discovered'] for o in prior_obs]
costs = [o['cost']['usd_cost'] for o in prior_obs]

# 3. Ground your reasoning
context = {
    "prior_decisions": decisions,
    "discovered_entities": flatten(entities),
    "cumulative_cost": sum(costs),
    "crew_consensus": majority_vote(decisions)
}

# 4. Execute task informed by crew knowledge
my_output = execute_task(assigned_task, context)

# 5. Write observation for next crew
write_observation({
    "crew_member": my_persona,
    "observation_text": summarize(my_output),
    "output": my_output,
    "tags": [phase, domain],
    "next_step_input": what_next_crew_needs(my_output)
})

# 6. Continue to next step
```

---

## 5. Cost Tracking & Budget Control

Every mission has a **budget cap** (default: $2.00 USD).

### Per-Step Cost Accumulation

```json
{
  "mission_id": "mission-001",
  "phase": 1,
  "budget_limit": 2.00,
  "cost_by_step": {
    "p1-s1": 0.0063,
    "p1-s2": 0.0205,
    "p1-s3": 0.0195,
    "p1-s4": 0.0155,
    "p1-s5": 0.0054
  },
  "total_so_far": 0.0672,
  "remaining_budget": 1.9328,
  "budget_headroom": "97%"
}
```

**Circuit Breaker Logic**:

```python
def check_budget_before_step(mission_id, next_step):
    cost_history = query(f"SELECT cost FROM observations WHERE mission_id = {mission_id}")
    cumulative = sum(cost_history)
    
    if cumulative > BUDGET_LIMIT:
        emit_alert(f"Mission {mission_id} exceeded budget. Halting.")
        cancel_mission(mission_id)
        return False
    
    # Estimate cost for next step
    step_cost_estimate = estimate_cost(next_step)
    if cumulative + step_cost_estimate > BUDGET_LIMIT:
        emit_warning(f"Next step may exceed budget. Proceed with caution.")
    
    return True  # Proceed
```

**Your Responsibility**: In each observation, include cost estimates.

---

## 6. Crew Failure Protocol

If a step fails (status = 'failed'), the orchestrator **emits a structured crew failure prompt**.

### Failure Detection

```python
# Monitor step execution
if observation.status == 'failed':
    emit_crew_failure_prompt({
        "step": observation.step,
        "crew_member": observation.crew_member,
        "error": observation.errors,
        "recovery_notes": observation.recovery_notes,
        "escalation_persona": determine_escalation(observation),
        "mcp_tool": recommend_tool(observation)
    })
```

### Escalation Logic

| Failure Type | Escalates To | Recommended Tool |
|--------------|--------------|------------------|
| Code bug | Geordi (developer) | `run_crew_agent` → implement fix |
| Config error | O'Brien (ops) | `health_check --fix` |
| Security issue | Worf (auditor) | `run_crew_agent` → security review |
| Missing data | Data (architect) | `search_code` + `recall_memory` |
| Budget exceeded | Troi (analyst) | `manage_task` → mark overbudget |
| External service | Uhura (comms) | Manual escalation + wait |

### Recovery Pattern

```
[FAILURE DETECTED]
Step: p1-s2
Crew: Geordi La Forge
Error: TypeScript compilation failed — MCPClient.ts:92 missing type

[ESCALATION]
Assigned to: Geordi La Forge (re-assign)
Task: "Fix TypeScript compilation error in MCPClient.ts:92"
MCP Tool: run_crew_agent

[REMEDIATION]
1. Invoke: run_crew_agent with Geordi persona
2. Task: "Fix MCPClient.ts TypeScript errors"
3. Geordi implements fix + tests
4. Retry step: p1-s2
```

---

## 7. Phase Completion Criteria

### Phase 1 Complete When

- ✅ All 7 steps executed (p1-s1 through p1-s7)
- ✅ All observations marked status = 'success'
- ✅ Smoke test passes (6/6 checks)
- ✅ Extension package created (sovereign-factory-1.0.0.vsix)
- ✅ Total cost ≤ budget limit ($2.00)

**Emission**:
```
Phase 1 Status: COMPLETE ✅

Deliverables:
  - VSCode extension (sovereign-factory-1.0.0.vsix)
  - MCPClient.ts (400 LOC)
  - WebView components (400 LOC)
  - 6 command handlers (300 LOC)
  - Smoke test passed

Cost: $0.12 USD

Status: Ready for Phase 2 (Monorepo Merge)
Blocker Removed: Yes
Next Phase: Phase 2 — Execute PHASE-2-EXECUTION.md
```

---

## 8. Quick-Start Guide: Using This Prompt

### For Claude Code Users

1. **Open Claude Code** in VSCode
2. **Paste this prompt** into chat
3. **Add context**:
   ```
   Current Phase: 1
   Goal: Complete VSCode Extension MVP
   Status: Starting with p1-s1 (Architecture Design)
   ```
4. **I'll respond** by:
   - Loading PHASE-1-EXECUTION.md
   - Assigning first crew member (Commander Data)
   - Beginning step execution
5. **You continue** by copying output observations and continuing the phase

### For Gemini/OpenAI Users

1. **Set system prompt** to `SYSTEM_PROMPT_UNIVERSAL.md`
2. **Initialize MCP bridge** at `localhost:3002`
3. **Send user message**:
   ```
   Start Phase 1 execution. Load PHASE-1-EXECUTION.md.
   Assign: Commander Data (Architect)
   Task: p1-s1 (Extension Architecture Design)
   ```
4. **Continue** by feeding prior observations back into next crew member's context
5. **Use MCP bridge** to invoke tools + retrieve crew memory

### For Autonomous Execution (No Human)

1. **Start Picard** (Crew Manager) persona
2. **Invoke**: `run_factory_mission` with phase goal
3. **Picard decomposes** into step sequence
4. **Each crew member** executes → writes observation → next crew reads
5. **Loop continues** until phase complete
6. **Emit phase complete** → transition to next phase

---

## 9. Integration with Existing Systems

### CLAUDE.md Relationship

This prompt operationalizes §6 (Phase Plan) from CLAUDE.md:

```
CLAUDE.md §6: Phase Plan (Static)
        ↓ (realized by)
MASTER_ORCHESTRATION_PROMPT.md (Dynamic Routing)
        ↓ (routes to)
PHASE-N-EXECUTION.md (Phased Tasks)
        ↓ (leverages)
SYSTEM_PROMPT_UNIVERSAL.md (Crew Context)
```

### Crew-Memories Integration

```
crew-memories/active/
├── 2026-05-15T14-32-00Z_commander_data_p1_s3.json
├── 2026-05-15T16-30-00Z_geordi_la_forge_p1_s2.json
├── 2026-05-15T19-00-00Z_geordi_la_forge_p1_s3.json
└── ... (150+ files)

Orchestrator:
  - Calls recall_memory() to fetch prior observations
  - Parses JSON to extract decisions, entities, costs
  - Seeds next crew member's context
  - Prevents duplicate work + ensures consistency
```

### MCP Bridge Integration

```
Master Orchestration
        ↓
Phase Execution Prompt
        ↓
Crew Task Execution
        ↓
MCP Tool Invocation (run_crew_agent, search_code, etc.)
        ↓
MCP HTTP Bridge (:3002)
        ↓
Orchestrator (core/orchestrator.js)
        ↓
Supabase (state) + Redis (cache)
        ↓
Crew Observation Output
        ↓
(loop back to Master Orchestration)
```

---

## 10. Summary: How This All Fits Together

1. **You invoke** Master Orchestration Prompt (this file)
2. **Orchestrator determines** current phase (Phase 0–4)
3. **Orchestrator retrieves** crew memory + health status
4. **Orchestrator routes** to phase-specific prompt (PHASE-N-EXECUTION.md)
5. **Phase prompt assigns** crew member (e.g., Commander Data)
6. **Crew executes** step-specific task using universal patterns
7. **Crew invokes** MCP tools as needed (via bridge)
8. **Crew writes** observation to crew-memories/active/
9. **Next crew member** starts by reading prior observations
10. **Loop continues** until phase complete
11. **Orchestrator transitions** to next phase (or stops if complete)

**Result**: Fully autonomous execution across all 5 phases, with crew knowledge compounding across steps.

---

## 11. Next Actions

### If You're Starting Now

**Go to: PHASE-1-EXECUTION.md**

Phase 0 is complete. Phase 1 (VSCode Extension) is the critical blocker.

```
🎯 NEXT TASK
Load: PHASE-1-EXECUTION.md
Assign: Commander Data (ARCHITECT)
Task: p1-s1 (Extension Architecture Design)
Goal: Unblock Phase 2 (Monorepo Merge)
```

### If You're Continuing from Prior Work

**Query current state**:
```json
{
  "tool": "recall_memory",
  "args": {
    "query": "latest mission status phase step completion",
    "limit": 1
  }
}
```

Use the response to determine where to resume.

### If You're Deploying to Production

**Skip to: PHASE-4-EXECUTION.md**

But only after Phase 1–3 are complete.

---

**Document**: MASTER_ORCHESTRATION_PROMPT.md  
**Version**: 2026-05-15  
**Authority**: SYSTEM_PROMPT_UNIVERSAL.md + CLAUDE.md §6  
**Status**: Ready for autonomous execution
