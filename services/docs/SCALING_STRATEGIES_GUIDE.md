# Scaling Strategies Guide

This guide covers horizontal and vertical scaling strategies for the microservices e-commerce platform, including Redis caching, load balancing, and multiple deployment options.

## Table of Contents

1. [Overview](#overview)
2. [Horizontal Scaling](#horizontal-scaling)
3. [Vertical Scaling](#vertical-scaling)
4. [Redis Caching Strategy](#redis-caching-strategy)
5. [Load Balancing](#load-balancing)
6. [Deployment Options](#deployment-options)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Overview

### What is Scaling?

**Horizontal Scaling (Scale Out)**: Adding more instances of your services
**Vertical Scaling (Scale Up)**: Adding more resources (CPU, RAM) to existing instances

### Current Architecture

```
┌─────────────────┐
│  Nginx LB       │  ← Load Balancer
│  Port 80/443    │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┬─────────┐
    │         │         │         │         │
┌───▼───┐ ┌──▼───┐ ┌──▼───┐ ┌───▼──┐ ┌───▼───┐
│ Auth  │ │Prod. │ │ Cat. │ │Users │ │Orders │
│ x3    │ │ x3   │ │ x2   │ │ x2   │ │  x3   │
└───┬───┘ └──┬───┘ └──┬───┘ └───┬──┘ └───┬───┘
    │        │        │         │        │
    └────────┴────────┴─────────┴────────┘
                      │
              ┌───────┴───────┐
              │               │
         ┌────▼────┐    ┌─────▼─────┐
         │  Redis  │    │  MongoDB  │
         │ (Cache) │    │    (DB)   │
         └─────────┘    └───────────┘
```

---

## Horizontal Scaling

### 1. PM2 Cluster Mode (Development/Small Production)

**Best for**: Single server deployments, development, small production environments

#### Setup

```bash
# Install PM2 globally
npm install -g pm2

# Start all services with ecosystem config
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs

# Restart all services
pm2 restart all

# Reload with zero-downtime
pm2 reload all

# Save configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### Configuration (ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: 'auth-service-1',
      cwd: './auth',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      error_file: './logs/auth-error.log',
      out_file: './logs/auth-out.log',
      time: true
    }
  ]
};
```

#### Scaling Strategy

- **Auth Service**: 3 instances (high traffic, authentication is critical)
- **Products Service**: 3 instances (high read traffic, catalog browsing)
- **Orders Service**: 3 instances (critical for business, high write traffic)
- **Categories Service**: 2 instances (lower traffic, mostly cached)
- **Users Service**: 2 instances (moderate traffic)

**Total Instances**: 13 service instances + 1 Redis + 1 MongoDB = 15 processes

---

### 2. Docker Compose with Scaling (Medium Production)

**Best for**: Multi-container deployments, staging environments, medium production

#### Setup

```bash
# Start with scaling
docker-compose -f docker-compose.scale.yml up -d --scale auth=3 --scale products=3 --scale orders=3

# View running containers
docker-compose -f docker-compose.scale.yml ps

# View logs
docker-compose -f docker-compose.scale.yml logs -f

# Scale a specific service
docker-compose -f docker-compose.scale.yml up -d --scale products=5

# Stop all services
docker-compose -f docker-compose.scale.yml down
```

#### Resource Limits

Each service container has defined resource constraints:

```yaml
deploy:
  replicas: 3
  resources:
    limits:
      cpus: '0.5'      # Maximum 50% of one CPU core
      memory: 512M     # Maximum 512MB RAM
    reservations:
      cpus: '0.25'     # Reserved 25% of one CPU core
      memory: 256M     # Reserved 256MB RAM
```

#### Update Strategy

```yaml
deploy:
  update_config:
    parallelism: 1        # Update one container at a time
    delay: 10s            # Wait 10s between updates
    order: start-first    # Start new before stopping old
  rollback_config:
    parallelism: 1
    delay: 5s
```

---

### 3. Kubernetes with Auto-Scaling (Large Production)

**Best for**: Cloud-native deployments, large-scale production, auto-scaling needs

#### Setup

```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Deploy Redis
kubectl apply -f kubernetes/redis-deployment.yaml

# Deploy all services
kubectl apply -f kubernetes/auth-deployment.yaml
kubectl apply -f kubernetes/products-deployment.yaml
kubectl apply -f kubernetes/categories-deployment.yaml
kubectl apply -f kubernetes/users-deployment.yaml
kubectl apply -f kubernetes/orders-deployment.yaml

# View pods
kubectl get pods -n ecommerce

# View HPAs
kubectl get hpa -n ecommerce

# View services
kubectl get svc -n ecommerce

# Check HPA metrics
kubectl describe hpa auth-hpa -n ecommerce

# View logs
kubectl logs -f deployment/auth-service -n ecommerce

# Scale manually (override HPA temporarily)
kubectl scale deployment auth-service --replicas=5 -n ecommerce
```

#### Horizontal Pod Autoscaler (HPA)

Each service has an HPA configured:

**Auth Service**:
- Min Replicas: 3
- Max Replicas: 10
- CPU Target: 70%
- Memory Target: 80%

**Products Service**:
- Min Replicas: 3
- Max Replicas: 10
- CPU Target: 70%
- Memory Target: 80%

**Orders Service**:
- Min Replicas: 3
- Max Replicas: 12
- CPU Target: 70%
- Memory Target: 80%

**Categories Service**:
- Min Replicas: 2
- Max Replicas: 6
- CPU Target: 70%
- Memory Target: 80%

**Users Service**:
- Min Replicas: 2
- Max Replicas: 8
- CPU Target: 70%
- Memory Target: 80%

#### HPA Behavior

**Scale Up**:
- No stabilization window (immediate response)
- Can increase by 100% or add 4 pods every 30s
- Uses Max policy (fastest scaling)

**Scale Down**:
- 5-minute stabilization window (prevents flapping)
- Can decrease by 50% or remove 2 pods every 60s
- Uses Min policy (conservative scaling)

---

## Vertical Scaling

### Resource Allocation Strategy

#### Development
```
CPU: 0.1-0.25 cores per service
Memory: 128MB-256MB per service
```

#### Production
```
CPU: 0.25-0.5 cores per service
Memory: 256MB-512MB per service
```

#### High-Load Production
```
CPU: 0.5-1.0 cores per service
Memory: 512MB-1GB per service
```

### Service-Specific Recommendations

| Service    | CPU Request | CPU Limit | Memory Request | Memory Limit | Justification |
|------------|-------------|-----------|----------------|--------------|---------------|
| Auth       | 250m        | 500m      | 256Mi          | 512Mi        | High traffic, JWT operations |
| Products   | 250m        | 500m      | 256Mi          | 512Mi        | Database queries, caching |
| Orders     | 250m        | 500m      | 256Mi          | 512Mi        | Complex business logic |
| Categories | 150m        | 300m      | 192Mi          | 384Mi        | Simple CRUD, mostly cached |
| Users      | 200m        | 400m      | 256Mi          | 512Mi        | Moderate complexity |
| Redis      | 250m        | 500m      | 256Mi          | 512Mi        | In-memory cache |

### When to Scale Vertically

1. **High CPU utilization** (consistently above 70%)
2. **Memory pressure** (OOM errors, high swap usage)
3. **Increased response times** despite horizontal scaling
4. **Complex computation** requirements (encryption, compression)

---

## Redis Caching Strategy

### Cache Hierarchy

```
User Request
     │
     ▼
┌────────────┐
│  Nginx     │  ← Proxy Cache (5 min for GET)
└────┬───────┘
     │
     ▼
┌────────────┐
│  Service   │  ← Application Cache (Redis)
└────┬───────┘
     │
     ▼
┌────────────┐
│  Database  │
└────────────┘
```

### Caching Middleware

#### List Caching (Short TTL)
```javascript
// Cache product listings for 5 minutes
router.get('/',
  listCacheMiddleware({ ttl: 300, prefix: 'products:list' }),
  productController.getAllProducts
);
```

#### Detail Caching (Medium TTL)
```javascript
// Cache product details for 15 minutes
router.get('/:id',
  detailCacheMiddleware({ ttl: 900, prefix: 'products:detail' }),
  productController.getProductById
);
```

### Cache Invalidation

**Write-through Pattern**:
```javascript
// On product update
await Product.findByIdAndUpdate(id, updateData);
await redisClient.delPattern('products:*');  // Invalidate all product caches
```

**Time-based Expiration**:
- List endpoints: 5 minutes (300s)
- Detail endpoints: 15 minutes (900s)
- User sessions: 1 hour (3600s)
- Rate limits: 15 minutes (900s)

### Redis Configuration

```javascript
// Singleton pattern
const redisClient = new RedisClient();
await redisClient.connect();

// Connection options
{
  url: 'redis://redis:6379',
  password: process.env.REDIS_PASSWORD,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Too many retries');
      return Math.min(retries * 100, 3000);  // Exponential backoff
    }
  }
}
```

### Distributed Rate Limiting

Uses Redis for rate limiting across all service instances:

```javascript
const distributedRateLimit = require('./shared/middleware/distributedRateLimit');

app.use('/v1/products', distributedRateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  keyPrefix: 'ratelimit:products'
}));
```

### Cache Monitoring

**Cache Hit Ratio**:
```javascript
// Check cache headers
X-Cache: HIT   // Served from cache
X-Cache: MISS  // Fetched from database
X-Cache-Key: products:list:page=1&limit=10
```

**Redis Metrics**:
```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# Check hit rate
INFO stats

# Monitor commands in real-time
MONITOR

# Get all keys (development only!)
KEYS *
```

---

## Load Balancing

### Nginx Configuration

#### Load Balancing Algorithm

**Least Connections** (default for this setup):
- Routes to server with fewest active connections
- Best for varying request processing times
- Better than round-robin for microservices

```nginx
upstream products_backend {
    least_conn;
    server localhost:3001 max_fails=3 fail_timeout=30s weight=1;
    server localhost:3011 max_fails=3 fail_timeout=30s weight=1;
    server localhost:3021 max_fails=3 fail_timeout=30s weight=1;
    keepalive 32;
}
```

#### Health Checks

```nginx
# Passive health checks
max_fails=3          # Mark server down after 3 failures
fail_timeout=30s     # Try again after 30 seconds
```

For active health checks, use Nginx Plus or implement in application:

```javascript
// Health endpoint in each service
app.get('/health', async (req, res) => {
  try {
    // Check database
    await mongoose.connection.db.admin().ping();

    // Check Redis
    const redisOk = await redisClient.ping();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME,
      uptime: process.uptime(),
      redis: redisOk,
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

#### SSL/TLS Termination

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/api.yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/api.yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # SSL session cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
}
```

#### Caching at Load Balancer

```nginx
proxy_cache_path /var/cache/nginx/api
    levels=1:2
    keys_zone=api_cache:10m
    max_size=1g
    inactive=60m;

location /v1/products {
    proxy_cache api_cache;
    proxy_cache_methods GET HEAD;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;

    proxy_pass http://products_backend;
}
```

#### Rate Limiting at Load Balancer

```nginx
# Define rate limit zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

# Apply to locations
location /v1/auth/login {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://auth_backend;
}

location /v1/products {
    limit_req zone=general burst=20 nodelay;
    proxy_pass http://products_backend;
}
```

---

## Deployment Options

### Comparison Matrix

| Feature | PM2 | Docker Compose | Kubernetes |
|---------|-----|----------------|------------|
| **Complexity** | Low | Medium | High |
| **Learning Curve** | Easy | Medium | Steep |
| **Auto-scaling** | Manual | Manual | Automatic (HPA) |
| **Multi-server** | No | Limited | Yes |
| **Rolling Updates** | Yes | Limited | Yes |
| **Health Checks** | Basic | Good | Excellent |
| **Service Discovery** | No | Yes | Yes |
| **Load Balancing** | External | External | Built-in |
| **Best For** | Single server | Small clusters | Production clusters |
| **Cost** | Low | Low | Medium-High |

### PM2 - Single Server Deployment

**Pros**:
- Simple to set up and manage
- Low overhead
- Good for single server deployments
- Excellent monitoring tools

**Cons**:
- No built-in load balancing
- Limited to single server
- Manual scaling
- No service mesh

**Use Cases**:
- Development environments
- Small applications
- Cost-sensitive deployments
- Quick MVPs

### Docker Compose - Container Deployment

**Pros**:
- Container isolation
- Easy service networking
- Reproducible environments
- Good for local development

**Cons**:
- Limited to single host
- No auto-scaling
- Manual orchestration
- Limited high availability

**Use Cases**:
- Local development
- Staging environments
- Small to medium production
- Docker Swarm transition

### Kubernetes - Production Orchestration

**Pros**:
- Auto-scaling (HPA, VPA)
- Self-healing
- Rolling updates/rollbacks
- Service mesh ready
- Multi-cloud support

**Cons**:
- Complex setup
- Steep learning curve
- Higher operational costs
- Requires dedicated resources

**Use Cases**:
- Large-scale production
- Multi-region deployments
- High availability requirements
- Microservices architecture

---

## Performance Optimization

### Application-Level Optimizations

#### 1. Database Connection Pooling

```javascript
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,           // Maximum connections
  minPoolSize: 2,            // Minimum connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

#### 2. Response Compression

```javascript
const compression = require('compression');

app.use(compression({
  level: 6,                  // Compression level (0-9)
  threshold: 1024,           // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

#### 3. Database Indexing

```javascript
// Product model with indexes
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  price: { type: Number, required: true, index: true },
  inStock: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for common queries
productSchema.index({ category: 1, inStock: 1, price: 1 });
```

#### 4. Pagination

```javascript
// GET /v1/products?page=1&limit=20
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const products = await Product.find()
  .skip(skip)
  .limit(limit)
  .lean();  // Return plain objects, not Mongoose documents

const total = await Product.countDocuments();

res.json({
  results: products,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
```

#### 5. Selective Field Projection

```javascript
// Only return needed fields
const products = await Product.find()
  .select('name price image')  // Only these fields
  .lean();
```

### Infrastructure Optimizations

#### 1. CDN for Static Assets

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 2. HTTP/2

```nginx
listen 443 ssl http2;
```

#### 3. Connection Keep-Alive

```nginx
upstream products_backend {
    keepalive 32;  # Maintain 32 idle connections
}

location /v1/products {
    proxy_http_version 1.1;
    proxy_set_header Connection "";
}
```

#### 4. Gzip/Brotli Compression

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

---

## Monitoring and Metrics

### Key Metrics to Monitor

#### Service Health Metrics

1. **Request Rate** (req/sec)
2. **Response Time** (p50, p95, p99)
3. **Error Rate** (4xx, 5xx)
4. **CPU Usage** (%)
5. **Memory Usage** (MB)
6. **Active Connections**

#### Redis Metrics

1. **Hit Rate** (%)
2. **Memory Usage** (MB)
3. **Evicted Keys**
4. **Connected Clients**
5. **Commands Per Second**

#### Database Metrics

1. **Query Response Time** (ms)
2. **Active Connections**
3. **Slow Queries**
4. **Replication Lag** (if applicable)

### PM2 Monitoring

```bash
# Built-in monitoring
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
pm2 web

# Key metrics
pm2 logs --json
pm2 describe <app-name>
```

### Docker Monitoring

```bash
# Container stats
docker stats

# Container logs
docker-compose logs -f --tail=100

# Resource usage
docker system df
```

### Kubernetes Monitoring

```bash
# Pod metrics
kubectl top pods -n ecommerce

# Node metrics
kubectl top nodes

# HPA status
kubectl get hpa -n ecommerce --watch

# Detailed pod info
kubectl describe pod <pod-name> -n ecommerce

# Events
kubectl get events -n ecommerce --sort-by='.lastTimestamp'
```

### Application Performance Monitoring (APM)

Recommended tools:
- **New Relic** - Full-stack monitoring
- **Datadog** - Infrastructure + APM
- **Prometheus + Grafana** - Open-source metrics
- **Elastic APM** - Part of ELK stack

Example Prometheus metrics endpoint:

```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    }, duration);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

---

## Best Practices

### 1. Gradual Scaling

Don't scale from 1 to 100 instances immediately:
- Start with 2-3 instances
- Monitor performance
- Scale incrementally based on metrics
- Test at each scale level

### 2. Health Checks

Implement comprehensive health checks:
```javascript
// Health check should verify:
- Database connectivity
- Redis connectivity
- Critical external services
- Memory/CPU thresholds
```

### 3. Graceful Shutdown

Handle SIGTERM properly:
```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: closing server gracefully');

  // Stop accepting new connections
  server.close(async () => {
    // Close database connections
    await mongoose.connection.close();

    // Close Redis connection
    await redisClient.disconnect();

    console.log('Server closed gracefully');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);  // 30 second timeout
});
```

### 4. Cache Warming

Pre-populate cache on startup:
```javascript
async function warmCache() {
  const popularProducts = await Product.find().limit(20).lean();
  for (const product of popularProducts) {
    await redisClient.set(`products:detail:${product._id}`, product, 900);
  }
}
```

### 5. Circuit Breaker Pattern

Prevent cascading failures:
```javascript
const CircuitBreaker = require('opossum');

const options = {
  timeout: 3000,        // If function takes longer than 3s, trigger failure
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000   // After 30s, try again
};

const breaker = new CircuitBreaker(externalAPICall, options);

breaker.fallback(() => {
  // Return cached data or default response
  return { status: 'degraded', message: 'Using cached data' };
});
```

### 6. Request Timeout

Set timeouts to prevent hanging requests:
```javascript
app.use((req, res, next) => {
  req.setTimeout(30000);  // 30 second timeout
  next();
});
```

### 7. Connection Limits

Limit concurrent connections:
```nginx
# Nginx
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;  # Max 10 concurrent connections per IP
```

---

## Troubleshooting

### High CPU Usage

**Symptoms**: CPU consistently above 80%

**Solutions**:
1. Scale horizontally (add more instances)
2. Optimize database queries
3. Enable caching
4. Profile application (use clinic.js, 0x)
5. Check for infinite loops or inefficient algorithms

### High Memory Usage

**Symptoms**: Memory growing over time, OOM errors

**Solutions**:
1. Check for memory leaks (use heapdump)
2. Reduce connection pool sizes
3. Limit cache size
4. Scale vertically (increase memory limits)
5. Enable garbage collection logs

### Cache Issues

**Symptoms**: Low hit rate, stale data

**Solutions**:
1. Adjust TTL values
2. Implement better invalidation strategy
3. Use cache tags
4. Monitor cache size
5. Check Redis memory limits

### Load Balancer Issues

**Symptoms**: Uneven distribution, connection errors

**Solutions**:
1. Check health check endpoints
2. Verify backend server status
3. Review load balancing algorithm
4. Check keepalive settings
5. Monitor connection limits

### Database Connection Pool Exhaustion

**Symptoms**: "No connections available" errors

**Solutions**:
1. Increase pool size
2. Reduce connection timeout
3. Fix slow queries
4. Add database read replicas
5. Implement connection retry logic

---

## Conclusion

This scaling strategy provides multiple deployment options based on your needs:

- **Small/Development**: Use PM2 for simplicity
- **Medium/Staging**: Use Docker Compose for isolation
- **Large/Production**: Use Kubernetes for auto-scaling

Key takeaways:
1. Start small, scale gradually
2. Monitor everything
3. Cache aggressively
4. Plan for failures
5. Test at scale

For questions or issues, refer to the respective documentation:
- PM2: https://pm2.keymetrics.io/docs/
- Docker: https://docs.docker.com/
- Kubernetes: https://kubernetes.io/docs/
- Redis: https://redis.io/documentation
- Nginx: https://nginx.org/en/docs/
