resource "aws_cloudwatch_log_group" "ec2_system" {
  name              = "/aws/ec2/system/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "ec2-system-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "ec2_application" {
  name              = "/aws/ec2/application/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "ec2-application-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "rds_error" {
  name              = "/aws/rds/error/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "rds-error-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "rds_slowquery" {
  name              = "/aws/rds/slowquery/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "rds-slowquery-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "rds_audit" {
  name              = "/aws/rds/audit/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "rds-audit-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "alb_access" {
  name              = "/aws/alb/access/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "alb-access-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "asg_activity" {
  name              = "/aws/asg/activity/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "asg-activity-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "security_events" {
  name              = "/aws/security/events/${var.environment}"
  retention_in_days = 60

  tags = {
    Name        = "security-events-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flowlogs/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "vpc-flow-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/domrov/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "lambda-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_stream" "ec2_system_stream" {
  name           = "system-messages"
  log_group_name = aws_cloudwatch_log_group.ec2_system.name
}

resource "aws_cloudwatch_log_stream" "ec2_app_stream" {
  name           = "app-messages"
  log_group_name = aws_cloudwatch_log_group.ec2_application.name
}

resource "aws_cloudwatch_log_stream" "rds_error_stream" {
  name           = "error-log"
  log_group_name = aws_cloudwatch_log_group.rds_error.name
}

resource "aws_cloudwatch_log_stream" "rds_slowquery_stream" {
  name           = "slowquery-log"
  log_group_name = aws_cloudwatch_log_group.rds_slowquery.name
}

resource "aws_cloudwatch_log_stream" "alb_stream" {
  name           = "access-log"
  log_group_name = aws_cloudwatch_log_group.alb_access.name
}

resource "aws_cloudwatch_log_stream" "asg_stream" {
  name           = "activity-log"
  log_group_name = aws_cloudwatch_log_group.asg_activity.name
}

resource "aws_cloudwatch_log_stream" "vpc_flow_stream" {
  name           = "eni-logs"
  log_group_name = aws_cloudwatch_log_group.vpc_flow_logs.name
}

resource "aws_cloudwatch_log_metric_filter" "ec2_errors" {
  name           = "ec2-error-count"
  log_group_name = aws_cloudwatch_log_group.ec2_application.name
  filter_pattern = "[time, request_id, level = ERROR, ...]"

  metric_transformation {
    name      = "EC2ErrorCount"
    namespace = "DOMROV/EC2"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "rds_errors" {
  name           = "rds-error-count"
  log_group_name = aws_cloudwatch_log_group.rds_error.name
  filter_pattern = "[time, level = ERROR, ...]"

  metric_transformation {
    name      = "RDSErrorCount"
    namespace = "DOMROV/RDS"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "alb_5xx_errors" {
  name           = "alb-5xx-error-count"
  log_group_name = aws_cloudwatch_log_group.alb_access.name
  filter_pattern = "[... , status_code = 5*, ...]"

  metric_transformation {
    name      = "ALB5XXErrorCount"
    namespace = "DOMROV/ALB"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "alb_4xx_errors" {
  name           = "alb-4xx-error-count"
  log_group_name = aws_cloudwatch_log_group.alb_access.name
  filter_pattern = "[... , status_code = 4*, ...]"

  metric_transformation {
    name      = "ALB4XXErrorCount"
    namespace = "DOMROV/ALB"
    value     = "1"
  }
}

output "log_groups" {
  value = {
    ec2_system     = aws_cloudwatch_log_group.ec2_system.name
    ec2_application = aws_cloudwatch_log_group.ec2_application.name
    rds_error      = aws_cloudwatch_log_group.rds_error.name
    rds_slowquery  = aws_cloudwatch_log_group.rds_slowquery.name
    alb_access     = aws_cloudwatch_log_group.alb_access.name
    security       = aws_cloudwatch_log_group.security_events.name
    vpc_flowlogs   = aws_cloudwatch_log_group.vpc_flow_logs.name
  }
  description = "CloudWatch log group names"
}
