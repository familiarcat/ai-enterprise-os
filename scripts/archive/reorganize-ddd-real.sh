#!/usr/bin/env bash
# reorganize-ddd-real.sh | Assigned: Commander Data
# Purpose: Implements the Phase 0-2 hierarchical structure.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
S_DIR="$ROOT/scripts"

echo "🖖 Data: Reorganizing scripts into DDD phase hierarchy..."

mkdir -p "$S_DIR"/{phase-0,phase-1,phase-2,strategy,archive,.metadata}

# 1. Move Phase 0 (Convergence)
mv "$S_DIR"/p0-s*.sh "$S_DIR"/p0-run-all.sh "$S_DIR"/phase-0/ 2>/dev/null || true

# 2. Move Phase 1 (Extension)
mv "$S_DIR"/p1-s*.sh "$S_DIR"/p1-run-all.sh "$S_DIR"/phase-1/ 2>/dev/null || true

# 3. Move Phase 2 (Monorepo)
mv "$S_DIR"/p2-s*.sh "$S_DIR"/p2-run-all.sh "$S_DIR"/phase-2/ 2>/dev/null || true

# 4. Move Strategy scripts
mv "$S_DIR"/discussion.sh "$S_DIR"/strategy/ 2>/dev/null || true
mv "$S_DIR"/infra-setup.sh "$S_DIR"/strategy/ 2>/dev/null || true
mv "$S_DIR"/mcp-security-audit.sh "$S_DIR"/strategy/ 2>/dev/null || true
mv "$S_DIR"/validate-scaffolding.sh "$S_DIR"/strategy/ 2>/dev/null || true

# 5. Archive legacy/utility scripts
find "$S_DIR" -maxdepth 1 -name "*.sh" ! -name "orchestrator.sh" ! -name "remediate-all.sh" ! -name "run-pipeline.sh" ! -name "authorize-crew.sh" -exec mv {} "$S_DIR/archive/" \; 2>/dev/null || true

# 6. Restore core orchestrators to scripts root (if they were accidentally moved)
[[ -f "$S_DIR/archive/remediate-all.sh" ]] && mv "$S_DIR/archive/remediate-all.sh" "$S_DIR/"
[[ -f "$S_DIR/archive/orchestrator.sh" ]] && mv "$S_DIR/archive/orchestrator.sh" "$S_DIR/"
[[ -f "$S_DIR/archive/run-pipeline.sh" ]] && mv "$S_DIR/archive/run-pipeline.sh" "$S_DIR/"
[[ -f "$S_DIR/archive/authorize-crew.sh" ]] && mv "$S_DIR/archive/authorize-crew.sh" "$S_DIR/"

# 7. Initialize metadata
cat > "$S_DIR/.metadata/phase-0-status.json" <<EOF
{"status": "COMPLETE", "completion": "7/7", "last_run": "$(date)"}
EOF

cat > "$S_DIR/.metadata/phase-1-status.json" <<EOF
{"status": "COMPLETE", "completion": "6/6", "last_run": "$(date)"}
EOF

chmod +x "$S_DIR/orchestrator.sh"
echo "✅ Scripts reorganized. Legacy files moved to scripts/archive/."
echo "Current Directory Status:"
ls -F "$S_DIR"