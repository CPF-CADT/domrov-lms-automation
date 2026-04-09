output "security_group_id" {
  description = "ID of the app security group"
  value       = aws_security_group.app_sg.id
}

output "launch_template_id" {
  description = "ID of the domrov app launch template"
  value       = aws_launch_template.domrov_app.id
}

output "launch_template_latest_version" {
  description = "Latest version of the launch template"
  value       = aws_launch_template.domrov_app.latest_version
}
