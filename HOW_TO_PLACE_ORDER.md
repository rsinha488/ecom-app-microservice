# How to Place an Order from the UI

This guide shows you step-by-step how to place an order through the user interface and see real-time WebSocket notifications.

---

## 📋 Prerequisites

1. ✅ All services running (auth, orders, frontend)
2. ✅ You are logged in to the application
3. ✅ Orders page shows "🟢 Live Updates Active"

---

## 🛒 Step-by-Step Guide

### Step 1: Browse Products

1. Open your browser to `http://localhost:3006`
2. Click **Products** in the navigation menu
3. You'll see a list of available products with:
   - Product image
   - Name and description
   - Price
   - Rating
   - **Add to Cart** button (shopping cart icon)

**Screenshot Location:**
```
┌────────────────────────────────────────────────────┐
│  Header: Home | Products | Cart | Orders          │
├────────────────────────────────────────────────────┤
│                   Products Page                     │
│                                                     │
│  [Product 1]    [Product 2]    [Product 3]        │
│   $29.99         $49.99         $19.99            │
│   🛒 Add to     🛒 Add to      🛒 Add to          │
│      Cart          Cart           Cart             │
└────────────────────────────────────────────────────┘
```

---

### Step 2: Add Products to Cart

1. **Find a product you like**
2. **Click the shopping cart icon button** (🛒) on the product card
3. You'll see a **toast notification**: "Product Name added to cart!"
4. Repeat for multiple products if you want

**What happens:**
- Product is added to your cart (stored in Redux state)
- Toast notification confirms the action
- Cart icon in header may show item count (if implemented)

---

### Step 3: View Your Cart

1. Click **Cart** in the navigation menu
2. You'll see your cart page with:
   - All items you added
   - Quantity controls (+ and - buttons)
   - Remove item button (trash icon)
   - **Order Summary** on the right:
     - Subtotal
     - Tax (10%)
     - Shipping ($10)
     - **Total Amount**

**Cart Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Shopping Cart                               Clear Cart      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Cart Items (Left Side):                Order Summary:       │
│  ┌──────────────────────────────┐       ┌────────────────┐  │
│  │ 📦 Product 1                 │       │ Subtotal: $XX  │  │
│  │    $29.99 × 2 = $59.98       │       │ Tax:      $XX  │  │
│  │    [-] 2 [+]  🗑️             │       │ Shipping: $10  │  │
│  └──────────────────────────────┘       │ ──────────────│  │
│                                          │ Total:    $XX  │  │
│  ┌──────────────────────────────┐       │                │  │
│  │ 📦 Product 2                 │       │ [Proceed to   │  │
│  │    $19.99 × 1 = $19.99       │       │  Checkout]    │  │
│  │    [-] 1 [+]  🗑️             │       └────────────────┘  │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

**Actions you can take:**
- **Increase quantity**: Click the `+` button
- **Decrease quantity**: Click the `-` button
- **Remove item**: Click the trash icon 🗑️
- **Clear entire cart**: Click "Clear Cart" button (top right)
- **Continue shopping**: Click "Continue Shopping" link
- **Proceed to checkout**: Click the big "Proceed to Checkout" button

---

### Step 4: Proceed to Checkout

1. Click the **"Proceed to Checkout"** button in the Order Summary
2. You'll be redirected to `/checkout` page

**Checkout Page has 3 sections:**

#### Section 1: Shipping Address 📍
Fill in all required fields:
- Street Address *
- City *
- State/Province *
- ZIP/Postal Code *
- Country *

**Example:**
```
Street Address: 123 Main Street
City: New York
State: NY
ZIP Code: 10001
Country: United States
```

#### Section 2: Payment Method 💳
Select your preferred payment method:
- ◉ Credit Card
- ○ Debit Card
- ○ PayPal
- ○ Cash on Delivery

**Note:** This is a demo - no actual payment will be processed

#### Section 3: Order Notes (Optional) 📝
Add any special instructions:
```
Example: "Please ring the doorbell twice"
```

#### Right Side: Order Summary
Shows your cart items, prices, and total (same as cart page)

---

### Step 5: Place Your Order

1. **Review all information** carefully
2. Click the **"Place Order"** button at the bottom
3. Button will show "Processing Order..." with a loading spinner

**What happens behind the scenes:**
1. Form validation (checks all required fields)
2. Sends POST request to `/api/orders`
3. Order is created in the database
4. **WebSocket event is emitted** (`order:created`)
5. Cart is cleared
6. Success toast appears

---

### Step 6: See Real-Time Notification! 🎉

**Immediately after order is placed:**

1. **Toast Notification Appears:**
   ```
   🎉 Order #ORD-20251119-XXXX placed successfully!
      Check your orders page for real-time updates.
   ```

2. **You'll be automatically redirected** to the Orders page (after 2 seconds)

3. **On Orders Page, you'll see:**
   - 🟢 "Live Updates Active" indicator
   - Your new order at the top of the list
   - Order details: Order number, status, total, date

---

### Step 7: Watch Real-Time Updates

Now your order is connected to WebSocket! Any status changes will show up instantly.

**To test real-time updates:**

#### Option A: Run the Test Script

```bash
# In terminal:
cd services/orders
ACCESS_TOKEN="get-from-browser-cookies" node test-websocket.js
```

**What you'll see in browser:**
- 📦 "Order #XXX status updated to processing"
- 🚚 "Order #XXX status updated to shipped"
- ✅ "Order #XXX has been delivered!"

Each notification appears as a toast, and the orders list **auto-refreshes**!

#### Option B: Manual Status Update (Requires Admin)

If you have admin access, you can update order status via API:

```bash
# Update order status
curl -X PATCH http://localhost:8080/api/v1/orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```

---

## 🎯 Complete Flow Diagram

```
1. Products Page
   │
   ├─> Click "Add to Cart" button
   │
2. Cart Page
   │
   ├─> Review items, adjust quantities
   │
   ├─> Click "Proceed to Checkout"
   │
3. Checkout Page
   │
   ├─> Fill in shipping address
   │
   ├─> Select payment method
   │
   ├─> (Optional) Add order notes
   │
   ├─> Click "Place Order"
   │
4. Order Processing
   │
   ├─> Order created in database
   │
   ├─> WebSocket event emitted: order:created
   │
   ├─> Cart cleared
   │
   ├─> Toast notification: "Order placed successfully!"
   │
5. Orders Page (Auto-redirect)
   │
   ├─> See new order in the list
   │
   ├─> 🟢 Live Updates Active
   │
   └─> Wait for status updates (real-time!)
```

---

## 💡 Tips

### Quick Add Multiple Items
1. Open Products page
2. Click "Add to Cart" on multiple products quickly
3. Each shows a toast notification
4. Go to Cart when done

### Adjust Quantities in Cart
- Use `+` and `-` buttons to change quantity
- Can't go below 1
- Can't exceed stock limit
- Price updates automatically

### Edit Before Checkout
- You can go back to cart from checkout (browser back button)
- Edit quantities or remove items
- Return to checkout when ready

### Order Confirmation
- After placing order, you'll get an order number like: `ORD-20251119-A7B2`
- Save this number for reference
- You can find it on the Orders page

---

## 🐛 Troubleshooting

### "Your cart is empty" on Checkout Page
**Solution:** Add items to cart first from Products page

### "Please log in to place an order"
**Solution:** You're not authenticated. Click login and sign in.

### "Please fill in all shipping address fields"
**Solution:** All fields with `*` are required. Fill them all in.

### Order placed but no notification
**Check:**
1. Is "Live Updates Active" showing on Orders page?
2. Check browser console for errors
3. Verify orders service is running: `lsof -ti:3004`
4. Log out and log back in to refresh token

### Can't see order in Orders page
**Solution:**
- Hard refresh the page (Ctrl+Shift+R)
- Check if you're logged in as the same user
- Check browser console for API errors

---

## 📸 Visual Guide

### Products Page
- Grid of product cards
- Each card has:
  - Product image
  - Name and description
  - Price
  - Rating stars
  - Shopping cart button

### Cart Page
- List of items on left
- Order summary on right
- Quantity controls for each item
- "Proceed to Checkout" button

### Checkout Page
- Form sections:
  - Shipping Address (required)
  - Payment Method (select one)
  - Order Notes (optional)
- Order summary on right (sticky)
- "Place Order" button

### Orders Page (After Placing Order)
- Header with "🟢 Live Updates Active"
- List of your orders
- Each order shows:
  - Order number
  - Status badge
  - Total amount
  - Order date
  - Items list

---

## 🎊 Success Checklist

After following these steps, you should have:

- [x] Added products to cart
- [x] Reviewed cart with correct quantities
- [x] Filled in checkout form
- [x] Selected payment method
- [x] Clicked "Place Order"
- [x] Saw success toast notification
- [x] Redirected to Orders page
- [x] Saw new order in the list
- [x] "Live Updates Active" showing
- [x] Ready to receive real-time status updates!

---

## 🚀 What's Next?

### Test Real-Time Updates
Run the test script to see real-time notifications:
```bash
cd services/orders
ACCESS_TOKEN="your-token" node test-websocket.js
```

### Place Multiple Orders
- Try placing multiple orders
- Watch them all appear in Orders page
- Each gets its own order number

### Check WebSocket Connection
- Browser console should show: "Socket connected"
- Orders page should show: "🟢 Live Updates Active"
- If not, check [TESTING_WEBSOCKET.md](TESTING_WEBSOCKET.md)

---

## 📚 Related Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick test guide
- [WEBSOCKET_IMPLEMENTATION.md](WEBSOCKET_IMPLEMENTATION.md) - Technical details
- [TESTING_WEBSOCKET.md](TESTING_WEBSOCKET.md) - Testing guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Complete overview

---

**Enjoy your real-time order tracking experience!** 🎉

Every order you place will be instantly visible with live status updates via WebSocket!
