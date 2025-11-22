# OAuth2 and OpenID Connect Security Guide

This guide explains the OAuth2 and OpenID Connect implementation across all microservices.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authorization Server Setup](#authorization-server-setup)
4. [Authentication Flow](#authentication-flow)
5. [Service Security](#service-security)
6. [API Usage Examples](#api-usage-examples)
7. [Troubleshooting](#troubleshooting)

## Overview

The e-commerce platform is secured using:
- **OAuth2**: Industry-standard authorization framework
- **OpenID Connect**: Identity layer on top of OAuth2
- **JWT**: JSON Web Tokens for stateless authentication
- **Role-Based Access Control (RBAC)**: Admin, user roles

### Services

| Service | Port | Auth Required | Description |
|---------|------|---------------|-------------|
| Auth Server | 3000 | No | OAuth2/OIDC authorization server |
| Products | 3001 | Partial | Public read, admin write |
| Categories | 3002 | Partial | Public read, admin write |
| Users | 3003 | Yes | User management |
| Orders | 3004 | Yes | Order management |

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Authorization Request
       ▼
┌─────────────────────────┐
│   Auth Server (3000)    │
│  - User Login           │
│  - OAuth2/OIDC          │
│  - Token Generation     │
└──────┬──────────────────┘
       │
       │ 2. Access Token
       ▼
┌─────────────────────────┐
│   Microservices         │
│  - Products (3001)      │
│  - Categories (3002)    │
│  - Users (3003)         │
│  - Orders (3004)        │
└─────────────────────────┘
```

## Authorization Server Setup

### 1. Install Dependencies

```bash
cd services/auth
npm install
```

### 2. Configure Environment

Update [services/auth/.env.local](services/auth/.env.local):

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/auth_db
NODE_ENV=development

# IMPORTANT: Change these in production!
ACCESS_TOKEN_SECRET=your_access_token_secret_change_this_in_production
REFRESH_TOKEN_SECRET=your_refresh_token_secret_change_this_in_production
ID_TOKEN_SECRET=your_id_token_secret_change_this_in_production

ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
ID_TOKEN_EXPIRY=1h

ISSUER=http://localhost:3000
CLIENT_ID=ecommerce-client
CLIENT_SECRET=ecommerce-client-secret-change-this
```

### 3. Seed OAuth2 Client

```bash
cd services/auth
node utils/seedClient.js
```

### 4. Start Auth Server

```bash
npm run dev
```

## Authentication Flow

### 1. Authorization Code Flow (Recommended)

#### Step 1: User Registration
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword123",
  "name": "Admin User",
  "given_name": "Admin",
  "family_name": "User"
}
```

#### Step 2: Authorization Request
```bash
GET http://localhost:3000/auth/oauth/authorize?
  response_type=code&
  client_id=ecommerce-client&
  redirect_uri=http://localhost:3000/callback&
  scope=openid profile email&
  state=random_state_string
```

#### Step 3: User Login (Get Authorization Code)
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword123",
  "client_id": "ecommerce-client",
  "redirect_uri": "http://localhost:3000/callback",
  "scope": "openid profile email",
  "state": "random_state_string",
  "response_type": "code"
}
```

Response:
```json
{
  "message": "Login successful",
  "redirect_uri": "http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=random_state_string"
}
```

#### Step 4: Exchange Code for Tokens
```bash
POST http://localhost:3000/auth/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "ecommerce-client",
  "client_secret": "ecommerce-client-secret",
  "redirect_uri": "http://localhost:3000/callback"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "uuid-refresh-token",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "openid profile email"
}
```

### 2. Refresh Token Flow

```bash
POST http://localhost:3000/auth/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "uuid-refresh-token",
  "client_id": "ecommerce-client",
  "client_secret": "ecommerce-client-secret"
}
```

### 3. OpenID Connect UserInfo

```bash
GET http://localhost:3000/auth/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN
```

Response:
```json
{
  "sub": "user_id",
  "email": "admin@example.com",
  "email_verified": false,
  "name": "Admin User",
  "given_name": "Admin",
  "family_name": "User",
  "updated_at": "2025-01-18T00:00:00.000Z"
}
```

### 4. Token Revocation

```bash
POST http://localhost:3000/auth/oauth/revoke
Content-Type: application/json

{
  "token": "refresh_token_to_revoke",
  "token_type_hint": "refresh_token"
}
```

## Service Security

### Products Service (Port 3001)

**Public Endpoints** (no auth required):
- `GET /api/products` - View all products
- `GET /api/products/:id` - View product details

**Protected Endpoints** (admin only):
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories Service (Port 3002)

**Public Endpoints** (no auth required):
- `GET /api/categories` - View all categories
- `GET /api/categories/:id` - View category details

**Protected Endpoints** (admin only):
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Users Service (Port 3003)

**Public Endpoints**:
- `POST /api/users/register` - Register (deprecated - use auth service)
- `POST /api/users/login` - Login (deprecated - use auth service)

**Protected Endpoints**:
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user (self or admin)
- `PUT /api/users/:id` - Update user (self or admin)
- `DELETE /api/users/:id` - Delete user (admin only)

### Orders Service (Port 3004)

**All endpoints require authentication**:
- `GET /api/orders` - List all orders (admin only)
- `GET /api/orders/:id` - Get order details (authenticated)
- `GET /api/orders/user/:userId` - Get user orders (self or admin)
- `POST /api/orders` - Create order (authenticated)
- `PUT /api/orders/:id` - Update order (authenticated)
- `PATCH /api/orders/:id/status` - Update order status (admin only)
- `DELETE /api/orders/:id` - Delete order (admin only)

## API Usage Examples

### 1. Public Access (No Token)

```bash
# View products
curl http://localhost:3001/api/products

# View categories
curl http://localhost:3002/api/categories
```

### 2. Admin Operations

```bash
# Create product (admin only)
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "description": "Product description",
    "price": 99.99,
    "category": "electronics",
    "stock": 50
  }'

# Update category (admin only)
curl -X PUT http://localhost:3002/api/categories/CATEGORY_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category",
    "description": "Updated description",
    "slug": "updated-category"
  }'
```

### 3. User Operations

```bash
# Get user profile (self or admin)
curl http://localhost:3003/api/users/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Update user profile
curl -X PUT http://localhost:3003/api/users/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "+1234567890"
  }'
```

### 4. Order Operations

```bash
# Create order
curl -X POST http://localhost:3004/api/orders \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "productName": "Product Name",
        "quantity": 2,
        "price": 99.99
      }
    ],
    "totalAmount": 199.98,
    "paymentMethod": "credit_card",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'

# Get user's orders
curl http://localhost:3004/api/orders/user/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## OpenID Connect Discovery

Get server metadata:
```bash
curl http://localhost:3000/auth/.well-known/openid-configuration
```

Response includes:
- Authorization endpoint
- Token endpoint
- UserInfo endpoint
- Supported scopes
- Supported grant types
- And more...

## Token Structure

### Access Token (JWT)
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["user", "admin"],
  "scope": ["openid", "profile", "email"],
  "token_type": "access_token",
  "jti": "unique-token-id",
  "iss": "http://localhost:3000",
  "aud": "ecommerce-client",
  "exp": 1234567890,
  "iat": 1234567000
}
```

### ID Token (JWT)
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "email_verified": false,
  "name": "User Name",
  "given_name": "User",
  "family_name": "Name",
  "picture": null,
  "phone_number": "+1234567890",
  "phone_number_verified": false,
  "address": {},
  "updated_at": "2025-01-18T00:00:00.000Z",
  "token_type": "id_token",
  "iss": "http://localhost:3000",
  "aud": "ecommerce-client",
  "exp": 1234567890,
  "iat": 1234567000
}
```

## Middleware Usage

Each service has OAuth2 middleware with:

### `verifyAccessToken`
- Validates JWT signature
- Checks token expiration
- Verifies issuer

### `requireRole(...roles)`
- Checks if user has required role
- Example: `requireRole('admin')`

### `requireScope(...scopes)`
- Checks if token has required scope
- Example: `requireScope('openid', 'profile')`

### `optionalAuth`
- Authentication is optional
- Used for public endpoints that may show different data for authenticated users

### `requireSelfOrAdmin` (Users service)
- User can access their own resources
- Admin can access any resource

### `requireOwnerOrAdmin` (Orders service)
- User can access their own orders
- Admin can access any order

## Security Best Practices

1. **Change all secrets in production**
   - Use strong, randomly generated secrets
   - Store secrets in environment variables or secret management systems

2. **Use HTTPS in production**
   - Update ISSUER to use https://
   - Configure SSL/TLS certificates

3. **Token expiration**
   - Keep access tokens short-lived (15 minutes)
   - Use refresh tokens for long sessions
   - Implement token rotation

4. **Scope validation**
   - Request only necessary scopes
   - Validate scopes on resource servers

5. **CORS configuration**
   - Update ALLOWED_ORIGINS in production
   - Restrict to specific domains

6. **Rate limiting**
   - Implement rate limiting on auth endpoints
   - Prevent brute force attacks

7. **Audit logging**
   - Log authentication attempts
   - Monitor for suspicious activity

8. **Database security**
   - Use MongoDB authentication
   - Enable encryption at rest
   - Regular backups

## Troubleshooting

### "Invalid access token"
- Check if token is expired
- Verify ACCESS_TOKEN_SECRET matches across services
- Ensure ISSUER is correct

### "Insufficient scope"
- Request correct scopes during authorization
- Check middleware requirements

### "Access denied"
- Verify user has required role
- Check if user is accessing their own resource

### "Client not found"
- Run seed script: `node utils/seedClient.js`
- Verify CLIENT_ID in .env.local

### "MongoDB connection error"
- Ensure MongoDB is running
- Check MONGODB_URI

## Setup Checklist

- [ ] MongoDB running on localhost:27017
- [ ] Auth service dependencies installed
- [ ] OAuth2 client seeded
- [ ] All services have matching ACCESS_TOKEN_SECRET
- [ ] All services have matching ISSUER
- [ ] All services running on correct ports
- [ ] Test user registered
- [ ] Test tokens generated successfully

## Testing

### Full Authentication Test

```bash
# 1. Start all services
cd services/auth && npm run dev &
cd services/products && npm run dev &
cd services/categories && npm run dev &
cd services/users && npm run dev &
cd services/orders && npm run dev &

# 2. Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# 3. Login and get authorization code
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"test123",
    "client_id":"ecommerce-client",
    "redirect_uri":"http://localhost:3000/callback",
    "scope":"openid profile email"
  }'

# 4. Exchange code for tokens (use code from step 3)
curl -X POST http://localhost:3000/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type":"authorization_code",
    "code":"CODE_FROM_STEP_3",
    "client_id":"ecommerce-client",
    "client_secret":"ecommerce-client-secret",
    "redirect_uri":"http://localhost:3000/callback"
  }'

# 5. Use access token to access protected resources
curl http://localhost:3001/api/products \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Production Deployment

1. Use environment-specific secrets
2. Enable HTTPS everywhere
3. Configure proper CORS origins
4. Set up monitoring and logging
5. Implement rate limiting
6. Use connection pooling
7. Enable database authentication
8. Regular security audits
9. Implement refresh token rotation
10. Set up proper backup strategy

## Additional Resources

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
