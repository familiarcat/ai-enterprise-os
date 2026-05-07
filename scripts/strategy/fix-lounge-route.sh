#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/strategy/fix-lounge-route.sh — Global Execution: UI Restoration
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🖖 Commander Riker: Commencing Global Routing Fix..."

# 1. Restore the Observation Lounge
LOUNGE_DIR="$ROOT/apps/dashboard/src/app/lounge"
mkdir -p "$LOUNGE_DIR"

if [ -f "$ROOT/scripts/strategy/page.tsx" ]; then
    cp "$ROOT/scripts/strategy/page.tsx" "$LOUNGE_DIR/page.tsx"
    echo "✅ Observation Lounge restored at /lounge"
fi

# 2. Shore up other missing core routes
CORE_ROUTES=("mission-control" "engineering" "security" "economics")
for route in "${CORE_ROUTES[@]}"; do
    DIR="$ROOT/apps/dashboard/src/app/$route"
    if [ ! -d "$DIR" ]; then
        echo "🏗️  Scaffolding missing route: /$route"
        mkdir -p "$DIR"
        cat > "$DIR/page.tsx" <<EOF
'use client';
export default function Page() {
  return (
    <div className="p-12 font-mono bg-black text-green-400 min-h-screen border-2 border-green-900 m-4">
      <h1 className="text-3xl font-bold mb-6 border-b border-green-800 pb-2 uppercase tracking-tighter">🖖 /$route</h1>
      <p className="animate-pulse text-xl">Sovereign Protocol Initiated... Page content under construction by the crew.</p>
    </div>
  );
}
EOF
    fi
done

echo "✨ Global Execution Plan Complete. The UI routes are now shored up."