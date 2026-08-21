output "app_security_group_id" {
  value = aws_security_group.app.id
}

output "lb_security_group_id" {
  value = aws_security_group.lb.id
}
