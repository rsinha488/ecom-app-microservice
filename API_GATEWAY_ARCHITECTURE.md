# API Gateway Architecture - Complete Guide

## 🏗️ Architecture Overview

Your e-commerce platform uses an **NGINX API Gateway** as a single entry point for all microservices.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│              http://localhost:3006 (Next.js)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ All API calls go through gateway
                         ▼
┌─────────────────────────────────────────────────────────────┐
│             NGINX API Gateway (Port 8080)                   │
│              Docker Container: api-gateway                  │
│                                                             │
│  Routes:                                                    │
│  • /v1/auth/*       → Auth Service (3000)                  │
│  • /v1/oauth/*      → Auth Service (3000)                  │
│  • /v1/products/*   → Products Service (3001)              │
│  • /v1/categories/* → Categories Service (3002)            │
│  • /v1/users/*      → Users Service (3003)                 │
│  • /v1/orders/*     → Orders Service (3004)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Proxies to backend services
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend Microservices                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Auth Service │  │   Products   │  │  Categories  │    │
│  │  Port 3000   │  │  Port 3001   │  │  Port 3002   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Users Service│  │Orders Service│                       │
│  │  Port 3003   │  │  Port 3004   │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Current Configuration Status

### ✅ What's Working

1. **NGINX Gateway (Port 8080)** - Running and configured
2. **Frontend (Port 3006)** - Running
3. **Frontend `.env.local`** - Correctly points all services to gateway (port 8080)
4. **NGINX Routes** - Updated to use `/v1/` pattern (no `/api` prefix)

### ❌ What's NOT Working

**Backend services are NOT running:**
- ❌ Auth Service (Port 3000) - OFFLINE
- ❌ Products Service (Port 3001) - OFFLINE
- ❌ Categories Service (Port 3002) - OFFLINE
- ❌ Users Service (Port 3003) - OFFLINE
- ❌ Orders Service (Port 3004) - OFFLINE

**This causes:**
- NGINX returns **502 Bad Gateway** when trying to proxy requests
- Frontend receives HTML error page instead of JSON
- Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

---

## 🔧 How the Gateway Works

### Request Flow Example (Login)

1. **Frontend makes request:**
   ```javascript
   // frontend/src/lib/api/index.ts
   authClient.post('/v1/auth/login', credentials)
   ```

2. **Axios client adds base URL:**
   ```
   Full URL: http://localhost:8080/v1/auth/login
   ```

3. **NGINX receives request:**
   ```nginx
   # api-gateway/nginx/nginx.conf
   location ~ ^/v1/(auth|oauth) {
       proxy_pass http://auth_service;  # auth_service = host.docker.internal:3000
   }
   ```

4. **NGINX proxies to backend:**
   ```
   http://host.docker.internal:3000/v1/auth/login
   ```

5. **Backend service handles request:**
   ```javascript
   // services/auth/server.js
   app.use('/:version/auth', validateVersion, authRoutesV1);
   ```

6. **Backend responds with JSON:**
   ```json
   {
     "success": true,
     "data": {
       "access_token": "...",
       "refresh_token": "...",
       "user": {...}
     }
   }
   ```

---

## 📁 Gateway Configuration Files

### 1. NGINX Configuration
**File:** `api-gateway/nginx/nginx.conf`

```nginx
# Upstream services (backend microservices)
upstream auth_service {
    server host.docker.internal:3000;
}

upstream products_service {
    server host.docker.internal:3001;
}

# ... etc

# Routes
location ~ ^/v1/(auth|oauth) {
    proxy_pass http://auth_service;
}

location /v1/products {
    proxy_pass http://products_service;
}

# ... etc
```

### 2. Docker Compose
**File:** `api-gateway/docker-compose.yml`

```yaml
services:
  nginx-gateway:
    image: nginx:alpine
    container_name: api-gateway
    ports:
      - "8080:8080"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

### 3. Frontend Environment Variables
**File:** `frontend/.env.local`

```env
# All services point to API Gateway
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:8080
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:8080
NEXT_PUBLIC_USERS_URL=http://localhost:8080
NEXT_PUBLIC_ORDERS_URL=http://localhost:8080
```

---

## 🚀 How to Fix and Start Everything

### Step 1: Start Backend Services

You need to start all 5 backend microservices:

```bash
# Terminal 1: Auth Service
cd services/auth
npm start

# Terminal 2: Products Service
cd services/products
npm start

# Terminal 3: Categories Service
cd services/categories
npm start

# Terminal 4: Users Service
cd services/users
npm start

# Terminal 5: Orders Service
cd services/orders
npm start
```

Or use a process manager like PM2 or concurrently.

### Step 2: Verify Backend Services

```bash
# Check all ports are listening
ss -tuln | grep -E ':(3000|3001|3002|3003|3004)'

# Test each service directly
curl http://localhost:3000/health  # Auth
curl http://localhost:3001/health  # Products
curl http://localhost:3002/health  # Categories
curl http://localhost:3003/health  # Users
curl http://localhost:3004/health  # Orders
```

### Step 3: Verify Gateway is Running

```bash
# Check gateway health
curl http://localhost:8080/health

# Should return:
# {"status":"healthy","gateway":"nginx"}
```

### Step 4: Test Gateway Routing

```bash
# Test categories through gateway
curl http://localhost:8080/v1/categories

# Test auth login through gateway
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

---

## 🔍 Troubleshooting

### Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

**Cause:** Frontend receives HTML error page instead of JSON response

**Common Reasons:**
1. Backend services not running (502 Bad Gateway)
2. Wrong URL path (404 Not Found returns HTML)
3. NGINX misconfigured routes

**Solution:**
1. Start all backend services
2. Verify NGINX routes match frontend API calls
3. Check NGINX logs: `docker logs api-gateway`

### Error: 502 Bad Gateway

**Cause:** NGINX cannot connect to backend service

**Solutions:**
```bash
# 1. Check if backend services are running
ss -tuln | grep -E ':(3000|3001|3002|3003|3004)'

# 2. Check NGINX logs
docker logs api-gateway

# 3. Test backend directly
curl http://localhost:3000/v1/auth/login
```

### Error: 404 Not Found

**Cause:** Route not configured in NGINX

**Solution:**
- Check `api-gateway/nginx/nginx.conf`
- Ensure route pattern matches frontend API call
- Restart gateway: `docker restart api-gateway`

---

## 📊 Route Mapping Reference

| Frontend Call | Gateway Receives | NGINX Routes To | Backend Handles |
|--------------|------------------|-----------------|-----------------|
| `/v1/auth/login` | `http://localhost:8080/v1/auth/login` | `host.docker.internal:3000` | `/:version/auth/login` |
| `/v1/oauth/token` | `http://localhost:8080/v1/oauth/token` | `host.docker.internal:3000` | `/:version/oauth/token` |
| `/v1/products` | `http://localhost:8080/v1/products` | `host.docker.internal:3001` | `/:version/products` |
| `/v1/categories` | `http://localhost:8080/v1/categories` | `host.docker.internal:3002` | `/:version/categories` |
| `/v1/users/me` | `http://localhost:8080/v1/users/me` | `host.docker.internal:3003` | `/:version/users/me` |
| `/v1/orders/user/:id` | `http://localhost:8080/v1/orders/user/:id` | `host.docker.internal:3004` | `/:version/orders/user/:id` |

---

## 🎯 Key Points

### Why Use an API Gateway?

1. **Single Entry Point** - Frontend only needs to know one URL (port 8080)
2. **Load Balancing** - Can distribute traffic across multiple backend instances
3. **Rate Limiting** - Centralized rate limiting for all services
4. **CORS Handling** - Gateway handles CORS, services don't need to
5. **SSL Termination** - Gateway can handle HTTPS, backends use HTTP
6. **Request Logging** - All requests logged in one place
7. **Service Discovery** - Frontend doesn't need to know individual service ports

### Architecture Benefits

✅ **Decoupled** - Frontend doesn't know about backend service locations
✅ **Scalable** - Easy to add more backend instances
✅ **Maintainable** - Change backend ports without updating frontend
✅ **Secure** - Backend services not directly exposed to internet
✅ **Flexible** - Can switch between services without frontend changes

---

## 📝 Summary

**Current Issue:**
- NGINX gateway is running and configured correctly
- Frontend is running and points to gateway
- Backend services are NOT running → 502 Bad Gateway errors

**Solution:**
1. Start all 5 backend microservices (ports 3000-3004)
2. Verify they respond to requests
3. Test gateway routing
4. Frontend should now work correctly

**Architecture:**
```
Browser (3006)
    ↓
NGINX Gateway (8080)
    ↓
Backend Services (3000-3004)
    ↓
MongoDB
```

All API calls use `/v1/resource` format (no `/api` prefix).

---

## 🔗 Related Documentation

- [API_VERSIONING_FINAL.md](./API_VERSIONING_FINAL.md) - API versioning details
- [API_ROUTES_MIGRATION_SUMMARY.md](./API_ROUTES_MIGRATION_SUMMARY.md) - Route migration history
- [API_ROUTING_GUIDE.md](./API_ROUTING_GUIDE.md) - API routing patterns
- [services/docs/QUICK_REFERENCE.md](./services/docs/QUICK_REFERENCE.md) - Services quick reference
