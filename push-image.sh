#!/bin/bash
###
# PUSH IMAGE
#
# Pushes an image into AWS ECR, creating the required repo if it does not already exist.
#
# Author: d221155 @ NCA
###

# Exit this script if any executed commands return a non-zero status
set -e

# Name of the Container image and ECR repository
IMAGE_NAME='kibana/kibana'

# Elastic stack version
STACK_VERSION='8.19.12'

# Image version suffix to identify the custom build
IMAGE_VERSION_SUFFIX='_custom'

usage='Usage: push-image.sh.  Note, a valid AWS profile must be configured with a default region'

# Based on the current profile, get Account ID and region
account_id=$(aws sts get-caller-identity --query 'Account' --output text)
region=$(aws configure get region)

# Validate an AWS Account ID has been returned
if [ -z ${account_id+x} ]; then
  echo '!!! Error: Account ID was not found'
  echo "$usage"
  echo
  exit 1
else
  echo "Account ID: ${account_id}"
fi

# Validate an AWS Region is configured
if [ -z ${region// } ]; then
  echo '!!! Error: Region was not found.  Please configure a region, e.g. aws configure set region eu-west-2'
  echo "$usage"
  echo
  exit 1
else
  echo "Region: ${region}"
fi

echo '... Checking if Docker is installed and running'
if ! docker info > /dev/null 2>&1; then
  echo '!!! Error: Could not find the docker command or the Docker daemon is not running'
  exit 1
fi

# Authenticate to ECR
echo '1. Generating ECR Creds'
aws ecr get-login-password --region "${region}" | docker login --username AWS --password-stdin "${account_id}.dkr.ecr.${region}.amazonaws.com" > /dev/null

# Create ECR Repository (if required)
echo '2. Checking ECR Repository exists'
if ! aws ecr describe-repositories --repository-names "${IMAGE_NAME}" > /dev/null; then
  echo '... Creating ECR Repository'
  aws ecr create-repository --repository-name "${IMAGE_NAME}" --image-scanning-configuration scanOnPush=true
fi

# Tag and push image to ECR
echo '3. Tagging and pushing image to ECR'
destination_image="${account_id}.dkr.ecr.${region}.amazonaws.com/${IMAGE_NAME}:${STACK_VERSION}${IMAGE_VERSION_SUFFIX}"
docker tag "${IMAGE_NAME}:${STACK_VERSION}${IMAGE_VERSION_SUFFIX}" "$destination_image"
docker push "$destination_image" > /dev/null
echo "$destination_image"
