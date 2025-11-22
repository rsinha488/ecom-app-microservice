# API Versioning Guide

## Overview

All services now support API versioning through URL paths, allowing for backward compatibility and smooth API evolution.

## Version: v1 (Current)

### Supported Endpoints

#### Auth Service (Port 3000)
```
# Versioned endpoints
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/oauth/authorize
POST   /api/v1/auth/oauth/token
GET    /api/v1/auth/oauth/userinfo
POST   /api/v1/auth/oauth/revoke
GET    /api/v1/auth/.well-known/openid-configuration

# Backwards compatible (defaults to v1)
POST   /auth/register
POST   /auth/login
...
```

#### Products Service (Port 3001)
```
# Versioned endpoints
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id

# Backwards compatible
GET    /api/products
GET    /api/products/:id
...
```

#### Categories Service (Port 3002)
```
# Versioned endpoints
GET    /api/v1/categories
GET    /api/v1/categories/:id
POST   /api/v1/categories
PUT    /api/v1/categories/:id
DELETE /api/v1/categories/:id

# Backwards compatible
GET    /api/categories
...
```

#### Users Service (Port 3003)
```
# Versioned endpoints
POST   /api/v1/users/register
POST   /api/v1/users/login
GET    /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

# Backwards compatible
POST   /api/users/register
...
```

#### Orders Service (Port 3004)
```
# Versioned endpoints
GET    /api/v1/orders
GET    /api/v1/orders/:id
GET    /api/v1/orders/user/:userId
POST   /api/v1/orders
PUT    /api/v1/orders/:id
PATCH  /api/v1/orders/:id/status
DELETE /api/v1/orders/:id

# Backwards compatible
GET    /api/orders
...
```

## Using Versioned APIs

### Example: Get Products (v1)

```bash
# Using versioned endpoint
curl http://localhost:3001/api/v1/products

# Using backwards compatible endpoint (defaults to v1)
curl http://localhost:3001/api/products
```

### Example: Create Order with Authentication

```bash
curl -X POST http://localhost:3004/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "items": [...],
    "totalAmount": 99.99
  }'
```

## API Version Headers

All API responses include version information in headers:

```
X-API-Version: v1
X-API-Deprecated: false
```

## Unsupported Version Response

If you request an unsupported version:

```bash
curl http://localhost:3001/api/v2/products
```

Response (400 Bad Request):
```json
{
  "error": "unsupported_version",
  "error_description": "API version v2 is not supported",
  "supported_versions": ["v1"],
  "current_version": "v1"
}
```

## Version Deprecation

When a version is deprecated, responses will include:

```
X-API-Deprecated: true
X-API-Sunset-Date: 2026-01-01
Warning: 299 - "API version v1 is deprecated and will be sunset on 2026-01-01"
```

## Production-Ready Features

### Security
- ✅ **Helmet**: Security headers
- ✅ **Rate Limiting**: Automatic brute-force protection
- ✅ **CORS**: Configurable origin restrictions
- ✅ **Compression**: Response compression
- ✅ **Request Size Limits**: 10MB limit on request bodies

### Rate Limiting

**Development** (NODE_ENV=development):
- General API: 1000 requests/15min
- Auth endpoints: 100 requests/15min

**Production** (NODE_ENV=production):
- General API: 100 requests/15min
- Auth endpoints: 5 requests/15min

Rate limit headers in response:
```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1234567890
```

### Error Handling

**Development**:
```json
{
  "error": "server_error",
  "error_description": "Detailed error message",
  "stack": "Error stack trace..."
}
```

**Production**:
```json
{
  "error": "server_error",
  "error_description": "An internal server error occurred"
}
```

### Health Checks

Enhanced health endpoints with version info:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "service": "products",
  "version": "v1",
  "port": 3001,
  "environment": "development",
  "timestamp": "2025-01-18T00:00:00.000Z"
}
```

### Root Endpoint

Each service provides metadata at root:

```bash
curl http://localhost:3001/
```

Response:
```json
{
  "service": "Products Service",
  "version": "v1",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "api_v1": "/api/v1/products"
  }
}
```

## Migration Guide

### From Unversioned to Versioned

If you have existing clients using unversioned endpoints:

**Before**:
```javascript
fetch('http://localhost:3001/api/products')
```

**After (Recommended)**:
```javascript
fetch('http://localhost:3001/api/v1/products')
```

**Or (Backwards Compatible)**:
```javascript
// Still works, defaults to v1
fetch('http://localhost:3001/api/products')
```

### Adding New API Versions

When creating v2:

1. Create new route files:
   ```
   services/products/routes/v2/productRoutes.js
   ```

2. Update server.js:
   ```javascript
   const productRoutesV1 = require('./routes/v1/productRoutes');
   const productRoutesV2 = require('./routes/v2/productRoutes');

   app.use('/api/:version/products', validateVersion, (req, res, next) => {
     if (req.apiVersion === 'v1') return productRoutesV1(req, res, next);
     if (req.apiVersion === 'v2') return productRoutesV2(req, res, next);
   });
   ```

3. Update validateVersion middleware:
   ```javascript
   const supportedVersions = ['v1', 'v2'];
   ```

## Best Practices

### 1. Always Use Versioned Endpoints in New Code
```javascript
// ✅ Good
const API_BASE = 'http://api.example.com/api/v1';

// ❌ Avoid
const API_BASE = 'http://api.example.com/api';
```

### 2. Handle Version Headers
```javascript
fetch(url).then(response => {
  const apiVersion = response.headers.get('X-API-Version');
  const isDeprecated = response.headers.get('X-API-Deprecated') === 'true';

  if (isDeprecated) {
    console.warn('API version is deprecated');
  }
});
```

### 3. Graceful Degradation
```javascript
async function fetchProducts() {
  try {
    // Try v2 first
    return await fetch('/api/v2/products');
  } catch (error) {
    if (error.status === 400) {
      // Fallback to v1
      return await fetch('/api/v1/products');
    }
    throw error;
  }
}
```

### 4. Monitor API Usage
- Track which versions clients are using
- Plan deprecation timelines
- Communicate changes to API consumers

## Backward Compatibility Policy

- **v1** endpoints will be supported until at least 2026
- Deprecated versions receive 6-month warning before sunset
- Breaking changes require new version
- Bug fixes and security patches applied to all active versions

## Future Versions

### Planned for v2:
- Enhanced filtering and pagination
- GraphQL support alongside REST
- Webhook subscriptions
- Bulk operations
- Extended metadata in responses

## Support

For API version support questions:
- Check health endpoints: `/health`
- View supported versions: Try unsupported version for list
- Documentation: `/docs` (when available)

## Testing with Different Versions

```bash
# Test v1
curl http://localhost:3001/api/v1/products

# Test backwards compatibility
curl http://localhost:3001/api/products

# Test unsupported version (should return error)
curl http://localhost:3001/api/v99/products
```

## Production Checklist

- [ ] All endpoints use versioned URLs
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to production domains
- [ ] SSL/TLS certificates installed
- [ ] Health checks configured in load balancer
- [ ] Monitoring set up for all versions
- [ ] Deprecation warnings in place for old versions
- [ ] Client migration plan documented
- [ ] API documentation updated with versions
- [ ] Backward compatibility tested
