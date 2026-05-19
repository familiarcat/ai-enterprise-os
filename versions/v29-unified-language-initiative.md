---
date: 2026-05-15
status: accepted
deciders: Captain Picard, Commander Data, Geordi La Forge, Lt. Worf, Quark
---

# ADR 29: Unified Language Initiative (TypeScript Exclusivity)

## Context
The Sovereign Factory has historically utilized a dual-runtime architecture (Node.js and Python). Recent environmental failures (linker errors in Python 3.14) and the overhead of cross-process communication have identified this as a critical architectural weakness.

## Decision
We will transition the entire ai-enterprise-os system to a TypeScript-exclusive stack.

1. **Decommission Python**: All Python-based tools will be ported to native TypeScript MCP servers.
2. **Single Runtime**: The system will execute entirely within the Node.js 20+ runtime, eliminating the need for virtual environments and dual-runtime Docker images.
3. **Native Agency**: The `crew_manager.py` logic will be replaced by a native TypeScript agentic framework to maintain mission capabilities without the "process boundary" cost.

## Consequences
* **Positive**: Reduced system latency, unified type safety, simplified CI/CD, and hardened security posture.
* **Positive**: Significant reduction in Docker image size and deployment complexity on EC2.
* **Neutral**: Requires a temporary diversion of engineering resources (Phase 2) to achieve tool parity.
* **Negative**: Loss of direct access to Python-only AI libraries (mitigated by the rapidly growing JS/TS AI ecosystem).

## Progressive Steps
1. Port `unzip_search_tool.py` to `core/tools/unzip-search.ts`.
2. Implement `YouTubeTranscriptService` in Node.js.
3. Refactor `MissionService.js` to use a native TS agent host.