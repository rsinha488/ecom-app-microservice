#!/bin/bash

###############################################################################
# MongoDB Atlas Sharding Setup Script
#
# This script enables sharding for the e-commerce microservices platform.
#
# Prerequisites:
# 1. MongoDB Atlas cluster with sharding enabled (M30+ tier required)
# 2. mongosh installed locally
# 3. Connection string with admin privileges
#
# Usage:
#   ./enable-sharding.sh <connection-string>
#
# Example:
#   ./enable-sharding.sh "mongodb+srv://admin:pass@cluster.mongodb.net/"
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if connection string provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: MongoDB connection string required${NC}"
    echo "Usage: ./enable-sharding.sh <connection-string>"
    exit 1
fi

MONGO_URI="$1"

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  MongoDB Atlas Sharding Configuration Script             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute MongoDB command
execute_mongo_cmd() {
    local db=$1
    local cmd=$2
    echo -e "${YELLOW}Executing: ${cmd}${NC}"
    mongosh "$MONGO_URI$db" --quiet --eval "$cmd"
}

# Function to enable sharding for a database
enable_db_sharding() {
    local db=$1
    echo -e "\n${GREEN}Enabling sharding for database: ${db}${NC}"
    execute_mongo_cmd "admin" "sh.enableSharding('$db')"
}

# Function to create shard collection
shard_collection() {
    local db=$1
    local collection=$2
    local shard_key=$3
    echo -e "\n${GREEN}Sharding collection: ${db}.${collection}${NC}"
    execute_mongo_cmd "admin" "sh.shardCollection('${db}.${collection}', ${shard_key})"
}

echo -e "${YELLOW}Step 1: Checking connection to MongoDB Atlas...${NC}"
if ! mongosh "$MONGO_URI" --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${RED}Failed to connect to MongoDB Atlas. Check your connection string.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connected successfully${NC}"

echo -e "\n${YELLOW}Step 2: Verifying sharding is enabled on cluster...${NC}"
SHARD_STATUS=$(mongosh "$MONGO_URI" --quiet --eval "sh.status()" 2>&1 || echo "error")
if [[ "$SHARD_STATUS" == *"error"* ]] || [[ "$SHARD_STATUS" == *"not running with --shardsvr"* ]]; then
    echo -e "${RED}Error: Sharding is not enabled on this cluster.${NC}"
    echo -e "${YELLOW}Please upgrade to M30+ tier and enable sharding in Atlas UI.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Sharding is enabled${NC}"

echo -e "\n${YELLOW}Step 3: Creating indexes before sharding...${NC}"

# Products Database
echo -e "\n${GREEN}=== Products Database ===${NC}"
execute_mongo_cmd "products_db" "db.products.createIndex({ _id: 'hashed' })"

# Orders Database
echo -e "\n${GREEN}=== Orders Database ===${NC}"
execute_mongo_cmd "orders_db" "db.orders.createIndex({ userId: 1, createdAt: 1 })"
execute_mongo_cmd "orders_db" "db.orders.createIndex({ orderNumber: 1 }, { unique: true })"

# Users Database
echo -e "\n${GREEN}=== Users Database ===${NC}"
execute_mongo_cmd "users_db" "db.users.createIndex({ _id: 'hashed' })"
execute_mongo_cmd "users_db" "db.users.createIndex({ email: 1 }, { unique: true })"

# Auth Database
echo -e "\n${GREEN}=== Auth Database ===${NC}"
execute_mongo_cmd "auth_db" "db.users.createIndex({ _id: 'hashed' })"
execute_mongo_cmd "auth_db" "db.users.createIndex({ email: 1 }, { unique: true })"
execute_mongo_cmd "auth_db" "db.authorizationcodes.createIndex({ code: 'hashed' })"
execute_mongo_cmd "auth_db" "db.authorizationcodes.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })"
execute_mongo_cmd "auth_db" "db.refreshtokens.createIndex({ token: 'hashed' })"
execute_mongo_cmd "auth_db" "db.refreshtokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })"

echo -e "${GREEN}✓ All indexes created${NC}"

echo -e "\n${YELLOW}Step 4: Enabling sharding on databases...${NC}"

enable_db_sharding "products_db"
enable_db_sharding "orders_db"
enable_db_sharding "users_db"
enable_db_sharding "auth_db"

echo -e "${GREEN}✓ Sharding enabled on all databases${NC}"

echo -e "\n${YELLOW}Step 5: Sharding collections...${NC}"

# Products
shard_collection "products_db" "products" "{ _id: 'hashed' }"

# Orders (using compound shard key)
shard_collection "orders_db" "orders" "{ userId: 1, createdAt: 1 }"

# Users
shard_collection "users_db" "users" "{ _id: 'hashed' }"

# Auth collections
shard_collection "auth_db" "users" "{ _id: 'hashed' }"
shard_collection "auth_db" "authorizationcodes" "{ code: 'hashed' }"
shard_collection "auth_db" "refreshtokens" "{ token: 'hashed' }"

echo -e "${GREEN}✓ All collections sharded${NC}"

echo -e "\n${YELLOW}Step 6: Verifying shard configuration...${NC}"
execute_mongo_cmd "admin" "sh.status()" | head -n 50

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Sharding Configuration Complete!                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Monitor chunk distribution: sh.status()"
echo "2. Check collection distribution: db.collection.getShardDistribution()"
echo "3. Monitor balancer: sh.getBalancerState()"
echo "4. Review metrics in MongoDB Atlas UI"
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "- Categories database is NOT sharded (low volume)"
echo "- OAuth2 clients collection is NOT sharded (very low volume)"
echo "- Monitor for hotspots and uneven chunk distribution"
echo "- Chunk migrations may take time for large collections"
echo ""
