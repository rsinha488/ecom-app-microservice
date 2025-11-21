# Kafka Implementation Guide - Order & Inventory Management

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Event Flow](#event-flow)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Production Considerations](#production-considerations)
- [Troubleshooting](#troubleshooting)

---

## Overview

This implementation uses **Apache Kafka** for event-driven communication between the **Orders service** and **Products service** to manage inventory in real-time. When orders are created or cancelled, Kafka events trigger automatic stock reservation and release in the Products service.

### Key Features

✅ **Dual Communication**: WebSocket (real-time UI) + Kafka (inter-service)
✅ **Atomic Stock Operations**: Prevents race conditions with MongoDB atomic updates
✅ **Automatic Rollback**: Failed reservations trigger immediate stock restoration
✅ **Idempotent Operations**: Safe message reprocessing
✅ **Graceful Degradation**: Services continue without Kafka if unavailable
✅ **Production-Ready**: Error handling, retry logic, graceful shutdown

---

## Architecture

### System Diagram

```
┌─────────────────┐
│  Frontend/User  │
└────────┬────────┘
         │ HTTP + WebSocket
         ↓
┌─────────────────┐      Kafka Topics:       ┌─────────────────┐
│  Orders Service │  →   • inventory.reserve │ Products Service│
│                 │  →   • inventory.release │                 │
│  - Create order │  →   • order.created     │ - Reserve stock │
│  - Cancel order │  →   • order.cancelled   │ - Release stock │
│  - Update status│      • order.completed   │ - Check stock   │
└─────────────────┘                          └─────────────────┘
         │                                            │
         ↓                                            ↓
┌─────────────────┐                          ┌─────────────────┐
│  orders_db      │                          │  products_db    │
│  (MongoDB)      │                          │  (MongoDB)      │
└─────────────────┘                          └─────────────────┘
         ↑
         │ WebSocket (real-time notifications)
         ↓
┌─────────────────┐
│  Connected      │
│  Clients        │
└─────────────────┘
```

### Event Flow

#### 1. Order Created
```
1. User creates order → POST /api/v1/orders
2. Orders service saves order to DB
3. Orders service emits:
   - WebSocket event (order:created) → Frontend
   - Kafka event (order.created) → Analytics
   - Kafka event (inventory.reserve) → Products service
4. Products service receives inventory.reserve
5. Products service atomically decreases stock
6. Products service commits Kafka offset (success)
```

#### 2. Order Cancelled
```
1. Admin cancels order → PATCH /api/v1/orders/:id/status
2. Orders service updates status to CANCELLED
3. Orders service emits:
   - WebSocket event (order:cancelled) → Frontend
   - Kafka event (order.cancelled) → Analytics
   - Kafka event (inventory.release) → Products service
4. Products service receives inventory.release
5. Products service atomically increases stock
6. Products service commits Kafka offset (success)
```

### Kafka Topics

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `order.created` | Orders | Analytics (future) | Order creation events |
| `order.status.changed` | Orders | Analytics (future) | Status transition events |
| `order.cancelled` | Orders | Analytics (future) | Cancellation events |
| `order.completed` | Orders | Analytics (future) | Completion/delivery events |
| `inventory.reserve` | Orders | Products | Stock reservation requests |
| `inventory.release` | Orders | Products | Stock restoration requests |

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB running on localhost:27017
- Docker (for Kafka) or local Kafka installation

### 1. Start Kafka with Docker

```bash
# From project root
cd /home/ruchisinha/Desktop/LaunchpadMERN

# Start Kafka, Zookeeper, and Kafka UI
docker-compose -f docker-compose.kafka.yml up -d

# Check status
docker-compose -f docker-compose.kafka.yml ps

# View logs
docker-compose -f docker-compose.kafka.yml logs -f kafka
```

**Services Started:**
- Kafka: `localhost:9092`
- Zookeeper: `localhost:2181`
- Kafka UI: `http://localhost:8080`

### 2. Install Dependencies

Already installed via npm:

```bash
# Orders service
cd services/orders
npm install  # kafkajs already installed

# Products service
cd services/products
npm install  # kafkajs already installed
```

### 3. Configure Environment Variables

Already configured in `.env.local` files:

**Orders Service** (`services/orders/.env.local`):
```env
KAFKA_BROKERS=localhost:9092
FRONTEND_URL=http://localhost:3006
```

**Products Service** (`services/products/.env.local`):
```env
KAFKA_BROKERS=localhost:9092
```

### 4. Start Services

```bash
# Terminal 1: Orders service
cd services/orders
npm run dev

# Terminal 2: Products service
cd services/products
npm run dev
```

**Expected Console Output:**

**Orders Service:**
```
Orders service running on port 3004
Environment: development
API Version: v1
WebSocket server ready on port 3004
🚀 Initializing Kafka producer...
🔧 Kafka admin connected
✅ All required Kafka topics already exist
✅ Kafka producer connected successfully
✅ Kafka producer initialized successfully
```

**Products Service:**
```
Products service running on port 3001
Environment: development
API Version: v1
🚀 Initializing Kafka consumer for stock management...
✅ Kafka consumer connected successfully
✅ Subscribed to Kafka topic: inventory.reserve
✅ Subscribed to Kafka topic: inventory.release
✅ Kafka consumer started processing messages
✅ Kafka consumer initialized successfully
```

---

## Event Flow

### Complete Order Creation Flow

```bash
# 1. Create an order
curl -X POST http://localhost:3004/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "items": [
      {
        "productId": "PRODUCT_ID_HERE",
        "productName": "Sample Product",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "totalAmount": 59.98,
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

**What Happens:**

1. **Orders Service** (immediate):
   ```
   ✅ Order created in DB
   ✅ WebSocket emitted: order:created
   ✅ HTTP 201 response sent to client
   ```

2. **Kafka** (async, within milliseconds):
   ```
   📤 Published to Kafka topic 'order.created'
   📤 Published to Kafka topic 'inventory.reserve'
   ```

3. **Products Service** (async):
   ```
   📥 Received from Kafka topic 'inventory.reserve'
   🔒 Processing stock reservation for order ORD-123
   ✅ Reserved 2 units of Sample Product (new stock: 48)
   ✅ Processed and committed message at offset 15
   ```

### Cancel Order Flow

```bash
# 2. Cancel the order
curl -X PATCH http://localhost:3004/api/v1/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": 5
  }'
```

**What Happens:**

1. **Orders Service**:
   ```
   ✅ Order status updated to CANCELLED
   ✅ WebSocket emitted: order:cancelled
   ✅ HTTP 200 response sent
   ```

2. **Kafka**:
   ```
   📤 Published to Kafka topic 'order.cancelled'
   📤 Published to Kafka topic 'inventory.release'
   ```

3. **Products Service**:
   ```
   📥 Received from Kafka topic 'inventory.release'
   🔓 Processing stock release for order ORD-123 (reason: ORDER_CANCELLED)
   ✅ Released 2 units of Sample Product (new stock: 50)
   ✅ Processed and committed message at offset 16
   ```

---

## API Endpoints

### Orders Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create order (triggers stock reservation) |
| PATCH | `/api/v1/orders/:id/status` | Update status (cancellation triggers stock release) |
| GET | `/api/v1/orders` | Get all orders |
| GET | `/api/v1/orders/:id` | Get order by ID |

### Products Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/products/:id/reserve` | Reserve stock (internal/Kafka) |
| POST | `/api/v1/products/:id/release` | Release stock (internal/Kafka) |
| GET | `/api/v1/products` | Get all products |
| GET | `/api/v1/products/:id` | Get product by ID |

---

## Testing

### 1. Manual Testing

#### Test Stock Reservation

```bash
# 1. Get a product ID and check stock
curl http://localhost:3001/api/v1/products | jq '.data.products[0] | {_id, name, stock}'

# Expected:
# {
#   "_id": "673c5f5d2e8a1b2c3d4e5f67",
#   "name": "Sample Product",
#   "stock": 50
# }

# 2. Create an order for 2 units
curl -X POST http://localhost:3004/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "items": [{
      "productId": "673c5f5d2e8a1b2c3d4e5f67",
      "productName": "Sample Product",
      "quantity": 2,
      "price": 29.99
    }],
    "totalAmount": 59.98,
    "shippingAddress": {
      "street": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zipCode": "12345",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }' | jq '.data.order.orderNumber'

# Expected: "ORD-1732095234567"

# 3. Wait 1-2 seconds, then check stock again
curl http://localhost:3001/api/v1/products/673c5f5d2e8a1b2c3d4e5f67 | jq '.data.product.stock'

# Expected: 48 (decreased by 2)
```

#### Test Stock Release

```bash
# 1. Cancel the order
curl -X PATCH http://localhost:3004/api/v1/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": 5}' | jq '.data.newStatusLabel'

# Expected: "Cancelled"

# 2. Wait 1-2 seconds, check stock
curl http://localhost:3001/api/v1/products/673c5f5d2e8a1b2c3d4e5f67 | jq '.data.product.stock'

# Expected: 50 (restored)
```

### 2. Test Insufficient Stock

```bash
# Create order with quantity > available stock
curl -X POST http://localhost:3004/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "items": [{
      "productId": "673c5f5d2e8a1b2c3d4e5f67",
      "productName": "Sample Product",
      "quantity": 9999,
      "price": 29.99
    }],
    "totalAmount": 299999,
    "shippingAddress": {"street": "123 Test", "city": "Test", "state": "TS", "zipCode": "12345", "country": "USA"},
    "paymentMethod": "credit_card"
  }'

# Order will be created (201) but Products service will log:
# ❌ Failed to reserve stock: insufficient stock
# Stock will NOT be decreased
```

### 3. WebSocket Testing

Use browser console or WebSocket client:

```javascript
const socket = io('http://localhost:3004', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('order:created', (data) => {
  console.log('🔔 Order created:', data);
});

socket.on('order:cancelled', (data) => {
  console.log('🔔 Order cancelled:', data);
});
```

---

## Monitoring

### Kafka UI

Access at `http://localhost:8080`:

- **Topics**: View all topics, partitions, and messages
- **Consumers**: Monitor consumer lag and processing
- **Messages**: Inspect message content

### View Kafka Topics

```bash
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list

# Expected output:
# inventory.release
# inventory.reserve
# order.cancelled
# order.completed
# order.created
# order.status.changed
```

### View Messages in Topic

```bash
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic inventory.reserve \
  --from-beginning \
  --max-messages 10
```

### Monitor Consumer Lag

```bash
docker exec -it kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group products-service-group
```

---

## Production Considerations

### 1. Multiple Kafka Brokers

Update `.env.local`:

```env
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
```

Update `docker-compose.kafka.yml` to add more brokers and set replication factor to 3.

### 2. Security

**Add SASL/SSL authentication:**

```javascript
// services/orders/config/kafka.js
const kafka = new Kafka({
  clientId: 'orders-service',
  brokers: process.env.KAFKA_BROKERS.split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD
  }
});
```

### 3. Error Handling

**Dead Letter Queue (DLQ):**

Add to `services/products/services/kafkaConsumer.js`:

```javascript
// After 3 failed attempts, send to DLQ
const MAX_RETRIES = 3;
const retryCount = parseInt(message.headers['retry-count']?.toString() || '0');

if (retryCount >= MAX_RETRIES) {
  await publishToDLQ(topic, message);
  return; // Don't retry
}
```

### 4. Monitoring

**Add Prometheus metrics:**

```bash
npm install prom-client
```

```javascript
const prometheus = require('prom-client');

const orderEventsPublished = new prometheus.Counter({
  name: 'kafka_order_events_published_total',
  help: 'Total order events published to Kafka'
});

// Increment on publish
orderEventsPublished.inc();
```

### 5. Scaling

**Horizontal Scaling:**

```bash
# Run multiple instances of Products service
docker-compose up --scale products-service=3
```

Kafka consumer group automatically distributes partitions across instances.

---

## Troubleshooting

### Kafka Connection Failed

**Symptom:**
```
❌ Failed to initialize Kafka: Connection timeout
```

**Solution:**
```bash
# Check if Kafka is running
docker ps | grep kafka

# Restart Kafka
docker-compose -f docker-compose.kafka.yml restart kafka

# Check Kafka logs
docker logs kafka -f
```

### Messages Not Being Consumed

**Symptom:**
Products service doesn't receive events

**Solution:**
```bash
# Check consumer group
docker exec -it kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group products-service-group

# Check if consumer is connected
docker logs products-service-container

# Restart Products service
cd services/products && npm run dev
```

### Stock Not Updating

**Symptom:**
Order created but stock unchanged

**Check:**

1. **Products service logs:**
   ```
   Look for: "📥 Received from Kafka topic 'inventory.reserve'"
   ```

2. **Kafka topic has messages:**
   ```bash
   docker exec -it kafka kafka-console-consumer \
     --bootstrap-server localhost:9092 \
     --topic inventory.reserve \
     --from-beginning --max-messages 1
   ```

3. **MongoDB connection:**
   ```bash
   mongosh mongodb://localhost:27017/products_db
   db.products.findOne()
   ```

### WebSocket Not Working

**Symptom:**
Real-time notifications not received

**Solution:**
WebSocket is independent of Kafka. Check:

```javascript
// Browser console
const socket = io('http://localhost:3004', {
  auth: { token: 'valid-jwt-token' }
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
});
```

---

## File Structure

```
services/
├── orders/
│   ├── config/
│   │   ├── kafka.js              # Kafka producer config
│   │   └── socket.js             # WebSocket config (unchanged)
│   ├── services/
│   │   └── kafkaProducer.js      # Publish events to Kafka
│   ├── controllers/
│   │   └── orderController.js    # Updated to emit Kafka events
│   ├── .env.local                # KAFKA_BROKERS added
│   └── server.js                 # Initialize Kafka producer
│
├── products/
│   ├── config/
│   │   └── kafka.js              # Kafka consumer config
│   ├── services/
│   │   ├── kafkaConsumer.js      # Consume and route events
│   │   └── stockManager.js       # Stock reservation/release logic
│   ├── controllers/
│   │   └── productController.js  # reserveStock/releaseStock endpoints
│   ├── routes/
│   │   └── v1/productRoutes.js   # Stock management routes
│   ├── .env.local                # KAFKA_BROKERS added
│   └── server.js                 # Initialize Kafka consumer
│
└── docker-compose.kafka.yml      # Kafka, Zookeeper, Kafka UI
```

---

## Summary

✅ **Kafka integrated** for inter-service communication
✅ **WebSocket preserved** for real-time UI updates
✅ **Atomic stock operations** prevent race conditions
✅ **Production-ready** error handling and graceful shutdown
✅ **Easy to test** with provided examples
✅ **Scalable** with consumer groups and partitions

**Both systems work together:**
- **WebSocket**: Instant notifications to users
- **Kafka**: Reliable inter-service communication

---

## Next Steps

1. ✅ Start Kafka: `docker-compose -f docker-compose.kafka.yml up -d`
2. ✅ Start services: Orders and Products
3. ✅ Test order creation and cancellation
4. ✅ Monitor Kafka UI at http://localhost:8080
5. 🔜 Add analytics service to consume order events
6. 🔜 Implement email notifications via Kafka events
7. 🔜 Add payment processing events
8. 🔜 Set up Prometheus monitoring

---

**Documentation Date:** 2025-11-20
**Author:** Claude Code
**Version:** 1.0.0
