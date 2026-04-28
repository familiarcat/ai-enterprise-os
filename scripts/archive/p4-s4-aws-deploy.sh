#!/usr/bin/env bash
# p4-s4-aws-deploy.sh — Phase 4, Step 4: Apply Terraform and push to AWS ECS
# Assigned crew: Geordi La Forge (engineers the production warp core — I mean ECS cluster).
# MCP tool on failure: run_crew_agent
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p4-s4-aws-deploy"
step_header "PHASE 4 — PRODUCTION DEPLOY" "Step 4: AWS Deploy (ECS + ElastiCache + Lambda)"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-sovereign-factory}"
IMAGE_TAG="${DOCKER_IMAGE_TAG:-sovereign-factory:latest}"
ECS_CLUSTER="${ECS_CLUSTER:-sovereign-factory}"
ECS_SERVICE="${ECS_SERVICE:-mcp-bridge}"

# ── Guard: explicit confirmation required ─────────────────────────────────────
echo "  ⚠  This step applies Terraform changes and pushes to AWS ECS."
echo "  ⚠  It WILL incur cloud costs."
echo ""
if [[ "${SOVEREIGN_CONFIRM_AWS_DEPLOY:-}" != "yes" ]]; then
  echo "  To proceed, re-run with:"
  echo "    SOVEREIGN_CONFIRM_AWS_DEPLOY=yes ./scripts/p4-s4-aws-deploy.sh"
  echo ""
  echo "  Dry-run mode: validating prerequisites only."
  DRY_RUN=true
else
  DRY_RUN=false
fi

# ── Check prereqs ─────────────────────────────────────────────────────────────
for cli in aws docker terraform; do
  command -v "$cli" &>/dev/null && echo "  ✔  $cli found" || {
    crew_fail \
      --step    "$STEP" \
      --persona "geordi_la_forge" \
      --tool    "run_crew_agent" \
      --tool-args '{"objective": "Install missing CLI tools for AWS deployment: aws, docker, terraform", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Chief O'\''Brien"}]}' \
      --context "$cli CLI not found — required for AWS ECS deployment." \
      --error   "$cli not found on PATH"
    exit 1
  }
done

# ── Check AWS identity ────────────────────────────────────────────────────────
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/tmp/p4s4-aws.txt) || {
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Diagnose AWS credential failure for ECS deployment", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Dr. Crusher"}]}' \
    --context "AWS CLI cannot authenticate. Credentials may be expired or not configured." \
    --error   "$(cat /tmp/p4s4-aws.txt)"
  exit 1
}
echo "  ✔  AWS Account: $AWS_ACCOUNT  Region: $AWS_REGION"

if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "  DRY RUN — skipping ECR push and ECS deploy"
  echo "  Prerequisites: ✔  Set SOVEREIGN_CONFIRM_AWS_DEPLOY=yes to proceed"
  phase_pass "$STEP"
  exit 0
fi

# ── ECR login and push ────────────────────────────────────────────────────────
echo ""
ECR_URI="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
echo "  Logging into ECR: $ECR_URI..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_URI" 2>/tmp/p4s4-ecr.txt || {
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix ECR login failure — check IAM permissions for ecr:GetAuthorizationToken", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Commander Data"}]}' \
    --context "ECR login failed for $ECR_URI. IAM user may lack ecr:GetAuthorizationToken permission." \
    --error   "$(cat /tmp/p4s4-ecr.txt)"
  exit 1
}

# Create repo if needed
aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" &>/dev/null || \
  aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" > /dev/null

ECR_TAG="${ECR_URI}:latest"
docker tag "$IMAGE_TAG" "$ECR_TAG"
echo "  Pushing $ECR_TAG..."
docker push "$ECR_TAG" 2>/tmp/p4s4-push.txt || {
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix Docker push to ECR failure", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Chief O'\''Brien"}]}' \
    --context "docker push to ECR failed. Image may not exist locally — run p4-s1-docker-build.sh first." \
    --error   "$(cat /tmp/p4s4-push.txt | tail -10)"
  exit 1
}
echo "  ✔  Pushed: $ECR_TAG"

# ── Terraform apply ───────────────────────────────────────────────────────────
echo ""
TF_DIR=""
PARENT="$(dirname "$ROOT")"
for candidate in "$ROOT/terraform" "$PARENT/openrouter-crew-platform/terraform"; do
  [[ -d "$candidate" ]] && TF_DIR="$candidate" && break
done

if [[ -n "$TF_DIR" ]]; then
  PLAN_FILE="/tmp/sovereign-tf.plan"
  [[ -f "$PLAN_FILE" ]] || terraform -chdir="$TF_DIR" plan -out="$PLAN_FILE"
  echo "  Applying Terraform plan..."
  terraform -chdir="$TF_DIR" apply "$PLAN_FILE" 2>/tmp/p4s4-tf-apply.txt || {
    crew_fail \
      --step    "$STEP" \
      --persona "geordi_la_forge" \
      --tool    "run_crew_agent" \
      --tool-args '{"objective": "Diagnose Terraform apply failure for Sovereign Factory AWS infrastructure", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Commander Data"}]}' \
      --context "terraform apply failed. Review the plan errors — may be a resource limit, IAM permission, or config issue." \
      --error   "$(cat /tmp/p4s4-tf-apply.txt | tail -30)"
    exit 1
  }
  echo "  ✔  Terraform apply complete"
fi

# ── ECS service update ────────────────────────────────────────────────────────
echo ""
echo "  Forcing ECS service deployment..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION" 2>/tmp/p4s4-ecs.txt || {
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix ECS service update failure — cluster or service may not exist yet, or IAM lacks ecs:UpdateService", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Chief O'\''Brien"}]}' \
    --context "aws ecs update-service failed for cluster=$ECS_CLUSTER service=$ECS_SERVICE." \
    --error   "$(cat /tmp/p4s4-ecs.txt)"
  exit 1
}
echo "  ✔  ECS service deployment triggered"

# ── Wait for stability ────────────────────────────────────────────────────────
echo "  Waiting for ECS service to stabilize (up to 5 minutes)..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION" 2>/dev/null && echo "  ✔  ECS service stable" || echo "  ⚠  ECS wait timed out — check ECS console"

phase_pass "$STEP"
