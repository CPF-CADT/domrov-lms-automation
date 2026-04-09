
resource "aws_launch_template" "app_launch_template" {
  name_prefix   = "domrov-app-"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2_instance_profile.arn
  }

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # Enhanced user data with better error handling and logging
  user_data = base64encode(file("${path.module}/user_data.sh"))

  # Block device mapping for additional storage if needed
  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # Metadata options for enhanced security
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


