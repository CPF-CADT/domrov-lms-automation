resource "aws_iam_user" "admin_user" {
  name = "admin@satpanha"
}

resource "aws_iam_user_policy_attachment" "admin_user_policies" {
  for_each = toset([
    "AmazonEC2FullAccess",
    "AmazonRDSFullAccess",
    "AmazonS3FullAccess",
    "AmazonVPCFullAccess",
    "AutoScalingFullAccess",
    "ElasticLoadBalancingFullAccess",
    "IAMFullAccess",
    "IAMUserChangePassword"
  ])

  user       = aws_iam_user.admin_user.name
  policy_arn = "arn:aws:iam::aws:policy/${each.value}"
}

resource "aws_iam_user" "admin_hengchunn" {
  name = "admin@hengchunn"
}

resource "aws_iam_user_policy_attachment" "admin_hengchunn_policies" {
  for_each = toset([
    "AmazonSNSFullAccess",
    "CloudWatchFullAccess",
    "CloudWatchFullAccessV2",
    "IAMUserChangePassword"
  ])

  user       = aws_iam_user.admin_hengchunn.name
  policy_arn = "arn:aws:iam::aws:policy/${each.value}"
}

resource "aws_iam_user" "admin_japanese_panha" {
  name = "admin@japanesePanha"
}

resource "aws_iam_user_policy_attachment" "admin_japanese_panha_policies" {
  for_each = toset([
    "AmazonDynamoDBFullAccess",
    "AmazonEC2FullAccess",
    "AmazonS3FullAccess",
    "AmazonVPCFullAccess",
    "IAMUserChangePassword"
  ])

  user       = aws_iam_user.admin_japanese_panha.name
  policy_arn = "arn:aws:iam::aws:policy/${each.value}"
}

resource "aws_iam_user" "admin_vathanak" {
  name = "admin@vathanak"
}

resource "aws_iam_user_policy_attachment" "admin_vathanak_policies" {
  for_each = toset([
    "AdministratorAccess",
    "AmazonEC2FullAccess",
    "AutoScalingFullAccess",
    "ElasticLoadBalancingFullAccess",
    "IAMUserChangePassword"
  ])

  user       = aws_iam_user.admin_vathanak.name
  policy_arn = "arn:aws:iam::aws:policy/${each.value}"
}