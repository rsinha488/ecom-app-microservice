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
  STOCK_RELEASE: 'inventory.release',
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  ORDER_CANCELLED: 'order.cancelled'
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

    // Subscribe to inventory management and payment topics
    await subscribeToTopics([
      TOPICS.STOCK_RESERVE,
      TOPICS.STOCK_RELEASE,
      TOPICS.PAYMENT_INITIATED,
      TOPICS.PAYMENT_COMPLETED,
      TOPICS.PAYMENT_FAILED,
      TOPICS.ORDER_CANCELLED
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

      case TOPICS.PAYMENT_INITIATED:
        await handlePaymentInitiated(event);
        break;

      case TOPICS.PAYMENT_COMPLETED:
        await handlePaymentCompleted(event);
        break;

      case TOPICS.PAYMENT_FAILED:
        await handlePaymentFailed(event);
        break;

      case TOPICS.ORDER_CANCELLED:
        await handleOrderCancelled(event);
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

/**
 * Handle payment.initiated event
 * Reserve stock when payment is initiated
 *
 * @param {Object} event - Payment initiated event
 */
async function handlePaymentInitiated(event) {
  try {
    const { orderId, items, userId } = event.data;

    console.log(`🔒 Reserving stock for payment initiated - Order: ${orderId}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid payment initiated event: missing items');
      return;
    }

    // Reserve stock for the order
    const result = await reserveStock(orderId, items);

    if (result.success) {
      console.log(`✅ Stock reserved for order ${orderId}:`, {
        reserved: result.reserved.length
      });
    } else {
      console.error(`❌ Stock reservation failed for order ${orderId}:`, {
        failed: result.failed
      });
      // In production: publish stock.reservation.failed event
      // This would trigger payment cancellation in SAGA
    }
  } catch (error) {
    console.error(`❌ Error handling payment initiated:`, error.message);
    throw error;
  }
}

/**
 * Handle payment.completed event
 * Confirm stock deduction when payment succeeds
 *
 * @param {Object} event - Payment completed event
 */
async function handlePaymentCompleted(event) {
  try {
    const { orderId, items } = event.data;

    console.log(`✅ Confirming stock deduction for completed payment - Order: ${orderId}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid payment completed event: missing items');
      return;
    }

    // Stock is already reserved from payment.initiated
    // This is confirmation that the reservation can be permanently deducted
    // No action needed as stock was already reserved
    // In a more complex system, you might update reservation status

    console.log(`✅ Stock confirmed for order ${orderId}`);
  } catch (error) {
    console.error(`❌ Error handling payment completed:`, error.message);
    throw error;
  }
}

/**
 * Handle payment.failed event
 * Release reserved stock when payment fails
 *
 * @param {Object} event - Payment failed event
 */
async function handlePaymentFailed(event) {
  try {
    const { orderId, items, failureReason } = event.data;

    console.log(`🔓 Releasing stock for failed payment - Order: ${orderId}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid payment failed event: missing items');
      return;
    }

    // Release previously reserved stock
    const result = await releaseStock(orderId, items, `Payment failed: ${failureReason}`);

    if (result.success) {
      console.log(`✅ Stock released for order ${orderId}:`, {
        released: result.released.length
      });
    } else {
      console.warn(`⚠️  Stock release partially failed for order ${orderId}:`, {
        released: result.released.length,
        failed: result.failed.length
      });
    }
  } catch (error) {
    console.error(`❌ Error handling payment failed:`, error.message);
    throw error;
  }
}

/**
 * Handle order.cancelled event
 * Release stock when order is cancelled
 *
 * @param {Object} event - Order cancelled event
 */
async function handleOrderCancelled(event) {
  try {
    const { orderId, items, reason } = event.data || event;

    console.log(`🔓 Releasing stock for cancelled order: ${orderId}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid order cancelled event: missing items');
      return;
    }

    // Release stock
    const result = await releaseStock(orderId, items, reason || 'Order cancelled');

    if (result.success) {
      console.log(`✅ Stock released for cancelled order ${orderId}:`, {
        released: result.released.length
      });
    } else {
      console.warn(`⚠️  Stock release partially failed for cancelled order ${orderId}:`, {
        released: result.released.length,
        failed: result.failed.length
      });
    }
  } catch (error) {
    console.error(`❌ Error handling order cancelled:`, error.message);
    throw error;
  }
}

module.exports = {
  initializeConsumer,
  TOPICS
};
