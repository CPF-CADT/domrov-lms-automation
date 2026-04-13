#!/bin/bash

# 1. Logging and Safety
exec > >(tee /var/log/manual-test.log) 2>&1
echo "=== Start Manual Test Deployment: $(date) ==="

export DEBIAN_FRONTEND=noninteractive
export AWS_DEFAULT_REGION=ap-southeast-1

# 2. Wait for system locks (Ensures apt is ready)
echo "Checking for apt locks..."
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  echo "Waiting for other apt processes to finish..."
  sleep 5
done

# 3. Install Docker & Dependencies
echo "Installing Dependencies..."
apt-get update -y
apt-get install -y docker.io jq curl unzip -y

# 4. Install AWS CLI v2 (The reliable way)
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI v2..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install --update
    rm -rf awscliv2.zip ./aws
fi

# Refresh path
export PATH=$PATH:/usr/local/bin

systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

# 4.5 Install CloudWatch Agent for application logging
echo "Installing CloudWatch Agent..."
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

# Create CloudWatch Agent configuration (logs only)
# EC2 detailed monitoring (enabled in compute.tf) provides native CPU/disk metrics
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/docker/*.log",
            "log_group_name": "/domrov/app",
            "log_stream_name": "docker-{instance_id}",
            "retention_in_days": 7
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/domrov/app",
            "log_stream_name": "syslog-{instance_id}",
            "retention_in_days": 7
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json \
    -s

echo "CloudWatch Agent started"
rm ./amazon-cloudwatch-agent.deb

# 5. Fetch SSM Secrets
echo "Fetching secrets from SSM prefix /domrov/backend..."
ENV_FILE="/root/.env"  # ✅ FIXED: Absolute path

# This one-liner pulls everything and formats it to KEY=VALUE
aws ssm get-parameters-by-path \
  --path /domrov/backend \
  --recursive \
  --with-decryption \
  --region ap-southeast-1 \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output json | \
  jq -r '.[] | "\(.Name | split("/") | .[-1])=\(.Value)"' > "$ENV_FILE"

# Verify file was created
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Failed to create .env file"
    exit 1
fi

chmod 600 "$ENV_FILE"
echo ".env file created with $(wc -l < "$ENV_FILE") variables"

# 6. Hardcoded Image Variables
APP_IMAGE="phyvathanak/nestjs-backend:latest"
CODE_EVAL_IMAGE="phyvathanak/code_eval:latest"
APP_PORT="3000"

# 7. Create Network and Run
docker network create domrov-network || true

echo "Starting domrov-code-eval..."
docker pull $CODE_EVAL_IMAGE
docker run -d \
  --name domrov-code-eval \
  --network domrov-network \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  $CODE_EVAL_IMAGE

# Wait for code-eval to be ready
sleep 5

echo "Starting domrov-app..."
docker pull $APP_IMAGE
docker run -d \
  --name domrov-app \
  --network domrov-network \
  --restart unless-stopped \
  -p ${APP_PORT}:${APP_PORT} \
  --env-file "$ENV_FILE" \
  -e CODE_EVAL_GRPC_CLIENT_HOST=domrov-code-eval \
  -e CODE_EVAL_GRPC_CLIENT_PORT=50051 \
  $APP_IMAGE

# Wait for containers to start
sleep 10

echo "=== Final Status ==="
docker ps
docker logs domrov-code-eval --tail 20
docker logs domrov-app --tail 20
echo "=== Manual Test Complete: $(date) ==="
