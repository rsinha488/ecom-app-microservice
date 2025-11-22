# E-commerce Frontend

> Production-ready Next.js 14 frontend with SEO optimization, Redux state management, and microservices architecture

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3006](http://localhost:3006) in your browser.

---

## ✨ Features

- ⚡ **Next.js 14** - App Router, Server Components, and API Routes
- 🎨 **Tailwind CSS** - Modern, responsive design system
- 📊 **Redux Toolkit** - Global state management
- 🔐 **OAuth2 Authentication** - Secure user authentication with JWT
- 🛒 **Shopping Cart** - Persistent cart with real-time updates
- 📦 **Order Management** - Real-time order tracking via WebSocket
- 🎯 **SEO Optimized** - Dynamic metadata, sitemap, structured data
- 🔍 **TypeScript** - Full type safety
- 📱 **PWA Ready** - Installable as mobile app
- 🚦 **Production Ready** - Error boundaries, logging, monitoring

---

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- Running microservices (Auth, Products, Orders, Categories, Users)

---

## 🔧 Environment Setup

Create `.env.local` with the following variables:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3006

# Microservices URLs
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:3001
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:3002
NEXT_PUBLIC_USERS_URL=http://localhost:3003
NEXT_PUBLIC_ORDERS_URL=http://localhost:3004

# OAuth Configuration
NEXT_PUBLIC_OAUTH_CLIENT_ID=ecommerce-client
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3006/callback
NEXT_PUBLIC_OAUTH_SCOPE=openid profile email
OAUTH_CLIENT_SECRET=your-secret-key
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3006 |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run analyze` | Analyze bundle size |

---

## 🏗️ Architecture

### Communication Flow

```
Browser → Next.js Frontend (Port 3006)
           ↓
    Next.js API Routes (Server-side proxy)
           ↓
    Microservices (Auth, Products, Orders, etc.)
           ↓
    MongoDB Databases
```

### Key Technologies

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios with interceptors
- **Real-time**: Socket.IO for WebSocket
- **Forms**: React hooks with validation
- **Notifications**: React Toastify

### Microservices Integration

| Service | Port | Purpose |
|---------|------|---------|
| Auth | 3000 | User authentication & OAuth2 |
| Products | 3001 | Product catalog management |
| Categories | 3002 | Product categories |
| Users | 3003 | User profile management |
| Orders | 3004 | Order processing & tracking |

---

## 📁 Project Structure

```
frontend/
├── docs/                          # Documentation
│   ├── PRODUCTION_DEPLOYMENT.md   # Production deployment guide
│   └── SEO_AND_PRODUCTION_IMPROVEMENTS.md  # SEO improvements summary
├── public/                        # Static assets
│   ├── robots.txt                # Search engine crawler rules
│   └── manifest.json             # PWA manifest
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout with SEO metadata
│   │   ├── page.tsx             # Home page
│   │   ├── error.tsx            # Error boundary
│   │   ├── loading.tsx          # Loading state
│   │   ├── sitemap.ts           # Dynamic sitemap generation
│   │   ├── api/                 # API routes (server-side)
│   │   ├── products/            # Product pages
│   │   ├── cart/                # Shopping cart
│   │   ├── checkout/            # Checkout flow
│   │   ├── orders/              # Order history
│   │   └── auth/                # Authentication pages
│   ├── components/              # React components
│   ├── store/                   # Redux store
│   ├── lib/                     # Core libraries
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utilities
│   └── types/                   # TypeScript types
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind configuration
└── tsconfig.json                # TypeScript configuration
```

---

## 🎯 Key Features Explained

### 1. Authentication Flow
- User logs in via OAuth2 password grant
- JWT access token stored in HTTP-only cookies (secure)
- Automatic token refresh on expiry
- Server-side session validation

### 2. State Management
- **Redux Toolkit** for global state
- Separate slices: auth, cart, products, orders
- Persistent cart using localStorage
- Optimistic updates for better UX

### 3. API Communication
- **Next.js API Routes** act as secure proxy
- Extract tokens from HTTP-only cookies
- Forward requests to microservices
- Axios interceptors handle errors and retries

### 4. Real-time Updates
- **WebSocket** connection to Orders service
- Live order status updates
- Automatic UI refresh on changes

### 5. SEO Optimization
- Dynamic metadata for all pages
- Product pages with structured data (JSON-LD)
- Automatic sitemap generation
- Robots.txt configuration
- Open Graph tags for social sharing

---

## 🚀 Deployment

See **[docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md)** for comprehensive deployment instructions.

### Quick Deploy Options

**Vercel (Recommended)**
```bash
vercel --prod
```

**Docker**
```bash
docker build -t ecommerce-frontend .
docker run -p 3000:3000 ecommerce-frontend
```

**Traditional Server**
```bash
npm run build
pm2 start ecosystem.config.js --env production
```

---

## 📚 Documentation

- **[Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md)** - Complete deployment instructions
- **[SEO & Production Improvements](./docs/SEO_AND_PRODUCTION_IMPROVEMENTS.md)** - SEO optimizations summary

---

## 🔍 Development Tips

### Hot Reload
```bash
npm run dev
```
Changes auto-reload in development mode.

### Type Checking
```bash
npm run type-check
```
Run before committing to catch TypeScript errors.

### Debugging
- Use the included logger: `import { logger } from '@/utils/logger'`
- Check browser console for client-side logs
- Check terminal for server-side logs

### Testing API Routes
```bash
curl http://localhost:3006/api/products
```

---

## 🐛 Troubleshooting

**Build Fails**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Environment Variables Not Working**
- Ensure they start with `NEXT_PUBLIC_` for client-side
- Restart server after changing env vars

**Microservices Not Reachable**
- Verify all services are running
- Check URLs in `.env.local`
- Verify network connectivity

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run `npm run lint` and `npm run type-check`
4. Commit with descriptive message
5. Create pull request

---

## 📄 License

[Your License Here]

---

**Built with ❤️ by the E-commerce Platform Team**
