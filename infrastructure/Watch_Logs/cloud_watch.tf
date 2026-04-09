resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  for_each = toset(var.instance_ids)

  alarm_name          = "ec2-cpu-utilization-high-${each.value}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when EC2 CPU exceeds 80% on instance ${each.value}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = each.value
  }

  tags = {
    Name       = "ec2-cpu-high"
    InstanceId = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_memory_high" {
  for_each = toset(var.instance_ids)

  alarm_name          = "ec2-memory-utilization-high-${each.value}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Alert when EC2 memory exceeds 85% on instance ${each.value}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = each.value
  }

  tags = {
    Name       = "ec2-memory-high"
    InstanceId = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_disk_high" {
  for_each = toset(var.instance_ids)

  alarm_name          = "ec2-disk-utilization-high-${each.value}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DiskUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alert when EC2 disk exceeds 90% on instance ${each.value}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = each.value
  }

  tags = {
    Name       = "ec2-disk-high"
    InstanceId = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "rds-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Alert when RDS CPU exceeds 75%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "rds-cpu-high"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "rds-database-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when RDS connections exceed 80"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "rds-connections-high"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "rds-free-storage-space-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648
  alarm_description   = "Alert when RDS free storage is below 2GB"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "rds-storage-low"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "alb-unhealthy-hosts"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "Alert when ALB has unhealthy hosts"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "alb-unhealthy-hosts"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_response_time_high" {
  alarm_name          = "alb-target-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "Alert when ALB response time exceeds 1 second"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "alb-response-time-high"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_request_count" {
  alarm_name          = "alb-request-count-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10000
  alarm_description   = "Alert when ALB request count exceeds 10000 in 5 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "alb-request-count-high"
  }
}

resource "aws_cloudwatch_metric_alarm" "asg_instance_termination" {
  alarm_name          = "asg-instance-termination"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "GroupTerminatingInstances"
  namespace           = "AWS/AutoScaling"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Alert when ASG terminates instances"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "asg-termination"
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_network_in_high" {
  for_each = toset(var.instance_ids)

  alarm_name          = "ec2-network-in-high-${each.value}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NetworkIn"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 1000000000
  alarm_description   = "Alert when EC2 network inbound exceeds 1GB on instance ${each.value}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = each.value
  }

  tags = {
    Name       = "ec2-network-in-high"
    InstanceId = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_network_out_high" {
  for_each = toset(var.instance_ids)

  alarm_name          = "ec2-network-out-high-${each.value}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NetworkOut"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 1000000000
  alarm_description   = "Alert when EC2 network outbound exceeds 1GB on instance ${each.value}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = each.value
  }

  tags = {
    Name       = "ec2-network-out-high"
    InstanceId = each.value
  }
}

resource "aws_sns_topic" "alerts" {
  name = "domrov-cloudwatch-alerts"

  tags = {
    Name = "domrov-alerts"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "admin@domrov.com"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "ARN of SNS topic for CloudWatch alarms"
}
