output "ec2_alarms" {
  value = {
    cpu_alarms            = [for alarm in aws_cloudwatch_metric_alarm.ec2_cpu_high : alarm.alarm_name]
    memory_alarms         = [for alarm in aws_cloudwatch_metric_alarm.ec2_memory_high : alarm.alarm_name]
    disk_alarms           = [for alarm in aws_cloudwatch_metric_alarm.ec2_disk_high : alarm.alarm_name]
    network_in_alarms     = [for alarm in aws_cloudwatch_metric_alarm.ec2_network_in_high : alarm.alarm_name]
    network_out_alarms    = [for alarm in aws_cloudwatch_metric_alarm.ec2_network_out_high : alarm.alarm_name]
  }
  description = "EC2 CloudWatch alarm names"
}

output "rds_alarms" {
  value = {
    cpu_high       = aws_cloudwatch_metric_alarm.rds_cpu_high.alarm_name
    connections    = aws_cloudwatch_metric_alarm.rds_connections_high.alarm_name
    storage_low    = aws_cloudwatch_metric_alarm.rds_storage_low.alarm_name
  }
  description = "RDS CloudWatch alarm names"
}

output "alb_alarms" {
  value = {
    unhealthy_hosts     = aws_cloudwatch_metric_alarm.alb_unhealthy_hosts.alarm_name
    response_time_high  = aws_cloudwatch_metric_alarm.alb_response_time_high.alarm_name
    request_count_high  = aws_cloudwatch_metric_alarm.alb_request_count.alarm_name
  }
  description = "ALB CloudWatch alarm names"
}

output "log_groups" {
  value = {
    ec2_system      = aws_cloudwatch_log_group.ec2_system.name
    ec2_application = aws_cloudwatch_log_group.ec2_application.name
    rds_error       = aws_cloudwatch_log_group.rds_error.name
    rds_slowquery   = aws_cloudwatch_log_group.rds_slowquery.name
    alb_access      = aws_cloudwatch_log_group.alb_access.name
    security        = aws_cloudwatch_log_group.security_events.name
    vpc_flowlogs    = aws_cloudwatch_log_group.vpc_flow_logs.name
  }
  description = "CloudWatch log group names"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "SNS topic ARN for CloudWatch alarms"
}
