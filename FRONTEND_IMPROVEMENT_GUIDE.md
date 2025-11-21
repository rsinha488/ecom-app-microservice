# Frontend Improvement Guide

**Date:** 2025-11-20
**Project:** LaunchpadMERN E-commerce Platform
**Frontend Framework:** Next.js 14 (App Router) + React + TypeScript + Redux Toolkit

---

## Table of Contents

1. [Current Architecture Overview](#1-current-architecture-overview)
2. [Folder Structure Recommendations](#2-folder-structure-recommendations)
3. [Naming Convention Standards](#3-naming-convention-standards)
4. [Performance Optimizations](#4-performance-optimizations)
5. [Code Quality Improvements](#5-code-quality-improvements)
6. [Critical Issues to Fix](#6-critical-issues-to-fix)
7. [Best Practices Implementation](#7-best-practices-implementation)
8. [Testing Strategy](#8-testing-strategy)
9. [Accessibility (a11y) Improvements](#9-accessibility-improvements)
10. [SEO Enhancements](#10-seo-enhancements)

---

## 1. Current Architecture Overview

### ✅ Strengths

**Well-Organized Structure:**
```
frontend/src/
├── app/              # Next.js 14 App Router (✅ Modern)
├── components/       # Reusable components (✅ Clean separation)
├── hooks/           # Custom React hooks (✅ Good abstraction)
├── lib/             # API clients & utilities (✅ Centralized logic)
├── store/           # Redux Toolkit state (✅ Proper state management)
├── types/           # TypeScript definitions (✅ Type safety)
├── constants/       # Shared constants (✅ Single source of truth)
└── utils/           # Helper functions (✅ Reusable utilities)
```

**Good Patterns in Use:**
- ✅ TypeScript for type safety
- ✅ Redux Toolkit with typed hooks
- ✅ Async thunks for API calls
- ✅ Custom hooks for reusability
- ✅ API client with interceptors
- ✅ Security middleware
- ✅ Centralized error handling

---

## 2. Folder Structure Recommendations

### Current vs. Recommended Structure

#### **RECOMMENDED: Enhanced Structure**

```typescript
frontend/src/
├── app/                           # Next.js App Router pages
│   ├── (auth)/                   # ✨ NEW: Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (marketing)/              # ✨ NEW: Public pages group
│   │   ├── about/
│   │   ├── contact/
│   │   └── page.tsx             # Move home here
│   ├── (shop)/                   # ✨ NEW: Protected shop routes
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   └── products/
│   ├── api/
│   ├── layout.tsx
│   └── providers.tsx
│
├── components/
│   ├── common/                   # ✨ NEW: Shared UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css  # ✨ NEW: CSS Modules
│   │   │   ├── Button.test.tsx    # ✨ NEW: Tests
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Spinner/
│   │   ├── Toast/
│   │   └── index.ts               # Barrel export
│   │
│   ├── features/                  # ✨ NEW: Feature-based organization
│   │   ├── auth/
│   │   │   ├── LoginForm/
│   │   │   ├── RegisterForm/
│   │   │   ├── ProtectedRoute/
│   │   │   └── index.ts
│   │   ├── cart/
│   │   │   ├── CartItem/
│   │   │   ├── CartSummary/
│   │   │   ├── CartDrawer/
│   │   │   └── index.ts
│   │   ├── orders/
│   │   │   ├── OrderCard/
│   │   │   ├── OrderStatusBadge/
│   │   │   ├── OrderStatusSelect/
│   │   │   └── index.ts
│   │   └── products/
│   │       ├── ProductCard/
│   │       ├── ProductGrid/
│   │       ├── ProductFilters/
│   │       ├── ProductSearch/
│   │       └── index.ts
│   │
│   └── layout/
│       ├── Header/
│       │   ├── Header.tsx
│       │   ├── Header.module.css
│       │   ├── Header.test.tsx
│       │   └── index.ts
│       ├── Footer/
│       ├── Sidebar/
│       └── index.ts
│
├── config/                        # ✨ NEW: App configuration
│   ├── constants.ts              # App-wide constants
│   ├── env.ts                    # Environment variables with validation
│   └── routes.ts                 # Route constants
│
├── hooks/
│   ├── api/                      # ✨ NEW: API-specific hooks
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useOrders.ts
│   │   └── index.ts
│   ├── ui/                       # ✨ NEW: UI-specific hooks
│   │   ├── useDebounce.ts
│   │   ├── useInfiniteScroll.ts
│   │   ├── useMediaQuery.ts     # ✨ NEW
│   │   ├── useLocalStorage.ts   # ✨ NEW
│   │   └── index.ts
│   └── index.ts
│
├── lib/
│   ├── api/
│   │   ├── clients/              # ✨ NEW: Separate client configs
│   │   │   ├── authClient.ts
│   │   │   ├── productsClient.ts
│   │   │   ├── ordersClient.ts
│   │   │   └── baseClient.ts    # Shared Axios instance
│   │   ├── endpoints/            # ✨ NEW: Organized endpoints
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   └── index.ts
│   │   └── interceptors/         # ✨ NEW: Axios interceptors
│   │       ├── authInterceptor.ts
│   │       ├── errorInterceptor.ts
│   │       └── index.ts
│   ├── storage/                  # ✨ NEW: Storage abstraction
│   │   ├── localStorage.ts
│   │   ├── sessionStorage.ts
│   │   ├── cookies.ts
│   │   └── index.ts
│   ├── validation/               # ✨ NEW: Validation schemas
│   │   ├── authSchemas.ts       # Zod schemas
│   │   ├── productSchemas.ts
│   │   └── index.ts
│   └── utils/                    # ✨ RENAME from root utils/
│       ├── formatters.ts         # Date, currency formatters
│       ├── validators.ts
│       └── helpers.ts
│
├── store/
│   ├── slices/
│   │   ├── auth/                 # ✨ NEW: One folder per slice
│   │   │   ├── authSlice.ts
│   │   │   ├── authSelectors.ts  # ✨ NEW: Memoized selectors
│   │   │   ├── authThunks.ts     # ✨ NEW: Separate thunks
│   │   │   └── index.ts
│   │   ├── cart/
│   │   ├── products/
│   │   └── orders/
│   ├── middleware/               # ✨ NEW: Custom middleware
│   │   ├── logger.ts
│   │   └── index.ts
│   └── index.ts
│
├── styles/                       # ✨ NEW: Global styles
│   ├── globals.css
│   ├── variables.css             # CSS custom properties
│   ├── mixins.scss               # If using SCSS
│   └── themes/
│       ├── light.css
│       └── dark.css
│
├── types/
│   ├── api/                      # ✨ NEW: API types
│   │   ├── responses.ts
│   │   ├── requests.ts
│   │   └── index.ts
│   ├── models/                   # ✨ NEW: Domain models
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── index.ts
│   ├── enums/                    # ✨ NEW: Enum types
│   │   ├── OrderStatus.ts
│   │   └── index.ts
│   └── index.ts
│
└── __tests__/                    # ✨ NEW: Test utilities
    ├── mocks/
    │   ├── handlers.ts           # MSW handlers
    │   └── server.ts             # MSW server
    ├── fixtures/
    │   ├── products.ts
    │   └── users.ts
    └── utils/
        └── testUtils.tsx         # Testing Library setup
```

---

## 3. Naming Convention Standards

### File Naming

```typescript
// ✅ CORRECT PATTERNS

// Components: PascalCase
ProductCard.tsx
OrderStatusBadge.tsx
UserProfile.tsx

// Hooks: camelCase with "use" prefix
useAuth.ts
useDebounce.ts
useInfiniteScroll.ts

// Utils/Helpers: camelCase
formatCurrency.ts
validateEmail.ts
apiErrorHandler.ts

// Types: PascalCase or descriptive
User.ts
Product.types.ts
api.types.ts

// Constants: SCREAMING_SNAKE_CASE or camelCase file
ORDER_STATUS.ts
appConfig.ts

// Redux slices: camelCase with "Slice" suffix
authSlice.ts
productsSlice.ts

// API clients: camelCase with "Client" or "API" suffix
authClient.ts
productsAPI.ts

// Tests: Same as source with .test or .spec
Button.test.tsx
useDebounce.spec.ts

// Styles: Same as component with .module extension
Button.module.css
Header.module.scss
```

### Variable & Function Naming

```typescript
// ✅ CORRECT PATTERNS

// React Components: PascalCase
const ProductCard: React.FC<Props> = () => { };
export default function UserProfile() { }

// Custom hooks: camelCase with "use" prefix
const useAuth = () => { };
const useLocalStorage = <T,>(key: string) => { };

// Functions: camelCase, descriptive verbs
const fetchProducts = async () => { };
const handleSubmit = (e: FormEvent) => { };
const calculateTotal = (items: CartItem[]) => { };

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'http://localhost:8080';
const MAX_RETRY_ATTEMPTS = 3;

// Enums: PascalCase
enum OrderStatus {
  Pending = 1,
  Processing = 2,
}

// Interfaces/Types: PascalCase with descriptive names
interface User { }
type APIResponse<T> = { };

// Boolean variables: "is", "has", "should" prefix
const isLoading = false;
const hasError = true;
const shouldRetry = true;

// Event handlers: "handle" prefix
const handleClick = () => { };
const handleChange = (e: ChangeEvent) => { };
const handleSubmit = async (e: FormEvent) => { };

// Async functions: descriptive, async operation clear
const fetchUserData = async () => { };
const saveOrder = async (order: Order) => { };

// Array variables: plural
const products = [];
const users = [];
const items = [];

// State variables: descriptive, pair with setter
const [isOpen, setIsOpen] = useState(false);
const [products, setProducts] = useState<Product[]>([]);
const [error, setError] = useState<string | null>(null);
```

---

## 4. Performance Optimizations

### 4.1 Code Splitting & Lazy Loading

```typescript
// ❌ CURRENT (likely): Import everything upfront
import ProductCard from '@/components/product/ProductCard';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';

// ✅ RECOMMENDED: Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const ProductCard = dynamic(() => import('@/components/features/products/ProductCard'), {
  loading: () => <ProductCardSkeleton />,
  ssr: true, // Enable SSR for SEO
});

const OrdersPage = dynamic(() => import('@/app/(shop)/orders/page'), {
  loading: () => <PageLoader />,
  ssr: false, // Client-side only for authenticated pages
});

// Lazy load modals (only when opened)
const CheckoutModal = dynamic(() => import('@/components/features/checkout/CheckoutModal'), {
  ssr: false,
});
```

### 4.2 React Performance Patterns

```typescript
// ✅ RECOMMENDED: Memoization patterns

// 1. useMemo for expensive calculations
const filteredProducts = useMemo(() => {
  return products.filter(p => p.category === selectedCategory)
                 .sort((a, b) => b.price - a.price);
}, [products, selectedCategory]); // Only recompute when these change

// 2. useCallback for event handlers (prevent child re-renders)
const handleAddToCart = useCallback((product: Product) => {
  dispatch(addToCart(product));
}, [dispatch]);

// 3. React.memo for expensive components
export const ProductCard = React.memo<ProductCardProps>(({ product }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if product ID changed
  return prevProps.product._id === nextProps.product._id;
});

// 4. Virtualization for long lists
import { FixedSizeList as List } from 'react-window';

const ProductList = ({ products }: { products: Product[] }) => (
  <List
    height={600}
    itemCount={products.length}
    itemSize={200}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <ProductCard product={products[index]} />
      </div>
    )}
  </List>
);
```

### 4.3 Image Optimization

```typescript
// ❌ AVOID: Regular img tags
<img src={product.image} alt={product.name} />

// ✅ RECOMMENDED: Next.js Image component
import Image from 'next/image';

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL={product.thumbnailBase64}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// For product grids
<Image
  src={product.image}
  alt={product.name}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 4.4 API & Data Fetching Optimization

```typescript
// ✅ RECOMMENDED: Implement request deduplication

// lib/api/cache.ts
import { cache } from 'react';

// Next.js cache() - deduplicates requests in same render
export const getProducts = cache(async (params: ProductParams) => {
  const response = await productsClient.get('/products', { params });
  return response.data;
});

// SWR for client-side caching
import useSWR from 'swr';

const useProducts = (category?: string) => {
  const { data, error, mutate } = useSWR(
    category ? `/products?category=${category}` : '/products',
    productsAPI.getProducts,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000, // Prevent duplicate requests within 2s
    }
  );

  return {
    products: data?.products ?? [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
};

// React Query alternative (even better)
import { useQuery } from '@tanstack/react-query';

const useProducts = (category?: string) => {
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => productsAPI.getProducts({ category }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### 4.5 Bundle Size Optimization

```typescript
// ✅ RECOMMENDED: Tree-shakeable imports

// ❌ AVOID: Import entire library
import _ from 'lodash';
import * as Icons from 'react-icons/fi';

// ✅ DO: Import only what you need
import debounce from 'lodash/debounce';
import { FiSearch, FiUser, FiShoppingCart } from 'react-icons/fi';

// Use dynamic imports for heavy libraries
const DatePicker = dynamic(() => import('react-datepicker'));
```

### 4.6 Rendering Performance

```typescript
// ✅ RECOMMENDED: Avoid unnecessary re-renders

// Move static data outside component
const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Electronics', value: 'electronics' },
];

const ProductFilters = () => {
  // Don't recreate this array on every render
  return FILTER_OPTIONS.map(option => (
    <FilterButton key={option.value} {...option} />
  ));
};

// Use stable references
const ProductList = () => {
  // ❌ New array on every render
  const [selected, setSelected] = useState([]);

  // ✅ Stable empty array reference
  const [selected, setSelected] = useState<string[]>(() => []);
};
```

---

## 5. Code Quality Improvements

### 5.1 Fix API Client Usage Inconsistency

**ISSUE:** Currently mixing raw `fetch()` and API clients

```typescript
// ❌ CURRENT: authSlice.ts uses raw fetch
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return response.json();
  }
);

// ✅ RECOMMENDED: Use the API client
import { authAPI } from '@/lib/api';

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

### 5.2 Create Storage Abstraction Layer

```typescript
// ✅ NEW FILE: lib/storage/index.ts

export interface StorageAdapter {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
}

class LocalStorageAdapter implements StorageAdapter {
  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
}

export const storage = new LocalStorageAdapter();

// Usage in cartSlice.ts
import { storage } from '@/lib/storage';

const cartSlice = createSlice({
  name: 'cart',
  initialState: storage.getItem<CartItem[]>('cart') ?? [],
  // ...
});
```

### 5.3 Centralize Type Definitions

```typescript
// ✅ RECOMMENDED: Single source of truth for API types

// types/api/responses.ts
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface APIError {
  success: false;
  error: string;
  message: string;
  details?: Record<string, string[]>;
}

// Remove duplicate definitions from:
// - lib/api/apiClient.ts
// - types/index.ts
```

### 5.4 Error Boundary Implementation

```typescript
// ✅ NEW: components/common/ErrorBoundary/ErrorBoundary.tsx

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### 5.5 Input Validation with Zod

```typescript
// ✅ NEW: lib/validation/authSchemas.ts

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
});

export const registerSchema = loginSchema.extend({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Usage in LoginForm
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    // Data is validated and typed!
    await authAPI.login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
};
```

---

## 6. Critical Issues to Fix

### Priority 1: API Call Consistency

**Files to Update:**

1. **authSlice.ts** - Replace fetch with authAPI
2. **Products page** - Move category fetching to Redux or custom hook
3. **All components** - Use API clients consistently

**Implementation:**

```typescript
// store/slices/auth/authThunks.ts (NEW FILE)
import { createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '@/lib/api';
import { storage } from '@/lib/storage';

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginInput, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens
      storage.setItem('accessToken', accessToken);
      storage.setItem('refreshToken', refreshToken);

      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterInput, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      storage.removeItem('accessToken');
      storage.removeItem('refreshToken');
    } catch (error: any) {
      // Still clear tokens even if API call fails
      storage.removeItem('accessToken');
      storage.removeItem('refreshToken');
      return rejectWithValue(error.message);
    }
  }
);

// store/slices/auth/authSlice.ts (UPDATE)
import { login, register, logout } from './authThunks';

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    // ... register and logout cases
  },
});
```

### Priority 2: Component Organization

**Refactor Components into Feature Folders:**

```bash
# Current
components/
├── product/
│   └── ProductCard.tsx

# Recommended
components/
├── features/
│   └── products/
│       ├── ProductCard/
│       │   ├── index.ts
│       │   ├── ProductCard.tsx
│       │   ├── ProductCard.module.css
│       │   ├── ProductCard.test.tsx
│       │   └── ProductCardSkeleton.tsx
│       ├── ProductGrid/
│       ├── ProductFilters/
│       └── index.ts
```

### Priority 3: Environment Variable Validation

```typescript
// ✅ NEW: config/env.ts

import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_GATEWAY_URL: z.string().url(),
  NEXT_PUBLIC_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_PRODUCTS_URL: z.string().url(),
  NEXT_PUBLIC_ORDERS_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();

// Usage
import { env } from '@/config/env';

const apiUrl = env.NEXT_PUBLIC_API_GATEWAY_URL; // Type-safe!
```

---

## 7. Best Practices Implementation

### 7.1 Custom Hook for Data Fetching

```typescript
// ✅ NEW: hooks/api/useProducts.ts

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchProducts, clearFilters } from '@/store/slices/products';

interface UseProductsOptions {
  category?: string;
  autoFetch?: boolean;
}

export const useProducts = (options: UseProductsOptions = {}) => {
  const { category, autoFetch = true } = options;
  const dispatch = useAppDispatch();

  const {
    items: products,
    loading,
    error,
    pagination,
  } = useAppSelector((state) => state.products);

  useEffect(() => {
    if (autoFetch) {
      dispatch(fetchProducts({ category }));
    }

    return () => {
      dispatch(clearFilters());
    };
  }, [dispatch, category, autoFetch]);

  const refresh = () => {
    dispatch(fetchProducts({ category }));
  };

  return {
    products,
    loading,
    error,
    pagination,
    refresh,
  };
};

// Usage in component
const ProductsPage = () => {
  const { products, loading, error, refresh } = useProducts({
    category: 'electronics',
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return <ProductGrid products={products} onRefresh={refresh} />;
};
```

### 7.2 Compound Component Pattern

```typescript
// ✅ RECOMMENDED: components/common/Card/Card.tsx

import { createContext, useContext } from 'react';

const CardContext = createContext<{ variant: 'default' | 'elevated' }>({
  variant: 'default'
});

export const Card = ({
  children,
  variant = 'default'
}: {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
}) => {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={`card card--${variant}`}>
        {children}
      </div>
    </CardContext.Provider>
  );
};

Card.Header = ({ children }: { children: React.ReactNode }) => {
  const { variant } = useContext(CardContext);
  return <div className={`card-header card-header--${variant}`}>{children}</div>;
};

Card.Body = ({ children }: { children: React.ReactNode }) => {
  return <div className="card-body">{children}</div>;
};

Card.Footer = ({ children }: { children: React.ReactNode }) => {
  return <div className="card-footer">{children}</div>;
};

// Usage
<Card variant="elevated">
  <Card.Header>
    <h2>Product Title</h2>
  </Card.Header>
  <Card.Body>
    <p>Product description</p>
  </Card.Body>
  <Card.Footer>
    <Button>Add to Cart</Button>
  </Card.Footer>
</Card>
```

### 7.3 Feature Flags System

```typescript
// ✅ NEW: lib/featureFlags.ts

interface FeatureFlags {
  enableCheckout: boolean;
  enableReviews: boolean;
  enableWishlist: boolean;
  enableSocialShare: boolean;
}

const flags: FeatureFlags = {
  enableCheckout: process.env.NEXT_PUBLIC_ENABLE_CHECKOUT === 'true',
  enableReviews: process.env.NEXT_PUBLIC_ENABLE_REVIEWS === 'true',
  enableWishlist: process.env.NEXT_PUBLIC_ENABLE_WISHLIST === 'true',
  enableSocialShare: true, // Always on
};

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return flags[feature] ?? false;
};

// Usage
import { isFeatureEnabled } from '@/lib/featureFlags';

const ProductPage = () => {
  return (
    <div>
      <ProductDetails />
      {isFeatureEnabled('enableReviews') && <ReviewsSection />}
      {isFeatureEnabled('enableWishlist') && <AddToWishlistButton />}
    </div>
  );
};
```

---

## 8. Testing Strategy

### 8.1 Testing Setup

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest
```

```typescript
// ✅ NEW: __tests__/utils/testUtils.tsx

import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/auth';
import productsReducer from '@/store/slices/products';

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        auth: authReducer,
        products: productsReducer,
      },
      preloadedState,
    }),
    ...renderOptions
  }: any = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

### 8.2 Component Tests

```typescript
// ✅ EXAMPLE: components/features/products/ProductCard/ProductCard.test.tsx

import { render, screen, fireEvent } from '@/__tests__/utils/testUtils';
import { ProductCard } from './ProductCard';

const mockProduct = {
  _id: '1',
  name: 'Test Product',
  price: 99.99,
  image: '/test.jpg',
  category: 'electronics',
  stock: 10,
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('shows out of stock message when stock is 0', () => {
    render(<ProductCard product={{ ...mockProduct, stock: 0 }} />);

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('calls onAddToCart when button is clicked', () => {
    const onAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});
```

### 8.3 Hook Tests

```typescript
// ✅ EXAMPLE: hooks/ui/useDebounce.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  jest.useFakeTimers();

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Still old value

    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(result.current).toBe('updated'); // Now updated
    });
  });
});
```

---

## 9. Accessibility (a11y) Improvements

### 9.1 Semantic HTML

```typescript
// ❌ AVOID: Divs everywhere
<div onClick={handleClick}>Click me</div>
<div className="heading">Title</div>

// ✅ USE: Semantic elements
<button onClick={handleClick}>Click me</button>
<h1 className="heading">Title</h1>

// ✅ Proper form structure
<form onSubmit={handleSubmit}>
  <fieldset>
    <legend>Personal Information</legend>

    <label htmlFor="name">
      Name
      <input id="name" type="text" required />
    </label>

    <label htmlFor="email">
      Email
      <input id="email" type="email" required />
    </label>
  </fieldset>

  <button type="submit">Submit</button>
</form>
```

### 9.2 ARIA Attributes

```typescript
// ✅ Accessible ProductCard
export const ProductCard = ({ product }: ProductCardProps) => {
  const [isInCart, setIsInCart] = useState(false);

  return (
    <article
      className="product-card"
      aria-labelledby={`product-${product._id}-name`}
    >
      <img
        src={product.image}
        alt={`${product.name} - ${product.category}`}
        loading="lazy"
      />

      <h3 id={`product-${product._id}-name`}>
        {product.name}
      </h3>

      <p className="price" aria-label={`Price: $${product.price}`}>
        ${product.price}
      </p>

      <button
        onClick={handleAddToCart}
        aria-label={`Add ${product.name} to cart`}
        aria-pressed={isInCart}
        disabled={product.stock === 0}
      >
        {isInCart ? 'Added' : 'Add to Cart'}
      </button>

      {product.stock === 0 && (
        <span className="out-of-stock" role="status" aria-live="polite">
          Out of stock
        </span>
      )}
    </article>
  );
};
```

### 9.3 Keyboard Navigation

```typescript
// ✅ Accessible Modal
export const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Trap focus inside modal
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};
```

---

## 10. SEO Enhancements

### 10.1 Metadata API (Next.js 14)

```typescript
// ✅ app/products/[id]/page.tsx

import { Metadata } from 'next';

export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  const product = await productsAPI.getProductById(params.id);

  return {
    title: `${product.name} | E-commerce Store`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [
        {
          url: product.image,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params
}: {
  params: { id: string }
}) {
  const product = await productsAPI.getProductById(params.id);

  return <ProductDetails product={product} />;
}
```

### 10.2 Structured Data (JSON-LD)

```typescript
// ✅ components/seo/StructuredData.tsx

export const ProductStructuredData = ({ product }: { product: Product }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product._id,
    brand: {
      '@type': 'Brand',
      name: 'Your Brand',
    },
    offers: {
      '@type': 'Offer',
      url: `https://yoursite.com/products/${product._id}`,
      priceCurrency: 'USD',
      price: product.price,
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

// Usage
<ProductDetails product={product}>
  <ProductStructuredData product={product} />
</ProductDetails>
```

---

## Summary & Action Plan

### Immediate Actions (Week 1)

1. ✅ Fix API client usage in authSlice
2. ✅ Create storage abstraction layer
3. ✅ Implement ErrorBoundary
4. ✅ Add environment variable validation
5. ✅ Refactor ProductCard into feature folder structure

### Short-term (Week 2-3)

1. ✅ Reorganize all components into feature folders
2. ✅ Add Zod validation for all forms
3. ✅ Implement React Query/SWR for data fetching
4. ✅ Add testing setup and first tests
5. ✅ Optimize images with Next.js Image component

### Medium-term (Month 1-2)

1. ✅ Complete test coverage (>80%)
2. ✅ Implement accessibility improvements
3. ✅ Add SEO enhancements
4. ✅ Performance optimization (code splitting, virtualization)
5. ✅ Set up Storybook for component documentation

### Long-term (Month 3+)

1. ✅ Migrate to newer patterns as Next.js evolves
2. ✅ Implement advanced features (PWA, i18n)
3. ✅ Add monitoring and analytics
4. ✅ Performance budgets and CI/CD integration

---

**Remember:** Incremental improvements are better than big rewrites. Focus on high-impact changes first!
