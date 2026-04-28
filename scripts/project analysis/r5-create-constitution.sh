#!/bin/bash

###############################################################################
# r5-create-constitution.sh — Remediation Phase 5
# Purpose: Create platform constitution and governance documentation
# Assigned crew: Picard (governance), Data (documentation)
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DRY_RUN="${1:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() {
  echo -e "${BLUE}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
echo "=== PHASE 5: PLATFORM CONSTITUTION ==="
echo ""

# Create main constitution file
log_step "Creating PLATFORM_CONSTITUTION.md..."

CONSTITUTION_PATH="$ROOT/PLATFORM_CONSTITUTION.md"

if [[ -f "$CONSTITUTION_PATH" ]]; then
  log_warning "PLATFORM_CONSTITUTION.md already exists"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$CONSTITUTION_PATH" "$CONSTITUTION_PATH.bak"
  fi
fi

if [[ -z "$DRY_RUN" ]]; then
  cat > "$CONSTITUTION_PATH" << 'EOF'
# Sovereign Factory Platform Constitution

**Last Updated:** 2026-04-18  
**Version:** 0.1.0  
**Status:** Active Development (Phase 0-4)

---

## I. Platform Identity

### Name
**Sovereign Factory** — An MCP-native platform for distributed AI-powered enterprise operations.

### Guiding Principles
1. **Crew-based architecture** — Human-like agents with specialized roles (Star Trek personas)
2. **Model-agnostic routing** — Complexity-based agent selection (Haiku → Sonnet → Opus)
3. **Memory persistence** — Supabase-backed crew memories with persistent observation layers
4. **Security-first design** — Zero hardcoded secrets, AWS SSM for production
5. **Incremental deployment** — Phase-driven rollout (0-4) with verification at each step

---

## II. Core Architecture

### 2.1 Deployment Topology

#### **Development Environment**
- **Frontend:** Local Next.js dev server (port 3000)
- **MCP Server:** Local Node.js process (mcp-server.js)
- **Backend:** Supabase local (127.0.0.1:54321)
- **Credentials:** ~/.zshrc (mode 600)

#### **Production Environment**
- **Frontend:** Vercel (Next.js dashboard)
- **Backend:** AWS EC2 (MCP server, n8n, Redis)
- **Database:** Supabase (managed)
- **Credentials:** AWS Systems Manager Parameter Store
- **Authentication:** AWS IAM roles (no hardcoded keys)

### 2.2 Monorepo Structure

```
ai-enterprise-os/
├── apps/
│   ├── dashboard/          # Next.js web UI (Vercel target)
│   ├── vscode/            # VSCode extension
│   └── api/               # Express backend (AWS EC2 target)
├── packages/
│   ├── mcp-bridge/        # HTTP/SSE bridge for MCP
│   ├── crew-personas/     # Agent persona definitions
│   ├── crew-memory/       # Supabase sync layer
│   └── orchestrator/      # Mission & task execution
├── lib/
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Shared utilities
├── scripts/               # Phase execution scripts
├── remediation/           # Remediation automation
└── terraform/             # AWS infrastructure as code
```

### 2.3 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 14+ |
| **Backend** | Node.js + Express | 18+ |
| **MCP Server** | @modelcontextprotocol/sdk | 0.6.1+ |
| **Database** | Supabase (PostgreSQL) | Latest |
| **ORM** | Supabase JS SDK | 2.103+ |
| **State** | Redux Toolkit + React Query | Latest |
| **Monorepo** | pnpm + Turbo | 9.0+ / 1.13+ |
| **Build** | TypeScript | 5+ |
| **Infrastructure** | Terraform + Docker | Latest |

---

## III. Crew System

### 3.1 Star Trek Agent Manifest

Each agent is assigned a primary **model tier** and a **complexity range**:

| Persona | Role | Model Tier | Complexity | Status |
|---------|------|-----------|-----------|--------|
| **Picard** | Captain / Lead | Opus | >0.7 | ⏳ Phase 2 |
| **Riker** | First Officer | Sonnet | 0.3–0.7 | ⏳ Phase 2 |
| **Data** | Engineer | Haiku | <0.3 | ⏳ Phase 2 |
| **Worf** | Security | Sonnet | 0.3–0.7 | ✓ Phase 3 |
| **Crusher** | Wellness | Sonnet | 0.3–0.7 | ⏳ Phase 2 |
| **La Forge** | Systems | Opus | >0.7 | ⏳ Phase 2 |
| **Tasha** | Operations | Haiku | <0.3 | ⏳ Phase 2 |
| **Wesley** | Innovation | Sonnet | 0.3–0.7 | ⏳ Phase 2 |
| **Guinan** | Counsel | Sonnet | 0.3–0.7 | ⏳ Phase 2 |
| **Uhura** | Communication | Haiku | <0.3 | ⏳ Phase 2 |

### 3.2 Model Routing Logic

Agents route **tasks** to models based on **complexity** (0.0–1.0 scale):

```
Complexity <0.3  → Haiku (fast, cheap, simple tasks)
Complexity 0.3–0.7 → Sonnet (balanced, most business logic)
Complexity >0.7  → Opus (expensive, strategic decisions)
```

**Scoring factors:**
- Task scope (narrow = lower complexity)
- Required reasoning depth
- Error sensitivity
- Input/output size

### 3.3 Memory System

#### **Layer 1: Atomic Observations**
- File: `crew-memories/active/observation-TIMESTAMP-PERSONA.json`
- Content: Immediate insights, code findings, security checks
- Lifetime: Ephemeral (1 session)

#### **Layer 2: Persistent Storage**
- Database: Supabase tables (`missions`, `tasks`, `crew_memories`)
- Content: Decision history, learned patterns, context windows
- Lifetime: Persistent (queryable)

#### **Layer 3: Reflective Memory**
- File: `CLAUDE.md` (machine-readable project memory)
- Content: High-level project state, crew health, architectural decisions
- Lifetime: Project lifetime (manually updated)

### 3.4 Crew Safety & Guardrails

**Immutable rules:**
1. **No hardcoded secrets** — All credentials from environment or AWS SSM
2. **No destructive operations** — Tasks are reversible (no force-delete)
3. **Audit trail** — All agent decisions logged to Supabase
4. **Escalation** — High-complexity tasks require human approval (future)
5. **Rate limiting** — Per-model token budgets enforced

---

## IV. Security & Compliance

### 4.1 Credential Management

#### **Development (Local)**
```bash
# ~/.zshrc (mode 600, owner read-only)
export OPENROUTER_API_KEY="sk-or-v1-..."
export SUPABASE_SERVICE_ROLE_KEY="..."
```

#### **Production (AWS)**
```bash
# AWS Systems Manager Parameter Store
aws ssm get-parameter --name /sovereign/openrouter-key
aws ssm get-parameter --name /sovereign/supabase-role-key
```

### 4.2 Rotation Policy

- **API Keys (OpenRouter, Anthropic, etc.):** Weekly
- **Service Role Keys (Supabase, AWS):** Monthly
- **Database Passwords:** Monthly
- **SSH Keys:** Quarterly

### 4.3 Audit Logging

| Event | Logged By | Retention |
|-------|-----------|-----------|
| Agent task execution | Orchestrator | 90 days |
| API calls to OpenRouter | MCP bridge | 30 days |
| Supabase data changes | RLS policies | 90 days |
| AWS API calls | CloudTrail | 90 days |
| Git commits | Git history | Indefinite |

---

## V. Deployment Phases

### Phase 0: Infrastructure & Secrets ✓
- Set up Supabase (local + remote)
- Configure Redis
- Initialize credentials in ~/.zshrc
- Verify health with smoke tests

### Phase 1: VSCode Extension 🟡
- Build MCP client service
- Create WebView UI
- Implement SSE/JSON-RPC bridge
- Package and sign extension

### Phase 2: Monorepo & Crew 🟡
- Extract mcp-bridge as shared package
- Define crew personas (10 agents)
- Set up memory sync (Supabase ↔ CLAUDE.md)
- Create orchestrator facade

### Phase 3: Workflow Automation 🟡
- Deploy n8n instance
- Create webhook mapping (crew → n8n)
- Integrate SocketIO for real-time updates
- Test cost-based routing

### Phase 4: Production Deployment 🟡
- Build Docker containers
- Generate Terraform configuration
- Deploy to AWS EC2
- Deploy dashboard to Vercel
- Publish VSCode extension

---

## VI. Development Workflow

### 6.1 Local Development Setup

```bash
# 1. Clone and set up environment
git clone <repo>
cd ai-enterprise-os
cp .env.example .env.local
# Edit .env.local with local credentials

# 2. Install dependencies
pnpm install

# 3. Start development environment
pnpm dev

# 4. Start MCP server (in another terminal)
node mcp-server.js

# 5. Run Phase 0 verification
./p0-run-all.sh
```

### 6.2 Git Workflow

- **Branch naming:** `feature/`, `fix/`, `docs/`, `refactor/`
- **Commit messages:** Crew-aware (e.g., "Worf: Add security validation")
- **Pull requests:** Require 2 approvals + passing tests
- **Protected branches:** `main`, `production`

### 6.3 Testing & Quality

- **Unit tests:** Jest (`pnpm test`)
- **Linting:** ESLint (`pnpm lint`)
- **Type checking:** TypeScript strict mode
- **Code coverage:** >80% for critical paths
- **Pre-commit:** Secret detection hook (mandatory)

---

## VII. Monitoring & Operations

### 7.1 Health Checks

| Component | Check | Frequency |
|-----------|-------|-----------|
| Supabase | Connection test | Every 5 min |
| Redis | Ping + memory | Every 5 min |
| MCP Server | Tool availability | Every 10 min |
| n8n | Workflow status | Every 15 min |
| Vercel | Deployment status | On push |

### 7.2 Incident Response

1. **Detection:** CloudWatch alarms trigger Slack notification
2. **Assessment:** On-call engineer reviews logs
3. **Mitigation:** Rollback deployment or disable affected service
4. **Resolution:** Post-incident review within 24h

---

## VIII. Governance & Decision Making

### 8.1 Architecture Decisions

- **RFC process:** For major changes (new agent, new datasource)
- **Crew review:** At least 2 agents (personas) weigh in
- **Reversibility:** All changes should be reversible (prefer feature flags)

### 8.2 Roadmap

**Current (Phase 0-4):** Foundation & core crew  
**Next (6 months):** Advanced reasoning, multi-turn workflows  
**Future (1 year):** Human-in-the-loop approval, advanced memory (RAG)  

---

## IX. Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guide
- Testing requirements
- Crew persona development
- MCP tool creation

---

## X. License & Acknowledgments

- **License:** Private (Proprietary)
- **MCP SDK:** © Anthropic PBC
- **Star Trek:** © Paramount Global
- **Inspiration:** Enterprise operations, AI safety, crew-based systems

---

**Questions or concerns?** Open an issue on GitHub or contact the core team.

**Last review:** 2026-04-18 by Captain Picard (AI)
EOF
  log_success "PLATFORM_CONSTITUTION.md created ✓"
else
  echo "[DRY RUN] Would create PLATFORM_CONSTITUTION.md"
fi

echo ""

# Create CONTRIBUTING guidelines
log_step "Creating CONTRIBUTING.md..."

CONTRIBUTING_PATH="$ROOT/CONTRIBUTING.md"

if [[ -f "$CONTRIBUTING_PATH" ]]; then
  log_warning "CONTRIBUTING.md already exists"
else
  if [[ -z "$DRY_RUN" ]]; then
    cat > "$CONTRIBUTING_PATH" << 'EOF'
# Contributing to Sovereign Factory

## Getting Started

1. **Fork & clone:** `git clone <your-fork>`
2. **Set up environment:** Follow [PLATFORM_CONSTITUTION.md](./PLATFORM_CONSTITUTION.md) Section VI
3. **Create a branch:** `git checkout -b feature/your-feature`
4. **Make changes:** Follow code standards below
5. **Test:** `pnpm test` (>80% coverage for critical paths)
6. **Submit PR:** Link to related issue, include crew persona in title

## Code Style

- **Language:** TypeScript strict mode
- **Formatting:** Prettier (configured in repo)
- **Linting:** ESLint rules enforced on PR
- **Commit messages:** `PERSONA: Describe change` (e.g., `Worf: Add input validation`)

## Crew Persona Commits

Use Star Trek persona names in commits to indicate which agent "would" approve the change:

| Persona | Expertise | Example |
|---------|-----------|---------|
| **Picard** | Architecture, strategy | `Picard: Refactor routing logic` |
| **Data** | Code quality, analysis | `Data: Optimize algorithm` |
| **Worf** | Security, validation | `Worf: Add authentication check` |
| **La Forge** | Systems, performance | `La Forge: Improve cache efficiency` |
| **Crusher** | Health, documentation | `Crusher: Document error handling` |

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm test --filter=@sovereign/mcp-bridge

# Watch mode
pnpm test -- --watch
```

## MCP Tool Development

Creating a new MCP tool? See [packages/mcp-bridge/TOOLS.md](./packages/mcp-bridge/TOOLS.md).

### Safety Checklist
- [ ] Tool is reversible (no destructive operations)
- [ ] Tool validates all inputs
- [ ] Tool logs execution and results
- [ ] Tool has error handling with clear messages
- [ ] Tool documentation is complete

## Security & Secrets

- **Never commit:** API keys, passwords, private keys
- **Always use:** Environment variables or AWS SSM
- **Run before commit:** `./scripts/remediation/r2-audit-secrets.sh`
- **Pre-commit hook** prevents accidental leaks

## Questions?

- **Architecture:** Open an RFC issue
- **Implementation:** Discuss in PR comments
- **Security:** Contact core team privately

---

**Thank you for contributing to Sovereign Factory!** 🖖
EOF
    log_success "CONTRIBUTING.md created ✓"
  else
    echo "[DRY RUN] Would create CONTRIBUTING.md"
  fi
fi

echo ""

# Create DEPLOYMENT guide
log_step "Creating DEPLOYMENT.md..."

DEPLOYMENT_PATH="$ROOT/DEPLOYMENT.md"

if [[ -f "$DEPLOYMENT_PATH" ]]; then
  log_warning "DEPLOYMENT.md already exists"
else
  if [[ -z "$DRY_RUN" ]]; then
    cat > "$DEPLOYMENT_PATH" << 'EOF'
# Deployment Guide

## Local Development

```bash
pnpm install
pnpm dev
```

See [PLATFORM_CONSTITUTION.md](./PLATFORM_CONSTITUTION.md) Section VI.1.

## Staging (AWS EC2)

1. **Build Docker image:**
   ```bash
   docker build -t sovereign-factory:staging .
   ```

2. **Push to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.us-east-2.amazonaws.com
   docker tag sovereign-factory:staging $AWS_ACCOUNT.dkr.ecr.us-east-2.amazonaws.com/sovereign-factory:staging
   docker push $AWS_ACCOUNT.dkr.ecr.us-east-2.amazonaws.com/sovereign-factory:staging
   ```

3. **Deploy with Terraform:**
   ```bash
   cd terraform
   terraform plan -var-file=staging.tfvars
   terraform apply -var-file=staging.tfvars
   ```

## Production

1. **Approval:** Requires 2 code reviews + passing CI/CD
2. **Build:** `docker build -t sovereign-factory:v$(date +%Y%m%d) .`
3. **Push:** To ECR production registry
4. **Deploy:** `terraform apply -var-file=production.tfvars`
5. **Monitor:** CloudWatch dashboards + alerts

## Rollback

```bash
terraform apply -var-file=production.tfvars -target=aws_ecs_service.sovereign
# Select previous task definition
```

## Secrets Management

**Production credentials:**
```bash
aws ssm get-parameters-by-path --path /sovereign/prod --recursive
```

**Rotation schedule:**
- API Keys: Weekly
- DB passwords: Monthly
- Certificates: Quarterly

---

Full details in [PLATFORM_CONSTITUTION.md](./PLATFORM_CONSTITUTION.md) Section IV.
EOF
    log_success "DEPLOYMENT.md created ✓"
  else
    echo "[DRY RUN] Would create DEPLOYMENT.md"
  fi
fi

echo ""
echo "═══════════════════════════════════════════════"
echo ""

log_success "Phase 5: Platform documentation complete"
echo ""
echo "Created documents:"
echo "  - PLATFORM_CONSTITUTION.md (governance & architecture)"
echo "  - CONTRIBUTING.md (development guidelines)"
echo "  - DEPLOYMENT.md (deployment procedures)"
echo ""
echo "Next: Review these documents and commit to git"
echo ""
