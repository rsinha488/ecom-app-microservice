# Quick Reference Guide

## Setup & Start

### Initial Setup
```bash
cd services
./setup.sh
```

### Start All Services
```bash
./start-all.sh
```

### Stop All Services
```bash
./stop-all.sh
```

### Start Individual Service
```bash
cd services/auth
npm run dev
```

## Authentication Flow

### 1. Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### 2. Login & Get Authorization Code
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "client_id": "ecommerce-client",
    "redirect_uri": "http://localhost:3000/callback",
    "scope": "openid profile email"
  }'
```

### 3. Exchange Code for Tokens
```bash
curl -X POST http://localhost:3000/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR_AUTH_CODE",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-client-secret",
    "redirect_uri": "http://localhost:3000/callback"
  }'
```

### 4. Use Access Token
```bash
curl http://localhost:3001/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common Operations

### Products (Port 3001)

```bash
# List all products (public)
curl http://localhost:3001/products

# Get product by ID (public)
curl http://localhost:3001/products/PRODUCT_ID

# Create product (admin only)
curl -X POST http://localhost:3001/products \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "category": "electronics",
    "stock": 50
  }'

# Update product (admin only)
curl -X PUT http://localhost:3001/products/PRODUCT_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 899.99}'

# Delete product (admin only)
curl -X DELETE http://localhost:3001/products/PRODUCT_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Categories (Port 3002)

```bash
# List all categories (public)
curl http://localhost:3002/categories

# Create category (admin only)
curl -X POST http://localhost:3002/categories \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices",
    "slug": "electronics"
  }'
```

### Users (Port 3003)

```bash
# Get all users (admin only)
curl http://localhost:3003/users \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Get user by ID (self or admin)
curl http://localhost:3003/users/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Update user (self or admin)
curl -X PUT http://localhost:3003/users/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "phone": "+1234567890"}'
```

### Orders (Port 3004)

```bash
# Create order (authenticated)
curl -X POST http://localhost:3004/orders \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "productName": "Laptop",
        "quantity": 1,
        "price": 999.99
      }
    ],
    "totalAmount": 999.99,
    "paymentMethod": "credit_card",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'

# Get user's orders (self or admin)
curl http://localhost:3004/orders/user/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Update order status (admin only)
curl -X PATCH http://localhost:3004/orders/ORDER_ID/status \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

## Health Checks

```bash
# Check all services
curl http://localhost:3000/health  # Auth
curl http://localhost:3001/health  # Products
curl http://localhost:3002/health  # Categories
curl http://localhost:3003/health  # Users
curl http://localhost:3004/health  # Orders
```

## OpenID Connect

### Discovery
```bash
curl http://localhost:3000/auth/.well-known/openid-configuration
```

### UserInfo Endpoint
```bash
curl http://localhost:3000/auth/oauth/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Token Revocation
```bash
curl -X POST http://localhost:3000/auth/oauth/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "REFRESH_TOKEN",
    "token_type_hint": "refresh_token"
  }'
```

## Environment Variables

### Auth Service (.env.local)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/auth_db
ACCESS_TOKEN_SECRET=your_secret_here
REFRESH_TOKEN_SECRET=your_secret_here
ID_TOKEN_SECRET=your_secret_here
ISSUER=http://localhost:3000
CLIENT_ID=ecommerce-client
CLIENT_SECRET=ecommerce-client-secret
```

### Other Services (.env.local)
```env
PORT=300X
MONGODB_URI=mongodb://localhost:27017/service_db
ACCESS_TOKEN_SECRET=same_as_auth_service
ISSUER=http://localhost:3000
```

## Roles & Permissions

| Role | Products | Categories | Users | Orders |
|------|----------|------------|-------|--------|
| **Anonymous** | Read | Read | - | - |
| **User** | Read | Read | Self | Self |
| **Admin** | All | All | All | All |

## Token Lifetimes

| Token Type | Default Lifetime | Configurable |
|------------|------------------|--------------|
| Access Token | 15 minutes | ACCESS_TOKEN_EXPIRY |
| Refresh Token | 7 days | REFRESH_TOKEN_EXPIRY |
| ID Token | 1 hour | ID_TOKEN_EXPIRY |
| Authorization Code | 10 minutes | Fixed |

## Common Errors

### 401 Unauthorized
- Missing or invalid access token
- Token expired

**Solution**: Get a new access token

### 403 Forbidden
- Insufficient permissions
- Wrong role

**Solution**: Ensure user has required role

### 404 Not Found
- Resource doesn't exist
- Wrong endpoint

**Solution**: Check resource ID and endpoint URL

### 500 Server Error
- Service is down
- Database connection issue

**Solution**: Check service logs and MongoDB

## Logs & Debugging

### View Service Logs
```bash
# If using start-all.sh
tail -f logs/auth.log
tail -f logs/products.log
tail -f logs/categories.log
tail -f logs/users.log
tail -f logs/orders.log
```

### MongoDB Shell
```bash
# Connect to MongoDB
mongosh

# List databases
show dbs

# Use specific database
use auth_db

# List collections
show collections

# Query users
db.users.find().pretty()

# Query clients
db.clients.find().pretty()
```

## Troubleshooting

### Services won't start
1. Check if MongoDB is running: `pgrep mongod`
2. Check if ports are available: `lsof -i :3000`
3. Check for error logs

### Authentication fails
1. Verify secrets match in all services
2. Check ISSUER configuration
3. Verify client is seeded: `node services/auth/utils/seedClient.js`

### Token validation fails
1. Ensure ACCESS_TOKEN_SECRET is the same in all services
2. Check token hasn't expired
3. Verify ISSUER matches

## Quick Test Sequence

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'

# 3. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"test123",
    "client_id":"ecommerce-client",
    "redirect_uri":"http://localhost:3000/callback",
    "scope":"openid profile email"
  }'

# 4. Get tokens (use code from step 3)
curl -X POST http://localhost:3000/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type":"authorization_code",
    "code":"CODE_HERE",
    "client_id":"ecommerce-client",
    "client_secret":"ecommerce-client-secret",
    "redirect_uri":"http://localhost:3000/callback"
  }'

# 5. Test protected endpoint
curl http://localhost:3001/products \
  -H "Authorization: Bearer TOKEN_HERE"
```

## Port Reference

| Service | Port | Protocol |
|---------|------|----------|
| Auth | 3000 | HTTP |
| Products | 3001 | HTTP |
| Categories | 3002 | HTTP |
| Users | 3003 | HTTP |
| Orders | 3004 | HTTP |
| MongoDB | 27017 | TCP |

## Documentation Links

- Main README: [README.md](README.md)
- Security Guide: [OAUTH2_SECURITY_GUIDE.md](OAUTH2_SECURITY_GUIDE.md)
- This Guide: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
