#!/usr/bin/env bash
# Phase R5: Platform Constitution | Assigned: Captain Picard
set -euo pipefail

echo "🖋️ Picard: Drafting the Sovereign Factory Constitution..."
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cat > "$ROOT_DIR/PLATFORM_CONSTITUTION.md" <<EOF
# SOVEREIGN FACTORY CONSTITUTION

## 1. Principles
- **Agent-First:** All development is assisted by the Crew.
- **Domain-Driven:** Business logic resides in isolated domains.
- **Verified Honor:** Security gates (Worf) are non-negotiable.
EOF

echo "✔ PLATFORM_CONSTITUTION.md created."
echo "The fleet is now governed by unified principles."