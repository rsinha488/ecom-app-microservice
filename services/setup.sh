#!/bin/bash

# Setup script for OAuth2-secured microservices
echo "================================================"
echo "  E-commerce Microservices Setup"
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

# Install dependencies for all services
echo -e "${YELLOW}Installing dependencies...${NC}"

services=("auth" "products" "categories" "users" "orders")

for service in "${services[@]}"; do
    echo -e "${YELLOW}Installing ${service} service dependencies...${NC}"
    cd "${service}" || exit
    npm install --silent
    cd ..
    echo -e "${GREEN}✓ ${service} dependencies installed${NC}"
done

echo ""
echo -e "${YELLOW}Seeding OAuth2 client...${NC}"
cd auth || exit
node utils/seedClient.js
cd ..
echo -e "${GREEN}✓ OAuth2 client seeded${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "================================================"
echo ""
echo "To start all services:"
echo ""
echo "  1. Auth Server (Port 3000):"
echo "     cd services/auth && npm run dev"
echo ""
echo "  2. Products Service (Port 3001):"
echo "     cd services/products && npm run dev"
echo ""
echo "  3. Categories Service (Port 3002):"
echo "     cd services/categories && npm run dev"
echo ""
echo "  4. Users Service (Port 3003):"
echo "     cd services/users && npm run dev"
echo ""
echo "  5. Orders Service (Port 3004):"
echo "     cd services/orders && npm run dev"
echo ""
echo "Or use the start-all.sh script to start all services at once."
echo ""
echo "Documentation:"
echo "  - Main README: services/README.md"
echo "  - Security Guide: services/OAUTH2_SECURITY_GUIDE.md"
echo ""
