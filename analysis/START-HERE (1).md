# 🚀 START HERE: The Living Sovereign Factory

**Status:** ✅ **LIVE SYSTEM** (Not theoretical)  
**Crew Members:** 10+ personas actively learning  
**Observations Recorded:** 150+ in crew-memories/active/  
**Apps Deployed:** 4 (API, Dashboard, VS Code, Platform)  
**Business Domains:** 5 (ads, fund, revenue, outbound, seo)  

---

## What You're Actually Looking At

This is **NOT** a framework or template. This is a **living, operational system** where:

✅ **Crew members make real decisions** – Recorded in `crew-memories/active/`  
✅ **Memory is active** – Observations from 200+ Worf checks, 50+ Data analyses  
✅ **Learning happens** – Neural pruning removes old memories, keeps patterns  
✅ **Apps are deployed** – API server, Next.js dashboard, VS Code extension  
✅ **Business domains run** – Revenue, advertising, fund management, etc.  
✅ **Constitution governs** – Rules in `PLATFORM_CONSTITUTION.md`  
✅ **Phases execute** – Phase 0 (foundation), Phase 1 (extension), Phase 2 (orchestration)  

---

## Choose Your Path

### 👤 I'm a Developer
```
1. Read: README.md (sections: "Real Architecture", "The Mission Flow")
2. Skim: ARCHITECTURE-GUIDE.md (focus on "Apps & Entry Points")
3. Setup: scripts/phase-0/p0-run-all.sh
4. Explore: core/orchestrator.js + core/MissionService.js
5. Deploy: scripts/phase-2/p2-run-all.sh
→ Bookmark: QUICK-REFERENCE.md
```

### 🏛️ I'm an Architect
```
1. Read: ARCHITECTURE-GUIDE.md (all of it)
2. Review: PLATFORM_CONSTITUTION.md
3. Study: CREW_MANIFEST.md
4. Examine: apps/api/worf-ddd-audit.js (DDD validation)
5. Analyze: domains/ (real business logic)
→ Reference: System Map in ARCHITECTURE-GUIDE.md
```

### 🔒 I'm Security/Compliance
```
1. Read: PLATFORM_CONSTITUTION.md (governance rules)
2. Review: apps/api/worf-ddd-audit.js (pre-commit audit)
3. Check: scripts/lounge/worf-security-report.sh
4. Examine: crew-memories/active/ (Worf's observations)
5. Monitor: Observation logs for compliance
→ Key file: CREW_MANIFEST.md (Worf's authority)
```

### 📊 I'm Product/Business
```
1. Read: README.md (sections: "Real Domains", "The Expanded Crew")
2. Review: domains/ (actual business logic)
3. Check: scripts/lounge/crew-roll-call.sh (status)
4. Understand: Mission flow (README.md)
5. Monitor: Revenue domain for metrics
→ Track: apps/dashboard (real-time metrics)
```

### 🚀 I'm DevOps/Infrastructure
```
1. Read: ARCHITECTURE-GUIDE.md (sections: "Phase Structure", "Deployment Artifacts")
2. Review: scripts/phase-0/, phase-1/, phase-2/
3. Check: core/docker-compose.yml (stack)
4. Understand: apps/api/Dockerfile (container)
5. Setup: turbo.json (build pipeline)
→ Monitor: apps/dashboard (system health)
```

---

## Understanding the System (5 Minutes)

### The Crew (10+ Real Personas)
```
Strategic:     Captain Picard, Counselor Troi, Quark
Operational:   Riker, Data, Worf, O'Brien, Geordi
Support:       Dr. Crusher, Uhura, Tasha Yar
```

**Where they live:** `crew-memories/active/`

**What they do:** Make observations, learn from decisions, inform future missions

### The Mission Flow
```
User: "Create revenue report"
    ↓
Picard (orchestrator.js): Receive goal
    ↓
MissionService: Execute with best persona
    ↓
MissionSubscriber: Listen for completion
    ↓
crew-memories/active/: Store observation
    ↓
neural-pruning.js: Remove old memories
    ↓
Next mission: Informed by learning
```

### The Apps
```
API Server        → core logic, MCP protocol, mission execution
Dashboard         → real-time crew status, observations, metrics
VS Code Extension → run missions from editor, view crew
Platform          → landing page, deployment
```

### The Real Domains
```
ads/      → advertising campaigns
fund/     → fund management
revenue/  → billing, payments
outbound/ → communications
seo/      → search optimization
```

### The Phases
```
Phase 0 → Foundation (Redis, Supabase, env setup)
Phase 1 → Extension (VS Code extension)
Phase 2 → Orchestration (Turbo, all apps)
```

---

## Quick Commands

### See What The Crew Is Doing
```bash
scripts/lounge/crew-roll-call.sh
# Shows: All personas, last observation, status
```

### Check Security
```bash
scripts/lounge/worf-security-report.sh
# Shows: Violations, allowlist, audit trail
```

### View Architecture Analysis
```bash
scripts/lounge/data-architecture-report.sh
# Shows: DDD compliance, code quality, patterns
```

### Get System Status
```bash
scripts/lounge/obrien-integration-report.sh
# Shows: System health, performance, dependencies
```

### View Crew Observations
```bash
cat crew-memories/active/observation-1778111257-lt-worf.json
# Shows: Worf's security observation
```

---

## The Key Files

| File | Why It Matters |
|------|----------------|
| README.md | **Start here** – Overview of the whole system |
| ARCHITECTURE-GUIDE.md | Deep dive into components and flows |
| QUICK-REFERENCE.md | Practical commands and workflows |
| core/orchestrator.js | Brain of the system – mission execution |
| core/crew-manifest.js | Definition of all 10+ personas |
| core/MissionService.js | Mission execution logic |
| core/MissionSubscriber.js | Event listening, memory recording |
| core/neural-pruning.js | Memory management |
| apps/api/mcp-server.js | MCP protocol handler |
| apps/api/worf-ddd-audit.js | Security validation gate |
| crew-memories/active/ | Live observations from all crew |
| PLATFORM_CONSTITUTION.md | Governance rules |
| CREW_MANIFEST.md | Full crew roster |
| scripts/phase-0/p0-run-all.sh | Foundation setup |
| scripts/phase-1/p1-run-all.sh | Extension setup |
| scripts/phase-2/p2-run-all.sh | Orchestration setup |

---

## What's Different From Traditional Systems

| Traditional | Sovereign Factory |
|-------------|-------------------|
| One system brain | 10+ crew personas with specialized roles |
| Decisions made in code | Decisions recorded, timestamped, observable |
| No learning loop | Active memory system with neural pruning |
| Static architecture | Living system that evolves |
| Manual monitoring | Crew self-observes and reports |
| Single app | 4 apps (API, dashboard, extension, platform) |
| Example domains | Real business domains (ads, revenue, fund) |
| Theoretical governance | Constitution-governed with voting |

---

## Getting Started (30 Minutes)

### Step 1: Read (5 min)
```
Open README.md, read sections:
- "What This Actually Is"
- "The Expanded Crew"
- "The Real Architecture"
```

### Step 2: Check Crew Status (2 min)
```bash
scripts/lounge/crew-roll-call.sh
# See all 10+ personas and their last observation
```

### Step 3: View Observations (3 min)
```bash
# See what Worf observed
ls -lt crew-memories/active/observation-*-lt-worf.json | head -3
cat crew-memories/active/observation-1778111257-lt-worf.json | jq .

# See what Data observed
ls -lt crew-memories/active/observation-*-commander-data.json | head -3
```

### Step 4: Setup Foundation (15 min)
```bash
cd scripts/phase-0
./p0-run-all.sh
# Sets up: Redis, Supabase, environment, migrations, MCP bridge
```

### Step 5: Understand Phases (5 min)
```
Phase 0 (complete): Foundation
Phase 1: Run scripts/phase-1/p1-run-all.sh for VS Code extension
Phase 2: Run scripts/phase-2/p2-run-all.sh for orchestration
```

---

## Common Questions

**Q: Is this actually running?**  
A: Yes. Crew has 150+ observations in `crew-memories/active/`. Latest timestamp shows it's live.

**Q: How do I run a mission?**  
A: From VS Code extension (after Phase 1): Type `@mission: "goal"`. Or via MCP API.

**Q: Where are crew decisions stored?**  
A: `crew-memories/active/` folder. One JSON file per observation, timestamped.

**Q: How does it learn?**  
A: MissionSubscriber listens for completion events, stores observations. Neural pruning removes old memories. Future missions reference remaining observations.

**Q: Is this DDD?**  
A: Yes. Domains in `domains/`. Pre-commit gate validates layer separation. No circular dependencies.

**Q: What do the domains do?**  
A: Real business logic. Revenue calculations, ad campaigns, fund management, outbound communication, SEO optimization.

**Q: How do I add a new crew member?**  
A: Edit `core/crew-manifest.js`. Add entry with role, tools, authority. Crew member starts making observations immediately.

---

## Next Steps

### If You're Curious (Now)
```
1. Read README.md
2. Run: scripts/lounge/crew-roll-call.sh
3. Browse: crew-memories/active/ (open a JSON file)
4. Explore: domains/ (see business logic)
```

### If You're Building (Today)
```
1. Run Phase 0: scripts/phase-0/p0-run-all.sh
2. Check: QUICK-REFERENCE.md
3. Run: scripts/lounge/worf-security-report.sh
4. Develop: Add to domains/ or core/
```

### If You're Deploying (This Week)
```
1. Run Phase 0: Foundation
2. Run Phase 1: VS Code extension
3. Run Phase 2: Orchestration
4. Monitor: scripts/lounge/*
5. Track: apps/dashboard
```

---

## Key Insight

**This isn't a tool you use. It's a team you work with.**

The crew members (Picard, Worf, Data, Riker, etc.) are:
- Making decisions
- Learning from observations  
- Enforcing rules
- Managing infrastructure
- Growing stronger

You're managing the team, not just the code.

---

## Document Map

```
START-HERE.md (You are here)
    ├─ README.md (Comprehensive overview)
    ├─ ARCHITECTURE-GUIDE.md (Technical deep dive)
    └─ QUICK-REFERENCE.md (Daily commands)

Also read:
    ├─ PLATFORM_CONSTITUTION.md (Governance)
    ├─ CREW_MANIFEST.md (Team roster)
    └─ AI_ENTERPRISE_OS_ANALYSIS.md (Deep analysis)
```

---

## You're Ready 🚀

Pick your path above, read the first file, and dive in.

The crew is waiting. The system is live. The learning never stops.

---

**Made with ❤️ for autonomous enterprise teams**

**Sovereign Factory • May 2026 • Brady Georgen (@familiarcat)**
