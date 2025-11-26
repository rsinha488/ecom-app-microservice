# SAGA Pattern & Kafka Implementation Guide

## Overview

This payment service implements the **SAGA pattern** with **Kafka** for distributed transaction management across microservices. The SAGA pattern ensures data consistency in a distributed system by coordinating transactions through a sequence of steps with compensating transactions for rollback.

---

## Architecture

### SAGA Flow for Payment Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    Payment SAGA Orchestrator                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │  Step 1: Create Payment Record (Payment Service)    │
    │  ✓ Creates payment in database                      │
    │  ✓ Registers compensation: Delete/Cancel payment    │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │  Step 2: Publish Payment Initiated Event            │
    │  ✓ Publishes to Kafka topic: payment.initiated      │
    │  ✓ Notifies Order & Product services                │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │  Step 3: Order Service Updates Order Status         │
    │  (External - triggered by payment.initiated event)   │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │  Step 4: Product Service Reserves Inventory         │
    │  (External - triggered by payment.initiated event)   │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │  Step 5: Stripe Payment Gateway Processing          │
    │  (Webhook handler updates payment status)            │
    └─────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                   ✓ SUCCESS          ✗ FAILURE
                    │                   │
                    ▼                   ▼
    ┌───────────────────────┐  ┌───────────────────────┐
    │ Payment Completed     │  │ SAGA Rollback         │
    │ Event Published       │  │ (Compensating Txns)   │
    │                       │  │                       │
    │ • Order confirmed     │  │ • Cancel payment      │
    │ • Inventory deducted  │  │ • Release inventory   │
    │ • Email sent          │  │ • Cancel order        │
    └───────────────────────┘  └───────────────────────┘
```

---

## File Structure

```
services/payment/
├── config/
│   └── kafka.js                  # Kafka connection configuration
├── events/
│   └── paymentEvents.js          # Event type definitions and schemas
├── services/
│   ├── kafkaProducer.js          # Publishes events to Kafka
│   └── kafkaConsumer.js          # Consumes events from other services
├── saga/
│   └── paymentSaga.js            # SAGA orchestrator with compensation logic
├── controllers/
│   └── paymentController.js      # Updated to use SAGA
└── server.js                     # Kafka initialization on startup
```

---

## Key Components

### 1. Kafka Configuration (`config/kafka.js`)

**Purpose**: Establishes Kafka connection with producer, consumer, and admin clients.

**Features**:
- Auto-topic creation
- Idempotent producer (prevents duplicate messages)
- Automatic retry with exponential backoff
- Health check endpoint support

**Topics Created**:
```javascript
- payment.initiated      # Payment created
- payment.completed      # Payment succeeded
- payment.failed         # Payment failed
- payment.refunded       # Payment refunded
- payment.cancelled      # Payment cancelled
- saga.payment.compensate # Rollback events
- order.created          # Consumed from Order service
- order.cancelled        # Consumed from Order service
```

**Environment Variables**:
```bash
KAFKA_BROKERS=localhost:9092
# For production:
# KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
```

---

### 2. Payment Events (`events/paymentEvents.js`)

**Purpose**: Defines standardized event schemas for inter-service communication.

**Event Structure**:
```javascript
{
  eventId: "payment.initiated-1234567890-abc123def",
  eventType: "payment.initiated",
  timestamp: "2025-11-26T10:30:00.000Z",
  service: "payment-service",
  version: "1.0.0",
  data: {
    paymentId: "507f1f77bcf86cd799439011",
    orderId: "507f1f77bcf86cd799439012",
    userId: "507f1f77bcf86cd799439013",
    amount: 99.99,
    currency: "USD",
    items: [...]
  },
  metadata: {
    correlationId: "corr-1234567890-xyz",
    causationId: null,
    userId: "507f1f77bcf86cd799439013",
    traceId: "trace-abc123"
  }
}
```

**Correlation ID**: Tracks events across the entire SAGA flow
**Trace ID**: Distributed tracing for debugging

---

### 3. Kafka Producer (`services/kafkaProducer.js`)

**Purpose**: Publishes payment events to Kafka topics.

**Key Functions**:

```javascript
// Publish when payment is created
publishPaymentInitiated(payment, metadata)

// Publish when payment succeeds (Stripe webhook)
publishPaymentCompleted(payment, metadata)

// Publish when payment fails (Stripe webhook)
publishPaymentFailed(payment, metadata)

// Publish when payment is refunded
publishPaymentRefunded(payment, metadata)

// Publish when payment is cancelled
publishPaymentCancelled(payment, metadata)

// Publish rollback events
publishSagaCompensation(data, metadata)
```

**Message Ordering**:
- Uses `orderId` as partition key to ensure ordering
- Events for same order always go to same partition

---

### 4. Kafka Consumer (`services/kafkaConsumer.js`)

**Purpose**: Consumes events from Order and Product services.

**Topics Consumed**:
```javascript
- order.created          # New order created
- order.cancelled        # Order cancelled by user/admin
- saga.payment.compensate # Rollback requests
```

**Event Handlers**:

```javascript
// Handle order cancellation
handleOrderCancelled(event)
  → Finds payment by orderId
  → Cancels payment if still pending
  → Publishes payment.cancelled event

// Handle SAGA compensation requests
handleSagaCompensation(event)
  → Executes compensating transaction
  → Cancels/refunds payment
  → Publishes compensation complete event
```

**Idempotency**: Uses `event.eventId` to prevent duplicate processing

---

### 5. SAGA Orchestrator (`saga/paymentSaga.js`)

**Purpose**: Coordinates distributed transaction with automatic rollback.

#### SAGA State Machine

```javascript
const SAGA_STATES = {
  PAYMENT_CREATED: 'payment_created',
  ORDER_UPDATED: 'order_updated',
  INVENTORY_RESERVED: 'inventory_reserved',
  PAYMENT_PROCESSED: 'payment_processed',
  ORDER_CONFIRMED: 'order_confirmed',
  INVENTORY_DEDUCTED: 'inventory_deducted',
  COMPLETED: 'completed',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated'
};
```

#### SAGA Execution

```javascript
class PaymentSaga {
  async execute() {
    try {
      // Step 1: Create payment record
      await this.createPayment(session);

      // Register compensation for rollback
      this.compensations.push({
        name: 'deletePayment',
        action: () => this.compensateDeletePayment()
      });

      // Step 2: Publish payment initiated event
      await this.publishInitiatedEvent();

      return { success: true, payment: this.payment };
    } catch (error) {
      // Execute compensating transactions in reverse order
      await this.rollback(session);
      return { success: false, error: error.message };
    }
  }
}
```

#### Compensating Transactions

**What are compensating transactions?**
They are reverse operations that undo the effects of a completed step.

**Example**:
- **Forward Transaction**: Create payment → Mark as PENDING
- **Compensating Transaction**: Update payment → Mark as CANCELLED

**LIFO Execution**: Compensations run in **reverse order** (Last In, First Out)

```javascript
async rollback(session) {
  // Execute compensations in reverse order
  for (let i = this.compensations.length - 1; i >= 0; i--) {
    const compensation = this.compensations[i];
    await compensation.action();
  }

  // Publish rollback complete event
  await publishSagaCompensation({
    action: 'payment_saga_rolled_back',
    paymentId: this.payment._id,
    orderId: this.payment.orderId,
    reason: 'SAGA failed and was rolled back'
  });
}
```

---

### 6. Updated Payment Controller

**Before (Direct Database Creation)**:
```javascript
const payment = new Payment(paymentData);
await payment.save({ session });
```

**After (SAGA Pattern)**:
```javascript
const metadata = {
  correlationId: generateCorrelationId(),
  userId: userId.toString(),
  orderId: orderId.toString(),
  traceId: req.headers['x-trace-id'],
  source: 'checkout-api'
};

const sagaResult = await executePaymentSaga(paymentData, metadata);

if (!sagaResult.success) {
  // SAGA failed - rollback already executed
  return res.status(500).json(ErrorResponse.serverError(...));
}
```

**Webhook Updates**:
```javascript
// Payment succeeded
case 'payment_intent.succeeded':
  payment.status = PAYMENT_STATUS.COMPLETED;
  await payment.save({ session });

  // Continue SAGA flow
  await handlePaymentCompletion(payment, metadata);
  break;

// Payment failed
case 'payment_intent.payment_failed':
  payment.status = PAYMENT_STATUS.FAILED;
  await payment.save({ session });

  // Trigger SAGA rollback
  await handlePaymentFailure(payment, metadata);
  break;
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd services/payment
npm install kafkajs
```

✅ **Already installed**: kafkajs has been added to package.json

---

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Kafka Configuration
KAFKA_BROKERS=localhost:9092

# Frontend URL for payment redirects
FRONTEND_URL=http://localhost:3000
```

✅ **Already configured**: Environment variables have been added

---

### 3. Start Kafka Locally (Development)

**Option A: Using Docker Compose**

Create `docker-compose.kafka.yml`:
```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

Start Kafka:
```bash
docker-compose -f docker-compose.kafka.yml up -d
```

**Option B: Using Homebrew (macOS)**
```bash
brew install kafka
brew services start zookeeper
brew services start kafka
```

---

### 4. Start Payment Service

```bash
npm run dev
```

**Expected Output**:
```
Payment service running on port 5005
Environment: development
API Version: v1
[Kafka] Connecting to Kafka brokers...
[Kafka] Producer connected successfully
[Kafka] Consumer connected successfully
[Kafka] Created topics: [...list of topics...]
[Kafka] Kafka initialization complete
[Kafka] Starting consumer...
[Kafka] Subscribed to topics: order.created, order.cancelled, saga.payment.compensate
[Kafka] Consumer running
```

---

## Testing the SAGA Flow

### 1. Create a Payment (Initiates SAGA)

```bash
POST http://localhost:5005/v1/payment/checkout-session
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "items": [
    {
      "productId": "prod_123",
      "productName": "Premium Plan",
      "quantity": 1,
      "price": 99.99
    }
  ],
  "amount": 99.99,
  "currency": "USD",
  "customerEmail": "customer@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "payment": { ... },
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sagaId": "saga-1234567890-abc123"
  },
  "message": "Checkout session created successfully"
}
```

**Console Logs** (Payment Service):
```
[Payment Controller] Executing payment SAGA: { correlationId: 'saga-...', orderId: '...', amount: 99.99 }
[SAGA] Starting payment SAGA execution
[SAGA] Step 1: Creating payment record
[SAGA] Payment created: 507f1f77bcf86cd799439013
[SAGA] Step 2: Publishing payment initiated event
[Kafka] Published event to payment.initiated: { eventType: 'payment.initiated', partition: 1, offset: 42 }
[SAGA] Payment initiated event published
[SAGA] Payment SAGA created successfully
[Payment Controller] SAGA executed successfully: { paymentId: '...', sagaId: '...' }
```

---

### 2. Simulate Payment Success (Stripe Webhook)

```bash
POST http://localhost:5005/v1/payment/webhook
Stripe-Signature: <stripe_signature>
Content-Type: application/json

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_123...",
      "amount": 9999,
      "currency": "usd"
    }
  }
}
```

**Console Logs**:
```
[Webhook] Payment completed, triggering SAGA completion: 507f1f77bcf86cd799439013
[SAGA] Handling payment completion in SAGA
[Kafka] Published event to payment.completed: { eventType: 'payment.completed', partition: 1, offset: 43 }
[SAGA] Payment completion step finished
```

**Order Service** (would consume `payment.completed`):
```
[Kafka Consumer] Received event: payment.completed
[Order Controller] Updating order status to CONFIRMED
[Order Controller] Order confirmed: 507f1f77bcf86cd799439011
```

**Product Service** (would consume `payment.completed`):
```
[Kafka Consumer] Received event: payment.completed
[Product Controller] Deducting inventory for products: [prod_123]
[Product Controller] Inventory updated successfully
```

---

### 3. Simulate Payment Failure (Triggers Rollback)

```bash
POST http://localhost:5005/v1/payment/webhook
Stripe-Signature: <stripe_signature>
Content-Type: application/json

{
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_123...",
      "last_payment_error": {
        "message": "Your card was declined."
      }
    }
  }
}
```

**Console Logs**:
```
[Webhook] Payment failed, triggering SAGA rollback: 507f1f77bcf86cd799439013
[SAGA] Handling payment failure in SAGA
[Kafka] Published event to payment.failed: { eventType: 'payment.failed', partition: 1, offset: 44 }
[Kafka] Published event to saga.payment.compensate: { action: 'compensate_failed_payment' }
[SAGA] Payment failure handled, compensations triggered
```

**Order Service** (would consume `payment.failed`):
```
[Kafka Consumer] Received event: payment.failed
[Order Controller] Cancelling order due to payment failure: 507f1f77bcf86cd799439011
[Order Controller] Order cancelled
[Kafka] Published event to order.cancelled
```

**Product Service** (would consume `payment.failed`):
```
[Kafka Consumer] Received event: payment.failed
[Product Controller] Releasing reserved inventory
[Product Controller] Inventory released successfully
```

---

## Health Check

Check Kafka connectivity:

```bash
GET http://localhost:5005/health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "payments",
  "version": "v1",
  "port": 5005,
  "environment": "development",
  "timestamp": "2025-11-26T10:30:00.000Z",
  "dependencies": {
    "database": "connected",
    "kafka": {
      "status": "healthy",
      "brokers": 1,
      "controller": 0
    }
  }
}
```

If Kafka is down:
```json
{
  "status": "degraded",
  "dependencies": {
    "kafka": {
      "status": "unhealthy",
      "error": "Connection to Kafka failed"
    }
  }
}
```

---

## Monitoring & Debugging

### View Kafka Topics

```bash
# Using Kafka CLI
kafka-topics --bootstrap-server localhost:9092 --list

# Expected output:
payment.initiated
payment.completed
payment.failed
payment.refunded
payment.cancelled
saga.payment.compensate
order.created
order.cancelled
```

### Consume Events (Debug)

```bash
# Listen to payment initiated events
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic payment.initiated \
  --from-beginning \
  --property print.key=true

# Listen to all payment events
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic payment.* \
  --from-beginning
```

### View Consumer Groups

```bash
kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Expected output:
payment-service-group
order-service-group
product-service-group
```

### Check Consumer Lag

```bash
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group payment-service-group \
  --describe
```

---

## Error Handling & Resilience

### 1. Kafka Connection Failure

**Graceful Degradation**:
```javascript
async function initializeKafka() {
  try {
    await connectKafka();
    await startConsumer();
  } catch (error) {
    console.error('[Kafka] Failed to initialize Kafka:', error);
    // Service continues without event-driven features
    console.warn('[Kafka] Payment service will continue without event-driven features');
  }
}
```

**Result**: Payment service runs normally, but events are not published/consumed.

### 2. Event Publishing Failure

**Retry Mechanism** (built into KafkaJS):
```javascript
const producer = kafka.producer({
  retry: {
    initialRetryTime: 300,
    retries: 10,
    maxRetryTime: 30000,
    multiplier: 2
  }
});
```

**Exponential Backoff**:
- Attempt 1: 300ms
- Attempt 2: 600ms
- Attempt 3: 1200ms
- Attempt 4: 2400ms
- ...up to 30 seconds

### 3. Compensating Transaction Failure

**Critical Alert**:
```javascript
catch (error) {
  console.error('[SAGA] Critical error during rollback:', error);
  // In production: Send to monitoring/alerting system
  // Example: Sentry, DataDog, PagerDuty
}
```

**Manual Intervention Required**: If compensation fails, ops team is alerted.

### 4. Duplicate Event Processing

**Idempotency Check**:
```javascript
// Track processed events in database
const processed = await ProcessedEvent.findOne({ eventId: event.eventId });
if (processed) {
  console.log('[Kafka] Event already processed, skipping:', event.eventId);
  return;
}

// Process event...

// Mark as processed
await ProcessedEvent.create({ eventId: event.eventId, processedAt: new Date() });
```

---

## Production Considerations

### 1. Kafka Cluster Setup

**Minimum 3 Brokers** for high availability:
```bash
KAFKA_BROKERS=kafka1.prod.com:9092,kafka2.prod.com:9092,kafka3.prod.com:9092
```

**Replication Factor**: Set to 3 for production topics
```javascript
{ topic: 'payment.completed', numPartitions: 3, replicationFactor: 3 }
```

### 2. Dead Letter Queue (DLQ)

For events that fail processing after retries:
```javascript
const dlqTopic = 'payment.dlq';

try {
  await processEvent(event);
} catch (error) {
  // After max retries, send to DLQ
  await producer.send({
    topic: dlqTopic,
    messages: [{
      value: JSON.stringify({ event, error: error.message })
    }]
  });
}
```

### 3. Monitoring & Observability

**Metrics to Track**:
- SAGA success/failure rate
- Compensation execution rate
- Event processing latency
- Kafka consumer lag
- Payment completion time

**Tools**:
- Prometheus + Grafana for metrics
- Jaeger for distributed tracing
- ELK Stack for log aggregation

### 4. Testing Strategy

**Unit Tests**: Test SAGA logic in isolation
**Integration Tests**: Test with real Kafka (testcontainers)
**End-to-End Tests**: Full payment flow with Order/Product services

---

## Troubleshooting

### Issue: Kafka connection timeout

**Cause**: Kafka broker not running or wrong KAFKA_BROKERS value

**Solution**:
```bash
# Check Kafka is running
docker ps | grep kafka

# Verify broker address
nc -zv localhost 9092

# Check logs
docker logs <kafka_container_id>
```

### Issue: Events not being consumed

**Cause**: Consumer not subscribed or partition assignment issue

**Solution**:
```bash
# Check consumer group
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group payment-service-group \
  --describe

# Reset consumer offset (development only)
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group payment-service-group \
  --reset-offsets --to-earliest --execute --all-topics
```

### Issue: Payment stuck in PENDING

**Cause**: Stripe webhook not reaching server or SAGA stuck

**Solution**:
1. Check Stripe webhook logs in dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check payment SAGA state in database:
   ```javascript
   db.payments.findOne({ _id: ObjectId("...") }, { metadata: 1 })
   ```

---

## Summary

✅ **Implemented**:
- Kafka configuration with producer and consumer
- Event-driven architecture with standardized event schemas
- SAGA orchestrator with automatic rollback
- Compensating transactions for distributed rollback
- Payment controller integrated with SAGA
- Health check with Kafka status
- Graceful shutdown with Kafka disconnect

✅ **Ready for**:
- Order service to consume `payment.initiated`, `payment.completed`, `payment.failed`
- Product service to consume `payment.completed`, `payment.failed` for inventory management
- Email service to consume `payment.completed` for customer notifications

🎯 **Next Steps**:
1. Deploy Kafka cluster (dev/staging/prod environments)
2. Implement DLQ for failed events
3. Add distributed tracing with correlation IDs
4. Set up monitoring dashboards
5. Implement Order and Product service event handlers

---

## References

- **SAGA Pattern**: [Microsoft Docs - SAGA Pattern](https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
- **KafkaJS Documentation**: [https://kafka.js.org](https://kafka.js.org)
- **Stripe Webhooks**: [https://stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
- **Event-Driven Architecture**: [Martin Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
