
resource "aws_iam_policy" "secrets_manager_policy" {
  name        = "SecretsManagerReadAccess"
  description = "Allows read-only access to specific secrets in AWS Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = "secretsmanager:GetSecretValue",
        Resource = "arn:aws:secretsmanager:ap-southeast-1:458889634459:secret:/domrov/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_instance_secrets_manager_policy" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
}
