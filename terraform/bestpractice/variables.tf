variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-southeast-1"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "production"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR"
  default     = "10.0.0.0/16"
}

variable "public_subnet_a_cidr" {
  type        = string
  description = "Public subnet A CIDR"
  default     = "10.0.1.0/24"
}

variable "public_subnet_b_cidr" {
  type        = string
  description = "Public subnet B CIDR"
  default     = "10.0.2.0/24"
}

variable "private_subnet_a_cidr" {
  type        = string
  description = "Private subnet A CIDR"
  default     = "10.0.9.0/24"
}

variable "private_subnet_b_cidr" {
  type        = string
  description = "Private subnet B CIDR"
  default     = "10.0.10.0/24"
}

variable "az_a" {
  type        = string
  description = "Availability zone A"
  default     = "ap-southeast-1a"
}

variable "az_b" {
  type        = string
  description = "Availability zone B"
  default     = "ap-southeast-1b"
}

variable "ssh_cidr" {
  type        = string
  description = "SSH source CIDR"
  default     = "0.0.0.0/0"
}

variable "app_port" {
  type        = number
  description = "Application port"
  default     = 3000
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.small"
}

variable "key_name" {
  type        = string
  description = "EC2 key pair name"
  default     = "domrov"
}

variable "ami_id" {
  type        = string
  description = "EC2 AMI ID"
  default     = "ami-0e7ff22101b84bcff"
}

variable "ssm_parameter_names" {
  type        = list(string)
  description = "SSM parameters for app"
  default = [
    "/domrov/backend/POSTGRES_URL",
    "/domrov/backend/POSTGRES_HOST",
    "/domrov/backend/POSTGRES_PORT",
    "/domrov/backend/JWT_SECRET",
    "/domrov/backend/JWT_ACCESS_TOKEN_EXPIRE",
    "/domrov/backend/JWT_REFRESH_TOKEN_EXPIRE",
    "/domrov/backend/JWT_REFRESH_TOKEN_SECRET",
    "/domrov/backend/SMTP_HOST",
    "/domrov/backend/SMTP_PORT",
    "/domrov/backend/SMTP_SECURE",
    "/domrov/backend/SMTP_USER",
    "/domrov/backend/SMTP_PASS",
    "/domrov/backend/SMTP_FROM",
    "/domrov/backend/GOOGLE_CLIENT_ID",
    "/domrov/backend/GOOGLE_CLIENT_SECRET",
    "/domrov/backend/GOOGLE_CALLBACK_URL",
    "/domrov/backend/GIT_HUB_CLIENT_ID",
    "/domrov/backend/GIT_HUB_CLIENT_SECRET",
    "/domrov/backend/GIT_HUB_CALLBACK_URL",
    "/domrov/backend/BASE_URL",
    "/domrov/backend/JWT_INVITE_SECRET",
    "/domrov/backend/BAKONG_TOKEN",
    "/domrov/backend/BAKONG_API",
    "/domrov/backend/BAKONG_BANK_ACCOUNT",
    "/domrov/backend/MERCHANT_NAME",
    "/domrov/backend/MERCHANT_CITY",
    "/domrov/backend/PHONE_NUMBER",
    "/domrov/backend/CODE_EVAL_GRPC_CLIENT_HOST",
    "/domrov/backend/CODE_EVAL_GRPC_CLIENT_PORT",
    "/domrov/backend/REDIS_URL",
    "/domrov/backend/R2_ACCOUNT_ID",
    "/domrov/backend/R2_TOKEN",
    "/domrov/backend/R2_SECRET_KEY",
    "/domrov/backend/R2_BUCKET",
    "/domrov/backend/AI_KEY_MASTER_SECRET",
    "/domrov/backend/CACHE_TYPE",
    "/domrov/backend/SENTRY_DSN",
    "/domrov/backend/CLOUDINARY_CLOUD_NAME",
    "/domrov/backend/CLOUDINARY_API_KEY",
    "/domrov/backend/CLOUDINARY_API_SECRET",
    "/domrov/backend/DOMROV_SECRET_KEY",
    "/domrov/backend/FRONTEND_URL",
    "/domrov/backend/GEMINI_KEY",
    "/domrov/backend/OLLAMA_API_KEY",
    "/domrov/backend/GPT_KEY",
    "/domrov/backend/DEEPSEEK_API_KEY",
    "/domrov/backend/OPENROUTER_API_KEY"
  ]
}

variable "cloudflare_zone_name" {
  type        = string
  description = "Cloudflare zone"
  default     = "domrov.app"
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API token"
  sensitive   = true
  default     = ""
}

variable "api_domain_name" {
  type        = string
  description = "API domain for certificate"
  default     = "apii.domrov.app"
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "domrov"
}

variable "db_username" {
  type        = string
  description = "Database username"
  default     = "domrovadmin"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  type        = number
  description = "RDS allocated storage"
  default     = 20
}

variable "db_multi_az" {
  type        = bool
  description = "RDS multi AZ"
  default     = true
}

variable "user_data_path" {
  type        = string
  description = "Path to startup script"
  default     = "../user_data.sh"
}
