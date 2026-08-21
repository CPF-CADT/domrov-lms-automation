output "alb_dns_name" {
  value = module.load_balancer.alb_dns_name
}

output "alb_url" {
  value = "http://${module.load_balancer.alb_dns_name}"
}

output "autoscaling_group_name" {
  value = module.autoscaling.autoscaling_group_name
}

output "launch_template_id" {
  value = module.compute.launch_template_id
}

output "nat_gateway_ip" {
  value = module.network.nat_gateway_ip
}

output "rds_endpoint" {
  value     = module.database.rds_endpoint
  sensitive = true
}

output "rds_address" {
  value     = module.database.rds_address
  sensitive = true
}

output "rds_database_name" {
  value = var.db_name
}

output "rds_database_user" {
  value = var.db_username
}

output "cloudwatch_dashboard_url" {
  value = module.monitoring.dashboard_url
}
