# Kafka Architecture Diagram - Order & Inventory Management

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LaunchpadMERN Application                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────┐
                              │   Frontend    │
                              │   (Next.js)   │
                              │   Port: 3006  │
                              └───────┬───────┘
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                   HTTP │             │ WebSocket   │ HTTP
                        │             │ (Real-time) │
                        ↓             ↓             ↓
              ┌─────────────────────────────────────────────┐
              │         Orders Service (Port 3004)          │
              │  ┌─────────────────────────────────────┐   │
              │  │   Order Controller                   │   │
              │  │  • createOrder()                     │   │
              │  │  • updateOrderStatus()               │   │
              │  │  • cancelOrder()                     │   │
              │  └──────────┬─────────────┬────────────┘   │
              │             │             │                 │
              │         Emit│             │Emit             │
              │             ↓             ↓                 │
              │  ┌──────────────┐ ┌─────────────────┐     │
              │  │   WebSocket  │ │ Kafka Producer  │     │
              │  │   (Socket.io)│ │ (kafkaProducer) │     │
              │  └──────┬───────┘ └────────┬────────┘     │
              └─────────┼──────────────────┼───────────────┘
                        │                  │
                        │                  │ Publish
                        │                  ↓
                        │         ┌────────────────────┐
                        │         │   Apache Kafka     │
                        │         │   Port: 9092       │
                        │         │                    │
                        │         │  Topics:           │
                        │         │  • order.created   │
                        │         │  • order.cancelled │
                        │         │  • inventory.*     │
                        │         └─────────┬──────────┘
                        │                   │
                        │                   │ Subscribe
                        │                   ↓
                        │         ┌────────────────────┐
                        │         │  Kafka Consumer    │
                        │         │  (kafkaConsumer)   │
                        │         │  Group: products   │
                        │         └─────────┬──────────┘
                        │                   │
                        │                   │ Route
                        │                   ↓
              ┌─────────┼───────────────────────────────────┐
              │         │   Products Service (Port 3001)    │
              │         │   ┌───────────────────────┐       │
              │         │   │   Stock Manager       │       │
              │         │   │  • reserveStock()     │       │
              │         │   │  • releaseStock()     │       │
              │         │   │  • checkAvailability()│       │
              │         │   └───────────┬───────────┘       │
              │         │               │                   │
              │         │               ↓                   │
              │         │   ┌───────────────────────┐      │
              │         │   │  Product Controller   │      │
              │         │   │  • reserveStock()     │      │
              │         │   │  • releaseStock()     │      │
              │         │   │  • getAllProducts()   │      │
              │         │   └───────────┬───────────┘      │
              └─────────┼───────────────┼───────────────────┘
                        │               │
                        │               │
                        ↓               ↓
              ┌──────────────┐  ┌──────────────┐
              │  orders_db   │  │  products_db │
              │  (MongoDB)   │  │  (MongoDB)   │
              │              │  │              │
              │  Collections:│  │  Collections:│
              │  • orders    │  │  • products  │
              └──────────────┘  └──────────────┘
```

---

## Order Creation Event Flow

```
┌─────────┐
│  User   │  1. Creates order with 2 items
└────┬────┘
     │ POST /api/v1/orders
     ↓
┌──────────────────────────────────────────────────┐
│  Orders Service                                   │
│                                                   │
│  Step 1: Save order to MongoDB                   │
│  ┌─────────────────────────────────────┐        │
│  │  Order Document Created:             │        │
│  │  {                                   │        │
│  │    _id: "abc123",                    │        │
│  │    orderNumber: "ORD-1732095234567", │        │
│  │    userId: "user123",                │        │
│  │    items: [                          │        │
│  │      {productId: "prod1", qty: 2}    │        │
│  │    ],                                │        │
│  │    status: 1 (PENDING),              │        │
│  │    totalAmount: 59.98                │        │
│  │  }                                   │        │
│  └─────────────────────────────────────┘        │
│                                                   │
│  Step 2: HTTP 201 Response (Immediate)           │
│  ────────────────────────────────────→           │
│                                                   │
│  Step 3: Emit WebSocket Event (Async)            │
│  ┌─────────────────────────────────────┐        │
│  │  Socket.io Emit:                     │        │
│  │  Event: "order:created"              │        │
│  │  Room: "user:user123"                │        │
│  │  Payload: { order, message }         │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           │ setImmediate()                        │
│           ↓                                       │
│  Step 4: Publish to Kafka (Async)                │
│  ┌─────────────────────────────────────┐        │
│  │  Topic: "inventory.reserve"          │        │
│  │  Key: "abc123" (order ID)            │        │
│  │  Value: {                            │        │
│  │    eventType: "STOCK_RESERVE_REQUEST"│        │
│  │    orderId: "abc123",                │        │
│  │    items: [                          │        │
│  │      {productId: "prod1", qty: 2}    │        │
│  │    ]                                 │        │
│  │  }                                   │        │
│  └─────────────────────────────────────┘        │
└───────────────────────┬───────────────────────────┘
                        │
                        ↓
          ┌─────────────────────────┐
          │   Kafka Broker          │
          │   Topic: inventory.*    │
          │   Partition: 0          │
          │   Offset: 42            │
          └──────────┬──────────────┘
                     │
                     │ Poll every 5 seconds
                     ↓
┌──────────────────────────────────────────────────┐
│  Products Service - Kafka Consumer                │
│                                                   │
│  Step 5: Receive Message                         │
│  ┌─────────────────────────────────────┐        │
│  │  Message received from topic:        │        │
│  │  • Topic: "inventory.reserve"        │        │
│  │  • Partition: 0                      │        │
│  │  • Offset: 42                        │        │
│  │  • Event: STOCK_RESERVE_REQUEST      │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 6: Process Stock Reservation                │
│  ┌─────────────────────────────────────┐        │
│  │  stockManager.reserveStock():        │        │
│  │                                      │        │
│  │  For each item:                      │        │
│  │  1. Find product with sufficient     │        │
│  │     stock atomically:                │        │
│  │                                      │        │
│  │     Product.findOneAndUpdate(        │        │
│  │       {                              │        │
│  │         _id: "prod1",                │        │
│  │         stock: { $gte: 2 }           │        │
│  │       },                             │        │
│  │       {                              │        │
│  │         $inc: { stock: -2 }          │        │
│  │       }                              │        │
│  │     )                                │        │
│  │                                      │        │
│  │  2. Stock updated: 50 → 48           │        │
│  │  3. If stock = 0, set inStock=false  │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 7: Commit Kafka Offset                     │
│  ┌─────────────────────────────────────┐        │
│  │  consumer.commitOffsets([            │        │
│  │    {                                 │        │
│  │      topic: "inventory.reserve",     │        │
│  │      partition: 0,                   │        │
│  │      offset: "43"                    │        │
│  │    }                                 │        │
│  │  ])                                  │        │
│  │                                      │        │
│  │  ✅ Message processed successfully   │        │
│  └─────────────────────────────────────┘        │
└──────────────────────────────────────────────────┘
                     │
                     ↓
          ┌──────────────────┐
          │   products_db    │
          │                  │
          │   Product doc:   │
          │   {              │
          │     _id: "prod1",│
          │     stock: 48,   │ ← Updated!
          │     inStock: true│
          │   }              │
          └──────────────────┘
```

---

## Order Cancellation Event Flow

```
┌─────────┐
│  Admin  │  1. Cancels order
└────┬────┘
     │ PATCH /api/v1/orders/:id/status
     │ Body: { status: 5 }
     ↓
┌──────────────────────────────────────────────────┐
│  Orders Service                                   │
│                                                   │
│  Step 1: Validate Status Transition              │
│  ┌─────────────────────────────────────┐        │
│  │  isValidTransition(                  │        │
│  │    currentStatus: 1 (PENDING),       │        │
│  │    newStatus: 5 (CANCELLED)          │        │
│  │  )                                   │        │
│  │  → true ✅                            │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 2: Update Order Status in MongoDB          │
│  ┌─────────────────────────────────────┐        │
│  │  Order.findByIdAndUpdate(            │        │
│  │    "abc123",                         │        │
│  │    { status: 5, cancelledAt: now }  │        │
│  │  )                                   │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 3: HTTP 200 Response (Immediate)           │
│  ────────────────────────────────────→           │
│                                                   │
│  Step 4: Emit WebSocket Event                    │
│  ┌─────────────────────────────────────┐        │
│  │  Socket.io Emit:                     │        │
│  │  Event: "order:cancelled"            │        │
│  │  Payload: { order, message }         │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 5: Publish to Kafka                        │
│  ┌─────────────────────────────────────┐        │
│  │  Topic: "inventory.release"          │        │
│  │  Key: "abc123"                       │        │
│  │  Value: {                            │        │
│  │    eventType: "STOCK_RELEASE_REQUEST"│        │
│  │    orderId: "abc123",                │        │
│  │    reason: "ORDER_CANCELLED",        │        │
│  │    items: [                          │        │
│  │      {productId: "prod1", qty: 2}    │        │
│  │    ]                                 │        │
│  │  }                                   │        │
│  └─────────────────────────────────────┘        │
└───────────────────────┬───────────────────────────┘
                        │
                        ↓
          ┌─────────────────────────┐
          │   Kafka Broker          │
          │   Topic: inventory.*    │
          └──────────┬──────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────┐
│  Products Service - Kafka Consumer                │
│                                                   │
│  Step 6: Receive Release Request                 │
│  ┌─────────────────────────────────────┐        │
│  │  Message: STOCK_RELEASE_REQUEST      │        │
│  │  Reason: ORDER_CANCELLED             │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 7: Release Stock                           │
│  ┌─────────────────────────────────────┐        │
│  │  stockManager.releaseStock():        │        │
│  │                                      │        │
│  │  Product.findOneAndUpdate(           │        │
│  │    { _id: "prod1" },                 │        │
│  │    {                                 │        │
│  │      $inc: { stock: 2 },             │        │
│  │      $set: { inStock: true }         │        │
│  │    }                                 │        │
│  │  )                                   │        │
│  │                                      │        │
│  │  Stock updated: 48 → 50 (restored)   │        │
│  └─────────────────────────────────────┘        │
│           │                                       │
│           ↓                                       │
│  Step 8: Commit Kafka Offset                     │
│  ┌─────────────────────────────────────┐        │
│  │  ✅ Stock successfully restored       │        │
│  │  ✅ Offset committed                  │        │
│  └─────────────────────────────────────┘        │
└──────────────────────────────────────────────────┘
                     │
                     ↓
          ┌──────────────────┐
          │   products_db    │
          │                  │
          │   Product doc:   │
          │   {              │
          │     _id: "prod1",│
          │     stock: 50,   │ ← Restored!
          │     inStock: true│
          │   }              │
          └──────────────────┘
```

---

## Kafka Topic Partition Strategy

```
Topic: inventory.reserve
├── Partition 0 (Leader: Broker 1)
│   ├── Offset 0: Order A, Product 1
│   ├── Offset 1: Order C, Product 3
│   └── Offset 2: Order E, Product 5
│
├── Partition 1 (Leader: Broker 1)
│   ├── Offset 0: Order B, Product 2
│   ├── Offset 1: Order D, Product 4
│   └── Offset 2: Order F, Product 6
│
└── Partition 2 (Leader: Broker 1)
    ├── Offset 0: Order G, Product 7
    ├── Offset 1: Order H, Product 8
    └── Offset 2: Order I, Product 9

Consumer Group: products-service-group
├── Consumer Instance 1 → Partition 0
├── Consumer Instance 2 → Partition 1 (if scaled)
└── Consumer Instance 3 → Partition 2 (if scaled)
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────┐
│  Order Created → Stock Insufficient              │
└─────────────────────────────────────────────────┘

1. Order created in orders_db ✅
   ↓
2. Kafka event published ✅
   ↓
3. Products service receives event ✅
   ↓
4. stockManager.reserveStock()
   ├── Item 1: Stock available (10 units) ✅
   │   └── Reserved 5 units → Stock now 5
   ├── Item 2: Stock insufficient (2 < 10) ❌
   │   └── Reservation fails
   └── Rollback triggered!
       ↓
5. Automatic Rollback
   ├── Release Item 1: 5 → 10 (restored) ✅
   └── Log failure reason
       ↓
6. Do NOT commit Kafka offset
   └── Message will be reprocessed
       ↓
7. After 3 retries → Send to Dead Letter Queue

Result:
• Order exists with status PENDING
• Stock unchanged
• Admin notification sent
• Customer informed of stock issue
```

---

## WebSocket + Kafka Integration

```
┌──────────────────────────────────────────────┐
│  Single Order Event = Dual Emission          │
└──────────────────────────────────────────────┘

Order Created:
├── WebSocket (Real-time UI)
│   ├── Event: order:created
│   ├── Target: Connected client
│   ├── Latency: ~10ms
│   └── Purpose: Instant UI update
│
└── Kafka (Inter-service)
    ├── Topic: inventory.reserve
    ├── Target: Products service
    ├── Latency: ~50ms
    └── Purpose: Stock management

Both Independent:
• WebSocket can fail → Kafka still works
• Kafka can fail → WebSocket still works
• No blocking between channels
• Each has own error handling
```

---

## Scalability Model

```
┌────────────────────────────────────────────┐
│  Horizontal Scaling with Kafka             │
└────────────────────────────────────────────┘

Single Instance:
┌──────────────┐      ┌──────────────┐
│  Products    │ ───→ │ Partition 0  │
│  Service #1  │ ───→ │ Partition 1  │
│              │ ───→ │ Partition 2  │
└──────────────┘      └──────────────┘
Throughput: 2000 msg/sec

Scale to 3 Instances:
┌──────────────┐      ┌──────────────┐
│  Products    │ ───→ │ Partition 0  │
│  Service #1  │      └──────────────┘
└──────────────┘

┌──────────────┐      ┌──────────────┐
│  Products    │ ───→ │ Partition 1  │
│  Service #2  │      └──────────────┘
└──────────────┘

┌──────────────┐      ┌──────────────┐
│  Products    │ ───→ │ Partition 2  │
│  Service #3  │      └──────────────┘
└──────────────┘
Throughput: 6000 msg/sec (3x)

Auto-rebalancing:
• Consumer joins → partitions redistributed
• Consumer leaves → partitions reassigned
• Zero downtime
```

---

## Monitoring Dashboard View

```
┌─────────────────────────────────────────────────┐
│  Kafka UI: http://localhost:8080                │
├─────────────────────────────────────────────────┤
│                                                  │
│  Topics (6):                                     │
│  ┌────────────────────┬──────┬────────┬────┐   │
│  │ Topic              │ Part │ Msgs   │ Lag│   │
│  ├────────────────────┼──────┼────────┼────┤   │
│  │ inventory.reserve  │  3   │ 1,234  │  0 │✅ │
│  │ inventory.release  │  3   │    89  │  0 │✅ │
│  │ order.created      │  3   │ 1,234  │  - │   │
│  │ order.cancelled    │  3   │    89  │  - │   │
│  │ order.completed    │  3   │   567  │  - │   │
│  └────────────────────┴──────┴────────┴────┘   │
│                                                  │
│  Consumers (1):                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ Group: products-service-group           │   │
│  │ Status: STABLE ✅                        │   │
│  │ Members: 1                              │   │
│  │ Lag: 0 messages                         │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  Recent Messages (inventory.reserve):            │
│  ┌─────────────────────────────────────────┐   │
│  │ Offset 42 | 2024-11-20 10:30:15         │   │
│  │ {                                       │   │
│  │   eventType: "STOCK_RESERVE_REQUEST",   │   │
│  │   orderId: "abc123",                    │   │
│  │   items: [{productId: "prod1", qty: 2}] │   │
│  │ }                                       │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

**Created:** 2025-11-20
**Version:** 1.0.0
