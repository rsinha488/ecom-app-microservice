/**
 * Payment SAGA Orchestrator
 *
 * Implements the SAGA pattern for distributed transactions across
 * Payment, Order, and Product services.
 *
 * SAGA Flow for Stripe Payments:
 * 1. Create Payment Record (PENDING)
 * 2. Create Stripe Checkout Session
 * 3. Publish payment.initiated event → Order Service creates order
 * 4. Wait for Stripe webhook (async)
 * 5. Webhook receives payment success → Publish payment.completed
 * 6. Order Service updates order to PROCESSING and payment status to PAID
 *
 * COD Flow (handled separately in Order Service):
 * 1. Frontend creates order directly
 * 2. Order marked as PENDING with COD payment method
 *
 * If any step fails, execute compensating transactions.
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
  // Initial states
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_INITIATED: 'payment_initiated',

  // Processing states
  AWAITING_GATEWAY: 'awaiting_gateway',
  PAYMENT_PROCESSING: 'payment_processing',

  // Success states
  PAYMENT_COMPLETED: 'payment_completed',
  ORDER_CONFIRMED: 'order_confirmed',
  COMPLETED: 'completed',

  // Failure states
  PAYMENT_FAILED: 'payment_failed',
  FAILED: 'failed',

  // Compensation states
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
   * For Stripe payments:
   * 1. Create payment record
   * 2. Publish payment.initiated → triggers order creation in Order Service
   * 3. Return payment for Stripe checkout session creation
   * 4. Actual payment completion happens via webhook (handlePaymentCompletion)
   */
  async execute() {
    try {
      console.log('[SAGA] Starting payment SAGA execution', {
        correlationId: this.metadata.correlationId,
        paymentMethod: this.paymentData.paymentMethod
      });

      // Step 1: Create Payment Record
      await this.createPayment();

      // Step 2: Publish payment.initiated event
      // This triggers Order Service to create the order
      await this.publishInitiatedEvent();

      // Step 3: Payment and order creation complete
      // Now waiting for user to complete payment on Stripe
      this.state = SAGA_STATES.AWAITING_GATEWAY;

      console.log('[SAGA] Payment SAGA initiated successfully');
      console.log('[SAGA] - Payment created with status PENDING');
      console.log('[SAGA] - payment.initiated event published');
      console.log('[SAGA] - Order Service will create order');
      console.log('[SAGA] - Awaiting Stripe webhook for payment completion');

      return {
        success: true,
        payment: this.payment,
        sagaId: this.metadata.correlationId,
        state: this.state
      };

    } catch (error) {
      console.error('[SAGA] Error in SAGA execution:', error);

      // Rollback all completed steps
      await this.rollback();

      return {
        success: false,
        error: error.message,
        sagaId: this.metadata.correlationId,
        state: SAGA_STATES.FAILED
      };
    }
  }

  /**
   * Step 1: Create Payment Record
   *
   * Creates the payment document in database with PENDING status
   * Compensating Action: Cancel payment
   */
  async createPayment() {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      console.log('[SAGA] Step 1: Creating payment record');

      // Check for duplicate payment for this order
      const existingPayment = await Payment.findOne({
        orderId: this.paymentData.orderId,
        status: {
          $in: [
            PAYMENT_STATUS.PENDING,
            PAYMENT_STATUS.PROCESSING,
            PAYMENT_STATUS.COMPLETED
          ]
        }
      });

      if (existingPayment) {
        await session.abortTransaction();
        console.log('[SAGA] Payment already exists for this order:', existingPayment._id);
        throw new Error('Payment already exists for this order');
      }

      // Create new payment with PENDING status
      this.payment = new Payment({
        ...this.paymentData,
        status: PAYMENT_STATUS.PENDING,
        metadata: {
          sagaId: this.metadata.correlationId,
          sagaState: SAGA_STATES.PAYMENT_CREATED,
          initiatedAt: new Date(),
          source: 'stripe-checkout'
        }
      });

      await this.payment.save({ session });
      await session.commitTransaction();

      // Record step for potential rollback
      this.steps.push({
        name: 'createPayment',
        status: 'completed',
        paymentId: this.payment._id.toString(),
        timestamp: new Date()
      });

      // Register compensation
      this.compensations.push({
        name: 'cancelPayment',
        action: () => this.compensateCancelPayment()
      });

      this.state = SAGA_STATES.PAYMENT_CREATED;
      console.log('[SAGA] ✓ Payment created:', {
        paymentId: this.payment._id,
        orderId: this.payment.orderId,
        amount: this.payment.amount,
        status: 'PENDING'
      });

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
   * Publishes payment.initiated event which triggers Order Service to create the order.
   * This event is published ONLY ONCE during payment creation.
   *
   * Event flow:
   * - Payment Service publishes payment.initiated
   * - Order Service consumes event and creates order with PENDING status
   * - Order is linked to payment via orderId
   */
  async publishInitiatedEvent() {
    try {
      console.log('[SAGA] Step 2: Publishing payment.initiated event');

      // Publish event to trigger order creation
      await publishPaymentInitiated(this.payment, this.metadata);

      this.steps.push({
        name: 'publishInitiatedEvent',
        status: 'completed',
        timestamp: new Date()
      });

      // Register compensation for event publishing
      this.compensations.push({
        name: 'publishCancellationEvent',
        action: () => this.compensatePublishCancellation()
      });

      this.state = SAGA_STATES.PAYMENT_INITIATED;
      console.log('[SAGA] ✓ payment.initiated event published');
      console.log('[SAGA] → Order Service will now create order');

    } catch (error) {
      console.error('[SAGA] Failed to publish initiated event:', error);
      throw new Error(`Failed to publish initiated event: ${error.message}`);
    }
  }

  /**
   * Rollback: Execute Compensating Transactions
   *
   * Executes compensations in reverse order (LIFO) when SAGA fails
   */
  async rollback() {
    try {
      console.log('[SAGA] ⚠️  Starting rollback - executing compensating transactions');

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
      console.log('[SAGA] ✓ Rollback completed');

      // Publish compensation complete event to notify other services
      if (this.payment) {
        await publishSagaCompensation({
          action: 'payment_saga_rolled_back',
          paymentId: this.payment._id.toString(),
          orderId: this.payment.orderId.toString(),
          reason: 'SAGA failed during initiation',
          steps: this.steps,
          errors: this.errors
        }, this.metadata);
      }

    } catch (error) {
      console.error('[SAGA] ❌ Critical error during rollback:', error);
      // Rollback failed - requires manual intervention
      // In production: Send to monitoring/alerting system (PagerDuty, etc.)
      this.errors.push({
        critical: true,
        error: 'Rollback failed - manual intervention required',
        details: error.message
      });
    }
  }

  /**
   * Compensating Transaction: Cancel Payment
   *
   * Cancels the payment if SAGA fails during initiation
   */
  async compensateCancelPayment() {
    if (!this.payment) return;

    const session = await mongoose.startSession();
    try {
      await session.startTransaction();

      // Mark payment as cancelled (keep for audit trail)
      this.payment.status = PAYMENT_STATUS.CANCELLED;
      this.payment.cancelledAt = new Date();
      this.payment.failureReason = 'SAGA rollback - payment initiation failed';

      if (this.payment.metadata instanceof Map) {
        this.payment.metadata.set('sagaState', SAGA_STATES.COMPENSATED);
      } else {
        this.payment.metadata = {
          ...this.payment.metadata,
          sagaState: SAGA_STATES.COMPENSATED
        };
      }

      await this.payment.save({ session });
      await session.commitTransaction();

      console.log('[SAGA] ✓ Compensation: Payment cancelled', this.payment._id);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Compensating Transaction: Publish Cancellation Event
   *
   * Publishes payment.cancelled event to notify Order Service to cancel the order
   */
  async compensatePublishCancellation() {
    if (!this.payment) return;

    try {
      const { publishPaymentCancelled } = require('../services/kafkaProducer');

      await publishPaymentCancelled(this.payment, {
        ...this.metadata,
        reason: 'Payment SAGA rollback'
      });

      console.log('[SAGA] ✓ Compensation: payment.cancelled event published');
      console.log('[SAGA] → Order Service will cancel the order');
    } catch (error) {
      console.error('[SAGA] Failed to publish cancellation event:', error);
      throw error;
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
      orderId: this.payment?.orderId,
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
 * Main entry point for initiating a payment SAGA.
 * Used for Stripe payments where order creation is orchestrated by the SAGA.
 *
 * @param {Object} paymentData - Payment data (orderId, amount, items, etc.)
 * @param {Object} metadata - SAGA metadata (correlationId, userId, etc.)
 * @returns {Promise<Object>} SAGA execution result
 */
async function executePaymentSaga(paymentData, metadata = {}) {
  // Generate correlation ID if not provided
  if (!metadata.correlationId) {
    metadata.correlationId = `saga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  console.log('[SAGA] Initiating Payment SAGA', {
    correlationId: metadata.correlationId,
    orderId: paymentData.orderId
  });

  const saga = new PaymentSaga(paymentData, metadata);
  const result = await saga.execute();

  return {
    ...result,
    summary: saga.getSummary()
  };
}

/**
 * Handle Payment Completion (called from Stripe webhook)
 *
 * This is the async continuation of the SAGA flow after user completes payment.
 *
 * Flow:
 * 1. Stripe webhook receives payment_intent.succeeded
 * 2. Payment status updated to COMPLETED
 * 3. Publish payment.completed event (ONLY ONCE)
 * 4. Order Service updates order status to PROCESSING and payment status to PAID
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Event metadata
 * @returns {Promise<Object>} Result
 */
async function handlePaymentCompletion(payment, metadata = {}) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    console.log('[SAGA] 🎉 Handling payment completion', {
      paymentId: payment._id,
      orderId: payment.orderId,
      amount: payment.amount,
      correlationId: metadata.correlationId
    });

    // Update SAGA state in payment metadata
    if (payment.metadata instanceof Map) {
      payment.metadata.set('sagaState', SAGA_STATES.PAYMENT_COMPLETED);
      payment.metadata.set('completedAt', new Date());
    } else {
      payment.metadata = {
        ...payment.metadata,
        sagaState: SAGA_STATES.PAYMENT_COMPLETED,
        completedAt: new Date()
      };
    }

    await payment.save({ session });
    await session.commitTransaction();

    console.log('[SAGA] ✓ Payment status: COMPLETED');

    // Publish payment.completed event (ONLY ONCE)
    // This triggers Order Service to:
    // - Update order status to PROCESSING
    // - Update order payment status to PAID
    console.log('[SAGA] 📤 About to publish payment.completed event...');
    console.log('[SAGA] Payment data:', {
      paymentId: payment._id,
      orderId: payment.orderId,
      amount: payment.amount,
      status: payment.status
    });
    console.log('[SAGA] Metadata:', metadata);

    await publishPaymentCompleted(payment, metadata);

    console.log('[SAGA] ✅✅✅ payment.completed event published successfully! ✅✅✅');
    console.log('[SAGA] → Order Service will update order to PROCESSING/PAID');
    console.log('[SAGA] → Product Service will confirm inventory deduction');

    return { success: true };

  } catch (error) {
    await session.abortTransaction();
    console.error('[SAGA] ❌ Error in payment completion:', error);

    // Trigger rollback - notify services to compensate
    await publishSagaCompensation({
      action: 'rollback_payment_completion',
      paymentId: payment._id.toString(),
      orderId: payment.orderId.toString(),
      reason: error.message,
      timestamp: new Date()
    }, metadata);

    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

/**
 * Handle Payment Failure (called from Stripe webhook)
 *
 * Triggers SAGA compensation when payment fails at gateway.
 *
 * Flow:
 * 1. Stripe webhook receives payment_intent.payment_failed
 * 2. Payment status updated to FAILED
 * 3. Publish payment.failed event (ONLY ONCE)
 * 4. Order Service cancels the order
 * 5. Product Service releases reserved inventory
 *
 * @param {Object} payment - Payment document
 * @param {Object} metadata - Event metadata
 * @returns {Promise<Object>} Result
 */
async function handlePaymentFailure(payment, metadata = {}) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    console.log('[SAGA] ⚠️  Handling payment failure', {
      paymentId: payment._id,
      orderId: payment.orderId,
      reason: payment.failureReason
    });

    // Update SAGA state in payment metadata
    if (payment.metadata instanceof Map) {
      payment.metadata.set('sagaState', SAGA_STATES.PAYMENT_FAILED);
      payment.metadata.set('failedAt', new Date());
    } else {
      payment.metadata = {
        ...payment.metadata,
        sagaState: SAGA_STATES.PAYMENT_FAILED,
        failedAt: new Date()
      };
    }

    await payment.save({ session });
    await session.commitTransaction();

    console.log('[SAGA] ✓ Payment status: FAILED');

    // Publish payment.failed event (ONLY ONCE)
    // This triggers compensating transactions:
    // - Order Service cancels the order
    // - Product Service releases inventory
    await publishPaymentFailed(payment, metadata);

    console.log('[SAGA] ✓ payment.failed event published');
    console.log('[SAGA] → Order Service will cancel order');
    console.log('[SAGA] → Product Service will release inventory');
    console.log('[SAGA] → Compensating transactions triggered');

    return { success: true };

  } catch (error) {
    await session.abortTransaction();
    console.error('[SAGA] ❌ Error handling payment failure:', error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

module.exports = {
  PaymentSaga,
  SAGA_STATES,
  executePaymentSaga,
  handlePaymentCompletion,
  handlePaymentFailure
};
