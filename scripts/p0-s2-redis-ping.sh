#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s2-redis-ping.sh — Phase 0, Step 2: Redis connectivity
#
# Verifies Redis is reachable at REDIS_URL. Redis is required for the
# distributed scaffolding locks in orchestrator.js.
# Assigned crew: Chief O'Brien (integration engineer, keeps systems running).
# MCP tool on failure: health_check
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s2-redis-ping"
step_header "PHASE 0 — CONVERGENCE" "Step 2: Redis Connectivity"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
echo "  Testing Redis at: $REDIS_URL"

# ── Parse host/port from REDIS_URL ────────────────────────────────────────────
# Handles: redis://host:port, redis://:password@host:port, rediss://... (TLS)
REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|rediss?://([^:@/]+@)?([^:/]+)(:[0-9]+)?.*|\2|')
REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|rediss?://[^:@/]*(:[^@/]+)?@?([^:]+):([0-9]+).*|\3|')
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASS=$(echo "$REDIS_URL" | sed -nE 's|rediss?://:([^@]+)@.*|\1|p')

echo "  Host: $REDIS_HOST  Port: $REDIS_PORT"

# ── Method 1: redis-cli if available ─────────────────────────────────────────
if command -v redis-cli &>/dev/null; then
  echo "  Using redis-cli..."
  PING_ARGS=(-h "$REDIS_HOST" -p "$REDIS_PORT")
  [[ -n "$REDIS_PASS" ]] && PING_ARGS+=(-a "$REDIS_PASS")

  RESULT=$(redis-cli "${PING_ARGS[@]}" PING 2>&1 || true)
  if [[ "$RESULT" == "PONG" ]]; then
    echo "  ✔  Redis PING → PONG"
  else
    crew_fail \
      --step    "$STEP" \
      --persona "chief_obrien" \
      --tool    "health_check" \
      --tool-args '{"fix": false}' \
      --context "redis-cli PING to $REDIS_URL did not return PONG. Redis may be down, wrong URL, or needs a password." \
      --error   "redis-cli response: $RESULT — start Redis with 'redis-server' or 'docker run -d -p 6379:6379 redis:7-alpine'"
    exit 1
  fi

# ── Method 2: Node.js ioredis quick ping (fallback) ──────────────────────────
else
  echo "  redis-cli not found — using Node.js ioredis ping..."
  PING_RESULT=$(node --input-type=module <<EOF 2>&1
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let Redis;
try { Redis = require('ioredis'); } catch(e) { console.error('ioredis not installed'); process.exit(2); }
const r = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, connectTimeout: 5000 });
r.ping().then(res => { console.log(res); r.quit(); process.exit(0); })
        .catch(err => { console.error(err.message); r.quit(); process.exit(1); });
EOF
  ) || true

  if [[ "$PING_RESULT" == "PONG" ]]; then
    echo "  ✔  Redis PONG via ioredis"
  else
    crew_fail \
      --step    "$STEP" \
      --persona "chief_obrien" \
      --tool    "health_check" \
      --tool-args '{"fix": false}' \
      --context "Node.js ioredis could not connect to Redis at $REDIS_URL." \
      --error   "$PING_RESULT — start Redis: 'redis-server' or 'docker run -d -p 6379:6379 redis:7-alpine'"
    exit 1
  fi
fi

# ── Test SET/GET round-trip ───────────────────────────────────────────────────
echo "  Testing SET/GET round-trip..."
if command -v redis-cli &>/dev/null; then
  PING_ARGS=(-h "$REDIS_HOST" -p "$REDIS_PORT")
  [[ -n "$REDIS_PASS" ]] && PING_ARGS+=(-a "$REDIS_PASS")
  redis-cli "${PING_ARGS[@]}" SET sovereign:health-check "ok" EX 10 > /dev/null
  VAL=$(redis-cli "${PING_ARGS[@]}" GET sovereign:health-check 2>&1)
  if [[ "$VAL" == "ok" ]]; then
    echo "  ✔  SET/GET round-trip successful"
    redis-cli "${PING_ARGS[@]}" DEL sovereign:health-check > /dev/null
  else
    echo "  ⚠  SET/GET returned unexpected value: $VAL (non-fatal)"
  fi
fi

phase_pass "$STEP"
