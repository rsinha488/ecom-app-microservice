# API Analysis - LaunchpadMERN E-Commerce Platform

**Date:** 2025-11-19
**Purpose:** Complete analysis of all APIs before implementing Swagger documentation

---

## 📊 Services Overview

| Service | Port | Routes File | Endpoints | Auth Required | Swagger Status |
|---------|------|-------------|-----------|---------------|----------------|
| **Auth** | 3000 | authRoutes.js | 7 | Partial | ✅ Exists (partial) |
| **Products** | 3001 | productRoutes.js | 5 | Partial | ❌ Missing |
| **Categories** | 3002 | categoryRoutes.js | 5 | Partial | ❌ Missing |
| **Users** | 3003 | userRoutes.js | 6 | Partial | ❌ Missing |
| **Orders** | 3004 | orderRoutes.js | 7 | Yes | ❌ Missing |

**Total Endpoints: 30 across 5 services**

---

## 🔍 Detailed API Analysis

### 1. Auth Service (Port 3000)

**Base Path:** `/api/v1/auth`

#### Endpoints:

| Method | Path | Controller | Auth | Description |
|--------|------|------------|------|-------------|
| POST | `/register` | authController.register | ❌ Public | Register new user |
| GET | `/oauth/authorize` | authController.authorize | ❌ Public | OAuth2 authorization |
| POST | `/login` | authController.login | ❌ Public | Login and get auth code |
| POST | `/oauth/token` | authController.token | ❌ Public | Exchange code for tokens |
| GET | `/oauth/userinfo` | authController.userinfo | ✅ Bearer Token | Get user info (OIDC) |
| POST | `/oauth/revoke` | authController.revoke | ✅ Bearer Token | Revoke token/logout |
| GET | `/.well-known/openid-configuration` | authController.discovery | ❌ Public | OIDC discovery |

#### Request/Response Models:

**Register:**
```json
Request: {
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "given_name": "John",      // optional
  "family_name": "Doe"        // optional
}

Response: {
  "message": "User registered successfully",
  "user": { User object }
}
```

**Login:**
```json
Request: {
  "email": "user@example.com",
  "password": "password123",
  "client_id": "ecommerce-client",
  "redirect_uri": "http://localhost:3006/callback",
  "scope": "openid profile email"
}

Response: {
  "code": "abc123xyz789",
  "redirect_uri": "http://localhost:3006/callback"
}
```

**Token Exchange:**
```json
Request (Authorization Code): {
  "grant_type": "authorization_code",
  "code": "abc123xyz789",
  "client_id": "ecommerce-client",
  "client_secret": "ecommerce-secret",
  "redirect_uri": "http://localhost:3006/callback"
}

Request (Refresh Token): {
  "grant_type": "refresh_token",
  "refresh_token": "a1b2c3...",
  "client_id": "ecommerce-client"
}

Response: {
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "a1b2c3...",
  "id_token": "eyJhbG..."
}
```

#### Swagger Status:
- ✅ Swagger docs exist in `authRoutes.swagger.js`
- ⚠️ Not integrated with Swagger UI yet
- ⚠️ Schemas need to be defined in components

---

### 2. Products Service (Port 3001)

**Base Path:** `/api/v1/products`

#### Endpoints:

| Method | Path | Controller | Auth | Role | Description |
|--------|------|------------|------|------|-------------|
| GET | `/` | getAllProducts | 🔓 Optional | Any | List all products (paginated) |
| GET | `/:id` | getProductById | 🔓 Optional | Any | Get single product |
| POST | `/` | createProduct | ✅ Required | Admin | Create new product |
| PUT | `/:id` | updateProduct | ✅ Required | Admin | Update product |
| DELETE | `/:id` | deleteProduct | ✅ Required | Admin | Delete product |

#### Query Parameters (GET /):
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `category`: string (filter by category)
- `minPrice`: number
- `maxPrice`: number
- `inStock`: boolean
- `search`: string (search in name/description)
- `sort`: string (e.g., "price", "-price", "createdAt")

#### Product Model:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Wireless Bluetooth Headphones",
  "description": "Premium noise-cancelling...",
  "price": 129.99,
  "category": "Electronics",
  "stock": 50,
  "imageUrl": "https://example.com/image.jpg",
  "sku": "ELEC-HEAD-001",
  "brand": "AudioTech",
  "tags": ["wireless", "bluetooth", "noise-cancelling"],
  "inStock": true,
  "rating": 4.5,
  "reviewCount": 234,
  "isActive": true,
  "createdAt": "2025-11-19T10:20:47.593Z",
  "updatedAt": "2025-11-19T10:20:47.593Z"
}
```

#### Response Format (GET /):
```json
[
  { Product object },
  { Product object },
  ...
]
```

#### Swagger Status:
- ❌ No Swagger docs
- ❌ No swagger-jsdoc package installed

---

### 3. Categories Service (Port 3002)

**Base Path:** `/api/v1/categories`

#### Endpoints:

| Method | Path | Controller | Auth | Role | Description |
|--------|------|------------|------|------|-------------|
| GET | `/` | getAllCategories | 🔓 Optional | Any | List all categories |
| GET | `/:id` | getCategoryById | 🔓 Optional | Any | Get single category |
| POST | `/` | createCategory | ✅ Required | Admin | Create new category |
| PUT | `/:id` | updateCategory | ✅ Required | Admin | Update category |
| DELETE | `/:id` | deleteCategory | ✅ Required | Admin | Delete category |

#### Category Model:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Electronics",
  "description": "Electronic devices, gadgets, and accessories",
  "slug": "electronics",
  "parentCategory": null,
  "isActive": true,
  "order": 1,
  "imageUrl": "https://images.unsplash.com/...",
  "productCount": 15,
  "createdAt": "2025-11-19T10:20:47.593Z",
  "updatedAt": "2025-11-19T10:20:47.593Z"
}
```

#### Response Format (GET /):
```json
[
  { Category object },
  { Category object },
  ...
]
```

#### Swagger Status:
- ❌ No Swagger docs
- ❌ No swagger-jsdoc package installed

---

### 4. Users Service (Port 3003)

**Base Path:** `/api/v1/users`

#### Endpoints:

| Method | Path | Controller | Auth | Role | Description |
|--------|------|------------|------|------|-------------|
| POST | `/register` | registerUser | ❌ Public | Any | Register (deprecated, use auth service) |
| POST | `/login` | loginUser | ❌ Public | Any | Login (deprecated, use auth service) |
| GET | `/` | getAllUsers | ✅ Required | Admin | List all users |
| GET | `/:id` | getUserById | ✅ Required | Self or Admin | Get user by ID |
| PUT | `/:id` | updateUser | ✅ Required | Self or Admin | Update user |
| DELETE | `/:id` | deleteUser | ✅ Required | Admin | Delete user |

#### User Model:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://example.com/avatar.jpg",
  "email_verified": true,
  "phone_number": "+1234567890",
  "roles": ["user"],
  "isActive": true,
  "createdAt": "2025-11-19T10:20:47.593Z",
  "updatedAt": "2025-11-19T10:20:47.593Z"
}
```

#### Swagger Status:
- ❌ No Swagger docs
- ❌ No swagger-jsdoc package installed

---

### 5. Orders Service (Port 3004)

**Base Path:** `/api/v1/orders`

#### Endpoints:

| Method | Path | Controller | Auth | Role | Description |
|--------|------|------------|------|------|-------------|
| GET | `/` | getAllOrders | ✅ Required | Admin | List all orders |
| GET | `/:id` | getOrderById | ✅ Required | Any Auth | Get order by ID |
| GET | `/user/:userId` | getOrdersByUserId | ✅ Required | Owner or Admin | Get user's orders |
| POST | `/` | createOrder | ✅ Required | Any Auth | Create new order |
| PUT | `/:id` | updateOrder | ✅ Required | Any Auth | Update order |
| PATCH | `/:id/status` | updateOrderStatus | ✅ Required | Admin | Update order status |
| DELETE | `/:id` | deleteOrder | ✅ Required | Admin | Delete order |

#### Order Model:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "orderNumber": "ORD-1732024847593-AB12",
  "items": [
    {
      "productId": "691d99ff4a0e73e090b83cd8",
      "productName": "Wireless Bluetooth Headphones",
      "quantity": 2,
      "price": 129.99
    }
  ],
  "totalAmount": 259.98,
  "status": "pending",  // pending, processing, shipped, delivered, cancelled
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentStatus": "paid",  // pending, paid, failed, refunded
  "paymentMethod": "credit_card",  // credit_card, debit_card, paypal, cash_on_delivery
  "trackingNumber": "TRACK123456",
  "shippedAt": "2025-11-20T10:20:47.593Z",
  "deliveredAt": null,
  "cancelledAt": null,
  "createdAt": "2025-11-19T10:20:47.593Z",
  "updatedAt": "2025-11-19T10:20:47.593Z"
}
```

#### Response Format (GET /user/:userId):
```json
[
  { Order object },
  { Order object },
  ...
]
```

#### WebSocket Events:
The Orders service emits real-time events via Socket.io:
- `orderCreated` - When new order is created
- `orderUpdated` - When order is updated
- `orderStatusChanged` - When status changes
- `orderShipped` - When order is marked as shipped
- `orderDelivered` - When order is delivered
- `orderCancelled` - When order is cancelled

#### Swagger Status:
- ❌ No Swagger docs
- ❌ No swagger-jsdoc package installed

---

## 🔐 Authentication & Authorization

### Authentication Methods:
1. **OAuth2 Authorization Code Flow** (Primary)
   - Login → Get authorization code → Exchange for tokens
   - Access token (JWT, 1 hour expiry)
   - Refresh token (UUID, 30 days expiry)
   - ID token (OIDC)

2. **Bearer Token** (API calls)
   - Header: `Authorization: Bearer <access_token>`
   - Middleware: `verifyAccessToken`

### Authorization Roles:
- **Admin:** Full access to all endpoints
- **User:** Limited access to own resources
- **Public:** Access to public endpoints only

### Middleware:
- `optionalAuth`: Allows both authenticated and anonymous access
- `verifyAccessToken`: Requires valid access token
- `requireRole(role)`: Requires specific role
- `requireSelfOrAdmin`: User can only access own resources (or admin)
- `requireOwnerOrAdmin`: Similar to requireSelfOrAdmin for orders

---

## 🎯 Swagger Implementation Plan

### Required Dependencies:
```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0"
}
```

### Implementation Strategy:

#### 1. **Shared Components** (All Services)
Create reusable Swagger components:
- Security schemes (Bearer Auth, OAuth2)
- Common responses (Error, Validation Error, Unauthorized)
- Common parameters (page, limit, sort)

#### 2. **Service-Specific Setup** (Each Service)
1. Install dependencies
2. Create `swagger.config.js`
3. Create route-specific swagger docs
4. Integrate with server.js
5. Expose UI at `/api-docs`

#### 3. **Swagger UI Access Points:**
- Auth: http://localhost:3000/api-docs
- Products: http://localhost:3001/api-docs
- Categories: http://localhost:3002/api-docs
- Users: http://localhost:3003/api-docs
- Orders: http://localhost:3004/api-docs

#### 4. **API Gateway Integration:**
- Aggregate all service docs at http://localhost:8080/api-docs
- Use swagger aggregator or custom solution

---

## 📝 Documentation Requirements

### Each Endpoint Needs:
1. **Tags** - Group related endpoints
2. **Summary** - Brief description
3. **Description** - Detailed explanation
4. **Parameters** - Path, query, header params
5. **RequestBody** - For POST/PUT/PATCH
6. **Responses** - All possible response codes
7. **Security** - Auth requirements
8. **Examples** - Request/response examples

### Schema Definitions Needed:
1. Product
2. Category
3. User
4. Order
5. OrderItem
6. ShippingAddress
7. TokenResponse
8. Error
9. ValidationError
10. PaginatedResponse

---

## 🚀 Next Steps

### Phase 1: Setup (All Services)
- [ ] Install swagger-jsdoc and swagger-ui-express in all services
- [ ] Create swagger.config.js for each service
- [ ] Integrate Swagger UI in server.js

### Phase 2: Documentation (Service by Service)
- [x] Auth Service - Already has partial docs
- [ ] Products Service - 5 endpoints
- [ ] Categories Service - 5 endpoints
- [ ] Users Service - 6 endpoints
- [ ] Orders Service - 7 endpoints

### Phase 3: Testing
- [ ] Test each Swagger UI independently
- [ ] Test with actual API calls from Swagger UI
- [ ] Verify authentication works
- [ ] Test all request/response examples

### Phase 4: Integration
- [ ] Aggregate docs via API Gateway
- [ ] Create unified documentation
- [ ] Add to project README

---

## 📊 Complexity Estimate

| Service | Endpoints | Schemas | Estimated Time |
|---------|-----------|---------|----------------|
| Auth | 7 | 5 | 1 hour (mostly done) |
| Products | 5 | 2 | 1.5 hours |
| Categories | 5 | 1 | 1 hour |
| Users | 6 | 1 | 1 hour |
| Orders | 7 | 3 | 2 hours |
| Integration | - | - | 1 hour |
| **Total** | **30** | **12** | **~7.5 hours** |

---

## 🎨 Swagger UI Features to Implement

1. **Try it out** - Interactive API testing
2. **Authentication** - OAuth2 flow in UI
3. **Examples** - Multiple request/response examples
4. **Models** - Expandable schema definitions
5. **Servers** - Multiple environment support (dev, staging, prod)

---

## ✅ Best Practices

1. **Versioning:** All APIs are under `/api/v1`
2. **Consistency:** Use same error format across all services
3. **Examples:** Provide real, working examples
4. **Security:** Document all security requirements
5. **Models:** Reuse schema definitions
6. **Validation:** Document all validation rules
7. **Pagination:** Document pagination for list endpoints
8. **Filtering:** Document all filter parameters

---

**Ready to implement Swagger documentation across all services! 🚀**

**This analysis will guide the implementation of comprehensive API documentation.**
