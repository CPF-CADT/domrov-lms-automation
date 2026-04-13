# 0. KMS Key for encrypting secrets
resource "aws_kms_key" "domrov" {
  description             = "KMS key for Domrov LMS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "domrov-kms-key"
  }
}

resource "aws_kms_alias" "domrov" {
  name          = "alias/domrov-lms"
  target_key_id = aws_kms_key.domrov.key_id
}

# 1. Generate a random password or read from local file
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "_%" # RDS doesn't allow / @ " or space
}

# 2. Local file to store the password (persistent storage)
resource "local_file" "db_password_file" {
  content  = random_password.db_password.result
  filename = "${path.module}/.db_password"

  # Ensure this file is created before anything else uses the password
  lifecycle {
    prevent_destroy = false
  }
}

# 3. Read the password from file (if it exists)
data "local_file" "db_password_read" {
  filename = "${path.module}/.db_password"

  depends_on = [local_file.db_password_file]
}

# 3b. Generate unique suffix for secret name (avoid deletion conflicts)
resource "random_id" "secret_suffix" {
  byte_length = 4
}

# 3c. RDS Parameter Group (Allow non-SSL connections)
resource "aws_db_parameter_group" "postgres" {
  name   = "domrov-postgres-params"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "0" # Allow non-SSL connections (safe in private VPC)
  }

  tags = {
    Name = "domrov-postgres-params"
  }
}

# 4. Store the password in AWS Secrets Manager with KMS encryption
resource "aws_secretsmanager_secret" "db_password_secret" {
  name        = "domrov-db-password-${random_id.secret_suffix.hex}"
  description = "RDS database password for domrov-db"
  kms_key_id  = aws_kms_key.domrov.id

  tags = {
    Name = "domrov-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password_secret_version" {
  secret_id     = aws_secretsmanager_secret.db_password_secret.id
  secret_string = data.local_file.db_password_read.content
}

# 3. DB Subnet Group
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "domrov-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "domrov-db-subnet-group"
  }
}

# 4. RDS Instance
resource "aws_db_instance" "default" {
  identifier             = "domrov-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp2"
  username               = "domrovadmin"
  password               = data.local_file.db_password_read.content
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name
  skip_final_snapshot    = true
  publicly_accessible    = false

  # High Availability
  multi_az = true

  # Backup Configuration (1 day for free tier)
  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  # Storage Encryption with KMS
  storage_encrypted = true
  kms_key_id        = aws_kms_key.domrov.arn

  # Enable CloudWatch Logs for database activity
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "domrov-database"
  }

  depends_on = [aws_db_parameter_group.postgres]
}

# 5. Database Security Group
resource "aws_security_group" "db_sg" {
  name_prefix = "domrov-db-sg-"
  vpc_id      = aws_vpc.my_vpc.id

  ingress {
    description     = "PostgreSQL from App SG"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "domrov-db-sg"
  }
}

# 6. Store Neon Database URL in SSM Parameter Store for EC2 to access (ENCRYPTED)
# resource "aws_ssm_parameter" "rds_endpoint" {
#   name      = "/domrov/backend/POSTGRES_URL"
#   type      = "SecureString" # Encrypted with KMS
#   value     = "postgresql://neondb_owner:npg_J6utYW9aZzsE@ep-frosty-lab-a1uo44ci-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
#   key_id    = aws_kms_key.domrov.id
#   overwrite = true
#
#   tags = {
#     Name = "domrov-postgres-url"
#   }
# }

# 7. Store RDS Hostname for reference
# resource "aws_ssm_parameter" "rds_hostname" {
#   name      = "/domrov/backend/POSTGRES_HOST"
#   type      = "String"
#   value     = aws_db_instance.default.address
#   overwrite = true
#
#   tags = {
#     Name = "domrov-rds-hostname"
#   }
#
#   depends_on = [aws_db_instance.default]
# }

# 8. Store RDS Port for reference
# resource "aws_ssm_parameter" "rds_port" {
#   name      = "/domrov/backend/POSTGRES_PORT"
#   type      = "String"
#   value     = "5432"
#   overwrite = true
#
#   tags = {
#     Name = "domrov-rds-port"
#   }
# }
