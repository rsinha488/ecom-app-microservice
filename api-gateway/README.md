# API Gateway

This directory contains the Nginx-based API Gateway for the e-commerce microservices architecture.

## Overview

The API Gateway provides a single entry point for all backend microservices, running on **port 8080**.

### Architecture

```
Frontend (3006) → API Gateway (8080) → Microservices (3000-3004)
```

### Benefits

- **Single Entry Point**: Frontend only needs to know one URL (http://localhost:8080)
- **Centralized Routing**: All API calls go through one gateway
- **Rate Limiting**: Protects backend services from overload
- **CORS Handling**: Centralized CORS configuration
- **Load Balancing**: Distributes traffic across service instances
- **Security Headers**: Adds security headers to all responses
- **Request Logging**: Centralized access logs

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- All backend microservices running (ports 3000-3004)

### Start the Gateway

```bash
cd api-gateway
./start-gateway.sh
```

The gateway will be available at: **http://localhost:8080**

### Stop the Gateway

```bash
./stop-gateway.sh
```

## API Routes

All routes are proxied through the gateway:

| Service    | Port | Gateway Route                          |
|------------|------|----------------------------------------|
| Auth       | 3000 | http://localhost:8080/api/v1/auth      |
| Products   | 3001 | http://localhost:8080/api/v1/products  |
| Categories | 3002 | http://localhost:8080/api/v1/categories|
| Users      | 3003 | http://localhost:8080/api/v1/users     |
| Orders     | 3004 | http://localhost:8080/api/v1/orders    |

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{"status":"healthy","gateway":"nginx"}
```

## Configuration

### Nginx Configuration

The main configuration file is located at: `nginx/nginx.conf`

#### Rate Limiting

- **Auth endpoints**: 5 requests/second (burst: 20)
- **Other API endpoints**: 10 requests/second (burst: 30)

#### Timeouts

- **Connection timeout**: 30-60 seconds
- **Read timeout**: 30-60 seconds
- **Send timeout**: 30-60 seconds

#### CORS

Configured to allow requests from:
- http://localhost:3006 (Frontend)

Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS

### Docker Compose

File: `docker-compose.yml`

- Uses official `nginx:alpine` image
- Mounts configuration and logs
- Exposes port 8080
- Includes health checks

## Logs

Gateway logs are stored in the `logs/` directory:

```bash
# View access logs
tail -f logs/access.log

# View error logs
tail -f logs/error.log

# View live Docker logs
docker logs -f api-gateway
```

## Testing

### Test Individual Services

```bash
# Test Auth Service
curl http://localhost:8080/api/v1/auth/health

# Test Products Service
curl http://localhost:8080/api/v1/products

# Test Categories Service
curl http://localhost:8080/api/v1/categories
```

### Test Authentication Flow

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get User Info (with token)
curl http://localhost:8080/api/v1/auth/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### Gateway Won't Start

1. Check if Docker is running:
   ```bash
   docker info
   ```

2. Check if port 8080 is available:
   ```bash
   lsof -i :8080
   ```

3. View gateway logs:
   ```bash
   docker logs api-gateway
   ```

### Service Connection Errors

1. Verify all backend services are running:
   ```bash
   curl http://localhost:3000/health  # Auth
   curl http://localhost:3001/health  # Products
   curl http://localhost:3002/health  # Categories
   curl http://localhost:3003/health  # Users
   curl http://localhost:3004/health  # Orders
   ```

2. Check gateway logs for connection errors:
   ```bash
   tail -f logs/error.log
   ```

### Rate Limit Errors (429)

If you're getting 429 errors, you're hitting rate limits. Options:

1. Slow down your requests
2. Adjust rate limits in `nginx/nginx.conf`:
   ```nginx
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
   ```
3. Restart gateway after config changes:
   ```bash
   ./stop-gateway.sh && ./start-gateway.sh
   ```

## Production Deployment

### Recommended Changes for Production

1. **Enable HTTPS**:
   ```nginx
   server {
       listen 443 ssl http2;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
   }
   ```

2. **Update CORS origins**:
   ```nginx
   add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
   ```

3. **Increase rate limits** (if needed):
   ```nginx
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
   ```

4. **Add caching** for static content:
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
   ```

5. **Enable log rotation**:
   ```bash
   # Add logrotate configuration
   /var/log/nginx/*.log {
       daily
       rotate 14
       compress
       delaycompress
   }
   ```

## Monitoring

### Key Metrics to Monitor

- Request rate (requests/second)
- Response time (latency)
- Error rate (4xx, 5xx errors)
- Upstream service health
- Rate limit hits

### Tools

- **Docker stats**: `docker stats api-gateway`
- **Access logs**: Check response times and status codes
- **Health endpoint**: Monitor `/health` for uptime

## Additional Features

### Load Balancing (Future Enhancement)

If you scale services to multiple instances:

```nginx
upstream auth_service {
    server host.docker.internal:3000;
    server host.docker.internal:3010;  # Second instance
    server host.docker.internal:3020;  # Third instance
}
```

### Circuit Breaker (Future Enhancement)

Add circuit breaker logic to prevent cascading failures.

### API Versioning

Already configured with `/api/v1/` prefix. For v2:

```nginx
location /api/v2/products {
    proxy_pass http://products_service_v2;
}
```

## Support

For issues or questions:
1. Check the logs first
2. Verify backend services are running
3. Test individual services directly
4. Review Nginx configuration
