#!/usr/bin/env bash
# discussion.sh | Assigned: Captain Picard
# Purpose: Activates the crew to discuss Docker/Terraform strategy.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"
source "$ROOT/scripts/lib/crew-fail.sh"

step_header "STRATEGY" "Crew Briefing: Infrastructure & Pipeline"

echo -e "${_BLD}${_MAG}Captain Picard:${_RST} \"The Sovereign Factory must be both agile and impenetrable. Let's hear the reports.\""

echo -e "\n${_BLD}${_CYN}Geordi La Forge (Infrastructure):${_RST}"
echo "  - Docker builds must be multi-stage. We separate the build environment from the lean production runtime."
echo "  - Local logic for scaffolding should stay in 'Engine-Only' mode. We only expose the Bridge API to the UI Shell."

echo -e "\n${_BLD}${_CYN}Commander Data (Architecture):${_RST}"
echo "  - To verify the OS, we must test the output. CI will now scaffold a 'BarItalia' sample domain."
echo "  - If the generated domain's tests fail, the OS version is considered 'Degraded' and the build halts."

echo -e "\n${_BLD}${_CYN}Lieutenant Worf (Security):${_RST}"
echo "  - Terraform must provision AWS Secrets Manager. No sk-or-v1 keys in Docker layers."
echo "  - MCP tool discovery will now require a 'Worf-Sign-Off' in the registry.json."

echo -e "\n${_BLD}${_CYN}Chief O'Brien (Integration):${_RST}"
echo "  - n8n is the glue. The Dockerfile will include a check for the n8n webhook health before accepting traffic."

echo -e "\n${_BLD}${_GRN}Strategic Plan Finalized:${_RST}"
echo "  1. Phase 4 Docker updated for environment-variable strictness."
echo "  2. Sample 'BarItalia' pipeline added to CI."
echo "  3. Terraform stubs created for AWS Secrets Manager integration."
echo "  4. MCP security gate implemented via Worf's audit tool."

mkdir -p "$ROOT/.pipeline-logs"
echo "Strategy recorded by Counselor Troi."
phase_pass "Infrastructure Discussion"