# Service Port Configuration

**Date:** 2025-11-21
**Issue:** Port conflict between users and orders services

---

## Port Assignments

| Service    | Port | Status |
|------------|------|--------|
| Auth       | 3000 | ✅ Correct |
| Products   | 3001 | ✅ Correct |
| Categories | 3002 | ✅ Correct |
| Users      | 3003 | ✅ **FIXED** (was 3004) |
| Orders     | 3004 | ✅ Correct |
| Frontend   | 3006 | ✅ Correct |
| API Gateway| 8080 | ✅ Correct |

---

## Issues Fixed

### 1. Port Conflict (CRITICAL)

**Problem:**
- Both `users` and `orders` services were configured to use PORT 3004
- Users service was running and blocking the orders service
- Requests to `/api/v1/orders/*` were going to users service → 404 errors

**Fix:**
- Changed users service port from 3004 to 3003
- File: `/services/users/.env.local`
- API Gateway already configured correctly (port 3003)

### 2. Express Route Ordering (CRITICAL)

**Problem:**
- In orders service routes, `/:id` was matching before `/user/:userId`
- Express matches routes in order, and "user" looked like an ID
- Requests to `/api/v1/orders/user/691d6d01da39b318e42f4c21` were hitting `/:id` handler

**Fix:**
- Reordered routes in `/services/orders/routes/v1/orderRoutes.js`
- Moved `/user/:userId` route BEFORE `/:id` route
- Added comment explaining the importance of route order

---

## How to Restart Services

### Option 1: Kill All and Restart Individual Services

```bash
# 1. Kill all duplicate node processes
pkill -f "nodemon"

# 2. Start each service in separate terminals

# Terminal 1: Auth Service
cd services/auth && npm run dev

# Terminal 2: Products Service
cd services/products && npm run dev

# Terminal 3: Categories Service
cd services/categories && npm run dev

# Terminal 4: Users Service (NEW PORT 3003)
cd services/users && npm run dev

# Terminal 5: Orders Service (PORT 3004)
cd services/orders && npm run dev

# Terminal 6: Frontend
cd frontend && npm run dev
```

### Option 2: Use PM2 (Recommended for Development)

```bash
# Install PM2 globally
npm install -g pm2

# Kill existing processes
pkill -f "nodemon"

# Start all services with PM2
pm2 start services/auth/server.js --name auth-service
pm2 start services/products/server.js --name products-service
pm2 start services/categories/server.js --name categories-service
pm2 start services/users/server.js --name users-service
pm2 start services/orders/server.js --name orders-service

# Start frontend separately (Next.js dev server)
cd frontend && npm run dev

# View PM2 dashboard
pm2 monit

# View logs
pm2 logs

# Stop all
pm2 stop all

# Delete all processes
pm2 delete all
```

### Option 3: Create a Startup Script

Create `start-all-services.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting all microservices...${NC}"

# Kill existing processes
echo "Killing existing processes..."
pkill -f "nodemon" 2>/dev/null
sleep 2

# Start services in background
echo -e "${GREEN}Starting Auth Service (Port 3000)...${NC}"
cd services/auth && npm run dev > /tmp/auth.log 2>&1 &

echo -e "${GREEN}Starting Products Service (Port 3001)...${NC}"
cd ../products && npm run dev > /tmp/products.log 2>&1 &

echo -e "${GREEN}Starting Categories Service (Port 3002)...${NC}"
cd ../categories && npm run dev > /tmp/categories.log 2>&1 &

echo -e "${GREEN}Starting Users Service (Port 3003)...${NC}"
cd ../users && npm run dev > /tmp/users.log 2>&1 &

echo -e "${GREEN}Starting Orders Service (Port 3004)...${NC}"
cd ../orders && npm run dev > /tmp/orders.log 2>&1 &

echo -e "${GREEN}Starting Frontend (Port 3006)...${NC}"
cd ../../frontend && npm run dev > /tmp/frontend.log 2>&1 &

sleep 5

echo -e "${BLUE}All services started!${NC}"
echo ""
echo "Service Status:"
echo "==============="
lsof -i :3000 | grep LISTEN && echo "✅ Auth Service: http://localhost:3000" || echo "❌ Auth Service failed"
lsof -i :3001 | grep LISTEN && echo "✅ Products Service: http://localhost:3001" || echo "❌ Products Service failed"
lsof -i :3002 | grep LISTEN && echo "✅ Categories Service: http://localhost:3002" || echo "❌ Categories Service failed"
lsof -i :3003 | grep LISTEN && echo "✅ Users Service: http://localhost:3003" || echo "❌ Users Service failed"
lsof -i :3004 | grep LISTEN && echo "✅ Orders Service: http://localhost:3004" || echo "❌ Orders Service failed"
lsof -i :3006 | grep LISTEN && echo "✅ Frontend: http://localhost:3006" || echo "❌ Frontend failed"
lsof -i :8080 | grep LISTEN && echo "✅ API Gateway: http://localhost:8080" || echo "❌ API Gateway failed (run: cd api-gateway && ./start-gateway.sh)"

echo ""
echo "Logs location: /tmp/*.log"
echo "To view logs: tail -f /tmp/auth.log"
```

---

## Verification Commands

### Check Services are Running

```bash
# Check all ports
for port in 3000 3001 3002 3003 3004 3006 8080; do
  echo -n "Port $port: "
  lsof -i :$port | grep LISTEN > /dev/null && echo "✅ LISTENING" || echo "❌ NOT LISTENING"
done
```

### Health Check All Services

```bash
# Auth Service
curl http://localhost:3000/health

# Products Service
curl http://localhost:3001/health

# Categories Service
curl http://localhost:3002/health

# Users Service
curl http://localhost:3003/health

# Orders Service
curl http://localhost:3004/health

# Frontend (should return HTML)
curl -I http://localhost:3006

# API Gateway
curl http://localhost:8080/health
```

### Test Orders Endpoint Through Gateway

```bash
# Get access token (replace with your actual token)
TOKEN="your-access-token"

# Test orders endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/orders/user/691d6d01da39b318e42f4c21

# Expected: 200 OK with orders array
# Before fix: 404 not found
```

---

## Common Issues After Restart

### Issue 1: Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3004`

**Solution:**
```bash
# Find process using the port
lsof -i :3004

# Kill it
kill -9 <PID>

# Or kill all node processes
pkill -f "node"
```

### Issue 2: MongoDB Connection Failed

**Symptom:** `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or if installed via Homebrew (macOS)
brew services start mongodb-community
```

### Issue 3: API Gateway Not Routing

**Symptom:** 502 Bad Gateway from nginx

**Solution:**
```bash
# Check if gateway container is running
docker ps | grep nginx

# Restart gateway
cd api-gateway
./stop-gateway.sh
./start-gateway.sh
```

---

## Production Deployment Notes

For production, these ports should be:
- **Internal only** (not exposed to internet)
- **Behind API Gateway** (only port 8080 exposed)
- **Environment variables** managed by deployment platform
- **Load balanced** with multiple instances per service

Example Docker Compose port mapping:
```yaml
services:
  orders-service:
    ports:
      - "3004"  # Internal only, not mapped to host
    environment:
      - PORT=3004
    networks:
      - backend

  api-gateway:
    ports:
      - "8080:8080"  # Only this exposed
    networks:
      - backend
      - frontend
```

---

## Summary

✅ **Fixed:**
- Users service port changed from 3004 → 3003
- Orders service routes reordered for correct matching
- Documentation created for service ports

⚠️ **Action Required:**
1. Kill all duplicate service processes
2. Restart services with correct ports
3. Verify all health endpoints
4. Test orders API through frontend

🎯 **Next Steps:**
1. Create a proper startup script or use PM2
2. Add port monitoring to catch conflicts early
3. Document the correct startup sequence
4. Consider containerization (Docker Compose) for consistency
