variable "instance_ids" {
  description = "List of EC2 instance IDs to monitor"
  type        = list(string)
  default     = []
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "admin@domrov.com"
}

variable "rds_instance_identifier" {
  description = "RDS instance identifier for monitoring"
  type        = string
  default     = ""
}

variable "alb_target_group_name" {
  description = "ALB target group name for monitoring"
  type        = string
  default     = ""
}

variable "asg_name" {
  description = "Auto Scaling Group name for monitoring"
  type        = string
  default     = ""
}
