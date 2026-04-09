# Auto Scaling Policy
# NOTE: Only one target tracking policy allowed per metric per ASG
# Can be added back after ASG is created and stable
# To add scaling: Create policy via AWS Console or uncomment below when no conflicts exist

resource "aws_autoscaling_policy" "app_scaling" {
  name                      = "domrov-app-cpu-scaling"
  autoscaling_group_name    = aws_autoscaling_group.app_asg.name
  policy_type               = "TargetTrackingScaling"
  estimated_instance_warmup = 300 # 5 minutes instead of 90s

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 50.0 # Target 50% CPU - easier to trigger during demo
  }
}
