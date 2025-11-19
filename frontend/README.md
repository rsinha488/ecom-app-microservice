# E-commerce Frontend - Next.js with SSR & Redux Toolkit

Modern, performant e-commerce frontend built with Next.js 14, Server-Side Rendering, and Redux Toolkit for state management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit environment variables
nano .env.local

# Run development server
npm run dev
```

Open [http://localhost:3005](http://localhost:3005)

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Running microservices backend (ports 3000-3004)
- MongoDB database
- Redis server (for backend caching)

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Yup
- **Data Fetching**: SWR
- **Authentication**: OAuth2/OIDC

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js 14 App Router pages
│   ├── components/       # Reusable React components
│   ├── store/            # Redux Toolkit store & slices
│   ├── lib/              # API clients & utilities
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
└── ...config files
```

## 🔑 Key Features

### ✅ Implemented

- [x] Next.js 14 App Router with SSR/SSG
- [x] Redux Toolkit state management (6 slices)
- [x] OAuth2/OIDC authentication
- [x] API integration with microservices
- [x] Shopping cart with localStorage
- [x] TypeScript for type safety
- [x] Tailwind CSS responsive design
- [x] SEO optimization with metadata API
- [x] Performance optimization (image, code splitting)

### 📝 To Implement (Examples in Guide)

- [ ] Page components (home, products, cart, checkout, orders)
- [ ] UI components (30+ components)
- [ ] Custom hooks (useAuth, useCart, useProducts)
- [ ] Form components with validation
- [ ] Admin dashboard pages
- [ ] User profile pages

## 🛠️ Available Scripts

```bash
npm run dev         # Development server (localhost:3005)
npm run build       # Production build
npm start           # Start production server
npm run lint        # Run ESLint
npm run type-check  # TypeScript type checking
npm run analyze     # Analyze bundle size
```

## 📦 Redux State Structure

```typescript
{
  auth: {
    user: User | null,
    tokens: AuthTokens | null,
    isAuthenticated: boolean,
    loading: boolean
  },
  cart: {
    items: CartItem[],
    totalItems: number,
    totalPrice: number
  },
  products: {
    items: Product[],
    currentProduct: Product | null,
    filters: {...},
    pagination: {...}
  },
  categories: {
    items: Category[]
  },
  orders: {
    items: Order[],
    currentOrder: Order | null
  },
  ui: {
    sidebarOpen: boolean,
    cartDrawerOpen: boolean,
    toasts: Toast[]
  }
}
```

## 🔐 Authentication Flow

1. User submits login form
2. Frontend calls auth microservice `/api/v1/auth/login`
3. Receives access_token, refresh_token, id_token
4. Tokens stored in localStorage
5. Access token automatically attached to API requests
6. Automatic token refresh on 401 errors
7. Get user info from `/api/v1/oauth/userinfo`

## 🌐 API Integration

All microservices integrated:

- **Auth Service** (3000): Login, register, OAuth2, user info
- **Products Service** (3001): CRUD operations, search, filters
- **Categories Service** (3002): Category hierarchy
- **Users Service** (3003): User profile management
- **Orders Service** (3004): Order creation, history, tracking

**API Client Example**:
```typescript
import { productsAPI } from '@/lib/api';

// Fetch products with filters
const products = await productsAPI.getProducts({
  page: 1,
  limit: 20,
  category: 'electronics',
  minPrice: 100,
  maxPrice: 500,
});
```

## 📊 SSR & SSG Usage

**Server-Side Rendering (SSR)**:
- Product details (dynamic data)
- User dashboard (personalized)
- Order details (private data)

**Static Site Generation (SSG)**:
- Home page
- Category pages (with revalidation)
- About/Contact pages

**Incremental Static Regeneration (ISR)**:
```typescript
export const revalidate = 3600; // Revalidate every hour
```

## 🎨 Component Example

```typescript
// components/products/ProductCard.tsx
'use client';

import { Product } from '@/types';
import { useAppDispatch } from '@/store';
import { addToCart } from '@/store/slices/cartSlice';

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();

  return (
    <div className="border rounded-lg p-4">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => dispatch(addToCart(product))}>
        Add to Cart
      </button>
    </div>
  );
}
```

## 🔍 SEO Features

- Metadata API for dynamic meta tags
- Open Graph tags for social sharing
- JSON-LD structured data
- Automatic sitemap generation
- Canonical URLs
- Image optimization with Next.js Image

## 🚀 Performance Optimizations

1. **Image Optimization**: Next.js Image component with automatic optimization
2. **Code Splitting**: Dynamic imports for lazy loading
3. **Route Prefetching**: Automatic prefetching on link hover
4. **Bundle Analysis**: Analyze and optimize bundle size
5. **Caching**: SWR for client-side data caching
6. **SSR/SSG**: Server rendering for faster initial load

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS breakpoints
- Responsive navigation
- Mobile cart drawer
- Touch-friendly UI elements

## 🧪 Testing (To Implement)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📦 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Docker
```bash
docker build -t ecommerce-frontend .
docker run -p 3005:3005 ecommerce-frontend
```

### Node.js
```bash
npm run build
npm start
```

## 🔧 Environment Variables

**Development** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:3001
# ... other services
```

**Production**:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_AUTH_URL=https://auth.yourdomain.com
# ... other production URLs
```

## 📚 Documentation

- **[Implementation Guide](./NEXTJS_IMPLEMENTATION_GUIDE.md)** - Complete setup and development guide
- **[Backend API Docs](../services/README.md)** - Microservices documentation
- **[OAuth2 Guide](../services/OAUTH2_SECURITY_GUIDE.md)** - Authentication documentation
- **[MongoDB Optimization](../services/MONGODB_OPTIMIZATION_GUIDE.md)** - Database optimization
- **[Scaling Guide](../services/SCALING_STRATEGIES_GUIDE.md)** - Scaling strategies

## 🛠️ Development Workflow

1. **Start backend services**:
   ```bash
   cd ../services
   ./start-all.sh
   ```

2. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access**:
   - Frontend: http://localhost:3005
   - Auth API: http://localhost:3000
   - Products API: http://localhost:3001

## 🐛 Troubleshooting

**Issue**: API requests failing
- Check backend services are running
- Verify environment variables
- Check CORS configuration in backend

**Issue**: Token refresh loop
- Clear localStorage
- Check token expiration settings
- Verify OAuth2 client credentials

**Issue**: Build errors
- Run `npm run type-check`
- Check import paths
- Verify all dependencies installed

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run linting and type checking
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT

## 🙏 Acknowledgments

- Next.js team for the framework
- Redux Toolkit for state management
- Tailwind CSS for styling
- All open-source contributors

---

For detailed implementation guide, see [NEXTJS_IMPLEMENTATION_GUIDE.md](./NEXTJS_IMPLEMENTATION_GUIDE.md)
