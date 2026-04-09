# DOMROV LMS - Complete Deployment Script (PowerShell)
# Run from repo root: .\deploy-all.ps1

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Blue }
function Write-Warn { Write-Host $args -ForegroundColor Yellow }

Write-Info @"
==========================================
DOMROV LMS - COMPLETE DEPLOYMENT SCRIPT
==========================================
"@
Write-Host ""

# Step 0: Prerequisites Check
Write-Info "[STEP 0] Checking prerequisites..."

# Check if Terraform is installed
try {
    $tfVersion = terraform -v 2>$null
    if ($?) {
        Write-Success "✓ Terraform found"
        Write-Host "  $($tfVersion.Split([Environment]::NewLine)[0])"
    }
} catch {
    Write-Error-Custom "✗ Terraform not found"
    Write-Host "Install from: https://www.terraform.io/downloads"
    exit 1
}

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>$null
    if ($?) {
        Write-Success "✓ AWS CLI found"
    }
} catch {
    Write-Error-Custom "✗ AWS CLI not found"
    Write-Host "Install from: https://aws.amazon.com/cli/"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node -v 2>$null
    if ($?) {
        Write-Success "✓ Node.js found ($nodeVersion)"
    }
} catch {
    Write-Error-Custom "✗ Node.js not found"
    Write-Host "Install from: https://nodejs.org/"
    exit 1
}

# Check AWS credentials
try {
    $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Success "✓ AWS credentials valid"
        Write-Host "  Account ID: $($identity.Account)"
        Write-Host "  Identity: $($identity.Arn)"
    }
} catch {
    Write-Error-Custom "✗ AWS credentials not configured"
    Write-Host "Run: aws configure"
    exit 1
}

# Check Cloudflare API Token
if ([string]::IsNullOrEmpty($env:CLOUDFLARE_API_TOKEN)) {
    Write-Error-Custom "✗ CLOUDFLARE_API_TOKEN environment variable not set"
    Write-Host "Set with: `$env:CLOUDFLARE_API_TOKEN='your-token'"
    exit 1
}
Write-Success "✓ Cloudflare API token found"

Write-Host ""

# Get AWS Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$AWS_REGION = "ap-southeast-1"
$MAIN_BUCKET = "domrov-main-frontend-$ACCOUNT_ID"
$ADMIN_BUCKET = "domrov-admin-frontend-$ACCOUNT_ID"

# Step 1: Deploy Infrastructure with Terraform
Write-Info "[STEP 1] Deploying infrastructure with Terraform..."

Push-Location infrastructure

try {
    # Validate Terraform files
    Write-Host "Validating Terraform configuration..."
    terraform fmt -recursive -check 2>$null
    if ($?) {
        Write-Host "Formatting check passed..."
    } else {
        Write-Host "Auto-formatting Terraform files..."
        terraform fmt -recursive
    }
    
    terraform validate
    Write-Host "✓ Terraform validation passed"
    
    # Initialize Terraform
    Write-Host "Initializing Terraform..."
    terraform init -upgrade
    
    # Plan for review
    Write-Host "Creating Terraform plan..."
    terraform plan -out=tfplan
    
    # Apply
    Write-Warn "About to apply Terraform changes. Review the plan above."
    $proceed = Read-Host "Do you want to proceed? (yes/no)"
    
    if ($proceed -eq "yes") {
        terraform apply tfplan
        Write-Success "✓ Infrastructure deployed successfully"
    } else {
        Write-Error-Custom "Deployment cancelled"
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""

# Step 2: Build and Deploy Frontend Applications
Write-Info "[STEP 2] Building and deploying frontend applications..."

# Deploy Main Application
Write-Host ""
Write-Info "Building main application (react-client)..."
Push-Location apps\react-client

try {
    if (!(Test-Path node_modules)) {
        Write-Host "Installing dependencies..."
        npm install
    }
    
    Write-Host "Building production bundle..."
    npm run build
    
    if (!(Test-Path dist)) {
        Write-Error-Custom "✗ Build failed - dist directory not created"
        exit 1
    }
    
    Write-Host "Uploading to S3: $MAIN_BUCKET"
    aws s3 sync dist\ s3://$MAIN_BUCKET `
      --region $AWS_REGION `
      --delete `
      --cache-control "public, max-age=3600" `
      --exclude "index.html" `
      --exclude ".DS_Store"
    
    aws s3 cp dist\index.html s3://$MAIN_BUCKET/index.html `
      --region $AWS_REGION `
      --cache-control "no-cache, no-store, must-revalidate"
    
    Write-Success "✓ Main application deployed"
} finally {
    Pop-Location
}

# Deploy Admin Application
Write-Host ""
Write-Info "Building admin application (admin)..."
Push-Location apps\admin

try {
    if (!(Test-Path node_modules)) {
        Write-Host "Installing dependencies..."
        npm install
    }
    
    Write-Host "Building production bundle..."
    npm run build
    
    if (!(Test-Path dist)) {
        Write-Error-Custom "✗ Build failed - dist directory not created"
        exit 1
    }
    
    Write-Host "Uploading to S3: $ADMIN_BUCKET"
    aws s3 sync dist\ s3://$ADMIN_BUCKET `
      --region $AWS_REGION `
      --delete `
      --cache-control "public, max-age=3600" `
      --exclude "index.html" `
      --exclude ".DS_Store"
    
    aws s3 cp dist\index.html s3://$ADMIN_BUCKET/index.html `
      --region $AWS_REGION `
      --cache-control "no-cache, no-store, must-revalidate"
    
    Write-Success "✓ Admin application deployed"
} finally {
    Pop-Location
}

Write-Host ""

# Step 3: Invalidate CloudFront Caches
Write-Info "[STEP 3] Invalidating CloudFront caches..."

Write-Host "Finding CloudFront distributions..."

try {
    $distributions = aws cloudfront list-distributions `
      --region $AWS_REGION `
      --query "DistributionList.Items[*].[Id,Aliases.Items[0]]" `
      --output json | ConvertFrom-Json
    
    foreach ($dist in $distributions) {
        if ($dist[1] -like "*domrov*" -and $dist[1] -notlike "*admin*") {
            Write-Host "Invalidating main app: $($dist[0])"
            aws cloudfront create-invalidation `
              --distribution-id $dist[0] `
              --paths "/*" `
              --region $AWS_REGION `
              --query 'Invalidation.Id' `
              --output text | Out-Null
            Write-Success "✓ Main app cache invalidated"
        }
        
        if ($dist[1] -like "*admin*") {
            Write-Host "Invalidating admin app: $($dist[0])"
            aws cloudfront create-invalidation `
              --distribution-id $dist[0] `
              --paths "/*" `
              --region $AWS_REGION `
              --query 'Invalidation.Id' `
              --output text | Out-Null
            Write-Success "✓ Admin app cache invalidated"
        }
    }
} catch {
    Write-Warn "Note: CloudFront invalidation may have been skipped or already completed"
}

Write-Host ""

# Step 4: Deployment Summary
Write-Success @"
==========================================
DEPLOYMENT COMPLETE!
==========================================
"@
Write-Host ""
Write-Info "Your applications are now live:"
Write-Host "  🌐 Main App:  https://domrov.app"
Write-Host "  🌐 Admin App: https://admin.domrov.app"
Write-Host "  🔌 Backend API: https://api.domrov.app"

Write-Host ""
Write-Info "Database:"
Write-Host "  📊 PostgreSQL connection stored in SSM Parameter Store"

Write-Host ""
Write-Info "Monitoring:"
Write-Host "  📈 CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch"
Write-Host "  🚨 Alarms configured for CPU, unhealthy targets, and RDS"

Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Subscribe to SNS alerts for notifications"
Write-Host "  2. Configure application environment variables"
Write-Host "  3. Run database initialization script"
Write-Host "  4. Test health endpoints"

Write-Host ""
Write-Info "Useful commands:"
Write-Host "  View logs:     aws logs tail /domrov/app --follow"
Write-Host "  Scale up:      aws autoscaling set-desired-capacity --auto-scaling-group-name domrov-asg --desired-capacity 2"
Write-Host "  Redeploy frontend: .\infrastructure\scripts\deploy-frontend.ps1"
Write-Host "  Destroy infrastructure: cd infrastructure; terraform destroy"

Write-Success "✓ All done!"
