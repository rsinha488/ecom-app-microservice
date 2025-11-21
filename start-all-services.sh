#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  LaunchpadMERN - Starting All Microservices${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Kill existing processes
echo -e "${YELLOW}Stopping existing services...${NC}"
pkill -f "nodemon" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 3

# Base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start services in background
echo -e "${GREEN}Starting Auth Service (Port 3000)...${NC}"
cd "$BASE_DIR/services/auth" && npm run dev > /tmp/auth.log 2>&1 &
sleep 2

echo -e "${GREEN}Starting Products Service (Port 3001)...${NC}"
cd "$BASE_DIR/services/products" && npm run dev > /tmp/products.log 2>&1 &
sleep 2

echo -e "${GREEN}Starting Categories Service (Port 3002)...${NC}"
cd "$BASE_DIR/services/categories" && npm run dev > /tmp/categories.log 2>&1 &
sleep 2

echo -e "${GREEN}Starting Users Service (Port 3003)...${NC}"
cd "$BASE_DIR/services/users" && npm run dev > /tmp/users.log 2>&1 &
sleep 2

echo -e "${GREEN}Starting Orders Service (Port 3004)...${NC}"
cd "$BASE_DIR/services/orders" && npm run dev > /tmp/orders.log 2>&1 &
sleep 2

echo -e "${GREEN}Starting Frontend (Port 3006)...${NC}"
cd "$BASE_DIR/frontend" && npm run dev > /tmp/frontend.log 2>&1 &

echo ""
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 8

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Service Status Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Function to check if port is listening
check_port() {
    local port=$1
    local name=$2
    local url=$3

    if lsof -i :$port | grep LISTEN > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name${NC} - $url"
        return 0
    else
        echo -e "${RED}❌ $name${NC} - Failed to start (check /tmp/${name,,}.log)"
        return 1
    fi
}

# Check all services
check_port 3000 "Auth Service      " "http://localhost:3000"
check_port 3001 "Products Service  " "http://localhost:3001"
check_port 3002 "Categories Service" "http://localhost:3002"
check_port 3003 "Users Service     " "http://localhost:3003"
check_port 3004 "Orders Service    " "http://localhost:3004"
check_port 3006 "Frontend          " "http://localhost:3006"

echo ""

# Check API Gateway
if lsof -i :8080 | grep LISTEN > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway${NC} - http://localhost:8080"
else
    echo -e "${YELLOW}⚠️  API Gateway${NC} - Not running"
    echo -e "   ${YELLOW}Start it with: cd api-gateway && ./start-gateway.sh${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Useful Commands${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  tail -f /tmp/auth.log"
echo "  tail -f /tmp/orders.log"
echo "  tail -f /tmp/frontend.log"
echo ""
echo -e "${YELLOW}Stop all services:${NC}"
echo "  pkill -f nodemon"
echo "  pkill -f 'next dev'"
echo ""
echo -e "${YELLOW}Check health:${NC}"
echo "  curl http://localhost:8080/health"
echo "  curl http://localhost:3004/health"
echo ""
echo -e "${GREEN}All services started! Access the app at http://localhost:3006${NC}"
echo ""
