#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$ROOT/scripts/lounge/crew-observe.sh"

echo "🚀 Seeding Sovereign Crew Manifest & Hierarchical MCP Registry..."

# 1. Universal DDD Policy
crew_observe \
  --member "Commander Data" \
  --category "architecture" \
  --role "Second Officer, DDD Architect" \
  --title "Universal DDD Layering Policy" \
  --summary "Strict enforcement of layer boundaries: Model contains state logic, Service contains use-cases, Repository contains persistence." \
  --finding "Crossing layer boundaries leads to technical debt and structural drift." \
  --conclusion "All generated domains MUST separate Model from Infrastructure." \
  --recommend "Use dependency injection for repositories in Application services." \
  --tags "ddd,architecture,standard"

# 2. Crew Manifest & MCP Hierarchy
crew_observe \
  --member "Captain Picard" \
  --category "architecture" \
  --role "Captain, Crew Manager" \
  --title "Sovereign Crew Manifest & MCP Registry" \
  --summary "The authoritative hierarchy of agents and their associated MCP tools." \
  --finding "Command: Picard (Orchestrator). Strategy: Data (Architect/Search), Troi (Intent), Quark (Economics)." \
  --finding "Tactical: Riker (Lead Dev), La Forge (Engineering), O'Brien (Operations/Integration)." \
  --finding "Security: Worf (QA Auditor), Tasha Yar (Tactical Diagnostics)." \
  --finding "Logistics: Crusher (Health/Docs), Uhura (Communications/Sync)." \
  --conclusion "Agents must refer to this hierarchy to identify their specific lane and associated MCP servers (unzip_search, crew_manager, mcp-http-bridge)." \
  --recommend "Always route security audits to Worf and cost-optimization checks to Quark." \
  --tags "crew,hierarchy,mcp,roles"

# 3. Economic Guardrails
crew_observe \
  --member "Quark" \
  --category "architecture" \
  --role "Economics Analyst" \
  --title "Sovereign Economic Routing (Quark's Rules)" \
  --summary "Guidelines for cost-optimized model routing based on mission complexity." \
  --finding "Use Gemini Flash/Haiku for context ingestion. Use Sonnet/Opus for final logic assembly." \
  --conclusion "Target cost per execution is \$1.50. High-tier models are restricted to Captain and Developer roles." \
  --recommend "Audit token usage after every mission lounge session." \
  --tags "economics,roi,budget"

# 4. Universal MCP Intelligence Source
crew_observe \
  --member "Commander Data" \
  --category "architecture" \
  --role "Second Officer, Architect" \
  --title "Global MCP Service Discovery via GitMCP" \
  --summary "Established https://gitmcp.io/ as the primary external registry for crew agents to discover and validate new MCP servers." \
  --finding "Manual tool creation is inefficient compared to GitMCP-sourced services." \
  --conclusion "Agents SHOULD search GitMCP for existing tools before requesting custom implementations." \
  --recommend "Update Uhura's sync registry tool to poll gitmcp.io endpoints." \
  --tags "mcp,discovery,registry,gitmcp"

# 5. Service-Oriented Bridge Communication
crew_observe \
  --member "Geordi La Forge" \
  --category "architecture" \
  --role "Chief Engineer" \
  --title "Bridge Communication Decoupling" \
  --summary "Established src/services/MCPClient as the single source of truth for SSE/JSON-RPC communication." \
  --finding "Direct imports from extension.ts caused circular dependency failures in scripts and core logic." \
  --conclusion "All mission commands MUST import getMCPClient from the services domain, not the entry point." \
  --recommend "Use absolute path aliases (@services) once the Phase 2 monorepo merge is complete." \
  --tags "services,decoupling,mcp-bridge"

# 6. Autonomous Discovery & Vertical Expansion
crew_observe \
  --member "Captain Picard" \
  --category "architecture" \
  --role "Captain, Strategic Lead" \
  --title "Autonomous Expansion Directive" \
  --summary "Established protocol for agents to proactively identify system gaps and propose new Sovereign Verticals." \
  --finding "System intelligence is now capable of cross-repo market analysis." \
  --conclusion "The crew SHOULD utilize the Observation Lounge to suggest expansion projects (e.g. smart-city-logistics, decentralized-auth)." \
  --recommend "Run a 'Strategic Sourcing' mission monthly to review expansion_lead fields in Supabase." \
  --tags "strategy,autonomy,expansion,sourcing"

echo "✅ Sovereign Architectural Anchors & Crew Manifest Seeded."