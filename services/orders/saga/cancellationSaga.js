/**
 * Order Cancellation SAGA
 *
 * Orchestrates distributed order cancellation across services:
 * 1. Cancel order (Order Service)
 * 2. Release stock (Products Service)
 * 3. Refund payment (Payment Service)
 *
 * Features:
 * - Idempotency: Prevents duplicate operations (e.g., restocking twice)
 * - Retry Logic: Exponential backoff for transient failures
 * - Compensation: Rollback on failures
 * - State Tracking: Tracks SAGA progress in order metadata
 *
 * @module saga/cancellationSaga
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const { ORDER_STATUS } = require('../constants/orderStatus');
const { PAYMENT_STATUS_CODE } = require('../constants/paymentStatus');
const { PAYMENT_METHOD_CODE } = require('../constants/paymentMethod');
const { publishOrderCancelled, publishOrderStatusChanged } = require('../services/kafkaProducer');
const { v4: uuidv4 } = require('uuid');

// SAGA States
const SAGA_STATE = {
  INITIATED: 'cancellation_initiated',
  ORDER_CANCELLED: 'order_cancelled',
  STOCK_RELEASE_REQUESTED: 'stock_release_requested',
  STOCK_RELEASED: 'stock_released',
  REFUND_REQUESTED: 'refund_requested',
  REFUND_COMPLETED: 'refund_completed',
  COMPLETED: 'cancellation_completed',
  FAILED: 'cancellation_failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated'
};

// Maximum retry attempts for each step
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Generate unique SAGA ID
 * @returns {string} SAGA correlation ID
 */
function generateSagaId() {
  return `saga-cancel-${uuidv4()}`;
}

/**
 * Calculate exponential backoff delay
 * @param {number} retryCount - Current retry attempt
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(retryCount) {
  return INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
}

/**
 * Update SAGA state in order metadata
 * @param {Object} order - Order document
 * @param {string} state - New SAGA state
 * @param {Object} additionalData - Additional metadata
 * @returns {Promise<Object>} Updated order
 */
async function updateSagaState(order, state, additionalData = {}) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Initialize metadata if not exists
      if (!order.metadata) {
        order.metadata = {};
      }

      // Update SAGA state
      order.metadata.cancellationSagaId = order.metadata.cancellationSagaId || generateSagaId();
      order.metadata.cancellationSagaState = state;
      order.metadata.cancellationLastUpdated = new Date();

      // Merge additional data
      Object.assign(order.metadata, additionalData);

      // Mark metadata as modified (required for nested objects)
      order.markModified('metadata');

      await order.save({ session });

      console.log(`[SAGA] State updated: ${state} (Order: ${order.orderNumber}, SAGA: ${order.metadata.cancellationSagaId})`);
    });

    return order;
  } catch (error) {
    console.error(`[SAGA] Failed to update state to ${state}:`, error.message);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Check if order has already been cancelled (idempotency check)
 * @param {Object} order - Order document
 * @returns {boolean} True if already cancelled
 */
function isAlreadyCancelled(order) {
  if (order.status === ORDER_STATUS.CANCELLED) {
    const sagaState = order.metadata?.cancellationSagaState;

    // Check if cancellation SAGA is completed or in progress
    if (sagaState === SAGA_STATE.COMPLETED) {
      console.log(`[SAGA] Order ${order.orderNumber} already fully cancelled (SAGA completed)`);
      return true;
    }

    // If SAGA is in progress, allow retry
    if (sagaState && sagaState !== SAGA_STATE.FAILED) {
      console.log(`[SAGA] Order ${order.orderNumber} cancellation in progress (state: ${sagaState})`);
      return false; // Allow continuation
    }
  }

  return false;
}

/**
 * Check if stock has already been released (idempotency check)
 * @param {Object} order - Order document
 * @returns {boolean} True if stock already released
 */
function isStockAlreadyReleased(order) {
  const stockReleased = order.metadata?.stockReleased === true;
  const sagaState = order.metadata?.cancellationSagaState;

  const isReleased = stockReleased ||
    sagaState === SAGA_STATE.STOCK_RELEASED ||
    sagaState === SAGA_STATE.REFUND_REQUESTED ||
    sagaState === SAGA_STATE.REFUND_COMPLETED ||
    sagaState === SAGA_STATE.COMPLETED;

  if (isReleased) {
    console.log(`[SAGA] Stock already released for order ${order.orderNumber} (stockReleased: ${stockReleased}, state: ${sagaState})`);
  }

  return isReleased;
}

/**
 * Check if refund has already been processed (idempotency check)
 * @param {Object} order - Order document
 * @returns {boolean} True if refund already processed
 */
function isRefundAlreadyProcessed(order) {
  const refundRequested = order.metadata?.refundRequested === true;
  const sagaState = order.metadata?.cancellationSagaState;

  const isProcessed = refundRequested ||
    sagaState === SAGA_STATE.REFUND_REQUESTED ||
    sagaState === SAGA_STATE.REFUND_COMPLETED ||
    sagaState === SAGA_STATE.COMPLETED;

  if (isProcessed) {
    console.log(`[SAGA] Refund already processed for order ${order.orderNumber} (refundRequested: ${refundRequested}, state: ${sagaState})`);
  }

  return isProcessed;
}

/**
 * Execute Order Cancellation SAGA
 *
 * SAGA Steps:
 * 1. Update order status to CANCELLED
 * 2. Publish stock release event (with idempotency check)
 * 3. Publish refund request event (with idempotency check, Stripe only)
 * 4. Mark SAGA as completed
 *
 * If any step fails, execute compensation to rollback
 *
 * @param {string} orderId - Order ID to cancel
 * @param {Object} options - Cancellation options
 * @param {string} options.userId - User requesting cancellation
 * @param {string} options.reason - Cancellation reason
 * @param {number} options.retryCount - Current retry attempt
 * @returns {Promise<Object>} Cancellation result
 */
async function executeCancellationSaga(orderId, options = {}) {
  const {
    userId,
    reason = 'Cancelled by customer',
    retryCount = 0
  } = options;

  let session;

  try {
    console.log(`[SAGA] 🚀 Starting order cancellation SAGA (Order: ${orderId}, Retry: ${retryCount})`);

    // Fetch order
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Idempotency check: Skip if already fully cancelled
    if (isAlreadyCancelled(order)) {
      return {
        success: true,
        duplicate: true,
        message: 'Order already cancelled',
        order
      };
    }

    // Validate cancellation is allowed
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(order.status)) {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }

    // Start MongoDB session for atomic operations
    session = await mongoose.startSession();

    // STEP 1: Update SAGA state to INITIATED
    await updateSagaState(order, SAGA_STATE.INITIATED, {
      cancelledBy: userId,
      cancelReason: reason,
      cancellationStartedAt: new Date()
    });

    // STEP 2: Cancel Order (update status to CANCELLED and payment status to refunded)
    await session.withTransaction(async () => {
      order.status = ORDER_STATUS.CANCELLED;
      order.paymentStatus = order.paymentMethod === 6 ? PAYMENT_STATUS_CODE.PENDING : PAYMENT_STATUS_CODE.REFUNDED;
      order.cancelledAt = new Date();
      await order.save({ session });
    });

    await updateSagaState(order, SAGA_STATE.ORDER_CANCELLED);

    console.log(`[SAGA] ✅ Step 1: Order cancelled (${order.orderNumber})`);

    // STEP 3: Release Stock (idempotent)
    if (!isStockAlreadyReleased(order)) {
      await publishOrderCancelled(order, {
        requiresRefund: false, // Stock release only, not refund yet
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        cancelledBy: userId,
        cancelReason: reason,
        sagaId: order.metadata.cancellationSagaId,
        stockReleaseOnly: true // Flag to indicate stock release request
      });

      await updateSagaState(order, SAGA_STATE.STOCK_RELEASE_REQUESTED, {
        stockReleaseRequestedAt: new Date()
      });

      console.log(`[SAGA] ✅ Step 2: Stock release requested (${order.orderNumber})`);
    } else {
      console.log(`[SAGA] ⏭️  Step 2: Stock already released, skipping (${order.orderNumber})`);
    }

    // STEP 4: Request Refund (only for Stripe PAID orders, idempotent)
    const requiresRefund = order.paymentMethod === PAYMENT_METHOD_CODE.STRIPE &&
      order.paymentStatus === PAYMENT_STATUS_CODE.PAID;

    if (requiresRefund) {
      if (!isRefundAlreadyProcessed(order)) {
        await publishOrderCancelled(order, {
          requiresRefund: true,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          cancelledBy: userId,
          cancelReason: reason,
          sagaId: order.metadata.cancellationSagaId
        });

        await updateSagaState(order, SAGA_STATE.REFUND_REQUESTED, {
          refundRequested: true,
          refundRequestedAt: new Date()
        });

        console.log(`[SAGA] ✅ Step 3: Refund requested (${order.orderNumber})`);
        console.log(`[SAGA] 💰 Stripe refund will be processed by Payment Service`);
      } else {
        console.log(`[SAGA] ⏭️  Step 3: Refund already requested, skipping (${order.orderNumber})`);
      }
    } else {
      console.log(`[SAGA] ⏭️  Step 3: No refund required (COD or non-paid order)`);
    }

    // STEP 5: Mark SAGA as completed
    await updateSagaState(order, SAGA_STATE.COMPLETED, {
      cancellationCompletedAt: new Date()
    });

    console.log(`[SAGA] 🎉 Order cancellation SAGA completed successfully (${order.orderNumber})`);

    return {
      success: true,
      order: await Order.findById(orderId), // Refresh order
      sagaId: order.metadata.cancellationSagaId,
      message: 'Order cancelled successfully',
      refundInitiated: requiresRefund
    };

  } catch (error) {
    console.error(`[SAGA] ❌ Cancellation SAGA failed:`, error.message);

    // Determine if error is retryable
    const isRetryable = isTransientError(error);

    if (isRetryable && retryCount < MAX_RETRIES) {
      const delay = calculateBackoff(retryCount);
      console.log(`[SAGA] 🔄 Retrying cancellation SAGA in ${delay}ms (Attempt ${retryCount + 1}/${MAX_RETRIES})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return executeCancellationSaga(orderId, { ...options, retryCount: retryCount + 1 });
    }

    // Max retries exceeded or non-retryable error - execute compensation
    console.log(`[SAGA] ⚠️  Max retries exceeded or non-retryable error, executing compensation...`);

    try {
      const order = await Order.findById(orderId);
      if (order) {
        await compensateCancellation(order, error);
      }
    } catch (compensationError) {
      console.error(`[SAGA] ❌ Compensation failed:`, compensationError.message);
    }

    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

/**
 * Check if error is transient and can be retried
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
function isTransientError(error) {
  const retryableErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'WriteConflict',
    'TransientTransactionError',
    'Network error',
    'Connection timeout'
  ];

  return retryableErrors.some(errType =>
    error.message.includes(errType) ||
    error.code === errType ||
    error.errorLabels?.includes(errType)
  );
}

/**
 * Compensate (rollback) failed cancellation
 *
 * Compensation Actions:
 * 1. Mark SAGA as FAILED
 * 2. Log failure reason for manual intervention
 * 3. DO NOT revert order status (order remains CANCELLED for customer safety)
 * 4. Admin must manually review and resolve
 *
 * @param {Object} order - Order document
 * @param {Error} error - Error that caused compensation
 * @returns {Promise<void>}
 */
async function compensateCancellation(order, error) {
  try {
    console.log(`[SAGA] 🔄 Starting compensation for order ${order.orderNumber}`);

    await updateSagaState(order, SAGA_STATE.FAILED, {
      compensating: true,
      failureReason: error.message,
      failedAt: new Date(),
      requiresManualReview: true
    });

    // Log for monitoring/alerts
    console.error(`[SAGA] ⚠️  MANUAL REVIEW REQUIRED: Order ${order.orderNumber} cancellation failed`);
    console.error(`[SAGA] Error: ${error.message}`);
    console.error(`[SAGA] SAGA State: ${order.metadata?.cancellationSagaState}`);
    console.error(`[SAGA] Stock Released: ${order.metadata?.stockReleased}`);
    console.error(`[SAGA] Refund Requested: ${order.metadata?.refundRequested}`);

    // In production: Send alert to monitoring system (e.g., Sentry, PagerDuty)
    // await sendAlert({
    //   type: 'SAGA_CANCELLATION_FAILED',
    //   orderId: order._id,
    //   orderNumber: order.orderNumber,
    //   error: error.message,
    //   metadata: order.metadata
    // });

    console.log(`[SAGA] ✅ Compensation completed - order marked for manual review`);
  } catch (compensationError) {
    console.error(`[SAGA] ❌ Critical: Compensation itself failed:`, compensationError.message);
    // This is critical - log to persistent storage or alert system
  }
}

/**
 * Mark stock as released (called by Kafka consumer after Products service confirms)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Updated order
 */
async function markStockReleased(orderId) {
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Idempotency check
    if (isStockAlreadyReleased(order)) {
      console.log(`[SAGA] Stock already marked as released for order ${order.orderNumber}`);
      return order;
    }

    await updateSagaState(order, SAGA_STATE.STOCK_RELEASED, {
      stockReleased: true,
      stockReleasedAt: new Date()
    });

    console.log(`[SAGA] ✅ Stock marked as released for order ${order.orderNumber}`);

    return order;
  } catch (error) {
    console.error(`[SAGA] Error marking stock as released:`, error.message);
    throw error;
  }
}

/**
 * Mark refund as completed (called by Kafka consumer after Payment service confirms)
 * @param {string} orderId - Order ID
 * @param {Object} refundDetails - Refund details from payment service
 * @returns {Promise<Object>} Updated order
 */
async function markRefundCompleted(orderId, refundDetails = {}) {
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Update payment status to REFUNDED
    order.paymentStatus = PAYMENT_STATUS_CODE.REFUNDED;

    await updateSagaState(order, SAGA_STATE.REFUND_COMPLETED, {
      refundCompleted: true,
      refundCompletedAt: new Date(),
      refundId: refundDetails.refundId,
      refundAmount: refundDetails.refundAmount
    });

    console.log(`[SAGA] ✅ Refund marked as completed for order ${order.orderNumber}`);

    return order;
  } catch (error) {
    console.error(`[SAGA] Error marking refund as completed:`, error.message);
    throw error;
  }
}

module.exports = {
  executeCancellationSaga,
  markStockReleased,
  markRefundCompleted,
  SAGA_STATE,
  isAlreadyCancelled,
  isStockAlreadyReleased,
  isRefundAlreadyProcessed
};
