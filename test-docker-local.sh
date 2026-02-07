#!/bin/bash

# ShopFlow API - Local Docker Test Script
# This script tests the Docker setup locally before pushing to production

set -e  # Exit on error

echo "🚀 Starting ShopFlow API Docker Test"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "apps/api/.env" ]; then
    echo -e "${RED}❌ Error: apps/api/.env file not found${NC}"
    echo "Creating sample .env file..."
    cat > apps/api/.env << EOF
DATABASE_URL=postgresql://shopflow:password@host.docker.internal:5432/shopflow
CLERK_SECRET_KEY=your_clerk_secret_key
NODE_ENV=development
PORT=4001
EOF
    echo -e "${YELLOW}⚠️  Please update apps/api/.env with your actual values${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env file found"

# Stop any existing containers
echo ""
echo "🛑 Stopping existing containers..."
cd apps/api
docker-compose down || true

# Build the Docker image
echo ""
echo "🔨 Building Docker image..."
cd ../..
docker build -f apps/api/Dockerfile -t shopflow-api:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Docker image built successfully"
else
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    exit 1
fi

# Start the container
echo ""
echo "🚀 Starting container..."
cd apps/api
docker-compose up -d

# Wait for container to be ready
echo ""
echo "⏳ Waiting for API to be ready (max 60 seconds)..."
SECONDS=0
MAX_WAIT=60

until curl -sf http://localhost:4001/health > /dev/null; do
    if [ $SECONDS -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ API failed to start within ${MAX_WAIT} seconds${NC}"
        echo ""
        echo "Container logs:"
        docker-compose logs --tail=50
        exit 1
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${GREEN}✓${NC} API is ready!"

# Run health checks
echo ""
echo "🏥 Running health checks..."

echo -n "Testing /health endpoint... "
if curl -sf http://localhost:4001/health > /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Testing / endpoint... "
if curl -sf http://localhost:4001/ > /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Show container info
echo ""
echo "📊 Container Information:"
echo "========================"
docker-compose ps

# Show recent logs
echo ""
echo "📋 Recent logs (last 20 lines):"
echo "==============================="
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "🎉 Your API is running at: http://localhost:4001"
echo "🏥 Health check: http://localhost:4001/health"
echo ""
echo "Useful commands:"
echo "  View logs:        cd apps/api && docker-compose logs -f"
echo "  Stop container:   cd apps/api && docker-compose down"
echo "  Restart:          cd apps/api && docker-compose restart"
echo "  Shell access:     docker exec -it shopflow-api sh"
echo ""
