# Payment Status Flow - E-commerce Implementation

## Overview

This document explains how payment status works in the LaunchpadMERN e-commerce platform, matching standard e-commerce practices.

## Payment Status Codes

```javascript
const PAYMENT_STATUS_CODE = {
  PENDING: 1,   // Awaiting payment
  PAID: 2,      // Payment confirmed
  FAILED: 3,    // Payment failed
  REFUNDED: 4   // Payment refunded
};
```

## Payment Methods

### Online Payments (Immediate Processing)
- **Credit Card** (1)
- **Debit Card** (2)
- **UPI** (3)
- **Net Banking** (4)
- **Digital Wallet** (5)
- **Stripe** (7) ← Currently enabled

### Offline Payments (Deferred Processing)
- **Cash on Delivery** (6) ← Currently enabled

---

## Payment Flow by Method

### 🟢 Stripe Payment Flow (Online)

#### Step 1: Order Creation
```
User clicks "Place Order" with Stripe selected
    ↓
Frontend creates order in database
    Status: PENDING
    Payment Status: PENDING
    ↓
Frontend calls /api/payment/create-checkout
    ↓
Payment Service creates Stripe session
    ↓
Payment SAGA initiated (payment.initiated event)
    ↓
User redirected to Stripe checkout
```

#### Step 2: Payment Processing
```
User enters card details on Stripe
    ↓
Stripe processes payment
    ↓
Stripe sends webhook to backend
    ↓
Payment Service handles webhook
    ↓
Payment SAGA completed
    ↓
Kafka event published: payment.completed
```

#### Step 3: Order Update (Kafka Consumer)
```
Orders Service consumes payment.completed event
    ↓
Order status updated:
    Status: PROCESSING
    Payment Status: PAID ✅
    ↓
order.confirmed event published
    ↓
Products Service deducts inventory
    ↓
User redirected to success page
```

#### Final State:
- **Order Status**: PROCESSING
- **Payment Status**: PAID ✅
- **Ready for**: Fulfillment/Shipping

---

### 🔵 Cash on Delivery Flow (Offline)

#### Step 1: Order Creation
```
User clicks "Place Order" with COD selected
    ↓
Frontend creates order in database
    Status: PENDING
    Payment Status: PENDING ✅
    ↓
Order created successfully
    ↓
No payment processing needed
    ↓
User redirected to orders page
```

#### Step 2: Order Fulfillment
```
Admin views pending orders
    ↓
Admin updates order status: SHIPPED
    Status: SHIPPED
    Payment Status: PENDING (still)
    ↓
Product delivered to customer
    ↓
Customer pays cash to delivery person
```

#### Step 3: Payment Confirmation (Admin Action)
```
Admin marks order as delivered
    Status: DELIVERED
    Payment Status: PAID ✅ (updated by admin)
    ↓
Order complete
```

#### Final State:
- **Order Status**: DELIVERED
- **Payment Status**: PAID ✅
- **Paid**: On delivery

---

## Status Transition Rules

### Payment Status Transitions

```
PENDING → PAID     ✅ Allowed (payment successful)
PENDING → FAILED   ✅ Allowed (payment failed)
PAID → REFUNDED    ✅ Allowed (refund processed)
FAILED → PENDING   ❌ Not allowed (create new order)
PAID → PENDING     ❌ Not allowed (can't unpay)
REFUNDED → *       ❌ Final state
```

### Order Status Transitions

```
PENDING → PROCESSING  ✅ Payment initiated
PENDING → CANCELLED   ✅ User/system cancels
PROCESSING → SHIPPED  ✅ Order dispatched
SHIPPED → DELIVERED   ✅ Customer receives
DELIVERED → *         ✅ Final state (can still refund payment)
* → CANCELLED         ✅ Can cancel before delivery
```

---

## Implementation Details

### Files Modified

1. **[`services/orders/constants/paymentMethod.js`](services/orders/constants/paymentMethod.js)**
   - Updated payment method codes to match frontend
   - COD = 6, Stripe = 7
   - Removed PayPal, added UPI, Net Banking

2. **[`services/orders/models/Order.js`](services/orders/models/Order.js:73-84)**
   - Updated enum values for payment methods
   - Now accepts codes 1-7 (Stripe included)

3. **[`services/orders/services/kafkaConsumer.js`](services/orders/services/kafkaConsumer.js:193)**
   - Handles `payment.completed` event
   - Updates `paymentStatus` to `PAID`

### Database Schema

```javascript
{
  _id: ObjectId,
  userId: String,
  orderNumber: String,
  status: Number,           // 1=PENDING, 2=PROCESSING, 3=SHIPPED, 4=DELIVERED, 5=CANCELLED
  paymentStatus: Number,    // 1=PENDING, 2=PAID, 3=FAILED, 4=REFUNDED
  paymentMethod: Number,    // 1-7 (see above)
  totalAmount: Number,
  items: [...],
  shippingAddress: {...},
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Behavior

### GET /api/orders (User's Orders)

Returns orders with current status:

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "...",
        "orderNumber": "ORD-123",
        "status": 2,              // PROCESSING
        "paymentStatus": 2,       // PAID ✅
        "paymentMethod": 7,       // Stripe
        "totalAmount": 99.99,
        "createdAt": "2025-11-26T..."
      },
      {
        "_id": "...",
        "orderNumber": "ORD-124",
        "status": 1,              // PENDING
        "paymentStatus": 1,       // PENDING ✅
        "paymentMethod": 6,       // COD
        "totalAmount": 49.99,
        "createdAt": "2025-11-26T..."
      }
    ]
  }
}
```

### POST /api/orders (Create Order)

**Request**:
```json
{
  "items": [...],
  "totalAmount": 99.99,
  "shippingAddress": {...},
  "paymentMethod": 7,        // Stripe
  "paymentStatus": 1         // Always PENDING initially
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "ORD-125",
      "status": 1,             // PENDING
      "paymentStatus": 1,      // PENDING (will be updated by Kafka)
      "paymentMethod": 7
    }
  }
}
```

---

## Frontend Display Logic

### Orders List Page

```typescript
// Display payment status badge
function getPaymentStatusBadge(paymentStatus: number) {
  switch (paymentStatus) {
    case 1: // PENDING
      return <Badge color="yellow">Pending Payment</Badge>;
    case 2: // PAID
      return <Badge color="green">Paid</Badge>;
    case 3: // FAILED
      return <Badge color="red">Payment Failed</Badge>;
    case 4: // REFUNDED
      return <Badge color="gray">Refunded</Badge>;
  }
}

// Display payment method
function getPaymentMethodDisplay(paymentMethod: number) {
  const methods = {
    1: 'Credit Card',
    2: 'Debit Card',
    3: 'UPI',
    4: 'Net Banking',
    5: 'Digital Wallet',
    6: 'Cash on Delivery',
    7: 'Stripe'
  };
  return methods[paymentMethod] || 'Unknown';
}
```

### Order Details

Show different actions based on payment status:

```typescript
if (order.paymentStatus === 1 && order.paymentMethod === 7) {
  // Stripe payment pending - show "Retry Payment" button
  <Button onClick={retryPayment}>Retry Payment</Button>
}

if (order.paymentStatus === 1 && order.paymentMethod === 6) {
  // COD pending - show "Pay on Delivery" message
  <Alert>Payment will be collected on delivery</Alert>
}

if (order.paymentStatus === 2) {
  // Payment completed - show confirmation
  <Alert color="green">Payment Confirmed</Alert>
}
```

---

## Admin Panel Behavior

### Pending Orders View

Admin sees:
```
Order #ORD-123
Status: PENDING
Payment: PAID (Stripe) ✅
Action: Ready to Ship

Order #ORD-124
Status: PENDING
Payment: PENDING (COD) ⏳
Action: Ship (Payment on delivery)
```

### Update Order Status

When admin marks COD order as DELIVERED:
```javascript
// Admin action
PATCH /api/orders/:id
{
  status: 4,          // DELIVERED
  paymentStatus: 2    // PAID (admin confirms cash received)
}
```

---

## Testing Scenarios

### Scenario 1: Stripe Payment Success

1. ✅ Create order with Stripe
2. ✅ Order status: PENDING, Payment: PENDING
3. ✅ Complete Stripe payment
4. ✅ Webhook triggers Kafka event
5. ✅ Order status: PROCESSING, Payment: PAID ✅
6. ✅ User sees "Order Confirmed" with "Paid" badge

### Scenario 2: Stripe Payment Failure

1. ✅ Create order with Stripe
2. ✅ Order status: PENDING, Payment: PENDING
3. ❌ Stripe payment fails
4. ✅ Webhook triggers payment.failed event
5. ✅ Order status: CANCELLED, Payment: FAILED
6. ✅ Inventory released
7. ✅ User redirected to cancel page

### Scenario 3: Cash on Delivery

1. ✅ Create order with COD
2. ✅ Order status: PENDING, Payment: PENDING ✅
3. ✅ No payment processing
4. ✅ Admin ships order
5. ✅ Order status: SHIPPED, Payment: PENDING (still)
6. ✅ Customer pays on delivery
7. ✅ Admin marks as DELIVERED
8. ✅ Admin updates Payment: PAID ✅

---

## Troubleshooting

### Issue: Stripe order stays PENDING after payment

**Cause**: Kafka consumer not processing `payment.completed` event

**Check**:
```bash
# 1. Check payment service logs
cd services/payment
npm run dev | grep "payment.completed"

# 2. Check orders service Kafka consumer
cd services/orders
npm run dev | grep "Kafka Consumer"

# 3. Verify Kafka topics
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Issue: COD order shows as unpaid after delivery

**Cause**: Admin not updating payment status

**Solution**: Admin must manually update payment status when marking as delivered

### Issue: Payment status not syncing

**Cause**: Payment method codes mismatch

**Fix**: Ensure all services use same codes:
- Frontend: [constants/paymentMethod.ts](frontend/src/constants/paymentMethod.ts)
- Payment Service: [constants/paymentMethod.js](services/payment/constants/paymentMethod.js)
- Orders Service: [constants/paymentMethod.js](services/orders/constants/paymentMethod.js) ✅ Fixed

---

## Key Takeaways

### ✅ Correct Behavior

1. **Stripe Payment**: `paymentStatus` becomes `PAID` immediately after successful payment via Kafka events
2. **COD Payment**: `paymentStatus` stays `PENDING` until admin confirms delivery and payment
3. **Order Status**: Independent of payment status (can ship COD orders with pending payment)
4. **Payment Methods**: All services now use synchronized codes (1-7)

### ❌ Incorrect Behavior (Fixed)

1. ~~Stripe orders staying PENDING after payment~~ → Fixed via Kafka
2. ~~Payment method code mismatches~~ → Fixed via synchronization
3. ~~Missing Stripe in Order model enum~~ → Fixed

---

**Last Updated**: 2025-11-26
**Version**: 1.0
**Status**: ✅ Implemented and Working
