#!/bin/bash

# Start all microservices
echo "================================================"
echo "  Starting All Microservices"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if MongoDB is running
echo -e "${YELLOW}Checking MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${RED}MongoDB is not running. Please start MongoDB first.${NC}"
    echo "Run: mongod"
    exit 1
fi
echo -e "${GREEN}✓ MongoDB is running${NC}"
echo ""

# Function to start a service
start_service() {
    local service=$1
    local port=$2

    echo -e "${YELLOW}Starting ${service} service on port ${port}...${NC}"
    cd "${service}" || exit
    npm run dev > "../logs/${service}.log" 2>&1 &
    echo $! > "../logs/${service}.pid"
    cd ..
    echo -e "${GREEN}✓ ${service} service started (PID: $(cat logs/${service}.pid))${NC}"
}

# Create logs directory
mkdir -p logs

# Start all services
start_service "auth" "3000"
sleep 2
start_service "products" "3001"
sleep 1
start_service "categories" "3002"
sleep 1
start_service "users" "3003"
sleep 1
start_service "orders" "3004"

echo ""
echo "================================================"
echo -e "${GREEN}All services started!${NC}"
echo "================================================"
echo ""
echo "Service URLs:"
echo "  - Auth Server:    http://localhost:3000"
echo "  - Products:       http://localhost:3001"
echo "  - Categories:     http://localhost:3002"
echo "  - Users:          http://localhost:3003"
echo "  - Orders:         http://localhost:3004"
echo ""
echo "Health checks:"
echo "  curl http://localhost:3000/health"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3002/health"
echo "  curl http://localhost:3003/health"
echo "  curl http://localhost:3004/health"
echo ""
echo "Logs are stored in: services/logs/"
echo ""
echo "To stop all services, run: ./stop-all.sh"
echo ""
