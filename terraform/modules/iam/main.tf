data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_iam_role" "ec2_instance_role" {
  name_prefix = "domrov-ec2-role-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_ssm_policy" {
  name_prefix = "domrov-ec2-ssm-policy-"
  role        = aws_iam_role.ec2_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          for param_name in var.ssm_parameter_names :
          "arn:aws:ssm:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:parameter${param_name}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:parameter/domrov/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${data.aws_region.current.id}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_managed_policy" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ec2_cloudwatch_policy" {
  name_prefix = "domrov-ec2-cloudwatch-policy-"
  role        = aws_iam_role.ec2_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:log-group:/domrov/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeVolumes",
          "ec2:DescribeTags",
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceAttribute"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_policy" "secrets_manager_policy" {
  name        = "SecretsManagerReadAccess"
  description = "Allows read-only access to domrov secrets"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = "secretsmanager:GetSecretValue",
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:secret:/domrov/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_instance_secrets_manager_policy" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
}

resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name_prefix = "domrov-ec2-instance-profile-"
  role        = aws_iam_role.ec2_instance_role.name
}
