#!/bin/bash
# Build and run Preview Service locally
# Usage: ./local-dev.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🏗️  Building Preview Service locally..."
echo ""

cd "$ROOT_DIR"

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Build images
echo "📦 Building Docker images..."
docker compose build

# Create network if it doesn't exist
docker network create preview-service_preview-network 2>/dev/null || true

# Start services
echo ""
echo "🚀 Starting services..."
docker compose up -d

# Wait for gateway to be ready
echo ""
echo "⏳ Waiting for gateway to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Check health
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo ""
    echo "✅ Preview Service is running!"
    echo ""
    echo "📍 Gateway API: http://localhost:3001"
    echo "📍 Health:      http://localhost:3001/health"
    echo "📍 API Docs:    POST http://localhost:3001/api/preview/start"
    echo ""
    echo "📝 View logs:   docker compose logs -f"
    echo "🛑 Stop:        docker compose down"
else
    echo ""
    echo "❌ Gateway failed to start. Check logs:"
    docker compose logs gateway
    exit 1
fi
