#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lib/crew-fail.sh — Sovereign Factory Crew Failure Dispatcher
#
# Generates structured Claude Code prompts when pipeline steps fail.
# Each failure is routed to the crew member whose domain covers the problem,
# paired with the MCP tool they should invoke to resolve it.
#
# Compatible with bash 3.2+ (macOS default) and bash 4+.
#
# Usage (source this file, then call crew_fail):
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/crew-fail.sh"
#   crew_fail \
#     --step    "p0-s3-supabase-check"          \
#     --persona "dr_crusher"                    \
#     --tool    "health_check"                  \
#     --tool-args '{"fix": true}'               \
#     --context "SUPABASE_URL is set but /rest/v1/ returned 401" \
#     --error   "$ERR_OUTPUT"
#
# If the CLAUDE_CLI env var is set to a path (or 'claude' is on PATH),
# pass --auto to pipe the generated prompt directly into Claude.
# ═══════════════════════════════════════════════════════════════════════════════

# ── ANSI colours ──────────────────────────────────────────────────────────────
_RED='\033[0;31m'
_YEL='\033[1;33m'
_CYN='\033[0;36m'
_BLU='\033[0;34m'
_GRN='\033[0;32m'
_MAG='\033[0;35m'
_BLD='\033[1m'
_RST='\033[0m'

# ── Crew profile lookup (bash 3.2-compatible — no declare -A) ─────────────────
# Each function takes a persona key and returns the field value.

_crew_display() {
  case "$1" in
    captain_picard)  echo "Jean-Luc Picard" ;;
    commander_data)  echo "Commander Data" ;;
    commander_riker) echo "William T. Riker" ;;
    geordi_la_forge) echo "Geordi La Forge" ;;
    chief_obrien)    echo "Miles O'Brien" ;;
    lt_worf)         echo "Lieutenant Worf" ;;
    counselor_troi)  echo "Deanna Troi" ;;
    dr_crusher)      echo "Dr. Beverly Crusher" ;;
    lt_uhura)        echo "Lieutenant Nyota Uhura" ;;
    quark)           echo "Quark" ;;
    *)               echo "Unknown Crew Member" ;;
  esac
}

_crew_rank() {
  case "$1" in
    captain_picard)  echo "Captain, USS Enterprise-D" ;;
    commander_data)  echo "Second Officer, DDD Architect" ;;
    commander_riker) echo "First Officer, Senior Full-Stack Developer" ;;
    geordi_la_forge) echo "Chief Engineer, Senior Full-Stack Developer" ;;
    chief_obrien)    echo "Chief of Operations, Integration Engineer" ;;
    lt_worf)         echo "Chief of Security, Senior QA Auditor" ;;
    counselor_troi)  echo "Ship's Counselor, Expert System Analyst" ;;
    dr_crusher)      echo "Chief Medical Officer, Expert System Analyst" ;;
    lt_uhura)        echo "Communications Officer, Cross-System Integration Analyst" ;;
    quark)           echo "Proprietor, Cost Optimization Analyst" ;;
    *)               echo "Unknown Role" ;;
  esac
}

_crew_domain() {
  case "$1" in
    captain_picard)  echo "Strategic coordination, project management, mission planning" ;;
    commander_data)  echo "Architecture validation, monorepo structure, TypeScript porting, package extraction" ;;
    commander_riker) echo "Feature implementation, VSCode extension development, production-quality code" ;;
    geordi_la_forge) echo "System engineering, MCP bridge, Turbo pipeline, Docker, infrastructure wiring" ;;
    chief_obrien)    echo "Service integration, n8n wiring, vsce packaging, cross-repo bridging, Redis" ;;
    lt_worf)         echo "QA, smoke tests, security validation, end-to-end assertions, failure mode analysis" ;;
    counselor_troi)  echo "UX analysis, WebView integration, streaming output, user-facing component wiring" ;;
    dr_crusher)      echo "System health diagnosis, environment variables, dependency verification, Supabase" ;;
    lt_uhura)        echo "Cross-repo communication, webhook integration, Socket.io, dashboard wiring, .env propagation" ;;
    quark)           echo "Model routing costs, budget validation, OpenRouter tier selection, BarItalia \$1.50 target" ;;
    *)               echo "General systems" ;;
  esac
}

_crew_quote() {
  case "$1" in
    captain_picard)  echo "Things are only impossible until they're not. This pipeline will be resolved — make it so." ;;
    commander_data)  echo "I have analyzed 47,000 possible failure configurations. This one is solvable. Initiating architectural repair sequence." ;;
    commander_riker) echo "I've seen trickier situations in the Neutral Zone. Number One on the case — we'll have this implemented and tested before the next watch." ;;
    geordi_la_forge) echo "With my VISOR I can see exactly what's wrong here. Give me twenty minutes and I'll have the plasma conduit — I mean the build pipeline — running at 110 percent." ;;
    chief_obrien)    echo "I'm an engineer, not a miracle worker — but give me the specs and I'll sort it. I've kept the transporter running with less." ;;
    lt_worf)         echo "A warrior does not complain about the difficulty of the battle. This failure is DISHONOURABLE. I will find every weakness and eliminate it." ;;
    counselor_troi)  echo "I sense significant frustration coming from this step. I can also sense what the system needs — let me interpret these signals and guide us to resolution." ;;
    dr_crusher)      echo "I've read the patient's vitals and I don't like what I see. Let's run a full diagnostic — environment, credentials, memory systems. No shortcuts." ;;
    lt_uhura)        echo "All channels are open, Captain — but something is interfering with the signal. I'll trace every communication pathway until I find the break." ;;
    quark)           echo "The 285th Rule of Acquisition: a failed pipeline is a missed opportunity for profit. Let Quark find the most cost-efficient path to resolution." ;;
    *)               echo "This failure requires immediate attention." ;;
  esac
}

_crew_model() {
  case "$1" in
    captain_picard|commander_data|counselor_troi|dr_crusher) echo "anthropic/claude-3-haiku (strategic/analyst tier)" ;;
    commander_riker|geordi_la_forge)                          echo "anthropic/claude-3-5-sonnet (developer tier)" ;;
    chief_obrien|lt_worf)                                     echo "openai/gpt-4o-mini (integration/QA tier)" ;;
    lt_uhura|quark)                                           echo "google/gemini-flash-1.5 (comms/cost tier)" ;;
    *)                                                        echo "anthropic/claude-3-haiku" ;;
  esac
}

_tool_desc() {
  case "$1" in
    health_check)          echo "Verify the integrity of environment variables, Redis, Supabase, OpenRouter, and Python env" ;;
    run_factory_mission)   echo "Trigger a DDD scaffolding mission — analyse evolution history and generate domain code" ;;
    run_batch_missions)    echo "Run multiple missions concurrently with progress streaming" ;;
    run_crew_agent)        echo "Execute a CrewAI multi-agent workflow with Star Trek persona enrichment" ;;
    manage_project)        echo "Create, update, or archive project-level metadata and sprint context" ;;
    manage_sprint)         echo "Manage Agile sprints (create/start/close) within a project" ;;
    manage_task)           echo "Create, assign, move, or complete tasks within a project or sprint" ;;
    search_code)           echo "Search for functions, classes, or patterns across codebase zips or folders" ;;
    git_operation)         echo "Perform git actions (commit, push, status) to persist pipeline progress" ;;
    get_versions_hierarchy)echo "Extract structured JSON of all project versions for dashboard display" ;;
    *)                     echo "Execute the specified MCP tool" ;;
  esac
}

# ── crew_fail ─────────────────────────────────────────────────────────────────
# Primary public function. Call after any step failure.
#
# Arguments (named flags):
#   --step       Short step ID, e.g. "p0-s3-supabase-check"
#   --persona    Crew member key, e.g. "dr_crusher"
#   --tool       MCP tool name, e.g. "health_check"
#   --tool-args  JSON args for the MCP tool (optional, defaults to {})
#   --context    Human-readable description of what was being attempted
#   --error      Raw error output captured from the failed command
#   --auto       If present, attempt to pipe prompt to `claude` CLI
crew_fail() {
  local step="" persona="" tool="" tool_args="{}" context="" error_output="" auto=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --step)      step="$2";        shift 2 ;;
      --persona)   persona="$2";     shift 2 ;;
      --tool)      tool="$2";        shift 2 ;;
      --tool-args) tool_args="$2";   shift 2 ;;
      --context)   context="$2";     shift 2 ;;
      --error)     error_output="$2";shift 2 ;;
      --auto)      auto=true;        shift   ;;
      *)           shift ;;
    esac
  done

  # Resolve crew profile via lookup functions (bash 3.2-compatible)
  local display; display="$(_crew_display "$persona")"
  local rank;    rank="$(_crew_rank "$persona")"
  local domain;  domain="$(_crew_domain "$persona")"
  local quote;   quote="$(_crew_quote "$persona")"
  local model;   model="$(_crew_model "$persona")"
  local tool_description; tool_description="$(_tool_desc "$tool")"

  # Build the Claude Code prompt (plain text, paste-ready)
  local claude_prompt
  claude_prompt="$(cat <<PROMPT
The pipeline step \`${step}\` in the Sovereign Factory deployment pipeline has failed.

## Context
${context}

## Error Output
\`\`\`
${error_output}
\`\`\`

## Assigned Crew Member
**${display}** — ${rank}
Domain: ${domain}

## Recommended Action
Use the \`${tool}\` MCP tool to diagnose and resolve this failure.
Tool description: ${tool_description}

Invoke as:
\`\`\`json
{
  "tool": "${tool}",
  "arguments": ${tool_args}
}
\`\`\`

After running the tool, interpret the results and provide:
1. Root cause of the failure
2. Exact remediation steps (commands, file edits, env changes)
3. How to re-run \`${step}\` to verify the fix
4. Whether downstream phase steps need to be re-validated

Persona context for tone: ${display} would say — "${quote}"
PROMPT
)"

  # ── Print the formatted failure block to stderr ──────────────────────────────
  echo "" >&2
  echo -e "${_RED}${_BLD}╔══════════════════════════════════════════════════════════════╗${_RST}" >&2
  echo -e "${_RED}${_BLD}║        SOVEREIGN FACTORY — CREW DISPATCH REQUIRED            ║${_RST}" >&2
  echo -e "${_RED}${_BLD}╚══════════════════════════════════════════════════════════════╝${_RST}" >&2
  echo "" >&2
  echo -e "  ${_BLD}Failed Step  :${_RST} ${_YEL}${step}${_RST}" >&2
  echo -e "  ${_BLD}Crew Member  :${_RST} ${_CYN}${display}${_RST}" >&2
  echo -e "  ${_BLD}Rank         :${_RST} ${rank}" >&2
  echo -e "  ${_BLD}Domain       :${_RST} ${domain}" >&2
  echo -e "  ${_BLD}MCP Tool     :${_RST} ${_GRN}${tool}${_RST}" >&2
  echo -e "  ${_BLD}Model Tier   :${_RST} ${model}" >&2
  echo "" >&2
  echo -e "${_MAG}${_BLD}  CREW LOG — ${display}:${_RST}" >&2
  echo -e "${_MAG}  \"${quote}\"${_RST}" >&2
  echo "" >&2

  if [[ -n "$error_output" ]]; then
    echo -e "${_BLD}  ERROR CAPTURED:${_RST}" >&2
    echo -e "${_RED}$(echo "$error_output" | head -30 | sed 's/^/    /')${_RST}" >&2
    echo "" >&2
  fi

  echo -e "${_BLU}${_BLD}  ── CLAUDE CODE PROMPT ──────────────────────────────────────────${_RST}" >&2
  echo -e "${_BLU}  Copy the block below and paste into Claude Code chat:${_RST}" >&2
  echo "" >&2
  echo -e "${_BLD}┌──────────────────────────────────────────────────────────────┐${_RST}" >&2
  echo "$claude_prompt" | sed 's/^/│ /' >&2
  echo -e "${_BLD}└──────────────────────────────────────────────────────────────┘${_RST}" >&2
  echo "" >&2
  echo -e "${_YEL}  Quick MCP invocation (in Claude Code):${_RST}" >&2
  echo -e "  ${_GRN}Use the ${tool} MCP tool with args: ${tool_args}${_RST}" >&2
  echo "" >&2

  # ── Write prompt to file so it can be retrieved later ───────────────────────
  local log_dir
  log_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.pipeline-logs"
  mkdir -p "$log_dir"
  local ts; ts="$(date +%Y%m%d-%H%M%S)"
  local prompt_file="${log_dir}/${ts}-${step}-crew-prompt.md"
  echo "$claude_prompt" > "$prompt_file"
  echo -e "  ${_BLD}Prompt saved :${_RST} ${prompt_file}" >&2
  echo "" >&2

  # ── Auto-pipe to claude CLI if requested and available ───────────────────────
  if [[ "$auto" == true ]]; then
    local claude_bin="${CLAUDE_CLI:-claude}"
    if command -v "$claude_bin" &>/dev/null; then
      echo -e "${_GRN}${_BLD}  AUTO: Piping to claude CLI...${_RST}" >&2
      echo "$claude_prompt" | "$claude_bin" --print 2>&1 | sed 's/^/  [claude] /' >&2
    else
      echo -e "${_YEL}  --auto requested but 'claude' CLI not found. Prompt saved to file above.${_RST}" >&2
    fi
  fi

  echo -e "${_RED}${_BLD}════════════════════════════════════════════════════════════════${_RST}" >&2
  echo "" >&2
}

# ── run_step ──────────────────────────────────────────────────────────────────
# Wraps a command, captures stderr, and calls crew_fail on non-zero exit.
# Usage:
#   run_step "step-id" "persona" "mcp_tool" '{"tool":"args"}' "context description" cmd [args...]
run_step() {
  local step_id="$1"
  local persona="$2"
  local mcp_tool="$3"
  local tool_args="$4"
  local context="$5"
  shift 5

  local err_file; err_file="$(mktemp)"
  echo -e "${_GRN}  ▶ ${step_id}${_RST}  ${context}" >&2

  if ! "$@" 2>"$err_file"; then
    local err_content; err_content="$(cat "$err_file")"
    rm -f "$err_file"
    crew_fail \
      --step     "$step_id"   \
      --persona  "$persona"   \
      --tool     "$mcp_tool"  \
      --tool-args "$tool_args" \
      --context  "$context"   \
      --error    "$err_content"
    return 1
  fi

  rm -f "$err_file"
  echo -e "  ${_GRN}✔${_RST}  ${step_id} passed" >&2
}

# ── step_header ───────────────────────────────────────────────────────────────
step_header() {
  local phase="$1" title="$2"
  echo ""
  echo -e "${_BLD}${_CYN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_RST}"
  echo -e "${_BLD}${_CYN}  SOVEREIGN FACTORY  |  ${phase}  |  ${title}${_RST}"
  echo -e "${_BLD}${_CYN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_RST}"
  echo ""
}

# ── phase_pass ────────────────────────────────────────────────────────────────
phase_pass() {
  local phase="$1"
  echo ""
  echo -e "${_GRN}${_BLD}  ✔  ${phase} COMPLETE — all steps passed${_RST}"
  echo ""
}
