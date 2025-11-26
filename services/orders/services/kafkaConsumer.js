/**
 * Kafka Consumer Service for Order Service
 *
 * Consumes payment events from Payment service and handles order updates
 * as part of the SAGA pattern for distributed transactions.
 *
 * @module services/kafkaConsumer
 */

const { kafka } = require('../config/kafka');
const Order = require('../models/Order');
const { ORDER_STATUS } = require('../constants/orderStatus');
const { PAYMENT_STATUS_CODE } = require('../constants/paymentStatus');
const { publishEvent } = require('./kafkaProducer');
const mongoose = require('mongoose');

// Create consumer instance
const consumer = kafka.consumer({
  groupId: 'order-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Track processed events to prevent duplicate processing (idempotency)
const processedEvents = new Set();

/**
 * Start Kafka consumer
 *
 * Subscribes to payment events and processes them
 */
async function startConsumer() {
  try {
    await consumer.connect();
    console.log('[Kafka Consumer] Connected successfully');

    // Subscribe to payment events
    await consumer.subscribe({
      topics: [
        'payment.initiated',
        'payment.completed',
        'payment.failed',
        'payment.cancelled'
      ],
      fromBeginning: false // Only process new messages
    });

    console.log('[Kafka Consumer] Subscribed to payment topics');

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());

          console.log(`[Kafka Consumer] Received event from ${topic}:`, {
            eventType: event.eventType,
            eventId: event.eventId,
            orderId: event.data?.orderId
          });

          // Idempotency check
          if (processedEvents.has(event.eventId)) {
            console.log('[Kafka Consumer] Event already processed, skipping:', event.eventId);
            return;
          }

          // Route to appropriate handler
          switch (topic) {
            case 'payment.initiated':
              await handlePaymentInitiated(event);
              break;
            case 'payment.completed':
              await handlePaymentCompleted(event);
              break;
            case 'payment.failed':
              await handlePaymentFailed(event);
              break;
            case 'payment.cancelled':
              await handlePaymentCancelled(event);
              break;
            default:
              console.log('[Kafka Consumer] Unknown topic:', topic);
          }

          // Mark event as processed
          processedEvents.add(event.eventId);

          // Clean up old events (keep last 10000)
          if (processedEvents.size > 10000) {
            const iterator = processedEvents.values();
            processedEvents.delete(iterator.next().value);
          }

        } catch (error) {
          console.error('[Kafka Consumer] Error processing message:', error);
          // In production, send to dead letter queue
        }
      }
    });

    console.log('[Kafka Consumer] Consumer running');
  } catch (error) {
    console.error('[Kafka Consumer] Failed to start consumer:', error);
    throw error;
  }
}

/**
 * Handle payment.initiated event
 *
 * Updates order status to PROCESSING when payment is initiated
 *
 * @param {Object} event - Payment initiated event
 */
async function handlePaymentInitiated(event) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { orderId, paymentId, amount } = event.data;

    console.log('[Kafka Consumer] Handling payment initiated for order:', orderId);

    // Find order
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      console.error('[Kafka Consumer] Order not found:', orderId);
      await session.abortTransaction();
      return;
    }

    // Update order to PROCESSING
    if (order.status === ORDER_STATUS.PENDING) {
      order.status = ORDER_STATUS.PROCESSING;
      order.paymentStatus = PAYMENT_STATUS_CODE.PENDING;

      await order.save({ session });

      console.log('[Kafka Consumer] Order status updated to PROCESSING:', orderId);

      // Publish order.updated event
      await publishEvent('order.updated', {
        eventType: 'order.updated',
        orderId: orderId.toString(),
        userId: order.userId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        correlationId: event.metadata?.correlationId
      }, orderId.toString());
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('[Kafka Consumer] Error handling payment initiated:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Handle payment.completed event
 *
 * Confirms order and updates payment status when payment succeeds
 *
 * @param {Object} event - Payment completed event
 */
async function handlePaymentCompleted(event) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { orderId, paymentId, amount, transactionId } = event.data;

    console.log('[Kafka Consumer] Handling payment completed for order:', orderId);

    // Find order
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      console.error('[Kafka Consumer] Order not found:', orderId);
      await session.abortTransaction();
      return;
    }

    // Update order status to confirmed and payment status to PAID
    order.status = ORDER_STATUS.PROCESSING; // Or ORDER_STATUS.CONFIRMED if you have it
    order.paymentStatus = PAYMENT_STATUS_CODE.PAID;

    // You might want to add payment reference to order
    if (!order.metadata) {
      order.metadata = {};
    }
    if (order.metadata instanceof Map) {
      order.metadata.set('paymentId', paymentId);
      order.metadata.set('transactionId', transactionId);
    }

    await order.save({ session });

    console.log('[Kafka Consumer] Order confirmed, payment status updated to PAID:', orderId);

    // Publish order.confirmed event
    await publishEvent('order.confirmed', {
      eventType: 'order.confirmed',
      orderId: orderId.toString(),
      userId: order.userId,
      paymentId,
      transactionId,
      items: order.items,
      totalAmount: order.totalAmount,
      correlationId: event.metadata?.correlationId
    }, orderId.toString());

    await session.commitTransaction();

    console.log('[Kafka Consumer] Published order.confirmed event');
  } catch (error) {
    await session.abortTransaction();
    console.error('[Kafka Consumer] Error handling payment completed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Handle payment.failed event
 *
 * Cancels order when payment fails and triggers compensating transaction
 *
 * @param {Object} event - Payment failed event
 */
async function handlePaymentFailed(event) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { orderId, paymentId, failureReason } = event.data;

    console.log('[Kafka Consumer] Handling payment failed for order:', orderId);

    // Find order
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      console.error('[Kafka Consumer] Order not found:', orderId);
      await session.abortTransaction();
      return;
    }

    // Cancel order
    order.status = ORDER_STATUS.CANCELLED;
    order.paymentStatus = PAYMENT_STATUS_CODE.FAILED;
    order.cancelledAt = new Date();

    await order.save({ session });

    console.log('[Kafka Consumer] Order cancelled due to payment failure:', orderId);

    // Publish order.cancelled event (for inventory release)
    await publishEvent('order.cancelled', {
      eventType: 'order.cancelled',
      orderId: orderId.toString(),
      userId: order.userId,
      reason: `Payment failed: ${failureReason}`,
      items: order.items,
      cancelledAt: order.cancelledAt,
      correlationId: event.metadata?.correlationId
    }, orderId.toString());

    await session.commitTransaction();

    console.log('[Kafka Consumer] Published order.cancelled event for inventory release');
  } catch (error) {
    await session.abortTransaction();
    console.error('[Kafka Consumer] Error handling payment failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Handle payment.cancelled event
 *
 * Cancels order when payment is cancelled by user
 *
 * @param {Object} event - Payment cancelled event
 */
async function handlePaymentCancelled(event) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { orderId, cancelReason } = event.data;

    console.log('[Kafka Consumer] Handling payment cancelled for order:', orderId);

    // Find order
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      console.error('[Kafka Consumer] Order not found:', orderId);
      await session.abortTransaction();
      return;
    }

    // Only cancel if order is not already in a terminal state
    if (order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.DELIVERED) {
      order.status = ORDER_STATUS.CANCELLED;
      order.paymentStatus = PAYMENT_STATUS_CODE.FAILED;
      order.cancelledAt = new Date();

      await order.save({ session });

      console.log('[Kafka Consumer] Order cancelled:', orderId);

      // Publish order.cancelled event
      await publishEvent('order.cancelled', {
        eventType: 'order.cancelled',
        orderId: orderId.toString(),
        userId: order.userId,
        reason: cancelReason || 'Payment cancelled',
        items: order.items,
        cancelledAt: order.cancelledAt,
        correlationId: event.metadata?.correlationId
      }, orderId.toString());
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('[Kafka Consumer] Error handling payment cancelled:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Disconnect consumer gracefully
 */
async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    console.log('[Kafka Consumer] Disconnected successfully');
  } catch (error) {
    console.error('[Kafka Consumer] Error disconnecting:', error);
  }
}

module.exports = {
  startConsumer,
  disconnectConsumer
};
