#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lounge/crew-observe.sh — Observation Lounge crew memory writer
#
# Writes a structured JSON observation to crew-memories/active/ so it
# surfaces in the openrouter-crew-platform Observation Lounge via the
# /api/lounge/latest filesystem fallback.
#
# Usage:
#   source scripts/lounge/crew-observe.sh
#   crew_observe \
#     --member    "Lt. Worf" \
#     --role      "Chief of Security, Senior QA Auditor" \
#     --title     "Pre-Push Security Audit — $(date +%Y-%m-%d)" \
#     --summary   "Security gate cleared. No credential exposure detected." \
#     --finding   "No .env files in push diff" \
#     --finding   "5 secrets synced to GitHub Actions" \
#     --conclusion "Pipeline is secure for remote push" \
#     --recommend "Rotate SUPABASE_KEY quarterly" \
#     --tags      "security,ci-cd,worf"
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MEMORIES_DIR="$ROOT/crew-memories/active"

# Also resolve the openrouter-crew-platform crew-memories location
_orc_memories() {
  local candidates=(
    "$(dirname "$ROOT")/openrouter-crew-platform/crew-memories/active"
    "$HOME/Documents/openrouter-crew-platform/crew-memories/active"
    "$HOME/Dev/openrouter-crew-platform/crew-memories/active"
  )
  for c in "${candidates[@]}"; do [[ -d "$c" ]] && echo "$c" && return; done
  echo ""
}

crew_observe() {
  local member="" role="" title="" summary=""
  local findings=() conclusions=() recommendations=() tags=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --member)     member="$2";                      shift 2 ;;
      --role)       role="$2";                        shift 2 ;;
      --title)      title="$2";                       shift 2 ;;
      --summary)    summary="$2";                     shift 2 ;;
      --finding)    findings+=("$2");                 shift 2 ;;
      --conclusion) conclusions+=("$2");              shift 2 ;;
      --recommend)  recommendations+=("$2");          shift 2 ;;
      --tags)       tags="$2";                        shift 2 ;;
      *)            shift ;;
    esac
  done

  local ts iso slug filename
  ts="$(date +%s)"
  iso="$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"
  # slug: lowercase member name, spaces→hyphens
  slug="$(echo "$member" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')"
  filename="observation-${ts}-${slug}.json"

  # ── Build JSON arrays ────────────────────────────────────────────────────────
  _json_arr() {
    local arr=("$@")
    if [[ ${#arr[@]} -eq 0 ]]; then echo "[]"; return; fi
    local out="["
    for item in "${arr[@]}"; do
      # Escape inner quotes
      item="${item//\\/\\\\}"
      item="${item//\"/\\\"}"
      out+="\"${item}\","
    done
    out="${out%,}]"
    echo "$out"
  }

  _json_tags() {
    if [[ -z "$tags" ]]; then echo "[]"; return; fi
    local out="["
    IFS=',' read -ra tag_arr <<< "$tags"
    for t in "${tag_arr[@]}"; do
      t="$(echo "$t" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      out+="\"${t}\","
    done
    out="${out%,}]"
    echo "$out"
  }

  local json
  json=$(cat <<EOF
{
  "type": "observation",
  "crew_member": "$member",
  "role": "$role",
  "title": "$title",
  "summary": "$summary",
  "key_findings": $(_json_arr "${findings[@]}"),
  "conclusions": $(_json_arr "${conclusions[@]}"),
  "recommendations": $(_json_arr "${recommendations[@]}"),
  "tags": $(_json_tags),
  "timestamp": "$iso"
}
EOF
)

  # ── Write to local crew-memories/active/ ──────────────────────────────────
  mkdir -p "$MEMORIES_DIR"
  echo "$json" > "$MEMORIES_DIR/$filename"
  echo "  [Lounge] Observation written: $filename" >&2

  # ── Mirror to openrouter-crew-platform if present ────────────────────────
  local orc_dir; orc_dir="$(_orc_memories)"
  if [[ -n "$orc_dir" ]]; then
    mkdir -p "$orc_dir"
    cp "$MEMORIES_DIR/$filename" "$orc_dir/$filename"
    echo "  [Lounge] Mirrored to orc-platform: $orc_dir/$filename" >&2
  fi

  # ── POST to /api/crew/observations if dashboard is running ────────────────
  local dashboard_url="${NEXT_PUBLIC_DASHBOARD_URL:-http://localhost:3000}"
  local crew_key="${CREW_OBS_KEY:-}"
  if [[ -n "$crew_key" ]]; then
    local post_resp
    post_resp=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${dashboard_url}/api/crew/observations" \
      -H "Content-Type: application/json" \
      -H "x-crew-key: $crew_key" \
      -d "$json" \
      --connect-timeout 3 2>/dev/null) || post_resp="000"
    if [[ "$post_resp" == "200" ]]; then
      echo "  [Lounge] POSTed to dashboard observations API" >&2
    fi
  fi

  echo "$filename"
}
