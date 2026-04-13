# Auto Scaling Policy - Target Tracking (Primary)
# This uses the native target tracking scaling which is more responsive
resource "aws_autoscaling_policy" "app_scaling" {
  name                      = "domrov-app-cpu-scaling"
  autoscaling_group_name    = aws_autoscaling_group.app_asg.name
  policy_type               = "TargetTrackingScaling"
  estimated_instance_warmup = 30 # 30 seconds for fast response

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 50.0 # Scale when CPU >= 50%
  }
}

# Step Scaling Policy (Backup/Aggressive scaling)
# Triggers when CPU goes above 50%
resource "aws_autoscaling_policy" "scale_up_step" {
  name                      = "domrov-app-scale-up-step"
  adjustment_type           = "ChangeInCapacity"
  autoscaling_group_name    = aws_autoscaling_group.app_asg.name
  policy_type               = "StepScaling"
  estimated_instance_warmup = 30

  step_adjustment {
    metric_interval_lower_bound = 0
    scaling_adjustment          = 1 # Add 1 instance
  }
}

# CloudWatch Alarm to trigger step scaling at 50% CPU
resource "aws_cloudwatch_metric_alarm" "scale_up_alarm" {
  alarm_name          = "domrov-scale-up-50-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "Scale up when CPU > 50%"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app_asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up_step.arn]
}
