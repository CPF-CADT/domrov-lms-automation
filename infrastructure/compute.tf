resource "aws_launch_template" "domrov_app" {
  name_prefix   = "domrov-app-"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.app_sg.id]
  }

  user_data = base64encode(<<-EOF
#!/bin/bash
# Update & install Docker
apt-get update -y
apt-get install -y docker.io curl unzip jq
systemctl start docker
systemctl enable docker

# Install Docker Compose CLI plugin (v2)
mkdir -p /usr/local/lib/docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Add 2GB swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Set timezone
timedatectl set-timezone Asia/Phnom_Penh

# Pull all env variables from SSM
ENV_FILE=/home/ubuntu/.env
> $$ENV_FILE

for PARAM in ${join(" ", var.ssm_parameter_names)}; do
  KEY=$(basename $PARAM)
  VALUE=$(aws ssm get-parameter --name "$PARAM" --with-decryption --query Parameter.Value --output text)
  echo "$KEY=$VALUE" >> $ENV_FILE
done

# Add NODE_ENV and TZ
echo "NODE_ENV=production" >> $ENV_FILE
echo "TZ=Asia/Phnom_Penh" >> $ENV_FILE

# Create docker-compose.yml
cat > /home/ubuntu/docker-compose.yml << 'EOL'
version: "3.9"

services:
  backend:
    image: phyvathanak/nestjs-backend:latest
    container_name: domrov_backend
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env

  code_eval:
    image: phyvathanak/code_eval:latest
    container_name: domrov_code_eval
    restart: always
    env_file:
      - .env

networks:
  default:
    name: domrov_network
EOL

# Start Docker Compose
cd /home/ubuntu
docker compose --env-file .env -f docker-compose.yml up -d
EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "Domrov-App"
    }
  }
}

resource "aws_instance" "domrov_app_instance" {
  launch_template {
    id      = aws_launch_template.domrov_app.id
    version = aws_launch_template.domrov_app.latest_version
  }

  tags = {
    Name = "Domrov-App-Instance"
  }
}
