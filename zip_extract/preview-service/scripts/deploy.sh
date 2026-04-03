#!/bin/bash
# Deploy Preview Service to AWS ECS
# Usage: ./deploy.sh [environment]

set -euo pipefail

ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploying Preview Service to ${ENVIRONMENT}"
echo "   Region: ${AWS_REGION}"
echo ""

# Get ECR repository URLs from Terraform output
cd "${ROOT_DIR}/infrastructure"

GATEWAY_ECR_URL=$(terraform output -raw gateway_ecr_url 2>/dev/null || echo "")
WORKER_ECR_URL=$(terraform output -raw worker_ecr_url 2>/dev/null || echo "")
CLUSTER_NAME=$(terraform output -raw cluster_name 2>/dev/null || echo "")
SERVICE_NAME=$(terraform output -raw gateway_service_name 2>/dev/null || echo "")

if [ -z "$GATEWAY_ECR_URL" ]; then
    echo "❌ Error: Could not get ECR URLs. Run 'terraform apply' first."
    exit 1
fi

echo "📦 Building Docker images..."

# Login to ECR
aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${GATEWAY_ECR_URL%%/*}"

# Build and push Gateway
echo "   Building gateway..."
cd "${ROOT_DIR}/gateway"
docker build -t unison-preview-gateway:latest .
docker tag unison-preview-gateway:latest "${GATEWAY_ECR_URL}:latest"
docker push "${GATEWAY_ECR_URL}:latest"
echo "   ✅ Gateway pushed"

# Build and push Worker
echo "   Building worker..."
cd "${ROOT_DIR}"
docker build -f Dockerfile -t unison-preview-worker:latest ./worker
docker tag unison-preview-worker:latest "${WORKER_ECR_URL}:latest"
docker push "${WORKER_ECR_URL}:latest"
echo "   ✅ Worker pushed"

# Force new deployment
echo ""
echo "🔄 Updating ECS service..."
aws ecs update-service \
    --cluster "${CLUSTER_NAME}" \
    --service "${SERVICE_NAME}" \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    > /dev/null

echo "   Waiting for deployment..."
aws ecs wait services-stable \
    --cluster "${CLUSTER_NAME}" \
    --services "${SERVICE_NAME}" \
    --region "${AWS_REGION}"

echo ""
echo "✅ Deployment complete!"
echo ""

# Show service URL
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
if [ -n "$ALB_DNS" ]; then
    echo "📍 Service URL: https://${ALB_DNS}"
fi
