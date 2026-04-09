# Auto Scaling Policy
# NOTE: Only one target tracking policy allowed per metric per ASG
# Can be added back after ASG is created and stable
# To add scaling: Create policy via AWS Console or uncomment below when no conflicts exist

resource "aws_autoscaling_policy" "app_scaling" {
  name                      = "domrov-app-cpu-scaling"
  autoscaling_group_name    = aws_autoscaling_group.app_asg.name
  policy_type               = "TargetTrackingScaling"
  estimated_instance_warmup = 60

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0 # Target 70% CPU utilization
  }
}
