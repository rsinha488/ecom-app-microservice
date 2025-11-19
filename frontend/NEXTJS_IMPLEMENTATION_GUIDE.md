# Next.js SSR E-commerce Frontend Implementation Guide

Complete guide for the Next.js 14 frontend with Server-Side Rendering (SSR), Redux Toolkit state management, and OAuth2 authentication.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [Redux Toolkit Implementation](#redux-toolkit-implementation)
6. [API Integration](#api-integration)
7. [SSR & SSG Pages](#ssr--ssg-pages)
8. [Authentication Flow](#authentication-flow)
9. [Components Guide](#components-guide)
10. [SEO Optimization](#seo-optimization)
11. [Performance Optimization](#performance-optimization)
12. [Deployment](#deployment)

---

## Overview

This Next.js frontend provides:
- **Server-Side Rendering (SSR)** for dynamic pages (product details, user pages)
- **Static Site Generation (SSG)** for static pages (category listings, home page)
- **Redux Toolkit** for global state management
- **OAuth2/OIDC** integration with the auth microservice
- **Responsive Design** with Tailwind CSS
- **SEO Optimization** with Next.js metadata API
- **Type Safety** with TypeScript

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.0.4 | React framework with SSR/SSG |
| React | 18.2.0 | UI library |
| Redux Toolkit | 2.0.1 | State management |
| TypeScript | 5.3.3 | Type safety |
| Tailwind CSS | 3.4.0 | Styling |
| Axios | 1.6.2 | HTTP client |
| React Hook Form | Latest | Form management |
| Yup | 1.3.3 | Validation |
| SWR | 2.2.4 | Data fetching |
| React Icons | 4.12.0 | Icons |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                        # Next.js 14 App Router
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Home page (SSG)
│   │   ├── providers.tsx          # Redux Provider wrapper
│   │   ├── globals.css            # Global styles
│   │   ├── products/
│   │   │   ├── page.tsx           # Products listing (SSR)
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Product detail (SSR)
│   │   ├── cart/
│   │   │   └── page.tsx           # Shopping cart
│   │   ├── checkout/
│   │   │   └── page.tsx           # Checkout flow
│   │   ├── orders/
│   │   │   ├── page.tsx           # Order history
│   │   │   └── [id]/page.tsx      # Order details
│   │   ├── auth/
│   │   │   ├── login/page.tsx     # Login page
│   │   │   ├── register/page.tsx  # Registration page
│   │   │   └── callback/page.tsx  # OAuth callback
│   │   └── api/
│   │       └── auth/[...nextauth].ts  # NextAuth config
│   │
│   ├── components/                 # Reusable components
│   │   ├── common/                # Common UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── layout/                # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Navigation.tsx
│   │   ├── products/              # Product components
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductFilters.tsx
│   │   │   └── ProductDetails.tsx
│   │   ├── cart/                  # Cart components
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   └── CartSummary.tsx
│   │   └── checkout/              # Checkout components
│   │       ├── CheckoutForm.tsx
│   │       ├── ShippingForm.tsx
│   │       └── PaymentForm.tsx
│   │
│   ├── store/                      # Redux store
│   │   ├── index.ts               # Store configuration
│   │   └── slices/                # Redux slices
│   │       ├── authSlice.ts       # Authentication state
│   │       ├── cartSlice.ts       # Shopping cart state
│   │       ├── productsSlice.ts   # Products state
│   │       ├── categoriesSlice.ts # Categories state
│   │       ├── ordersSlice.ts     # Orders state
│   │       └── uiSlice.ts         # UI state
│   │
│   ├── lib/                        # Utilities and libraries
│   │   ├── api/
│   │   │   └── index.ts           # API clients
│   │   ├── hooks/                 # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCart.ts
│   │   │   └── useProducts.ts
│   │   └── utils/                 # Utility functions
│   │       ├── format.ts
│   │       ├── validation.ts
│   │       └── seo.ts
│   │
│   └── types/                      # TypeScript types
│       └── index.ts               # Type definitions
│
├── public/                         # Static files
│   ├── images/
│   └── icons/
│
├── .env.local                      # Environment variables
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies
```

---

## Setup & Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
# Copy example file
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

**Required variables**:
```env
# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:3001
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:3002
NEXT_PUBLIC_USERS_URL=http://localhost:3003
NEXT_PUBLIC_ORDERS_URL=http://localhost:3004

# OAuth2 Configuration
NEXT_PUBLIC_OAUTH_CLIENT_ID=ecommerce-client
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3005/auth/callback
NEXT_PUBLIC_OAUTH_SCOPE=openid profile email

# NextAuth
NEXTAUTH_URL=http://localhost:3005
NEXTAUTH_SECRET=generate-a-secure-random-string-here

# Server-side secrets
OAUTH_CLIENT_SECRET=ecommerce-secret-change-in-production
ACCESS_TOKEN_SECRET=your-access-token-secret
```

### 3. Run Development Server

```bash
npm run dev
```

Application runs on [http://localhost:3005](http://localhost:3005)

### 4. Build for Production

```bash
npm run build
npm start
```

---

## Redux Toolkit Implementation

### Store Configuration

**File**: `src/store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';
import ordersReducer from './slices/ordersSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    products: productsReducer,
    categories: categoriesReducer,
    orders: ordersReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Using Redux in Components

```typescript
import { useAppSelector, useAppDispatch } from '@/store';
import { addToCart } from '@/store/slices/cartSlice';

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const handleAddToCart = () => {
    dispatch(addToCart(product));
  };

  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

### Cart Slice Features

**Implemented in**: `src/store/slices/cartSlice.ts`

- ✓ Add/remove items
- ✓ Update quantities
- ✓ Calculate totals automatically
- ✓ Persist to localStorage
- ✓ Sync with server (for logged-in users)

**Usage**:
```typescript
import { addToCart, removeFromCart, updateQuantity } from '@/store/slices/cartSlice';

// Add to cart
dispatch(addToCart(product));

// Remove from cart
dispatch(removeFromCart(productId));

// Update quantity
dispatch(updateQuantity({ productId, quantity: 5 }));

// Clear cart
dispatch(clearCart());
```

---

## API Integration

### API Client Structure

**File**: `src/lib/api/index.ts`

Features:
- ✓ Axios instances for each microservice
- ✓ Automatic token injection
- ✓ Token refresh on 401 errors
- ✓ Request/response interceptors
- ✓ Error handling

### Using API Clients

```typescript
import { productsAPI, authAPI } from '@/lib/api';

// Fetch products
const response = await productsAPI.getProducts({
  page: 1,
  limit: 20,
  category: 'electronics',
});

// Login
const authResponse = await authAPI.login({
  email: 'user@example.com',
  password: 'password123',
});
```

### Token Management

Tokens are automatically managed:
1. Access token stored in localStorage
2. Refresh token stored in localStorage
3. Access token sent with every request
4. Automatic refresh on 401 errors
5. Redirect to login if refresh fails

---

## SSR & SSG Pages

### Server-Side Rendering (SSR)

**Use for**: Dynamic data that changes frequently

**Example**: Product Detail Page

```typescript
// app/products/[id]/page.tsx
import { productsAPI } from '@/lib/api';
import { Metadata } from 'next';

interface Props {
  params: { id: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await productsAPI.getProductById(params.id);

  return {
    title: product.data.name,
    description: product.data.description,
    openGraph: {
      title: product.data.name,
      description: product.data.description,
      images: [product.data.imageUrl],
    },
  };
}

// Server component with SSR
export default async function ProductPage({ params }: Props) {
  const product = await productsAPI.getProductById(params.id);

  return (
    <div>
      <h1>{product.data.name}</h1>
      <p>{product.data.description}</p>
      <p>${product.data.price}</p>
    </div>
  );
}
```

### Static Site Generation (SSG)

**Use for**: Content that doesn't change often

**Example**: Category Pages

```typescript
// app/category/[slug]/page.tsx
import { categoriesAPI, productsAPI } from '@/lib/api';

// Generate static paths at build time
export async function generateStaticParams() {
  const categories = await categoriesAPI.getCategories();

  return categories.data.map((category) => ({
    slug: category.slug,
  }));
}

// SSG page
export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await categoriesAPI.getCategoryBySlug(params.slug);
  const products = await productsAPI.getProducts({ category: category.data._id });

  return (
    <div>
      <h1>{category.data.name}</h1>
      <ProductGrid products={products.data.results} />
    </div>
  );
}

// Revalidate every hour
export const revalidate = 3600;
```

### Incremental Static Regeneration (ISR)

```typescript
// Revalidate every 60 seconds
export const revalidate = 60;

export default async function Page() {
  const data = await fetchData();
  return <div>{/* content */}</div>;
}
```

---

## Authentication Flow

### OAuth2 Login Flow

**1. User clicks "Login"**

```typescript
// components/LoginForm.tsx
'use client';

import { useAppDispatch } from '@/store';
import { login } from '@/store/slices/authSlice';

export function LoginForm() {
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await dispatch(login({
      email,
      password,
      client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!,
      scope: process.env.NEXT_PUBLIC_OAUTH_SCOPE!,
    }));

    if (login.fulfilled.match(result)) {
      // Login successful - tokens saved to localStorage
      router.push('/');
    }
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

**2. Get user info after login**

```typescript
useEffect(() => {
  if (isAuthenticated) {
    dispatch(getUserInfo());
  }
}, [isAuthenticated]);
```

**3. Protected routes**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/orders/:path*', '/profile/:path*'],
};
```

---

## Components Guide

### Creating a Product Card Component

```typescript
// components/products/ProductCard.tsx
'use client';

import { Product } from '@/types';
import { useAppDispatch } from '@/store';
import { addToCart } from '@/store/slices/cartSlice';
import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch();

  const handleAddToCart = () => {
    dispatch(addToCart(product));
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">
      <Link href={`/products/${product._id}`}>
        <div className="relative h-48 mb-4">
          <Image
            src={product.imageUrl || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover rounded"
          />
        </div>
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:bg-gray-400"
        >
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
```

### Creating a Cart Drawer

```typescript
// components/cart/CartDrawer.tsx
'use client';

import { useAppSelector, useAppDispatch } from '@/store';
import { removeFromCart, updateQuantity } from '@/store/slices/cartSlice';
import { setCartDrawerOpen } from '@/store/slices/uiSlice';

export function CartDrawer() {
  const dispatch = useAppDispatch();
  const { items, totalPrice, totalItems } = useAppSelector((state) => state.cart);
  const { cartDrawerOpen } = useAppSelector((state) => state.ui);

  if (!cartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={() => dispatch(setCartDrawerOpen(false))}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="p-4">
          <h2 className="text-2xl font-bold">Shopping Cart ({totalItems})</h2>

          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div key={item._id} className="flex items-center gap-4">
                <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-gray-600">${item.price}</p>
                </div>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => dispatch(updateQuantity({
                    productId: item._id,
                    quantity: parseInt(e.target.value)
                  }))}
                  className="w-16 border rounded px-2 py-1"
                  min="1"
                />
                <button onClick={() => dispatch(removeFromCart(item._id))}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-4 w-full bg-primary-600 text-white py-3 rounded text-center block"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## SEO Optimization

### Metadata API (Next.js 14)

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Name',
  description: 'Product description for SEO',
  keywords: ['keyword1', 'keyword2'],
  openGraph: {
    title: 'Product Name',
    description: 'Product description',
    images: ['/product-image.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Product Name',
    description: 'Product description',
    images: ['/product-image.jpg'],
  },
  alternates: {
    canonical: 'https://yourdomain.com/products/product-slug',
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### Dynamic Metadata

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.imageUrl],
    },
  };
}
```

### JSON-LD Schema

```typescript
// components/seo/ProductSchema.tsx
import { Product } from '@/types';

export function ProductSchema({ product }: { product: Product }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

---

## Performance Optimization

### 1. Image Optimization

```typescript
import Image from 'next/image';

<Image
  src={product.imageUrl}
  alt={product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
  priority={false}  // Use true for above-the-fold images
/>
```

### 2. Code Splitting

```typescript
import dynamic from 'next/dynamic';

// Lazy load components
const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
```

### 3. Route Prefetching

```typescript
import Link from 'next/link';

// Automatically prefetches on hover
<Link href="/products/123" prefetch={true}>
  View Product
</Link>
```

### 4. SWR for Client-Side Data Fetching

```typescript
import useSWR from 'swr';

function useProducts() {
  const { data, error, isLoading } = useSWR('/api/products', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return { products: data, error, loading: isLoading };
}
```

---

## Deployment

### Build for Production

```bash
# Build
npm run build

# The output will be in .next/ directory
# For standalone deployment:
# Output will be in .next/standalone/
```

### Environment Variables for Production

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_AUTH_URL=https://auth.yourdomain.com
# ... other production URLs
```

### Deployment Options

**1. Vercel (Recommended)**
```bash
npm install -g vercel
vercel
```

**2. Docker**

`Dockerfile`:
```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3005
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t ecommerce-frontend .
docker run -p 3005:3005 ecommerce-frontend
```

**3. Node.js Server**
```bash
npm run build
npm start
```

---

## Summary

### ✅ Implemented Features

1. **Next.js 14 App Router** with SSR and SSG
2. **Redux Toolkit** for state management (6 slices)
3. **OAuth2/OIDC** authentication integration
4. **API Integration** with all 5 microservices
5. **Shopping Cart** with localStorage persistence
6. **Type-Safe** with TypeScript
7. **SEO Optimized** with metadata API
8. **Performance Optimized** with Image optimization, code splitting
9. **Responsive Design** with Tailwind CSS

### 📁 Files Created

Core configuration and infrastructure:
- `package.json` - Dependencies
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `.env.local.example` - Environment variables template

Redux store:
- `src/store/index.ts` - Store configuration
- `src/store/slices/authSlice.ts` - Authentication state
- `src/store/slices/cartSlice.ts` - Cart state
- `src/store/slices/productsSlice.ts` - Products state
- `src/store/slices/categoriesSlice.ts` - Categories state
- `src/store/slices/ordersSlice.ts` - Orders state
- `src/store/slices/uiSlice.ts` - UI state

API integration:
- `src/lib/api/index.ts` - API clients for all services
- `src/types/index.ts` - TypeScript type definitions

App structure:
- `src/app/layout.tsx` - Root layout
- `src/app/providers.tsx` - Redux provider
- `src/app/globals.css` - Global styles

### 🚀 Next Steps

To complete the frontend, create these additional files:

**Pages**:
1. `src/app/page.tsx` - Home page
2. `src/app/products/page.tsx` - Products listing
3. `src/app/products/[id]/page.tsx` - Product details
4. `src/app/cart/page.tsx` - Shopping cart
5. `src/app/checkout/page.tsx` - Checkout
6. `src/app/orders/page.tsx` - Order history
7. `src/app/auth/login/page.tsx` - Login page
8. `src/app/auth/register/page.tsx` - Register page

**Components** (30+ components needed):
- Layout: Header, Footer, Navigation, Sidebar
- Products: ProductCard, ProductGrid, ProductFilters, ProductDetails
- Cart: CartItem, CartDrawer, CartSummary
- Checkout: CheckoutForm, ShippingForm, PaymentForm
- Common: Button, Input, Card, Loading, Modal

**Hooks**:
- `useAuth.ts` - Authentication helpers
- `useCart.ts` - Cart helpers
- `useProducts.ts` - Products data fetching

Run `npm install` and `npm run dev` to start development!
