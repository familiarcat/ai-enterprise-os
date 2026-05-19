#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/setup-python.sh — Initialize Sovereign Python Environment
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
REQ_FILE="$ROOT/requirements.txt"

echo "🐍 Setting up Python environment..."

if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    echo "❌ Python not found. Please install Python 3.11 (brew install python@3.11)."
    exit 1
fi

echo "🔍 Using: $($PYTHON_CMD --version)"

# Create .venv if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment in .venv..."
    $PYTHON_CMD -m venv .venv
fi

# Use the venv's python to install dependencies
echo "📥 Upgrading pip..."
./.venv/bin/python3 -m pip install --upgrade pip

if [ -f "$REQ_FILE" ]; then
    echo "📥 Installing dependencies from $REQ_FILE..."
    ./.venv/bin/python3 -m pip install -r "$REQ_FILE"
else
    echo "📥 Installing core Python dependencies (fallback - will be decommissioned)..."
    ./.venv/bin/python3 -m pip install crewai pydantic langchain-openai
fi

echo "✅ Python environment ready."