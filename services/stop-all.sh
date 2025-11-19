#!/bin/bash

# Stop all microservices
echo "================================================"
echo "  Stopping All Microservices"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop a service
stop_service() {
    local service=$1

    if [ -f "logs/${service}.pid" ]; then
        local pid=$(cat "logs/${service}.pid")
        echo -e "${YELLOW}Stopping ${service} service (PID: ${pid})...${NC}"
        kill "${pid}" 2>/dev/null
        rm "logs/${service}.pid"
        echo -e "${GREEN}✓ ${service} service stopped${NC}"
    else
        echo -e "${YELLOW}${service} service is not running${NC}"
    fi
}

# Stop all services
services=("auth" "products" "categories" "users" "orders")

for service in "${services[@]}"; do
    stop_service "${service}"
done

echo ""
echo "================================================"
echo -e "${GREEN}All services stopped!${NC}"
echo "================================================"
echo ""
