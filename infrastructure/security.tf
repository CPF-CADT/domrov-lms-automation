resource "aws_security_group" "app_sg" {
  name        = "domrov-app-sg"
  description = "Allow SSH and App traffic"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    description = "SSH from your IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  ingress {
    description = "App traffic"
    from_port   = var.app_port
    to_port     = var.app_port
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
    Name = "domrov-app-sg"
  }
}

resource "aws_security_group" "lb_sg" {
  name        = "domrov-lb-sg"
  description = "Allow HTTP traffic to LB"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
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
