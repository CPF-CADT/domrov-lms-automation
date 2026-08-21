Domrov LMS Terraform

Overview
This Terraform project deploys the backend AWS infrastructure for Domrov LMS using a modular architecture.
The root module in this folder wires all submodules together through inputs and outputs.

The infrastructure is designed around:

- Private application compute in an Auto Scaling Group
- Public entry through an Application Load Balancer
- Private PostgreSQL database on RDS
- IAM-controlled runtime access to SSM, logs, and secrets
- CloudWatch-based monitoring and alerting

Architecture summary

- Users connect to the Application Load Balancer on ports 80 and 443.
- HTTP traffic is redirected to HTTPS.
- The Load Balancer forwards requests to EC2 instances in private subnets.
- EC2 instances use IAM role permissions to read SSM parameters and write logs/metrics.
- The application connects to PostgreSQL in private subnets.
- VPC interface endpoints allow private AWS service access without public internet paths for specific services.

Root files

- providers.tf: Terraform version and provider constraints.
- variables.tf: Global input variables with defaults.
- main.tf: Module composition and dependency wiring.
- outputs.tf: Root-level outputs returned after apply.
- user_data.sh: Instance bootstrap script loaded by the compute module.

Module guide

1. modules/network
   Purpose

- Creates the base network topology.

What it creates

- VPC
- Two public subnets
- Two private subnets
- Internet Gateway and attachment
- NAT Gateway with Elastic IP
- Public and private route tables and associations

Inputs

- vpc_cidr
- public_subnet_a_cidr
- public_subnet_b_cidr
- private_subnet_a_cidr
- private_subnet_b_cidr
- az_a
- az_b
- environment

Outputs used by other modules

- vpc_id
- public_subnet_ids
- private_subnet_ids
- nat_gateway_ip

2. modules/security
   Purpose

- Defines network access boundaries for ALB and EC2 workloads.

What it creates

- Application security group
- Load balancer security group

Access model

- ALB allows inbound 80/443 from internet.
- App instances allow app_port only from ALB security group.
- SSH access is controlled by ssh_cidr.

Inputs

- vpc_id
- app_port
- ssh_cidr
- environment

Outputs

- app_security_group_id
- lb_security_group_id

3. modules/iam
   Purpose

- Provides EC2 runtime identity and permissions.

What it creates

- IAM role for EC2
- IAM policies for SSM read, CloudWatch logs/metrics, and Secrets Manager read
- Instance profile bound to the EC2 role

Inputs

- aws_region
- ssm_parameter_names

Outputs

- instance_profile_arn

4. modules/compute
   Purpose

- Defines the EC2 Launch Template used by Auto Scaling.

What it creates

- Launch template with AMI, instance type, key pair, IAM profile, security group, root EBS volume, and user_data.

Inputs

- ami_id
- instance_type
- key_name
- app_security_group
- instance_profile_arn
- user_data_path
- environment

Outputs

- launch_template_id
- launch_template_latest_version

5. modules/acm
   Purpose

- Manages ACM certificate resources for the API domain.

What it creates

- ACM certificate
- ACM certificate validation resource

Input

- api_domain_name

Output

- certificate_arn

6. modules/load_balancer
   Purpose

- Exposes the application through an ALB and routes traffic to compute.

What it creates

- Application Load Balancer
- Target group for EC2 instances
- HTTP listener with redirect to HTTPS
- HTTPS listener with certificate

Inputs

- vpc_id
- public_subnet_ids
- lb_security_group
- app_port
- certificate_arn

Outputs

- alb_dns_name
- alb_arn_suffix
- target_group_arn
- target_group_arn_suffix

7. modules/autoscaling
   Purpose

- Manages instance count and scaling behavior.

What it creates

- Auto Scaling Group
- Lifecycle hook on instance launch
- Target tracking scaling policy
- Step scaling policy and alarm

Inputs

- private_subnet_ids
- target_group_arn
- launch_template_id

Output

- autoscaling_group_name

8. modules/database
   Purpose

- Provisions encrypted PostgreSQL and related secret resources.

What it creates

- KMS key and alias
- Random password and local password file
- Secrets Manager secret and version
- DB subnet group
- DB security group
- RDS PostgreSQL instance

Inputs

- vpc_id
- private_subnet_ids
- app_security_group
- db_name
- db_username
- db_instance_class
- db_allocated_store
- db_multi_az

Outputs

- rds_endpoint
- rds_address
- rds_identifier

9. modules/endpoints
   Purpose

- Creates VPC interface endpoints for private service connectivity.

What it creates

- Endpoints for ssm, ssmmessages, ec2, ec2messages, secretsmanager, monitoring, logs

Inputs

- aws_region
- vpc_id
- private_subnet_ids
- app_security_group

10. modules/monitoring
    Purpose

- Centralizes observability and alerting.

What it creates

- CloudWatch log group
- SNS topic for alarms
- CloudWatch dashboard
- CPU and health alarms for EC2/ALB/RDS

Inputs

- aws_region
- autoscaling_group_name
- load_balancer_suffix
- target_group_suffix
- rds_identifier

Output

- dashboard_url

Execution flow in main.tf

1. network module runs first and returns VPC/subnet IDs.
2. security module uses vpc_id from network.
3. iam module provides instance profile for EC2.
4. compute module uses security + iam outputs.
5. acm module creates certificate ARN.
6. load_balancer module uses network + security + acm outputs.
7. autoscaling module uses compute + load_balancer + network outputs.
8. database module uses network + security outputs.
9. endpoints module uses network + security outputs.
10. monitoring module uses autoscaling + load balancer + database outputs.

How to run

1. Open this terraform folder.
2. Create terraform.tfvars from terraform.tfvars.example if needed.
3. Provide secrets through environment variables.
4. Run format and validation.
5. Run plan and review carefully.
6. Run apply.

Commands
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply

Important variables to review before production

- ssh_cidr
- api_domain_name
- ami_id
- instance_type
- db_instance_class
- db_multi_az
- user_data_path

Root outputs

- alb_dns_name
- alb_url
- autoscaling_group_name
- launch_template_id
- nat_gateway_ip
- rds_endpoint
- rds_address
- rds_database_name
- rds_database_user
- cloudwatch_dashboard_url

Operational recommendations

- Use a remote backend (S3 + DynamoDB lock) for shared environments.
- Keep tfstate, tfvars, and generated secrets out of version control.
- Restrict ssh_cidr to a trusted source range.
- Review every plan before apply.
- Use separate workspaces or separate state per environment.
- Pin provider versions and upgrade in controlled change windows.
