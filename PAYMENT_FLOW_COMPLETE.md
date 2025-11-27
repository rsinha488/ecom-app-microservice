# Payment Integration - Complete Implementation Guide

## Overview

Your e-commerce platform now has a fully integrated payment system with **Cash on Delivery (COD)** and **Stripe** payment methods. PayPal has been removed as requested.

---

## Payment Methods Available

| Code | Method | Type | Status |
|------|--------|------|--------|
| 6 | Cash on Delivery | Offline | ✅ Enabled |
| 7 | Stripe | Online | ✅ Enabled |

**Removed**: PayPal (code 8) has been completely removed from all services.

---

## Payment Flow Architecture

### 1. Cash on Delivery (COD) Flow

```
User selects COD → Create order immediately → Payment status: PENDING
                                                     ↓
                                            Order is delivered
                                                     ↓
                                    Admin confirms payment received
                                                     ↓
                                            Payment status: PAID
```

**Technical Details**:
- Order is created via `/api/orders` endpoint
- Initial payment status: `PENDING (code 1)`
- Order status: `PENDING (code 1)`
- Payment is collected on delivery
- Admin manually updates payment status to `PAID (code 2)` after receiving cash

**Frontend Code** ([checkout/page.tsx:143-156](frontend/src/app/checkout/page.tsx#L143-L156)):
```typescript
// COD PAYMENT: Create order immediately
const response = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify(orderData),
});

const data = await response.json();
dispatch(clearCart());
toast.success(`Order #${orderNumber} placed successfully!`);
router.push(`/orders/${orderId}`);
```

---

### 2. Stripe Payment Flow

```
User selects Stripe → Create order (status: PENDING) → Create Stripe session
                                                              ↓
                                                   Redirect to Stripe Checkout
                                                              ↓
                                                User completes payment
                                                              ↓
                                                   Stripe webhook fires
                                                              ↓
                                             Kafka publishes payment.completed
                                                              ↓
                                           Orders service consumes event
                                                              ↓
                                    Updates: Payment status → PAID (code 2)
                                            Order status → PROCESSING (code 2)
```

**Technical Details**:
1. Order is created first with payment status `PENDING`
2. Stripe checkout session is created with order details
3. User is redirected to Stripe's hosted checkout page
4. After successful payment:
   - Stripe webhook notifies payment service
   - Payment service publishes `payment.completed` to Kafka
   - Orders service consumes event and updates order
5. If payment fails:
   - Payment service publishes `payment.failed` to Kafka
   - Orders service marks order as `CANCELLED`

**Frontend Code** ([checkout/page.tsx:90-142](frontend/src/app/checkout/page.tsx#L90-L142)):
```typescript
// STRIPE PAYMENT: Create order, then process payment
if (formData.paymentMethod === PaymentMethodCode.STRIPE) {
  // Step 1: Create order
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  const orderId = data.data.order._id;
  const orderNumber = data.data.order.orderNumber;

  // Step 2: Create Stripe checkout session
  const checkoutResponse = await fetch('/api/payment/create-checkout', {
    method: 'POST',
    body: JSON.stringify({
      orderId, orderNumber, amount: total,
      currency: 'usd', paymentMethod: formData.paymentMethod,
      items: items.map(item => ({ ... }))
    }),
  });

  const checkoutData = await checkoutResponse.json();

  // Step 3: Clear cart and redirect to Stripe
  dispatch(clearCart());
  window.location.href = checkoutData.data.checkoutUrl;
  return;
}
```

---

## Payment Status Lifecycle

### Status Codes

```javascript
PAYMENT_STATUS_CODE = {
  PENDING: 1,   // Payment not yet received
  PAID: 2,      // Payment successfully received
  FAILED: 3,    // Payment transaction failed
  REFUNDED: 4   // Payment has been refunded
}
```

### Status Transitions

#### COD Orders:
```
PENDING (1) ─────────────────────────────────────────────> PAID (2)
                    (Admin confirms cash received)
```

#### Stripe Orders:
```
PENDING (1) ──────────────────────────> PAID (2)
              (Kafka: payment.completed)
                         │
                         └──> FAILED (3)
                              (Kafka: payment.failed)
                              (Order marked CANCELLED)
```

---

## Kafka Event Flow

### Events Published by Payment Service

1. **payment.initiated**
   ```json
   {
     "orderId": "123",
     "userId": "456",
     "amount": 99.99,
     "paymentMethod": 7,
     "timestamp": "2025-11-26T12:00:00Z"
   }
   ```

2. **payment.completed**
   ```json
   {
     "orderId": "123",
     "paymentId": "pay_789",
     "transactionId": "txn_abc",
     "amount": 99.99,
     "paymentMethod": 7,
     "timestamp": "2025-11-26T12:01:00Z"
   }
   ```

3. **payment.failed**
   ```json
   {
     "orderId": "123",
     "reason": "insufficient_funds",
     "paymentMethod": 7,
     "timestamp": "2025-11-26T12:01:00Z"
   }
   ```

### Events Consumed by Orders Service

**File**: [services/orders/services/kafkaConsumer.js](services/orders/services/kafkaConsumer.js)

- **payment.completed** (Lines 172-230): Updates order payment status to `PAID` and order status to `PROCESSING`
- **payment.failed** (Lines 232-280): Marks order as `CANCELLED` and restores product inventory

---

## Service Configuration

### Frontend Configuration

**File**: [frontend/.env.local](frontend/.env.local)
```bash
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_PAYMENT_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3006
```

### Payment Service Configuration

**File**: [services/payment/.env.local](services/payment/.env.local)
```bash
PORT=5005
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
KAFKA_BROKER=localhost:9092
```

### Orders Service Configuration

**File**: [services/orders/.env.local](services/orders/.env.local)
```bash
PORT=3004
KAFKA_BROKER=localhost:9092
```

### API Gateway (Nginx)

**File**: [api-gateway/nginx/nginx.conf:54](api-gateway/nginx/nginx.conf#L54)
```nginx
upstream payments_service {
    server host.docker.internal:5005;  # ✅ Correct port
    keepalive 32;
}
```

---

## API Endpoints

### Frontend API Routes (Next.js)

1. **POST /api/payment/create-checkout**
   - **File**: [frontend/src/app/api/payment/create-checkout/route.ts](frontend/src/app/api/payment/create-checkout/route.ts)
   - **Purpose**: Create Stripe checkout session
   - **Auth**: Requires `accessToken` cookie
   - **Request Body**:
     ```json
     {
       "orderId": "string",
       "orderNumber": "string",
       "amount": 99.99,
       "currency": "usd",
       "paymentMethod": 7,
       "items": [...]
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "data": {
         "checkoutUrl": "https://checkout.stripe.com/...",
         "sessionId": "cs_test_..."
       }
     }
     ```

### Backend API Routes (via API Gateway)

1. **GET /v1/payment/methods**
   - **Purpose**: Get available payment methods
   - **Response**: Returns COD and Stripe methods

2. **POST /v1/payment/checkout-session**
   - **Purpose**: Create Stripe checkout session
   - **Auth**: Requires Bearer token

3. **POST /v1/payment/webhook**
   - **Purpose**: Stripe webhook handler
   - **Auth**: Validates Stripe signature

---

## Payment Method Constants Synchronization

All three layers now use **identical payment method codes**:

### Frontend
**File**: [frontend/src/constants/paymentMethod.ts](frontend/src/constants/paymentMethod.ts)

### Orders Service
**File**: [services/orders/constants/paymentMethod.js](services/orders/constants/paymentMethod.js)

### Payment Service
**File**: [services/payment/constants/paymentMethod.js](services/payment/constants/paymentMethod.js)

**Synchronized Codes**:
```javascript
{
  CREDIT_CARD: 1,
  DEBIT_CARD: 2,
  UPI: 3,
  NET_BANKING: 4,
  WALLET: 5,
  CASH_ON_DELIVERY: 6,  // ✅ Enabled
  STRIPE: 7,             // ✅ Enabled
  // PAYPAL: 8           // ❌ Removed
}
```

---

## Testing the Payment Flow

### Test COD Payment

1. Add products to cart
2. Go to checkout: `http://localhost:3006/checkout`
3. Select **Cash on Delivery** (default)
4. Fill shipping details
5. Click "Place Order"
6. Verify:
   - Order appears in orders list with payment status **PENDING**
   - Order status is **PENDING**

### Test Stripe Payment

1. Add products to cart
2. Go to checkout: `http://localhost:3006/checkout`
3. Select **Stripe** payment method
4. Fill shipping details
5. Click "Place Order"
6. You'll be redirected to Stripe Checkout
7. Use test card: `4242 4242 4242 4242`, any future date, any CVC
8. Complete payment
9. You'll be redirected back to: `http://localhost:3006/payment/success`
10. Verify:
    - Order appears in orders list with payment status **PAID**
    - Order status is **PROCESSING**

**Success Page**: [frontend/src/app/payment/success/page.tsx](frontend/src/app/payment/success/page.tsx)

---

## Troubleshooting

### Issue: Payment status not updating to PAID

**Symptoms**: Stripe payment succeeds but order still shows PENDING

**Solution**:
1. Check orders service is running: `curl http://localhost:3004/health`
2. Check Kafka consumer is subscribed:
   ```bash
   docker exec -it kafka kafka-consumer-groups.sh \
     --bootstrap-server localhost:9092 \
     --describe --group orders-service
   ```
3. Check payment service logs for webhook events
4. Restart services if needed:
   ```bash
   # Restart orders service
   cd services/orders && npm run dev

   # Restart payment service
   cd services/payment && npm run dev
   ```

### Issue: 404 on payment routes

**Symptoms**: Frontend gets 404 when calling `/api/payment/create-checkout`

**Solution**: Verify nginx configuration has correct port (5005) for payment service
- **File**: [api-gateway/nginx/nginx.conf:54](api-gateway/nginx/nginx.conf#L54)
- **Fix**: [NGINX_PAYMENT_FIX.md](NGINX_PAYMENT_FIX.md)

### Issue: Payment method validation error

**Symptoms**: "Invalid payment method" error

**Solution**: Verify payment method codes match across all services:
- Frontend: `PaymentMethodCode.STRIPE = 7`
- Orders: `PAYMENT_METHOD_CODE.STRIPE = 7`
- Payment: `PAYMENT_METHOD.STRIPE = 7`

---

## Service Health Checks

```bash
# Auth Service (port 3000)
curl http://localhost:3000/health

# Products Service (port 3001)
curl http://localhost:3001/health

# Orders Service (port 3004)
curl http://localhost:3004/health

# Payment Service (port 5005)
curl http://localhost:5005/health

# API Gateway (port 8080)
curl http://localhost:8080/v1/payment/methods
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (3006)                         │
│                                                                 │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Checkout  │───>│ Order API    │───>│ Payment API      │  │
│  │  Page      │    │ /api/orders  │    │ /create-checkout │  │
│  └────────────┘    └──────────────┘    └──────────────────┘  │
│                            │                      │             │
└────────────────────────────┼──────────────────────┼─────────────┘
                             │                      │
                             ▼                      ▼
                    ┌─────────────────────────────────────┐
                    │   API GATEWAY (nginx:8080)          │
                    │   - Routes to microservices         │
                    │   - CORS handling                   │
                    └─────────────────────────────────────┘
                             │                      │
              ┌──────────────┴──────────┐          │
              ▼                         ▼          ▼
     ┌─────────────────┐      ┌──────────────────────┐
     │ ORDERS SERVICE  │      │  PAYMENT SERVICE     │
     │   (port 3004)   │      │    (port 5005)       │
     │                 │      │                      │
     │ - Create order  │      │ - Stripe checkout    │
     │ - Update status │      │ - Webhook handler    │
     │ - Kafka consume │      │ - Kafka publish      │
     └─────────────────┘      └──────────────────────┘
              │                         │
              └──────────┬──────────────┘
                         ▼
                 ┌───────────────┐
                 │  KAFKA (9092) │
                 │               │
                 │ Topics:       │
                 │ - payment.*   │
                 │ - order.*     │
                 └───────────────┘
```

---

## What Changed

### ✅ Completed
1. Removed PayPal from all services
2. Synchronized payment method codes (COD=6, STRIPE=7)
3. Fixed nginx routing (port 3001 → 5005)
4. Created Stripe checkout integration
5. Implemented Kafka event-driven payment status updates
6. Updated Order model to include STRIPE in enum
7. Created payment success/cancel pages
8. Added proper error handling and validation

### 📝 Current Implementation
- **Stripe**: Order created first → Payment processed → Kafka updates status
- **COD**: Order created immediately with PENDING status
- **Failed Stripe payments**: Order marked as CANCELLED via Kafka

---

## Next Steps

The payment integration is now complete and ready for testing. To verify:

1. **Start all services**:
   ```bash
   # Terminal 1: Start Kafka, MongoDB, Redis
   docker-compose up -d

   # Terminal 2: Start Auth service
   cd services/auth && npm run dev

   # Terminal 3: Start Products service
   cd services/products && npm run dev

   # Terminal 4: Start Orders service
   cd services/orders && npm run dev

   # Terminal 5: Start Payment service
   cd services/payment && npm run dev

   # Terminal 6: Start API Gateway
   cd api-gateway && docker-compose up

   # Terminal 7: Start Frontend
   cd frontend && npm run dev
   ```

2. **Test the payment flows** as described in the Testing section above

3. **Monitor logs** for any errors during checkout and payment

---

**Status**: ✅ Payment integration complete and ready for use

**Payment Methods**: COD (code 6) and Stripe (code 7)

**Architecture**: Event-driven with Kafka for payment status synchronization

---

# APPENDIX: Enhanced Logging & Troubleshooting Guide

## Current Status: Enhanced Logging Added (2025-11-27)

All services have been updated with comprehensive logging to trace the complete `payment.completed` event flow and diagnose webhook issues.

---

## Stripe Webhook Testing Setup

### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases/latest
```

### 2. Authenticate Stripe CLI
```bash
stripe login
```
This opens a browser to authorize the CLI with your Stripe account.

### 3. Forward Webhooks to Local Payment Service
```bash
stripe listen --forward-to localhost:5005/v1/payment/webhook
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
> Waiting for events...
```

### 4. Copy Webhook Secret to Environment
Copy the `whsec_...` secret and add it to `/services/payment/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 5. Restart Payment Service
```bash
cd services/payment
npm run dev
```

---

## Complete Event Flow with Expected Logs

### Step 1: User Initiates Checkout (Frontend)

**User Action:** User fills checkout form and clicks "Pay with Stripe"

**Expected Frontend Console Logs:**
```javascript
Initiating Stripe payment SAGA...
Creating Stripe checkout session...
```

---

### Step 2: Payment SAGA Initiation (Payment Service)

**Expected Payment Service Logs:**
```
[SAGA] Starting payment SAGA execution { correlationId: 'saga-...', paymentMethod: 2 }
[SAGA] Step 1: Creating payment record
[SAGA] ✓ Payment created: {
  paymentId: ObjectId('...'),
  orderId: ObjectId('...'),
  amount: 70.49,
  status: 'PENDING'
}
[SAGA] Step 2: Publishing payment.initiated event
[SAGA] ✓ payment.initiated event published
[SAGA] → Order Service will now create order
[SAGA] → Awaiting Stripe webhook for payment completion
```

**Kafka Producer Logs:**
```
[Kafka] Published event to payment.initiated: {
  eventType: 'payment.initiated',
  eventId: 'payment.initiated-...',
  partition: 0,
  offset: 123
}
```

---

### Step 3: Order Creation (Order Service)

**Expected Order Service Logs:**
```
[Kafka Consumer] payment.initiated event received
[Kafka Consumer] Creating order from payment.initiated event
[Kafka Consumer] Order ID from event: ObjectId('...')
[Kafka Consumer] ✓ Order created with PENDING status
[Kafka Consumer] Publishing order.created event
```

---

### Step 4: User Completes Payment on Stripe

**User Action:** User enters card details and clicks Pay on Stripe Checkout

**Stripe CLI Logs:**
```
2025-11-27 10:30:45  --> checkout.session.completed [evt_1ABC123...]
2025-11-27 10:30:46  --> payment_intent.succeeded [evt_1XYZ789...]
```

---

### Step 5: Stripe Webhooks Received (Payment Service)

#### Webhook Event 1: checkout.session.completed

**Expected Payment Service Logs:**
```
[Webhook] ========== STRIPE WEBHOOK RECEIVED ==========
[Webhook] Signature present: true
[Webhook] Webhook secret configured: true
[Webhook] ✅ Signature verified successfully
[Webhook] 📨 Processing event type: checkout.session.completed
[Webhook] Event ID: evt_1ABC123...
[Webhook] 🛒 Checkout Session Completed event received
[Webhook] Checkout Session ID: cs_test_...
[Webhook] Payment Intent ID: pi_...
[Webhook] ✅ Payment found: ObjectId('...')
[Webhook] Updating payment with payment intent details...
[Webhook] ✅ Payment updated with PROCESSING status
[Webhook] ⏳ Waiting for payment_intent.succeeded event...
```

#### Webhook Event 2: payment_intent.succeeded (THE KEY EVENT)

**Expected Payment Service Logs:**
```
[Webhook] ========== STRIPE WEBHOOK RECEIVED ==========
[Webhook] Signature present: true
[Webhook] Webhook secret configured: true
[Webhook] ✅ Signature verified successfully
[Webhook] 📨 Processing event type: payment_intent.succeeded
[Webhook] Event ID: evt_1XYZ789...
[Webhook] 💰 Payment Intent Succeeded event received
[Webhook] Payment Intent ID: pi_...
[Webhook] ✅ Payment found: ObjectId('...')
[Webhook] Updating payment status to COMPLETED...
[Webhook] ✅ Payment saved with COMPLETED status
[Webhook] 🚀 Triggering SAGA completion for payment: ObjectId('...')
[Webhook] SAGA metadata: {
  correlationId: 'saga-...',
  userId: 'ObjectId(...)',
  orderId: 'ObjectId(...)',
  source: 'stripe-webhook'
}
[Webhook] ✅ SAGA completion handler executed
```

---

### Step 6: SAGA Completion Handler (Payment Service)

**Expected Payment Service Logs:**
```
[SAGA] 🎉 Handling payment completion {
  paymentId: ObjectId('...'),
  orderId: ObjectId('...'),
  amount: 70.49,
  correlationId: 'saga-...'
}
[SAGA] ✓ Payment status: COMPLETED
[SAGA] 📤 About to publish payment.completed event...
[SAGA] Payment data: {
  paymentId: ObjectId('...'),
  orderId: ObjectId('...'),
  amount: 70.49,
  status: 3
}
[SAGA] Metadata: {
  correlationId: 'saga-...',
  userId: 'ObjectId(...)',
  orderId: 'ObjectId(...)',
  source: 'stripe-webhook'
}
```

**Kafka Producer Logs:**
```
[Kafka Producer] 🚀 Publishing payment.completed event...
[Kafka Producer] Payment ID: ObjectId('...')
[Kafka Producer] Order ID: ObjectId('...')
[Kafka Producer] Event created: {
  eventType: 'payment.completed',
  eventId: 'payment.completed-...'
}
[Kafka] Published event to payment.completed: {
  eventType: 'payment.completed',
  eventId: 'payment.completed-...',
  partition: 0,
  offset: 456
}
[Kafka Producer] ✅✅✅ PAYMENT.COMPLETED EVENT SENT TO KAFKA! ✅✅✅
[SAGA] Payment completed event published: ObjectId('...')
[SAGA] ✅✅✅ payment.completed event published successfully! ✅✅✅
[SAGA] → Order Service will update order to PROCESSING/PAID
[SAGA] → Product Service will confirm inventory deduction
```

---

### Step 7: Order Confirmation (Order Service)

**Expected Order Service Logs:**
```
[Kafka Consumer] 🎉🎉🎉 PAYMENT.COMPLETED EVENT RECEIVED! 🎉🎉🎉
[Kafka Consumer] Event data: {
  orderId: 'ObjectId(...)',
  paymentId: 'ObjectId(...)',
  amount: 70.49,
  transactionId: 'pi_...'
}
[Kafka Consumer] Handling payment completed for order: ObjectId('...')
[Kafka Consumer] Order confirmed, payment status updated to PAID: ObjectId('...')
PAID: 2
```

---

## Testing Checklist

### Prerequisites
- [ ] Kafka is running (`docker ps | grep kafka`)
- [ ] MongoDB is running
- [ ] All services are running (auth, products, orders, payment, frontend)
- [ ] Stripe CLI is installed
- [ ] Stripe account is set up with test mode enabled

### Setup Steps
1. [ ] Run `stripe listen --forward-to localhost:5005/v1/payment/webhook`
2. [ ] Copy webhook signing secret (`whsec_...`)
3. [ ] Add `STRIPE_WEBHOOK_SECRET` to `/services/payment/.env`
4. [ ] Restart payment service
5. [ ] Verify all services are healthy

### Test Execution
1. [ ] Open `http://localhost:3006` in browser
2. [ ] Log in to user account
3. [ ] Add products to cart
4. [ ] Go to checkout page
5. [ ] Fill shipping address
6. [ ] Select "Credit/Debit Card" payment method (Stripe)
7. [ ] Click "Place Order"
8. [ ] Verify redirect to Stripe Checkout
9. [ ] Use test card: `4242 4242 4242 4242`
10. [ ] Expiry: Any future date (e.g., `12/34`)
11. [ ] CVC: Any 3 digits (e.g., `123`)
12. [ ] Click "Pay"
13. [ ] Wait for redirect to success page

### Log Verification

**Terminal 1: Stripe CLI**
```bash
stripe listen --forward-to localhost:5005/v1/payment/webhook
```
Look for:
- `checkout.session.completed` event
- `payment_intent.succeeded` event

**Terminal 2: Payment Service**
```bash
cd services/payment && npm run dev
```
Look for:
- `[Webhook] ========== STRIPE WEBHOOK RECEIVED ==========`
- `[SAGA] ✅✅✅ payment.completed event published successfully! ✅✅✅`
- `[Kafka Producer] ✅✅✅ PAYMENT.COMPLETED EVENT SENT TO KAFKA! ✅✅✅`

**Terminal 3: Order Service**
```bash
cd services/orders && npm run dev
```
Look for:
- `[Kafka Consumer] 🎉🎉🎉 PAYMENT.COMPLETED EVENT RECEIVED! 🎉🎉🎉`
- `PAID: 2`

### Database Verification

**Check Payment Document:**
```javascript
use ecommerce;
db.payments.findOne({ /* payment ID */ })
```

Expected:
```javascript
{
  _id: ObjectId("..."),
  orderId: ObjectId("..."),
  status: 3, // COMPLETED
  amount: 70.49,
  completedAt: ISODate("..."),
  transactionId: "pi_...",
  stripeDetails: {
    sessionId: "cs_test_...",
    paymentIntentId: "pi_...",
    chargeId: "ch_..."
  },
  metadata: {
    sagaId: "saga-...",
    sagaState: "payment_completed"
  }
}
```

**Check Order Document:**
```javascript
db.orders.findOne({ /* order ID */ })
```

Expected:
```javascript
{
  _id: ObjectId("..."),
  status: 2, // PROCESSING
  paymentStatus: 2, // PAID
  totalAmount: 70.49,
  metadata: {
    paymentId: ObjectId("..."),
    transactionId: "pi_...",
    sagaId: "saga-...",
    createdVia: "payment-saga"
  }
}
```

---

## Troubleshooting Guide

### Issue 1: payment.completed event not showing

#### Symptom
Stripe webhook received, but no `payment.completed` event published to Kafka

#### Debug Steps

**Step 1: Check if Stripe CLI is forwarding**
```bash
# In Stripe CLI terminal, you should see:
> checkout.session.completed [evt_...]
> payment_intent.succeeded [evt_...]
```
If not seeing events, restart Stripe CLI.

**Step 2: Check webhook secret**
```bash
# Verify secret in payment service .env
cat services/payment/.env | grep STRIPE_WEBHOOK_SECRET

# Should match the secret from `stripe listen` output
```

**Step 3: Check payment service logs**
Look for:
```
[Webhook] ========== STRIPE WEBHOOK RECEIVED ==========
```
If NOT present: Stripe CLI not forwarding OR payment service not running

**Step 4: Check signature verification**
Look for:
```
[Webhook] ✅ Signature verified successfully
```
If see `❌ Signature verification failed`: Webhook secret mismatch

**Step 5: Check payment lookup**
Look for:
```
[Webhook] ✅ Payment found: ObjectId('...')
```
If see `❌ Payment not found`: Payment wasn't created OR session ID mismatch

**Step 6: Check SAGA trigger**
Look for:
```
[Webhook] 🚀 Triggering SAGA completion for payment: ObjectId('...')
```
If NOT present: Webhook handler didn't reach `payment_intent.succeeded` case

**Step 7: Check event publishing**
Look for:
```
[Kafka Producer] ✅✅✅ PAYMENT.COMPLETED EVENT SENT TO KAFKA! ✅✅✅
```
If NOT present: Kafka connection issue OR error in `publishPaymentCompleted`

---

### Issue 2: Order payment status not updating

#### Symptom
`payment.completed` event published but order still shows PENDING

#### Debug Steps

**Step 1: Check Order Service is running**
```bash
curl http://localhost:3004/health
```

**Step 2: Check Order Service Kafka consumer**
Look for in Order Service logs:
```
[Kafka Consumer] 🎉🎉🎉 PAYMENT.COMPLETED EVENT RECEIVED! 🎉🎉🎉
```
If NOT present: Consumer not subscribed OR Kafka connection issue

**Step 3: Check order exists**
Look for:
```
[Kafka Consumer] Handling payment completed for order: ObjectId('...')
```
If see `Order not found`: Order wasn't created from `payment.initiated`

**Step 4: Check order update**
Look for:
```
[Kafka Consumer] Order confirmed, payment status updated to PAID
PAID: 2
```
If NOT present: Database transaction failed

---

### Issue 3: Webhook signature verification failed

#### Symptom
```
[Webhook] ❌ Signature verification failed
```

#### Solution
1. Stop payment service
2. In Stripe CLI terminal, copy the webhook secret again:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
   ```
3. Update `/services/payment/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
   ```
4. Restart payment service
5. Try payment again

---

### Issue 4: Payment not found in webhook

#### Symptom
```
[Webhook] ❌ Payment not found for payment intent: pi_...
```

#### Debug Steps
1. Check if `checkout.session.completed` webhook was received first
2. Verify payment was created in Step 2 (SAGA initiation)
3. Check payment document has correct `stripeDetails.sessionId`

#### Query
```javascript
db.payments.findOne({
  'stripeDetails.sessionId': 'cs_test_...'  // From Stripe CLI logs
})
```

---

## Success Indicators

You've successfully completed the flow when you see ALL of these:

✅ **Stripe CLI:**
- `checkout.session.completed [evt_...]`
- `payment_intent.succeeded [evt_...]`

✅ **Payment Service:**
- `[Webhook] ✅ Signature verified successfully`
- `[Webhook] ✅ Payment found`
- `[SAGA] ✅✅✅ payment.completed event published successfully! ✅✅✅`
- `[Kafka Producer] ✅✅✅ PAYMENT.COMPLETED EVENT SENT TO KAFKA! ✅✅✅`

✅ **Order Service:**
- `[Kafka Consumer] 🎉🎉🎉 PAYMENT.COMPLETED EVENT RECEIVED! 🎉🎉🎉`
- `PAID: 2`

✅ **Database:**
- Payment `status: 3` (COMPLETED)
- Order `status: 2` (PROCESSING)
- Order `paymentStatus: 2` (PAID)

---

## Files Modified (Enhanced Logging)

### Payment Service
1. [services/payment/saga/paymentSaga.js:467-480](services/payment/saga/paymentSaga.js#L467-L480)
   - Enhanced logging in `handlePaymentCompletion`
   - Added payment data and metadata logging before publishing event

2. [services/payment/services/kafkaProducer.js:117-168](services/payment/services/kafkaProducer.js#L117-L168)
   - Enhanced logging in `publishPaymentCompleted`
   - Added event creation confirmation
   - Added Kafka publish success/error logging

3. [services/payment/controllers/paymentController.js:555-658](services/payment/controllers/paymentController.js#L555-L658)
   - Enhanced webhook handler logging
   - Added signature verification logging
   - Added detailed event type logging
   - Added SAGA trigger logging

### Order Service
1. [services/orders/services/kafkaConsumer.js:209-216](services/orders/services/kafkaConsumer.js#L209-L216)
   - Enhanced logging in `handlePaymentCompleted`
   - Added event data logging

---

## Removing Enhanced Logging (After Verification)

Once the flow is verified and working, you can remove the excessive logging:

**Search for and remove lines containing:**
- `✅✅✅`
- `🎉🎉🎉`
- `📤`
- `🚀`
- `💰`
- `🛒`

**Keep these important logs:**
- `[SAGA] payment.completed event published`
- `[Kafka] Published event to payment.completed`
- `[Kafka Consumer] payment.completed event received`
- Error logs

---

## Next Steps After Verification

1. **Test failure scenarios:**
   - Use card `4000 0000 0000 0002` (card declined)
   - Verify `payment.failed` event is published
   - Verify order is marked as CANCELLED

2. **Add monitoring:**
   - Set up Sentry or similar for error tracking
   - Monitor Kafka lag
   - Alert on payment failures

3. **Add retry logic:**
   - Retry failed Kafka publishes
   - Dead letter queue for failed events

4. **Production webhook setup:**
   - Configure webhook in Stripe Dashboard
   - Use production webhook secret
   - Set up webhook monitoring

---

**Documentation Updated:** 2025-11-27
**Status:** Ready for testing with enhanced logging
