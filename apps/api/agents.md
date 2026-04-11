# Agentic Roles

The Sovereign Factory utilizes specialized personas to execute missions. These are currently implemented as role-based prompt injections in the `orchestrator.js`.

## 1. Expert System Analyst
**Goal**: Review project evolution and structure to identify patterns.
**Tools**: `search_code`.
**Responsibility**: Scans the `/versions` and current filesystem to provide the "History" context for every mission.

## 2. DDD Architect
**Goal**: Validate mission objectives against historical constraints.
**Tools**: `run_factory_mission`, `run_batch_missions`.
**Responsibility**: Approves the transition from analysis to implementation, ensuring the "Decision" logic holds true across project iterations.

## 3. Senior Full-Stack Developer
**Goal**: Generate clean, production-ready DDD code blocks.
**Tools**: `generateComponentContent`, `scaffoldDDDComponent`.
**Responsibility**: Writes the physical files for the Domain, Application, Infrastructure, and UI layers using LLM-synthesized content.

## 4. QA Auditor
**Goal**: Review past mission outcomes and evolutionary history to optimize current plans.
**Responsibility**: Critiques memory and history data to provide the Developer with specific scaffolding optimizations.

## Future Roles
- **QA Engineer**: To be implemented for automated Vitest generation and validation.
- **DevOps Agent**: For managing the GitHub Actions CI/CD pipeline.