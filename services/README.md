# E-commerce Microservices Backend

> Production-ready Node.js microservices with MongoDB, OAuth2, WebSocket, and Kafka

## 🚀 Quick Start

```bash
./setup.sh        # Install all dependencies
./start-all.sh    # Start all services
./stop-all.sh     # Stop all services
```

## 🏗️ Services Overview

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| **Auth** | 3000 | auth_db | OAuth2 authentication & JWT |
| **Products** | 3001 | products_db | Product catalog & inventory |
| **Categories** | 3002 | categories_db | Product categories |
| **Users** | 3003 | users_db | User profiles |
| **Orders** | 3004 | orders_db | Order management & WebSocket |

## 📋 Prerequisites

- Node.js ≥ 18.0.0
- MongoDB ≥ 6.0
- Kafka (optional)

## 🔧 Setup

1. **Install dependencies**: `./setup.sh`
2. **Configure**: Copy `.env.example` to `.env` in each service
3. **Start MongoDB**: `mongod`
4. **Start services**: `./start-all.sh`

## 📚 Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** - System design
- **[Production Deployment](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Deploy guide
- **[OAuth2 Security](./docs/OAUTH2_SECURITY_GUIDE.md)** - Auth security
- **[MongoDB Optimization](./docs/MONGODB_OPTIMIZATION_GUIDE.md)** - DB performance
- **[Scaling](./docs/SCALING_STRATEGIES_GUIDE.md)** - Scaling guide
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Commands & endpoints

## 🔐 Authentication

All endpoints except login/register require JWT token:
```
Authorization: Bearer <access_token>
```

## 🌐 API Format

**Success Response**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Error message"
}
```

## 🚀 Deployment

```bash
pm2 start ecosystem.config.js        # PM2
docker-compose up -d                  # Docker
kubectl apply -f kubernetes/          # Kubernetes
```

---

**Built with ❤️ by the E-commerce Platform Team**
