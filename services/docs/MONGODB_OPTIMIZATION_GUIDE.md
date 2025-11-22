# MongoDB Optimization Guide

Complete guide for indexing, sharding, and optimization strategies for the microservices e-commerce platform.

## Table of Contents

1. [Overview](#overview)
2. [Indexing Strategy](#indexing-strategy)
3. [Sharding Strategy](#sharding-strategy)
4. [Query Optimization](#query-optimization)
5. [Performance Tuning](#performance-tuning)
6. [Monitoring and Analysis](#monitoring-and-analysis)
7. [Best Practices](#best-practices)

---

## Overview

### Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│  MongoDB Atlas Cluster (M30+ for Sharding)              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Shard 1   │  │  Shard 2   │  │  Shard 3   │       │
│  ├────────────┤  ├────────────┤  ├────────────┤       │
│  │ Products   │  │ Products   │  │ Products   │       │
│  │ Orders     │  │ Orders     │  │ Orders     │       │
│  │ Users      │  │ Users      │  │ Users      │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │  Config Servers (Metadata)                │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │  mongos (Query Routers)                   │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### Collections Overview

| Database | Collection | Documents | Sharding | Priority |
|----------|-----------|-----------|----------|----------|
| products_db | products | ~1M | Yes (hashed _id) | High |
| orders_db | orders | ~5M | Yes (userId+createdAt) | Critical |
| users_db | users | ~100k | Yes (hashed _id) | High |
| categories_db | categories | ~1k | No | Low |
| auth_db | users | ~100k | Yes (hashed _id) | High |
| auth_db | authorizationcodes | ~10k | Yes (hashed code) | Medium |
| auth_db | refreshtokens | ~50k | Yes (hashed token) | Medium |
| auth_db | clients | ~10 | No | Low |

---

## Indexing Strategy

### Products Collection

**Schema**: [products/models/Product.js](products/models/Product.js:1-94)

#### Indexes Created

```javascript
// Single field indexes
{ name: 1 }                    // Text searches, filtering
{ category: 1 }                // Category browsing
{ price: 1 }                   // Price filtering, sorting
{ inStock: 1 }                 // Availability filtering
{ isActive: 1 }                // Active product filtering
{ brand: 1 }                   // Brand filtering
{ rating: -1 }                 // Sorting by rating (descending)
{ createdAt: -1 }              // New arrivals, sorting
{ sku: 1 }                     // Unique product identifier (sparse, unique)

// Compound indexes
{ category: 1, inStock: 1, price: 1 }      // Category browsing with filters
{ category: 1, rating: -1 }                 // Top rated in category
{ inStock: 1, isActive: 1, createdAt: -1 } // Active inventory
{ brand: 1, category: 1 }                   // Brand within category

// Text index
{ name: 'text', description: 'text', tags: 'text' }  // Full-text search
```

#### Query Patterns

**Use Case 1: Category Browsing with Filters**
```javascript
// Query
db.products.find({
  category: 'electronics',
  inStock: true,
  price: { $gte: 100, $lte: 500 }
}).sort({ price: 1 })

// Uses index: { category: 1, inStock: 1, price: 1 }
// Efficiency: ~95%+
```

**Use Case 2: Text Search**
```javascript
// Query
db.products.find({
  $text: { $search: 'laptop gaming' }
}).sort({ rating: -1 })

// Uses text index
// Note: Add { rating: -1 } sort after retrieval
```

**Use Case 3: Top Products by Category**
```javascript
// Query
db.products.find({
  category: 'electronics',
  isActive: true
}).sort({ rating: -1 }).limit(10)

// Uses index: { category: 1, rating: -1 }
// Efficiency: 100% (top-k query)
```

### Orders Collection

**Schema**: [orders/models/Order.js](orders/models/Order.js:1-99)

#### Indexes Created

```javascript
// Single field indexes
{ userId: 1 }                   // User order lookup
{ orderNumber: 1 }              // Direct order access (unique)
{ status: 1 }                   // Order status filtering
{ paymentStatus: 1 }            // Payment tracking
{ createdAt: -1 }               // Chronological sorting
{ trackingNumber: 1 }           // Shipment tracking

// Compound indexes
{ userId: 1, createdAt: -1 }                    // User order history
{ userId: 1, status: 1 }                        // User orders by status
{ status: 1, createdAt: -1 }                    // Admin order management
{ paymentStatus: 1, status: 1 }                 // Payment reconciliation
{ userId: 1, paymentStatus: 1, createdAt: -1 }  // User payment history

// Embedded field index
{ 'items.productId': 1 }        // Product order lookup

// Analytics index
{ createdAt: -1, status: 1, totalAmount: 1 }    // Revenue reporting
```

#### Query Patterns

**Use Case 1: User Order History**
```javascript
// Query
db.orders.find({
  userId: 'user123'
}).sort({ createdAt: -1 }).limit(20)

// Uses index: { userId: 1, createdAt: -1 }
// Efficiency: 100%
```

**Use Case 2: Admin Dashboard - Pending Orders**
```javascript
// Query
db.orders.find({
  status: 'pending',
  paymentStatus: 'paid'
}).sort({ createdAt: -1 })

// Uses index: { status: 1, createdAt: -1 } + filter
// Efficiency: ~90%
```

**Use Case 3: Product Sales Lookup**
```javascript
// Query
db.orders.find({
  'items.productId': 'prod456'
})

// Uses index: { 'items.productId': 1 }
// Efficiency: ~80% (embedded array scan)
```

### Users Collection

**Schema**: [users/models/User.js](users/models/User.js:1-82)

#### Indexes Created

```javascript
// Single field indexes
{ email: 1 }                    // Login, unique constraint
{ role: 1 }                     // Role-based queries
{ isActive: 1 }                 // Active user filtering
{ createdAt: -1 }               // User registration timeline
{ lastLoginAt: -1 }             // Activity tracking

// Compound indexes
{ isActive: 1, role: 1 }        // Active users by role
{ isActive: 1, createdAt: -1 }  // Recent active users

// Text index
{ name: 'text', email: 'text' } // User search
```

#### Query Patterns

**Use Case 1: User Login**
```javascript
// Query
db.users.findOne({
  email: 'user@example.com'
})

// Uses index: { email: 1 }
// Efficiency: 100% (unique lookup)
```

**Use Case 2: Admin User Management**
```javascript
// Query
db.users.find({
  isActive: true,
  role: 'user'
}).sort({ createdAt: -1 }).limit(50)

// Uses index: { isActive: 1, role: 1 } + createdAt sort
// Efficiency: ~85%
```

### Categories Collection

**Schema**: [categories/models/Category.js](categories/models/Category.js:1-59)

#### Indexes Created

```javascript
// Single field indexes
{ slug: 1 }                     // URL routing (unique)
{ name: 1 }                     // Name lookup (unique)
{ parentCategory: 1 }           // Hierarchical queries
{ isActive: 1 }                 // Active categories
{ order: 1 }                    // Display ordering

// Compound indexes
{ parentCategory: 1, isActive: 1, order: 1 }  // Subcategory listing
{ isActive: 1, order: 1 }                      // Active category menu

// Text index
{ name: 'text', description: 'text' }          // Category search
```

### Auth Collections

**Schemas**: [auth/models/](auth/models/)

#### Users Collection (Auth DB)
```javascript
{ email: 1 }                    // Login (unique)
{ isActive: 1 }                 // Active filtering
{ createdAt: -1 }               // Registration timeline
{ isActive: 1, roles: 1 }       // Active users by role
{ email_verified: 1, isActive: 1 }  // Verified active users
{ name: 'text', email: 'text' } // User search
```

#### Authorization Codes Collection
```javascript
{ code: 1 }                     // Code lookup (unique, hashed)
{ expires_at: 1 }               // Expiration lookup
{ expires_at: 1 }               // TTL index (expireAfterSeconds: 0)
```

#### Refresh Tokens Collection
```javascript
{ token: 1 }                    // Token lookup (unique, hashed)
{ expires_at: 1 }               // Expiration lookup
{ expires_at: 1 }               // TTL index (expireAfterSeconds: 0)
```

#### Clients Collection
```javascript
{ client_id: 1 }                // Client lookup (unique)
{ isActive: 1 }                 // Active clients
{ isActive: 1, grant_types: 1 } // Active clients by grant type
```

---

## Sharding Strategy

### Overview

Sharding distributes data across multiple servers (shards) for horizontal scaling.

**Configuration File**: [mongodb/sharding-config.js](mongodb/sharding-config.js)

### Products Database

**Shard Key**: `{ _id: 'hashed' }`

**Rationale**:
- Even distribution of products across shards
- Prevents hotspots from popular categories
- Good for random access patterns
- Scales writes evenly

**Alternative Shard Keys**:
```javascript
// Option 1: Range-based by category
{ category: 1, _id: 1 }
// Use if: Most queries filter by category
// Pros: Efficient category-based queries
// Cons: Potential hotspots in popular categories

// Option 2: Geographic sharding
{ region: 1, _id: 1 }
// Use if: Products are region-specific
// Pros: Zone sharding for data locality
// Cons: Requires region field in schema
```

**Setup Commands**:
```javascript
// Enable sharding
sh.enableSharding("products_db")

// Create hashed index
db.products.createIndex({ _id: "hashed" })

// Shard collection
sh.shardCollection("products_db.products", { _id: "hashed" })

// Verify distribution
db.products.getShardDistribution()
```

### Orders Database

**Shard Key**: `{ userId: 1, createdAt: 1 }`

**Rationale**:
- Range-based sharding for user-specific queries
- Chronological ordering within user data
- Efficient for user order history queries
- Natural data organization

**Considerations**:
```javascript
// Monitor for hotspots
// High-volume users may create write hotspots
// Mitigation: Ensure good userId distribution

// Alternative if hotspots occur
{ userId: 'hashed' }  // Even distribution, no range queries
```

**Setup Commands**:
```javascript
sh.enableSharding("orders_db")
db.orders.createIndex({ userId: 1, createdAt: 1 })
sh.shardCollection("orders_db.orders", { userId: 1, createdAt: 1 })

// Optional: Create zones for archiving
sh.addShardTag("shard01", "recent")
sh.addShardTag("shard02", "archive")
sh.addTagRange(
  "orders_db.orders",
  { userId: MinKey, createdAt: ISODate("2024-01-01") },
  { userId: MinKey, createdAt: ISODate("2025-01-01") },
  "recent"
)
```

### Users Database

**Shard Key**: `{ _id: 'hashed' }`

**Rationale**:
- Even distribution for authentication requests
- Prevents hotspots
- Good for random user access patterns

**Setup Commands**:
```javascript
sh.enableSharding("users_db")
db.users.createIndex({ _id: "hashed" })
sh.shardCollection("users_db.users", { _id: "hashed" })
```

**Global Indexes** (for cross-shard queries):
```javascript
// Email index for login queries across shards
db.users.createIndex({ email: 1 }, { unique: true })
```

### Auth Database

**Authorization Codes**: `{ code: 'hashed' }`
**Refresh Tokens**: `{ token: 'hashed' }`
**Users**: `{ _id: 'hashed' }`

**Setup Script**: [mongodb/enable-sharding.sh](mongodb/enable-sharding.sh)

```bash
# Make executable
chmod +x mongodb/enable-sharding.sh

# Run with Atlas connection string
./mongodb/enable-sharding.sh "mongodb+srv://admin:pass@cluster.mongodb.net/"
```

### When NOT to Shard

**Categories Database**:
- Low volume (~1k documents)
- Read-heavy workload
- Entire dataset fits in memory
- Alternative: Use read replicas + Redis caching

**Clients Collection**:
- Very low volume (~10 documents)
- Rarely updated
- Alternative: Cache in application memory

---

## Query Optimization

### Compound Index Strategy

**Index Prefix Rule**: Compound indexes can be used for queries on index prefixes.

```javascript
// Index
{ category: 1, inStock: 1, price: 1 }

// Can be used for:
✓ { category: 'electronics' }
✓ { category: 'electronics', inStock: true }
✓ { category: 'electronics', inStock: true, price: { $gte: 100 } }

// Cannot be used for:
✗ { inStock: true }
✗ { price: { $gte: 100 } }
✗ { inStock: true, price: { $gte: 100 } }
```

### ESR Rule (Equality, Sort, Range)

Order compound index fields for optimal performance:

```javascript
// Query
db.products.find({
  category: 'electronics',    // Equality
  inStock: true,             // Equality
  price: { $gte: 100 }       // Range
}).sort({ rating: -1 })      // Sort

// Optimal index
{ category: 1, inStock: 1, rating: -1, price: 1 }
//  Equality↑    Equality↑    Sort↑      Range↑
```

### Text Search Optimization

```javascript
// Inefficient: Regex on non-indexed field
db.products.find({
  name: { $regex: /laptop/i }
})
// Result: COLLSCAN, slow

// Efficient: Text index
db.products.find({
  $text: { $search: 'laptop' }
})
// Result: Uses text index, fast

// With relevance scoring
db.products.find(
  { $text: { $search: 'gaming laptop' } },
  { score: { $meta: 'textScore' } }
).sort({ score: { $meta: 'textScore' } })
```

### Covered Queries

Query where all fields are in the index:

```javascript
// Index
{ userId: 1, createdAt: -1, status: 1 }

// Covered query (no document fetch)
db.orders.find(
  { userId: 'user123' },
  { _id: 0, userId: 1, createdAt: 1, status: 1 }
).sort({ createdAt: -1 })

// Result: PROJECTION_COVERED, very fast
```

### Avoiding Anti-Patterns

**Anti-Pattern 1: $or with Different Fields**
```javascript
// Inefficient
db.products.find({
  $or: [
    { name: { $regex: /laptop/ } },
    { description: { $regex: /laptop/ } }
  ]
})

// Better: Use text index
db.products.find({
  $text: { $search: 'laptop' }
})
```

**Anti-Pattern 2: Negation Queries**
```javascript
// Inefficient (requires full collection scan)
db.products.find({
  category: { $ne: 'electronics' }
})

// Better: Query for what you want
db.products.find({
  category: { $in: ['clothing', 'home', 'sports'] }
})
```

**Anti-Pattern 3: Large $in Arrays**
```javascript
// Inefficient if ids.length > 1000
db.products.find({
  _id: { $in: [/* 10000 ids */] }
})

// Better: Batch queries
const batchSize = 1000;
for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  await db.products.find({ _id: { $in: batch } });
}
```

---

## Performance Tuning

### Connection Pooling

```javascript
// mongoose configuration
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,        // Max connections per host
  minPoolSize: 2,         // Min connections to maintain
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4              // Use IPv4
});
```

**Pool Size Guidelines**:
- Development: 5-10
- Production (per instance): 10-50
- Formula: `(concurrent_requests * avg_query_time_ms) / 1000`

### Read Preferences

```javascript
// For read-heavy workloads, use read replicas
mongoose.connect(uri, {
  readPreference: 'secondaryPreferred'
});

// Read from primary (default)
db.products.find().read('primary')

// Read from secondary
db.products.find().read('secondary')

// Use cases:
// - Analytics queries: 'secondary'
// - Critical writes: 'primary'
// - Reports: 'secondaryPreferred'
```

### Write Concerns

```javascript
// For critical data (orders, payments)
db.orders.insertOne(order, {
  writeConcern: { w: 'majority', j: true }
})

// For less critical data (logs, analytics)
db.logs.insertOne(log, {
  writeConcern: { w: 1, j: false }
})

// Options:
// w: 'majority' - Acknowledged by majority of replica set
// j: true - Journaled to disk (durable)
// w: 1 - Acknowledged by primary only (faster, less safe)
```

### Projection

Limit fields returned to reduce network transfer:

```javascript
// Bad: Return entire document
db.products.find({ category: 'electronics' })

// Good: Return only needed fields
db.products.find(
  { category: 'electronics' },
  { name: 1, price: 1, imageUrl: 1, _id: 1 }
)

// Even better: Use lean() with Mongoose
Product.find({ category: 'electronics' })
  .select('name price imageUrl')
  .lean()  // Return plain objects, not Mongoose documents
```

### Batch Operations

```javascript
// Bad: Multiple individual writes
for (const product of products) {
  await db.products.insertOne(product);
}

// Good: Bulk write operation
await db.products.bulkWrite(
  products.map(p => ({
    insertOne: { document: p }
  })),
  { ordered: false }  // Continue on error
);

// Mongoose bulkWrite
await Product.bulkWrite([
  { insertOne: { document: product1 } },
  { updateOne: { filter: { _id: id }, update: { $set: update } } },
  { deleteOne: { filter: { _id: id } } }
]);
```

---

## Monitoring and Analysis

### Index Management Scripts

**Create Indexes**: [mongodb/manage-indexes.js](mongodb/manage-indexes.js)

```bash
# Create indexes for all databases
node mongodb/manage-indexes.js create-all

# Create indexes for specific database
node mongodb/manage-indexes.js create products

# List indexes
node mongodb/manage-indexes.js list orders

# Analyze index usage
node mongodb/manage-indexes.js analyze products

# Drop unused index
node mongodb/manage-indexes.js drop products products brand_1

# Rebuild all indexes
node mongodb/manage-indexes.js rebuild products
```

### Query Analyzer

**Analyze Queries**: [mongodb/query-analyzer.js](mongodb/query-analyzer.js)

```bash
# Analyze specific query
node mongodb/query-analyzer.js products products '{"category":"electronics"}'

# Batch analyze common queries
node mongodb/query-analyzer.js batch products

# Example output:
# Execution Time: 15ms
# Documents Examined: 100
# Documents Returned: 100
# Query Efficiency: 100%
# ✓ Query is well optimized
```

### MongoDB Atlas Metrics

**Key Metrics to Monitor**:

1. **Operation Execution Times**
   - P50, P95, P99 latencies
   - Target: < 50ms for reads, < 100ms for writes

2. **Index Usage**
   - Index hit ratio: > 95%
   - Collection scans: < 1%

3. **Connection Pool**
   - Available connections: > 20%
   - Connection errors: 0

4. **Disk I/O**
   - Disk queue depth: < 10
   - IOPS utilization: < 80%

5. **Shard Distribution**
   - Chunk distribution variance: < 20%
   - Balancer running: Enabled

**Atlas Performance Advisor**:
- Automatically suggests indexes
- Identifies slow queries
- Recommends schema improvements

### Explain Plans

```javascript
// In MongoDB shell or Compass
db.products.find({ category: 'electronics' }).explain('executionStats')

// Key fields to check:
// - executionTimeMillis: < 100ms
// - totalDocsExamined vs nReturned: ratio close to 1
// - stage: Should be 'IXSCAN' not 'COLLSCAN'
// - indexName: Verify correct index used
```

---

## Best Practices

### Index Management

1. **Start with Single Field Indexes**
   - Index frequently queried fields
   - Add compound indexes as needed

2. **Monitor and Iterate**
   - Use Performance Advisor
   - Analyze slow query logs
   - Drop unused indexes

3. **Limit Number of Indexes**
   - Each index costs write performance
   - Target: 5-10 indexes per collection
   - Remove redundant indexes

4. **Use Partial Indexes**
   ```javascript
   // Only index active products
   db.products.createIndex(
     { category: 1, price: 1 },
     { partialFilterExpression: { isActive: true } }
   )
   ```

5. **Consider Index Size**
   ```javascript
   // Check index sizes
   db.products.stats().indexSizes

   // All indexes should fit in RAM for best performance
   ```

### Sharding Best Practices

1. **Choose Shard Key Carefully**
   - High cardinality
   - Even distribution
   - Matches query patterns

2. **Pre-Split Chunks**
   ```javascript
   // For initial large dataset
   for (let i = 0; i < 100; i++) {
     sh.splitAt("products_db.products", { _id: ObjectId() })
   }
   ```

3. **Monitor Chunk Distribution**
   ```javascript
   sh.status()
   db.products.getShardDistribution()
   ```

4. **Enable Balancer Carefully**
   ```javascript
   // Disable during peak hours
   sh.stopBalancer()

   // Enable during off-peak
   sh.startBalancer()

   // Set balancing window
   db.settings.update(
     { _id: "balancer" },
     { $set: { activeWindow: { start: "01:00", stop: "05:00" } } }
   )
   ```

### Query Optimization Best Practices

1. **Use Lean Queries**
   ```javascript
   // Mongoose: Return plain objects
   Product.find({}).lean()
   ```

2. **Limit Result Sets**
   ```javascript
   db.products.find({}).limit(100)
   ```

3. **Use Projection**
   ```javascript
   db.products.find({}, { name: 1, price: 1 })
   ```

4. **Avoid Skip for Pagination**
   ```javascript
   // Bad: Slow for large offsets
   db.products.find({}).skip(10000).limit(20)

   // Good: Use range-based pagination
   db.products.find({ _id: { $gt: lastSeenId } }).limit(20)
   ```

5. **Batch Updates**
   ```javascript
   db.products.updateMany(
     { category: 'old_category' },
     { $set: { category: 'new_category' } }
   )
   ```

---

## Quick Reference

### Useful Commands

```javascript
// Index management
db.collection.getIndexes()
db.collection.createIndex({ field: 1 })
db.collection.dropIndex("index_name")
db.collection.reIndex()

// Query analysis
db.collection.find(query).explain("executionStats")
db.collection.aggregate([{ $indexStats: {} }])

// Sharding
sh.status()
sh.enableSharding("database")
sh.shardCollection("db.collection", { field: 1 })
db.collection.getShardDistribution()

// Monitoring
db.serverStatus()
db.currentOp()
db.collection.stats()
```

### Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Read latency (P95) | < 50ms | < 100ms |
| Write latency (P95) | < 100ms | < 200ms |
| Index hit ratio | > 95% | > 90% |
| Connection pool usage | 50-80% | < 90% |
| Disk IOPS | < 80% | < 95% |
| Chunk distribution variance | < 20% | < 40% |

---

## Conclusion

Proper indexing and sharding are critical for scaling MongoDB in production. Key takeaways:

1. **Index strategically** - Match indexes to query patterns
2. **Monitor continuously** - Use Atlas Performance Advisor and custom scripts
3. **Shard when needed** - Only when data size or throughput requires it
4. **Test thoroughly** - Validate performance before production deployment
5. **Iterate and optimize** - Database optimization is an ongoing process

For questions or issues, refer to:
- MongoDB Documentation: https://docs.mongodb.com/
- Atlas Performance: https://docs.atlas.mongodb.com/performance-advisor/
- Sharding Guide: https://docs.mongodb.com/manual/sharding/
