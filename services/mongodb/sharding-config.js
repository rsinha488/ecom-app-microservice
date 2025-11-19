/**
 * MongoDB Atlas Sharding Configuration
 *
 * This file contains the sharding strategy for each collection
 * in the microservices e-commerce platform.
 *
 * IMPORTANT: Sharding must be enabled in MongoDB Atlas cluster settings
 * before running these commands.
 */

const shardingConfig = {
  // Products Database - High read/write volume
  products_db: {
    database: 'products_db',
    collections: {
      products: {
        shardKey: { _id: 'hashed' },
        reason: 'Even distribution of products across shards for write scaling',
        alternativeKeys: [
          {
            key: { category: 1, _id: 1 },
            reason: 'Range-based sharding for category-specific queries',
            useCase: 'If most queries filter by category'
          }
        ],
        preShardingSteps: [
          'db.products.createIndex({ _id: "hashed" })',
          'sh.enableSharding("products_db")',
          'sh.shardCollection("products_db.products", { _id: "hashed" })'
        ],
        zoneSharding: {
          // Optional: Geographic zones for region-specific data
          enabled: false,
          zones: [
            { zone: 'NA', min: { region: 'north_america' }, max: { region: 'north_america\\uffff' } },
            { zone: 'EU', min: { region: 'europe' }, max: { region: 'europe\\uffff' } },
            { zone: 'APAC', min: { region: 'asia_pacific' }, max: { region: 'asia_pacific\\uffff' } }
          ]
        }
      }
    }
  },

  // Orders Database - Very high write volume, user-specific
  orders_db: {
    database: 'orders_db',
    collections: {
      orders: {
        shardKey: { userId: 1, createdAt: 1 },
        reason: 'Range-based sharding by userId for user-specific queries with chronological ordering',
        alternativeKeys: [
          {
            key: { userId: 'hashed' },
            reason: 'Even distribution if user query patterns are unpredictable',
            useCase: 'If userId distribution is highly skewed'
          },
          {
            key: { orderNumber: 1 },
            reason: 'Direct order lookup optimization',
            useCase: 'If most queries are by orderNumber'
          }
        ],
        preShardingSteps: [
          'db.orders.createIndex({ userId: 1, createdAt: 1 })',
          'sh.enableSharding("orders_db")',
          'sh.shardCollection("orders_db.orders", { userId: 1, createdAt: 1 })'
        ],
        considerations: [
          'Ensure userId has good cardinality',
          'Monitor for hotspots if certain users have high order volumes',
          'Consider time-based zones for archiving old orders'
        ]
      }
    }
  },

  // Users Database - Moderate read/write, user authentication
  users_db: {
    database: 'users_db',
    collections: {
      users: {
        shardKey: { _id: 'hashed' },
        reason: 'Even distribution for user authentication and profile queries',
        alternativeKeys: [
          {
            key: { email: 1 },
            reason: 'Natural shard key for email-based lookups',
            useCase: 'If email uniqueness can be guaranteed at application level'
          }
        ],
        preShardingSteps: [
          'db.users.createIndex({ _id: "hashed" })',
          'sh.enableSharding("users_db")',
          'sh.shardCollection("users_db.users", { _id: "hashed" })'
        ],
        globalIndexes: [
          '{ email: 1 }  // Required for login lookups across shards'
        ]
      }
    }
  },

  // Categories Database - Low volume, read-heavy
  categories_db: {
    database: 'categories_db',
    collections: {
      categories: {
        shardKey: null,
        reason: 'Low volume - sharding not recommended. Use replication for read scaling',
        recommendations: [
          'Use read replicas instead of sharding',
          'Implement aggressive caching (Redis)',
          'Consider keeping entire collection in memory',
          'Monitor size - shard only if exceeds 100k documents'
        ]
      }
    }
  },

  // Auth Database - Session management, high read volume
  auth_db: {
    database: 'auth_db',
    collections: {
      users: {
        shardKey: { _id: 'hashed' },
        reason: 'Even distribution for authentication requests',
        preShardingSteps: [
          'db.users.createIndex({ _id: "hashed" })',
          'sh.enableSharding("auth_db")',
          'sh.shardCollection("auth_db.users", { _id: "hashed" })'
        ]
      },
      authorizationcodes: {
        shardKey: { code: 'hashed' },
        reason: 'Short-lived documents with high write volume during auth flows',
        preShardingSteps: [
          'db.authorizationcodes.createIndex({ code: "hashed" })',
          'sh.shardCollection("auth_db.authorizationcodes", { code: "hashed" })'
        ],
        ttl: {
          enabled: true,
          field: 'expires_at',
          seconds: 0
        }
      },
      refreshtokens: {
        shardKey: { token: 'hashed' },
        reason: 'Token-based lookups with even distribution',
        preShardingSteps: [
          'db.refreshtokens.createIndex({ token: "hashed" })',
          'sh.shardCollection("auth_db.refreshtokens", { token: "hashed" })'
        ],
        ttl: {
          enabled: true,
          field: 'expires_at',
          seconds: 0
        }
      },
      clients: {
        shardKey: null,
        reason: 'Very low volume - OAuth2 client configurations',
        recommendations: [
          'Do not shard - typically < 100 documents',
          'Use caching for client lookups'
        ]
      }
    }
  }
};

/**
 * Sharding Best Practices
 */
const bestPractices = {
  shardKeySelection: {
    goodCardinality: 'Shard key should have many unique values',
    evenDistribution: 'Data should be evenly distributed across shard key values',
    avoidMonotonicity: 'Avoid always-increasing values (like timestamps) for hashed sharding',
    queryPatterns: 'Shard key should align with most common query patterns'
  },

  hashVsRange: {
    hashed: {
      pros: [
        'Even distribution of data',
        'Prevents hotspots',
        'Good for random access patterns'
      ],
      cons: [
        'No range-based queries on shard key',
        'Scatter-gather for sorted results',
        'Cannot use zone sharding'
      ],
      useCases: [
        'User IDs',
        'Product IDs',
        'Session tokens',
        'Random access patterns'
      ]
    },
    range: {
      pros: [
        'Efficient range queries',
        'Sorted data within shards',
        'Supports zone sharding',
        'Natural data organization'
      ],
      cons: [
        'Risk of hotspots',
        'Uneven distribution if data is skewed',
        'Monotonic keys cause write bottlenecks'
      ],
      useCases: [
        'Date ranges',
        'Geographic data',
        'Category-based partitioning',
        'Tenant/customer-based sharding'
      ]
    }
  },

  avoidPatterns: [
    'Using auto-incrementing IDs as range shard keys (creates hotspots)',
    'Low cardinality shard keys (e.g., boolean, small enum)',
    'Shard keys that don\'t match query patterns',
    'Sharding small collections (< 100k documents)',
    'Using frequently updated fields as shard keys'
  ],

  monitoring: [
    'sh.status() - Check shard distribution',
    'db.collection.getShardDistribution() - Analyze data distribution',
    'db.printShardingStatus() - Detailed sharding status',
    'Monitor chunk migrations in Atlas UI',
    'Set up alerts for unbalanced chunks'
  ]
};

/**
 * When to Shard?
 */
const shardingDecisionTree = {
  doNotShard: {
    conditions: [
      'Collection size < 100k documents',
      'Data size < 50GB',
      'Single geographic region',
      'Read-heavy workload with caching',
      'Low write throughput'
    ],
    alternatives: [
      'Use read replicas for scaling reads',
      'Implement Redis caching',
      'Optimize indexes',
      'Use connection pooling'
    ]
  },

  considerSharding: {
    conditions: [
      'Collection size > 500k documents',
      'Data size > 100GB',
      'High write throughput (> 1000 writes/sec)',
      'Geographic distribution requirements',
      'Horizontal scaling needed'
    ],
    steps: [
      'Analyze query patterns',
      'Choose appropriate shard key',
      'Test with representative data',
      'Plan migration strategy',
      'Monitor post-sharding performance'
    ]
  }
};

module.exports = {
  shardingConfig,
  bestPractices,
  shardingDecisionTree
};
