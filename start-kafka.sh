#!/bin/bash

# Kafka Startup Script for LaunchpadMERN
# This script starts Kafka infrastructure for order-inventory management

set -e

echo "🚀 Starting Kafka Infrastructure..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "${YELLOW}📦 Starting Kafka, Zookeeper, and Kafka UI...${NC}"
docker-compose -f docker-compose.kafka.yml up -d

echo ""
echo "${GREEN}✅ Waiting for Kafka to be ready...${NC}"
sleep 10

# Check if Kafka is healthy
if docker ps | grep -q "kafka"; then
    echo "${GREEN}✅ Kafka is running!${NC}"
else
    echo "❌ Kafka failed to start. Check logs with:"
    echo "   docker-compose -f docker-compose.kafka.yml logs kafka"
    exit 1
fi

echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}✅ Kafka Infrastructure Started Successfully!${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📍 Services:"
echo "   • Kafka:     localhost:9092"
echo "   • Zookeeper: localhost:2181"
echo "   • Kafka UI:  http://localhost:8080"
echo ""
echo "📝 Next steps:"
echo "   1. Start Orders service:   cd services/orders && npm run dev"
echo "   2. Start Products service: cd services/products && npm run dev"
echo ""
echo "📖 Full documentation: ./KAFKA_IMPLEMENTATION_GUIDE.md"
echo ""
echo "🛑 To stop Kafka:"
echo "   docker-compose -f docker-compose.kafka.yml down"
echo ""
