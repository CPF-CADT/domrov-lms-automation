variable "ssh_cidr" {
  description = "Your IP address in CIDR notation for SSH access"
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 3000
}

variable "ami_id" {
  description = "AMI ID for the launch template (Ubuntu 22.04 LTS)"
  type        = string
  default     = "ami-0e7ff22101b84bcff"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of the EC2 key pair for SSH access"
  type        = string
  default     = "domrov"
}

variable "ssm_parameter_names" {
  description = "A list of SSM parameter names to fetch for the application environment"
  type        = list(string)
  default = [
    "/domrov/backend/POSTGRES_URL",
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
