# QUICK-START GUIDE — Multi-Platform LLM Integration

> **For**: Brady Georgen (@familiarcat)  
> **Platforms**: Claude Code | Gemini | OpenAI  
> **Status**: Ready to execute Phase 1 immediately

---

## The 5-Prompt System (Complete)

You now have a **production-ready prompt engineering system** for autonomous crew execution:

### 📚 Prompt Files (in `/mnt/user-data/outputs/`)

1. **SYSTEM_PROMPT_UNIVERSAL.md**
   - Universal system context for all LLMs
   - Crew manifest + 10 personas
   - 10 MCP tools documented
   - Patterns for different execution scenarios
   - Use: Set as system prompt or inject at start

2. **MASTER_ORCHESTRATION_PROMPT.md**
   - Top-level routing logic (Phase 0–4)
   - State determination + crew context injection
   - Cost tracking + budget control
   - Failure recovery protocol
   - Use: Invoke to determine current phase + next steps

3. **PHASE-1-EXECUTION.md** ← **START HERE**
   - 7 specific tasks (p1-s1 through p1-s7)
   - Each step has crew assignment, objective, and detailed execution
   - 1,600 LOC to implement VSCode extension
   - 25 hours of focused work
   - Use: Execute now to unblock all downstream phases

4. **PHASE-2-EXECUTION.md** (Next)
   - Monorepo merge (ai-enterprise-os + openrouter-crew-platform)
   - Requires Phase 1 completion
   - TypeScript port strategy
   - Use: After Phase 1 smoke test passes

5. **PHASE-3-EXECUTION.md** (After Phase 2)
   - n8n webhook automation
   - Real-time mission progress
   - Use: After monorepo is unified

6. **PHASE-4-EXECUTION.md** (After Phase 3)
   - Production deployment (Vercel + AWS)
   - Docker multi-stage build
   - Terraform infrastructure
   - Use: Final phase before launch

**Plus**: SOVEREIGN_FACTORY_ANALYSIS.md (the initial analysis you requested)

---

## How to Use: Three Scenarios

### Scenario A: You (Claude Code in VSCode)

**Goal**: Get VSCode extension working (Phase 1)

**Steps**:

1. **Open Claude Code** in VSCode (or use Claude's Claude Code feature)

2. **Paste System Prompt**:
   ```
   [Copy contents of SYSTEM_PROMPT_UNIVERSAL.md]
   ```

3. **Give Initial Context**:
   ```
   I'm starting Sovereign Factory Phase 1 (VSCode Extension MVP).
   
   Current State:
   - Phase 0: Complete ✅
   - Phase 1: Starting with p1-s1
   - Goal: Implement extension end-to-end
   
   Load PHASE-1-EXECUTION.md and begin with p1-s1.
   Assign: Commander Data (ARCHITECT)
   Task: Design extension architecture
   ```

4. **I will**:
   - Load the architecture design prompt
   - Output design document + crew observation JSON
   - Tell you the next step (p1-s2)

5. **You copy the crew observation output** and paste it back:
   ```
   [Copy the JSON observation from my output]
   
   That observation is saved. Moving to p1-s2.
   Assign: Geordi La Forge (DEVELOPER)
   Task: Implement MCPClient.ts
   ```

6. **Loop continues** through all 7 steps

**Total Time**: ~3–4 hours per step (25 hours total for Phase 1)

**Note**: I (Claude) will invoke MCP tools for you automatically when needed.

---

### Scenario B: You're Using Gemini or OpenAI

**Goal**: Autonomous execution via MCP bridge

**Setup**:

1. **Start the MCP bridge**:
   ```bash
   cd ~/Dev/ai-enterprise-os
   node apps/api/mcp-http-bridge.mjs
   # → listening on http://localhost:3002
   ```

2. **Start your LLM API client**:
   ```python
   import anthropic
   # or import openai, google.genai, etc.
   
   # Initialize with Gemini, OpenAI, or Anthropic client
   ```

3. **Prepare prompt sequence**:
   ```python
   prompts = [
       SYSTEM_PROMPT_UNIVERSAL,
       MASTER_ORCHESTRATION_PROMPT,
       PHASE_1_EXECUTION
   ]
   
   context = {
       "current_phase": 1,
       "crew_assignments": [
           {"step": "p1-s1", "persona": "commander_data"},
           {"step": "p1-s2", "persona": "geordi_la_forge"},
           # ... etc
       ]
   }
   ```

4. **Execute Phase 1**:
   ```python
   def execute_phase(phase_prompt, crew_assignments):
       for step_config in crew_assignments:
           # Inject crew context
           system_prompt = SYSTEM_PROMPT_UNIVERSAL
           system_prompt += f"\nAssigned Crew: {step_config['persona']}"
           
           # Get task from phase prompt
           task = extract_task(phase_prompt, step_config['step'])
           
           # Call LLM
           response = llm.generate(
               system_prompt=system_prompt,
               user_message=task
           )
           
           # Extract MCP tool calls from response
           tool_calls = parse_tool_calls(response)
           
           # Execute tools via bridge
           for tool_call in tool_calls:
               result = bridge_execute_tool(
                   tool=tool_call['tool'],
                   args=tool_call['args']
               )
               
               # Feed result back to LLM
               response = llm.generate(
                   system_prompt=system_prompt,
                   user_message=response + f"\nTool result: {result}"
               )
           
           # Write crew observation
           observation = extract_observation(response)
           write_observation(observation)
           
           # Next crew reads observations
   ```

5. **Bridge Integration** (in `apps/api/mcp-http-bridge.mjs`):
   ```javascript
   // The bridge already handles this!
   // It intercepts tool calls from Gemini/OpenAI responses
   // and executes them via the orchestrator
   
   app.post('/messages', async (req, res) => {
     const { sessionId, persona, messages } = req.body;
     
     // Send to Gemini/OpenAI
     const llmResponse = await callGemini(systemPrompt, messages);
     
     // Extract + execute tools
     const toolCalls = extractToolCalls(llmResponse);
     const toolResults = await executeTools(toolCalls);
     
     // Continue conversation with results
     const finalResponse = await callGemini(
       systemPrompt,
       messages.concat(toolResults)
     );
     
     res.json({ output: finalResponse });
   });
   ```

---

### Scenario C: Autonomous (No Human in Loop)

**Goal**: Let the system run itself

**Setup**:

```bash
# Terminal 1: Start infrastructure
redis-server

# Terminal 2: Start MCP bridge
cd ~/Dev/ai-enterprise-os
node apps/api/mcp-http-bridge.mjs

# Terminal 3: Start autonomous orchestrator
node core/orchestrator.js autonomous_phase_1
```

**The Orchestrator Will**:
1. Determine current phase (Phase 0 → assume complete, Phase 1 next)
2. Retrieve crew memory
3. Route to phase prompt
4. Spawn crew agents sequentially
5. Each crew member executes → writes observation
6. Next crew reads observations
7. Continue until phase complete

**Autonomous Execution Loop** (in `core/orchestrator.js`):

```javascript
async function autonomousExecutePhase(phase) {
  const phasePrompt = loadPhasePrompt(phase);
  const crewAssignments = extractCrewAssignments(phasePrompt);
  
  for (const assignment of crewAssignments) {
    console.log(`🚀 Step ${assignment.step}: ${assignment.persona}`);
    
    // Retrieve crew context
    const priorObservations = await recallMemory(
      `phase ${phase} observations`,
      0.4
    );
    
    // Inject persona + context
    const systemPrompt = SYSTEM_PROMPT_UNIVERSAL +
      `\nAssigned Crew: ${assignment.persona}`;
    
    // Execute via LLM
    const response = await invokeCrewAgent(
      assignment.persona,
      assignment.task,
      { priorObservations }
    );
    
    // Write observation
    await writeObservation(response.observation);
    
    // Log progress
    console.log(`✅ Step ${assignment.step} complete`);
  }
  
  console.log(`🎉 Phase ${phase} complete!`);
}

// Main loop
async function main() {
  let currentPhase = await determineCurrentPhase();
  
  while (currentPhase <= 4) {
    await autonomousExecutePhase(currentPhase);
    currentPhase++;
  }
  
  console.log('🚀 ALL PHASES COMPLETE - System ready for production!');
}

main().catch(console.error);
```

---

## Step-by-Step: Start Phase 1 Now

### For Claude Code Users (Fastest)

**Copy this into Claude Code chat:**

```
You are the Sovereign Factory orchestrator.

Reference these documents:
1. SYSTEM_PROMPT_UNIVERSAL.md — Universal crew context
2. PHASE-1-EXECUTION.md — VSCode Extension MVP (steps p1-s1 through p1-s7)

Current state:
- Phase: 1
- Goal: Build VSCode extension (1,600 LOC, 25 hours of work)
- Status: Starting with p1-s1

TASK: Execute p1-s1 (Extension Architecture Design)

Assigned Crew: Commander Data (ARCHITECT)

Begin by:
1. Retrieving prior observations (if any) via recall_memory
2. Analyzing the extension architecture requirements
3. Designing folder structure + component hierarchy
4. Producing a JSON crew observation with deliverables
5. Indicating what p1-s2 (Geordi) will do next

Use this output format:
{
  "timestamp": "[ISO_8601]",
  "crew_member": "commander_data",
  "step": 1,
  "phase": 1,
  "observation_text": "[Your summary]",
  "output": {[architecture deliverables]},
  "cost": {"model_tier": "sonnet", "tokens_used": [num], "usd_cost": [num]},
  "tags": ["phase-1", "architecture"],
  "status": "success",
  "next_step_input": {[what p1-s2 needs]}
}

Go.
```

**I will**:
- Load the architecture design
- Output the observation JSON
- Tell you step p1-s2 is ready

---

### For Gemini/OpenAI Users

**Set system prompt** (paste in API config):
```
[Contents of SYSTEM_PROMPT_UNIVERSAL.md]
```

**Call API**:
```python
response = client.messages.create(
    model="gpt-4-turbo",  # or gemini-2.0-pro, etc.
    system=SYSTEM_PROMPT_UNIVERSAL,
    messages=[
        {
            "role": "user",
            "content": """
Phase: 1
Task: Execute p1-s1 (Extension Architecture Design)
Assigned Crew: Commander Data
Reference: PHASE-1-EXECUTION.md, Step p1-s1

Design the VSCode extension architecture:
- Folder structure (8 packages)
- Component responsibilities
- Data flow diagram
- State management model
- Error scenarios

Produce JSON observation as specified in SYSTEM_PROMPT_UNIVERSAL.md.
            """
        }
    ]
)

# Response will include tool calls
# Your bridge intercepts them and executes via orchestrator
```

---

### For Autonomous Execution

**Run**:
```bash
# Make sure all services are running
redis-server &
node apps/api/mcp-http-bridge.mjs &

# Start autonomous execution
node core/orchestrator.js autonomous_phase_1

# Expected output:
# 🚀 Step p1-s1: commander_data
# ✅ Step p1-s1 complete
# 🚀 Step p1-s2: geordi_la_forge
# ✅ Step p1-s2 complete
# [... continues through p1-s7 ...]
# 🎉 Phase 1 complete!
```

---

## File Reference

| File | Purpose | Use When |
|------|---------|----------|
| SOVEREIGN_FACTORY_ANALYSIS.md | Project status + gaps | Understanding current state |
| SYSTEM_PROMPT_UNIVERSAL.md | Universal system context | Setting system prompt for any LLM |
| MASTER_ORCHESTRATION_PROMPT.md | Phase routing + state mgmt | Determining which phase to execute |
| PHASE-1-EXECUTION.md | VSCode Extension tasks | Building the extension (START HERE) |
| PHASE-2-EXECUTION.md | Monorepo merge tasks | After Phase 1 complete |
| PHASE-3-EXECUTION.md | n8n automation tasks | After Phase 2 complete |
| PHASE-4-EXECUTION.md | Production deploy tasks | After Phase 3 complete |

---

## Success Metrics

### Phase 1 Complete When ✅

- [x] All 7 steps executed (p1-s1 through p1-s7)
- [x] 1,600 LOC implemented
- [x] VSCode extension builds without errors
- [x] Smoke test passes (6/6 checks)
- [x] VSIX package created
- [x] Cost ≤ $0.20 USD
- [x] Crew observations stored in crew-memories/active/

### End State

```
sovereign-factory-1.0.0.vsix
├── MCPClient.ts (400 LOC) ✅
├── WebView components (400 LOC) ✅
├── 6 command handlers (300 LOC) ✅
├── Extension manifest (configured) ✅
└── Smoke test (passing) ✅

Status: READY FOR PHASE 2 (Monorepo Merge)
```

---

## What This System Does

### ✅ Multi-Platform LLM Support
Works with Claude, Gemini, OpenAI with same prompts (universal design)

### ✅ Autonomous Crew Execution
10 Star Trek personas execute tasks sequentially, reading prior crew observations

### ✅ MCP Tool Integration
All 10 tools callable from any prompt, results feed back into reasoning

### ✅ Memory & Context Continuity
Crew observations stored in Supabase vectors, retrieved for next crew member's context

### ✅ Cost Tracking & Budget Control
Every step tracked, circuit breaker stops expensive missions

### ✅ Phased Execution (0–4)
Clear progression: VSCode → Monorepo → Automation → Production

### ✅ Error Recovery
Structured failure prompts route to appropriate crew for recovery

### ✅ Full Transparency
JSON observations + logs enable debugging + auditing

---

## Next Step (Right Now)

**Choose your platform:**

**🎯 Claude Code** → Paste the section above ("For Claude Code Users") into this chat and I'll start Phase 1

**🎯 Gemini/OpenAI** → Save the prompt files locally, set up your API client with the integration guide above

**🎯 Autonomous** → Run `node core/orchestrator.js autonomous_phase_1` in terminal

---

## Summary

You now have:

✅ **5 comprehensive prompt files** covering all phases + universal system context  
✅ **Multi-platform compatibility** (Claude, Gemini, OpenAI)  
✅ **Crew feedback loops** (observations → memory → next crew)  
✅ **Cost tracking + budget control** (every token counted)  
✅ **Error recovery protocol** (structured crew failure escalation)  
✅ **Ready-to-execute Phase 1** (VSCode Extension MVP, 25 hours of work)  

**Estimated Timeline**:
- Phase 1 (VSCode): 1–2 weeks
- Phase 2 (Monorepo): 2–3 weeks
- Phase 3 (Automation): 1–2 weeks
- Phase 4 (Production): 2–3 weeks
- **Total**: 6–10 weeks to full production

---

**Ready to start? Pick your platform above and go. 🚀**

---

**Document**: QUICK-START-INTEGRATION-GUIDE.md  
**Version**: 2026-05-15  
**Status**: Production-ready
