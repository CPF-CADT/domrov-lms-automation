resource "aws_kms_key" "domrov" {
  description             = "KMS key for Domrov"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "aws_kms_alias" "domrov" {
  name          = "alias/domrov-lms"
  target_key_id = aws_kms_key.domrov.key_id
}

resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "_%"
}

resource "local_file" "db_password_file" {
  content  = random_password.db_password.result
  filename = "${path.root}/.db_password"
}

data "local_file" "db_password_read" {
  filename   = "${path.root}/.db_password"
  depends_on = [local_file.db_password_file]
}

resource "random_id" "secret_suffix" {
  byte_length = 4
}

resource "aws_db_parameter_group" "postgres" {
  name   = "domrov-postgres-params"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "0"
  }
}

resource "aws_secretsmanager_secret" "db_password_secret" {
  name        = "domrov-db-password-${random_id.secret_suffix.hex}"
  description = "RDS database password for domrov-db"
  kms_key_id  = aws_kms_key.domrov.id
}

resource "aws_secretsmanager_secret_version" "db_password_secret_version" {
  secret_id     = aws_secretsmanager_secret.db_password_secret.id
  secret_string = data.local_file.db_password_read.content
}

resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "domrov-db-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "db" {
  name_prefix = "domrov-db-sg-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "default" {
  identifier                      = "domrov-db"
  engine                          = "postgres"
  engine_version                  = "16"
  instance_class                  = var.db_instance_class
  allocated_storage               = var.db_allocated_store
  storage_type                    = "gp2"
  db_name                         = var.db_name
  username                        = var.db_username
  password                        = data.local_file.db_password_read.content
  db_subnet_group_name            = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids          = [aws_security_group.db.id]
  parameter_group_name            = aws_db_parameter_group.postgres.name
  skip_final_snapshot             = true
  publicly_accessible             = false
  multi_az                        = var.db_multi_az
  backup_retention_period         = 1
  backup_window                   = "03:00-04:00"
  maintenance_window              = "mon:04:00-mon:05:00"
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.domrov.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]

  depends_on = [aws_db_parameter_group.postgres]
}
