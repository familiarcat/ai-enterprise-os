#!/usr/bin/env bash
# p4-s2-terraform-plan.sh — Phase 4, Step 2: Terraform plan for AWS infrastructure
# Runs terraform plan for ECS, ElastiCache, and Lambda — validates before apply.
# Assigned crew: Commander Data (architect, validates every structural constraint before commit).
# MCP tool on failure: manage_project
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p4-s2-terraform-plan"
step_header "PHASE 4 — PRODUCTION DEPLOY" "Step 2: Terraform Plan (AWS Infrastructure)"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

TF_WORKSPACE="${TF_WORKSPACE:-development}"

# ── Locate terraform directory ────────────────────────────────────────────────
TF_DIR=""
PARENT="$(dirname "$ROOT")"
for candidate in \
  "$ROOT/terraform" \
  "$ROOT/infrastructure/terraform" \
  "$PARENT/openrouter-crew-platform/terraform" \
  "$PARENT/openrouter-crew-platform/infrastructure"
do
  [[ -d "$candidate" ]] && TF_DIR="$candidate" && break
done

if [[ -z "$TF_DIR" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "manage_project" \
    --tool-args '{"project": "sovereign-factory-infra", "action": "create", "details": {"description": "Create Terraform configuration for ECS Fargate, ElastiCache, and Lambda deployment"}}' \
    --context "No terraform directory found in either repo. Terraform configuration must be created before the AWS deployment can be planned." \
    --error   "Searched: $ROOT/terraform, $PARENT/openrouter-crew-platform/terraform — create one of these directories with main.tf"
  exit 1
fi
echo "  ✔  Terraform directory: $TF_DIR"

# ── Check Terraform CLI ───────────────────────────────────────────────────────
if ! command -v terraform &>/dev/null; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "manage_project" \
    --tool-args '{"project": "sovereign-factory-infra", "action": "update", "details": {"blocker": "terraform CLI not installed"}}' \
    --context "Terraform CLI not found. Install it before running the plan." \
    --error   "terraform: command not found — install from https://developer.hashicorp.com/terraform/install"
  exit 1
fi
TF_VER=$(terraform --version 2>/dev/null | head -1)
echo "  ✔  Terraform: $TF_VER"

# ── Check AWS credentials ─────────────────────────────────────────────────────
echo ""
echo "  Checking AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null 2>&1; then
  echo "  ⚠  AWS CLI not configured or credentials expired"
  echo "     Terraform plan will use cached state / fail on provider auth"
  echo "     Run: aws configure  or  export AWS_PROFILE=your-profile"
else
  IDENTITY=$(aws sts get-caller-identity --output text --query 'Account' 2>/dev/null || echo "unknown")
  echo "  ✔  AWS Account: $IDENTITY"
fi

# ── terraform init ────────────────────────────────────────────────────────────
echo ""
echo "  Running terraform init..."
cd "$TF_DIR"
if ! terraform init -upgrade 2>/tmp/p4s2-init.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "manage_project" \
    --tool-args '{"project": "sovereign-factory-infra", "action": "update", "details": {"status": "terraform-init-failed"}}' \
    --context "terraform init failed in $TF_DIR. Provider configuration or backend may be malformed." \
    --error   "$(cat /tmp/p4s2-init.txt | tail -20)"
  exit 1
fi
echo "  ✔  terraform init complete"

# ── Select workspace ──────────────────────────────────────────────────────────
echo ""
echo "  Selecting workspace: $TF_WORKSPACE..."
terraform workspace select "$TF_WORKSPACE" 2>/dev/null || \
  terraform workspace new "$TF_WORKSPACE" 2>/dev/null || true

CURRENT_WS=$(terraform workspace show 2>/dev/null || echo "unknown")
echo "  Active workspace: $CURRENT_WS"

# ── terraform plan ────────────────────────────────────────────────────────────
echo ""
echo "  Running terraform plan..."
PLAN_FILE="/tmp/sovereign-tf.plan"

if ! terraform plan -out="$PLAN_FILE" 2>/tmp/p4s2-plan.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_data" \
    --tool    "manage_project" \
    --tool-args '{"project": "sovereign-factory-infra", "action": "update", "details": {"status": "terraform-plan-failed", "workspace": "'"$TF_WORKSPACE"'"}}' \
    --context "terraform plan failed in workspace $TF_WORKSPACE. Infrastructure configuration has errors or AWS credentials are invalid." \
    --error   "$(cat /tmp/p4s2-plan.txt | tail -30)"
  exit 1
fi

echo "  ✔  terraform plan succeeded — plan saved to $PLAN_FILE"
echo ""
echo "  Plan summary:"
terraform show -no-color "$PLAN_FILE" 2>/dev/null | grep -E "^  # |will be (created|destroyed|updated)" | head -20 || true
echo ""
echo "  ⚠  Review the plan above, then run:"
echo "     terraform apply $PLAN_FILE"
echo "     (or run p4-s4-aws-deploy.sh which calls apply)"

phase_pass "$STEP"
