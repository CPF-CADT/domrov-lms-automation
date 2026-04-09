resource "aws_lb" "app_lb" {
  name               = "domrov-app-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Name = "domrov-app-lb"
  }
}

resource "aws_lb_target_group" "app_tg" {
  name                 = "domrov-app-tg"
  port                 = var.app_port
  protocol             = "HTTP"
  protocol_version     = "HTTP1"
  target_type          = "instance"
  vpc_id               = aws_vpc.my_vpc.id
  deregistration_delay = 30

  health_check {
    path                = "/health" # Changed from "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
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
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08" # Standard AWS policy
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }

  depends_on = [aws_acm_certificate_validation.api]
}
