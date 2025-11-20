# Real-Time Order Updates with WebSocket

This document describes the complete WebSocket implementation for real-time order notifications in the e-commerce application.

## Overview

The application uses **Socket.io** for bidirectional real-time communication between the backend and frontend. When order events occur (creation, status changes, etc.), the backend emits events to connected clients, triggering instant UI updates and toast notifications.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  useOrderSocket Hook                                      │  │
│  │  - Manages Socket.io connection                           │  │
│  │  - Listens for order events                               │  │
│  │  - Displays toast notifications                           │  │
│  │  - Triggers UI refresh                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓ ↑                                │
│                     Socket.io Client                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                    WebSocket Connection (Authenticated with JWT)
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Socket.io Server                                         │  │
│  │  - JWT Authentication                                     │  │
│  │  - User-specific rooms (user:${userId})                  │  │
│  │  - Event broadcasting                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↑ ↓                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Event Emitter (orderEvents)                             │  │
│  │  - order:created                                          │  │
│  │  - order:status_changed                                   │  │
│  │  - order:updated                                          │  │
│  │  - order:cancelled                                        │  │
│  │  - order:completed                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↑                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Order Controller                                         │  │
│  │  - Creates/updates orders                                │  │
│  │  - Emits events on changes                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Implementation

### 1. Event Emitter System

**File:** `/services/orders/events/orderEvents.js`

```javascript
const EventEmitter = require('events');

class OrderEventEmitter extends EventEmitter {}
const orderEvents = new OrderEventEmitter();

const ORDER_EVENTS = {
  CREATED: 'order:created',
  UPDATED: 'order:updated',
  STATUS_CHANGED: 'order:status_changed',
  CANCELLED: 'order:cancelled',
  COMPLETED: 'order:completed',
};

module.exports = { orderEvents, ORDER_EVENTS };
```

**Purpose:** Central event bus for order lifecycle events. Controllers emit events, Socket.io server listens and broadcasts to clients.

### 2. Socket.io Server Configuration

**File:** `/services/orders/config/socket.js`

**Key Features:**
- **JWT Authentication:** Verifies access token in handshake
- **User-Specific Rooms:** Each user joins `user:${userId}` room
- **CORS Configuration:** Allows frontend origin
- **Event Listeners:** Subscribes to order events and broadcasts to clients

**Authentication Flow:**
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
    issuer: process.env.ISSUER,
  });
  socket.userId = decoded.sub;
  next();
});
```

**Event Broadcasting Example:**
```javascript
orderEvents.on(ORDER_EVENTS.CREATED, (order) => {
  io.to(`user:${order.user_id}`).emit('order:created', {
    order,
    message: `Your order #${order.orderNumber} has been created!`,
    timestamp: new Date(),
  });
});
```

### 3. Server Integration

**File:** `/services/orders/server.js`

**Changes:**
- Create HTTP server with `http.createServer(app)`
- Initialize Socket.io with `initializeSocket(server)`
- Attach Socket.io to existing HTTP server

```javascript
const http = require('http');
const { initializeSocket } = require('./config/socket');

const server = http.createServer(app);
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`WebSocket server ready on port ${PORT}`);
});
```

### 4. Controller Event Emission

**File:** `/services/orders/controllers/orderController.js`

**Event Emission Points:**

```javascript
// When order is created
exports.createOrder = async (req, res) => {
  const newOrder = await order.save();
  orderEvents.emit(ORDER_EVENTS.CREATED, newOrder);
  res.status(201).json(newOrder);
};

// When order status is updated
exports.updateOrderStatus = async (req, res) => {
  const oldStatus = oldOrder.status;
  const order = await Order.findByIdAndUpdate(...);

  orderEvents.emit(ORDER_EVENTS.STATUS_CHANGED, {
    order,
    oldStatus,
    newStatus: status,
  });

  if (status === 'cancelled') {
    orderEvents.emit(ORDER_EVENTS.CANCELLED, order);
  } else if (status === 'delivered') {
    orderEvents.emit(ORDER_EVENTS.COMPLETED, order);
  }
};
```

## Frontend Implementation

### 1. Cookie Utility

**File:** `/frontend/src/lib/cookies.ts`

```typescript
export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

export const getAccessToken = (): string | null => {
  return getCookie('accessToken');
};
```

**Purpose:** Extract access token from HTTP-only cookies for WebSocket authentication.

### 2. Custom WebSocket Hook

**File:** `/frontend/src/hooks/useOrderSocket.ts`

**Features:**
- Auto-connect/disconnect based on access token
- Event listeners with toast notifications
- Connection state management
- Auto-reconnection with exponential backoff

```typescript
export const useOrderSocket = (accessToken: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<OrderSocketEvent | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(ORDERS_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      toast.success('🔔 Real-time updates connected!');
    });

    socket.on('order:created', (data) => {
      setLastEvent(data);
      toast.success(`✅ ${data.message}`);
    });

    socket.on('order:status_changed', (data) => {
      setLastEvent(data);
      const emoji = getStatusEmoji(data.newStatus);
      toast.info(`${emoji} ${data.message}`);
    });

    return () => socket.disconnect();
  }, [accessToken]);

  return { isConnected, lastEvent, socket: socketRef.current };
};
```

### 3. Orders Page Integration

**File:** `/frontend/src/app/orders/page.tsx`

**Integration Steps:**

1. **Import hook and utilities:**
```typescript
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { getAccessToken } from '@/lib/cookies';
```

2. **Initialize WebSocket connection:**
```typescript
const [accessToken, setAccessToken] = useState<string | null>(null);
const { isConnected, lastEvent } = useOrderSocket(accessToken);

useEffect(() => {
  const token = getAccessToken();
  setAccessToken(token);
  fetchOrders();
}, []);
```

3. **Auto-refresh on events:**
```typescript
useEffect(() => {
  if (lastEvent) {
    fetchOrders(); // Refresh orders list
  }
}, [lastEvent]);
```

4. **Display connection status:**
```typescript
<div className="flex items-center space-x-2">
  {isConnected ? (
    <>
      <FiWifi className="h-5 w-5 text-green-600 animate-pulse" />
      <span className="text-sm text-green-600 font-medium">
        Live Updates Active
      </span>
    </>
  ) : (
    <>
      <FiWifiOff className="h-5 w-5 text-gray-400" />
      <span className="text-sm text-gray-500">Connecting...</span>
    </>
  )}
</div>
```

## WebSocket Events

### order:created
**Triggered:** When a new order is created
**Payload:**
```typescript
{
  order: Order,
  message: "Your order #ORD-12345 has been created!",
  timestamp: Date
}
```
**Notification:** ✅ Success toast with green background

### order:status_changed
**Triggered:** When order status changes (pending → processing → shipped → delivered)
**Payload:**
```typescript
{
  order: Order,
  oldStatus: string,
  newStatus: string,
  message: "Order #ORD-12345 status updated to processing",
  timestamp: Date
}
```
**Notification:** Info toast with status-specific emoji:
- ⏳ pending
- 📦 processing
- 🚚 shipped
- ✅ delivered
- ❌ cancelled

### order:updated
**Triggered:** When order details are modified
**Payload:**
```typescript
{
  order: Order,
  message: "Order #ORD-12345 has been updated",
  timestamp: Date
}
```

### order:cancelled
**Triggered:** When order is cancelled
**Payload:**
```typescript
{
  order: Order,
  message: "Order #ORD-12345 has been cancelled",
  timestamp: Date
}
```
**Notification:** ❌ Error toast with red background

### order:completed
**Triggered:** When order is delivered
**Payload:**
```typescript
{
  order: Order,
  message: "Order #ORD-12345 has been delivered!",
  timestamp: Date
}
```
**Notification:** 🎉 Success toast with celebration emoji

## Testing

### Manual Testing

1. **Open the application in browser**
   - Navigate to `/orders` page
   - Verify "Live Updates Active" indicator shows (green wifi icon)

2. **Test order creation:**
   - Add products to cart and checkout
   - Watch for toast notification: "Your order #XXX has been created!"
   - Verify orders list auto-refreshes

3. **Test status updates (requires admin access):**
   - Update order status via admin panel or API
   - Watch for status change notifications
   - Verify orders list shows updated status

### Automated Testing

**File:** `/services/orders/test-websocket.js`

**Usage:**
```bash
# First, log in to the application and copy your accessToken from cookies
ACCESS_TOKEN="your-access-token-here" node test-websocket.js
```

**What it does:**
1. Creates a test order
2. Updates status: pending → processing → shipped → delivered
3. Each step triggers WebSocket events
4. Frontend should display 4 toast notifications
5. Orders list should auto-refresh after each event

### Expected Output

**Backend Console:**
```
[Socket] Order created: 507f1f77bcf86cd799439011
[Socket] Order status changed: 507f1f77bcf86cd799439011 from pending to processing
[Socket] Order status changed: 507f1f77bcf86cd799439011 from processing to shipped
[Socket] Order status changed: 507f1f77bcf86cd799439011 from shipped to delivered
[Socket] Order completed: 507f1f77bcf86cd799439011
```

**Frontend (Toast Notifications):**
```
✅ Your order #ORD-12345 has been created!
📦 Order #ORD-12345 status updated to processing
🚚 Order #ORD-12345 status updated to shipped
✅ Order #ORD-12345 has been delivered!
```

## Security Considerations

### JWT Authentication
- All WebSocket connections require valid access token
- Token verified using same secret as REST API
- Invalid/expired tokens are rejected with error

### User Isolation
- Each user joins their own room: `user:${userId}`
- Events only sent to order owner
- Prevents users from seeing other users' order updates

### CORS Configuration
```javascript
cors: {
  origin: process.env.FRONTEND_URL || 'http://localhost:3006',
  methods: ['GET', 'POST'],
  credentials: true,
}
```

## Environment Variables

**Backend (.env.local):**
```env
FRONTEND_URL=http://localhost:3006
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-change-in-production-min-32-chars
ISSUER=http://localhost:3000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_ORDERS_SOCKET_URL=http://localhost:3004
```

## Dependencies

**Backend:**
```json
{
  "socket.io": "^4.8.1"
}
```

**Frontend:**
```json
{
  "socket.io-client": "^4.8.1",
  "react-toastify": "^10.0.6"
}
```

## Troubleshooting

### Connection Issues

**Problem:** WebSocket shows "Connecting..." but never connects

**Solutions:**
1. Verify orders service is running on port 3004
2. Check access token is valid (not expired)
3. Verify CORS configuration allows frontend origin
4. Check browser console for error messages

### No Toast Notifications

**Problem:** Connected but no notifications appear

**Solutions:**
1. Verify ToastContainer is added to app layout
2. Check browser console for event logs
3. Ensure order events are being emitted (check backend logs)
4. Verify user is logged in and token is valid

### Orders List Not Refreshing

**Problem:** Notifications appear but list doesn't update

**Solutions:**
1. Check `lastEvent` dependency in useEffect
2. Verify fetchOrders() is being called
3. Check API endpoint is returning updated data
4. Verify orders state is being updated correctly

### Authentication Errors

**Problem:** "Authentication error: Invalid token"

**Solutions:**
1. Log out and log back in to get fresh token
2. Verify ACCESS_TOKEN_SECRET matches across all services
3. Check token hasn't expired (default: 15 minutes)
4. Ensure cookie is being sent with Socket.io connection

## Performance Considerations

### Connection Management
- Socket automatically reconnects on disconnect
- Exponential backoff prevents server overload
- Max 5 reconnection attempts

### Event Throttling
- Events only sent to order owner (user-specific rooms)
- No broadcasting to all connected clients
- Minimal network overhead

### UI Optimization
- Orders list only refreshed when events occur
- No polling or continuous API calls
- Toast notifications auto-dismiss after 5 seconds

## Future Enhancements

1. **Admin Dashboard:** Real-time order monitoring for admins
2. **Typing Indicators:** Show when customer service is responding
3. **Order Chat:** Real-time messaging between customer and support
4. **Delivery Tracking:** Live GPS updates for delivery status
5. **Stock Alerts:** Notify users when out-of-stock items become available
6. **Price Drops:** Alert users about discounts on watched items

## References

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [React-Toastify Documentation](https://fkhadra.github.io/react-toastify/)
- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [JWT Authentication](https://jwt.io/)
