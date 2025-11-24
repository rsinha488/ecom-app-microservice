# API Routing Standardization Guide

## Overview
All microservices now support a standardized routing format with backwards compatibility.

## Standard Route Format

### New Standard (Recommended)
```
/:version/resource
```

**Examples:**
- `http://localhost:3000/v1/auth/login`
- `http://localhost:3001/v1/products`
- `http://localhost:3002/v1/categories`
- `http://localhost:3004/v1/orders`

### Backwards Compatible (Legacy)
```
/api/:version/resource
/api/resource
```

**Examples:**
- `http://localhost:3000/api/v1/auth/login`
- `http://localhost:3001/api/products`
- `http://localhost:3002/api/categories`

---

## Service Endpoints

### 1. Auth Service (Port 3000)

**Standard Routes:**
- `POST /v1/auth/register` - User registration
- `POST /v1/auth/login` - User login
- `POST /v1/oauth/token` - Get/refresh access token
- `GET /v1/oauth/userinfo` - Get user information
- `POST /v1/oauth/revoke` - Revoke token
- `GET /v1/auth/.well-known/openid-configuration` - OIDC discovery

**Backwards Compatible:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/oauth/token`
- etc.

**Example:**
```bash
# New standard
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Backwards compatible
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

---

### 2. Products Service (Port 3001)

**Standard Routes:**
- `GET /v1/products` - Get all products (with filters)
- `GET /v1/products/:id` - Get product by ID
- `GET /v1/products/search?q=query` - Search products
- `POST /v1/products` - Create product (Admin)
- `PUT /v1/products/:id` - Update product (Admin)
- `DELETE /v1/products/:id` - Delete product (Admin)
- `POST /v1/products/:id/reserve` - Reserve stock
- `POST /v1/products/:id/release` - Release stock

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `category` - Filter by category slug (e.g., `electronics`, `home-garden`)
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `inStock` - Filter by stock availability (true/false)
- `search` - Search query
- `sort` - Sort field (e.g., `price`, `-price`, `createdAt`)

**Example:**
```bash
# Get all products
curl http://localhost:3001/v1/products

# Get products with filters
curl "http://localhost:3001/v1/products?category=electronics&minPrice=50&maxPrice=200&page=1&limit=10"

# Search products
curl "http://localhost:3001/v1/products/search?q=headphones"
```

**Response Format:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "_id": "...",
        "name": "Product Name",
        "category": "electronics",
        "price": 129.99,
        ...
      }
    ],
    "count": 10
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

### 3. Categories Service (Port 3002)

**Standard Routes:**
- `GET /v1/categories` - Get all categories
- `GET /v1/categories/:id` - Get category by ID
- `GET /v1/categories/slug/:slug` - Get category by slug
- `POST /v1/categories` - Create category (Admin)
- `PUT /v1/categories/:id` - Update category (Admin)
- `DELETE /v1/categories/:id` - Delete category (Admin)

**Available Categories:**
- `electronics` - Electronics
- `clothing` - Clothing
- `home-garden` - Home & Garden
- `sports-outdoors` - Sports & Outdoors

**Example:**
```bash
# Get all categories
curl http://localhost:3002/v1/categories

# Get category by slug
curl http://localhost:3002/v1/categories/slug/electronics
```

**Response Format:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "...",
        "name": "Electronics",
        "slug": "electronics",
        "description": "Electronic devices, gadgets, and accessories",
        "imageUrl": "...",
        "order": 1,
        "isActive": true
      }
    ],
    "count": 4
  }
}
```

---

### 4. Orders Service (Port 3004)

**Standard Routes:**
- `GET /v1/orders/user/:userId` - Get user's orders
- `GET /v1/orders/:id` - Get order by ID
- `POST /v1/orders` - Create order
- `PATCH /v1/orders/:id/status` - Update order status (Admin)
- `PATCH /v1/orders/:id/cancel` - Cancel order
- `GET /v1/orders/statuses` - Get order status enums

**Example:**
```bash
# Get user orders
curl http://localhost:3004/v1/orders/user/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <access_token>"

# Create order
curl -X POST http://localhost:3004/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "items": [
      {
        "productId": "507f1f77bcf86cd799439012",
        "quantity": 2,
        "price": 129.99
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "paymentMethod": 1
  }'
```

**Response Format:**
```json
{
  "success": true,
  "message": "User orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "...",
        "userId": "...",
        "items": [...],
        "totalAmount": 259.98,
        "status": 1,
        "statusLabel": "Pending",
        ...
      }
    ],
    "count": 5,
    "userId": "507f1f77bcf86cd799439011"
  }
}
```

---

### 5. Users Service (Port 3003)

**Standard Routes:**
- `GET /v1/users/me` - Get current user
- `GET /v1/users/:id` - Get user by ID (Admin)
- `PUT /v1/users/:id` - Update user
- `DELETE /v1/users/:id` - Delete user (Admin)

---

## Frontend Integration

### Environment Variables

Update your `.env.local` in the frontend:

```env
# New standard format (recommended)
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:3001
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:3002
NEXT_PUBLIC_USERS_URL=http://localhost:3003
NEXT_PUBLIC_ORDERS_URL=http://localhost:3004
```

### API Client Usage

The frontend API client automatically uses the correct base URLs:

```typescript
// Products API
import { productsAPI } from '@/lib/api';

// Calls: http://localhost:3001/v1/products
const response = await productsAPI.getProducts({ category: 'electronics' });

// Categories API
import { categoriesAPI } from '@/lib/api';

// Calls: http://localhost:3002/v1/categories
const categories = await categoriesAPI.getCategories();
```

---

## Migration Checklist

### For Existing Clients

- [x] Update environment variables to remove `/api` prefix
- [x] Services support both old and new routes
- [x] All API responses follow consistent structure
- [x] Pagination metadata in `meta` object
- [x] Data payload in `data` object

### Testing

Test both route formats to ensure backwards compatibility:

```bash
# Test new format
curl http://localhost:3001/v1/products

# Test old format (should still work)
curl http://localhost:3001/api/v1/products
curl http://localhost:3001/api/products
```

---

## Response Structure Standard

All APIs follow this response format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Resource-specific data
  },
  "meta": {
    // Optional pagination metadata
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "suggestion": "Helpful suggestion for user",
  "fields": {
    // Field-specific validation errors (optional)
  },
  "statusCode": 400
}
```

---

## Rate Limiting

All services have rate limiting enabled:

- **Standard endpoints**: 100 requests per 15 minutes (production)
- **Auth endpoints**: 5 requests per 15 minutes (production)
- **Development**: 1000 requests per 15 minutes

Rate limit applies to versioned routes: `/:version/*`

---

## Health Checks

Every service exposes a health check endpoint:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "products",
  "version": "v1",
  "port": 3001,
  "environment": "development",
  "timestamp": "2025-11-22T18:30:00.000Z"
}
```

---

## Troubleshooting

### Issue: Empty Response from Categories

**Problem:** `GET /api/categories` returns `{"categories": []}`

**Solution:**
1. Ensure categories are seeded:
   ```bash
   cd services/categories
   node seed-categories.js
   ```

2. Use correct endpoint:
   - ✅ `http://localhost:3002/v1/categories`
   - ✅ `http://localhost:3002/api/v1/categories`
   - ✅ `http://localhost:3002/api/categories`

### Issue: 404 Not Found

**Problem:** Endpoint returns 404

**Solution:**
- Check service is running on correct port
- Verify route format matches one of:
  - `/:version/resource`
  - `/api/:version/resource`
  - `/api/resource` (backwards compat)

### Issue: CORS Errors

**Problem:** Browser blocks requests due to CORS

**Solution:**
- Services expect API Gateway to handle CORS
- For local development, you may need to enable CORS in each service

---

## Best Practices

1. **Use the new standard format** (`/:version/resource`) for new integrations
2. **Version your APIs** - Always include version in URL
3. **Handle pagination** - Use `meta` object for pagination info
4. **Check status codes** - Use appropriate HTTP status codes
5. **Validate inputs** - Check for validation errors in response
6. **Use access tokens** - Include `Authorization: Bearer <token>` header

---

## Summary

✅ All services now support: `/:version/resource`
✅ Backwards compatible with: `/api/:version/resource`
✅ Categories seeded with 4 categories matching product data
✅ Products API returns category field and pagination metadata
✅ Orders API returns consistent response structure
✅ Refresh token endpoint fixed with `client_secret`
✅ Image URLs updated to prevent 404 errors

The API is now fully standardized and production-ready!
