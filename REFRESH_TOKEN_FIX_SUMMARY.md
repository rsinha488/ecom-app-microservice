# Refresh Token Fix Summary

## Problem
After login, refreshing the page or calling the `/api/auth/refresh` endpoint always returned 401 Unauthorized, causing users to be logged out.

## Root Causes Identified

### 1. OAuth Client Missing from Database
**Issue:** The OAuth client configuration wasn't properly seeded in the database.

**Location:** MongoDB `auth_db` database, collection `clients`

**Fix:** Inserted the OAuth client with correct credentials:
```javascript
{
  client_id: "ecommerce-client",
  client_secret: "ecommerce-secret-change-in-production",
  client_name: "E-commerce Platform",
  redirect_uris: [
    "http://localhost:3006/callback",
    "http://localhost:3006/auth/callback"
  ],
  grant_types: ["authorization_code", "refresh_token", "password"],
  response_types: ["code", "token"],
  scope: ["openid", "profile", "email", "address", "phone"],
  token_endpoint_auth_method: "client_secret_post",
  isActive: true
}
```

### 2. Wrong Collection Name
**Issue:** OAuth client was inserted into `oauth_clients` collection, but Mongoose model `Client` maps to `clients` collection (pluralized).

**Fix:** Copied the client document from `oauth_clients` to `clients` collection.

### 3. Express Trust Proxy Not Enabled
**Issue:** Auth service wasn't trusting proxy headers from NGINX, causing rate limiting errors.

**File:** [services/auth/server.js](services/auth/server.js:25)

**Before:**
```javascript
// Trust proxy (for production behind load balancer)
if (isProduction) {
  app.set('trust proxy', 1);
}
```

**After:**
```javascript
// Trust proxy (required when behind NGINX/reverse proxy)
app.set('trust proxy', 1);
```

---

## Files Modified

### 1. [services/auth/server.js](services/auth/server.js:25)
Enabled trust proxy for all environments (not just production) since we're always behind NGINX.

### 2. [services/auth/controllers/authController.js](services/auth/controllers/authController.js:227-233)
Added debug logging (later removed) to diagnose client lookup issues.

---

## Database Changes

### MongoDB `auth_db.clients` Collection
Inserted OAuth client document with correct schema matching the Client model.

**Command:**
```javascript
db.clients.insertOne({
  client_id: "ecommerce-client",
  client_secret: "ecommerce-secret-change-in-production",
  client_name: "E-commerce Platform",
  redirect_uris: ["http://localhost:3006/callback", "http://localhost:3006/auth/callback"],
  grant_types: ["authorization_code", "refresh_token", "password"],
  response_types: ["code", "token"],
  scope: ["openid", "profile", "email", "address", "phone"],
  token_endpoint_auth_method: "client_secret_post",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

## Testing Performed

### Test 1: Direct Token Refresh (Port 3000)
```bash
curl -X POST http://localhost:3000/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type":"refresh_token",
    "refresh_token":"7d83e299-7bf6-4503-9879-962bad327dcd",
    "client_id":"ecommerce-client",
    "client_secret":"ecommerce-secret-change-in-production"
  }'
```

**Result:** ✅ Returns new `access_token`, `id_token`, and token metadata

### Test 2: Refresh via Next.js API Route
```bash
# Login first
curl -c /tmp/cookies.txt -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456"}'

# Test refresh
curl -b /tmp/cookies.txt -X POST http://localhost:3006/api/auth/refresh
```

**Result:** ✅ Returns `{"success":true}`

### Test 3: Protected Route After Refresh
```bash
curl -b /tmp/cookies.txt http://localhost:3006/api/orders
```

**Result:** ✅ Returns `{"success":true,"data":{"orders":[]},"message":"Orders retrieved successfully"}`

---

## Complete Authentication Flow (Now Working)

### 1. Initial Login
```
User submits credentials
  ↓
POST /api/auth/login
  ↓
Next.js → POST http://localhost:8080/v1/auth/login
  ↓
Auth Service validates & returns tokens
  ↓
Next.js sets HTTP-only cookies:
  - accessToken (15min expiry)
  - refreshToken (7 days expiry)
  - user (profile data)
  ↓
✅ User logged in
```

### 2. Page Refresh / Token Expiry
```
Browser refreshes page
  ↓
Frontend calls: POST /api/auth/refresh
  ↓
Next.js reads refreshToken from cookies
  ↓
POST http://localhost:8080/v1/auth/oauth/token
  with grant_type=refresh_token
  ↓
Auth Service validates:
  ✅ Client credentials match (client_id + client_secret)
  ✅ Refresh token exists and not expired
  ✅ Refresh token not revoked
  ↓
Returns new access_token + id_token
  ↓
Next.js updates accessToken cookie
  ↓
✅ Session refreshed, user stays logged in
```

### 3. Accessing Protected Routes
```
User visits /orders page
  ↓
GET /api/orders
  ↓
Next.js reads accessToken from cookie
  ↓
GET http://localhost:8080/v1/auth/oauth/userinfo
  with Authorization: Bearer {accessToken}
  ↓
Auth Service returns user info
  ↓
GET http://localhost:8080/v1/orders/user/{userId}
  with Authorization: Bearer {accessToken}
  ↓
✅ Orders returned
```

---

## Environment Configuration

### Auth Service (.env.local)
```env
MONGODB_URI=mongodb+srv://...@cluster0.vjny8d1.mongodb.net/auth_db
DEFAULT_CLIENT_ID=ecommerce-client
DEFAULT_CLIENT_SECRET=ecommerce-secret-change-in-production
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_OAUTH_CLIENT_ID=ecommerce-client
OAUTH_CLIENT_SECRET=ecommerce-secret-change-in-production
```

**Note:** Client secret must match between frontend and database!

---

## OAuth2 Grant Types Supported

1. **Password Grant** (used for login)
   - `grant_type: "password"`
   - Requires: username, password, client_id, client_secret

2. **Refresh Token** (used for token refresh)
   - `grant_type: "refresh_token"`
   - Requires: refresh_token, client_id, client_secret

3. **Authorization Code** (for OAuth flows)
   - `grant_type: "authorization_code"`
   - Requires: code, redirect_uri, client_id, client_secret

---

## Token Lifetimes

| Token | Expiry | Storage | Purpose |
|-------|--------|---------|---------|
| Access Token | 15 minutes | HTTP-only cookie | API authentication |
| Refresh Token | 7 days | HTTP-only cookie | Get new access tokens |
| ID Token | 1 hour | Returned with tokens | OIDC user identity |

---

## Security Notes

### HTTP-Only Cookies
All tokens are stored in HTTP-only cookies, making them inaccessible to JavaScript and protecting against XSS attacks.

### Client Secret Protection
The client secret is:
- ✅ Stored server-side only (Next.js API routes)
- ✅ Never exposed to browser
- ✅ Sent only in server-to-server requests

### Token Refresh Security
- Refresh tokens can only be used once (single-use pattern)
- Expired refresh tokens are automatically rejected
- Revoked refresh tokens (logout) cannot be reused

---

## Related Documentation

1. **[FINAL_FIX_SUMMARY.md](FINAL_FIX_SUMMARY.md)** - Complete API routing fixes
2. **[OAUTH_ENDPOINTS_FIX_SUMMARY.md](OAUTH_ENDPOINTS_FIX_SUMMARY.md)** - OAuth endpoint path fixes
3. **[API_GATEWAY_ARCHITECTURE.md](API_GATEWAY_ARCHITECTURE.md)** - NGINX gateway architecture

---

## Status: ✅ FULLY RESOLVED

The refresh token flow is now working correctly:

✅ OAuth client properly configured in database
✅ Token refresh endpoint working
✅ Express trust proxy enabled
✅ Protected routes accessible after refresh
✅ User sessions persist across page refreshes
✅ No more 401 errors on refresh

**Users can now stay logged in for up to 7 days without having to re-enter credentials!** 🎉
