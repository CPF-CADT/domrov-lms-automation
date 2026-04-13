# AWS Configuration
aws_region = "ap-southeast-1"

# EC2 Configuration
instance_type = "t3.small"
key_name      = "domrov"
ami_id        = "ami-0e7ff22101b84bcff" # Ubuntu 22.04 LTS in ap-southeast-1

# SSH Access
ssh_cidr = "0.0.0.0/0" # Change to your IP for production

# Application Configuration
app_port    = 3000
environment = "production"

# Database Configuration
# Password is auto-generated and stored in infrastructure/.db_password

# Docker Images
app_image       = "phyvathanak/nestjs-backend:latest"
code_eval_image = "phyvathanak/code_eval:latest"

# Cloudflare Configuration
cloudflare_zone_name = "domrov.app"
# API token: Set via environment variable: export CLOUDFLARE_API_TOKEN="your-token"
cloudflare_api_token = "cfut_bBorMdi88lZ7wNxg82Rz9XFiwX7RIiUEX9xQ5OyTdc51d134"
