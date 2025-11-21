/**
 * Kafka Consumer Service
 *
 * Listens to order events from Kafka and processes stock management operations.
 * Handles stock reservation and release based on order lifecycle events.
 *
 * @module services/kafkaConsumer
 */

const { subscribeToTopics, startConsuming } = require('../config/kafka');
const { reserveStock, releaseStock } = require('./stockManager');

// Topics to subscribe to
const TOPICS = {
  STOCK_RESERVE: 'inventory.reserve',
  STOCK_RELEASE: 'inventory.release'
};

/**
 * Initialize Kafka consumer and start processing messages
 * Sets up subscription and message handlers
 *
 * @returns {Promise<void>}
 */
async function initializeConsumer() {
  try {
    console.log('🚀 Initializing Kafka consumer for Products service...');

    // Subscribe to inventory management topics
    await subscribeToTopics([
      TOPICS.STOCK_RESERVE,
      TOPICS.STOCK_RELEASE
    ]);

    // Start consuming messages
    await startConsuming(handleMessage);

    console.log('✅ Kafka consumer initialized and listening for events');
  } catch (error) {
    console.error('❌ Failed to initialize Kafka consumer:', error.message);
    throw error;
  }
}

/**
 * Handle incoming Kafka messages
 * Routes messages to appropriate handlers based on topic
 *
 * @param {Object} messageData - Message data from Kafka
 * @param {string} messageData.topic - Kafka topic name
 * @param {number} messageData.partition - Partition number
 * @param {Object} messageData.message - Raw Kafka message
 * @param {Object} messageData.event - Parsed event data
 * @returns {Promise<void>}
 */
async function handleMessage({ topic, partition, message, event }) {
  try {
    console.log(`📨 Processing message from topic '${topic}':`, event.eventType);

    switch (topic) {
      case TOPICS.STOCK_RESERVE:
        await handleStockReserveRequest(event);
        break;

      case TOPICS.STOCK_RELEASE:
        await handleStockReleaseRequest(event);
        break;

      default:
        console.warn(`⚠️  Unknown topic: ${topic}`);
    }
  } catch (error) {
    console.error(`❌ Error handling message from ${topic}:`, error.message);
    throw error; // Re-throw to prevent offset commit
  }
}

/**
 * Handle stock reservation request
 * Called when a new order is created
 *
 * @param {Object} event - Stock reserve event
 * @param {string} event.orderId - Order ID
 * @param {string} event.orderNumber - Human-readable order number
 * @param {Array<Object>} event.items - Items to reserve
 * @returns {Promise<void>}
 */
async function handleStockReserveRequest(event) {
  try {
    const { orderId, orderNumber, items } = event;

    console.log(`🔒 Processing stock reservation for order ${orderNumber}`);

    // Validate event data
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid stock reserve event: missing orderId or items');
      return;
    }

    // Attempt to reserve stock
    const result = await reserveStock(orderId, items);

    if (result.success) {
      console.log(`✅ Stock reservation completed for order ${orderNumber}:`, {
        reserved: result.reserved.length,
        orderId
      });

      // TODO: Publish confirmation event back to Orders service if needed
      // await publishStockReserveSuccess(orderId, result);
    } else {
      console.error(`❌ Stock reservation failed for order ${orderNumber}:`, {
        failed: result.failed,
        orderId
      });

      // TODO: Publish failure event to Orders service to cancel/hold order
      // await publishStockReserveFailed(orderId, result);
    }
  } catch (error) {
    console.error(`❌ Critical error processing stock reserve request:`, error.message);
    throw error;
  }
}

/**
 * Handle stock release request
 * Called when an order is cancelled or failed
 *
 * @param {Object} event - Stock release event
 * @param {string} event.orderId - Order ID
 * @param {string} event.orderNumber - Human-readable order number
 * @param {Array<Object>} event.items - Items to release
 * @param {string} event.reason - Reason for release
 * @returns {Promise<void>}
 */
async function handleStockReleaseRequest(event) {
  try {
    const { orderId, orderNumber, items, reason } = event;

    console.log(`🔓 Processing stock release for order ${orderNumber} (reason: ${reason})`);

    // Validate event data
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid stock release event: missing orderId or items');
      return;
    }

    // Release stock back to inventory
    const result = await releaseStock(orderId, items, reason);

    if (result.success) {
      console.log(`✅ Stock release completed for order ${orderNumber}:`, {
        released: result.released.length,
        orderId
      });

      // TODO: Publish confirmation event if needed
      // await publishStockReleaseSuccess(orderId, result);
    } else {
      console.warn(`⚠️  Stock release partially failed for order ${orderNumber}:`, {
        released: result.released.length,
        failed: result.failed.length,
        orderId
      });

      // TODO: Publish partial failure event for manual review
      // await publishStockReleasePartialFailure(orderId, result);
    }
  } catch (error) {
    console.error(`❌ Critical error processing stock release request:`, error.message);
    throw error;
  }
}

module.exports = {
  initializeConsumer,
  TOPICS
};
