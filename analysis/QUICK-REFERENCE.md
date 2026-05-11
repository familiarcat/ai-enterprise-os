# Quick Reference: Using the Sovereign Factory

## 🎯 Crew Coordination Quick Guide

### When You Have a Goal...

```
YOU: "I need a new payment-processing domain"
     ↓
PICARD: "Analyzing mission requirements..."
     ├→ Asks DATA: "What patterns apply?"
     ├→ Asks WORF: "What are the risks?"
     ├→ Asks GEORDI: "Is our infrastructure ready?"
     ├→ Asks RIKER: "How do we execute?"
     └→ Synthesizes → Approves mission
     ↓
RIKER: "Executing mission step by step..."
     ├→ Calls complexityRouter.selectModel(step)
     ├→ Executes via appropriate LLM (Haiku/Sonnet/Opus)
     └→ Reports blockers to PICARD
     ↓
RESULT: New domain scaffolded, patterns learned, decision recorded
```

---

## 🔀 Model Selection Quick Cheat

| Complexity | Model | Persona | Cost | Best For |
|-----------|-------|---------|------|----------|
| 0.0–0.3 | Haiku | Riker | 1x | Simple tasks, quick answers |
| 0.3–0.7 | Sonnet | Data | 3.75x | Reasoning, code gen, design |
| 0.7–1.0 | Opus | Picard | 18.75x | Deep synthesis, edge cases |

**Example Scores:**
- Summarize 2KB doc → 0.15 → **Haiku**
- Generate TypeScript → 0.52 → **Sonnet**
- Design payment system → 0.85 → **Opus**

---

## 🛡️ Worf's Security Gate Flow

```
Agent tries to call MCP tool
     ↓
WORF checks:
  ✓ Is persona authorized?
  ✓ Is tool allowlisted?
  ✓ Does persona have clearance?
  ✓ Is resource valid?
     ↓
If all checks pass:
  ✓ Tool executes
  ✓ Audit logged
     ↓
If any check fails:
  ✗ Worf blocks action
  ✗ Reason provided
```

**Current Allowlist:**
- `figma_mcp`: Picard, Riker
- `github_mcp`: Geordi, Data
- [Add more via `core/mcp-manifest/allowlist.yaml`]

---

## 📂 Finding Code by Persona

**Need to understand Picard's decisions?**
→ `core/orchestrator/planner.js`

**Need to understand Riker's execution?**
→ `core/orchestrator/executor.js`

**Need to understand Data's analysis?**
→ `scripts/analyze-history.js` or `core/scaffold/`

**Need to understand Worf's validation?**
→ `core/mcp-manifest/worf-gate.js`

**Need to understand Geordi's setup?**
→ `apps/api/setup_credentials.sh` or `scripts/deploy-mcp.sh`

---

## 🧪 Testing by Scenario

```bash
# Test Picard's planning
pnpm test -- orchestrator.test.js

# Test complexity routing
pnpm test -- router.test.js

# Test Worf's gate
pnpm test -- worf-gate.test.js

# Test all
pnpm test
```

---

## 📝 Adding a New MCP Tool

1. **Create the tool** in `tools/[tool-name]/index.js`:
   ```javascript
   export const myTool = {
     name: 'my_tool',
     description: 'Does something awesome',
     inputSchema: { /* ... */ },
     handler: async (input) => { /* ... */ }
   };
   ```

2. **Register in MCP server** (`apps/api/mcp-server.js`):
   ```javascript
   import { myTool } from '../tools/my-tool/index.js';
   server.tool(myTool.name, myTool.description, myTool.inputSchema, myTool.handler);
   ```

3. **Add to allowlist** (`core/mcp-manifest/allowlist.yaml`):
   ```yaml
   - server: my_mcp
     tools: [my_tool]
     personas: [Picard, Riker]  # Who can use it
     rateLimit: 100/hour
     audit: true
   ```

4. **Test**:
   ```bash
   # Start MCP server
   node ./apps/api/mcp-server.js
   
   # Test in Claude
   @sovereign-factory: Call my_tool with...
   ```

---

## 🏗️ Scaffolding a New Domain

```bash
# 1. Analyze project patterns
node scripts/analyze-history.js --output patterns.json

# 2. Generate new domain
node scripts/scaffold-domain.js \
  --name my-domain \
  --learned-patterns patterns.json

# 3. Customize the domain
cd domains/my-domain
# Edit domain/, application/, infrastructure/, ui/

# 4. Record the decision
echo "## My Domain Rationale" > ../../versions/vN-my-domain.md

# 5. Test
pnpm test
```

---

## 💰 Estimated Cost Savings

With complexity-based routing:

| Scenario | Without Routing | With Routing | Savings |
|----------|----------------|--------------|---------| 
| 100 simple tasks | 100 × Opus = $1,500 | 100 × Haiku = $80 | **95%** |
| 60 reasoning + 40 simple | 100 × Opus = $1,500 | 60 × Sonnet + 40 × Haiku = $225 | **85%** |
| Mixed workload | Average Opus = $15 | Average $4.50 | **70%** |

**At scale:** **$1,500/month → $300/month** (80% savings)

---

## 🔗 Key Files & Links

| What | Where |
|------|-------|
| Main README | `/README.md` |
| Environment setup | `./setup_credentials.sh` |
| MCP server | `apps/api/mcp-server.js` |
| Test suite | `orchestrator.test.js` |
| Decision history | `versions/` |
| Crew definitions | `core/crew-manifest/personas.json` |
| Security config | `core/mcp-manifest/allowlist.yaml` |
| DDD example | `domains/[any-domain]/` |

---

## 🎯 Common Tasks

### "I want to check the project structure"
```bash
ls -la              # See all files
tree -L 2 domains/  # See domain structure
```

### "I want to add a new decision to history"
```bash
# Edit versions/v[N]-title.md with:
# - Why we made this decision
# - Trade-offs considered
# - How it affects architecture
```

### "I want to test a crew interaction"
```bash
# In Claude with MCP server running:
@sovereign-factory: Let Picard coordinate...
```

### "I want to see Worf blocking an action"
```bash
# Try to call a non-allowlisted tool:
@sovereign-factory: Call [unauthorized_tool]
# Worf blocks it with reason
```

---

## 📖 Learn More

| Topic | Location |
|-------|----------|
| DDD concepts | `/domains/*/domain/` |
| MCP protocol | `apps/api/mcp-server.js` |
| Crew personas | `core/crew-manifest/personas.json` |
| Orchestration logic | `core/orchestrator/` |
| Complexity scoring | `core/router/complexity-scorer.js` |

---

## ⚠️ Common Mistakes

❌ **"I hardcoded the LLM provider"**
→ Use `MODEL_NAME` env var instead

❌ **"I put business logic in infrastructure layer"**
→ Move to domain/ or application/

❌ **"I tried to bypass Worf's gate"**
→ Can't—it validates all calls

❌ **"I forgot to update /versions with my decision"**
→ Future scaffolding won't learn from it

---

**Remember:** You're not building isolated agents. You're building a team.

Picard decides. Riker executes. Data analyzes. Worf validates. Geordi builds.

Together, they're unstoppable. 🚀
