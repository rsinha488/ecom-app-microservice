#!/bin/bash

# API Gateway Stop Script
# This script stops the Nginx API Gateway

echo "🛑 Stopping API Gateway..."
echo "================================"

docker-compose down

if [ $? -eq 0 ]; then
    echo "✅ API Gateway stopped successfully"
else
    echo "❌ Failed to stop API Gateway"
    exit 1
fi

echo "================================"
