Domrov Terraform Best Practice Structure

This folder provides a modular Terraform layout so infrastructure is separated by responsibility and easier to maintain.

Folder structure

- providers.tf: Terraform and provider configuration
- variables.tf: Root input variables
- main.tf: Root orchestration of modules
- outputs.tf: Root outputs
- terraform.tfvars.example: Example input values
- modules/: Reusable infrastructure modules
  - network
  - security
  - iam
  - compute
  - acm
  - load_balancer
  - autoscaling
  - database
  - endpoints
  - monitoring

How to use

1. Move into this folder.
2. Initialize Terraform.
3. Copy terraform.tfvars.example to terraform.tfvars.
4. Fill in real values, especially cloudflare_api_token and secure network CIDRs.
5. Run terraform plan.
6. Run terraform apply.

Commands

terraform init
terraform plan
terraform apply

Best practice notes

- Keep secrets out of committed files.
- Use remote state for team workflows.
- Use separate state per environment.
- Restrict ssh_cidr to trusted IP ranges.
- Review plans before apply.
- Pin provider versions and upgrade in a controlled way.
