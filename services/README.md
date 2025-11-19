# Microservices Architecture - Production Ready with API Versioning

This project contains a secure, production-ready e-commerce platform with OAuth2/OpenID Connect authentication, API versioning (v1), and comprehensive security features.

## 🚀 Quick Start

```bash
cd services
./setup.sh      # Install dependencies and seed OAuth client
./start-all.sh  # Start all services
```

## 📋 Services Overview

| Service | Port | Database | API Version | Description | Auth Required |
|---------|------|----------|-------------|-------------|---------------|
| Auth Server | 3000 | auth_db | v1 | OAuth2/OIDC authorization server | No |
| Products | 3001 | products_db | v1 | Product catalog management | Partial |
| Categories | 3002 | categories_db | v1 | Category management | Partial |
| Users | 3003 | users_db | v1 | User profile management | Yes |
| Orders | 3004 | orders_db | v1 | Order processing | Yes |

## ✨ Features

### Security
- ✅ **OAuth2 Authorization Framework**: Industry-standard authorization
- ✅ **OpenID Connect**: Identity layer for authentication
- ✅ **JWT Tokens**: Stateless, secure token-based authentication
- ✅ **Role-Based Access Control (RBAC)**: Admin and user roles
- ✅ **Protected Endpoints**: Fine-grained access control per service
- ✅ **Rate Limiting**: Brute-force protection (production: 100 req/15min, auth: 5 req/15min)
- ✅ **Helmet Security Headers**: XSS, clickjacking, and other attack protection
- ✅ **CORS Configuration**: Configurable origin restrictions
- ✅ **Request Size Limits**: 10MB limit on request bodies

### API Versioning
- ✅ **URL-based Versioning**: `/api/v1/endpoint`
- ✅ **Backwards Compatibility**: Unversioned endpoints default to v1
- ✅ **Version Headers**: `X-API-Version` in all responses
- ✅ **Deprecation Support**: Graceful version sunset with warnings

### Production Ready
- ✅ **Compression**: Response compression for bandwidth optimization
- ✅ **Graceful Shutdown**: Proper SIGTERM handling
- ✅ **Health Checks**: Enhanced health endpoints with metadata
- ✅ **Error Handling**: Production-safe error messages
- ✅ **Environment-based Configuration**: Development vs Production modes
- ✅ **404 Handling**: Consistent not-found responses
- ✅ **Logging Ready**: Structured for winston/morgan integration

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [OAUTH2_SECURITY_GUIDE.md](OAUTH2_SECURITY_GUIDE.md) | Comprehensive OAuth2/OIDC guide |
| [API_VERSIONING_GUIDE.md](API_VERSIONING_GUIDE.md) | API versioning implementation |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) | Production deployment guide |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick command reference |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Implementation details |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Visual architecture diagrams |

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Steps

1. **Clone and navigate**
   ```bash
   cd services
   ```

2. **Install dependencies**
   ```bash
   ./setup.sh
   ```

   Or manually:
   ```bash
   cd auth && npm install && cd ..
   cd products && npm install && cd ..
   cd categories && npm install && cd ..
   cd users && npm install && cd ..
   cd orders && npm install && cd ..
   ```

3. **Configure environment** (optional for development)
   ```bash
   # Default .env.local files are already configured
   # For production, see PRODUCTION_DEPLOYMENT_GUIDE.md
   ```

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Start services**
   ```bash
   ./start-all.sh
   ```

   Or manually:
   ```bash
   # Terminal 1 - Auth Service
   cd auth && npm run dev

   # Terminal 2 - Products Service
   cd products && npm run dev

   # Terminal 3 - Categories Service
   cd categories && npm run dev

   # Terminal 4 - Users Service
   cd users && npm run dev

   # Terminal 5 - Orders Service
   cd orders && npm run dev
   ```

## 🔌 API Endpoints

### API Versioning

All endpoints support versioned URLs:
```bash
# Versioned (recommended)
GET http://localhost:3001/api/v1/products

# Backwards compatible (defaults to v1)
GET http://localhost:3001/api/products
```

### Auth Service (Port 3000)

```bash
# User Registration
POST /api/v1/auth/register

# OAuth2 Authorization
GET  /api/v1/auth/oauth/authorize

# User Login (get authorization code)
POST /api/v1/auth/login

# Token Exchange
POST /api/v1/auth/oauth/token

# UserInfo (OpenID Connect)
GET  /api/v1/auth/oauth/userinfo

# Token Revocation
POST /api/v1/auth/oauth/revoke

# OpenID Connect Discovery
GET  /api/v1/auth/.well-known/openid-configuration
```

### Products Service (Port 3001)

```bash
# Public - No authentication required
GET  /api/v1/products              # List all products
GET  /api/v1/products/:id          # Get product details

# Protected - Admin only
POST   /api/v1/products            # Create product
PUT    /api/v1/products/:id        # Update product
DELETE /api/v1/products/:id        # Delete product
```

### Categories Service (Port 3002)

```bash
# Public - No authentication required
GET  /api/v1/categories            # List all categories
GET  /api/v1/categories/:id        # Get category details

# Protected - Admin only
POST   /api/v1/categories          # Create category
PUT    /api/v1/categories/:id      # Update category
DELETE /api/v1/categories/:id      # Delete category
```

### Users Service (Port 3003)

```bash
# Public (deprecated - use auth service)
POST /api/v1/users/register        # Register user
POST /api/v1/users/login           # Login user

# Protected
GET    /api/v1/users               # List users (admin only)
GET    /api/v1/users/:id           # Get user (self or admin)
PUT    /api/v1/users/:id           # Update user (self or admin)
DELETE /api/v1/users/:id           # Delete user (admin only)
```

### Orders Service (Port 3004)

```bash
# All endpoints require authentication
GET    /api/v1/orders                   # List all (admin only)
GET    /api/v1/orders/:id               # Get order details
GET    /api/v1/orders/user/:userId      # Get user orders (self or admin)
POST   /api/v1/orders                   # Create order
PUT    /api/v1/orders/:id               # Update order
PATCH  /api/v1/orders/:id/status        # Update status (admin only)
DELETE /api/v1/orders/:id               # Delete order (admin only)
```

## 🔐 Authentication Flow

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

### 2. Login & Get Authorization Code

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "client_id": "ecommerce-client",
    "redirect_uri": "http://localhost:3000/callback",
    "scope": "openid profile email"
  }'
```

### 3. Exchange Code for Tokens

```bash
curl -X POST http://localhost:3000/api/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR_AUTHORIZATION_CODE",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-client-secret",
    "redirect_uri": "http://localhost:3000/callback"
  }'
```

### 4. Use Access Token

```bash
curl http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🏗️ Project Structure

```
services/
├── auth/                          # OAuth2/OIDC Server
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   │   ├── apiVersion.js         # API versioning
│   │   └── oauth2Middleware.js   # OAuth2 auth
│   ├── models/
│   ├── routes/
│   │   └── v1/                   # Version 1 routes
│   ├── utils/
│   ├── .env.local
│   ├── package.json
│   └── server.js
├── products/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   │   ├── apiVersion.js
│   │   └── auth.js
│   ├── models/
│   ├── routes/
│   │   └── v1/
│   └── ...
├── (similar structure for categories, users, orders)
├── README.md
├── API_VERSIONING_GUIDE.md
├── OAUTH2_SECURITY_GUIDE.md
├── PRODUCTION_DEPLOYMENT_GUIDE.md
├── .env.production.template
├── setup.sh
├── start-all.sh
└── stop-all.sh
```

## 🧪 Testing

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health  # Auth
curl http://localhost:3001/health  # Products
curl http://localhost:3002/health  # Categories
curl http://localhost:3003/health  # Users
curl http://localhost:3004/health  # Orders
```

Expected response:
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

### Full Authentication Test

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md#quick-test-sequence) for complete test sequence.

## 🔄 Rate Limiting

### Development Mode
- General API: 1000 requests/15min
- Auth endpoints: 100 requests/15min

### Production Mode
- General API: 100 requests/15min
- Auth endpoints: 5 requests/15min

Rate limit headers in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1234567890
```

## 🌍 Environment Variables

### Development (.env.local)
Already configured with sensible defaults.

### Production (.env.production)
See [.env.production.template](.env.production.template) for template.

**Critical changes needed for production:**
- Change all secrets (ACCESS_TOKEN_SECRET, etc.)
- Update ISSUER to production HTTPS URL
- Configure ALLOWED_ORIGINS
- Use MongoDB Atlas or secured MongoDB instance

## 🚀 Production Deployment

See [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) for complete guide including:
- Security hardening
- SSL/TLS configuration
- Database setup
- Load balancing
- Monitoring
- CI/CD pipeline
- Backup & recovery

### Quick Production Checklist
- [ ] Generate secure secrets (64+ characters)
- [ ] Configure MongoDB Atlas or secure MongoDB
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Restrict CORS to production domains
- [ ] Set NODE_ENV=production
- [ ] Enable MongoDB authentication
- [ ] Set up monitoring & alerts
- [ ] Configure automated backups
- [ ] Test disaster recovery procedures

## 📊 Monitoring

### Built-in Health Endpoints
Each service provides `/health` endpoint with:
- Service status
- Version information
- Environment
- Timestamp

### Recommended Tools
- **PM2**: Process management and monitoring
- **Prometheus + Grafana**: Metrics and dashboards
- **ELK Stack**: Centralized logging
- **New Relic/DataDog**: APM

## 🛡️ Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate secrets regularly** - Especially in production
3. **Use HTTPS everywhere** - Enable SSL/TLS
4. **Monitor for suspicious activity** - Set up alerts
5. **Keep dependencies updated** - Regular security patches
6. **Implement proper logging** - But don't log sensitive data
7. **Regular security audits** - Automated and manual
8. **Follow principle of least privilege** - Minimal permissions

## 🔧 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check if MongoDB is running
pgrep mongod

# Check if ports are available
lsof -i :3000
```

**Authentication fails:**
```bash
# Verify secrets match across services
grep ACCESS_TOKEN_SECRET services/*/.env.local

# Check if OAuth client is seeded
cd services/auth && node utils/seedClient.js
```

**Rate limit errors:**
```bash
# In development, limits are high (1000 req/15min)
# Check X-RateLimit headers in response
# Wait for rate limit window to reset
```

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md#troubleshooting) for more troubleshooting tips.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
- Check documentation in this repository
- Review [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- See [TROUBLESHOOTING](QUICK_REFERENCE.md#troubleshooting)

## 🎯 Roadmap

### v1 (Current - Production Ready)
- ✅ OAuth2/OpenID Connect
- ✅ API Versioning
- ✅ Production-ready security
- ✅ Comprehensive documentation

### v2 (Planned)
- [ ] GraphQL support
- [ ] Webhook subscriptions
- [ ] Enhanced filtering & pagination
- [ ] Bulk operations API
- [ ] Real-time notifications (WebSockets)
- [ ] Advanced analytics endpoints

## 🏆 Credits

Built with:
- Node.js & Express
- MongoDB & Mongoose
- JWT (jsonwebtoken)
- Helmet (security)
- Express Rate Limit
- Compression

## 📖 Additional Resources

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [API Versioning Best Practices](https://restfulapi.net/versioning/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
