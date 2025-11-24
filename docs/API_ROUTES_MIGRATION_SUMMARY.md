# API Routes Migration Summary

## Overview
All API routes have been standardized to use **ONLY** `/v1/resource` format. All backwards compatibility has been removed.

---

## ✅ Backend Changes

### Services Updated (All on `/v1/` only)

#### 1. **Auth Service** (Port 3000)
**File:** `services/auth/server.js`

**Changes:**
- ✅ Removed `validateVersion` middleware import
- ✅ Changed route from `/:version/auth` to `/v1/auth`
- ✅ Removed all backwards compatible routes (`/api/:version/auth`, `/auth`)
- ✅ Updated rate limiters to `/v1/` paths

**Routes Now:**
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/oauth/token`
- `GET /v1/oauth/userinfo`
- `POST /v1/oauth/revoke`

#### 2. **Products Service** (Port 3001)
**File:** `services/products/server.js`

**Changes:**
- ✅ Removed `validateVersion` middleware import
- ✅ Changed route from `/:version/products` to `/v1/products`
- ✅ Removed all backwards compatible routes
- ✅ Updated rate limiter to `/v1/` path

**Routes Now:**
- `GET /v1/products`
- `GET /v1/products/:id`
- `GET /v1/products/search`
- `POST /v1/products`
- `PUT /v1/products/:id`
- `DELETE /v1/products/:id`
- `POST /v1/products/:id/reserve`
- `POST /v1/products/:id/release`

#### 3. **Categories Service** (Port 3002)
**File:** `services/categories/server.js`

**Changes:**
- ✅ Removed `validateVersion` middleware import
- ✅ Changed route from `/:version/categories` to `/v1/categories`
- ✅ Removed all backwards compatible routes
- ✅ Updated rate limiter to `/v1/` path

**Routes Now:**
- `GET /v1/categories`
- `GET /v1/categories/:id`
- `GET /v1/categories/slug/:slug`
- `POST /v1/categories`
- `PUT /v1/categories/:id`
- `DELETE /v1/categories/:id`

#### 4. **Users Service** (Port 3003)
**File:** `services/users/server.js`

**Changes:**
- ✅ Removed `validateVersion` middleware import
- ✅ Changed route from `/api/:version/users` to `/v1/users`
- ✅ Removed all backwards compatible routes
- ✅ Updated rate limiters to `/v1/` paths

**Routes Now:**
- `GET /v1/users/me`
- `GET /v1/users/:id`
- `PUT /v1/users/:id`
- `DELETE /v1/users/:id`

#### 5. **Orders Service** (Port 3004)
**File:** `services/orders/server.js`

**Changes:**
- ✅ Removed `validateVersion` middleware import
- ✅ Changed route from `/api/:version/orders` to `/v1/orders`
- ✅ Removed all backwards compatible routes
- ✅ Updated rate limiter to `/v1/` path

**Routes Now:**
- `GET /v1/orders/user/:userId`
- `GET /v1/orders/:id`
- `POST /v1/orders`
- `PATCH /v1/orders/:id/status`
- `PATCH /v1/orders/:id/cancel`
- `GET /v1/orders/statuses`

---

## ✅ Frontend Changes

### API Client Updates

**File:** `frontend/src/lib/api/index.ts`

All API endpoints updated to use `/v1/` prefix:

#### Auth API
```typescript
// OLD: '/api/v1/auth/login'
// NEW: '/v1/auth/login'

authClient.post('/v1/auth/login', ...)
authClient.post('/v1/auth/register', ...)
authClient.get('/v1/oauth/userinfo')
authClient.post('/v1/oauth/token', ...)  // refresh token
authClient.post('/v1/oauth/revoke')
```

#### Products API
```typescript
// OLD: '/api/v1/products'
// NEW: '/v1/products'

productsClient.get('/v1/products', ...)
productsClient.get('/v1/products/:id')
productsClient.get('/v1/products/search', ...)
productsClient.post('/v1/products', ...)
productsClient.put('/v1/products/:id', ...)
productsClient.delete('/v1/products/:id')
```

#### Categories API
```typescript
// OLD: '/api/v1/categories'
// NEW: '/v1/categories'

categoriesClient.get('/v1/categories')
categoriesClient.get('/v1/categories/:id')
categoriesClient.get('/v1/categories/slug/:slug')
categoriesClient.post('/v1/categories', ...)
categoriesClient.put('/v1/categories/:id', ...)
categoriesClient.delete('/v1/categories/:id')
```

#### Users API
```typescript
// OLD: '/api/v1/users/me'
// NEW: '/v1/users/me'

usersClient.get('/v1/users/me')
usersClient.get('/v1/users/:id')
usersClient.put('/v1/users/:id', ...)
usersClient.delete('/v1/users/:id')
```

#### Orders API
```typescript
// OLD: '/api/v1/orders/user/:userId'
// NEW: '/v1/orders/user/:userId'

ordersClient.get('/v1/orders/user/:userId')
ordersClient.get('/v1/orders/:id')
ordersClient.post('/v1/orders', ...)
ordersClient.patch('/v1/orders/:id/status', ...)
ordersClient.patch('/v1/orders/:id/cancel')
ordersClient.get('/v1/orders/statuses')
```

### Token Refresh Interceptor

**File:** `frontend/src/lib/api/apiClient.ts`

```typescript
// OLD: axios.post(`${AUTH_URL}/api/v1/oauth/token`, ...)
// NEW: axios.post(`${AUTH_URL}/v1/oauth/token`, ...)

const response = await axios.post(`${AUTH_URL}/v1/oauth/token`, {
  grant_type: 'refresh_token',
  refresh_token: refreshToken,
  client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'ecommerce-client',
  client_secret: process.env.NEXT_PUBLIC_OAUTH_CLIENT_SECRET || 'ecommerce-secret-change-in-production',
});
```

### Direct Fetch Calls

**File:** `frontend/src/app/products/page.tsx`

```typescript
// OLD: await fetch('/api/categories')
// NEW: await fetch(`${process.env.NEXT_PUBLIC_CATEGORIES_URL}/v1/categories`)

const response = await fetch(`${process.env.NEXT_PUBLIC_CATEGORIES_URL}/v1/categories`);
const data = await response.json();
const categories = data.data?.categories || data.categories || [];
```

---

## 🚫 What Was Removed

### Backend - Removed Routes

All services had these **REMOVED**:
```javascript
// REMOVED: Dynamic version validation
app.use('/:version/resource', validateVersion, routes);

// REMOVED: /api prefix compatibility
app.use('/api/:version/resource', validateVersion, routes);
app.use('/api/resource', routes);

// REMOVED: No-prefix routes
app.use('/resource', routes);  // auth service only
```

### Backend - Removed Imports
```javascript
// REMOVED from all services:
const { validateVersion } = require('./middleware/apiVersion');
```

---

## 📋 Testing Checklist

### Backend Verification

Test that old routes **NO LONGER WORK**:

```bash
# ❌ These should all return 404
curl http://localhost:3000/api/v1/auth/login       # FAIL
curl http://localhost:3001/api/products             # FAIL
curl http://localhost:3002/api/categories           # FAIL

# ✅ Only these should work
curl http://localhost:3000/v1/auth/login            # SUCCESS
curl http://localhost:3001/v1/products              # SUCCESS
curl http://localhost:3002/v1/categories            # SUCCESS
curl http://localhost:3003/v1/users/me              # SUCCESS
curl http://localhost:3004/v1/orders/statuses       # SUCCESS
```

### Frontend Verification

Check browser network tab - all API calls should use `/v1/` format:

```
✅ http://localhost:3000/v1/auth/login
✅ http://localhost:3000/v1/auth/register
✅ http://localhost:3000/v1/oauth/token
✅ http://localhost:3001/v1/products
✅ http://localhost:3001/v1/products/search?q=laptop
✅ http://localhost:3002/v1/categories
✅ http://localhost:3004/v1/orders/user/507f...

❌ No calls should have /api/ prefix
```

---

## 🔧 Environment Variables

Ensure `.env.local` in frontend has correct base URLs (no `/api`):

```env
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:3001
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:3002
NEXT_PUBLIC_USERS_URL=http://localhost:3003
NEXT_PUBLIC_ORDERS_URL=http://localhost:3004

NEXT_PUBLIC_OAUTH_CLIENT_ID=ecommerce-client
NEXT_PUBLIC_OAUTH_CLIENT_SECRET=ecommerce-secret-change-in-production
```

---

## 📊 Rate Limiting

All services now apply rate limiting to `/v1/` routes only:

```javascript
// Standard routes
app.use('/v1/', limiter);

// Auth-specific stricter limits
app.use('/v1/auth/login', authLimiter);
app.use('/v1/auth/register', authLimiter);
app.use('/v1/oauth/token', authLimiter);
```

---

## 🎯 Quick Migration Guide

If you need to add a new endpoint:

### Backend
```javascript
// ✅ CORRECT
app.use('/v1/newresource', newResourceRoutes);

// ❌ WRONG - Don't use these patterns
app.use('/:version/newresource', ...);
app.use('/api/:version/newresource', ...);
app.use('/api/newresource', ...);
```

### Frontend
```typescript
// ✅ CORRECT
client.get('/v1/newresource')

// ❌ WRONG - Don't use these patterns
client.get('/api/v1/newresource')
client.get('/api/newresource')
```

---

## 📝 Files Modified

### Backend (5 services)
1. ✅ `services/auth/server.js`
2. ✅ `services/products/server.js`
3. ✅ `services/categories/server.js`
4. ✅ `services/users/server.js`
5. ✅ `services/orders/server.js`

### Frontend (3 files)
1. ✅ `frontend/src/lib/api/index.ts`
2. ✅ `frontend/src/lib/api/apiClient.ts`
3. ✅ `frontend/src/app/products/page.tsx`

---

## ⚠️ Breaking Changes

**This is a BREAKING CHANGE.** Any external clients must update to use `/v1/` routes.

**Before:**
- `http://localhost:3001/api/v1/products` ✅
- `http://localhost:3001/api/products` ✅
- `http://localhost:3001/products` ❌

**After:**
- `http://localhost:3001/v1/products` ✅
- `http://localhost:3001/api/v1/products` ❌
- `http://localhost:3001/api/products` ❌
- `http://localhost:3001/products` ❌

---

## ✨ Benefits

1. **Consistency** - All routes follow the same pattern
2. **Simplicity** - No confusing backwards compatibility
3. **Clean URLs** - Remove unnecessary `/api` prefix
4. **Version Control** - Version is explicit in URL
5. **Performance** - No middleware overhead for version validation

---

## 🚀 Deployment Notes

1. **Frontend and backend MUST be deployed together**
2. **No gradual rollout possible** - this is a breaking change
3. **Update any external documentation/Postman collections**
4. **Inform API consumers of the breaking change**

---

## Summary

✅ **All services now ONLY support: `/v1/resource`**
✅ **All frontend calls updated to use `/v1/` format**
✅ **All backwards compatibility removed**
✅ **All unused middleware imports removed**
✅ **Categories seeded and working**
✅ **Refresh token endpoint fixed with client_secret**
✅ **Products pagination structure fixed**

**The API is now fully standardized and production-ready!** 🎉
