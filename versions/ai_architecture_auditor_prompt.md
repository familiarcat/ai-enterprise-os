# AI Architecture Auditor – Universal Regeneration Prompt (v8)

## Purpose
This prompt recreates a full AI SaaS platform with:
- MCP (Model Context Protocol) architecture
- Multi-agent system (governed)
- RAG + semantic cache
- Distributed execution
- Next.js SaaS platform
- Supabase + Stripe integration
- ROI tracking per project

---

## SYSTEM GOAL

Build a **multi-tenant AI SaaS platform** where users can:

- Create and manage projects
- Run AI-powered audits on repositories
- Generate marketing assets
- Track ROI (cost vs revenue)
- Configure AI agents per project
- Operate a business using AI agents

---

## CORE ARCHITECTURE

### Layers

1. **UI Layer (Next.js)**
   - Dashboard
   - Project management
   - Audit viewer
   - Marketing generator
   - ROI tracking

2. **API Layer**
   - /v1/projects
   - /v1/audit
   - /v1/marketing

3. **Execution Layer**
   - Queue (BullMQ or similar)
   - Worker system

4. **Agent Layer (Governed)**
   Roles:
   - Planner (Data)
   - Analyzer (Geordi)
   - Validator (Worf)
   - Critic (Troi)
   - CFO (Quark)
   - CEO (Picard)

5. **MCP Tool Layer**
   - Repo cloning
   - AST parsing
   - Dependency analysis

6. **Memory Layer**
   - Supabase (Postgres + pgvector)
   - RAG retrieval
   - Semantic cache

7. **Business Layer**
   - Projects
   - Audits
   - Marketing outputs
   - ROI tracking
   - Billing (Stripe)

---

## GOVERNANCE

### agents.md
Defines behavior of each role.

### governance.md
Defines interaction rules:

Pipeline:
Planner → Analyzer → Validator → Critic → CFO → CEO

Rules:
- Validator must approve before proceeding
- Analyzer must use tools
- CFO optimizes cost
- CEO approves final output

---

## PIPELINE

Input → Planner → Analyzer → Validator (retry loop) → Critic → CFO → CEO → Output

Include retry logic:
- If validation fails → re-run analyzer with feedback

---

## RAG + CACHE

- Generate embeddings via OpenRouter
- Store in Supabase
- Retrieve context before LLM calls
- Use semantic cache to skip redundant calls

---

## PROJECT MODEL

User → Projects → Audits → Marketing → ROI

Each project contains:
- repo_url
- audits[]
- marketing_assets[]
- usage (tokens/cost)
- ROI

---

## ROI FORMULA

ROI = (Revenue - Cost) / Cost

---

## NEXT.JS PLATFORM REQUIREMENTS

Pages:
- /dashboard
- /projects
- /projects/[id]
- /marketing

Components:
- ProjectManager
- AuditViewer
- MarketingGenerator
- CognitionGraph

---

## BUSINESS LOOP

User → Audit → Deliverable → Marketing → Revenue → ROI → Optimization

---

## OUTPUT REQUIREMENT

Generate a full repo with:

- apps/api (Express backend)
- apps/platform (Next.js frontend)
- packages (agents, db, cache, tools)
- infra (Supabase schema, Terraform optional)
- agents.md
- governance.md

---

## FINAL OBJECTIVE

Produce a **production-ready AI SaaS platform** that functions as:

> An autonomous AI business system capable of generating, evaluating, and monetizing outputs.

---

## INSTRUCTION TO LLM

"Generate the complete codebase implementing the above architecture. Ensure all layers are connected, production-ready, and modular. Use best practices for scalability and maintainability."
