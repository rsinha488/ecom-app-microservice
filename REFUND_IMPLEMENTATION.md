# Stripe Refund Implementation

## Overview
Implemented automatic refund processing for cancelled orders paid via Stripe. When an order is cancelled, the system automatically initiates a refund through the Stripe API, and the refund appears in the customer's account within 5-10 business days.

## How It Works

### 1. Order Cancellation Flow

**Frontend → Order Service:**
- User clicks "Cancel Order" button
- Frontend calls: `DELETE /api/orders/:orderId`

**Order Service Processing:**
- Cancels order (status → CANCELLED)
- Detects if refund is needed: `paymentMethod === 7 (Stripe) && paymentStatus === 2 (PAID)`
- Publishes `order.cancelled` Kafka event with metadata:
  ```javascript
  {
    orderId: "...",
    orderNumber: "ORD-...",
    requiresRefund: true,        // Auto-detected for Stripe+PAID
    paymentMethod: 7,            // Stripe
    paymentStatus: 2,            // PAID
    cancelledBy: "userId",
    cancelReason: "Customer requested cancellation"
  }
  ```

### 2. Refund Processing Flow

**Payment Service Kafka Consumer:**
- Receives `order.cancelled` event
- Checks if `requiresRefund === true && paymentMethod === 7`
- Retrieves payment document for the order
- Validates payment status (must be COMPLETED)
- Calls Stripe API to initiate refund:
  ```javascript
  const refund = await stripe.refunds.create({
    payment_intent: payment.stripeDetails.paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      orderId: "...",
      cancelledBy: "userId",
      cancelReason: "Customer requested cancellation"
    }
  });
  ```
- Updates payment document:
  - Status: `COMPLETED` → `REFUNDED` (5)
  - Adds refund details:
    ```javascript
    {
      refundId: "re_...",           // Stripe refund ID
      refundAmount: 99.99,          // Full payment amount
      refundReason: "Customer requested cancellation",
      refundedAt: "2025-11-27T..."
    }
    ```
- Publishes `payment.refunded` event to Kafka

### 3. Payment Method Behavior

| Payment Method | Status | Behavior |
|---------------|--------|----------|
| COD (6) | Any | Order cancelled, no refund needed |
| Stripe (7) | PENDING/PROCESSING | Order cancelled, payment cancelled |
| Stripe (7) | COMPLETED/PAID | **Order cancelled + Automatic refund initiated** |
| Stripe (7) | REFUNDED | Already refunded, no action |
| Stripe (7) | CANCELLED | Already cancelled, no action |

## Files Modified

### 1. `/services/orders/controllers/orderController.js`
**Lines 1031-1047:**
- Added payment metadata to cancellation event
- Auto-detect refund requirement: `paymentMethod === 7 && paymentStatus === 2`
- Pass `cancelledBy` and `cancelReason` to event

### 2. `/services/orders/services/kafkaProducer.js`
**Lines 105-145:**
- Modified `publishOrderCancelled()` to accept `metadata` parameter
- Include payment details in event: `paymentMethod`, `paymentStatus`, `requiresRefund`
- Log refund intent for visibility

### 3. `/services/payment/services/kafkaConsumer.js`
**Lines 127-290:**
- Complete rewrite of `handleOrderCancelled()` function
- Implement Stripe refund processing:
  - Detect refund requirement
  - Call Stripe API
  - Update payment status and details
  - Publish refund event
- Add error handling for refund failures
- Distinguish between COD and Stripe payments

### 4. `/services/payment/services/kafkaProducer.js`
**Lines 228-267:**
- `publishPaymentRefunded()` already existed (no changes needed)
- Publishes `payment.refunded` event with full refund details

## Payment Status Codes

```javascript
PAYMENT_STATUS = {
  PENDING: 1,      // Initial state
  PAID: 2,         // Payment captured (legacy, same as COMPLETED)
  COMPLETED: 3,    // Payment successfully completed
  FAILED: 4,       // Payment failed
  REFUNDED: 5,     // Refund initiated
  CANCELLED: 6     // Payment cancelled before completion
}
```

## Refund Timeline

**Stripe Standard Refund Processing:**
- Refund initiated: Immediate (via Stripe API)
- Funds returned to customer: **5-10 business days**
  - Credit cards: 5-10 business days
  - Debit cards: 5-10 business days
  - Bank transfers: 5-10 business days

**Customer Visibility:**
- Refund appears as "pending" in Stripe Dashboard immediately
- Customer sees refund status on their bank/card statement within processing window

## Error Handling

### Stripe API Failure:
```javascript
catch (error) {
  console.error('[SAGA] ❌ Stripe refund failed:', error.message);

  // Mark payment for manual processing
  payment.metadata = payment.metadata || {};
  payment.metadata.requiresManualRefund = true;
  payment.metadata.refundError = error.message;
  await payment.save({ session });

  // Publish compensation event
  await publishSagaCompensation({
    action: 'refund_failed',
    orderId: payment.orderId.toString(),
    paymentId: payment._id.toString(),
    error: error.message,
    requiresManualRefund: true
  });
}
```

### Manual Processing Flags:
- Payment document gets `requiresManualRefund: true` flag
- Admin can identify failed refunds via query: `db.payments.find({ "metadata.requiresManualRefund": true })`
- Compensation event triggers alert for manual intervention

## Testing Checklist

### Prerequisites:
- ✅ Stripe account configured
- ✅ `STRIPE_SECRET_KEY` in environment
- ✅ Kafka running and connected
- ✅ Both Order and Payment services running

### Test Cases:

**1. Cancel COD Order (should work as before):**
   - Create COD order
   - Cancel order
   - ✓ Order status → CANCELLED
   - ✓ No refund processing
   - ✓ Inventory released

**2. Cancel Pending Stripe Order:**
   - Create Stripe order (don't complete payment)
   - Cancel order
   - ✓ Order status → CANCELLED
   - ✓ Payment status → CANCELLED
   - ✓ No refund (payment never completed)

**3. Cancel Completed Stripe Order (main feature):**
   - Create Stripe order
   - Complete payment via Stripe
   - Wait for webhook processing
   - Cancel order from frontend
   - ✓ Order status → CANCELLED
   - ✓ Payment status → REFUNDED
   - ✓ Refund details populated
   - ✓ Stripe Dashboard shows refund
   - ✓ Kafka event published: `payment.refunded`
   - ✓ Log: "Refund will appear in customer account in 5-10 business days"

**4. Error Handling:**
   - Simulate Stripe API failure (invalid key)
   - ✓ Payment marked with `requiresManualRefund: true`
   - ✓ Compensation event published
   - ✓ Error logged with details

## Logs to Watch

**Successful Refund Flow:**
```
[Orders Controller] 🚫 Order cancelled: ORD-12345
[Orders Kafka] ✅ Published order cancellation events for order ORD-12345
[Orders Kafka] 💰 Refund will be initiated for Stripe payment

[Payment Consumer] 📨 Received message from order.cancelled
[Payment Consumer] 🔄 Processing order cancellation for order ORD-12345
[SAGA] 💳 Processing Stripe refund for completed payment...
[SAGA] ✅ Stripe refund created: re_1234567890
[SAGA] ℹ️  Refund will appear in customer account in 5-10 business days
[Kafka Producer] Published event to payment.refunded
[SAGA] ✅ Payment refunded successfully
```

## Environment Variables Required

```bash
# Payment Service .env
STRIPE_SECRET_KEY=sk_test_...
KAFKA_BROKERS=localhost:9092
MONGODB_URI=mongodb://localhost:27017/payment
```

## API Reference

### Cancel Order Endpoint:
```http
DELETE /api/orders/:orderId
Authorization: Bearer <token>

{
  "reason": "Customer changed mind" // Optional
}
```

**Response (200 OK):**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "_id": "...",
    "orderNumber": "ORD-12345",
    "status": 5,  // CANCELLED
    "cancelledAt": "2025-11-27T10:30:00Z"
  }
}
```

## Stripe Dashboard Verification

**Steps to verify refund in Stripe:**
1. Go to: https://dashboard.stripe.com/test/payments
2. Find payment by `payment_intent` ID
3. Click into payment details
4. Check "Refunds" section
5. Verify refund amount and status

**Refund Status Values:**
- `pending`: Refund submitted, processing
- `succeeded`: Refund completed
- `failed`: Refund failed (investigate)
- `canceled`: Refund was cancelled

## Important Notes

1. **Refund Processing Time**: Standard Stripe refunds take 5-10 business days. This is controlled by Stripe/banks, not our system.

2. **Partial Refunds**: Current implementation creates full refunds. For partial refunds, modify:
   ```javascript
   const refund = await stripe.refunds.create({
     payment_intent: paymentIntentId,
     amount: partialAmount * 100,  // Amount in cents
     reason: 'requested_by_customer'
   });
   ```

3. **Refund Limits**: Stripe only allows refunds for completed payments within a certain timeframe (typically 180 days).

4. **Idempotency**: Stripe refund API is idempotent. If the same refund is requested twice with the same `payment_intent`, Stripe returns the existing refund.

5. **Webhook Events**: Stripe sends `charge.refunded` webhook when refund completes. Consider adding handler for:
   - Updating final refund status
   - Notifying customer
   - Updating analytics

## Future Enhancements

- [ ] Add `charge.refunded` webhook handler for completion notifications
- [ ] Implement partial refund support
- [ ] Add customer notification emails for refunds
- [ ] Create admin dashboard for manual refund processing
- [ ] Add refund analytics and reporting
- [ ] Implement refund retry mechanism for transient failures
- [ ] Support refund reason categories (damaged, not-as-described, etc.)

## Related Documentation

- [Stripe Refunds API](https://stripe.com/docs/api/refunds)
- [Stripe Refund Processing Times](https://stripe.com/docs/refunds#understanding-refunds)
- Payment SAGA Flow: `PAYMENT_FLOW_COMPLETE.md`
- Order Service Events: `/services/orders/services/kafkaProducer.js`
- Payment Service Events: `/services/payment/services/kafkaProducer.js`
