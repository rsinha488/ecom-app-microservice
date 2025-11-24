# WebSocket Persistence Fix

## Problem
The WebSocket connection was being disconnected every time users navigated away from the orders page, resulting in no real-time updates when switching between pages.

## Root Cause
The `useOrderSocket` hook was initialized at the **page component level** (in `orders/page.tsx`). This meant:
1. When navigating away → useEffect cleanup runs → socket disconnects
2. When returning to the page → new socket connection created
3. During navigation, no socket connection exists → no real-time updates

## Solution
Moved the WebSocket connection to a **global provider level** using React Context, ensuring the socket persists across all page navigations.

### Changes Made

#### 1. Created `OrderSocketProvider` (Provider Component)
- **File**: `frontend/src/providers/OrderSocketProvider.tsx`
- Manages a global WebSocket connection that persists across page navigation
- Uses React Context to share socket state with all components
- Only disconnects/reconnects when the access token changes (login/logout)

#### 2. Updated `useOrderSocket` Hook
- **File**: `frontend/src/hooks/useOrderSocket.ts`
- Simplified to re-export `useOrderSocketContext` from the provider
- Maintains backward compatibility with existing code

#### 3. Integrated into App Providers
- **File**: `frontend/src/app/providers.tsx`
- Added `OrderSocketProvider` wrapper at the root level
- Listens for `wsTokenChanged` events to update socket connection
- Reads `wsToken` cookie and passes it to the provider

#### 4. Updated Orders Page
- **File**: `frontend/src/app/orders/page.tsx`
- Removed local socket initialization logic
- Now uses the global socket context via `useOrderSocket()` hook
- Removed unused `accessToken` state and `getCookie` import

#### 5. Added Token Change Events
- **File**: `frontend/src/store/slices/authSlice.ts`
- Dispatches `wsTokenChanged` custom window event on login/logout
- Ensures socket reconnects automatically when authentication state changes

## How It Works

```
App Initialization
     ↓
Providers Component (loads wsToken from cookie)
     ↓
OrderSocketProvider (creates socket with token)
     ↓
Socket connection persists across all pages
     ↓
Components use useOrderSocket() hook to access socket
     ↓
On login/logout → wsTokenChanged event → socket reconnects
```

## Benefits

1. **Persistent Connection**: Socket stays connected even when navigating away from orders page
2. **Real-time Updates Everywhere**: Can receive order notifications on any page
3. **Automatic Reconnection**: Socket automatically reconnects on login/logout
4. **Better Performance**: No repeated connect/disconnect cycles
5. **Cleaner Code**: Centralized socket management instead of page-level logic

## Testing

To verify the fix works:

1. Login to the application
2. Navigate to the orders page (socket connects)
3. Navigate to another page (e.g., products, home)
4. Check browser console - socket should remain connected
5. Place an order or trigger an order event
6. Check that you receive toast notifications regardless of which page you're on
7. Navigate back to orders page - should see updated data without reconnection

## Notes

- The socket connection requires a valid `wsToken` cookie (set during login)
- Socket automatically disconnects on logout
- Connection status is available via `isConnected` from the hook
- All order events trigger toast notifications globally
