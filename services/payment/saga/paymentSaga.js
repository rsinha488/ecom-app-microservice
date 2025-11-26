/**
 * Payment SAGA Orchestrator
 *
 * Implements the SAGA pattern for distributed transactions across
 * Payment, Order, and Product services.
 *
 * SAGA Flow:
 * 1. Create Payment (Payment Service) ✓
 * 2. Update Order Status (Order Service) → Event
 * 3. Reserve Inventory (Product Service) → Event
 * 4. Process Payment Gateway (Payment Service) ✓
 * 5. Confirm Order (Order Service) → Event
 * 6. Deduct Inventory (Product Service) → Event
 *
 * If any step fails, execute compensating transactions in reverse order.
 *
 * @module saga/paymentSaga
 */

const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const {
  publishPaymentInitiated,
  publishPaymentCompleted,
  publishPaymentFailed,
  publishSagaCompensation
} = require('../services/kafkaProducer');

/**
 * SAGA State Machine
 */
const SAGA_STATES = {
  PAYMENT_CREATED: 'payment_created',
  ORDER_UPDATED: 'order_updated',
  INVENTORY_RESERVED: 'inventory_reserved',
  PAYMENT_PROCESSED: 'payment_processed',
  ORDER_CONFIRMED: 'order_confirmed',
  INVENTORY_DEDUCTED: 'inventory_deducted',
  COMPLETED: 'completed',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated'
};

/**
 * Payment SAGA Class
 *
 * Orchestrates the payment flow with compensating transactions
 */
class PaymentSaga {
  constructor(paymentData, metadata = {}) {
    this.paymentData = paymentData;
    this.metadata = metadata;
    this.state = null;
    this.payment = null;
    this.steps = [];
    this.compensations = [];
    this.errors = [];
  }

  /**
   * Execute the SAGA
   *
   * Runs all steps in sequence, with automatic rollback on failure
   */
  async execute() {
    const session = await mongoose.startSession();

    try {
      console.log('[SAGA] Starting payment SAGA execution');

      // Step 1: Create Payment Record
      await this.createPayment(session);

      // Step 2: Publish Payment Initiated Event
      await this.publishInitiatedEvent();

      // Step 3: Wait for external confirmations (async)
      // In real implementation, this would wait for:
      // - Order service to update order status
      // - Product service to reserve inventory
      // But for now, we proceed to payment processing

      // Step 4: Process Payment (in webhook handler, not here)
      // This SAGA orchestrator creates the payment
      // Actual processing happens in Stripe webhook

      console.log('[SAGA] Payment SAGA created successfully');
      return {
        success: true,
        payment: this.payment,
        sagaId: this.metadata.correlationId
      };

    } catch (error) {
      console.error('[SAGA] Error in SAGA execution:', error);

      // Rollback all completed steps
      await this.rollback(session);

      return {
        success: false,
        error: error.message,
        sagaId: this.metadata.correlationId
      };
    }
  }

  /**
   * Step 1: Create Payment Record
   *
   * Creates the payment document in database
   * Compensating Action: Delete payment
   */
  async createPayment(session) {
    try {
      await session.startTransaction();

      console.log('[SAGA] Step 1: Creating payment record');

      this.payment = new Payment({
        ...this.paymentData,
        metadata: {
          ...this.paymentData.metadata,
          sagaId: this.metadata.correlationId,
          sagaState: SAGA_STATES.PAYMENT_CREATED
        }
      });

      await this.payment.save({ session });

      await session.commitTransaction();

      // Record step for potential rollback
      this.steps.push({
        name: 'createPayment',
        status: 'completed',
        timestamp: new Date()
      });

      // Register compensation
      this.compensations.push({
        name: 'deletePayment',
        action: () => this.compensateDeletePayment()
      });

      this.state = SAGA_STATES.PAYMENT_CREATED;
      console.log('[SAGA] Payment created:', this.payment._id);

    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Failed to create payment: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * Step 2: Publish Payment Initiated Event
   *
   * Notifies other services that payment has started
   * Compensating Action: Publish payment cancelled event
   */
  async publishInitiatedEvent() {
    try {
      console.log('[SAGA] Step 2: Publishing payment initiated event');

      await publishPaymentInitiated(this.payment, this.metadata);

      this.steps.push({
        name: 'publishInitiatedEvent',
        status: 'completed',
        timestamp: new Date()
      });

      this.state = SAGA_STATES.ORDER_UPDATED;
      console.log('[SAGA] Payment initiated event published');

    } catch (error) {
      throw new Error(`Failed to publish initiated event: ${error.message}`);
    }
  }

  /**
   * Rollback: Execute Compensating Transactions
   *
   * Executes compensations in reverse order (LIFO)
   */
  async rollback(session) {
    try {
      console.log('[SAGA] Starting rollback - executing compensating transactions');

      this.state = SAGA_STATES.COMPENSATING;

      // Execute compensations in reverse order
      for (let i = this.compensations.length - 1; i >= 0; i--) {
        const compensation = this.compensations[i];

        try {
          console.log(`[SAGA] Executing compensation: ${compensation.name}`);
          await compensation.action();

          this.steps.push({
            name: `compensate_${compensation.name}`,
            status: 'completed',
            timestamp: new Date()
          });

        } catch (error) {
          console.error(`[SAGA] Compensation failed: ${compensation.name}`, error);
          this.errors.push({
            compensation: compensation.name,
            error: error.message
          });
        }
      }

      this.state = SAGA_STATES.COMPENSATED;
      console.log('[SAGA] Rollback completed');

      // Publish compensation complete event
      if (this.payment) {
        await publishSagaCompensation({
          action: 'payment_saga_rolled_back',
          paymentId: this.payment._id.toString(),
          orderId: this.payment.orderId.toString(),
          reason: 'SAGA failed and was rolled back',
          steps: this.steps,
          errors: this.errors
        }, this.metadata);
      }

    } catch (error) {
      console.error('[SAGA] Critical error during rollback:', error);
      // Rollback failed - alert required!
      // In production: Send to monitoring/alerting system
    }
  }

  /**
   * Compensating Transaction: Delete Payment
   *
   * Removes the payment record if SAGA fails
   */
  async compensateDeletePayment() {
    if (!this.payment) return;

    const session = await mongoose.startSession();
    try {
      await session.startTransaction();

      // Mark as cancelled instead of deleting (for audit trail)
      this.payment.status = PAYMENT_STATUS.CANCELLED;
      this.payment.cancelledAt = new Date();
      this.payment.failureReason = 'SAGA rollback - payment cancelled';

      await this.payment.save({ session });

      await session.commitTransaction();

      console.log('[SAGA] Compensated: Payment marked as cancelled');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get SAGA execution summary
   */
  getSummary() {
    return {
      sagaId: this.metadata.correlationId,
      state: this.state,
      paymentId: this.payment?._id,
      steps: this.steps,
      compensations: this.compensations.map(c => c.name),
      errors: this.errors,
      completedAt: new Date()
    };
  }
}

/**
 * Execute Payment SAGA
 *
 * Convenience function to create and execute a payment SAGA
 *
 * @param {Object} paymentData - Payment data
 * @param {Object} metadata - SAGA metadata (correlationId, traceId, etc.)
 * @returns {Promise<Object>} SAGA execution result
 */
async function executePaymentSaga(paymentData, metadata = {}) {
  // Generate correlation ID if not provided
  if (!metadata.correlationId) {
    metadata.correlationId = `saga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  const saga = new PaymentSaga(paymentData, metadata);
  const result = await saga.execute();

  return {
    ...result,
    summary: saga.getSummary()
  };
}

/**
 * Handle Payment Completion (called from webhook)
 *
 * Continues the SAGA after payment is processed by gateway
 */
async function handlePaymentCompletion(payment, metadata = {}) {
  try {
    console.log('[SAGA] Handling payment completion in SAGA');

    // Publish payment completed event
    await publishPaymentCompleted(payment, metadata);

    // SAGA step completed
    console.log('[SAGA] Payment completion step finished');

    return { success: true };
  } catch (error) {
    console.error('[SAGA] Error in payment completion:', error);

    // Trigger rollback
    await publishSagaCompensation({
      action: 'rollback_payment_completion',
      paymentId: payment._id.toString(),
      orderId: payment.orderId.toString(),
      reason: error.message
    }, metadata);

    return { success: false, error: error.message };
  }
}

/**
 * Handle Payment Failure (called from webhook)
 *
 * Triggers SAGA rollback when payment fails
 */
async function handlePaymentFailure(payment, metadata = {}) {
  try {
    console.log('[SAGA] Handling payment failure in SAGA');

    // Publish payment failed event
    await publishPaymentFailed(payment, metadata);

    // Trigger compensating transactions
    await publishSagaCompensation({
      action: 'compensate_failed_payment',
      paymentId: payment._id.toString(),
      orderId: payment.orderId.toString(),
      reason: payment.failureReason
    }, metadata);

    console.log('[SAGA] Payment failure handled, compensations triggered');

    return { success: true };
  } catch (error) {
    console.error('[SAGA] Error handling payment failure:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  PaymentSaga,
  SAGA_STATES,
  executePaymentSaga,
  handlePaymentCompletion,
  handlePaymentFailure
};
