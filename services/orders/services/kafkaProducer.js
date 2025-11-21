/**
 * Kafka Producer Service
 *
 * Handles publishing order events to Kafka topics.
 * This service bridges the local EventEmitter events to Kafka for inter-service communication.
 *
 * @module services/kafkaProducer
 */

const { publishEvent } = require('../config/kafka');
const { ORDER_STATUS } = require('../constants/orderStatus');

// Kafka topic names
const TOPICS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  STOCK_RESERVE: 'inventory.reserve',
  STOCK_RELEASE: 'inventory.release'
};

/**
 * Publish order created event
 * Triggers stock reservation in Products service
 *
 * @param {Object} order - Order document
 * @returns {Promise<void>}
 */
async function publishOrderCreated(order) {
  try {
    // Publish to order.created topic for analytics/logging
    await publishEvent(TOPICS.ORDER_CREATED, {
      eventType: 'ORDER_CREATED',
      orderId: order._id.toString(),
      userId: order.userId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      items: order.items,
      createdAt: order.createdAt
    }, order._id.toString());

    // Publish stock reservation request
    await publishEvent(TOPICS.STOCK_RESERVE, {
      eventType: 'STOCK_RESERVE_REQUEST',
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      })),
      timestamp: new Date().toISOString()
    }, order._id.toString());

    console.log(`✅ Published order created events for order ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to publish order created event:`, error.message);
    // Don't throw - this is async event publishing, shouldn't block order creation
  }
}

/**
 * Publish order status changed event
 * Notifies other services of status transitions
 *
 * @param {Object} data - Status change data
 * @param {Object} data.order - Updated order document
 * @param {number} data.oldStatus - Previous status code
 * @param {number} data.newStatus - New status code
 * @param {string} data.oldStatusLabel - Previous status label
 * @param {string} data.newStatusLabel - New status label
 * @returns {Promise<void>}
 */
async function publishOrderStatusChanged(data) {
  try {
    const { order, oldStatus, newStatus, oldStatusLabel, newStatusLabel } = data;

    await publishEvent(TOPICS.ORDER_STATUS_CHANGED, {
      eventType: 'ORDER_STATUS_CHANGED',
      orderId: order._id.toString(),
      userId: order.userId,
      orderNumber: order.orderNumber,
      oldStatus,
      newStatus,
      oldStatusLabel,
      newStatusLabel,
      timestamp: new Date().toISOString()
    }, order._id.toString());

    console.log(`✅ Published status change event: ${order.orderNumber} (${oldStatusLabel} → ${newStatusLabel})`);
  } catch (error) {
    console.error(`❌ Failed to publish status changed event:`, error.message);
  }
}

/**
 * Publish order cancelled event
 * Triggers stock restoration in Products service
 *
 * @param {Object} order - Cancelled order document
 * @returns {Promise<void>}
 */
async function publishOrderCancelled(order) {
  try {
    // Publish cancellation event
    await publishEvent(TOPICS.ORDER_CANCELLED, {
      eventType: 'ORDER_CANCELLED',
      orderId: order._id.toString(),
      userId: order.userId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      items: order.items,
      cancelledAt: order.cancelledAt || new Date().toISOString()
    }, order._id.toString());

    // Publish stock release request to restore inventory
    await publishEvent(TOPICS.STOCK_RELEASE, {
      eventType: 'STOCK_RELEASE_REQUEST',
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      reason: 'ORDER_CANCELLED',
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity
      })),
      timestamp: new Date().toISOString()
    }, order._id.toString());

    console.log(`✅ Published order cancellation events for order ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to publish order cancelled event:`, error.message);
  }
}

/**
 * Publish order completed event
 * Triggers completion workflows (reviews, analytics, etc.)
 *
 * @param {Object} order - Completed/delivered order document
 * @returns {Promise<void>}
 */
async function publishOrderCompleted(order) {
  try {
    await publishEvent(TOPICS.ORDER_COMPLETED, {
      eventType: 'ORDER_COMPLETED',
      orderId: order._id.toString(),
      userId: order.userId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      items: order.items,
      deliveredAt: order.deliveredAt || new Date().toISOString()
    }, order._id.toString());

    console.log(`✅ Published order completion event for order ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to publish order completed event:`, error.message);
  }
}

/**
 * Publish order updated event (generic)
 * For non-status updates like address changes
 *
 * @param {Object} order - Updated order document
 * @param {Object} changes - Fields that were changed
 * @returns {Promise<void>}
 */
async function publishOrderUpdated(order, changes = {}) {
  try {
    await publishEvent(TOPICS.ORDER_STATUS_CHANGED, {
      eventType: 'ORDER_UPDATED',
      orderId: order._id.toString(),
      userId: order.userId,
      orderNumber: order.orderNumber,
      changes,
      timestamp: new Date().toISOString()
    }, order._id.toString());

    console.log(`✅ Published order updated event for order ${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to publish order updated event:`, error.message);
  }
}

module.exports = {
  TOPICS,
  publishOrderCreated,
  publishOrderStatusChanged,
  publishOrderCancelled,
  publishOrderCompleted,
  publishOrderUpdated
};
