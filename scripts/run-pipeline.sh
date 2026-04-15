#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# run-pipeline.sh — Sovereign Factory Full Deployment Pipeline
#
# Runs all phases sequentially, or a specific phase/step.
#
# Usage:
#   ./scripts/run-pipeline.sh                  # run all phases
#   ./scripts/run-pipeline.sh --phase 0        # run only Phase 0
#   ./scripts/run-pipeline.sh --phase 1        # run only Phase 1
#   ./scripts/run-pipeline.sh --from p2-s3     # start from Phase 2, Step 3
#   ./scripts/run-pipeline.sh --step p0-s6     # run a single step
#   ./scripts/run-pipeline.sh --list           # list all steps
#
# On any failure:
#   - The failing step emits a crew-dispatched Claude Code prompt
#   - The prompt is saved to .pipeline-logs/<timestamp>-<step>-crew-prompt.md
#   - Paste the prompt into Claude Code to get targeted remediation
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

# ── Step registry (bash 3.2-compatible case lookup) ──────────────────────────
get_step_file() {
  case "$1" in
    p0-s0)  echo "p0-s0-secrets-sync.sh" ;;
    p0-s1)  echo "p0-s1-env-check.sh" ;;
    p0-s2)  echo "p0-s2-redis-ping.sh" ;;
    p0-s3)  echo "p0-s3-supabase-check.sh" ;;
    p0-s3b) echo "p0-s3b-supabase-migrate.sh" ;;
    p0-s4) echo "p0-s4-bridge-start.sh" ;;
    p0-s5) echo "p0-s5-dashboard-wire.sh" ;;
    p0-s6) echo "p0-s6-smoke-test.sh" ;;
    p1-s1) echo "p1-s1-vscode-bootstrap.sh" ;;
    p1-s2) echo "p1-s2-mcp-client.sh" ;;
    p1-s3) echo "p1-s3-webview-port.sh" ;;
    p1-s4) echo "p1-s4-ext-commands.sh" ;;
    p1-s5) echo "p1-s5-vsce-package.sh" ;;
    p2-s1) echo "p2-s1-clone-platform.sh" ;;
    p2-s2) echo "p2-s2-pkg-orchestrator.sh" ;;
    p2-s3) echo "p2-s3-pkg-mcp-bridge.sh" ;;
    p2-s4) echo "p2-s4-pkg-crew-personas.sh" ;;
    p2-s5) echo "p2-s5-turbo-pipeline.sh" ;;
    p3-s1) echo "p3-s1-n8n-start.sh" ;;
    p3-s2) echo "p3-s2-crew-webhook-map.sh" ;;
    p3-s3) echo "p3-s3-socketio-verify.sh" ;;
    p3-s4) echo "p3-s4-cost-routing-test.sh" ;;
    p3-s5) echo "p3-s5-baritalia-e2e.sh" ;;
    p4-s1) echo "p4-s1-docker-build.sh" ;;
    p4-s2) echo "p4-s2-terraform-plan.sh" ;;
    p4-s3) echo "p4-s3-vercel-deploy.sh" ;;
    p4-s4) echo "p4-s4-aws-deploy.sh" ;;
    p4-s5) echo "p4-s5-vsce-publish.sh" ;;
    *)     echo "" ;;
  esac
}

STEP_ORDER=(
  p0-s0 p0-s1 p0-s2 p0-s3 p0-s3b p0-s4 p0-s5 p0-s6
  p1-s1 p1-s2 p1-s3 p1-s4 p1-s5
  p2-s1 p2-s2 p2-s3 p2-s4 p2-s5
  p3-s1 p3-s2 p3-s3 p3-s4 p3-s5
  p4-s1 p4-s2 p4-s3 p4-s4 p4-s5
)

PHASE_RUNNERS=(
  "p0-run-all.sh"
  "p1-run-all.sh"
  "p2-run-all.sh"
  "p3-run-all.sh"
  "p4-run-all.sh"
)

# ── Argument parsing ──────────────────────────────────────────────────────────
MODE="all"
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase) MODE="phase"; TARGET="$2"; shift 2 ;;
    --step)  MODE="step";  TARGET="$2"; shift 2 ;;
    --from)  MODE="from";  TARGET="$2"; shift 2 ;;
    --list)  MODE="list";  shift ;;
    --help|-h)
      grep '^#' "$0" | head -20 | sed 's/^# //' | sed 's/^#//'
      exit 0 ;;
    *) shift ;;
  esac
done

# ── List mode ─────────────────────────────────────────────────────────────────
if [[ "$MODE" == "list" ]]; then
  step_header "PIPELINE" "All Steps"
  CURRENT_PHASE=""
  for key in "${STEP_ORDER[@]}"; do
    phase="${key%%-*}"  # p0, p1, etc
    if [[ "$phase" != "$CURRENT_PHASE" ]]; then
      echo ""
      case "$phase" in
        p0) echo -e "  ${_BLD}Phase 0 — Convergence & Validation${_RST}" ;;
        p1) echo -e "  ${_BLD}Phase 1 — VSCode Extension MVP${_RST}" ;;
        p2) echo -e "  ${_BLD}Phase 2 — Monorepo Merge${_RST}" ;;
        p3) echo -e "  ${_BLD}Phase 3 — n8n + CrewAI Automation${_RST}" ;;
        p4) echo -e "  ${_BLD}Phase 4 — Production Deploy${_RST}" ;;
      esac
      CURRENT_PHASE="$phase"
    fi
    FILE="$(get_step_file "$key")"
    NAME="${FILE%.sh}"
    echo "    $key  →  $NAME"
  done
  echo ""
  exit 0
fi

# ── Step mode ─────────────────────────────────────────────────────────────────
if [[ "$MODE" == "step" ]]; then
  FILE="$(get_step_file "$TARGET")"
  if [[ -z "$FILE" ]]; then
    echo "Unknown step: $TARGET"
    echo "Run ./scripts/run-pipeline.sh --list to see all steps"
    exit 1
  fi
  bash "$SCRIPT_DIR/$FILE"
  exit 0
fi

# ── Phase mode ────────────────────────────────────────────────────────────────
if [[ "$MODE" == "phase" ]]; then
  RUNNER="${PHASE_RUNNERS[$TARGET]:-}"
  if [[ -z "$RUNNER" ]]; then
    echo "Unknown phase: $TARGET (0-4)"
    exit 1
  fi
  bash "$SCRIPT_DIR/$RUNNER"
  exit 0
fi

# ── From mode (start at specific step) ───────────────────────────────────────
if [[ "$MODE" == "from" ]]; then
  SKIP=true
  for key in "${STEP_ORDER[@]}"; do
    [[ "$key" == "$TARGET" ]] && SKIP=false
    [[ "$SKIP" == true ]] && continue
    FILE="$(get_step_file "$key")"
    echo "  ▶ Running $key..."
    bash "$SCRIPT_DIR/$FILE"
  done
  exit 0
fi

# ── All mode (default) ────────────────────────────────────────────────────────
echo ""
echo -e "${_BLD}${_CYN}╔══════════════════════════════════════════════════════════════╗${_RST}"
echo -e "${_BLD}${_CYN}║        SOVEREIGN FACTORY — FULL DEPLOYMENT PIPELINE          ║${_RST}"
echo -e "${_BLD}${_CYN}║        Phase 0 → 4  (28 steps total)                        ║${_RST}"
echo -e "${_BLD}${_CYN}╚══════════════════════════════════════════════════════════════╝${_RST}"
echo ""
echo "  On failure: a crew-dispatched Claude Code prompt will be generated."
echo "  Prompts are saved to .pipeline-logs/"
echo ""

for runner in "${PHASE_RUNNERS[@]}"; do
  bash "$SCRIPT_DIR/$runner"
done

echo ""
echo -e "${_GRN}${_BLD}╔══════════════════════════════════════════════════════════════╗${_RST}"
echo -e "${_GRN}${_BLD}║   FULL PIPELINE COMPLETE — Sovereign Factory deployed         ║${_RST}"
echo -e "${_GRN}${_BLD}║   All 26 steps passed across Phase 0–4                       ║${_RST}"
echo -e "${_GRN}${_BLD}╚══════════════════════════════════════════════════════════════╝${_RST}"
echo ""
