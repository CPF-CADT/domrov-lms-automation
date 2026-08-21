module "network" {
  source = "./modules/network"

  vpc_cidr              = var.vpc_cidr
  public_subnet_a_cidr  = var.public_subnet_a_cidr
  public_subnet_b_cidr  = var.public_subnet_b_cidr
  private_subnet_a_cidr = var.private_subnet_a_cidr
  private_subnet_b_cidr = var.private_subnet_b_cidr
  az_a                  = var.az_a
  az_b                  = var.az_b
  environment           = var.environment
}

module "security" {
  source = "./modules/security"

  vpc_id      = module.network.vpc_id
  app_port    = var.app_port
  ssh_cidr    = var.ssh_cidr
  environment = var.environment
}

module "iam" {
  source = "./modules/iam"

  aws_region          = var.aws_region
  ssm_parameter_names = var.ssm_parameter_names
}

module "compute" {
  source = "./modules/compute"

  ami_id               = var.ami_id
  instance_type        = var.instance_type
  key_name             = var.key_name
  app_security_group   = module.security.app_security_group_id
  instance_profile_arn = module.iam.instance_profile_arn
  user_data_path       = abspath("${path.root}/${var.user_data_path}")
  environment          = var.environment
}

module "acm" {
  source = "./modules/acm"

  api_domain_name = var.api_domain_name
}

module "load_balancer" {
  source = "./modules/load_balancer"

  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  lb_security_group = module.security.lb_security_group_id
  app_port          = var.app_port
  certificate_arn   = module.acm.certificate_arn
}

module "autoscaling" {
  source = "./modules/autoscaling"

  private_subnet_ids = module.network.private_subnet_ids
  target_group_arn   = module.load_balancer.target_group_arn
  launch_template_id = module.compute.launch_template_id
}

module "database" {
  source = "./modules/database"

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  app_security_group = module.security.app_security_group_id
  db_name            = var.db_name
  db_username        = var.db_username
  db_instance_class  = var.db_instance_class
  db_allocated_store = var.db_allocated_storage
  db_multi_az        = var.db_multi_az
}

module "endpoints" {
  source = "./modules/endpoints"

  aws_region         = var.aws_region
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  app_security_group = module.security.app_security_group_id
}

module "monitoring" {
  source = "./modules/monitoring"

  aws_region             = var.aws_region
  autoscaling_group_name = module.autoscaling.autoscaling_group_name
  load_balancer_suffix   = module.load_balancer.alb_arn_suffix
  target_group_suffix    = module.load_balancer.target_group_arn_suffix
  rds_identifier         = module.database.rds_identifier
}
