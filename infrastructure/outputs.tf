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
