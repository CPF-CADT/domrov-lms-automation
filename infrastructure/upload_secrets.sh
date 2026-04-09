#!/bin/bash

# The path to your .env file
ENV_FILE=".env"

# The prefix for all your SSM parameter names
PARAM_PREFIX="/domrov/backend"

# Check if the .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Read the .env file line by line
while IFS='=' read -r key value || [[ -n "$key" ]]; do
  # Skip empty lines or comments
  if [[ -z "$key" ]] || [[ "$key" == \#* ]]; then
    continue
  fi

  # Construct the full parameter name
  PARAM_NAME="${PARAM_PREFIX}/${key}"

  echo "Uploading ${PARAM_NAME}..."

  # Use the AWS CLI to create/update the parameter
  aws ssm put-parameter \
    --name "$PARAM_NAME" \
    --value "$value" \
    --type "SecureString" \
    --overwrite \
    --region "ap-southeast-1" # Make sure to use your desired region

  if [ $? -eq 0 ]; then
    echo "Successfully uploaded ${PARAM_NAME}"
  else
    echo "Error uploading ${PARAM_NAME}"
  fi

done < "$ENV_FILE"

echo "All secrets have been processed."