/**
 * Kafka Consumer Service
 *
 * Consumes events from other services (Order, Product) and handles
 * payment-related actions based on those events.
 *
 * @module services/kafkaConsumer
 */

const { consumer } = require('../config/kafka');
const Payment = require('../models/Payment');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const { publishPaymentCancelled, publishSagaCompensation } = require('./kafkaProducer');
const mongoose = require('mongoose');

/**
 * Start consuming messages from Kafka topics
 */
async function startConsumer() {
  try {
    // Subscribe to relevant topics
    await consumer.subscribe({
      topics: [
        'order.created',
        'order.cancelled',
        'order.status.changed',
        'saga.payment.compensate'
      ],
      fromBeginning: false // Only consume new messages
    });

    console.log('[Kafka Consumer] Subscribed to topics');

    // Start consuming
    await consumer.run({
      // Process each message
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());

          console.log(`[Kafka Consumer] Received event from ${topic}:`, {
            eventType: event.eventType,
            eventId: event.eventId,
            partition,
            offset: message.offset
          });

          // Route to appropriate handler
          switch (topic) {
            case 'order.created':
              await handleOrderCreated(event);
              break;

            case 'order.cancelled':
              await handleOrderCancelled(event);
              break;

            case 'order.status.changed':
              await handleOrderStatusChanged(event);
              break;

            case 'saga.payment.compensate':
              await handleSagaCompensation(event);
              break;

            default:
              console.log(`[Kafka Consumer] Unhandled topic: ${topic}`);
          }
        } catch (error) {
          console.error(`[Kafka Consumer] Error processing message from ${topic}:`, error);
          // Don't throw - we want to continue processing other messages
          // In production, send to dead letter queue
        }
      },

      // Handle errors
      eachBatchAutoResolve: false,
      partitionsConsumedConcurrently: 3
    });

    console.log('[Kafka Consumer] Started successfully');
  } catch (error) {
    console.error('[Kafka Consumer] Failed to start:', error);
    throw error;
  }
}

/**
 * Handle Order Created Event
 *
 * When an order is created, verify payment exists or create placeholder.
 * This ensures order-payment consistency.
 *
 * @param {Object} event - Order created event
 */
async function handleOrderCreated(event) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, userId, totalAmount, items } = event;

    console.log('[SAGA] Handling order created:', orderId);

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ orderId });

    if (existingPayment) {
      console.log('[SAGA] Payment already exists for order:', orderId);
      await session.commitTransaction();
      return;
    }

    // Note: In most cases, payment is created BEFORE order
    // This handler is for edge cases or reverse flows
    console.log('[SAGA] Order created without payment - awaiting payment initiation');

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('[SAGA] Error handling order created:', error);
  } finally {
    session.endSession();
  }
}

/**
 * Handle Order Cancelled Event
 *
 * When an order is cancelled, cancel or refund associated payment.
 * This is a COMPENSATING TRANSACTION in the SAGA pattern.
 *
 * @param {Object} event - Order cancelled event
 */
async function handleOrderCancelled(event) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, reason: cancelReason } = event;

    console.log('[SAGA] Handling order cancellation:', orderId);

    // Find payment for this order
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      console.log('[SAGA] No payment found for cancelled order:', orderId);
      await session.commitTransaction();
      return;
    }

    // Handle based on payment status
    switch (payment.status) {
      case PAYMENT_STATUS.PENDING:
      case PAYMENT_STATUS.PROCESSING:
        // Cancel pending/processing payments
        payment.status = PAYMENT_STATUS.CANCELLED;
        payment.cancelledAt = new Date();
        payment.failureReason = cancelReason || 'Order cancelled';
        await payment.save({ session });

        await publishPaymentCancelled(payment, {
          correlationId: event.correlationId,
          reason: cancelReason
        });

        console.log('[SAGA] Payment cancelled due to order cancellation:', payment._id);
        break;

      case PAYMENT_STATUS.COMPLETED:
        // Completed payments need refund (handled separately by admin)
        console.log('[SAGA] Completed payment requires manual refund:', payment._id);
        // Could trigger automatic refund workflow here
        break;

      case PAYMENT_STATUS.CANCELLED:
      case PAYMENT_STATUS.FAILED:
      case PAYMENT_STATUS.REFUNDED:
        // Already in terminal state
        console.log('[SAGA] Payment already in terminal state:', payment.status);
        break;
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('[SAGA] Error handling order cancelled:', error);

    // Publish compensation failure event
    await publishSagaCompensation({
      action: 'cancel_payment_failed',
      orderId: event.orderId,
      error: error.message
    }, {
      correlationId: event.correlationId
    });
  } finally {
    session.endSession();
  }
}

/**
 * Handle Order Status Changed Event
 *
 * React to order status changes that affect payment.
 *
 * @param {Object} event - Order status changed event
 */
async function handleOrderStatusChanged(event) {
  try {
    const { orderId, oldStatus, newStatus } = event;

    console.log('[SAGA] Handling order status change:', {
      orderId,
      oldStatus,
      newStatus
    });

    // Find payment for this order
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      console.log('[SAGA] No payment found for order:', orderId);
      return;
    }

    // Handle specific status changes
    // Example: Order marked as delivered → Confirm payment can't be refunded
    if (newStatus === 4) { // DELIVERED
      console.log('[SAGA] Order delivered, payment finalized:', payment._id);
      // Could add a "finalized" flag to payment
    }

    // Add more status-specific logic as needed
  } catch (error) {
    console.error('[SAGA] Error handling order status change:', error);
  }
}

/**
 * Handle SAGA Compensation Event
 *
 * Process compensation requests from other services.
 * Implements compensating transactions to rollback changes.
 *
 * @param {Object} event - SAGA compensation event
 */
async function handleSagaCompensation(event) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { action, paymentId, orderId, reason } = event;

    console.log('[SAGA] Handling compensation:', action);

    switch (action) {
      case 'cancel_payment':
        await compensateCancelPayment(paymentId, orderId, reason, session);
        break;

      case 'refund_payment':
        await compensateRefundPayment(paymentId, reason, session);
        break;

      case 'mark_payment_failed':
        await compensateMarkFailed(paymentId, reason, session);
        break;

      default:
        console.log('[SAGA] Unknown compensation action:', action);
    }

    await session.commitTransaction();

    // Publish rollback complete event
    await publishEvent('saga.payment.rollback.complete', {
      action,
      paymentId,
      orderId,
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('[SAGA] Error handling compensation:', error);

    // Publish compensation failure
    await publishSagaCompensation({
      action: 'compensation_failed',
      error: error.message,
      originalAction: event.action
    }, {
      correlationId: event.correlationId
    });
  } finally {
    session.endSession();
  }
}

/**
 * Compensating Transaction: Cancel Payment
 *
 * @param {string} paymentId - Payment ID
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @param {Object} session - Mongoose session
 */
async function compensateCancelPayment(paymentId, orderId, reason, session) {
  const payment = await Payment.findOne({
    $or: [{ _id: paymentId }, { orderId }]
  });

  if (!payment) {
    throw new Error('Payment not found for compensation');
  }

  if (payment.status === PAYMENT_STATUS.CANCELLED) {
    console.log('[SAGA] Payment already cancelled');
    return;
  }

  payment.status = PAYMENT_STATUS.CANCELLED;
  payment.cancelledAt = new Date();
  payment.failureReason = reason || 'Compensating transaction';
  await payment.save({ session });

  console.log('[SAGA] Payment cancelled as compensation:', payment._id);
}

/**
 * Compensating Transaction: Refund Payment
 *
 * @param {string} paymentId - Payment ID
 * @param {string} reason - Refund reason
 * @param {Object} session - Mongoose session
 */
async function compensateRefundPayment(paymentId, reason, session) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error('Payment not found for refund');
  }

  if (payment.status !== PAYMENT_STATUS.COMPLETED) {
    throw new Error('Only completed payments can be refunded');
  }

  // Note: Actual Stripe refund should be handled separately
  // This just marks the intent

  console.log('[SAGA] Payment marked for refund:', payment._id);
  // Add refund processing logic here
}

/**
 * Compensating Transaction: Mark Payment as Failed
 *
 * @param {string} paymentId - Payment ID
 * @param {string} reason - Failure reason
 * @param {Object} session - Mongoose session
 */
async function compensateMarkFailed(paymentId, reason, session) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  payment.status = PAYMENT_STATUS.FAILED;
  payment.failedAt = new Date();
  payment.failureReason = reason || 'Compensating transaction';
  await payment.save({ session });

  console.log('[SAGA] Payment marked as failed:', payment._id);
}

/**
 * Stop consumer gracefully
 */
async function stopConsumer() {
  try {
    await consumer.disconnect();
    console.log('[Kafka Consumer] Stopped successfully');
  } catch (error) {
    console.error('[Kafka Consumer] Error stopping:', error);
  }
}

module.exports = {
  startConsumer,
  stopConsumer,
  handleOrderCreated,
  handleOrderCancelled,
  handleOrderStatusChanged,
  handleSagaCompensation
};
