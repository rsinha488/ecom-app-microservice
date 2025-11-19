# API Gateway Setup Guide

## Overview

Your e-commerce application now uses an **Nginx API Gateway** as a single entry point for all microservices.

### Architecture Before vs After

**Before (Direct Microservice Access):**
```
Frontend → Auth Service (3000)
        → Products Service (3001)
        → Categories Service (3002)
        → Users Service (3003)
        → Orders Service (3004)
```

**After (API Gateway):**
```
Frontend → API Gateway (8080) → Auth Service (3000)
                              → Products Service (3001)
                              → Categories Service (3002)
                              → Users Service (3003)
                              → Orders Service (3004)
```

## Benefits

✅ **Single Entry Point** - Frontend only needs one URL: `http://localhost:8080`
✅ **Rate Limiting** - Prevents API abuse and overload
✅ **Centralized CORS** - No need to configure CORS on each service
✅ **Security Headers** - Adds security headers to all responses
✅ **Request Logging** - Centralized access and error logs
✅ **Load Balancing** - Ready for scaling services horizontally
✅ **Service Discovery** - Easy to add/remove backend services

## Quick Start

### 1. Start All Backend Services

```bash
cd services
./start-all.sh
```

Verify all services are running:
```bash
curl http://localhost:3000/health  # Auth
curl http://localhost:3001/health  # Products
curl http://localhost:3002/health  # Categories
curl http://localhost:3003/health  # Users
curl http://localhost:3004/health  # Orders
```

### 2. Start API Gateway

```bash
cd api-gateway
./start-gateway.sh
```

Expected output:
```
✅ API Gateway is running successfully!
================================
Gateway URL: http://localhost:8080
Health Check: http://localhost:8080/health
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will now use the API Gateway (port 8080) for all API calls.

### 4. Access Application

Open your browser and navigate to:
```
http://localhost:3006
```

## API Routes

All API calls now go through the gateway at **port 8080**:

| Endpoint | Gateway URL | Backend Service |
|----------|-------------|-----------------|
| Auth | `http://localhost:8080/api/v1/auth` | Port 3000 |
| Products | `http://localhost:8080/api/v1/products` | Port 3001 |
| Categories | `http://localhost:8080/api/v1/categories` | Port 3002 |
| Users | `http://localhost:8080/api/v1/users` | Port 3003 |
| Orders | `http://localhost:8080/api/v1/orders` | Port 3004 |

## Testing the Gateway

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{"status":"healthy","gateway":"nginx"}
```

### Test Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ruchi@yopmail.com","password":"Ruchi@123"}'
```

### Test Products

```bash
curl http://localhost:8080/api/v1/products
```

### Test with Authentication

```bash
# Get access token from login
TOKEN="your_access_token_here"

# Get user info
curl http://localhost:8080/api/v1/auth/oauth/userinfo \
  -H "Authorization: Bearer $TOKEN"
```

## Configuration

### Rate Limiting

The gateway has built-in rate limiting:

- **Auth endpoints**: 5 requests/second (burst: 20)
- **Other API endpoints**: 10 requests/second (burst: 30)

To modify, edit `api-gateway/nginx/nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
```

### CORS Configuration

Currently allows requests from:
- `http://localhost:3006` (Frontend)

To add more origins, edit `api-gateway/nginx/nginx.conf`:

```nginx
add_header Access-Control-Allow-Origin "http://localhost:3006" always;
```

### Timeouts

Default timeouts:
- Connection: 30-60 seconds
- Read: 30-60 seconds
- Send: 30-60 seconds

## Management Commands

### Start Gateway

```bash
cd api-gateway
./start-gateway.sh
```

### Stop Gateway

```bash
cd api-gateway
./stop-gateway.sh
```

### View Logs

```bash
# Docker logs (live)
docker logs -f api-gateway

# Access logs
tail -f api-gateway/logs/access.log

# Error logs
tail -f api-gateway/logs/error.log
```

### Restart Gateway

```bash
cd api-gateway
./stop-gateway.sh && ./start-gateway.sh
```

## Frontend Configuration

The frontend environment variables have been updated to use the gateway:

**File**: `frontend/.env.local`

```env
# API Gateway (Single Entry Point)
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080

# All services now point to gateway
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:8080
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:8080
NEXT_PUBLIC_USERS_URL=http://localhost:8080
NEXT_PUBLIC_ORDERS_URL=http://localhost:8080
```

## Complete Startup Sequence

Follow this order to start the complete system:

```bash
# 1. Start MongoDB (if not already running)
mongod

# 2. Start all backend microservices
cd services
./start-all.sh

# 3. Start API Gateway
cd ../api-gateway
./start-gateway.sh

# 4. Start Frontend
cd ../frontend
npm run dev
```

## Verification Checklist

After starting everything, verify:

- [ ] All backend services are healthy (ports 3000-3004)
- [ ] API Gateway is running (port 8080)
- [ ] Gateway health check passes: `curl http://localhost:8080/health`
- [ ] Frontend is accessible: http://localhost:3006
- [ ] Can login successfully
- [ ] Can view products
- [ ] Navigation works (cart, categories, orders)

## Troubleshooting

### Gateway Won't Start

**Problem**: Docker container fails to start

**Solutions**:
1. Check Docker is running: `docker info`
2. Check port 8080 is free: `lsof -i :8080`
3. View logs: `docker logs api-gateway`

### 502 Bad Gateway Error

**Problem**: Gateway can't reach backend services

**Solutions**:
1. Verify all backend services are running
2. Check service URLs in `nginx.conf` use `host.docker.internal`
3. Test services directly: `curl http://localhost:3000/health`

### 429 Too Many Requests

**Problem**: Rate limit exceeded

**Solutions**:
1. Slow down requests
2. Increase rate limits in `nginx.conf`
3. Wait a few seconds and retry

### CORS Errors

**Problem**: Browser blocks requests

**Solutions**:
1. Verify frontend origin in `nginx.conf`
2. Check CORS headers are being sent
3. Restart gateway after config changes

## Production Deployment

### Pre-Production Checklist

- [ ] Enable HTTPS with SSL certificates
- [ ] Update CORS origins to production domain
- [ ] Increase rate limits for production traffic
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Add health checks to load balancer
- [ ] Configure firewall rules
- [ ] Enable gzip compression (already configured)
- [ ] Set up backup and disaster recovery

### Recommended Changes

1. **HTTPS Configuration**:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

2. **Production CORS**:
```nginx
add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
```

3. **Increased Rate Limits**:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
```

## Monitoring

### Key Metrics

Monitor these metrics in production:

- **Request Rate**: Requests per second
- **Response Time**: Average latency
- **Error Rate**: 4xx and 5xx errors
- **Upstream Health**: Backend service availability
- **Rate Limit Hits**: Throttled requests

### Logging

Access logs include:
- Request method and path
- Response status code
- Response time
- Client IP address
- User agent

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│  (Port 3006)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Nginx API Gateway            │
│      (Port 8080)                │
│                                 │
│  Features:                      │
│  • Rate Limiting                │
│  • CORS Handling                │
│  • Security Headers             │
│  • Request Logging              │
│  • Load Balancing               │
└────────┬────────────────────────┘
         │
    ┌────┴────┬─────┬─────┬──────┐
    ▼         ▼     ▼     ▼      ▼
┌──────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Auth │ │Products│ │Catego│ │Users │ │Orders│
│ 3000 │ │  3001  │ │ 3002 │ │ 3003 │ │ 3004 │
└──────┘ └────────┘ └──────┘ └──────┘ └──────┘
```

## Next Steps

1. **Monitor Performance**: Check logs and metrics
2. **Optimize Rate Limits**: Adjust based on usage patterns
3. **Add Caching**: Cache static content and API responses
4. **Implement Circuit Breaker**: Prevent cascading failures
5. **Scale Services**: Add multiple instances of backend services
6. **Set Up Load Balancing**: Distribute traffic across instances

## Support

For issues or questions:

1. **Check logs first**: `docker logs api-gateway`
2. **Verify services**: Test backend services directly
3. **Review configuration**: Check `nginx.conf` for errors
4. **Test connectivity**: Use curl to test endpoints
5. **Check documentation**: See [api-gateway/README.md](api-gateway/README.md)

## Summary

You now have a production-ready API Gateway that:
- Provides a single entry point for all microservices
- Includes rate limiting and security features
- Simplifies frontend configuration
- Prepares your application for scaling

The gateway is running on **port 8080** and proxies all requests to the appropriate backend services. Your frontend automatically uses the gateway through the updated environment variables.

**Gateway Status**: ✅ Running
**Gateway URL**: http://localhost:8080
**Health Check**: http://localhost:8080/health
