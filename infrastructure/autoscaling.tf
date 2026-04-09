resource "aws_autoscaling_group" "app_asg" {
  name                      = "domrov-app-asg"
  desired_capacity          = 1
  max_size                  = 4
  min_size                  = 1
  vpc_zone_identifier       = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  target_group_arns         = [aws_lb_target_group.app_tg.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 600

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
