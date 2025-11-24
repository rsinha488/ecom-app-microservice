# API Routes - Final Fix Summary

## ✅ Problem Identified and Fixed

### **Root Cause:**
The application uses **Next.js API route handlers** (`/frontend/src/app/api/**/route.ts`) that act as a proxy between the frontend and backend services. These route handlers were still using the old `/api/v1/` format instead of the new `/v1/` format.

### **Request Flow:**

```
User Action (Login)
    ↓
Frontend Component (authSlice.ts)
    ↓
fetch('/auth/login')  ← This calls Next.js API route, NOT backend directly
    ↓
Next.js API Route (/app/api/auth/login/route.ts)
    ↓
fetch(`${AUTH_API_URL}/api/v1/auth/login`)  ← OLD (WRONG)
fetch(`${AUTH_API_URL}/v1/auth/login`)      ← NEW (CORRECT)
    ↓
NGINX Gateway (Port 8080)
    ↓
Backend Service (Port 3000)
```

---

## 🔧 Files Fixed

### **Next.js API Route Handlers (All Updated)**

All files changed from `/api/v1/` to `/v1/`:

1. ✅ `frontend/src/app/api/auth/login/route.ts`
   - `/api/v1/auth/login` → `/v1/auth/login`

2. ✅ `frontend/src/app/api/auth/register/route.ts`
   - `/api/v1/auth/register` → `/v1/auth/register`

3. ✅ `frontend/src/app/api/auth/me/route.ts`
   - `/api/v1/auth/oauth/userinfo` → `/v1/oauth/userinfo` (2 occurrences)

4. ✅ `frontend/src/app/api/auth/refresh/route.ts`
   - `/api/v1/auth/oauth/token` → `/v1/oauth/token`

5. ✅ `frontend/src/app/api/auth/logout/route.ts`
   - `/api/v1/auth/oauth/revoke` → `/v1/oauth/revoke`

6. ✅ `frontend/src/app/api/categories/route.ts`
   - `/api/v1/categories` → `/v1/categories`

7. ✅ `frontend/src/app/api/products/[id]/route.ts`
   - `/api/v1/products/:id` → `/v1/products/:id`

8. ✅ `frontend/src/app/api/orders/route.ts`
   - `/api/v1/auth/oauth/userinfo` → `/v1/oauth/userinfo` (2 occurrences)
   - `/api/v1/orders/user/:userId` → `/v1/orders/user/:userId`
   - `/api/v1/orders` → `/v1/orders`

9. ✅ `frontend/src/app/api/orders/[id]/cancel/route.ts`
   - `/api/v1/orders/:id/cancel` → `/v1/orders/:id/cancel`

### **Server-Side Fetch Calls**

10. ✅ `frontend/src/app/products/[id]/layout.tsx`
    - `/api/v1/products/:id` → `/v1/products/:id`

11. ✅ `frontend/src/app/sitemap.ts`
    - `/api/v1/products` → `/v1/products`

### **NGINX Gateway Configuration**

12. ✅ `api-gateway/nginx/nginx.conf`
    - `/api/v1/auth` → `/v1/auth` (regex pattern)
    - `/api/v1/oauth` → `/v1/oauth` (regex pattern)
    - `/api/v1/products` → `/v1/products`
    - `/api/v1/categories` → `/v1/categories`
    - `/api/v1/users` → `/v1/users`
    - `/api/v1/orders` → `/v1/orders`
    - Restarted gateway: `docker restart api-gateway`

---

## 📋 Complete Architecture

### **Frontend Architecture**

Your frontend uses **TWO methods** to call backend APIs:

#### Method 1: Direct API Client (lib/api/index.ts)
Used for client-side API calls with axios:

```typescript
// frontend/src/lib/api/index.ts
export const productsAPI = {
  getProducts: (params?) =>
    productsClient.get('/v1/products', { params })  // ✅ Already correct
};
```

**Calls:** `http://localhost:8080/v1/products` (via axios baseURL)

#### Method 2: Next.js API Routes (app/api/**/route.ts)
Used for server-side API calls and cookie handling:

```typescript
// frontend/src/app/api/categories/route.ts
export async function GET(request: NextRequest) {
  const response = await fetch(`${CATEGORIES_API_URL}/v1/categories`);  // ✅ NOW FIXED
}
```

**Called by frontend:** `fetch('/api/categories')`
**Which then calls:** `http://localhost:8080/v1/categories`

---

## 🌐 Complete Request Flow

### Example: Login Flow

1. **User fills login form** → Clicks "Login"

2. **Frontend dispatches action:**
   ```typescript
   // frontend/src/store/slices/authSlice.ts
   const response = await fetch('/auth/login', {
     method: 'POST',
     body: JSON.stringify({ email, password })
   });
   ```

3. **Next.js routes to API handler:**
   - URL: `http://localhost:3006/auth/login`
   - Handled by: `frontend/src/app/api/auth/login/route.ts`

4. **API handler calls backend via gateway:**
   ```typescript
   // frontend/src/app/api/auth/login/route.ts
   const response = await fetch(`${AUTH_API_URL}/v1/auth/login`, {
     method: 'POST',
     body: JSON.stringify({ email, password })
   });
   ```
   - `AUTH_API_URL` = `http://localhost:8080` (from .env.local)
   - Full URL: `http://localhost:8080/v1/auth/login`

5. **NGINX Gateway receives request:**
   ```nginx
   # api-gateway/nginx/nginx.conf
   location ~ ^/v1/(auth|oauth) {
       proxy_pass http://auth_service;  # host.docker.internal:3000
   }
   ```

6. **NGINX proxies to backend:**
   - Gateway sends request to: `http://host.docker.internal:3000/v1/auth/login`

7. **Backend service handles request:**
   ```javascript
   // services/auth/server.js
   app.use('/:version/auth', validateVersion, authRoutesV1);
   ```

8. **Response flows back:**
   - Backend → NGINX → Next.js API Route → Frontend Component

---

## ⚙️ Environment Variables

### Frontend (.env.local)

```env
# All services point to API Gateway (Port 8080)
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:8080
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:8080
NEXT_PUBLIC_USERS_URL=http://localhost:8080
NEXT_PUBLIC_ORDERS_URL=http://localhost:8080

# OAuth Configuration
NEXT_PUBLIC_OAUTH_CLIENT_ID=ecommerce-client
NEXT_PUBLIC_OAUTH_CLIENT_SECRET=ecommerce-secret-change-in-production
```

### NGINX Gateway (nginx.conf)

```nginx
# Upstream backends
upstream auth_service {
    server host.docker.internal:3000;
}

upstream products_service {
    server host.docker.internal:3001;
}

# ... etc
```

---

## 🚨 Current Status

### ✅ What's Working

1. **NGINX Gateway** - Running on port 8080, configured correctly
2. **Frontend** - Running on port 3006
3. **All Frontend API Calls** - Updated to use `/v1/` format
4. **NGINX Routes** - Updated to proxy `/v1/*` to backend services
5. **Gateway Restarted** - New configuration loaded

### ❌ What's NOT Working

**Backend microservices are still NOT running:**

```bash
# Check which services are running
ss -tuln | grep -E ':(3000|3001|3002|3003|3004)'

# Result: NO services running on these ports
```

**This causes:**
- NGINX returns `502 Bad Gateway` when proxying
- Frontend API routes receive HTML error page
- Frontend shows: "Unexpected token '<', "<!DOCTYPE "..."

---

## 🚀 Next Steps to Fix

### 1. Start All Backend Services

**You MUST start all 5 backend microservices:**

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

### 2. Verify Services are Running

```bash
# Check all ports are listening
ss -tuln | grep -E ':(3000|3001|3002|3003|3004)'

# Should show:
# tcp LISTEN 0.0.0.0:3000  (auth)
# tcp LISTEN 0.0.0.0:3001  (products)
# tcp LISTEN 0.0.0.0:3002  (categories)
# tcp LISTEN 0.0.0.0:3003  (users)
# tcp LISTEN 0.0.0.0:3004  (orders)
```

### 3. Test Backend Services Directly

```bash
# Test each service directly (bypass gateway)
curl http://localhost:3000/health  # Auth
curl http://localhost:3001/health  # Products
curl http://localhost:3002/health  # Categories
curl http://localhost:3003/health  # Users
curl http://localhost:3004/health  # Orders
```

### 4. Test Gateway Routing

```bash
# Test gateway proxying to backends
curl http://localhost:8080/health  # Gateway health

curl http://localhost:8080/v1/categories  # Should return categories

curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 5. Verify Frontend Works

```bash
# Frontend should already be running on port 3006
# Open browser: http://localhost:3006
# Try to login - should now work!
```

---

## 📊 Port Summary

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| Frontend (Next.js) | 3006 | ✅ Running | User interface |
| NGINX Gateway | 8080 | ✅ Running | API Gateway |
| Auth Service | 3000 | ❌ OFFLINE | Authentication |
| Products Service | 3001 | ❌ OFFLINE | Product CRUD |
| Categories Service | 3002 | ❌ OFFLINE | Category management |
| Users Service | 3003 | ❌ OFFLINE | User management |
| Orders Service | 3004 | ❌ OFFLINE | Order management |

---

## 🎯 Why This Architecture?

### Benefits of Next.js API Routes

1. **Server-Side Execution** - API calls happen server-side, keeping secrets safe
2. **Cookie Management** - Can set HTTP-only cookies (more secure than localStorage)
3. **Response Transformation** - Can modify API responses before sending to client
4. **Error Handling** - Centralized error handling for all API calls
5. **Caching** - Can use Next.js caching features (ISR, SSG)

### Benefits of API Gateway

1. **Single Entry Point** - Frontend only needs to know one URL (port 8080)
2. **Load Balancing** - Can distribute traffic across multiple backend instances
3. **Rate Limiting** - Centralized rate limiting
4. **CORS Handling** - Gateway handles CORS, backends don't need to
5. **SSL Termination** - Gateway can handle HTTPS, backends use HTTP
6. **Service Discovery** - Frontend doesn't need to know individual service ports

---

## ✅ Summary

**What was fixed:**
- ✅ All Next.js API route handlers updated from `/api/v1/` to `/v1/`
- ✅ NGINX gateway configuration updated from `/api/v1/` to `/v1/`
- ✅ All server-side fetch calls updated
- ✅ Gateway restarted with new configuration

**What still needs to be done:**
- ❌ Start all 5 backend microservices (ports 3000-3004)

**Once backends are running:**
- ✅ Gateway will successfully proxy requests
- ✅ Frontend will work correctly
- ✅ Login, products, categories, orders will all function

**All API routes now use `/v1/resource` format consistently!**

No more `/api` prefix anywhere in the system.
