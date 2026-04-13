resource "aws_security_group" "app_sg" {
  name_prefix = "domrov-app-sg-"
  vpc_id      = aws_vpc.my_vpc.id

  ingress {
    description = "SSH from your IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr] # Change default to your IP
  }

  ingress {
    description     = "Application Port from ALB only"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id] # Only from ALB
  }

  ingress {
    description = "gRPC between instances"
    from_port   = 50051
    to_port     = 50051
    protocol    = "tcp"
    self        = true # Allow instances to talk to each other
  }

  ingress {
    description = "HTTPS for VPC Endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "domrov-app-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "lb_sg" {
  name        = "domrov-lb-sg"
  description = "Allow HTTP and HTTPS traffic to LB"
  vpc_id      = aws_vpc.my_vpc.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "domrov-lb-sg"
  }
}
