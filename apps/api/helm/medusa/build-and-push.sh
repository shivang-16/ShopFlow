#!/bin/bash

# Build and push Medusa Docker image
# Usage: ./build-and-push.sh [registry] [tag]

set -e

REGISTRY=${1:-"ghcr.io/shivang-16/shopflow-medusa"}
TAG=${2:-"latest"}
IMAGE_NAME="${REGISTRY}:${TAG}"

echo "🔨 Building Medusa Docker image..."
docker build -t "${IMAGE_NAME}" -f Dockerfile .

echo "📤 Pushing image to registry..."
docker push "${IMAGE_NAME}"

echo "✅ Image built and pushed successfully: ${IMAGE_NAME}"
echo ""
echo "Note: This image will be automatically built by GitHub Actions on push to main"
