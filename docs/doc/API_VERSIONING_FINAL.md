# API Versioning - Final Configuration

## ✅ Standardized Route Format

All microservices now use **`/:version/resource`** pattern with dynamic version validation.

---

## Backend Configuration

### Route Pattern

**Format:** `/:version/resource`

**Examples:**
- `http://localhost:3000/v1/auth/login`
- `http://localhost:3001/v1/products`
- `http://localhost:3002/v1/categories`
- `http://localhost:3003/v1/users/me`
- `http://localhost:3004/v1/orders/user/123`

### All Services Updated

#### 1. **Auth Service** (Port 3000)
```javascript
app.use('/:version/auth', validateVersion, authRoutesV1);
```

**Routes:**
- `POST /:version/auth/register`
- `POST /:version/auth/login`
- `POST /:version/oauth/token`
- `GET /:version/oauth/userinfo`
- `POST /:version/oauth/revoke`

#### 2. **Products Service** (Port 3001)
```javascript
app.use('/:version/products', validateVersion, productRoutesV1);
```

**Routes:**
- `GET /:version/products`
- `GET /:version/products/:id`
- `GET /:version/products/search`
- `POST /:version/products`
- `PUT /:version/products/:id`
- `DELETE /:version/products/:id`

#### 3. **Categories Service** (Port 3002)
```javascript
app.use('/:version/categories', validateVersion, categoryRoutesV1);
```

**Routes:**
- `GET /:version/categories`
- `GET /:version/categories/:id`
- `GET /:version/categories/slug/:slug`
- `POST /:version/categories`
- `PUT /:version/categories/:id`
- `DELETE /:version/categories/:id`

#### 4. **Users Service** (Port 3003)
```javascript
app.use('/:version/users', validateVersion, userRoutesV1);
```

**Routes:**
- `GET /:version/users/me`
- `GET /:version/users/:id`
- `PUT /:version/users/:id`
- `DELETE /:version/users/:id`

#### 5. **Orders Service** (Port 3004)
```javascript
app.use('/:version/orders', validateVersion, orderRoutesV1);
```

**Routes:**
- `GET /:version/orders/user/:userId`
- `GET /:version/orders/:id`
- `POST /:version/orders`
- `PATCH /:version/orders/:id/status`
- `PATCH /:version/orders/:id/cancel`
- `GET /:version/orders/statuses`

---

## Frontend Configuration

### API Calls (All using `/v1/`)

**Files:**
- `frontend/src/lib/api/index.ts` - All API endpoint definitions
- `frontend/src/lib/api/apiClient.ts` - Token refresh interceptor
- `frontend/src/app/products/page.tsx` - Direct fetch call

### Examples

#### Auth API
```typescript
authClient.post('/v1/auth/login', credentials)
authClient.post('/v1/auth/register', data)
authClient.get('/v1/oauth/userinfo')
authClient.post('/v1/oauth/token', { grant_type: 'refresh_token', ... })
```

#### Products API
```typescript
productsClient.get('/v1/products', { params: { category: 'electronics' } })
productsClient.get('/v1/products/:id')
productsClient.get('/v1/products/search', { params: { q: 'laptop' } })
```

#### Categories API
```typescript
categoriesClient.get('/v1/categories')
fetch(`${process.env.NEXT_PUBLIC_CATEGORIES_URL}/v1/categories`)
```

#### Orders API
```typescript
ordersClient.get('/v1/orders/user/:userId')
ordersClient.post('/v1/orders', orderData)
ordersClient.patch('/v1/orders/:id/cancel')
```

---

## Version Validation

Each service has `validateVersion` middleware that:

1. Checks if the version in URL is valid (currently only `v1`)
2. Extracts version from request params
3. Passes to route handlers
4. Returns 400 error for invalid versions

### Supported Versions

Currently supported: `v1`

To add `v2` in the future, update the `validateVersion` middleware in each service.

---

## Rate Limiting

All services apply rate limiting to versioned routes:

```javascript
// Standard endpoints
app.use('/:version/', limiter); // 100 req/15min (production)

// Auth-specific endpoints (stricter)
app.use('/:version/auth/login', authLimiter); // 5 req/15min (production)
app.use('/:version/auth/register', authLimiter);
app.use('/:version/oauth/token', authLimiter);
```

---

## Testing

### Test Endpoints Work

```bash
# Auth Service
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Products Service
curl http://localhost:3001/v1/products

# Products with filters
curl "http://localhost:3001/v1/products?category=electronics&page=1&limit=10"

# Categories Service
curl http://localhost:3002/v1/categories

# Orders Service (requires auth)
curl http://localhost:3004/v1/orders/user/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <access_token>"
```

### Test Version Validation

```bash
# Valid version - should work
curl http://localhost:3001/v1/products

# Invalid version - should return 400
curl http://localhost:3001/v2/products
curl http://localhost:3001/invalid/products
```

---

## URL Structure Breakdown

**Format:** `http://host:port/:version/resource`

| Component | Example | Description |
|-----------|---------|-------------|
| Protocol | `http://` | HTTP or HTTPS |
| Host | `localhost` | Server hostname |
| Port | `3001` | Service port |
| Version | `v1` | API version (dynamic) |
| Resource | `products` | Resource endpoint |
| Sub-path | `/search` | Optional sub-path |
| Query | `?category=electronics` | Query parameters |

**Full Example:**
```
http://localhost:3001/v1/products?category=electronics&page=1
└─┬─┘ └────┬────┘└─┬─┘└┬┘└──┬───┘└──────────┬─────────────────┘
  │        │       │   │    │               │
Protocol  Host   Port Ver Resource    Query Params
```

---

## Key Features

### ✅ Dynamic Versioning
- Version is extracted from URL path parameter
- Easy to add new versions (v2, v3, etc.)
- No hardcoding of version numbers

### ✅ Version Validation
- `validateVersion` middleware ensures only valid versions are accepted
- Returns proper error messages for invalid versions
- Centralized version control

### ✅ Clean URLs
- No `/api` prefix
- Clear version indicator
- RESTful structure

### ✅ Frontend Compatibility
- Frontend uses `/v1/` which matches `/:version/` pattern
- All API calls work seamlessly
- Token refresh interceptor uses correct format

---

## Adding New Versions

To add `v2` support:

### Backend

1. **Create v2 routes:**
```javascript
const productRoutesV2 = require('./routes/v2/productRoutes');
```

2. **Add v2 route:**
```javascript
app.use('/:version/products', validateVersion, (req, res, next) => {
  if (req.params.version === 'v1') {
    return productRoutesV1(req, res, next);
  } else if (req.params.version === 'v2') {
    return productRoutesV2(req, res, next);
  }
});
```

3. **Update validateVersion middleware:**
```javascript
const validVersions = ['v1', 'v2'];
```

### Frontend

Update API calls to use `/v2/`:
```typescript
productsClient.get('/v2/products')
```

---

## Environment Variables

Frontend `.env.local`:
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

## Files Modified

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

## Summary

✅ **Route Pattern:** `/:version/resource`
✅ **Current Version:** `v1`
✅ **Validation:** Active on all services
✅ **Rate Limiting:** Applied to versioned routes
✅ **Frontend:** Compatible and working
✅ **Categories:** Seeded and accessible
✅ **Pagination:** Fixed with `meta` structure
✅ **Refresh Token:** Fixed with `client_secret`

**All services are now using dynamic version routing with `/:version/resource` pattern!** 🎉

---

## Quick Reference

| Service | Base URL | Example Endpoint |
|---------|----------|------------------|
| Auth | `http://localhost:3000` | `/v1/auth/login` |
| Products | `http://localhost:3001` | `/v1/products` |
| Categories | `http://localhost:3002` | `/v1/categories` |
| Users | `http://localhost:3003` | `/v1/users/me` |
| Orders | `http://localhost:3004` | `/v1/orders/user/:id` |

**Pattern:** `/:version/resource` where `:version` = `v1` (currently)
