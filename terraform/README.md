# Domrov LMS - Infrastructure Deployment Guide

## Overview

This directory contains the Terraform Infrastructure as Code (IaC) for deploying the Domrov LMS application on AWS with production-grade security, scalability, and monitoring.

## Architecture

The infrastructure includes:

- **VPC**: Custom virtual private cloud with public/private subnets across 2 availability zones
- **Compute**: Auto-scaling EC2 instances behind an Application Load Balancer
- **Database**: Multi-AZ RDS PostgreSQL with automated backups and encryption
- **Frontend**: S3 buckets with CloudFront CDN for main and admin applications
- **Security**: IAM roles, security groups, and SSL/TLS certificates via ACM
- **Monitoring**: CloudWatch logs, metrics, alarms, and SNS notifications
- **DNS**: Cloudflare for domain management and DDoS protection

## Prerequisites

1. **AWS Account**: Active AWS account with appropriate permissions
2. **Terraform**: Version 1.0 or higher
3. **AWS CLI v2**: Configured with credentials
4. **Cloudflare Account**: With domain `domrov.app` managed
5. **Local Environment Variables**:
   ```bash
   export AWS_REGION=ap-southeast-1
   export CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
   ```

## File Structure

```
infrastructure/
├── providers.tf           # Terraform providers configuration
├── variables.tf           # Variable definitions
├── terraform.tfvars       # Variable values (DO NOT COMMIT SENSITIVE DATA)
├── vpc.tf                 # VPC, subnets, routing
├── security.tf            # Security groups
├── iam.tf                 # IAM roles and policies
├── compute.tf             # EC2 launch templates
├── autoscaling.tf         # Auto Scaling Group
├── scaling.tf             # Scaling policies
├── load_balancer.tf       # ALB and listeners
├── database.tf            # RDS PostgreSQL
├── storage.tf             # S3 buckets for app storage
├── frontend.tf            # S3 + CloudFront for frontends
├── acm.tf                 # SSL/TLS certificates
├── monitoring.tf          # CloudWatch logs, alarms, dashboard
├── endpoints.tf           # VPC endpoints
├── outputs.tf             # Output values
├── user_data.sh           # EC2 instance initialization script
├── scripts/               # Deployment and utility scripts
│   ├── deploy.sh          # Deploy infrastructure
│   ├── destroy.sh         # Destroy infrastructure
│   ├── plan.sh            # Plan changes
│   ├── verify.sh          # Verify deployment
│   └── init-database.sql  # Database initialization
└── resource/
    └── doc.md             # Detailed architecture documentation
```

## Deployment Instructions

### 1. Initialize Terraform

```bash
cd infrastructure
terraform init -upgrade
```

This downloads all required providers and initializes the backend.

### 2. Set Environment Variables

```bash
# Set Cloudflare API token
export CLOUDFLARE_API_TOKEN="your-actual-cloudflare-api-token"

# Verify AWS credentials are configured
aws sts get-caller-identity
```

### 3. Review Configuration

Edit `terraform.tfvars` to customize:

- AWS region (default: ap-southeast-1)
- Instance type (default: t3.small)
- SSH access CIDR (change from 0.0.0.0/0 for security)
- Domain names

### 4. Plan Deployment

```bash
terraform plan -out=tfplan
```

Review the planned changes carefully. This shows all resources that will be created.

### 5. Deploy Infrastructure (Database First)

**First apply (database only):**

```bash
terraform apply -target=aws_db_instance.default
```

This creates:

- RDS PostgreSQL database
- Database password stored locally in `.db_password`
- Secrets Manager secret with the password

**Then apply remaining resources:**

```bash
terraform apply tfplan
```

Or if not using a saved plan:

```bash
terraform apply
```

### 6. Verify Deployment

```bash
# List all created resources
terraform state list

# Show outputs
terraform output

# Check EC2 status
terraform output alb_dns_name

# Access CloudWatch Dashboard
terraform output cloudwatch_dashboard_url
```

## Important Notes

### Database Password

- **First run**: Password is auto-generated and saved to `infrastructure/.db_password`
- **Subsequent runs**: Same password is reused from the file
- **Security**: This file is in `.gitignore` and never committed to Git
- **Access**: Retrieved from AWS Secrets Manager at runtime by EC2 instances

### Cloudflare DNS Setup

Terraform automatically manages your DNS records:

1. Creates CNAME records pointing to CloudFront distributions
2. Validates SSL/TLS certificates via DNS
3. No manual DNS configuration needed

**Important**: Ensure your `domrov.app` domain is managed by Cloudflare for this to work.

### SSL/TLS Certificates

Three certificates are created:

1. **api.domrov.app** - Backend API (auto-validated via Cloudflare)
2. **domrov.app + www.domrov.app** - Main frontend (auto-validated)
3. **admin.domrov.app** - Admin dashboard (auto-validated)

All validation happens automatically through Cloudflare DNS records.

### Auto Scaling

The Auto Scaling Group automatically scales based on CPU:

- **Scale Up**: When avg CPU > 75% for 2 minutes
- **Scale Down**: When avg CPU < 50% for 2 minutes
- **Min instances**: 1
- **Max instances**: 4

### CloudWatch Alarms

Alarms are configured to notify via SNS topic `domrov-alarms`:

- High EC2 CPU (>80%)
- Low EC2 CPU (<20%)
- Unhealthy ALB targets
- High RDS CPU (>80%)

**Action Required**: Subscribe your email to the SNS topic to receive alerts.

## Useful Commands

```bash
# Validate configuration syntax
terraform validate

# Format Terraform files
terraform fmt -recursive

# Show specific resource
terraform state show aws_db_instance.default

# Destroy all infrastructure
terraform destroy

# Destroy specific resource
terraform destroy -target=aws_instance.example

# Import existing AWS resource
terraform import aws_instance.example i-1234567890abcdef0
```

## Cost Optimization Tips

1. **Development**: Change `instance_type` to `t3.micro` and `desired_capacity` to 1
2. **Savings Plans**: Use AWS pricing calculator for cost estimation
3. **Cleanup**: Run `terraform destroy` when not in use for development/testing
4. **Monitoring**: Review CloudWatch metrics for underutilized resources

## Troubleshooting

### Database Connection Issues

```bash
# Check database endpoint
terraform output rds_address

# Verify RDS is running
aws rds describe-db-instances --db-instance-identifier domrov-db

# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id>
```

### Certificate Validation Stuck

```bash
# Check certificate status
aws acm describe-certificate --certificate-arn <arn> --region us-east-1

# Check Cloudflare DNS records
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/<zone-id>/dns_records"
```

### CloudWatch Alarms Not Working

1. Verify SNS topic exists: `terraform output | grep sns`
2. Check email subscription in AWS console
3. Test SNS: `aws sns publish --topic-arn <topic-arn> --message "test"`

## Security Considerations

1. **SSH Access**: Update `ssh_cidr` to your IP address for production
2. **Secrets**: Never commit `terraform.tfstate` or `terraform.tfvars` to Git
3. **Database**: RDS is encrypted and only accessible from EC2 instances
4. **S3 Buckets**: All public access is blocked; access only through CloudFront
5. **IAM**: EC2 instances have least-privilege access to AWS services
6. **VPC Endpoints**: Private subnet instances can access AWS services without internet
7. **KMS Encryption**: Database and secrets are encrypted with KMS keys

## Monitoring & Logging

### CloudWatch Dashboard

Access via: `terraform output cloudwatch_dashboard_url`

Displays:

- EC2 CPU utilization
- ALB response time and request count
- RDS performance metrics
- Auto Scaling Group activity

### Application Logs

- **Location**: CloudWatch Log Group `/domrov/app`
- **Retention**: 7 days
- **Access**: AWS Console or AWS CLI

```bash
aws logs tail /domrov/app --follow
```

## Disaster Recovery

### Database Backups

- **Automated daily backups**: 7-day retention
- **Backup window**: 03:00-04:00 UTC daily
- **Restore process**:
  ```bash
  aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier domrov-db-restored \
    --db-snapshot-identifier <snapshot-id>
  ```

### State Recovery

The Auto Scaling Group automatically recovers failed EC2 instances:

1. Instance fails health check
2. ALB marks it as unhealthy after 2 failures
3. ASG terminates the instance
4. ASG launches a replacement instance

**True/False test**: Terminate an instance and observe ASG behavior in 2-3 minutes.

## Next Steps

1. Update `terraform.tfvars` with your specific values
2. Set environment variables (especially `CLOUDFLARE_API_TOKEN`)
3. Run `terraform plan` and review changes
4. Execute `terraform apply`
5. Configure SNS email subscriptions for alarms
6. Deploy applications to frontends (S3)
7. Deploy backend containers (user_data.sh)

## Support & Documentation

- Terraform Documentation: https://www.terraform.io/docs
- AWS Documentation: https://docs.aws.amazon.com
- Cloudflare API: https://api.cloudflare.com
- See `resource/doc.md` for detailed architecture overview

## Cost Estimation

See `COST_ESTIMATION.md` for detailed monthly cost breakdown.

## Version Control

```bash
# Commit Terraform code (safe)
git add *.tf

# DO NOT commit
git rm --cached terraform.tfvars
git rm --cached terraform.tfstate*
git rm --cached infrastructure/.db_password

# Add to .gitignore (already done)
git add .gitignore
```

---

**Last Updated**: April 2026  
**Terraform Version**: 1.0+  
**AWS Region**: ap-southeast-1
