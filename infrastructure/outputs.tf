output "security_group_id" {
  description = "ID of the app security group"
  value       = aws_security_group.app_sg.id
}

output "launch_template_id" {
  description = "ID of the domrov app launch template"
  value       = aws_launch_template.app_launch_template.id
}

output "launch_template_latest_version" {
  description = "Latest version of the launch template"
  value       = aws_launch_template.app_launch_template.latest_version
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.app_lb.dns_name
}

output "alb_url" {
  description = "Full URL to access the application"
  value       = "http://${aws_lb.app_lb.dns_name}"
}

output "nat_gateway_ip" {
  description = "Public IP of NAT Gateway"
  value       = aws_eip.nat.public_ip
}

output "cloudwatch_dashboard_url" {
  description = "URL to CloudWatch Dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=ap-southeast-1#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.default.endpoint
  sensitive   = true
}

output "rds_address" {
  description = "RDS database hostname"
  value       = aws_db_instance.default.address
  sensitive   = true
}

output "rds_database_name" {
  description = "RDS database name"
  value       = "domrov"
}

output "rds_database_user" {
  description = "RDS database username"
  value       = "domrovadmin"
}
