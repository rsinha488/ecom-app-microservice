# MongoDB Management Scripts

Comprehensive tooling for managing MongoDB indexes, sharding, and performance optimization for the e-commerce microservices platform.

## Overview

This directory contains scripts and configurations for:
- **Index Management**: Create, analyze, and optimize indexes
- **Sharding**: Configure and enable sharding on MongoDB Atlas
- **Query Analysis**: Analyze query performance and get recommendations
- **Performance Monitoring**: Track and optimize database performance

## Files

| File | Description |
|------|-------------|
| `manage-indexes.js` | Create and manage indexes across all databases |
| `query-analyzer.js` | Analyze query performance and execution plans |
| `sharding-config.js` | Sharding strategy configuration and best practices |
| `enable-sharding.sh` | Bash script to enable sharding on MongoDB Atlas |
| `package.json` | Node.js dependencies for the scripts |

## Prerequisites

1. **Node.js**: Version 18+ required
2. **MongoDB**: Local MongoDB or MongoDB Atlas cluster
3. **mongosh**: MongoDB shell for sharding script
4. **Environment Variables**: Set connection strings for each database

## Installation

```bash
cd mongodb
npm install
```

## Environment Variables

Create a `.env` file in the services directory or export these variables:

```bash
# MongoDB Connection Strings
export PRODUCTS_MONGODB_URI="mongodb://localhost:27017/products_db"
export CATEGORIES_MONGODB_URI="mongodb://localhost:27017/categories_db"
export USERS_MONGODB_URI="mongodb://localhost:27017/users_db"
export ORDERS_MONGODB_URI="mongodb://localhost:27017/orders_db"
export AUTH_MONGODB_URI="mongodb://localhost:27017/auth_db"

# For Atlas (replace with your connection string)
export ATLAS_URI="mongodb+srv://user:pass@cluster.mongodb.net/"
```

## Usage

### Index Management

#### Create All Indexes

```bash
# Create indexes for all databases
node manage-indexes.js create-all

# Create indexes for specific database
node manage-indexes.js create products
node manage-indexes.js create orders
node manage-indexes.js create users
```

#### List Indexes

```bash
# List indexes for a database
node manage-indexes.js list products
node manage-indexes.js list orders
```

Example output:
```
=== products ===

Name: _id_
Keys: {"_id":1}

Name: category_1_inStock_1_price_1
Keys: {"category":1,"inStock":1,"price":1}

Name: text_search
Keys: {"_fts":"text","_ftsx":1}
```

#### Analyze Index Usage

```bash
# Analyze index usage and get recommendations
node manage-indexes.js analyze products
node manage-indexes.js analyze orders
```

Example output:
```
=== Index Usage Analysis ===

--- products ---

Index: category_1_inStock_1_price_1
  Operations: 15234
  Since: 2024-01-15T10:30:00.000Z

Index: brand_1
  Operations: 0
  ⚠ WARNING: Unused index - consider dropping

=== Recommendations ===
1. Drop indexes with 0 operations
2. Monitor slow query logs for missing indexes
3. Use explain() to verify query plans
```

#### Drop Unused Index

```bash
# Drop a specific index
node manage-indexes.js drop products products brand_1
```

#### Rebuild Indexes

```bash
# Rebuild all indexes for a database (drop and recreate)
node manage-indexes.js rebuild products
```

### Query Analysis

#### Analyze Specific Query

```bash
# Analyze a query's execution plan
node query-analyzer.js products products '{"category":"electronics"}'

node query-analyzer.js orders orders '{"userId":"user123","status":"pending"}'

node query-analyzer.js users users '{"email":"user@example.com"}'
```

Example output:
```
=== Query Analysis ===

Database: products
Collection: products
Query: {
  "category": "electronics",
  "inStock": true
}

=== Execution Plan ===

Execution Time: 12ms
Documents Examined: 150
Documents Returned: 150
Index Used: category_1_inStock_1_price_1
Query Efficiency: 100.00%

=== Performance Assessment ===

✓ Query is well optimized

=== Query Plan Details ===
{
  "stage": "FETCH",
  "inputStage": {
    "stage": "IXSCAN",
    "indexName": "category_1_inStock_1_price_1"
  }
}
```

#### Batch Analyze Common Queries

```bash
# Analyze common query patterns for a database
node query-analyzer.js batch products
node query-analyzer.js batch orders
node query-analyzer.js batch users
```

### Sharding

#### Prerequisites for Sharding

1. **MongoDB Atlas Cluster**: M30+ tier (sharding enabled)
2. **mongosh**: MongoDB shell installed
3. **Admin Access**: Connection string with admin privileges

#### Enable Sharding

```bash
# Make script executable (already done)
chmod +x enable-sharding.sh

# Run with Atlas connection string
./enable-sharding.sh "mongodb+srv://admin:password@cluster.mongodb.net/"
```

The script will:
1. Verify connection to MongoDB Atlas
2. Check that sharding is enabled on the cluster
3. Create necessary indexes for shard keys
4. Enable sharding on all databases
5. Shard collections with appropriate shard keys
6. Verify shard configuration

Example output:
```
╔═══════════════════════════════════════════════════════════╗
║  MongoDB Atlas Sharding Configuration Script             ║
╚═══════════════════════════════════════════════════════════╝

Step 1: Checking connection to MongoDB Atlas...
✓ Connected successfully

Step 2: Verifying sharding is enabled on cluster...
✓ Sharding is enabled

Step 3: Creating indexes before sharding...

=== Products Database ===
✓ Index created: _id_hashed

=== Orders Database ===
✓ Index created: userId_1_createdAt_1
✓ Index created: orderNumber_1

Step 4: Enabling sharding on databases...
✓ Sharding enabled on all databases

Step 5: Sharding collections...
✓ All collections sharded

Step 6: Verifying shard configuration...

╔═══════════════════════════════════════════════════════════╗
║  Sharding Configuration Complete!                         ║
╚═══════════════════════════════════════════════════════════╝
```

#### Manual Sharding Commands

If you prefer to run commands manually:

```javascript
// Connect to MongoDB Atlas
mongosh "mongodb+srv://cluster.mongodb.net/" --username admin

// Enable sharding for products database
sh.enableSharding("products_db")
db.products.createIndex({ _id: "hashed" })
sh.shardCollection("products_db.products", { _id: "hashed" })

// Enable sharding for orders database
sh.enableSharding("orders_db")
db.orders.createIndex({ userId: 1, createdAt: 1 })
sh.shardCollection("orders_db.orders", { userId: 1, createdAt: 1 })

// Check shard status
sh.status()

// Check collection distribution
db.products.getShardDistribution()
db.orders.getShardDistribution()
```

#### Verify Sharding

```javascript
// Check if sharding is enabled
sh.status()

// View chunk distribution
db.products.getShardDistribution()

// Sample output:
// Shard shard01 at shard01/host1:27017
//   data: 150MB docs: 500000 chunks: 3
//   estimated data per chunk: 50MB
//
// Shard shard02 at shard02/host2:27017
//   data: 148MB docs: 495000 chunks: 3
//   estimated data per chunk: 49MB
//
// Totals
//   data: 298MB docs: 995000 chunks: 6
//   Shard shard01 contains 50.34% data, 50.25% docs
//   Shard shard02 contains 49.66% data, 49.75% docs
```

## NPM Scripts

```bash
# Create all indexes
npm run create-indexes

# Analyze products queries
npm run analyze-products

# Analyze orders queries
npm run analyze-orders

# Analyze users queries
npm run analyze-users

# Show help
npm run help
```

## Configuration

### Sharding Configuration

Edit `sharding-config.js` to customize sharding strategy:

```javascript
const shardingConfig = {
  products_db: {
    collections: {
      products: {
        shardKey: { _id: 'hashed' },
        // or alternative:
        // shardKey: { category: 1, _id: 1 }
      }
    }
  }
};
```

### Index Configuration

Edit `manage-indexes.js` to add/modify indexes:

```javascript
const databases = {
  products: {
    collections: {
      products: {
        indexes: [
          { key: { category: 1 }, name: 'category_1' },
          // Add more indexes here
        ]
      }
    }
  }
};
```

## Monitoring

### MongoDB Atlas Monitoring

1. **Performance Advisor**
   - Atlas UI → Performance Advisor
   - Automatically suggests indexes
   - Shows slow queries

2. **Real-Time Performance Panel**
   - Atlas UI → Metrics
   - Monitor operations/sec, latency, connections
   - Set up alerts

3. **Query Profiler**
   - Atlas UI → Profiler
   - Captures slow queries (>100ms)
   - Download for analysis

### Command Line Monitoring

```javascript
// Check current operations
db.currentOp()

// Show slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Collection stats
db.products.stats()

// Index stats
db.products.aggregate([{ $indexStats: {} }])

// Server status
db.serverStatus()
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution**: Check connection string and network access
```bash
# Test connection with mongosh
mongosh "mongodb://localhost:27017/products_db"

# For Atlas, ensure IP is whitelisted
```

### Issue: "Sharding not enabled"

**Solution**: Upgrade to M30+ cluster in Atlas
- Atlas UI → Clusters → Edit Configuration
- Select M30 or higher tier
- Enable sharding

### Issue: "Index creation failed"

**Solution**: Check for index conflicts
```javascript
// List existing indexes
db.collection.getIndexes()

// Drop conflicting index
db.collection.dropIndex("index_name")

// Recreate
db.collection.createIndex({ field: 1 })
```

### Issue: "Unused indexes"

**Solution**: Analyze and drop unused indexes
```bash
# Analyze index usage
node manage-indexes.js analyze products

# Drop unused index
node manage-indexes.js drop products products unused_index_1
```

### Issue: "Slow queries"

**Solution**: Use query analyzer
```bash
# Analyze query
node query-analyzer.js products products '{"your":"query"}'

# Check for:
# - Collection scans (add index)
# - Low efficiency (improve index)
# - High execution time (optimize query)
```

## Best Practices

1. **Create Indexes in Development First**
   - Test indexes locally before production
   - Verify query performance improves
   - Monitor index size

2. **Monitor Index Usage Regularly**
   - Run analyze weekly
   - Drop unused indexes
   - Add indexes for slow queries

3. **Shard Only When Needed**
   - Collections > 500k documents
   - Data size > 100GB
   - High write throughput

4. **Use Compound Indexes Wisely**
   - Follow ESR rule (Equality, Sort, Range)
   - Consider query patterns
   - Avoid redundant indexes

5. **Test Before Production**
   - Use staging environment
   - Load test with production-like data
   - Monitor for hotspots

## Reference Documentation

- [MongoDB Optimization Guide](../MONGODB_OPTIMIZATION_GUIDE.md) - Comprehensive guide
- [Sharding Config](sharding-config.js) - Sharding strategy details
- [MongoDB Docs](https://docs.mongodb.com/) - Official documentation
- [Atlas Performance](https://docs.atlas.mongodb.com/performance-advisor/) - Performance advisor guide

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review MongoDB Optimization Guide
3. Consult MongoDB documentation
4. Check Atlas performance metrics
