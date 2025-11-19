/**
 * MongoDB Index Management Script
 *
 * This script helps create, manage, and analyze indexes across all
 * microservices databases.
 *
 * Usage:
 *   node manage-indexes.js <command> [options]
 *
 * Commands:
 *   create <db>     - Create all indexes for a specific database
 *   list <db>       - List all indexes for a database
 *   analyze <db>    - Analyze index usage and provide recommendations
 *   drop <db> <idx> - Drop a specific index
 *   rebuild <db>    - Rebuild all indexes for a database
 */

const { MongoClient } = require('mongodb');

// Database configurations
const databases = {
  products: {
    name: 'products_db',
    uri: process.env.PRODUCTS_MONGODB_URI || 'mongodb://localhost:27017/products_db',
    collections: {
      products: {
        indexes: [
          { key: { name: 1 }, name: 'name_1' },
          { key: { category: 1 }, name: 'category_1' },
          { key: { price: 1 }, name: 'price_1' },
          { key: { inStock: 1 }, name: 'inStock_1' },
          { key: { isActive: 1 }, name: 'isActive_1' },
          { key: { brand: 1 }, name: 'brand_1' },
          { key: { rating: -1 }, name: 'rating_-1' },
          { key: { createdAt: -1 }, name: 'createdAt_-1' },
          { key: { category: 1, inStock: 1, price: 1 }, name: 'category_1_inStock_1_price_1' },
          { key: { category: 1, rating: -1 }, name: 'category_1_rating_-1' },
          { key: { inStock: 1, isActive: 1, createdAt: -1 }, name: 'inStock_1_isActive_1_createdAt_-1' },
          { key: { brand: 1, category: 1 }, name: 'brand_1_category_1' },
          {
            key: { name: 'text', description: 'text', tags: 'text' },
            name: 'text_search',
            weights: { name: 10, tags: 5, description: 1 }
          },
          { key: { sku: 1 }, name: 'sku_1', unique: true, sparse: true }
        ]
      }
    }
  },

  categories: {
    name: 'categories_db',
    uri: process.env.CATEGORIES_MONGODB_URI || 'mongodb://localhost:27017/categories_db',
    collections: {
      categories: {
        indexes: [
          { key: { slug: 1 }, name: 'slug_1', unique: true },
          { key: { name: 1 }, name: 'name_1', unique: true },
          { key: { parentCategory: 1 }, name: 'parentCategory_1' },
          { key: { isActive: 1 }, name: 'isActive_1' },
          { key: { order: 1 }, name: 'order_1' },
          { key: { parentCategory: 1, isActive: 1, order: 1 }, name: 'parentCategory_1_isActive_1_order_1' },
          { key: { isActive: 1, order: 1 }, name: 'isActive_1_order_1' },
          { key: { name: 'text', description: 'text' }, name: 'text_search' }
        ]
      }
    }
  },

  users: {
    name: 'users_db',
    uri: process.env.USERS_MONGODB_URI || 'mongodb://localhost:27017/users_db',
    collections: {
      users: {
        indexes: [
          { key: { email: 1 }, name: 'email_1', unique: true },
          { key: { role: 1 }, name: 'role_1' },
          { key: { isActive: 1 }, name: 'isActive_1' },
          { key: { createdAt: -1 }, name: 'createdAt_-1' },
          { key: { lastLoginAt: -1 }, name: 'lastLoginAt_-1' },
          { key: { isActive: 1, role: 1 }, name: 'isActive_1_role_1' },
          { key: { isActive: 1, createdAt: -1 }, name: 'isActive_1_createdAt_-1' },
          { key: { name: 'text', email: 'text' }, name: 'text_search' }
        ]
      }
    }
  },

  orders: {
    name: 'orders_db',
    uri: process.env.ORDERS_MONGODB_URI || 'mongodb://localhost:27017/orders_db',
    collections: {
      orders: {
        indexes: [
          { key: { userId: 1 }, name: 'userId_1' },
          { key: { orderNumber: 1 }, name: 'orderNumber_1', unique: true },
          { key: { status: 1 }, name: 'status_1' },
          { key: { paymentStatus: 1 }, name: 'paymentStatus_1' },
          { key: { createdAt: -1 }, name: 'createdAt_-1' },
          { key: { trackingNumber: 1 }, name: 'trackingNumber_1' },
          { key: { userId: 1, createdAt: -1 }, name: 'userId_1_createdAt_-1' },
          { key: { userId: 1, status: 1 }, name: 'userId_1_status_1' },
          { key: { status: 1, createdAt: -1 }, name: 'status_1_createdAt_-1' },
          { key: { paymentStatus: 1, status: 1 }, name: 'paymentStatus_1_status_1' },
          { key: { userId: 1, paymentStatus: 1, createdAt: -1 }, name: 'userId_1_paymentStatus_1_createdAt_-1' },
          { key: { 'items.productId': 1 }, name: 'items.productId_1' },
          { key: { createdAt: -1, status: 1, totalAmount: 1 }, name: 'analytics_compound' }
        ]
      }
    }
  },

  auth: {
    name: 'auth_db',
    uri: process.env.AUTH_MONGODB_URI || 'mongodb://localhost:27017/auth_db',
    collections: {
      users: {
        indexes: [
          { key: { email: 1 }, name: 'email_1', unique: true },
          { key: { isActive: 1 }, name: 'isActive_1' },
          { key: { createdAt: -1 }, name: 'createdAt_-1' },
          { key: { isActive: 1, roles: 1 }, name: 'isActive_1_roles_1' },
          { key: { email_verified: 1, isActive: 1 }, name: 'email_verified_1_isActive_1' },
          { key: { name: 'text', email: 'text' }, name: 'text_search' }
        ]
      },
      clients: {
        indexes: [
          { key: { client_id: 1 }, name: 'client_id_1', unique: true },
          { key: { isActive: 1 }, name: 'isActive_1' },
          { key: { isActive: 1, grant_types: 1 }, name: 'isActive_1_grant_types_1' }
        ]
      },
      authorizationcodes: {
        indexes: [
          { key: { code: 1 }, name: 'code_1', unique: true },
          { key: { expires_at: 1 }, name: 'expires_at_1' },
          { key: { expires_at: 1 }, name: 'ttl_index', expireAfterSeconds: 0 }
        ]
      },
      refreshtokens: {
        indexes: [
          { key: { token: 1 }, name: 'token_1', unique: true },
          { key: { expires_at: 1 }, name: 'expires_at_1' },
          { key: { expires_at: 1 }, name: 'ttl_index', expireAfterSeconds: 0 }
        ]
      }
    }
  }
};

// Create indexes for a database
async function createIndexes(dbName) {
  const config = databases[dbName];
  if (!config) {
    console.error(`Database "${dbName}" not found in configuration`);
    process.exit(1);
  }

  const client = new MongoClient(config.uri);

  try {
    await client.connect();
    console.log(`Connected to ${config.name}`);

    const db = client.db();

    for (const [collectionName, collectionConfig] of Object.entries(config.collections)) {
      console.log(`\nCreating indexes for collection: ${collectionName}`);

      const collection = db.collection(collectionName);

      for (const indexSpec of collectionConfig.indexes) {
        try {
          const { key, name, ...options } = indexSpec;
          await collection.createIndex(key, { name, ...options });
          console.log(`  ✓ Created index: ${name}`);
        } catch (error) {
          if (error.code === 85 || error.code === 86) {
            console.log(`  ⚠ Index ${indexSpec.name} already exists (skipping)`);
          } else {
            console.error(`  ✗ Failed to create index ${indexSpec.name}:`, error.message);
          }
        }
      }
    }

    console.log('\n✓ All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// List all indexes for a database
async function listIndexes(dbName) {
  const config = databases[dbName];
  if (!config) {
    console.error(`Database "${dbName}" not found`);
    process.exit(1);
  }

  const client = new MongoClient(config.uri);

  try {
    await client.connect();
    const db = client.db();

    for (const collectionName of Object.keys(config.collections)) {
      console.log(`\n=== ${collectionName} ===`);
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();

      indexes.forEach((idx) => {
        console.log(`\nName: ${idx.name}`);
        console.log(`Keys: ${JSON.stringify(idx.key)}`);
        if (idx.unique) console.log('Unique: true');
        if (idx.sparse) console.log('Sparse: true');
        if (idx.expireAfterSeconds !== undefined) console.log(`TTL: ${idx.expireAfterSeconds}s`);
      });
    }
  } finally {
    await client.close();
  }
}

// Analyze index usage
async function analyzeIndexes(dbName) {
  const config = databases[dbName];
  if (!config) {
    console.error(`Database "${dbName}" not found`);
    process.exit(1);
  }

  const client = new MongoClient(config.uri);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n=== Index Usage Analysis ===\n');

    for (const collectionName of Object.keys(config.collections)) {
      console.log(`\n--- ${collectionName} ---`);
      const collection = db.collection(collectionName);

      // Get index stats
      const stats = await db.command({
        aggregate: collectionName,
        pipeline: [{ $indexStats: {} }],
        cursor: {}
      });

      if (stats.cursor.firstBatch.length === 0) {
        console.log('No index usage statistics available (collection may be empty)');
        continue;
      }

      stats.cursor.firstBatch.forEach((indexStat) => {
        console.log(`\nIndex: ${indexStat.name}`);
        console.log(`  Operations: ${indexStat.accesses.ops}`);
        console.log(`  Since: ${indexStat.accesses.since}`);

        if (indexStat.accesses.ops === 0) {
          console.log('  ⚠ WARNING: Unused index - consider dropping');
        }
      });
    }

    console.log('\n=== Recommendations ===');
    console.log('1. Drop indexes with 0 operations (if collection has been active)');
    console.log('2. Monitor slow query logs for missing indexes');
    console.log('3. Use explain() to verify query plans use intended indexes');
    console.log('4. Review compound indexes - order matters for query optimization');
  } finally {
    await client.close();
  }
}

// Drop a specific index
async function dropIndex(dbName, collectionName, indexName) {
  const config = databases[dbName];
  if (!config) {
    console.error(`Database "${dbName}" not found`);
    process.exit(1);
  }

  const client = new MongoClient(config.uri);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection(collectionName);

    await collection.dropIndex(indexName);
    console.log(`✓ Dropped index: ${indexName}`);
  } catch (error) {
    console.error(`Error dropping index: ${error.message}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Rebuild indexes (drop and recreate)
async function rebuildIndexes(dbName) {
  const config = databases[dbName];
  if (!config) {
    console.error(`Database "${dbName}" not found`);
    process.exit(1);
  }

  const client = new MongoClient(config.uri);

  try {
    await client.connect();
    const db = client.db();

    for (const collectionName of Object.keys(config.collections)) {
      console.log(`\nRebuilding indexes for: ${collectionName}`);
      const collection = db.collection(collectionName);

      // Drop all indexes except _id
      await collection.dropIndexes();
      console.log('  ✓ Dropped existing indexes');
    }

    // Recreate indexes
    await createIndexes(dbName);
  } finally {
    await client.close();
  }
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
MongoDB Index Management Tool

Usage:
  node manage-indexes.js <command> [options]

Commands:
  create <db>              Create all indexes for a database
  list <db>                List all indexes for a database
  analyze <db>             Analyze index usage and recommendations
  drop <db> <coll> <idx>   Drop a specific index
  rebuild <db>             Rebuild all indexes for a database
  create-all               Create indexes for all databases

Databases:
  products, categories, users, orders, auth

Examples:
  node manage-indexes.js create products
  node manage-indexes.js list orders
  node manage-indexes.js analyze users
  node manage-indexes.js drop orders orders trackingNumber_1
  node manage-indexes.js create-all
    `);
    process.exit(0);
  }

  switch (command) {
    case 'create':
      if (!args[1]) {
        console.error('Database name required');
        process.exit(1);
      }
      await createIndexes(args[1]);
      break;

    case 'list':
      if (!args[1]) {
        console.error('Database name required');
        process.exit(1);
      }
      await listIndexes(args[1]);
      break;

    case 'analyze':
      if (!args[1]) {
        console.error('Database name required');
        process.exit(1);
      }
      await analyzeIndexes(args[1]);
      break;

    case 'drop':
      if (!args[1] || !args[2] || !args[3]) {
        console.error('Usage: drop <db> <collection> <indexName>');
        process.exit(1);
      }
      await dropIndex(args[1], args[2], args[3]);
      break;

    case 'rebuild':
      if (!args[1]) {
        console.error('Database name required');
        process.exit(1);
      }
      await rebuildIndexes(args[1]);
      break;

    case 'create-all':
      for (const dbName of Object.keys(databases)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Creating indexes for: ${dbName}`);
        console.log('='.repeat(60));
        await createIndexes(dbName);
      }
      console.log('\n✓ All databases indexed successfully');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createIndexes,
  listIndexes,
  analyzeIndexes,
  dropIndex,
  rebuildIndexes
};
