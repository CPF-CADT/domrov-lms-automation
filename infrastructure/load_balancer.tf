resource "aws_lb" "app_lb" {
  name               = "domrov-app-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = data.aws_subnets.public.ids

  tags = {
    Name = "domrov-app-lb"
  }
}

resource "aws_lb_target_group" "app_tg" {
  name     = "domrov-app-tg"
  port     = var.app_port
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.selected.id

  health_check {
    path = "/"
  }

  tags = {
    Name = "domrov-app-tg"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
}
