resource "aws_autoscaling_group" "app_asg" {
  name                      = "domrov-app-asg"
  desired_capacity          = 1
  max_size                  = 3
  min_size                  = 1
  vpc_zone_identifier       = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  target_group_arns         = [aws_lb_target_group.app_tg.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app_launch_template.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "domrov-app-instance"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_lifecycle_hook" "instance_launching" {
  name                   = "instance-launching-hook"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  default_result         = "CONTINUE"
  heartbeat_timeout      = 300
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_LAUNCHING"
}
