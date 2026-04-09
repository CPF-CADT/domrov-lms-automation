resource "aws_ecs_cluster" "main" {
  name = "domrov-cluster"

  tags = {
    Name = "domrov-cluster"
  }
}

resource "aws_ecs_task_definition" "app" {
  family             = "domrov-app"
  network_mode       = "bridge"
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "domrov-app"
      image     = var.app_image
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = 0 # Let Docker assign a dynamic port
        }
      ]
    }
  ])

  tags = {
    Name = "domrov-app-task"
  }
}

resource "aws_ecs_service" "main" {
  name            = "domrov-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.app_tg.arn
    container_name   = "domrov-app"
    container_port   = var.app_port
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "domrov-service"
  }
}
