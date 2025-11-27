# Payment SAGA Flow - Complete Documentation

## Overview

This document describes the complete payment flow using the SAGA pattern for distributed transactions across Payment, Order, and Product services.

## Two Payment Flows

### 1. Stripe Payment Flow (SAGA Orchestration)

**Frontend does NOT create order - SAGA handles everything**

#### Flow Steps:

1. **User Checkout (Frontend)**
   - User fills checkout form
   - Clicks "Pay with Stripe"
   - Frontend sends payment request to `/api/payment/create-checkout`
   - **NO order creation call**

2. **Payment Service - SAGA Initiation**
   ```
   POST /api/v1/payment/checkout-session
   {
     amount: 70.49,
     currency: "USD",
     items: [...],
     paymentMethod: 2, // STRIPE
     shippingAddress: {...}
   }
   ```

   **Payment Controller:**
   - Generates `orderId` (new ObjectId)
   - Gets `userId` from authenticated user
   - Creates Stripe checkout session
   - Executes Payment SAGA

3. **Payment SAGA Execution** (`paymentSaga.js`)

   **Step 1: Create Payment Record**
   - Creates payment with status `PENDING`
   - Payment includes: orderId, userId, items, amount
   - Stores sagaId in metadata

   **Step 2: Publish `payment.initiated` Event**
   - Event published to Kafka topic: `payment.initiated`
   - Event data includes:
     ```javascript
     {
       paymentId, orderId, userId, items, amount,
       currency, paymentMethod, customerEmail
     }
     ```
   - This triggers Order Service to create the order

   **Step 3: Return Checkout URL**
   - Returns Stripe checkout URL to frontend
   - Frontend redirects user to Stripe
   - SAGA state: `AWAITING_GATEWAY`

4. **Order Service - Order Creation**

   **Kafka Consumer receives `payment.initiated`:**
   - Checks if order already exists (idempotency)
   - Creates order with:
     - `_id`: orderId from event
     - `status`: PENDING
     - `paymentStatus`: PENDING
     - `items`, `userId`, `totalAmount` from event
   - Publishes `order.created` event
   - Product Service can now reserve inventory

5. **User Completes Payment on Stripe**
   - User enters card details
   - Stripe processes payment
   - Stripe sends webhook to: `/v1/payment/webhook`

6. **Stripe Webhook Handler**

   **Event: `payment_intent.succeeded`**
   - Finds payment by Stripe session ID
   - Updates payment status to `COMPLETED`
   - Calls `handlePaymentCompletion(payment, metadata)`

7. **Payment Completion - SAGA Continuation**

   **`handlePaymentCompletion` function:**
   - Updates payment metadata: `sagaState = PAYMENT_COMPLETED`
   - Publishes `payment.completed` event (ONLY ONCE)
   - Event data:
     ```javascript
     {
       paymentId, orderId, userId, amount,
       transactionId, completedAt
     }
     ```

8. **Order Service - Order Confirmation**

   **Kafka Consumer receives `payment.completed`:**
   - Finds order by orderId
   - Updates order:
     - `status`: PROCESSING (2)
     - `paymentStatus`: PAID (2)
   - Adds payment metadata (paymentId, transactionId)
   - Publishes `order.confirmed` event

9. **SAGA Complete**
   - Order is PROCESSING with payment PAID
   - Product Service confirms inventory deduction
   - User receives confirmation

---

### 2. Cash on Delivery (COD) Flow (Direct)

**Frontend creates order directly - No SAGA**

#### Flow Steps:

1. **User Checkout (Frontend)**
   - User fills checkout form
   - Selects "Cash on Delivery"
   - Frontend creates order directly

2. **Order Creation**
   ```
   POST /api/orders
   {
     items: [...],
     totalAmount: 70.49,
     paymentMethod: 1, // COD
     shippingAddress: {...}
   }
   ```

   **Order Controller:**
   - Creates order with status `PENDING`
   - Payment status: `PENDING`
   - Returns order confirmation

3. **Order Processing**
   - Order service handles fulfillment
   - Payment collected on delivery
   - Status updated manually/on delivery

---

## Event Flow Diagram

### Stripe Payment SAGA

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 1. POST /payment/create-checkout
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Payment Service                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Payment SAGA                                          │ │
│  │  1. Create Payment (PENDING)                           │ │
│  │  2. Publish payment.initiated event                    │ │
│  │  3. Return Stripe checkout URL                         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────┬──────────────────────────────────────────────────────┘
       │ 2. Redirect to Stripe
       │
┌──────▼──────┐
│   Stripe    │
│  Checkout   │
└──────┬──────┘
       │
       │ 3. payment.initiated event
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Order Service (Kafka Consumer)                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Handle payment.initiated                              │ │
│  │  1. Create Order (PENDING)                             │ │
│  │  2. Publish order.created event                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
       │
       │ 4. User completes payment
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Stripe Webhook                                              │
│  Event: payment_intent.succeeded                            │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ 5. Webhook call
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Payment Service                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  handlePaymentCompletion                               │ │
│  │  1. Update Payment (COMPLETED)                         │ │
│  │  2. Publish payment.completed event                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ 6. payment.completed event
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Order Service (Kafka Consumer)                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Handle payment.completed                              │ │
│  │  1. Update Order (PROCESSING)                          │ │
│  │  2. Update Payment Status (PAID)                       │ │
│  │  3. Publish order.confirmed event                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
       │
       │ 7. order.confirmed event
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Product Service                                             │
│  - Confirm inventory deduction                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Events

### 1. `payment.initiated`
**Published:** Payment Service (SAGA)
**Consumed:** Order Service
**Purpose:** Trigger order creation for Stripe payments
**Data:**
```javascript
{
  eventId: 'payment.initiated-...',
  eventType: 'payment.initiated',
  data: {
    paymentId: '...',
    orderId: '...',
    userId: '...',
    amount: 70.49,
    currency: 'USD',
    paymentMethod: 2,
    items: [...],
    customerEmail: 'user@example.com'
  },
  metadata: {
    correlationId: 'saga-...',
    userId: '...',
    orderId: '...'
  }
}
```

### 2. `order.created`
**Published:** Order Service
**Consumed:** Product Service, Payment Service
**Purpose:** Notify services that order was created
**Data:**
```javascript
{
  eventType: 'ORDER_CREATED',
  orderId: '...',
  userId: '...',
  orderNumber: 'ORD-...',
  totalAmount: 70.49,
  items: [...],
  createdAt: '...'
}
```

### 3. `payment.completed`
**Published:** Payment Service (Webhook Handler)
**Consumed:** Order Service
**Purpose:** Update order status when payment succeeds
**Data:**
```javascript
{
  eventId: 'payment.completed-...',
  eventType: 'payment.completed',
  data: {
    paymentId: '...',
    orderId: '...',
    userId: '...',
    amount: 70.49,
    transactionId: 'pi_...',
    completedAt: '...'
  },
  metadata: {
    correlationId: 'saga-...'
  }
}
```

### 4. `order.confirmed`
**Published:** Order Service
**Consumed:** Product Service, Notification Service
**Purpose:** Confirm order and trigger fulfillment
**Data:**
```javascript
{
  eventType: 'order.confirmed',
  orderId: '...',
  userId: '...',
  paymentId: '...',
  transactionId: '...',
  items: [...],
  totalAmount: 70.49
}
```

---

## Compensating Transactions

### If Payment Fails

1. **Stripe Webhook: `payment_intent.payment_failed`**
   - Payment status → FAILED
   - Publish `payment.failed` event

2. **Order Service receives `payment.failed`**
   - Cancel order (status → CANCELLED)
   - Publish `order.cancelled` event

3. **Product Service receives `order.cancelled`**
   - Release reserved inventory

### If SAGA Fails During Initiation

1. **SAGA Rollback Triggered**
   - Cancel payment (status → CANCELLED)
   - Publish `payment.cancelled` event

2. **Order Service receives `payment.cancelled`**
   - Cancel order if it was created
   - Release inventory

---

## Important Notes

### Idempotency
- All event handlers check for duplicates
- `handlePaymentInitiated` checks if order exists
- `handlePaymentCompleted` safely handles multiple calls
- Event publishing includes correlation IDs for tracing

### Event Publishing - No Redundancy
- `payment.initiated` - Published ONCE during payment creation
- `payment.completed` - Published ONCE from webhook
- `order.created` - Published ONCE when order is created
- `order.confirmed` - Published ONCE when payment completes

### Testing Webhooks Locally

To test Stripe webhooks in development:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local payment service
stripe listen --forward-to localhost:5005/v1/payment/webhook

# Copy webhook signing secret to .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Status Codes

**Order Status:**
- 1 = PENDING
- 2 = PROCESSING
- 3 = SHIPPED
- 4 = DELIVERED
- 5 = CANCELLED

**Payment Status:**
- 1 = PENDING
- 2 = PAID
- 3 = FAILED
- 4 = REFUNDED

---

## Files Modified

### Payment Service
- `/services/payment/saga/paymentSaga.js` - Complete SAGA orchestration
- `/services/payment/controllers/paymentController.js` - Updated to generate orderId
- `/services/payment/services/kafkaProducer.js` - Event publishing

### Order Service
- `/services/orders/services/kafkaConsumer.js` - Updated `handlePaymentInitiated` to CREATE orders

### Frontend
- `/frontend/src/app/checkout/page.tsx` - Removed order creation for Stripe payments

---

## Summary

**Stripe Payment Flow:**
1. Frontend → Payment Service (create checkout)
2. Payment SAGA creates payment + publishes `payment.initiated`
3. Order Service creates order
4. User pays on Stripe
5. Webhook → Payment Service → publishes `payment.completed`
6. Order Service updates order to PROCESSING/PAID
7. Complete!

**COD Flow:**
1. Frontend → Order Service (create order directly)
2. Order created with PENDING status
3. Payment on delivery

**No Redundant Events:** Each event is published exactly once at the right time in the flow.
