# Frontend Global Error Handling Guide

Complete implementation guide for the enhanced frontend error handling system.

## Overview

The frontend now has a comprehensive error handling system that:
- ✅ Automatically handles all API errors
- ✅ Provides user-friendly error messages
- ✅ Manages token refresh automatically
- ✅ Supports retry logic for 503 errors
- ✅ Type-safe error handling with TypeScript
- ✅ Consistent error format across all services

## Architecture

### Files Created/Updated

1. **`frontend/src/utils/apiErrorHandler.ts`** - Error handler utility (already exists)
2. **`frontend/src/lib/api/apiClient.ts`** - Enhanced API client with interceptors (NEW)
3. **`frontend/src/lib/api/index.ts`** - Updated API definitions with proper types (UPDATED)
4. **`frontend/src/constants/orderStatus.ts`** - Order status constants (NEW)
5. **`frontend/src/components/orders/OrderStatusBadge.tsx`** - Status badge component (NEW)
6. **`frontend/src/components/orders/OrderStatusSelect.tsx`** - Status dropdown component (NEW)

## API Response Format

All API responses now follow this standardized format:

### Success Response
```typescript
{
  success: true,
  message: "Operation successful",
  data: {
    // Actual data here
    products: [...],
    count: 10
  },
  meta?: {
    page: 1,
    limit: 20,
    total: 100,
    pages: 5
  }
}
```

### Error Response
```typescript
{
  success: false,
  error: "Validation Error",
  message: "Email is required",
  suggestion: "Please provide a valid email address",
  fields: {
    email: "Email is required",
    password: "Password must be at least 6 characters"
  },
  statusCode: 400
}
```

## Usage Examples

### 1. Using API Clients in Components

#### Before (Old Way)
```typescript
const response = await productsAPI.getProducts();
const products = response.data; // Might be undefined
```

#### After (New Way)
```typescript
try {
  const response = await productsAPI.getProducts();
  const products = response.data.data.products; // Type-safe
  const count = response.data.data.count;
} catch (error) {
  // Error is automatically handled by interceptor
  // Toast notification already shown
  console.error('Failed to fetch products:', error);
}
```

### 2. Using in Redux Thunks

#### Updated Products Slice
```typescript
// frontend/src/store/slices/productsSlice.ts

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: ProductFilters = {}, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getProducts(params);
      // New format: response.data.data contains the actual data
      return {
        products: response.data.data.products,
        count: response.data.data.count
      };
    } catch (error: any) {
      // Extract error message from standardized format
      const message = error.message || 'Failed to fetch products';
      return rejectWithValue(message);
    }
  }
);
```

### 3. Handling Errors in Components

```typescript
import { handleAPIError, isAPIError } from '@/utils/apiErrorHandler';

async function handleSubmit() {
  try {
    const response = await ordersAPI.createOrder(orderData);
    toast.success(response.data.message);
  } catch (error) {
    if (isAPIError(error)) {
      // Error already handled by interceptor
      console.error('Order creation failed');
    }
  }
}
```

### 4. Using Order Status Components

```typescript
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderStatusSelect from '@/components/orders/OrderStatusSelect';
import { OrderStatus } from '@/constants/orderStatus';

function OrderRow({ order }) {
  const handleStatusUpdate = async (newStatus: number) => {
    try {
      const response = await ordersAPI.updateOrderStatus(order._id, newStatus);
      toast.success(response.data.message);
      // Response includes: oldStatus, oldStatusLabel, newStatus, newStatusLabel
    } catch (error) {
      // Error automatically handled
    }
  };

  return (
    <tr>
      <td>{order.orderNumber}</td>
      <td>
        <OrderStatusBadge status={order.status} size="md" />
      </td>
      <td>
        <OrderStatusSelect
          currentStatus={order.status}
          onChange={handleStatusUpdate}
        />
      </td>
    </tr>
  );
}
```

## API Client Features

### 1. Automatic Token Management

The client automatically:
- Adds access token to all requests
- Refreshes expired tokens
- Retries failed requests after refresh
- Redirects to login on refresh failure

### 2. Error Transformation

All errors are transformed to this format:
```typescript
interface APIError {
  success: false;
  error: string;        // Error type (e.g., "Validation Error")
  message: string;      // User-friendly message
  suggestion?: string;  // Helpful suggestion
  fields?: Record<string, string>; // Field-level errors
  statusCode?: number;  // HTTP status code
}
```

### 3. Retry Logic

The client automatically retries 503 (Service Unavailable) errors:
- First retry: 1 second delay
- Second retry: 2 seconds delay
- Third retry: 4 seconds delay (if configured)

### 4. Development Logging

In development mode, all requests and responses are logged:
```
[Products] GET /api/v1/products { params: { page: 1 } }
[Products] Response: { success: true, data: {...} }
[Products] Error: { status: 404, message: "Product not found" }
```

## Naming Conventions

### API Methods
Follow REST naming conventions:
- `get{Resource}` - Get single resource
- `get{Resources}` - Get multiple resources
- `create{Resource}` - Create new resource
- `update{Resource}` - Update existing resource
- `delete{Resource}` - Delete resource

Examples:
```typescript
productsAPI.getProduct(id)      // Get single
productsAPI.getProducts()       // Get multiple
productsAPI.createProduct(data) // Create
productsAPI.updateProduct(id, data) // Update
productsAPI.deleteProduct(id)   // Delete
```

### Component Naming
- Use PascalCase for components: `OrderStatusBadge`
- Use camelCase for functions: `handleStatusUpdate`
- Use UPPER_SNAKE_CASE for constants: `ORDER_STATUS_PENDING`

### File Naming
- Components: `ComponentName.tsx`
- Utils: `utilityName.ts`
- Constants: `constantName.ts`
- Types: `types.ts` or `index.ts`

## Error Handling Best Practices

### 1. Let the Interceptor Handle Errors
```typescript
// ❌ Don't manually show toasts for every error
try {
  await api.createProduct(data);
} catch (error) {
  toast.error('Failed to create product'); // Redundant!
}

// ✅ Let the interceptor handle it
try {
  await api.createProduct(data);
  toast.success('Product created!'); // Only show success
} catch (error) {
  // Error toast already shown by interceptor
  console.error('Product creation failed');
}
```

### 2. Use Field-Level Errors for Forms
```typescript
import { getFieldErrors } from '@/utils/apiErrorHandler';

async function handleSubmit() {
  try {
    await api.createProduct(formData);
  } catch (error) {
    const fieldErrors = getFieldErrors(error);
    if (fieldErrors) {
      // Set form errors for each field
      Object.keys(fieldErrors).forEach(field => {
        setError(field, { message: fieldErrors[field] });
      });
    }
  }
}
```

### 3. Handle Specific Errors
```typescript
import { isAuthError, isValidationError } from '@/utils/apiErrorHandler';

try {
  await api.updateProfile(data);
} catch (error) {
  if (isAuthError(error)) {
    // Redirect handled automatically, but you can add custom logic
    console.log('User needs to log in');
  } else if (isValidationError(error)) {
    // Handle validation errors
    console.log('Form has validation errors');
  }
}
```

## Migration Guide

### Step 1: Update Redux Slices

Change from:
```typescript
const response = await productsAPI.getProducts();
return response.data; // Old format
```

To:
```typescript
const response = await productsAPI.getProducts();
return {
  products: response.data.data.products,
  count: response.data.data.count
}; // New format
```

### Step 2: Update Components

Change from:
```typescript
const products = useSelector(state => state.products.items);
```

To:
```typescript
const { items: products, loading, error } = useSelector(state => state.products);
```

### Step 3: Update Order Status Usage

Change from:
```typescript
<span>{order.status}</span> // "pending"
```

To:
```typescript
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
<OrderStatusBadge status={order.status} /> // Colored badge with "Pending"
```

## Testing

### Testing API Calls
```typescript
import { productsAPI } from '@/lib/api';

describe('Products API', () => {
  it('should fetch products successfully', async () => {
    const response = await productsAPI.getProducts();

    expect(response.data.success).toBe(true);
    expect(response.data.data.products).toBeInstanceOf(Array);
    expect(response.data.data.count).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors properly', async () => {
    try {
      await productsAPI.getProductById('invalid-id');
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.success).toBe(false);
      expect(error.statusCode).toBe(400);
    }
  });
});
```

## Configuration

### Environment Variables
```env
# API URLs
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_URL=http://localhost:3001
NEXT_PUBLIC_CATEGORIES_URL=http://localhost:3002
NEXT_PUBLIC_USERS_URL=http://localhost:3003
NEXT_PUBLIC_ORDERS_URL=http://localhost:3004

# OAuth Configuration
NEXT_PUBLIC_OAUTH_CLIENT_ID=your-client-id
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3001/callback
NEXT_PUBLIC_OAUTH_SCOPE=openid profile email
```

### Custom Client Configuration
```typescript
import { createEnhancedAPIClient } from '@/lib/api/apiClient';

const customClient = createEnhancedAPIClient({
  baseURL: 'https://api.example.com',
  serviceName: 'Custom',
  showToastOnError: true,
  showToastOnSuccess: false,
  retryAttempts: 3
});
```

## Troubleshooting

### Issue: Seeing duplicate error toasts
**Solution**: Remove manual toast.error() calls - the interceptor handles it

### Issue: Response data is undefined
**Solution**: Access data at `response.data.data.{field}` not `response.data`

### Issue: Types not matching
**Solution**: Import `APIResponse` type and use proper generics:
```typescript
import { type APIResponse } from '@/lib/api/apiClient';

const response = await client.get<APIResponse<{ products: Product[] }>>('/products');
const products = response.data.data.products; // Type-safe
```

### Issue: Order status showing numbers instead of labels
**Solution**: Use OrderStatusBadge component or getStatusLabel() function

## Summary

The enhanced error handling system provides:

✅ **Automatic Error Handling** - No need to manually show error toasts
✅ **Type Safety** - Full TypeScript support with proper types
✅ **Token Management** - Automatic refresh and retry
✅ **Consistent Format** - Same response structure across all APIs
✅ **Better UX** - User-friendly messages and suggestions
✅ **Developer Friendly** - Clear logging and error tracking
✅ **Production Ready** - Retry logic and error recovery

Use this system to build robust, error-resilient frontend applications with minimal boilerplate code.
