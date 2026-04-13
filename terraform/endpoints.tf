resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.ssm"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}

resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.ssmmessages"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}

resource "aws_vpc_endpoint" "ec2" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.ec2"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}

resource "aws_vpc_endpoint" "ec2messages" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.ec2messages"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}

# CloudWatch Monitoring Endpoint (for metrics)
resource "aws_vpc_endpoint" "monitoring" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.monitoring"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}

# CloudWatch Logs Endpoint (for application logs)
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.my_vpc.id
  service_name        = "com.amazonaws.ap-southeast-1.logs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.app_sg.id
  ]
}
