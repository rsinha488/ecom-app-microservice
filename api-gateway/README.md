# API Gateway

> Centralized API gateway for microservices routing and load balancing

## 🚀 Quick Start

```bash
npm install
npm start
```

Gateway runs on port **8080** and routes to all microservices.

## 🌐 Routing

All requests to `http://localhost:8080/*` are routed to appropriate microservices:

```
/auth/*       → Auth Service (3000)
/products/*   → Products Service (3001)
/categories/* → Categories Service (3002)
/users/*      → Users Service (3003)
/orders/*     → Orders Service (3004)
```

## 🔧 Configuration

Edit `gateway.config.js` to configure:
- Service URLs
- Load balancing
- Rate limiting
- CORS policies

## 📋 Features

- ✅ Request routing
- ✅ Load balancing
- ✅ Rate limiting
- ✅ CORS handling
- ✅ Request logging

## 🚀 Production

```bash
npm run build
pm2 start ecosystem.config.js
```

---

**Part of E-commerce Platform**
