/**
 * Kafka Producer Service
 *
 * Publishes payment events to Kafka topics for consumption by other services.
 * Implements retry logic, error handling, and message ordering.
 *
 * @module services/kafkaProducer
 */

const { producer } = require('../config/kafka');
const { createPaymentEvent, PAYMENT_EVENTS, validateEvent } = require('../events/paymentEvents');
const { getStatusLabel } = require('../constants/paymentStatus');
const { getPaymentMethodLabel } = require('../constants/paymentMethod');

/**
 * Publish event to Kafka
 *
 * @param {string} topic - Kafka topic
 * @param {Object} event - Event payload
 * @param {Object} options - Additional options (key, partition, headers)
 * @returns {Promise<void>}
 */
async function publishEvent(topic, event, options = {}) {
  try {
    const message = {
      topic,
      messages: [
        {
          key: options.key || event.data.paymentId || event.metadata.correlationId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            correlationId: event.metadata.correlationId,
            timestamp: event.timestamp,
            ...options.headers
          },
          partition: options.partition
        }
      ]
    };

    const result = await producer.send(message);

    console.log(`[Kafka] Published event to ${topic}:`, {
      eventType: event.eventType,
      eventId: event.eventId,
      partition: result[0].partition,
      offset: result[0].offset
    });

    return result;
  } catch (error) {
    console.error(`[Kafka] Error publishing event to ${topic}:`, error);
    throw new Error(`Failed to publish event: ${error.message}`);
  }
}

/**
 * Publish Payment Initiated Event
 *
 * Called when a payment is first created in the system.
 * Notifies other services that a payment has been initiated.
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Additional metadata
 */
async function publishPaymentInitiated(payment, metadata = {}) {
  try {
    const event = createPaymentEvent(
      PAYMENT_EVENTS.INITIATED,
      {
        paymentId: payment._id.toString(),
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId.toString(),
        userId: payment.userId.toString(),
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentMethodLabel: getPaymentMethodLabel(payment.paymentMethod),
        items: payment.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price
        })),
        customerEmail: payment.customerEmail,
        stripeSessionId: payment.stripeDetails?.sessionId,
        initiatedAt: payment.initiatedAt || payment.createdAt
      },
      {
        ...metadata,
        userId: payment.userId.toString(),
        orderId: payment.orderId.toString()
      }
    );

    await publishEvent('payment.initiated', event, {
      key: payment.orderId.toString() // Ensure order in processing
    });

    return event;
  } catch (error) {
    console.error('[Kafka] Error publishing payment initiated:', error);
    // Don't throw - payment creation should succeed even if event fails
  }
}

/**
 * Publish Payment Completed Event
 *
 * Called when a payment is successfully completed.
 * Triggers: Order fulfillment, Inventory confirmation, Email notifications
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Additional metadata
 */
async function publishPaymentCompleted(payment, metadata = {}) {
  try {
    const event = createPaymentEvent(
      PAYMENT_EVENTS.COMPLETED,
      {
        paymentId: payment._id.toString(),
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId.toString(),
        userId: payment.userId.toString(),
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentMethodLabel: getPaymentMethodLabel(payment.paymentMethod),
        transactionId: payment.transactionId,
        completedAt: payment.completedAt,
        receiptUrl: payment.stripeDetails?.receiptUrl,
        items: payment.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      },
      {
        ...metadata,
        userId: payment.userId.toString(),
        orderId: payment.orderId.toString(),
        priority: 'high'
      }
    );

    await publishEvent('payment.completed', event, {
      key: payment.orderId.toString()
    });

    console.log('[SAGA] Payment completed event published:', payment._id);
    return event;
  } catch (error) {
    console.error('[Kafka] Error publishing payment completed:', error);
    // Critical event - should be retried
    throw error;
  }
}

/**
 * Publish Payment Failed Event
 *
 * Called when a payment fails.
 * Triggers: Order cancellation, Inventory release, Notification
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Additional metadata
 */
async function publishPaymentFailed(payment, metadata = {}) {
  try {
    const event = createPaymentEvent(
      PAYMENT_EVENTS.FAILED,
      {
        paymentId: payment._id.toString(),
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId.toString(),
        userId: payment.userId.toString(),
        amount: payment.amount,
        failureReason: payment.failureReason || 'Payment processing failed',
        failedAt: payment.failedAt,
        retryable: isRetryableFailure(payment.failureReason),
        items: payment.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      },
      {
        ...metadata,
        userId: payment.userId.toString(),
        orderId: payment.orderId.toString(),
        priority: 'high'
      }
    );

    await publishEvent('payment.failed', event, {
      key: payment.orderId.toString()
    });

    console.log('[SAGA] Payment failed event published:', payment._id);
    return event;
  } catch (error) {
    console.error('[Kafka] Error publishing payment failed:', error);
    // Don't throw - failure already recorded
  }
}

/**
 * Publish Payment Refunded Event
 *
 * Called when a payment is refunded.
 * Triggers: Order status update, Inventory return, Customer notification
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Additional metadata
 */
async function publishPaymentRefunded(payment, metadata = {}) {
  try {
    const event = createPaymentEvent(
      PAYMENT_EVENTS.REFUNDED,
      {
        paymentId: payment._id.toString(),
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId.toString(),
        userId: payment.userId.toString(),
        originalAmount: payment.amount,
        refundAmount: payment.refundDetails.refundAmount,
        refundReason: payment.refundDetails.refundReason,
        refundId: payment.refundDetails.refundId,
        refundedAt: payment.refundDetails.refundedAt,
        isFullRefund: payment.refundDetails.refundAmount === payment.amount,
        items: payment.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      },
      {
        ...metadata,
        userId: payment.userId.toString(),
        orderId: payment.orderId.toString(),
        priority: 'high'
      }
    );

    await publishEvent('payment.refunded', event, {
      key: payment.orderId.toString()
    });

    console.log('[SAGA] Payment refunded event published:', payment._id);
    return event;
  } catch (error) {
    console.error('[Kafka] Error publishing payment refunded:', error);
    // Critical event - should be retried
    throw error;
  }
}

/**
 * Publish Payment Cancelled Event
 *
 * Called when a payment is cancelled before completion.
 * Triggers: Order cancellation, Inventory release
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Additional metadata
 */
async function publishPaymentCancelled(payment, metadata = {}) {
  try {
    const event = createPaymentEvent(
      PAYMENT_EVENTS.CANCELLED,
      {
        paymentId: payment._id.toString(),
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId.toString(),
        userId: payment.userId.toString(),
        amount: payment.amount,
        cancelReason: metadata.reason || 'Payment cancelled by user',
        cancelledAt: payment.cancelledAt,
        items: payment.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      },
      {
        ...metadata,
        userId: payment.userId.toString(),
        orderId: payment.orderId.toString()
      }
    );

    await publishEvent('payment.cancelled', event, {
      key: payment.orderId.toString()
    });

    console.log('[SAGA] Payment cancelled event published:', payment._id);
    return event;
  } catch (error) {
    console.error('[Kafka] Error publishing payment cancelled:', error);
    // Don't throw - cancellation already recorded
  }
}

/**
 * Publish SAGA Compensation Event
 *
 * Called when SAGA needs to rollback payment.
 * Triggers compensating transactions in payment service.
 *
 * @param {Object} data - Compensation data
 * @param {Object} metadata - Additional metadata
 */
async function publishSagaCompensation(data, metadata = {}) {
  try {
    const event = createPaymentEvent(
      'saga.payment.compensate',
      data,
      metadata
    );

    await publishEvent('saga.payment.compensate', event);

    console.log('[SAGA] Compensation event published:', data);
    return event;
  } catch (error) {
    console.error('[Kafka] Error publishing compensation:', error);
    throw error;
  }
}

/**
 * Check if payment failure is retryable
 *
 * @param {string} failureReason - Failure reason from payment gateway
 * @returns {boolean} True if payment can be retried
 */
function isRetryableFailure(failureReason) {
  if (!failureReason) return false;

  const nonRetryableReasons = [
    'insufficient funds',
    'card declined',
    'invalid card',
    'expired card',
    'incorrect cvc',
    'fraudulent'
  ];

  const reason = failureReason.toLowerCase();
  return !nonRetryableReasons.some(nr => reason.includes(nr));
}

/**
 * Publish batch of events
 *
 * @param {Array} events - Array of {topic, event} objects
 */
async function publishBatch(events) {
  try {
    const messages = events.flatMap(({ topic, event, options = {} }) => ({
      topic,
      messages: [
        {
          key: options.key || event.metadata.correlationId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            correlationId: event.metadata.correlationId,
            timestamp: event.timestamp,
            ...options.headers
          }
        }
      ]
    }));

    await producer.sendBatch({ topicMessages: messages });

    console.log(`[Kafka] Published batch of ${events.length} events`);
  } catch (error) {
    console.error('[Kafka] Error publishing batch:', error);
    throw error;
  }
}

module.exports = {
  publishEvent,
  publishPaymentInitiated,
  publishPaymentCompleted,
  publishPaymentFailed,
  publishPaymentRefunded,
  publishPaymentCancelled,
  publishSagaCompensation,
  publishBatch
};
