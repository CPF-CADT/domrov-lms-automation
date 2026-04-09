#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "DOMROV LMS - COMPLETE DEPLOYMENT SCRIPT"
echo "==========================================${NC}"
echo ""

# Step 0: Prerequisites Check
echo -e "${BLUE}[STEP 0] Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI is not installed${NC}"
    echo "Install from: https://aws.amazon.com/cli/"
    exit 1
fi
echo -e "${GREEN}✓ AWS CLI found${NC}"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}✗ Terraform is not installed${NC}"
    echo "Install from: https://www.terraform.io/downloads"
    exit 1
fi
echo -e "${GREEN}✓ Terraform found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Install from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found$(node -v)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found$(npm -v)${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_IDENTITY=$(aws sts get-caller-identity --query Arn --output text)
echo -e "${GREEN}✓ AWS credentials valid${NC}"
echo "  Account ID: $ACCOUNT_ID"
echo "  Identity: $AWS_IDENTITY"

# Check Cloudflare API Token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}✗ CLOUDFLARE_API_TOKEN environment variable not set${NC}"
    echo "Set with: export CLOUDFLARE_API_TOKEN='your-token'"
    exit 1
fi
echo -e "${GREEN}✓ Cloudflare API token found${NC}"

echo ""

# Step 1: Deploy Infrastructure with Terraform
echo -e "${BLUE}[STEP 1] Deploying infrastructure with Terraform...${NC}"

cd infrastructure

# Validate Terraform files
echo "Validating Terraform configuration..."
terraform fmt -check 2>/dev/null || terraform fmt -recursive
terraform validate

# Initialize Terraform (safe to run multiple times)
echo "Initializing Terraform..."
terraform init -upgrade

# Plan for review
echo "Creating Terraform plan..."
terraform plan -out=tfplan

# Apply
echo -e "${YELLOW}About to apply Terraform changes. Review the plan above.${NC}"
read -p "Do you want to proceed? (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    terraform apply tfplan
    echo -e "${GREEN}✓ Infrastructure deployed successfully${NC}"
else
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

cd ..

echo ""

# Step 2: Build and Deploy Frontend Applications
echo -e "${BLUE}[STEP 2] Building and deploying frontend applications...${NC}"

MAIN_BUCKET="domrov-main-frontend-${ACCOUNT_ID}"
ADMIN_BUCKET="domrov-admin-frontend-${ACCOUNT_ID}"
AWS_REGION="ap-southeast-1"

# Deploy Main Application
echo ""
echo -e "${BLUE}Building main application (react-client)...${NC}"
cd apps/react-client

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --verbose
fi

echo "Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}✗ Build failed - dist directory not created${NC}"
    exit 1
fi

echo "Uploading to S3: $MAIN_BUCKET"
aws s3 sync dist/ s3://$MAIN_BUCKET \
  --region $AWS_REGION \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "index.html" \
  --exclude ".DS_Store"

aws s3 cp dist/index.html s3://$MAIN_BUCKET/index.html \
  --region $AWS_REGION \
  --cache-control "no-cache, no-store, must-revalidate"

echo -e "${GREEN}✓ Main application deployed${NC}"

cd ../../

# Deploy Admin Application
echo ""
echo -e "${BLUE}Building admin application (admin)...${NC}"
cd apps/admin

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --verbose
fi

echo "Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}✗ Build failed - dist directory not created${NC}"
    exit 1
fi

echo "Uploading to S3: $ADMIN_BUCKET"
aws s3 sync dist/ s3://$ADMIN_BUCKET \
  --region $AWS_REGION \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "index.html" \
  --exclude ".DS_Store"

aws s3 cp dist/index.html s3://$ADMIN_BUCKET/index.html \
  --region $AWS_REGION \
  --cache-control "no-cache, no-store, must-revalidate"

echo -e "${GREEN}✓ Admin application deployed${NC}"

cd ../../

echo ""

# Step 3: Invalidate CloudFront Caches
echo -e "${BLUE}[STEP 3] Invalidating CloudFront caches...${NC}"

# Get distribution IDs
echo "Finding CloudFront distributions..."

MAIN_DIST=$(aws cloudfront list-distributions \
  --region $AWS_REGION \
  --query "DistributionList.Items[?contains(Aliases.Items[0], 'domrov')].Id" \
  --output text | awk '{print $1}')

ADMIN_DIST=$(aws cloudfront list-distributions \
  --region $AWS_REGION \
  --query "DistributionList.Items[?contains(Aliases.Items[0], 'admin')].Id" \
  --output text | awk '{print $1}')

if [ -n "$MAIN_DIST" ]; then
    echo "Invalidating main app: $MAIN_DIST"
    aws cloudfront create-invalidation \
      --distribution-id "$MAIN_DIST" \
      --paths "/*" \
      --region $AWS_REGION \
      --query 'Invalidation.Id' \
      --output text
    echo -e "${GREEN}✓ Main app cache invalidated${NC}"
fi

if [ -n "$ADMIN_DIST" ]; then
    echo "Invalidating admin app: $ADMIN_DIST"
    aws cloudfront create-invalidation \
      --distribution-id "$ADMIN_DIST" \
      --paths "/*" \
      --region $AWS_REGION \
      --query 'Invalidation.Id' \
      --output text
    echo -e "${GREEN}✓ Admin app cache invalidated${NC}"
fi

echo ""

# Step 4: Deployment Summary
echo -e "${GREEN}=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Your applications are now live:${NC}"
echo "  🌐 Main App:  https://domrov.app"
echo "  🌐 Admin App: https://admin.domrov.app"
echo "  🔌 Backend API: https://api.domrov.app"
echo ""
echo -e "${BLUE}Database:${NC}"
echo "  📊 PostgreSQL connection stored in SSM Parameter Store"
echo ""
echo -e "${BLUE}Monitoring:${NC}"
echo "  📈 CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch"
echo "  🚨 Alarms configured for CPU, unhealthy targets, and RDS"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Subscribe to SNS alerts for notifications"
echo "  2. Configure application environment variables"
echo "  3. Run database initialization script"
echo "  4. Test health endpoints"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:     aws logs tail /domrov/app --follow"
echo "  Scale up:      aws autoscaling set-desired-capacity --auto-scaling-group-name domrov-asg --desired-capacity 2"
echo "  Redeploy frontend: ./infrastructure/scripts/deploy-frontend.sh"
echo "  Destroy infrastructure: terraform destroy -auto-approve (WARNING: Destructive)"
echo ""
