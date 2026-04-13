terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.40"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# AWS Provider
provider "aws" {
  region = "ap-southeast-1"
}

# AWS Provider for US East 1 (required for ACM certificates with CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Cloudflare Provider
# Set via environment variable: export TF_VAR_cloudflare_api_token="your-token"
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
