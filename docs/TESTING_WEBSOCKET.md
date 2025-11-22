# Testing Real-Time Order Updates

This guide shows you how to test the WebSocket real-time notifications feature.

## Quick Test (Manual)

### Step 1: Start All Services

Make sure these are running:
- Auth service (port 3000)
- Orders service (port 3004) - **with WebSocket support**
- Frontend (port 3006)
- Nginx gateway (port 8080)

### Step 2: Open Frontend

1. Open browser to `http://localhost:3006`
2. Log in with your account
3. Navigate to **Orders** page (`/orders`)

### Step 3: Verify WebSocket Connection

Look for the connection indicator in the top-right corner:
- ✅ **Green wifi icon + "Live Updates Active"** = Connected
- ⚠️ **Gray wifi icon + "Connecting..."** = Not connected

If not connected, check:
- Browser console for errors
- Orders service is running
- You are logged in (access token in cookies)

### Step 4: Create Test Order

**Option A: Via UI**
1. Go to Products page
2. Add items to cart
3. Proceed to checkout
4. Complete the order

**Option B: Via Test Script**
```bash
# Get your access token from browser cookies first
# In browser DevTools: document.cookie

cd /home/ruchisinha/Desktop/LaunchpadMERN/services/orders
ACCESS_TOKEN="your-token-here" node test-websocket.js
```

### Step 5: Watch for Notifications

You should see toast notifications appear:

1. **Order Created:**
   ```
   ✅ Your order #ORD-12345 has been created!
   ```

2. **Status Updates (if you run the test script):**
   ```
   📦 Order #ORD-12345 status updated to processing
   🚚 Order #ORD-12345 status updated to shipped
   ✅ Order #ORD-12345 has been delivered!
   ```

3. **Orders List:** Should auto-refresh after each notification

## Automated Test

### 1. Get Access Token

**Browser Method:**
1. Open DevTools (F12)
2. Go to Console
3. Run: `document.cookie`
4. Copy the value after `accessToken=`

**Alternative:**
1. Open DevTools → Application → Cookies
2. Find `accessToken` cookie
3. Copy its value

### 2. Run Test Script

```bash
cd services/orders
ACCESS_TOKEN="paste-your-token-here" node test-websocket.js
```

### 3. Expected Output

**Terminal Output:**
```
🧪 Starting WebSocket Real-Time Notifications Test

📋 Step 1: Getting user information...
✅ User ID: 691d6d01da39b318e42f4c21

📦 Step 2: Creating a test order...
✅ Order created: #ORD-20251119-A7B2 (ID: 674c8e1a2f3b4c5d6e7f8g9h)
   🔔 WebSocket event "order:created" should be emitted!

🔄 Step 3: Updating order status to "processing"...
✅ Status updated to "processing"
   🔔 WebSocket event "order:status_changed" should be emitted!

🚚 Step 4: Updating order status to "shipped"...
✅ Status updated to "shipped"
   🔔 WebSocket event "order:status_changed" should be emitted!

📍 Step 5: Updating order status to "delivered"...
✅ Status updated to "delivered"
   🔔 WebSocket events "order:status_changed" AND "order:completed" should be emitted!

✨ Test completed successfully!

📱 Check your frontend Orders page - you should have seen:
   1. Toast notification: "Your order #ORD-20251119-A7B2 has been created!"
   2. Toast notification: "Order #ORD-20251119-A7B2 status updated to processing"
   3. Toast notification: "Order #ORD-20251119-A7B2 status updated to shipped"
   4. Toast notification: "Order #ORD-20251119-A7B2 has been delivered!"
   5. Orders list should auto-refresh after each event
```

**Frontend (Browser):**
- 4 toast notifications should appear (one every 2 seconds)
- Orders list should refresh after each notification
- Order status should update in real-time

**Backend Logs:**
```
[Socket] Order created: 674c8e1a2f3b4c5d6e7f8g9h
[Socket] Order status changed: 674c8e1a2f3b4c5d6e7f8g9h from pending to processing
[Socket] Order status changed: 674c8e1a2f3b4c5d6e7f8g9h from processing to shipped
[Socket] Order status changed: 674c8e1a2f3b4c5d6e7f8g9h from shipped to delivered
[Socket] Order completed: 674c8e1a2f3b4c5d6e7f8g9h
```

## Testing Multiple Users

### Test 1: User Isolation

1. **User A:** Log in and open `/orders` page
2. **User B:** Log in (different user) and open `/orders` page
3. **User A:** Create an order
4. **Expected:**
   - User A sees notification ✅
   - User B does NOT see notification ✅
   - Only order owner receives updates

### Test 2: Multiple Tabs (Same User)

1. Open two browser tabs
2. Log in as same user in both
3. Navigate both to `/orders` page
4. Create order in one tab
5. **Expected:**
   - Both tabs show "Live Updates Active"
   - Both tabs receive notifications
   - Both tabs auto-refresh

## Troubleshooting Test Failures

### ❌ Connection Shows "Connecting..."

**Check:**
```bash
# Is orders service running?
lsof -ti:3004
# Should show a process ID

# Check service logs
cd services/orders
node server.js
# Should see: "Socket.io initialized successfully"
```

**Fix:**
```bash
# Restart orders service
lsof -ti:3004 | xargs kill -9
cd services/orders
node server.js
```

### ❌ Test Script: "Authentication error"

**Error Message:**
```
❌ Test failed: Request failed with status code 401
```

**Cause:** Token expired or invalid

**Fix:**
1. Log out from application
2. Log in again
3. Get fresh token from cookies
4. Run test script with new token

### ❌ No Toast Notifications

**Check Browser Console:**
```javascript
// Should see Socket.io connection logs
Socket connected
Subscribed to order updates
```

**If you see:**
```javascript
Socket connection error: Authentication error: Invalid token
```

**Fix:**
1. Clear browser cookies
2. Log in again
3. Refresh `/orders` page

### ❌ Orders List Not Refreshing

**Check:**
1. Browser console for errors
2. Network tab - verify API calls
3. React DevTools - check `lastEvent` state

**Common Causes:**
- API endpoint returning error
- Orders state not updating
- useEffect dependencies incorrect

## Verifying WebSocket Events

### Browser DevTools

1. Open DevTools → Console
2. You should see:
   ```javascript
   Socket connected
   Received event: order:created
   Received event: order:status_changed
   ```

### Backend Logs

Check terminal running orders service:
```bash
User connected: 691d6d01da39b318e42f4c21 (Socket ID: abc123)
[Socket] Order created: 674c8e1a2f3b4c5d6e7f8g9h
[Socket] Order status changed: 674c8e1a2f3b4c5d6e7f8g9h from pending to processing
```

### Network Tab

1. Open DevTools → Network
2. Filter: WS (WebSocket)
3. Should see: `socket.io/?EIO=4&transport=websocket`
4. Click on it → Messages tab
5. See real-time messages flowing

## Performance Testing

### Load Test: Multiple Connections

```bash
# Install artillery (if not already)
npm install -g artillery

# Create test config
cat > websocket-load-test.yml <<EOF
config:
  target: "http://localhost:3004"
  phases:
    - duration: 60
      arrivalRate: 10
  socketio:
    transports: ["websocket"]

scenarios:
  - name: "Connect and listen"
    engine: socketio
    flow:
      - emit:
          channel: "subscribe:orders"
          data: {}
      - think: 60
EOF

# Run load test
artillery run websocket-load-test.yml
```

**Expected:**
- 600 concurrent connections (10/sec × 60 sec)
- Orders service should handle without crashes
- Memory usage should remain stable

## Integration Test Checklist

- [ ] WebSocket server starts successfully
- [ ] Frontend connects with valid token
- [ ] Connection indicator shows "Live Updates Active"
- [ ] Order creation triggers `order:created` event
- [ ] Toast notification appears for order creation
- [ ] Orders list auto-refreshes after creation
- [ ] Status update triggers `order:status_changed` event
- [ ] Status-specific emoji shows in notification
- [ ] Order delivered triggers both `status_changed` AND `order:completed`
- [ ] Order cancelled triggers `order:cancelled` event
- [ ] Multiple tabs receive same events
- [ ] Different users receive only their own events
- [ ] Invalid token is rejected
- [ ] Disconnected socket auto-reconnects
- [ ] Backend logs show all events emitted
- [ ] No memory leaks after extended testing

## Next Steps After Testing

If all tests pass:
1. ✅ WebSocket implementation is complete
2. ✅ Real-time notifications working end-to-end
3. ✅ Event-driven architecture functioning

Consider adding:
- Admin dashboard for real-time order monitoring
- Order chat/messaging feature
- Live delivery tracking
- Stock alert notifications
- Push notifications for mobile
