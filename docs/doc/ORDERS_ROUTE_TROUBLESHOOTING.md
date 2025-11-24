# Orders Route Troubleshooting Guide

**Date:** 2025-11-20
**Status:** ✅ Route Configuration is Correct

---

## Architecture Overview

The orders fetching flow involves multiple services working together:

```
Frontend Page
    ↓
Next.js API Route (/api/orders)
    ↓
Auth Service (get user info)
    ↓
API Gateway (Nginx)
    ↓
Orders Service (get user's orders)
```

---

## Complete Request Flow

### 1. Frontend Component
**File:** [frontend/src/app/orders/page.tsx:60-81](frontend/src/app/orders/page.tsx#L60-L81)

```typescript
const fetchOrders = async () => {
  const response = await fetch('/api/orders');
  const data = await response.json();
  setOrders(data.data?.orders || data.orders || []);
};
```

**What it does:**
- Calls the Next.js API route at `/api/orders`
- Automatically includes cookies (including accessToken)
- Expects response format: `{ data: { orders: [...] } }`

---

### 2. Next.js API Route
**File:** [frontend/src/app/api/orders/route.ts](frontend/src/app/api/orders/route.ts)

```typescript
export async function GET(request: NextRequest) {
  // Step 1: Get access token from cookies
  const accessToken = cookieStore.get('accessToken')?.value;

  // Step 2: Get user info from auth service
  const userInfoResponse = await fetch(
    `${AUTH_URL}/api/v1/auth/oauth/userinfo`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  const userInfo = await userInfoResponse.json();

  // Step 3: Extract user ID
  const userId = userInfo.sub || userInfo.id || userInfo._id;

  // Step 4: Fetch orders for this user
  const response = await fetch(
    `${ORDERS_API_URL}/api/v1/orders/user/${userId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  // Step 5: Return orders
  return NextResponse.json({
    success: true,
    data: { orders }
  });
}
```

**Environment Variables:**
- `NEXT_PUBLIC_AUTH_URL=http://localhost:8080`
- `NEXT_PUBLIC_ORDERS_URL=http://localhost:8080`

---

### 3. Auth Service - UserInfo Endpoint
**File:** [services/auth/controllers/authController.js:342-354](services/auth/controllers/authController.js#L342-L354)

**Route:** `GET /api/v1/auth/oauth/userinfo`

```javascript
exports.userinfo = async (req, res) => {
  const userId = req.user.sub; // From JWT token
  const user = await User.findById(userId);
  res.json(user.getOIDCUserInfo());
};
```

**User Model:** [services/auth/models/User.js:77-91](services/auth/models/User.js#L77-L91)

```javascript
userSchema.methods.getOIDCUserInfo = function() {
  return {
    sub: this._id.toString(),  // ← User ID is here!
    email: this.email,
    name: this.name,
    // ... other fields
  };
};
```

**Returns:**
```json
{
  "sub": "673cd7b4e64cf1d4c50a03b7",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true
}
```

---

### 4. API Gateway (Nginx)
**File:** [api-gateway/nginx/nginx.conf:172-188](api-gateway/nginx/nginx.conf#L172-L188)

```nginx
location /api/v1/orders {
    proxy_pass http://orders_service;
    # ... headers and timeouts
}

upstream orders_service {
    server host.docker.internal:3004;
}
```

**What it does:**
- Receives: `http://localhost:8080/api/v1/orders/user/673cd7b4e64cf1d4c50a03b7`
- Forwards to: `http://host.docker.internal:3004/api/v1/orders/user/673cd7b4e64cf1d4c50a03b7`

---

### 5. Orders Service
**File:** [services/orders/controllers/orderController.js:184-197](services/orders/controllers/orderController.js#L184-L197)

**Route:** `GET /api/v1/orders/user/:userId`

```javascript
exports.getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;

  const orders = await Order.find({ userId });

  res.status(200).json(
    ErrorResponse.success(
      { orders, count: orders.length, userId },
      'User orders retrieved successfully'
    )
  );
};
```

**Returns:**
```json
{
  "success": true,
  "message": "User orders retrieved successfully",
  "data": {
    "orders": [...],
    "count": 5,
    "userId": "673cd7b4e64cf1d4c50a03b7"
  }
}
```

---

## Common Issues and Solutions

### Issue 1: Multiple Service Instances Running

**Symptom:** Port conflicts, inconsistent behavior

**Detection:**
```bash
ps aux | grep -E "node.*orders|orders.*server" | grep -v grep
```

**Current Status:** ⚠️ **11 instances of orders service detected!**

**Solution:**
```bash
# Kill all orders service instances
pkill -f "orders.*server"

# Start only one instance
cd services/orders
npm run dev
```

---

### Issue 2: Missing Access Token

**Symptom:** 401 Unauthorized error

**Check:**
1. Open browser DevTools → Application → Cookies
2. Verify `accessToken` cookie exists for `localhost:3006`
3. Check expiration date

**Solution:**
```bash
# Log out and log in again
# Or refresh token via /api/auth/refresh
```

---

### Issue 3: Invalid User ID Format

**Symptom:** 400 Bad Request, "Invalid user ID format"

**Cause:** userId is not a valid MongoDB ObjectID

**Check logs:**
```bash
# Frontend API Route logs
cd frontend && npm run dev
# Look for: [Orders API] User ID: ...

# Orders Service logs
cd services/orders && npm run dev
# Look for CastError
```

**Solution:**
- Ensure userInfo.sub returns a valid MongoDB ObjectID string
- Check auth service is returning correct format

---

### Issue 4: Orders Service Not Running

**Symptom:** Connection refused, 502 Bad Gateway

**Check:**
```bash
# Is the service running?
ps aux | grep "orders.*server"

# Is it listening on port 3004?
lsof -i :3004

# Check service logs
cd services/orders && npm run dev
```

**Solution:**
```bash
cd services/orders
npm install
npm run dev
```

---

### Issue 5: API Gateway Not Running

**Symptom:** Connection refused to localhost:8080

**Check:**
```bash
# Is nginx container running?
docker ps | grep nginx

# Is gateway accessible?
curl http://localhost:8080/health
```

**Solution:**
```bash
cd api-gateway
./start-gateway.sh
```

---

## Testing the Complete Flow

### Test 1: Manual cURL Test

```bash
# 1. Get access token (replace with your actual token)
TOKEN="your-access-token-here"

# 2. Get user info
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/auth/oauth/userinfo

# Should return:
# {"sub":"673cd7b4e64cf1d4c50a03b7","email":"user@example.com",...}

# 3. Get orders (replace USER_ID with sub from above)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/orders/user/673cd7b4e64cf1d4c50a03b7

# Should return:
# {"success":true,"data":{"orders":[...],"count":5}}
```

### Test 2: Browser Console Test

```javascript
// In browser console on localhost:3006
fetch('/api/orders')
  .then(r => r.json())
  .then(d => console.log(d));

// Should log:
// {success: true, data: {orders: [...]}, message: "..."}
```

### Test 3: Check Network Tab

1. Open browser DevTools → Network tab
2. Navigate to `/orders` page
3. Find the request to `/api/orders`
4. Check:
   - Status: 200 OK
   - Response: `{success: true, data: {orders: [...]}}`
   - Cookies: accessToken is sent

---

## Expected Logs

### Frontend API Route Logs
```
[Orders API] Access token present: true
[Orders API] User ID: 673cd7b4e64cf1d4c50a03b7
[Orders API] Fetching from: http://localhost:8080/api/v1/orders/user/673cd7b4e64cf1d4c50a03b7
[Orders API] Response status: 200
[Orders API] Success, orders count: 5
```

### Orders Service Logs
```
GET /api/v1/orders/user/673cd7b4e64cf1d4c50a03b7 200 45ms
```

### API Gateway Logs
```
192.168.1.100 - - [20/Nov/2025:10:30:15 +0000] "GET /api/v1/orders/user/673cd7b4e64cf1d4c50a03b7 HTTP/1.1" 200 1234
```

---

## Verification Checklist

✅ **Services Running:**
- [ ] Auth Service (port 3000)
- [ ] Orders Service (port 3004)
- [ ] Frontend (port 3006)
- [ ] API Gateway (port 8080)

✅ **Environment Variables:**
- [ ] `frontend/.env.local` has `NEXT_PUBLIC_ORDERS_URL=http://localhost:8080`
- [ ] `frontend/.env.local` has `NEXT_PUBLIC_AUTH_URL=http://localhost:8080`

✅ **Database:**
- [ ] MongoDB is running
- [ ] Orders collection has documents with `userId` field
- [ ] Users collection has documents

✅ **Authentication:**
- [ ] User is logged in
- [ ] `accessToken` cookie exists
- [ ] Token is not expired

✅ **Network:**
- [ ] No CORS errors in browser console
- [ ] API Gateway is accessible
- [ ] Services can reach each other

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (localhost:3006)                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Orders Page Component                                │  │
│  │  • fetch('/api/orders')                               │  │
│  │  • Sends cookies (accessToken)                        │  │
│  └────────────────────┬──────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js Server (localhost:3006)                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Route: /api/orders/route.ts                      │  │
│  │  1. Get accessToken from cookies                      │  │
│  │  2. Call auth service for userInfo                    │  │
│  │  3. Extract userId from userInfo.sub                  │  │
│  │  4. Call orders service with userId                   │  │
│  │  5. Return formatted response                         │  │
│  └──────┬─────────────────────────────────────┬──────────┘  │
└─────────┼─────────────────────────────────────┼─────────────┘
          │                                     │
          │ (2)                                 │ (4)
          │ GET /api/v1/auth/oauth/userinfo     │ GET /api/v1/orders/user/:userId
          │ Authorization: Bearer <token>       │ Authorization: Bearer <token>
          │                                     │
          ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│  API Gateway (localhost:8080) - Nginx                       │
│  ┌─────────────────────┐         ┌──────────────────────┐   │
│  │  /api/v1/auth/*     │         │  /api/v1/orders/*    │   │
│  │  → auth_service     │         │  → orders_service    │   │
│  └──────┬──────────────┘         └──────────┬───────────┘   │
└─────────┼─────────────────────────────────────┼─────────────┘
          │                                     │
          │ proxy_pass                          │ proxy_pass
          │ host.docker.internal:3000           │ host.docker.internal:3004
          │                                     │
          ▼                                     ▼
┌──────────────────────┐           ┌───────────────────────────┐
│  Auth Service (3000) │           │  Orders Service (3004)    │
│  ┌────────────────┐  │           │  ┌─────────────────────┐  │
│  │ userinfo()     │  │           │  │ getOrdersByUserId() │  │
│  │ • Get user     │  │           │  │ • Find orders       │  │
│  │ • Return OIDC  │  │           │  │ • Return array      │  │
│  │   user info    │  │           │  │                     │  │
│  └────────┬───────┘  │           │  └──────┬──────────────┘  │
└───────────┼──────────┘           └─────────┼─────────────────┘
            │                                │
            ▼                                ▼
┌──────────────────────┐           ┌───────────────────────────┐
│  MongoDB             │           │  MongoDB                  │
│  • users collection  │           │  • orders collection      │
│  • Find by _id       │           │  • Find by userId         │
└──────────────────────┘           └───────────────────────────┘
```

---

## Quick Fix Commands

```bash
# 1. Kill all duplicate service instances
pkill -f "orders.*server"

# 2. Start services fresh
cd services/orders && npm run dev &
cd services/auth && npm run dev &
cd frontend && npm run dev &

# 3. Check API Gateway
docker ps | grep nginx || cd api-gateway && ./start-gateway.sh

# 4. Test the flow
curl http://localhost:8080/health
```

---

## Conclusion

The orders route architecture is **correctly configured** end-to-end. The issue mentioned by the user is likely one of:

1. **Multiple service instances** causing port conflicts
2. **Service not running** (orders or auth)
3. **API Gateway not running**
4. **Missing or expired access token**

All code implementations are correct and follow best practices. No code changes needed - this is a **runtime/environment issue**, not a code issue.

---

**Next Steps:**
1. Kill duplicate service instances
2. Ensure all services are running on correct ports
3. Verify API Gateway is accessible
4. Test with the provided cURL commands
5. Check browser console and network tab for specific error messages
