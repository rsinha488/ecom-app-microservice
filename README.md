# E-commerce Platform (MERN + Microservices)

> Full-stack e-commerce platform with microservices architecture, OAuth2 authentication, real-time updates, and production-ready deployment

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Client (Browser)                       │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│            Next.js Frontend (Port 3006)                   │
│  - React 18 + TypeScript                                 │
│  - Redux Toolkit (State Management)                      │
│  - Tailwind CSS (Styling)                                │
│  - SEO Optimized (Metadata, Sitemap, JSON-LD)           │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│             API Gateway (Port 8080)                       │
│  - Request Routing                                        │
│  - Load Balancing                                         │
│  - Rate Limiting                                          │
└────────────────────────┬─────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        │                │                │                │
        ▼                ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Auth Service │  │  Products    │  │   Orders     │  │  Categories  │
│  Port 3000   │  │  Port 3001   │  │  Port 3004   │  │  Port 3002   │
│              │  │              │  │              │  │              │
│ - OAuth2     │  │ - Catalog    │  │ - WebSocket  │  │ - Categories │
│ - JWT Tokens │  │ - Inventory  │  │ - Kafka      │  │ - Management │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  MongoDB   │    │  MongoDB   │    │  MongoDB   │    │  MongoDB   │
│  auth_db   │    │product_db  │    │ orders_db  │    │category_db │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Frontend
cd frontend && npm install

# Services
cd services && ./setup.sh

# API Gateway
cd api-gateway && npm install
```

### 2. Configure Environment

Each component has `.env.example` - copy and configure:

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Services (repeat for each)
cp services/auth/.env.example services/auth/.env
```

### 3. Start MongoDB

```bash
mongod
```

### 4. Start All Services

```bash
# Start all backend services
cd services && ./start-all.sh

# Start API Gateway
cd api-gateway && npm start

# Start Frontend
cd frontend && npm run dev
```

### 5. Access Application

- **Frontend**: http://localhost:3006
- **API Gateway**: http://localhost:8080
- **Auth Service**: http://localhost:3000
- **Products Service**: http://localhost:3001
- **Orders Service**: http://localhost:3004

## 📁 Project Structure

```
LaunchpadMERN/
├── frontend/              # Next.js 14 frontend
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # React components
│   │   ├── store/        # Redux store
│   │   ├── lib/          # API clients
│   │   └── utils/        # Utilities
│   ├── public/           # Static assets
│   ├── docs/             # Documentation
│   └── README.md
│
├── services/              # Node.js microservices
│   ├── auth/             # Authentication service
│   ├── products/         # Products service
│   ├── categories/       # Categories service
│   ├── users/            # Users service
│   ├── orders/           # Orders service (WebSocket + Kafka)
│   ├── shared/           # Shared utilities
│   ├── docs/             # Documentation
│   ├── setup.sh          # Install all
│   ├── start-all.sh      # Start all
│   └── README.md
│
├── api-gateway/           # API Gateway
│   └── README.md
│
└── README.md              # This file
```

## ✨ Key Features

### Frontend
- ⚡ **Next.js 14** with App Router
- 🎨 **Tailwind CSS** for styling
- 📊 **Redux Toolkit** for state
- 🔐 **OAuth2** authentication
- 🎯 **SEO Optimized** (metadata, sitemap, JSON-LD)
- 📱 **PWA Ready**
- 🚦 **Production Ready** (error boundaries, logging)

### Backend
- 🏗️ **Microservices** architecture
- 🔒 **OAuth2 + JWT** authentication
- 📡 **WebSocket** real-time updates
- 🎪 **Kafka** event streaming
- 💾 **MongoDB** databases
- 🔢 **Numeric Enums** for performance
- 📝 **API Versioning** (v1)

## 🔐 Authentication Flow

1. User registers/logs in via Auth Service
2. Receives JWT access token (15min) + refresh token (7d)
3. Frontend stores in HTTP-only cookies
4. All API requests include Authorization header
5. Auto-refresh on token expiry

## 📡 Real-time Features

### WebSocket (Orders)
- Live order status updates
- Real-time notifications
- Automatic UI refresh

### Kafka Events
- `order.created`
- `order.status.changed`
- `order.cancelled`
- `inventory.reserve/release`

## 📚 Documentation

### Frontend
- **[Frontend README](./frontend/README.md)** - Setup & development
- **[Production Deployment](./frontend/docs/PRODUCTION_DEPLOYMENT.md)** - Deploy guide
- **[SEO Improvements](./frontend/docs/SEO_AND_PRODUCTION_IMPROVEMENTS.md)** - SEO summary

### Services
- **[Services README](./services/README.md)** - Microservices overview
- **[Architecture](./services/docs/ARCHITECTURE.md)** - System design
- **[OAuth2 Security](./services/docs/OAUTH2_SECURITY_GUIDE.md)** - Auth security
- **[MongoDB Optimization](./services/docs/MONGODB_OPTIMIZATION_GUIDE.md)** - DB performance
- **[Scaling](./services/docs/SCALING_STRATEGIES_GUIDE.md)** - Scaling strategies

### API Gateway
- **[Gateway README](./api-gateway/README.md)** - Gateway setup

## 🚀 Production Deployment

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

### Docker (Services)
```bash
cd services
docker-compose up -d
```

### PM2 (Traditional)
```bash
cd services
pm2 start ecosystem.config.js
```

See individual READMEs for detailed deployment instructions.

## 🔧 Development

### Code Standards
- TypeScript throughout
- ESLint + Prettier
- Conventional Commits
- JSDoc comments

### Testing
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run type-check    # TypeScript
```

## 📊 Performance

- **Frontend**: Lighthouse 90+ score
- **API**: < 100ms response time
- **Database**: Indexed queries
- **CDN**: Static asset caching

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -i :3006
kill -9 <PID>
```

### MongoDB Connection Failed
```bash
sudo systemctl start mongod
```

### Services Won't Start
```bash
cd services
./stop-all.sh
./start-all.sh
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

[Your License Here]

---

## 🎯 Quick Links

- **Live Demo**: [https://your-domain.com](https://your-domain.com)
- **API Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Admin Panel**: [http://localhost:3006/admin](http://localhost:3006/admin)

---

**Built with ❤️ by the E-commerce Platform Team**

### Tech Stack

**Frontend**: Next.js • React • TypeScript • Redux • Tailwind  
**Backend**: Node.js • Express • MongoDB • Kafka • WebSocket  
**Auth**: OAuth2 • JWT • OIDC  
**Deployment**: Vercel • Docker • PM2 • Kubernetes
