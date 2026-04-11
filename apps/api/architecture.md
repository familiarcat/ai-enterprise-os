# Architecture: Sovereign Factory

This project implements a self-maintaining business engine based on **Domain-Driven Design (DDD)** and **Evolutionary Context Analysis**.

## Core Components

### 1. The Orchestrator (`core/orchestrator.js`)
The brain of the system. It coordinates missions through three distinct phases:
- **Analysis**: Ingesting current and historical project state.
- **Architecture**: Validating objectives against constraints.
- **Development**: Scaffolding new business units.

### 2. The Analysis Engine (`tools/unzip_search_tool.py`)
A polyglot discovery tool capable of:
- Recursive search through folders and nested ZIP archives.
- Language-aware block extraction (Python, JS/TS, Shell, Markdown).
- Memory-efficient line-by-line processing.

### 3. Evolutionary Context (`/versions`)
A historical repository used to extrapolate project growth over time. The system reviews previous `# Decisions` in Markdown files to ensure new generated code aligns with historical rationale.

### 4. MCP Interface (`apps/api/mcp-server.js`)
Exposes the factory tools to external agents (Gemini, Claude) via the Model Context Protocol, allowing the factory to be treated as a sovereign agentic node.

## Directory Structure
- `/domains`: Generated business units.
- `/packages/shared`: Workspace-wide utilities.
- `/scripts`: Environment and setup utilities.