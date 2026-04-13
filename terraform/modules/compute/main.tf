resource "aws_launch_template" "app" {
  name_prefix   = "domrov-app-"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  iam_instance_profile {
    arn = var.instance_profile_arn
  }

  monitoring {
    enabled = true
  }

  vpc_security_group_ids = [var.app_security_group]

  user_data = base64encode(file(var.user_data_path))

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "optional"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "domrov-app-instance"
      Environment = var.environment
      Project     = "domrov"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name        = "domrov-app-volume"
      Environment = var.environment
      Project     = "domrov"
    }
  }
}
