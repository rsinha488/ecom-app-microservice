/**
 * Database Migration Script: String Enums → Numeric Enums
 *
 * Migrates existing orders from string-based enums to numeric codes:
 * - paymentStatus: 'pending' → 1, 'paid' → 2, etc.
 * - paymentMethod: 'cash_on_delivery' → 4, etc.
 *
 * IMPORTANT: Backup database before running!
 * Command: mongodump --db orders_db --out ./backup-$(date +%Y%m%d)
 *
 * Usage: node migration-numeric-enums.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Enum mappings
const PAYMENT_STATUS_MAP = {
  'pending': 1,
  'paid': 2,
  'failed': 3,
  'refunded': 4
};

const PAYMENT_METHOD_MAP = {
  'credit_card': 1,
  'debit_card': 2,
  'paypal': 3,
  'cash_on_delivery': 4,
  'bank_transfer': 5,
  'upi': 6,
  'wallet': 7
};

async function migratePaymentEnums() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/orders_db';

  log('bright', '\n═══════════════════════════════════════════════════════════');
  log('cyan', '  Database Migration: String Enums → Numeric Enums');
  log('bright', '═══════════════════════════════════════════════════════════\n');

  try {
    // Connect to database
    log('blue', '📊 Connecting to MongoDB...');
    log('cyan', `   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    await mongoose.connect(MONGODB_URI);
    log('green', '✅ Connected successfully\n');

    const Order = mongoose.connection.collection('orders');

    // Get total count
    const totalOrders = await Order.countDocuments();
    log('blue', `📦 Total orders in database: ${totalOrders}\n`);

    if (totalOrders === 0) {
      log('yellow', '⚠️  No orders found. Migration not needed.');
      await mongoose.disconnect();
      return;
    }

    // Check current data types
    const sampleOrder = await Order.findOne({});
    const hasStringEnums =
      typeof sampleOrder.paymentStatus === 'string' ||
      typeof sampleOrder.paymentMethod === 'string';

    if (!hasStringEnums) {
      log('yellow', '⚠️  Orders already use numeric enums. Migration may have been run already.');
      log('yellow', '   Sample order:');
      log('cyan', `   - paymentStatus: ${sampleOrder.paymentStatus} (${typeof sampleOrder.paymentStatus})`);
      log('cyan', `   - paymentMethod: ${sampleOrder.paymentMethod} (${typeof sampleOrder.paymentMethod})\n`);

      const response = await promptUser('Continue anyway? (y/N): ');
      if (response.toLowerCase() !== 'y') {
        log('blue', 'Migration cancelled by user.');
        await mongoose.disconnect();
        return;
      }
    }

    // Confirm migration
    log('yellow', '⚠️  WARNING: This will modify all order documents in the database!');
    log('yellow', '⚠️  Make sure you have a backup before proceeding.\n');

    const confirmation = await promptUser('Continue with migration? (yes/NO): ');
    if (confirmation.toLowerCase() !== 'yes') {
      log('blue', 'Migration cancelled by user.');
      await mongoose.disconnect();
      return;
    }

    log('blue', '\n🔄 Starting migration...\n');

    // Migrate Payment Status
    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('cyan', 'STEP 1: Migrating paymentStatus');
    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let totalStatusMigrated = 0;
    for (const [oldValue, newValue] of Object.entries(PAYMENT_STATUS_MAP)) {
      const result = await Order.updateMany(
        { paymentStatus: oldValue },
        { $set: { paymentStatus: newValue } }
      );

      if (result.modifiedCount > 0) {
        log('green', `  ✅ "${oldValue}" → ${newValue}: ${result.modifiedCount} documents`);
        totalStatusMigrated += result.modifiedCount;
      }
    }

    if (totalStatusMigrated === 0) {
      log('yellow', '  ℹ️  No string paymentStatus values found to migrate');
    } else {
      log('green', `\n  Total paymentStatus migrated: ${totalStatusMigrated}\n`);
    }

    // Migrate Payment Method
    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('cyan', 'STEP 2: Migrating paymentMethod');
    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let totalMethodMigrated = 0;
    for (const [oldValue, newValue] of Object.entries(PAYMENT_METHOD_MAP)) {
      const result = await Order.updateMany(
        { paymentMethod: oldValue },
        { $set: { paymentMethod: newValue } }
      );

      if (result.modifiedCount > 0) {
        log('green', `  ✅ "${oldValue}" → ${newValue}: ${result.modifiedCount} documents`);
        totalMethodMigrated += result.modifiedCount;
      }
    }

    if (totalMethodMigrated === 0) {
      log('yellow', '  ℹ️  No string paymentMethod values found to migrate');
    } else {
      log('green', `\n  Total paymentMethod migrated: ${totalMethodMigrated}\n`);
    }

    // Verification
    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('cyan', 'STEP 3: Verification');
    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const verifyTotalOrders = await Order.countDocuments();
    const numericPaymentStatus = await Order.countDocuments({
      paymentStatus: { $type: 'number' }
    });
    const numericPaymentMethod = await Order.countDocuments({
      paymentMethod: { $type: 'number' }
    });

    const stringPaymentStatus = await Order.countDocuments({
      paymentStatus: { $type: 'string' }
    });
    const stringPaymentMethod = await Order.countDocuments({
      paymentMethod: { $type: 'string' }
    });

    log('blue', `  Total orders: ${verifyTotalOrders}`);
    log('green', `  PaymentStatus (numeric): ${numericPaymentStatus}/${verifyTotalOrders}`);
    log('green', `  PaymentMethod (numeric): ${numericPaymentMethod}/${verifyTotalOrders}`);

    if (stringPaymentStatus > 0) {
      log('red', `  PaymentStatus (still string): ${stringPaymentStatus}`);
    }
    if (stringPaymentMethod > 0) {
      log('red', `  PaymentMethod (still string): ${stringPaymentMethod}`);
    }

    // Sample verification
    const samples = await Order.find({}).limit(3).toArray();
    log('blue', '\n  Sample orders after migration:');
    samples.forEach((order, index) => {
      log('cyan', `\n  Order ${index + 1}:`);
      log('cyan', `    - Order Number: ${order.orderNumber}`);
      log('cyan', `    - Payment Status: ${order.paymentStatus} (${typeof order.paymentStatus})`);
      log('cyan', `    - Payment Method: ${order.paymentMethod} (${typeof order.paymentMethod})`);
    });

    // Final status
    log('bright', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (numericPaymentStatus === verifyTotalOrders && numericPaymentMethod === verifyTotalOrders) {
      log('green', '✅ MIGRATION SUCCESSFUL!');
      log('green', '✅ All orders now use numeric enum values');
    } else {
      log('yellow', '⚠️  MIGRATION INCOMPLETE');
      log('yellow', '⚠️  Some documents may not have been migrated');
      log('yellow', '⚠️  Please review the logs above for details');
    }

    log('bright', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    log('blue', '📝 Summary:');
    log('cyan', `   - PaymentStatus migrated: ${totalStatusMigrated}`);
    log('cyan', `   - PaymentMethod migrated: ${totalMethodMigrated}`);
    log('cyan', `   - Total documents: ${verifyTotalOrders}\n`);

    await mongoose.disconnect();
    log('green', '✅ Disconnected from database');
    log('green', '✅ Migration complete!\n');

  } catch (error) {
    log('red', '\n❌ Migration failed!');
    log('red', `❌ Error: ${error.message}\n`);
    log('yellow', 'Stack trace:');
    console.error(error);
    log('yellow', '\n💡 Troubleshooting:');
    log('yellow', '   1. Check database connection');
    log('yellow', '   2. Verify MONGODB_URI in .env.local');
    log('yellow', '   3. Ensure database has orders collection');
    log('yellow', '   4. Check MongoDB is running: mongosh --eval "db.version()"');
    log('yellow', '   5. Restore from backup if needed: mongorestore --db orders_db ./backup-YYYYMMDD\n');

    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect error
    }

    process.exit(1);
  }
}

// Helper function to prompt user for input
function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(colors.yellow + question + colors.reset, answer => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

// Run migration
if (require.main === module) {
  migratePaymentEnums();
}

module.exports = { migratePaymentEnums };
