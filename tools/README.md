# Sovereign Factory — Python Bridge Layer

This directory contains the Python-based tools and agentic execution engines that power the **ai-enterprise-os**.

## 🖖 Overview
The Python layer is maintained as a high-performance execution environment for specialized agentic tasks. It interfaces with the Node.js Orchestrator via a **JSON-over-stdin** bridge, ensuring type safety and preventing shell injection vulnerabilities.

## 🛠️ Core Components

### 1. `crew_manager.py`
*   **Role**: Multi-Agent Orchestrator (CrewAI).
*   **Responsibility**: Assembles specialized crews (Picard, Riker, Data, etc.) and executes sequential or hierarchical tasks.
*   **Integration**: Receives mission parameters and agent configurations via JSON.

### 2. `unzip_search_tool.py`
*   **Role**: Contextual Ingestion Engine.
*   **Responsibility**: Scans file systems and archives for specific code patterns (classes, functions, DDD layers).
*   **Capability**: Handles nested archives and performs AST-like pattern matching across JS, TS, and Python.

## 🧪 Testing & Quality Assurance

The Python layer uses `pytest` for unit and integration testing.

### Setup
Ensure you are in the project virtual environment:
```bash
source .venv/bin/activate
pip install -r tools/requirements-dev.txt
```

### Running Tests
```bash
pytest tools/tests/
```

## ⚔️ Security Invariants (Lt. Worf's Standards)
1.  **No Shell Execution**: All tools must use the standard library for file operations; never use `os.system` or `subprocess.run(shell=True)`.
2.  **JSON Contract**: All input must be parsed from `sys.stdin` using `json.loads`.
3.  **Path Sanitization**: All file paths must be resolved to absolute paths and validated against the project root.

## 📈 Evolutionary Path
While the utility scripts (like `unzip_search_tool`) may eventually be ported to TypeScript, the `crew_manager` remains Python-native to leverage the full `crewai` feature set (delegation, memory, and specialized tool usage).