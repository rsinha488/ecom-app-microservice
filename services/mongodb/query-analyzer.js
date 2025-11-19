/**
 * MongoDB Query Analyzer
 *
 * Analyzes query performance and provides optimization recommendations
 *
 * Usage:
 *   node query-analyzer.js <database> <collection> <query>
 *
 * Example:
 *   node query-analyzer.js products products '{"category":"electronics"}'
 */

const { MongoClient } = require('mongodb');

const databaseURIs = {
  products: process.env.PRODUCTS_MONGODB_URI || 'mongodb://localhost:27017/products_db',
  categories: process.env.CATEGORIES_MONGODB_URI || 'mongodb://localhost:27017/categories_db',
  users: process.env.USERS_MONGODB_URI || 'mongodb://localhost:27017/users_db',
  orders: process.env.ORDERS_MONGODB_URI || 'mongodb://localhost:27017/orders_db',
  auth: process.env.AUTH_MONGODB_URI || 'mongodb://localhost:27017/auth_db'
};

async function analyzeQuery(dbName, collectionName, queryStr, options = {}) {
  const uri = databaseURIs[dbName];
  if (!uri) {
    console.error(`Database "${dbName}" not found`);
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection(collectionName);

    // Parse query
    let query;
    try {
      query = JSON.parse(queryStr);
    } catch (error) {
      console.error('Invalid JSON query:', error.message);
      process.exit(1);
    }

    console.log('\n=== Query Analysis ===\n');
    console.log('Database:', dbName);
    console.log('Collection:', collectionName);
    console.log('Query:', JSON.stringify(query, null, 2));

    // Get explain plan
    console.log('\n=== Execution Plan ===\n');
    const explainResult = await collection.find(query).explain('executionStats');

    // Extract key metrics
    const executionStats = explainResult.executionStats;
    const winningPlan = explainResult.queryPlanner.winningPlan;

    console.log(`Execution Time: ${executionStats.executionTimeMillis}ms`);
    console.log(`Documents Examined: ${executionStats.totalDocsExamined}`);
    console.log(`Documents Returned: ${executionStats.nReturned}`);
    console.log(`Index Used: ${getIndexName(winningPlan)}`);

    // Calculate efficiency
    const efficiency = executionStats.nReturned / (executionStats.totalDocsExamined || 1);
    console.log(`Query Efficiency: ${(efficiency * 100).toFixed(2)}%`);

    // Performance assessment
    console.log('\n=== Performance Assessment ===\n');

    const warnings = [];
    const recommendations = [];

    // Check for collection scan
    if (winningPlan.stage === 'COLLSCAN') {
      warnings.push('⚠ COLLECTION SCAN detected - No index used!');
      recommendations.push('Create an index on the queried fields');
    }

    // Check efficiency
    if (efficiency < 0.5 && executionStats.totalDocsExamined > 100) {
      warnings.push(`⚠ Low efficiency (${(efficiency * 100).toFixed(2)}%) - Examining too many documents`);
      recommendations.push('Consider adding a more selective compound index');
    }

    // Check execution time
    if (executionStats.executionTimeMillis > 100) {
      warnings.push(`⚠ Slow query (${executionStats.executionTimeMillis}ms)`);
      if (winningPlan.stage !== 'COLLSCAN') {
        recommendations.push('Query is using an index but still slow - check index selectivity');
      }
    }

    // Check for regex without index
    if (JSON.stringify(query).includes('$regex') && winningPlan.stage === 'COLLSCAN') {
      warnings.push('⚠ Regex query without text index');
      recommendations.push('Consider creating a text index for search queries');
    }

    // Output warnings and recommendations
    if (warnings.length > 0) {
      console.log('Warnings:');
      warnings.forEach(w => console.log(`  ${w}`));
    } else {
      console.log('✓ Query is well optimized');
    }

    if (recommendations.length > 0) {
      console.log('\nRecommendations:');
      recommendations.forEach(r => console.log(`  • ${r}`));
    }

    // Show winning plan details
    console.log('\n=== Query Plan Details ===\n');
    console.log(JSON.stringify(winningPlan, null, 2));

    // Get current indexes
    console.log('\n=== Available Indexes ===\n');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Suggest index if needed
    if (winningPlan.stage === 'COLLSCAN') {
      console.log('\n=== Suggested Index ===\n');
      const suggestedIndex = generateIndexSuggestion(query);
      console.log('Create index with:');
      console.log(`db.${collectionName}.createIndex(${JSON.stringify(suggestedIndex)})`);
    }

  } finally {
    await client.close();
  }
}

// Extract index name from winning plan
function getIndexName(plan) {
  if (plan.stage === 'COLLSCAN') return 'None (Collection Scan)';
  if (plan.inputStage && plan.inputStage.indexName) return plan.inputStage.indexName;
  if (plan.indexName) return plan.indexName;
  return 'Unknown';
}

// Generate index suggestion based on query
function generateIndexSuggestion(query) {
  const fields = {};

  // Extract fields from query
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$')) continue;

    // Check if it's a range query
    if (typeof value === 'object' && value !== null) {
      if (value.$gt !== undefined || value.$gte !== undefined ||
          value.$lt !== undefined || value.$lte !== undefined) {
        fields[key] = 1; // Range queries benefit from ascending index
      } else if (value.$regex !== undefined) {
        fields[key] = 'text'; // Suggest text index for regex
      } else {
        fields[key] = 1;
      }
    } else {
      fields[key] = 1;
    }
  }

  return fields;
}

// Batch analyze common queries
async function analyzeCommonQueries(dbName) {
  const commonQueries = {
    products: [
      { query: '{"category":"electronics"}', description: 'Filter by category' },
      { query: '{"category":"electronics","inStock":true}', description: 'Category + availability' },
      { query: '{"price":{"$gte":100,"$lte":500}}', description: 'Price range' },
      { query: '{"$text":{"$search":"laptop"}}', description: 'Text search' }
    ],
    orders: [
      { query: '{"userId":"user123"}', description: 'User orders' },
      { query: '{"status":"pending"}', description: 'Pending orders' },
      { query: '{"userId":"user123","status":"delivered"}', description: 'User delivered orders' }
    ],
    users: [
      { query: '{"email":"user@example.com"}', description: 'Login query' },
      { query: '{"isActive":true,"role":"user"}', description: 'Active users by role' }
    ]
  };

  const queries = commonQueries[dbName];
  if (!queries) {
    console.error(`No common queries defined for ${dbName}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing Common Queries for: ${dbName}`);
  console.log('='.repeat(60));

  for (const { query, description } of queries) {
    console.log(`\n--- ${description} ---`);
    try {
      await analyzeQuery(dbName, dbName === 'products' ? 'products' : dbName, query);
    } catch (error) {
      console.error(`Error analyzing query: ${error.message}`);
    }
    console.log('\n');
  }
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
MongoDB Query Analyzer

Usage:
  node query-analyzer.js <database> <collection> <query>
  node query-analyzer.js batch <database>

Examples:
  node query-analyzer.js products products '{"category":"electronics"}'
  node query-analyzer.js orders orders '{"userId":"123","status":"pending"}'
  node query-analyzer.js batch products

Databases: products, categories, users, orders, auth
    `);
    process.exit(0);
  }

  if (args[0] === 'batch') {
    if (!args[1]) {
      console.error('Database name required for batch analysis');
      process.exit(1);
    }
    await analyzeCommonQueries(args[1]);
  } else {
    const [dbName, collectionName, query] = args;
    if (!dbName || !collectionName || !query) {
      console.error('Usage: node query-analyzer.js <database> <collection> <query>');
      process.exit(1);
    }
    await analyzeQuery(dbName, collectionName, query);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeQuery, analyzeCommonQueries };
