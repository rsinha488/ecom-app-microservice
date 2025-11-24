# Numeric Order Status Implementation Guide

This document explains the implementation of numeric order status codes in the LaunchpadMERN e-commerce platform.

## Overview

The order status system has been upgraded to use **numeric codes** instead of string values for better performance, easier comparisons, and clearer status progression.

## Status Code Table

| Code | String      | Label      | Color  | Description                           |
|------|-------------|------------|--------|---------------------------------------|
| 1    | pending     | Pending    | Yellow | Order placed, awaiting processing     |
| 2    | processing  | Processing | Blue   | Order is being prepared/packed        |
| 3    | shipped     | Shipped    | Purple | Order has been dispatched             |
| 4    | delivered   | Delivered  | Green  | Order delivered successfully          |
| 5    | cancelled   | Cancelled  | Red    | Order has been cancelled              |

## Status Flow

```
1 (Pending) → 2 (Processing) → 3 (Shipped) → 4 (Delivered)
                    ↓
                5 (Cancelled)
```

## Valid Transitions

| From Status | Can Transition To |
|-------------|-------------------|
| Pending (1) | Processing (2), Cancelled (5) |
| Processing (2) | Shipped (3), Cancelled (5) |
| Shipped (3) | Delivered (4), Cancelled (5) |
| Delivered (4) | None (Final State) |
| Cancelled (5) | None (Final State) |

## Backend Implementation

### 1. Status Constants

**File**: `services/orders/constants/orderStatus.js`

```javascript
const ORDER_STATUS = {
  PENDING: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 5
};
```

**Key Functions**:
- `statusToString(code)` - Convert numeric to string
- `stringToStatus(string)` - Convert string to numeric
- `isValidTransition(current, new)` - Validate transitions
- `getStatusLabel(code)` - Get display label
- `getAllStatuses()` - Get all status metadata

### 2. Updated Order Model

**File**: `services/orders/models/Order.js`

```javascript
status: {
  type: Number,
  enum: [1, 2, 3, 4, 5],
  default: 1,  // Pending
  required: true
}
```

### 3. Updated Controller

**File**: `services/orders/controllers/orderController.js`

The controller now:
- Accepts numeric status codes (backward compatible with strings)
- Validates status transitions using `isValidTransition()`
- Returns both numeric code and label in responses

**Example Response**:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order": { ... },
    "oldStatus": 2,
    "oldStatusLabel": "Processing",
    "newStatus": 3,
    "newStatusLabel": "Shipped"
  }
}
```

### 4. New API Endpoint

**GET** `/api/v1/orders/statuses`

Returns all available status codes with metadata:

```json
{
  "success": true,
  "message": "Order statuses retrieved successfully",
  "data": {
    "statuses": [
      {
        "code": 1,
        "string": "pending",
        "label": "Pending",
        "color": "yellow"
      },
      ...
    ]
  }
}
```

## Frontend Implementation

### 1. TypeScript Constants

**File**: `frontend/src/constants/orderStatus.ts`

```typescript
export enum OrderStatus {
  PENDING = 1,
  PROCESSING = 2,
  SHIPPED = 3,
  DELIVERED = 4,
  CANCELLED = 5
}
```

**Key Functions**:
- `statusToString(code)` - Convert numeric to string
- `stringToStatus(string)` - Convert string to numeric
- `isValidTransition(current, new)` - Check if transition is valid
- `getStatusLabel(code)` - Get display label
- `getStatusBadgeClass(code)` - Get Tailwind CSS classes
- `getAllowedNextStatuses(current)` - Get valid next statuses

### 2. React Components

#### OrderStatusBadge Component

**File**: `frontend/src/components/orders/OrderStatusBadge.tsx`

Displays a colored badge for order status:

```tsx
<OrderStatusBadge status={OrderStatus.SHIPPED} size="md" />
```

#### OrderStatusSelect Component

**File**: `frontend/src/components/orders/OrderStatusSelect.tsx`

Dropdown for selecting/updating status (only shows valid transitions):

```tsx
<OrderStatusSelect
  currentStatus={order.status}
  onChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
/>
```

## Migration Guide

### Database Migration

Orders currently in the database with string statuses need to be migrated:

```javascript
// Migration script
const ORDER_STATUS_MAP = {
  'pending': 1,
  'processing': 2,
  'shipped': 3,
  'delivered': 4,
  'cancelled': 5
};

// Update all orders
db.orders.find({}).forEach(function(order) {
  db.orders.updateOne(
    { _id: order._id },
    { $set: { status: ORDER_STATUS_MAP[order.status] } }
  );
});
```

### API Usage Examples

#### Update Order Status (New Way)

```javascript
// Using numeric code
await fetch(`/api/v1/orders/${orderId}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 3 })  // Shipped
});
```

#### Update Order Status (Backward Compatible)

```javascript
// Still accepts string (auto-converted to numeric)
await fetch(`/api/v1/orders/${orderId}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'shipped' })
});
```

### Frontend Usage Examples

#### Display Status Badge

```tsx
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { OrderStatus } from '@/constants/orderStatus';

function OrderCard({ order }) {
  return (
    <div>
      <h3>Order #{order.orderNumber}</h3>
      <OrderStatusBadge status={order.status} />
    </div>
  );
}
```

#### Update Status with Dropdown

```tsx
import OrderStatusSelect from '@/components/orders/OrderStatusSelect';

function OrderManagement({ order }) {
  const handleStatusChange = async (newStatus: number) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      const data = await response.json();
      console.log(`Status updated from ${data.oldStatusLabel} to ${data.newStatusLabel}`);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <OrderStatusSelect
      currentStatus={order.status}
      onChange={handleStatusChange}
    />
  );
}
```

#### Manual Status Checks

```typescript
import {
  OrderStatus,
  isValidTransition,
  getAllowedNextStatuses
} from '@/constants/orderStatus';

// Check if order can be shipped
if (isValidTransition(order.status, OrderStatus.SHIPPED)) {
  // Show "Mark as Shipped" button
}

// Get all allowed next statuses
const allowedStatuses = getAllowedNextStatuses(order.status);
// Returns: [3, 5] for status 2 (Processing → Shipped or Cancelled)
```

## Benefits

### 1. Performance
- Numeric comparisons are faster than string comparisons
- Smaller database storage and index size
- Faster queries and sorting

### 2. Type Safety
- TypeScript enum provides compile-time type checking
- IDE autocomplete for status codes
- Prevents typos and invalid status values

### 3. Clearer Logic
- Status progression is visually clear (1 → 2 → 3 → 4)
- Easy to implement range checks (e.g., status >= 3)
- Simplified transition validation

### 4. Internationalization
- Numeric codes remain constant across languages
- Labels can be easily translated
- No need to map translated strings back to codes

### 5. Extensibility
- Easy to add new statuses (just assign next number)
- Backward compatible with string inputs
- Clear versioning of status system

## Testing

### Backend Tests

Test files have been updated to use numeric status codes:

```javascript
// Update order status test
test('Should update order status from pending to processing', async () => {
  req.body = { status: 2 };  // Processing
  const oldOrder = { status: 1 };  // Pending

  // ... test assertions
});
```

### Frontend Tests

```typescript
import { OrderStatus, isValidTransition } from '@/constants/orderStatus';

describe('Order Status', () => {
  it('should allow valid transitions', () => {
    expect(isValidTransition(OrderStatus.PENDING, OrderStatus.PROCESSING)).toBe(true);
    expect(isValidTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
  });
});
```

## API Documentation

### Update Order Status

**PATCH** `/api/v1/orders/:id/status`

**Request Body**:
```json
{
  "status": 3
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order": {
      "_id": "...",
      "status": 3,
      ...
    },
    "oldStatus": 2,
    "oldStatusLabel": "Processing",
    "newStatus": 3,
    "newStatusLabel": "Shipped"
  }
}
```

**Error Response (422 Unprocessable Entity)**:
```json
{
  "success": false,
  "error": "Unprocessable Entity",
  "message": "Invalid status transition",
  "details": {
    "currentStatus": 4,
    "currentStatusLabel": "Delivered",
    "attemptedStatus": 1,
    "attemptedStatusLabel": "Pending",
    "reason": "Delivered orders are final and cannot be modified"
  }
}
```

## Best Practices

1. **Always use constants**: Use `OrderStatus.PENDING` instead of `1`
2. **Validate transitions**: Always check `isValidTransition()` before updates
3. **Display labels**: Use `getStatusLabel()` for user-facing text
4. **Type safety**: Use TypeScript enum in frontend code
5. **Backward compatibility**: Support both numeric and string inputs during migration
6. **Logging**: Log both numeric code and label for debugging

## Troubleshooting

### Issue: Orders showing as undefined/null status

**Solution**: Run the database migration script to convert string statuses to numbers

### Issue: Status update returns 422 error

**Solution**: Check if the transition is valid using the status flow diagram

### Issue: Frontend shows wrong status color

**Solution**: Ensure you're using `getStatusBadgeClass()` and not hardcoding colors

## Summary

The numeric order status implementation provides:
- ✅ Better performance and smaller database footprint
- ✅ Type-safe status handling with TypeScript enums
- ✅ Clear status progression and transition rules
- ✅ Backward compatibility with string inputs
- ✅ Ready-to-use React components for UI
- ✅ Comprehensive validation and error handling
- ✅ Internationalization-friendly architecture
