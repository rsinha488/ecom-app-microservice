# Kafka Quick Start - Order & Inventory Management

## 🚀 Start Kafka in 3 Steps

### Step 1: Start Kafka Infrastructure

```bash
./start-kafka.sh
```

Or manually:
```bash
docker-compose -f docker-compose.kafka.yml up -d
```

**Services Started:**
- ✅ Kafka: `localhost:9092`
- ✅ Zookeeper: `localhost:2181`
- ✅ Kafka UI: `http://localhost:8080`

### Step 2: Start Orders Service

```bash
cd services/orders
npm run dev
```

**Expected Output:**
```
Orders service running on port 3004
🚀 Initializing Kafka producer...
✅ Kafka producer connected successfully
✅ Kafka producer initialized successfully
```

### Step 3: Start Products Service

```bash
cd services/products
npm run dev
```

**Expected Output:**
```
Products service running on port 3001
🚀 Initializing Kafka consumer for stock management...
✅ Kafka consumer connected successfully
✅ Subscribed to Kafka topic: inventory.reserve
✅ Subscribed to Kafka topic: inventory.release
```

---

## ✅ Verify It's Working

### Test 1: Create an Order

```bash
# Replace PRODUCT_ID with actual product ID from your database
curl -X POST http://localhost:3004/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "items": [{
      "productId": "PRODUCT_ID",
      "productName": "Test Product",
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
  }'
```

**Check Logs:**

**Orders Service:**
```
✅ Order created
📤 Published to Kafka topic 'inventory.reserve'
```

**Products Service:**
```
📥 Received from Kafka topic 'inventory.reserve'
🔒 Processing stock reservation for order ORD-xxx
✅ Reserved 2 units of Test Product (new stock: 48)
```

### Test 2: Check Kafka UI

Visit `http://localhost:8080`:
1. Click **Topics**
2. View `inventory.reserve` topic
3. See your message

---

## 🔍 What's Happening?

### Order Created Flow

```
1. POST /api/v1/orders
   ↓
2. Orders Service saves to DB
   ↓
3. WebSocket: order:created → Frontend (real-time notification)
   ↓
4. Kafka: inventory.reserve → Products Service
   ↓
5. Products Service decreases stock atomically
   ↓
6. Stock updated in products_db
```

### Order Cancelled Flow

```
1. PATCH /api/v1/orders/:id/status {"status": 5}
   ↓
2. Orders Service updates status to CANCELLED
   ↓
3. WebSocket: order:cancelled → Frontend
   ↓
4. Kafka: inventory.release → Products Service
   ↓
5. Products Service increases stock atomically
   ↓
6. Stock restored in products_db
```

---

## 📊 Monitor Events

### View All Kafka Topics

```bash
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list
```

**Expected Output:**
```
inventory.release
inventory.reserve
order.cancelled
order.completed
order.created
order.status.changed
```

### View Messages in Topic

```bash
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic inventory.reserve \
  --from-beginning
```

### Check Consumer Lag

```bash
docker exec -it kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group products-service-group
```

---

## 🛑 Stop Services

```bash
# Stop Kafka
docker-compose -f docker-compose.kafka.yml down

# Stop services with Ctrl+C in their terminals
```

---

## 🐛 Troubleshooting

### Kafka Not Starting

```bash
# Check Docker
docker ps

# View Kafka logs
docker logs kafka -f

# Restart Kafka
docker-compose -f docker-compose.kafka.yml restart
```

### Services Not Connecting

**Check environment variables:**

`services/orders/.env.local`:
```env
KAFKA_BROKERS=localhost:9092
```

`services/products/.env.local`:
```env
KAFKA_BROKERS=localhost:9092
```

### Stock Not Updating

1. **Check Products service is running**
2. **Check Kafka logs**: `docker logs kafka`
3. **Check consumer group**:
   ```bash
   docker exec -it kafka kafka-consumer-groups \
     --bootstrap-server localhost:9092 \
     --describe \
     --group products-service-group
   ```

---

## 📖 Full Documentation

For complete documentation, see:
- **[KAFKA_IMPLEMENTATION_GUIDE.md](./KAFKA_IMPLEMENTATION_GUIDE.md)** - Complete guide
- **[ORDER_EVENT_ARCHITECTURE_ANALYSIS.md](./ORDER_EVENT_ARCHITECTURE_ANALYSIS.md)** - Architecture analysis

---

## 🎯 Key Features

✅ **Dual Communication:**
- WebSocket for real-time UI updates
- Kafka for reliable inter-service messaging

✅ **Atomic Operations:**
- MongoDB atomic updates prevent race conditions
- Stock never goes negative

✅ **Automatic Rollback:**
- Failed reservations trigger immediate restoration
- All-or-nothing stock updates

✅ **Production-Ready:**
- Error handling and retry logic
- Graceful shutdown
- Manual offset commits
- Idempotent operations

✅ **Scalable:**
- Kafka consumer groups
- Multiple service instances
- Horizontal scaling ready

---

## 📝 API Endpoints

### Orders Service (`:3004`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create order → stock reserved |
| PATCH | `/api/v1/orders/:id/status` | Update status → stock released if cancelled |
| GET | `/api/v1/orders` | Get all orders |
| GET | `/api/v1/orders/:id` | Get single order |

### Products Service (`:3001`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | Get all products with stock |
| GET | `/api/v1/products/:id` | Get single product |
| POST | `/api/v1/products/:id/reserve` | Reserve stock (Kafka internal) |
| POST | `/api/v1/products/:id/release` | Release stock (Kafka internal) |

---

## 🎓 Architecture

```
┌───────────┐
│  Frontend │
└─────┬─────┘
      │ HTTP + WebSocket
      ↓
┌───────────┐    Kafka Topics:    ┌───────────┐
│  Orders   │ → inventory.reserve │ Products  │
│  Service  │ → inventory.release │  Service  │
│           │ → order.created     │           │
│   :3004   │ → order.cancelled   │   :3001   │
└───────────┘                     └───────────┘
      │                                  │
      ↓                                  ↓
┌───────────┐                     ┌───────────┐
│ orders_db │                     │products_db│
│ (MongoDB) │                     │ (MongoDB) │
└───────────┘                     └───────────┘
```

---

**Created:** 2025-11-20
**Version:** 1.0.0
