/**
 * Payment Event Definitions
 *
 * Defines all payment-related events for event-driven architecture.
 * Events follow the format: {domain}.{entity}.{action}
 *
 * @module events/paymentEvents
 */

/**
 * Payment Event Types
 * Used for Kafka topics and event handling
 */
const PAYMENT_EVENTS = {
  // Payment lifecycle events
  INITIATED: 'payment.initiated',
  PROCESSING: 'payment.processing',
  COMPLETED: 'payment.completed',
  FAILED: 'payment.failed',
  REFUNDED: 'payment.refunded',
  CANCELLED: 'payment.cancelled',

  // SAGA orchestration events
  COMPENSATE: 'saga.payment.compensate',
  ROLLBACK_COMPLETE: 'saga.payment.rollback.complete',

  // Integration events
  WEBHOOK_RECEIVED: 'payment.webhook.received',
  VERIFICATION_REQUIRED: 'payment.verification.required'
};

/**
 * Event priority levels for processing order
 */
const EVENT_PRIORITY = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

/**
 * Create standardized event payload
 *
 * @param {string} eventType - Event type from PAYMENT_EVENTS
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized event payload
 */
function createPaymentEvent(eventType, data, metadata = {}) {
  return {
    eventId: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType,
    timestamp: new Date().toISOString(),
    service: 'payment-service',
    version: '1.0.0',
    data,
    metadata: {
      correlationId: metadata.correlationId || generateCorrelationId(),
      causationId: metadata.causationId || null,
      userId: metadata.userId || null,
      traceId: metadata.traceId || null,
      ...metadata
    }
  };
}

/**
 * Generate correlation ID for tracing events across services
 */
function generateCorrelationId() {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Payment Initiated Event Schema
 *
 * Published when a payment is created in the system
 */
const PaymentInitiatedEvent = {
  eventType: PAYMENT_EVENTS.INITIATED,
  schema: {
    paymentId: 'string (required)',
    paymentNumber: 'string (required)',
    orderId: 'string (required)',
    userId: 'string (required)',
    amount: 'number (required)',
    currency: 'string (required)',
    paymentMethod: 'number (required)',
    items: 'array (required)',
    customerEmail: 'string (required)',
    stripeSessionId: 'string (optional)'
  }
};

/**
 * Payment Completed Event Schema
 *
 * Published when a payment is successfully completed
 * Triggers: Order status update, Inventory confirmation
 */
const PaymentCompletedEvent = {
  eventType: PAYMENT_EVENTS.COMPLETED,
  schema: {
    paymentId: 'string (required)',
    paymentNumber: 'string (required)',
    orderId: 'string (required)',
    userId: 'string (required)',
    amount: 'number (required)',
    currency: 'string (required)',
    paymentMethod: 'number (required)',
    transactionId: 'string (required)',
    completedAt: 'ISO datetime (required)',
    receiptUrl: 'string (optional)'
  }
};

/**
 * Payment Failed Event Schema
 *
 * Published when a payment fails
 * Triggers: Order cancellation, Inventory release
 */
const PaymentFailedEvent = {
  eventType: PAYMENT_EVENTS.FAILED,
  schema: {
    paymentId: 'string (required)',
    paymentNumber: 'string (required)',
    orderId: 'string (required)',
    userId: 'string (required)',
    amount: 'number (required)',
    failureReason: 'string (required)',
    failedAt: 'ISO datetime (required)',
    retryable: 'boolean (required)'
  }
};

/**
 * Payment Refunded Event Schema
 *
 * Published when a payment is refunded
 * Triggers: Order status update, Inventory return
 */
const PaymentRefundedEvent = {
  eventType: PAYMENT_EVENTS.REFUNDED,
  schema: {
    paymentId: 'string (required)',
    paymentNumber: 'string (required)',
    orderId: 'string (required)',
    userId: 'string (required)',
    originalAmount: 'number (required)',
    refundAmount: 'number (required)',
    refundReason: 'string (required)',
    refundId: 'string (required)',
    refundedAt: 'ISO datetime (required)'
  }
};

/**
 * Payment Cancelled Event Schema
 *
 * Published when a payment is cancelled
 * Triggers: Order cancellation, Inventory release
 */
const PaymentCancelledEvent = {
  eventType: PAYMENT_EVENTS.CANCELLED,
  schema: {
    paymentId: 'string (required)',
    paymentNumber: 'string (required)',
    orderId: 'string (required)',
    userId: 'string (required)',
    amount: 'number (required)',
    cancelReason: 'string (optional)',
    cancelledAt: 'ISO datetime (required)'
  }
};

/**
 * Validate event payload against schema
 *
 * @param {Object} event - Event to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} { valid: boolean, errors: array }
 */
function validateEvent(event, schema) {
  const errors = [];

  if (!event.eventType) {
    errors.push('Missing eventType');
  }

  if (!event.data) {
    errors.push('Missing data payload');
  }

  // Validate required fields from schema
  if (schema && event.data) {
    Object.keys(schema.schema).forEach(field => {
      const fieldDef = schema.schema[field];
      if (fieldDef.includes('required') && !event.data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  PAYMENT_EVENTS,
  EVENT_PRIORITY,
  createPaymentEvent,
  generateCorrelationId,
  validateEvent,

  // Event schemas
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  PaymentCancelledEvent
};
