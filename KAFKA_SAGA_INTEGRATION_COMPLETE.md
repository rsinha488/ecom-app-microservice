# ✅ Kafka & SAGA Pattern - Complete Integration Guide

## Overview

Successfully integrated **Kafka event-driven architecture** with **SAGA pattern** across Payment, Order, and Product microservices for distributed transaction management.

---

## 🎯 What Was Implemented

### **Payment Service** (services/payment/)
✅ Kafka Producer - Publishes payment events
✅ Kafka Consumer - Consumes order events
✅ SAGA Orchestrator - Manages distributed transactions
✅ Compensating Transactions - Automatic rollback on failure
✅ Event Definitions - Standardized event schemas

### **Order Service** (services/orders/)
✅ Kafka Consumer - Listens to payment events
✅ Order Status Updates - Based on payment lifecycle
✅ Compensating Transactions - Cancels orders on payment failure
✅ Kafka Producer - Already existed, publishes order events

### **Product Service** (services/products/)
✅ Kafka Consumer - Listens to payment and order events
✅ Stock Reservation - Reserves inventory on payment initiation
✅ Stock Release - Releases inventory on payment failure
✅ Stock Confirmation - Confirms deduction on payment success

---

## 📂 Files Created/Modified

### **Payment Service** (5 new files)
```
services/payment/
├── config/kafka.js                    ✨ NEW - Kafka configuration
├── events/paymentEvents.js            ✨ NEW - Event definitions
├── services/kafkaProducer.js          ✨ NEW - Event publisher
├── services/kafkaConsumer.js          ✨ NEW - Event consumer
├── saga/paymentSaga.js                ✨ NEW - SAGA orchestrator
├── controllers/paymentController.js   📝 UPDATED - SAGA integration
├── server.js                          📝 UPDATED - Kafka initialization
└── .env.local                         📝 UPDATED - Kafka config
```

### **Order Service** (1 new file, 1 updated)
```
services/orders/
├── services/kafkaConsumer.js          ✨ NEW - Payment event consumer
├── server.js                          📝 UPDATED - Consumer initialization
└── .env.local                         ✅ Already configured
```

### **Product Service** (1 updated)
```
services/products/
├── services/kafkaConsumer.js          📝 UPDATED - Payment event handlers
└── .env.local                         ✅ Already configured
```

---

## 🔄 Event Flow Architecture

### **Successful Payment Flow**

```
┌─────────────────┐
│   User Action   │
│ Creates Payment │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│             PAYMENT SERVICE (SAGA START)            │
├─────────────────────────────────────────────────────┤
│ 1. executePaymentSaga()                             │
│ 2. Creates payment in DB (status: PENDING)          │
│ 3. Registers compensation: "cancel payment"         │
│ 4. Publishes: payment.initiated                     │
└────────┬─────────────────────────┬──────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────────┐  ┌───────────────────────┐
│   ORDER SERVICE      │  │  PRODUCT SERVICE      │
├──────────────────────┤  ├───────────────────────┤
│ Consumes:            │  │ Consumes:             │
│ payment.initiated    │  │ payment.initiated     │
│                      │  │                       │
│ Actions:             │  │ Actions:              │
│ • Update order       │  │ • Reserve stock for   │
│   status: PROCESSING │  │   order items         │
│ • Update payment     │  │                       │
│   status: PENDING    │  │ Result:               │
│                      │  │ • Stock reserved      │
│ Publishes:           │  │ • Inventory updated   │
│ order.updated        │  │                       │
└──────────────────────┘  └───────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│            STRIPE PAYMENT GATEWAY                   │
├─────────────────────────────────────────────────────┤
│ User completes payment on Stripe checkout           │
│ Stripe webhook: payment_intent.succeeded            │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│          PAYMENT SERVICE (WEBHOOK HANDLER)          │
├─────────────────────────────────────────────────────┤
│ 1. Updates payment status: COMPLETED                │
│ 2. handlePaymentCompletion() called                 │
│ 3. Publishes: payment.completed                     │
└────────┬─────────────────────────┬──────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────────┐  ┌───────────────────────┐
│   ORDER SERVICE      │  │  PRODUCT SERVICE      │
├──────────────────────┤  ├───────────────────────┤
│ Consumes:            │  │ Consumes:             │
│ payment.completed    │  │ payment.completed     │
│                      │  │                       │
│ Actions:             │  │ Actions:              │
│ • Confirm order      │  │ • Confirm stock       │
│ • Update payment     │  │   deduction           │
│   status: PAID       │  │ • Stock already       │
│                      │  │   reserved, no change │
│ Publishes:           │  │                       │
│ order.confirmed      │  │ Result:               │
│                      │  │ • Stock confirmed     │
└──────────────────────┘  └───────────────────────┘
         │
         ▼
    ✅ SAGA COMPLETED
    • Payment confirmed
    • Order confirmed
    • Inventory deducted
```

---

### **Failed Payment Flow (with Rollback)**

```
┌─────────────────┐
│   User Action   │
│ Creates Payment │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│             PAYMENT SERVICE (SAGA START)            │
├─────────────────────────────────────────────────────┤
│ 1. Creates payment (status: PENDING)                │
│ 2. Publishes: payment.initiated                     │
└────────┬─────────────────────────┬──────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────────┐  ┌───────────────────────┐
│   ORDER SERVICE      │  │  PRODUCT SERVICE      │
│ Updates order        │  │ Reserves stock        │
│ status: PROCESSING   │  │                       │
└──────────────────────┘  └───────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│            STRIPE PAYMENT GATEWAY                   │
├─────────────────────────────────────────────────────┤
│ Payment fails (card declined, insufficient funds)    │
│ Stripe webhook: payment_intent.payment_failed       │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│      PAYMENT SERVICE (SAGA ROLLBACK TRIGGER)        │
├─────────────────────────────────────────────────────┤
│ 1. Updates payment status: FAILED                   │
│ 2. handlePaymentFailure() called                    │
│ 3. Publishes: payment.failed                        │
│ 4. Publishes: saga.payment.compensate               │
└────────┬─────────────────────────┬──────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────────┐  ┌───────────────────────┐
│   ORDER SERVICE      │  │  PRODUCT SERVICE      │
│   (COMPENSATION)     │  │  (COMPENSATION)       │
├──────────────────────┤  ├───────────────────────┤
│ Consumes:            │  │ Consumes:             │
│ payment.failed       │  │ payment.failed        │
│                      │  │                       │
│ Actions:             │  │ Actions:              │
│ • Cancel order       │  │ • Release reserved    │
│ • Update status:     │  │   stock               │
│   CANCELLED          │  │ • Return inventory    │
│ • Update payment     │  │   to available pool   │
│   status: FAILED     │  │                       │
│                      │  │ Result:               │
│ Publishes:           │  │ • Stock released      │
│ order.cancelled      │  │ • Inventory restored  │
└──────────────────────┘  └───────────────────────┘
         │
         ▼
    ✅ SAGA ROLLED BACK
    • Payment cancelled
    • Order cancelled
    • Inventory released
```

---

## 📋 Event Topics & Handlers

### **Kafka Topics Created**

| Topic | Producer | Consumer(s) | Description |
|-------|----------|-------------|-------------|
| `payment.initiated` | Payment | Order, Product | Payment creation started |
| `payment.completed` | Payment | Order, Product | Payment succeeded |
| `payment.failed` | Payment | Order, Product | Payment failed |
| `payment.cancelled` | Payment | Order, Product | Payment cancelled |
| `payment.refunded` | Payment | Order | Payment refunded |
| `order.created` | Order | Payment | Order created |
| `order.updated` | Order | - | Order status updated |
| `order.confirmed` | Order | - | Order confirmed |
| `order.cancelled` | Order | Product | Order cancelled |
| `saga.payment.compensate` | Payment | Order, Product | Trigger rollback |

---

### **Order Service Event Handlers**

**File**: `services/orders/services/kafkaConsumer.js`

| Event | Handler | Action |
|-------|---------|--------|
| `payment.initiated` | `handlePaymentInitiated()` | Update order status to PROCESSING |
| `payment.completed` | `handlePaymentCompleted()` | Confirm order, update payment status to PAID |
| `payment.failed` | `handlePaymentFailed()` | Cancel order, publish order.cancelled |
| `payment.cancelled` | `handlePaymentCancelled()` | Cancel order if not already cancelled |

**Key Features**:
- ✅ Idempotency - Prevents duplicate event processing
- ✅ Transaction Management - MongoDB sessions for atomicity
- ✅ Event Publishing - Publishes order events back to Kafka

---

### **Product Service Event Handlers**

**File**: `services/products/services/kafkaConsumer.js`

| Event | Handler | Action |
|-------|---------|--------|
| `payment.initiated` | `handlePaymentInitiated()` | Reserve stock for order items |
| `payment.completed` | `handlePaymentCompleted()` | Confirm stock deduction |
| `payment.failed` | `handlePaymentFailed()` | Release reserved stock |
| `order.cancelled` | `handleOrderCancelled()` | Release stock back to inventory |

**Key Features**:
- ✅ Stock Reservation - Using existing `reserveStock()` function
- ✅ Stock Release - Using existing `releaseStock()` function
- ✅ Idempotency - Prevents duplicate stock operations

---

## 🚀 How to Run

### **1. Start Kafka (Required)**

**Option A: Docker (Recommended)**
```bash
# Create docker-compose-kafka.yml
docker-compose -f docker-compose-kafka.yml up -d
```

**Option B: Local Kafka**
```bash
# macOS with Homebrew
brew services start zookeeper
brew services start kafka

# Linux with systemd
sudo systemctl start zookeeper
sudo systemctl start kafka
```

**Verify Kafka is Running**:
```bash
# Check Kafka topics
kafka-topics --bootstrap-server localhost:9092 --list

# Expected output: (topics will be auto-created on first message)
payment.initiated
payment.completed
payment.failed
order.confirmed
...
```

---

### **2. Start All Services**

**Terminal 1 - Payment Service**:
```bash
cd services/payment
npm run dev
```

Expected output:
```
Payment service running on port 5005
[Kafka] Connecting to Kafka brokers...
[Kafka] Producer connected successfully
[Kafka] Consumer connected successfully
[Kafka] Created topics: payment.initiated, payment.completed, ...
[Kafka] Kafka initialization complete
[Kafka Consumer] Consumer running
```

**Terminal 2 - Order Service**:
```bash
cd services/orders
npm run dev
```

Expected output:
```
Orders service running on port 3004
🚀 Initializing Kafka producer and consumer...
✅ Kafka producer initialized successfully
[Kafka Consumer] Connected successfully
[Kafka Consumer] Subscribed to payment topics
[Kafka Consumer] Consumer running
```

**Terminal 3 - Product Service**:
```bash
cd services/products
npm run dev
```

Expected output:
```
Products service running on port 3001
🚀 Initializing Kafka consumer for stock management...
✅ Kafka consumer initialized successfully
📨 Subscribed to topics: payment.initiated, payment.completed, ...
```

---

### **3. Test the Integration**

#### **Test 1: Successful Payment (Happy Path)**

**Step 1**: Create a payment
```bash
POST http://localhost:5005/v1/payment/checkout-session
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderId": "67458e9c1234567890abcdef",
  "userId": "67458e9c1234567890fedcba",
  "items": [
    {
      "productId": "prod_12345",
      "productName": "Premium Plan",
      "quantity": 1,
      "price": 99.99
    }
  ],
  "amount": 99.99,
  "currency": "USD",
  "customerEmail": "test@example.com"
}
```

**Expected Console Logs**:

**Payment Service**:
```
[Payment Controller] Executing payment SAGA: { correlationId: 'saga-...', orderId: '...', amount: 99.99 }
[SAGA] Starting payment SAGA execution
[SAGA] Step 1: Creating payment record
[SAGA] Payment created: 67458e9c1234567890...
[SAGA] Step 2: Publishing payment initiated event
[Kafka] Published event to payment.initiated
```

**Order Service**:
```
[Kafka Consumer] Received event from payment.initiated
[Kafka Consumer] Handling payment initiated for order: 67458e9c1234567890abcdef
[Kafka Consumer] Order status updated to PROCESSING
📤 Published to Kafka topic 'order.updated'
```

**Product Service**:
```
[Kafka Consumer] Received event from payment.initiated
🔒 Reserving stock for payment initiated - Order: 67458e9c1234567890abcdef
✅ Stock reserved for order: { reserved: 1 }
```

**Step 2**: Simulate Stripe success webhook
```bash
POST http://localhost:5005/v1/payment/webhook
Stripe-Signature: <signature>
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

**Expected Console Logs**:

**Payment Service**:
```
[Webhook] Payment completed, triggering SAGA completion
[SAGA] Handling payment completion in SAGA
[Kafka] Published event to payment.completed
```

**Order Service**:
```
[Kafka Consumer] Received event from payment.completed
[Kafka Consumer] Order confirmed, payment status updated to PAID
📤 Published to Kafka topic 'order.confirmed'
```

**Product Service**:
```
[Kafka Consumer] Received event from payment.completed
✅ Confirming stock deduction for completed payment
✅ Stock confirmed for order
```

✅ **Result**: Payment completed, order confirmed, stock deducted

---

#### **Test 2: Failed Payment (Rollback)**

**Step 1**: Create a payment (same as above)

**Step 2**: Simulate Stripe failure webhook
```bash
POST http://localhost:5005/v1/payment/webhook
Stripe-Signature: <signature>
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

**Expected Console Logs**:

**Payment Service**:
```
[Webhook] Payment failed, triggering SAGA rollback
[SAGA] Handling payment failure in SAGA
[Kafka] Published event to payment.failed
[Kafka] Published event to saga.payment.compensate
```

**Order Service**:
```
[Kafka Consumer] Received event from payment.failed
[Kafka Consumer] Order cancelled due to payment failure
📤 Published to Kafka topic 'order.cancelled'
```

**Product Service**:
```
[Kafka Consumer] Received event from payment.failed
🔓 Releasing stock for failed payment
✅ Stock released for order: { released: 1 }
```

✅ **Result**: Payment failed, order cancelled, stock released (rollback successful)

---

## 📊 Monitoring & Debugging

### **View Kafka Topics**
```bash
kafka-topics --bootstrap-server localhost:9092 --list
```

### **Consume Events (Debug)**
```bash
# Listen to all payment events
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic payment.initiated \
  --from-beginning \
  --property print.key=true
```

### **Check Consumer Groups**
```bash
kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Expected output:
# order-service-group
# products-service-group (or products-service-consumer-group)
# payment-service-group
```

### **Check Consumer Lag**
```bash
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-service-group \
  --describe
```

### **Health Checks**
```bash
# Payment service (includes Kafka status)
curl http://localhost:5005/health

# Order service
curl http://localhost:3004/health

# Product service
curl http://localhost:3001/health
```

---

## 🔍 Troubleshooting

### **Issue: Kafka connection failed**

**Symptom**:
```
❌ Failed to initialize Kafka: Connection to Kafka failed
⚠️  Payment service will continue without event-driven features
```

**Solution**:
1. Check Kafka is running:
   ```bash
   nc -zv localhost 9092
   ```
2. Verify `KAFKA_BROKERS` in `.env.local`:
   ```bash
   KAFKA_BROKERS=localhost:9092
   ```
3. Check Docker containers (if using Docker):
   ```bash
   docker ps | grep kafka
   ```

---

### **Issue: Events not being consumed**

**Symptom**: Payment created but order status doesn't update

**Solution**:
1. Check consumer logs for errors
2. Verify consumer is subscribed:
   ```bash
   kafka-consumer-groups --bootstrap-server localhost:9092 \
     --group order-service-group \
     --describe
   ```
3. Reset consumer offset (development only):
   ```bash
   kafka-consumer-groups --bootstrap-server localhost:9092 \
     --group order-service-group \
     --reset-offsets --to-earliest --execute --all-topics
   ```

---

### **Issue: Stock not reserved**

**Symptom**: Payment initiated but product stock unchanged

**Solution**:
1. Check Product service consumer logs
2. Verify `stockManager.js` functions are working:
   ```bash
   # Test reserveStock function
   ```
3. Check product exists in database with sufficient stock

---

## 📈 Production Considerations

### **1. Kafka Cluster Setup**

**Minimum 3 Brokers** for high availability:
```bash
KAFKA_BROKERS=kafka1.prod.com:9092,kafka2.prod.com:9092,kafka3.prod.com:9092
```

**Replication Factor**: Update topic creation to use replication factor 3:
```javascript
{ topic: 'payment.completed', numPartitions: 3, replicationFactor: 3 }
```

---

### **2. Dead Letter Queue (DLQ)**

Implement DLQ for events that fail processing after retries:
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

---

### **3. Monitoring**

**Metrics to Track**:
- SAGA success/failure rate
- Event processing latency
- Kafka consumer lag
- Compensation execution rate

**Tools**:
- Prometheus + Grafana for metrics
- Jaeger for distributed tracing
- ELK Stack for log aggregation

---

## ✅ Summary

### **Implementation Complete**

✅ **Payment Service**: SAGA orchestrator with Kafka producer/consumer
✅ **Order Service**: Payment event consumer with order status updates
✅ **Product Service**: Payment event consumer with stock management
✅ **Event-Driven Architecture**: 10+ Kafka topics configured
✅ **Compensating Transactions**: Automatic rollback on failure
✅ **Idempotency**: Duplicate event prevention
✅ **Transaction Management**: MongoDB sessions for atomicity
✅ **Health Checks**: Kafka status monitoring
✅ **Graceful Shutdown**: Proper Kafka disconnect
✅ **Documentation**: Comprehensive guides created

### **Next Steps**

1. ✅ Start Kafka broker
2. ✅ Start all 3 services
3. ✅ Test successful payment flow
4. ✅ Test failed payment rollback
5. ⏭️ Deploy to staging environment
6. ⏭️ Configure production Kafka cluster
7. ⏭️ Implement monitoring dashboards
8. ⏭️ Add DLQ for failed events

---

## 📚 Documentation

- **Payment Service SAGA Guide**: `services/payment/SAGA_IMPLEMENTATION_GUIDE.md`
- **Payment Service Summary**: `services/payment/IMPLEMENTATION_SUMMARY.md`
- **This Integration Guide**: `KAFKA_SAGA_INTEGRATION_COMPLETE.md`

---

**🎉 Congratulations! Your microservices now have distributed transaction management with automatic rollback! 🎉**
