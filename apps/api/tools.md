# Tooling: UnzipSearchTool

The `UnzipSearchTool` is the primary ingestion port for the Sovereign Factory. It is located at `tools/unzip_search_tool.py` and is exposed via the MCP server.

## Capabilities
- **Format Support**: ZIP, Folders, and nested ZIPs.
- **Language Support**: Python (`def`), JavaScript/TypeScript (`function`, `const`, class methods, arrow functions), Shell (`function`), and Markdown (`# Headers`).
- **Efficiency**: Uses Python generators to read files line-by-line, preventing memory exhaustion on large codebases.
- **Timeout Safety**: Includes internal timers and orchestrator-level hard kills to prevent hanging processes.

## Arguments
- `path`: Path to search.
- `function_name`: Target identifier.
- `item_type`: `function`, `class`, `interface`, `type`, `enum`, `constant`, or `variable`.
- `return_tree`: Returns an ASCII folder hierarchy of the scanned paths.
- `tree_json_path`: Persists the scanned structure to a JSON file for documentation.

## CLI Usage
```bash
python3 tools/unzip_search_tool.py '{"path": ".", "function_name": "runMission", "return_tree": true}'
```