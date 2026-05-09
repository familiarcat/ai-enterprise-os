#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/setup-python.sh — Initialize Sovereign Python Environment
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "🐍 Setting up Python environment..."

if ! command -v python3 &> /dev/null; then
    echo "❌ python3 not found. Please install Python 3."
    exit 1
fi

# Create .venv if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment in .venv..."
    python3 -m venv .venv
fi

# Use the venv's python to install dependencies
echo "📥 Installing dependencies (langchain-openai, crewai, pydantic)..."
./.venv/bin/python3 -m pip install --upgrade pip
./.venv/bin/python3 -m pip install langchain-openai crewai pydantic

echo "✅ Python environment ready."