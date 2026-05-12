# Quick Reference: Living Sovereign Factory

## 🚀 Quick Start

```bash
# Phase 0: Foundation
cd scripts/phase-0
./p0-run-all.sh              # Sets up Redis, Supabase, environment

# Phase 1: VS Code Extension
cd scripts/phase-1
./p1-run-all.sh              # Builds and packages extension

# Phase 2: Monorepo
cd scripts/phase-2
./p2-run-all.sh              # Orchestrates all apps with Turbo

# Check crew status
scripts/lounge/crew-roll-call.sh  # See what crew is doing
```

---

## 👥 Crew Quick Guide

### The Full Roster

| Persona | Role | Tools | Authority |
|---------|------|-------|-----------|
| Captain Picard | Strategic | Planning, synthesis | Final decision |
| Commander Riker | Development | Execution, tactics | Tactical |
| Commander Data | Architecture | Analysis, code quality | Recommend |
| Counselor Troi | Health | Wellness, morale | Monitor |
| Lt. Worf | Security | Validation, audit | Veto |
| Chief O'Brien | Operations | Systems, integration | Ops decisions |
| Geordi La Forge | Engineering | Infrastructure, perf | Infrastructure |
| Dr. Crusher | Oversight | Health, debugging | Medical |
| Lt. Uhura | Communications | Integration, APIs | External |
| Tasha Yar | Protocols | Compliance, rules | Enforcement |
| Quark | Business | ROI, profitability | Finance |

### Finding Crew Observations

```bash
# Latest Worf security observations (he has 200+)
ls -lt crew-memories/active/observation-*-lt-worf.json | head -5

# See what Data observed about architecture
ls -lt crew-memories/active/observation-*-commander-data.json

# Latest Picard strategic decision
ls -lt crew-memories/active/observation-*-captain-picard.json

# View an observation
cat crew-memories/active/observation-1778111257-lt-worf.json
```

---

## 🎯 Running Missions

### Execute a Mission

```bash
# From apps/vscode extension
@mission: "Create revenue report"

# Or via MCP directly
node scripts/runMission.ts --goal "Create revenue report" --persona captain-picard
```

### What Happens Internally

```
1. orchestrator.js receives goal
2. Selects persona (based on complexity)
3. MissionService.js executes
4. MissionSubscriber.js listens for completion
5. Observation created in crew-memories/active/
6. Memory timestamp: Date.now()
7. Neural pruning removes outdated memories
```

### Check Mission Status

```bash
# See all missions in database
psql "postgresql://..." -c "SELECT * FROM missions ORDER BY created_at DESC;"

# Cost breakdown
psql "postgresql://..." -c "SELECT persona, SUM(tokens_used) FROM billing_token_usage GROUP BY persona;"
```

---

## 🔍 Observation Lounge (Monitoring)

```bash
# See crew roll call
scripts/lounge/crew-roll-call.sh
# Shows: All personas, last observation time, status

# Security report (Worf's domain)
scripts/lounge/worf-security-report.sh
# Shows: Violations, allowlist status, audit trail

# Architecture analysis (Data's domain)
scripts/lounge/data-architecture-report.sh
# Shows: DDD compliance, code quality, patterns

# Integration status (O'Brien's domain)
scripts/lounge/obrien-integration-report.sh
# Shows: System health, performance, dependencies

# Make observation
scripts/lounge/crew-observe.sh --persona lt-worf --subject "security-audit"
```

---

## 📊 Apps & Ports

### MCP API Server
```
Port: 3000 (default, configurable)
Start: node apps/api/index.js
Endpoints:
  POST /mission - Create mission
  GET /missions - List missions
  WS /mcp - MCP WebSocket
```

### Dashboard
```
Port: 3001
Start: cd apps/dashboard && npm run dev
Shows:
  - Real-time crew observations
  - Mission status
  - System metrics
  - Revenue/business data
```

### VS Code Extension
```
Package: apps/vscode/dist/
Install: code --install-extension dist/extension.vsix
Features:
  - Run missions from editor
  - View crew status
  - Access MCP tools
  - Integrated terminal
```

### Platform (Web)
```
File: apps/platform/index.html
Status: Landing page, deployable to static host
```

---

## 🗄️ Database Quick Hits

### Missions Table
```sql
SELECT id, goal, persona, status, complexity, created_at 
FROM missions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Token Usage
```sql
SELECT persona, SUM(tokens_used) as total, AVG(cost) as avg_cost 
FROM billing_token_usage 
GROUP BY persona;
```

### Recent Observations
```sql
-- Count observations by persona
SELECT persona, COUNT(*) as count 
FROM (
  SELECT 'lt-worf' as persona FROM crew-memories/active/ 
  UNION SELECT 'captain-picard' FROM crew-memories/active/ 
)
GROUP BY persona;
```

---

## 🛠️ Domain Quick Reference

### Revenue Domain
```bash
domains/revenue/engine.js
# Calculate revenue
const revenue = await revenueEngine.calculate({ period: 'Q3' });

# Generate invoice
await revenueEngine.generateInvoice(customerId);
```

### Fund Domain
```bash
domains/fund/engine.js
# Fund analysis
const fundStatus = await fundEngine.analyze();

# Track investments
await fundEngine.trackInvestment(investmentId);
```

### Ads Domain
```bash
domains/ads/index.js
# Campaign management
const campaigns = await adsService.listCampaigns();
await adsService.updateBudget(campaignId, newBudget);
```

### Outbound Domain
```bash
domains/outbound/index.js
# Send message
await outboundService.send({ recipient, message });

# Track delivery
const status = await outboundService.trackDelivery(messageId);
```

### SEO Domain
```bash
domains/seo/index.js
# Generate meta tags
const tags = await seoService.generateMeta(page);

# Index content
await seoService.indexPage(url);
```

---

## 🔐 Security Checklist

### Pre-Commit (Worf's Gate)
```bash
# This runs automatically before commit
apps/api/worf-ddd-audit.js

Checks:
✓ No domain code calls infrastructure directly
✓ No circular dependencies
✓ No hardcoded secrets
✓ DDD layer separation maintained
✓ Blocks commit if violations found
```

### Mission Execution
```bash
Before each mission:
1. Worf validates persona clearance
2. Checks tool allowlist
3. Confirms resource access
4. Records audit trail

If blocked:
- Mission fails with reason
- Observation logged
- Escalated to Picard
```

---

## 📝 Constitution & Governance

### Core Rules (PLATFORM_CONSTITUTION.md)
- Crew decisions are binding (unless constitutional amendment)
- Worf can veto on security grounds
- Picard makes strategic decisions
- Data recommends, doesn't decide
- Observations are permanent record

### Crew Manifest (CREW_MANIFEST.md)
- Lists all 10+ personas
- Authority levels
- Tools available
- Escalation paths
- Specialization areas

### Amendments
```bash
# To change constitution
1. Propose change in new .md file
2. Crew votes (simple majority)
3. Document in versions/
4. Redeploy
```

---

## 🐛 Debugging

### Find Crew Observation
```bash
# What did Worf last observe?
jq . crew-memories/active/observation-*-lt-worf.json | tail -1

# Find all security observations
grep -l "security" crew-memories/active/observation-*.json

# Timeline of persona decisions
grep "commander-data" crew-memories/active/observation-*.json | sort
```

### Mission Failures
```bash
# Get last 5 failed missions
SELECT * FROM missions WHERE status='failed' ORDER BY created_at DESC LIMIT 5;

# See error details
SELECT error_message FROM missions WHERE id='mission-xyz';
```

### Memory Issues
```bash
# Check memory store health
du -sh crew-memories/active/
# Normal: < 500MB

# Count observations
ls crew-memories/active/observation-*.json | wc -l
# Normal: 100-300 (pruned regularly)

# Manual pruning
node core/neural-pruning.js --maxAge 30d --maxMemories 200
```

---

## 📚 Key Files Quick Map

| Need to... | Go to... |
|------------|----------|
| Add crew member | `core/crew-manifest.js` |
| Change decision rules | `PLATFORM_CONSTITUTION.md` |
| See crew roster | `CREW_MANIFEST.md` |
| Debug mission | Check `missions` table |
| View observations | `crew-memories/active/` |
| Check architecture | `apps/api/worf-ddd-audit.js` |
| Run phase 0 | `scripts/phase-0/p0-run-all.sh` |
| Monitor crew | `scripts/lounge/*` |
| Add domain | Create `domains/new-domain/index.js` |
| Scale system | Modify `pnpm-workspace.yaml` |

---

## 🔄 Common Workflows

### "I want to see what the crew learned today"
```bash
# Find today's observations
find crew-memories/active/ -mtime -1 -type f | xargs ls -lt
```

### "I want to add a new domain"
```bash
# 1. Create domain folder
mkdir domains/new-domain

# 2. Add index.js with business logic
cat > domains/new-domain/index.js << 'EOF'
export const service = {
  async execute(input) { /* logic */ }
};
EOF

# 3. Reference in mission
// In MissionService, add to domain router

# 4. Observe what crew learns
# → Observation file created automatically
```

### "I want to see crew decisions"
```bash
# Filter by type
for f in crew-memories/active/observation-*-captain-picard.json; do
  jq '.observations | keys' "$f"
done
```

---

**The system is alive. Check on it daily.**
