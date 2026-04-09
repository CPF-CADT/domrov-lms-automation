terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "account_id" {
  type        = string
  description = "Cloudflare Account ID"
}

variable "environment" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "purpose" {
  type = string
}

variable "allowed_origins" {
  type    = list(string)
  default = []
}

locals {
  is_assignments = var.purpose == "assignments"
  is_user_files  = var.purpose == "user-files"
  is_frontend    = var.purpose == "frontend"
  needs_cors     = local.is_assignments || local.is_user_files
}

resource "cloudflare_r2_bucket" "main" {
  account_id = var.account_id
  bucket_name = var.bucket_name

  force_destroy = var.environment != "production"
}

resource "cloudflare_r2_cors" "main" {
  count       = local.needs_cors ? 1 : 0
  account_id  = var.account_id
  bucket_name = cloudflare_r2_bucket.main.bucket_name

  cors_rules {
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag", "x-amz-version-id"]
    max_age_seconds = 3600
  }
}
