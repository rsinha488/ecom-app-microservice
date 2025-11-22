# Production Deployment Guide

## Overview

This guide covers deploying the OAuth2-secured microservices platform to production with API versioning, security hardening, and monitoring.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Security Hardening](#security-hardening)
4. [Database Setup](#database-setup)
5. [Service Deployment](#service-deployment)
6. [Load Balancing & Scaling](#load-balancing--scaling)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [CI/CD Pipeline](#cicd-pipeline)

## Pre-Deployment Checklist

### Security
- [ ] All secrets changed from default values
- [ ] Strong passwords generated (min 32 chars)
- [ ] SSL/TLS certificates obtained
- [ ] HTTPS enabled on all services
- [ ] CORS restricted to production domains
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] MongoDB authentication enabled
- [ ] Firewall rules configured

### Configuration
- [ ] Production .env files created
- [ ] NODE_ENV set to 'production'
- [ ] Database connection strings updated
- [ ] Issuer URLs point to production domains
- [ ] All ports properly configured
- [ ] Log levels set appropriately

### Testing
- [ ] All endpoints tested
- [ ] OAuth2 flow verified
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] Load testing completed
- [ ] Security audit performed

### Infrastructure
- [ ] MongoDB cluster configured
- [ ] Redis (optional) for rate limiting
- [ ] Load balancer configured
- [ ] CDN configured (if needed)
- [ ] DNS records updated
- [ ] Health check endpoints verified

## Environment Configuration

### Generate Secure Secrets

```bash
# Generate secrets (run multiple times for different secrets)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Auth Service (.env.production)

```env
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auth_db?retryWrites=true&w=majority

# OAuth2 Secrets (CRITICAL: Use generated secrets!)
ACCESS_TOKEN_SECRET=<64-char-hex-from-crypto>
REFRESH_TOKEN_SECRET=<different-64-char-hex>
ID_TOKEN_SECRET=<another-different-64-char-hex>

# Token Expiry
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
ID_TOKEN_EXPIRY=1h

# Production URLs
ISSUER=https://auth.yourdomain.com
CLIENT_ID=production-client-id
CLIENT_SECRET=<secure-client-secret>

# CORS
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

### Products Service (.env.production)

```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/products_db
ACCESS_TOKEN_SECRET=<same-as-auth-service>
ISSUER=https://auth.yourdomain.com
```

### Categories Service (.env.production)

```env
PORT=3002
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/categories_db
ACCESS_TOKEN_SECRET=<same-as-auth-service>
ISSUER=https://auth.yourdomain.com
```

### Users Service (.env.production)

```env
PORT=3003
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/users_db
ACCESS_TOKEN_SECRET=<same-as-auth-service>
ISSUER=https://auth.yourdomain.com
JWT_SECRET=<legacy-jwt-secret>
```

### Orders Service (.env.production)

```env
PORT=3004
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/orders_db
ACCESS_TOKEN_SECRET=<same-as-auth-service>
ISSUER=https://auth.yourdomain.com
```

## Security Hardening

### 1. SSL/TLS Configuration

```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name auth.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Internal services should not be publicly accessible
# Only accessible through load balancer/reverse proxy
```

### 3. MongoDB Security

```javascript
// Enable authentication
// Connect to MongoDB
use admin
db.createUser({
  user: "admin",
  pwd: "SecurePassword123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

// Create database users
use auth_db
db.createUser({
  user: "auth_user",
  pwd: "SecurePassword456!",
  roles: [ { role: "readWrite", db: "auth_db" } ]
})
```

### 4. Environment Variables Security

```bash
# Never commit .env files
# Add to .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore

# Use secret management systems
# AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, etc.
```

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   ```
   - Log in to MongoDB Atlas
   - Create new cluster
   - Choose region close to your servers
   - Configure cluster tier (M10+ for production)
   ```

2. **Network Access**
   ```
   - Add IP addresses of your servers
   - Or use VPC peering for better security
   ```

3. **Database Users**
   ```
   - Create separate users for each service
   - Use principle of least privilege
   - Rotate passwords regularly
   ```

4. **Backup Configuration**
   ```
   - Enable automated backups
   - Set retention period (7-30 days)
   - Test restore procedures
   ```

### Self-Hosted MongoDB

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Enable authentication in /etc/mongod.conf
security:
  authorization: enabled

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Service Deployment

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'auth-service',
      cwd: './services/auth',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'products-service',
      cwd: './services/products',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'categories-service',
      cwd: './services/categories',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'users-service',
      cwd: './services/users',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'orders-service',
      cwd: './services/orders',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};

# Start services
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Docker

```dockerfile
# Dockerfile example (services/auth/Dockerfile)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  auth:
    build: ./services/auth
    ports:
      - "3000:3000"
    env_file:
      - ./services/auth/.env.production
    restart: always

  products:
    build: ./services/products
    ports:
      - "3001:3001"
    env_file:
      - ./services/products/.env.production
    restart: always

  categories:
    build: ./services/categories
    ports:
      - "3002:3002"
    env_file:
      - ./services/categories/.env.production
    restart: always

  users:
    build: ./services/users
    ports:
      - "3003:3003"
    env_file:
      - ./services/users/.env.production
    restart: always

  orders:
    build: ./services/orders
    ports:
      - "3004:3004"
    env_file:
      - ./services/orders/.env.production
    restart: always
```

### Using Kubernetes

```yaml
# k8s/auth-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth
  template:
    metadata:
      labels:
        app: auth
    spec:
      containers:
      - name: auth
        image: your-registry/auth-service:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: auth-secrets
        - configMapRef:
            name: auth-config
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

## Load Balancing & Scaling

### Nginx Load Balancer

```nginx
# /etc/nginx/nginx.conf
http {
    upstream auth_backend {
        least_conn;
        server localhost:3000 max_fails=3 fail_timeout=30s;
        server localhost:3000 max_fails=3 fail_timeout=30s;
    }

    upstream products_backend {
        least_conn;
        server localhost:3001;
        server localhost:3001;
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /path/to/cert.pem;
        ssl_certificate_key /path/to/key.pem;

        location /api/v1/auth/ {
            proxy_pass http://auth_backend/api/v1/auth/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $host;
        }

        location /api/v1/products/ {
            proxy_pass http://products_backend/api/v1/products/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $host;
        }
    }
}
```

### Auto-Scaling Configuration

```javascript
// PM2 cluster mode (already configured above)
// Automatically uses all CPU cores

// Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring & Logging

### Application Logging

```javascript
// Add winston logger to each service
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Health Check Monitoring

```bash
# Setup monitoring script
#!/bin/bash
# health-check.sh

services=("auth:3000" "products:3001" "categories:3002" "users:3003" "orders:3004")

for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    name="${ADDR[0]}"
    port="${ADDR[1]}"

    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)

    if [ $status -eq 200 ]; then
        echo "✓ $name service is healthy"
    else
        echo "✗ $name service is down (HTTP $status)"
        # Send alert (email, Slack, PagerDuty, etc.)
    fi
done
```

### Monitoring Tools

1. **PM2 Monitoring**
   ```bash
   pm2 monitor
   pm2 logs
   pm2 monit
   ```

2. **Prometheus + Grafana**
   ```javascript
   // Add prometheus metrics to each service
   const promClient = require('prom-client');
   const register = new promClient.Registry();

   // Metrics endpoint
   app.get('/metrics', async (req, res) => {
     res.set('Content-Type', register.contentType);
     res.end(await register.metrics());
   });
   ```

3. **ELK Stack** (Elasticsearch, Logstash, Kibana)
   - Centralized logging
   - Log aggregation
   - Real-time analysis

## Backup & Recovery

### Database Backups

```bash
# MongoDB backup script
#!/bin/bash
# backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup all databases
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
          --out=$BACKUP_DIR/$DATE \
          --gzip

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR/$DATE"
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup-mongodb.sh
```

### Disaster Recovery Plan

1. **Regular Backups**
   - Daily automated backups
   - Test restores monthly
   - Off-site backup storage

2. **Recovery Procedures**
   ```bash
   # Restore from backup
   mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
                --gzip \
                --drop \
                /backups/mongodb/20250118_020000
   ```

3. **Service Recovery**
   ```bash
   # Restart all services
   pm2 restart all

   # Or with Docker
   docker-compose restart
   ```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/services
            git pull
            npm install --production
            pm2 restart all
```

## Performance Optimization

### 1. Enable Caching

```javascript
// Add Redis caching
const redis = require('redis');
const client = redis.createClient();

// Cache frequently accessed data
router.get('/products', async (req, res) => {
  const cached = await client.get('products');
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const products = await Product.find();
  await client.setex('products', 300, JSON.stringify(products));
  res.json(products);
});
```

### 2. Database Indexing

```javascript
// Add indexes to frequently queried fields
productSchema.index({ category: 1, price: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
userSchema.index({ email: 1 }, { unique: true });
```

### 3. Connection Pooling

```javascript
// MongoDB connection with pooling
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
});
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Service not running
   - Wrong port configuration
   - Firewall blocking requests

2. **High Response Times**
   - Database query optimization needed
   - Add caching
   - Scale horizontally

3. **Memory Leaks**
   - Monitor with `pm2 monit`
   - Check for unclosed connections
   - Review error handling

### Debugging in Production

```bash
# View logs
pm2 logs auth-service

# Monitor resources
pm2 monit

# Restart service
pm2 restart auth-service

# View detailed info
pm2 show auth-service
```

## Final Checklist

- [ ] All services deployed and running
- [ ] SSL/TLS configured and working
- [ ] Health checks returning 200
- [ ] OAuth2 flow working end-to-end
- [ ] Rate limiting active
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team trained on procedures
- [ ] Rollback plan tested
- [ ] Performance baseline established

## Support & Maintenance

### Regular Tasks
- **Daily**: Check logs for errors
- **Weekly**: Review performance metrics
- **Monthly**: Security audit, backup testing
- **Quarterly**: Dependency updates, security patches

### Emergency Contacts
- DevOps Team: devops@company.com
- Database Admin: dba@company.com
- Security Team: security@company.com

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
