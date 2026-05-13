#!/bin/zsh
# verify_health.sh - Centralized health diagnostics for the Sovereign Factory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CREW_MANAGER="$PROJECT_ROOT/tools/crew_manager.py"

# 1. Check Python Environment and Dependencies
if ! python3 -c "import crewai, requests, langchain_openai" 2>/dev/null; then
    echo "❌ Python dependencies missing."
    exit 1
fi

# 2. Ping the Crew Manager
# This verifies LLM connectivity, Bridge awareness, and JSON parsing logic
PING_RESULT=$(echo '{"task": "__ping__"}' | python3 "$CREW_MANAGER" 2>/dev/null)

if [[ $PING_RESULT == *"\"status\": \"success\""* ]]; then
    # Extra check: Is the Bridge itself reachable by the Crew Manager?
    if [[ $PING_RESULT == *"\"mcp_bridge_status\": \"online\""* ]]; then
        echo "✅ Full sub-system integrity verified."
        exit 0
    else
        echo "⚠️  Crew Manager online, but MCP Bridge reported as offline."
        # We exit 0 here to avoid a restart loop if just the bridge tools are warming up, 
        # but you can change this to 1 if you want strict enforcement.
        exit 0
    fi
else
    echo "❌ Crew Manager ping FAILED."
    echo "Raw result: $PING_RESULT"
    exit 1
fi