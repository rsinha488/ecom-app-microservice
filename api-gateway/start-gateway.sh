#!/bin/bash

# API Gateway Startup Script
# This script starts the Nginx API Gateway using Docker Compose

echo "🚀 Starting API Gateway..."
echo "================================"

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

# Stop existing gateway if running
echo "📦 Stopping existing gateway (if any)..."
docker-compose down 2>/dev/null

# Start the API Gateway
echo "🔧 Starting Nginx API Gateway on port 8080..."
docker-compose up -d

# Wait for gateway to be ready
echo "⏳ Waiting for gateway to be ready..."
sleep 3

# Check if gateway is healthy
if curl -s http://localhost:8080/health > /dev/null; then
    echo ""
    echo "✅ API Gateway is running successfully!"
    echo "================================"
    echo "Gateway URL: http://localhost:8080"
    echo "Health Check: http://localhost:8080/health"
    echo ""
    echo "API Routes:"
    echo "  - Auth:       http://localhost:8080/api/v1/auth"
    echo "  - Products:   http://localhost:8080/api/v1/products"
    echo "  - Categories: http://localhost:8080/api/v1/categories"
    echo "  - Users:      http://localhost:8080/api/v1/users"
    echo "  - Orders:     http://localhost:8080/api/v1/orders"
    echo ""
    echo "To view logs: docker logs -f api-gateway"
    echo "To stop gateway: ./stop-gateway.sh"
else
    echo ""
    echo "⚠️  Gateway started but health check failed"
    echo "Check logs with: docker logs api-gateway"
fi

echo "================================"
