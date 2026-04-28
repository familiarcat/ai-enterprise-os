#!/usr/bin/env bash
# Phase R1: .gitignore Setup | Assigned: Commander Data
set -euo pipefail

echo "🖖 Data: Enforcing repository boundaries via .gitignore..."
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# The authoritative .gitignore is provided in repo root.
# This script ensures it is applied and cleans any accidentally tracked files.
if [[ -d "$ROOT_DIR/.git" ]]; then
    echo "  Cleaning git cache of ignored files..."
    cd "$ROOT_DIR"
    # Remove files from index that should be ignored according to .gitignore
    git rm -r --cached . > /dev/null 2>&1 || true
    git add .
    echo "  ✔ Git index synchronized with .gitignore"
else
    echo "  ⚠ Not a git repository. Skipping cache cleanup."
fi

echo "Boundary enforcement complete."