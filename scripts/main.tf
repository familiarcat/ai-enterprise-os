provider "aws" {
  region = var.aws_region
}

# 1. ECR Repository for the Custom Sovereign Engine
resource "aws_ecr_repository" "sovereign_engine" {
  name                 = "sovereign-factory-engine"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# 2. ECS Cluster for Production Deployment
resource "aws_ecs_cluster" "factory" {
  name = "sovereign-factory-cluster"
}

# 3. Managed Redis (Elasticache) for Production
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "factory-cache"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# 4. Honorable Secret Storage (AWS SSM Parameters)
resource "aws_ssm_parameter" "openrouter_key" {
  name  = "/factory/openrouter_api_key"
  type  = "SecureString"
  value = "REPLACE_WITH_ACTUAL" # Initialized via CLI or manual entry

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "supabase_url" {
  name  = "/factory/supabase_url"
  type  = "String"
  value = "REPLACE_WITH_ACTUAL"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "supabase_key" {
  name  = "/factory/supabase_key"
  type  = "SecureString"
  value = "REPLACE_WITH_ACTUAL"

  lifecycle {
    ignore_changes = [value]
  }
}

# 5. Output the ECR URL for the build tools in orchestrator.js
output "ecr_repository_url" {
  value = aws_ecr_repository.sovereign_engine.repository_url
}