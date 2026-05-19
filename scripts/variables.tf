variable "aws_region" {
  description = "Target region for Sovereign Factory deployment"
  default     = "us-east-1"
}

variable "environment" {
  description = "uat or production"
  default     = "uat"
}