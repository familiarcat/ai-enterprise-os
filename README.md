# AI Enterprise OS: The Sovereign Factory

Welcome to the **Sovereign Factory**, a self-maintaining business engine designed to build, evolve, and manage autonomous business units using **Domain-Driven Design (DDD)** and **Agentic Orchestration**.

## The "Product Factory" Concept

The Sovereign Factory is a realization of "Business-as-Code." It operates as a factory that scaffolds new products by extrapolating the correct evolution of the project through its history. 

By analyzing previous `# Decisions` in the `/versions` directory and the current codebase structure, the factory ensures that every new business unit generated follows the established architectural rationale.

### Core Capabilities
- **Autonomous Analysis**: Agents audit project history to inform new scaffolding missions.
- **DDD Scaffolding**: Automatically generates Domain, Application, Infrastructure, and UI layers.
- **Sovereign Interop**: Exposed via the Model Context Protocol (MCP) for seamless use by Gemini, Claude, and other agentic assistants.
- **Workspace Integration**: Utilizes `pnpm` workspaces for shared utilities and recursive testing.

## Documentation

Explore the platform's blueprints:

- **Architecture**: Overview of the Orchestrator, Analysis Engine, and project structure.
- **Agentic Roles**: Deep dive into the specialized personas (Analyst, Architect, Developer) driving the factory.
- **Tooling & Discovery**: Documentation for the `UnzipSearchTool` ingestion engine.

## Getting Started

### 1. Environment Setup
Run the unified credential setup script to configure your local environment and shell paths:
```bash
zsh ./apps/api/setup_credentials.sh
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start the Factory
Launch the MCP server to allow agents to interact with the factory tools:
```bash
node ./apps/api/mcp-server.js
```

## Testing
Run the vitest suite to validate the orchestrator and generated domains:
```bash
pnpm test
```