/**
 * Payment Controller
 *
 * Handles all payment-related operations including creation, processing,
 * status updates, refunds, and Stripe webhook handling with proper
 * transactional management and security best practices.
 *
 * @module controllers/paymentController
 * @requires ../models/Payment
 * @requires ../utils/errorResponse
 * @requires ../constants/paymentStatus
 * @requires ../constants/paymentMethod
 * @requires stripe
 * @requires mongoose
 */

const Payment = require('../models/Payment');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
  PAYMENT_STATUS,
  statusToString,
  stringToStatus,
  isValidTransition,
  getStatusLabel,
  getAllStatuses
} = require('../constants/paymentStatus');
const {
  PAYMENT_METHOD,
  getPaymentMethodLabel,
  getPaymentMethodCode,
  getPaymentMethodDisplay,
  getAllPaymentMethodsWithDetails,
  calculatePaymentFee,
  isOnlinePayment
} = require('../constants/paymentMethod');
const {
  executePaymentSaga,
  handlePaymentCompletion,
  handlePaymentFailure
} = require('../saga/paymentSaga');
const { generateCorrelationId } = require('../events/paymentEvents');

/**
 * Get all payments
 *
 * Retrieves a list of all payments in the database.
 * Admin-only access (handled by middleware).
 *
 * @route GET /api/v1/payment
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering/pagination
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of payments
 * @returns {Object} 500 - Server error
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { status, paymentMethod, limit = 100, offset = 0 } = req.query;

    // Build query filter
    const filter = {};

    if (status) {
      const statusCode = parseInt(status, 10);
      if (!isNaN(statusCode)) {
        filter.status = statusCode;
      }
    }

    if (paymentMethod) {
      const methodCode = parseInt(paymentMethod, 10);
      if (!isNaN(methodCode)) {
        filter.paymentMethod = methodCode;
      }
    }

    // Fetch payments with pagination
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-__v');

    const total = await Payment.countDocuments(filter);

    res.status(200).json(
      ErrorResponse.success(
        { payments, count: payments.length, total },
        'Payments retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get all payments error:', error);

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve payments',
        'Please try again later'
      )
    );
  }
};

/**
 * Get payment by ID
 *
 * Retrieves a single payment by its MongoDB ObjectID.
 *
 * @route GET /api/v1/payment/:id
 * @access Private (user can view their own payments, admin can view all)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Payment ID (MongoDB ObjectID)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Payment data
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Payment not found
 * @returns {Object} 500 - Server error
 */
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id).select('-__v');

    if (!payment) {
      return res.status(404).json(
        ErrorResponse.notFound('Payment', id)
      );
    }

    res.status(200).json(
      ErrorResponse.success(
        { payment },
        'Payment retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get payment by ID error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid payment ID format',
          { id: 'Payment ID must be a valid MongoDB ObjectID (24 hex characters)' }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve payment',
        'Please verify the payment ID and try again'
      )
    );
  }
};

/**
 * Get payments by user ID
 *
 * Retrieves all payments belonging to a specific user with optional filtering.
 *
 * @route GET /api/v1/payment/user/:userId
 * @access Private (user can view their own payments, admin can view all)
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - User ID (MongoDB ObjectID)
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.status - Filter by payment status
 * @param {string} req.query.paymentMethod - Filter by payment method
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of user's payments
 * @returns {Object} 400 - Invalid user ID format
 * @returns {Object} 500 - Server error
 */
exports.getPaymentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, paymentMethod, sortBy = 'date', sortOrder = 'desc' } = req.query;

    // Build query filter
    const filter = { userId };

    if (status) {
      const statusCode = parseInt(status, 10);
      if (!isNaN(statusCode)) {
        filter.status = statusCode;
      }
    }

    if (paymentMethod) {
      const methodCode = parseInt(paymentMethod, 10);
      if (!isNaN(methodCode)) {
        filter.paymentMethod = methodCode;
      }
    }

    // Build sort options
    let sort = {};
    if (sortBy === 'amount') {
      sort.amount = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    const payments = await Payment.find(filter)
      .sort(sort)
      .select('-__v');

    res.status(200).json(
      ErrorResponse.success(
        {
          payments,
          count: payments.length,
          userId,
          filters: {
            status: status || null,
            paymentMethod: paymentMethod || null,
            sortBy,
            sortOrder
          }
        },
        'User payments retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get payments by user ID error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid user ID format',
          { userId: 'User ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve user payments',
        'Please verify the user ID and try again'
      )
    );
  }
};

/**
 * Get payments by order ID
 *
 * Retrieves all payments for a specific order.
 *
 * @route GET /api/v1/payment/order/:orderId
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.orderId - Order ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of payments for the order
 * @returns {Object} 400 - Invalid order ID
 * @returns {Object} 500 - Server error
 */
exports.getPaymentsByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json(
      ErrorResponse.success(
        {
          payments,
          count: payments.length,
          orderId
        },
        'Order payments retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get payments by order ID error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid order ID format',
          { orderId: 'Order ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve order payments',
        'Please verify the order ID and try again'
      )
    );
  }
};

/**
 * Create Stripe checkout session
 *
 * Creates a Stripe checkout session for payment processing using SAGA pattern.
 * This is the main entry point for initiating payments with distributed transaction support.
 *
 * @route POST /api/v1/payment/checkout-session
 * @access Private (authenticated users)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Payment data
 * @param {string} req.body.orderId - Order ID (required)
 * @param {string} req.body.userId - User ID (required)
 * @param {Array} req.body.items - Array of order items (required)
 * @param {number} req.body.amount - Payment amount (required)
 * @param {string} req.body.currency - Currency code (default: USD)
 * @param {string} req.body.customerEmail - Customer email (required)
 * @param {string} req.body.successUrl - Redirect URL on success
 * @param {string} req.body.cancelUrl - Redirect URL on cancel
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Checkout session created
 * @returns {Object} 400 - Validation error
 * @returns {Object} 500 - Server error
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const {
      orderId,
      userId,
      items,
      amount,
      currency = 'USD',
      customerEmail,
      successUrl,
      cancelUrl
    } = req.body;

    // Validate required fields
    const missingFields = {};
    if (!orderId) missingFields.orderId = 'Order ID is required';
    if (!userId) missingFields.userId = 'User ID is required';
    if (!items || items.length === 0) missingFields.items = 'Order items are required';
    if (!amount || amount <= 0) missingFields.amount = 'Valid payment amount is required';
    if (!customerEmail) missingFields.customerEmail = 'Customer email is required';

    if (Object.keys(missingFields).length > 0) {
      return res.status(400).json(
        ErrorResponse.validation('Required fields are missing', missingFields)
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid email format',
          { customerEmail: 'Please provide a valid email address' }
        )
      );
    }

    // Calculate processing fee
    const processingFee = calculatePaymentFee(PAYMENT_METHOD.STRIPE, amount);
    const netAmount = amount - processingFee;

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.productName,
          description: `Quantity: ${item.quantity}`
        },
        unit_amount: Math.round(item.price * 100) // Convert to cents
      },
      quantity: item.quantity
    }));

    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        orderId: orderId.toString(),
        userId: userId.toString()
      }
    });

    // Prepare payment data for SAGA orchestrator
    const paymentData = {
      orderId,
      userId,
      items,
      amount,
      currency: currency.toUpperCase(),
      paymentMethod: PAYMENT_METHOD.STRIPE,
      status: PAYMENT_STATUS.PENDING,
      customerEmail,
      processingFee,
      netAmount,
      stripeDetails: {
        sessionId: stripeSession.id
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Generate SAGA metadata for distributed tracing
    const metadata = {
      correlationId: generateCorrelationId(),
      userId: userId.toString(),
      orderId: orderId.toString(),
      traceId: req.headers['x-trace-id'] || generateCorrelationId(),
      source: 'checkout-api'
    };

    console.log('[Payment Controller] Executing payment SAGA:', {
      correlationId: metadata.correlationId,
      orderId: orderId.toString(),
      amount
    });

    // Execute payment SAGA
    const sagaResult = await executePaymentSaga(paymentData, metadata);

    if (!sagaResult.success) {
      console.error('[Payment Controller] SAGA execution failed:', sagaResult.error);
      return res.status(500).json(
        ErrorResponse.serverError(
          'Failed to create payment',
          sagaResult.error || 'Payment SAGA execution failed'
        )
      );
    }

    console.log('[Payment Controller] SAGA executed successfully:', {
      paymentId: sagaResult.payment._id,
      sagaId: sagaResult.sagaId
    });

    res.status(201).json(
      ErrorResponse.success(
        {
          payment: sagaResult.payment,
          checkoutUrl: stripeSession.url,
          sessionId: stripeSession.id,
          sagaId: sagaResult.sagaId
        },
        'Checkout session created successfully'
      )
    );

  } catch (error) {
    console.error('Create checkout session error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to create checkout session',
        'Please check the payment information and try again'
      )
    );
  }
};

/**
 * Stripe webhook handler
 *
 * Handles Stripe webhook events for payment processing.
 * This endpoint processes payment confirmations and updates payment status.
 *
 * SECURITY: Verifies webhook signature to ensure request is from Stripe.
 *
 * @route POST /api/v1/payment/webhook
 * @access Public (verified by Stripe signature)
 * @param {Object} req - Express request object
 * @param {Buffer} req.body - Raw request body
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Webhook processed
 * @returns {Object} 400 - Invalid signature or payload
 * @returns {Object} 500 - Server error
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature for security
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json(
      ErrorResponse.validation(
        'Webhook signature verification failed',
        { signature: 'Invalid Stripe signature' }
      )
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('Processing Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object;

        // Find payment by Stripe session ID
        const payment = await Payment.findOne({
          'stripeDetails.sessionId': checkoutSession.id
        });

        if (!payment) {
          console.error('Payment not found for session:', checkoutSession.id);
          await session.abortTransaction();
          return res.status(404).json(
            ErrorResponse.notFound('Payment', checkoutSession.id)
          );
        }

        // Update payment with Stripe details
        payment.status = PAYMENT_STATUS.PROCESSING;
        payment.stripeDetails.paymentIntentId = checkoutSession.payment_intent;
        payment.stripeDetails.customerId = checkoutSession.customer;
        payment.transactionId = checkoutSession.payment_intent;

        await payment.save({ session });
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;

        // Find payment by payment intent ID
        const payment = await Payment.findOne({
          'stripeDetails.paymentIntentId': paymentIntent.id
        });

        if (payment) {
          payment.status = PAYMENT_STATUS.COMPLETED;
          payment.stripeDetails.chargeId = paymentIntent.latest_charge;
          payment.completedAt = new Date();

          await payment.save({ session });

          console.log('[Webhook] Payment completed, triggering SAGA completion:', payment._id);

          // Continue SAGA flow - publish completion event
          const metadata = {
            correlationId: payment.metadata?.get('sagaId') || generateCorrelationId(),
            userId: payment.userId.toString(),
            orderId: payment.orderId.toString(),
            source: 'stripe-webhook'
          };

          await handlePaymentCompletion(payment, metadata);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;

        const payment = await Payment.findOne({
          'stripeDetails.paymentIntentId': paymentIntent.id
        });

        if (payment) {
          payment.status = PAYMENT_STATUS.FAILED;
          payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
          payment.failedAt = new Date();

          await payment.save({ session });

          console.log('[Webhook] Payment failed, triggering SAGA rollback:', payment._id);

          // Trigger SAGA rollback - publish failure event
          const metadata = {
            correlationId: payment.metadata?.get('sagaId') || generateCorrelationId(),
            userId: payment.userId.toString(),
            orderId: payment.orderId.toString(),
            source: 'stripe-webhook'
          };

          await handlePaymentFailure(payment, metadata);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;

        const payment = await Payment.findOne({
          'stripeDetails.chargeId': charge.id
        });

        if (payment) {
          payment.status = PAYMENT_STATUS.REFUNDED;
          payment.refundDetails = {
            refundId: charge.refunds.data[0]?.id,
            refundAmount: charge.amount_refunded / 100,
            refundReason: charge.refunds.data[0]?.reason || 'Refund requested',
            refundedAt: new Date()
          };

          await payment.save({ session });

          console.log('Payment refunded:', payment._id);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    await session.commitTransaction();

    // Return 200 to acknowledge receipt of event
    res.status(200).json({ received: true });

  } catch (error) {
    await session.abortTransaction();
    console.error('Webhook processing error:', error);

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to process webhook',
        'Webhook event processing failed'
      )
    );
  } finally {
    session.endSession();
  }
};

/**
 * Update payment status
 *
 * Updates a payment's status with validation and transition checks.
 * Admin-only access.
 *
 * @route PATCH /api/v1/payment/:id/status
 * @access Private/Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Payment ID
 * @param {Object} req.body - Status update data
 * @param {number} req.body.status - New status code
 * @param {string} req.body.reason - Reason for status change (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Payment status updated
 * @returns {Object} 400 - Validation error
 * @returns {Object} 404 - Payment not found
 * @returns {Object} 422 - Invalid status transition
 * @returns {Object} 500 - Server error
 */
exports.updatePaymentStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (status === undefined || status === null) {
      await session.abortTransaction();
      return res.status(400).json(
        ErrorResponse.validation(
          'Status is required',
          { status: 'Payment status must be provided' }
        )
      );
    }

    // Convert to number if string provided
    let newStatus = status;
    if (typeof status === 'string') {
      try {
        newStatus = stringToStatus(status);
      } catch (error) {
        await session.abortTransaction();
        return res.status(400).json(
          ErrorResponse.validation(
            'Invalid status value',
            { status: `Status must be a valid code (1-6) or string`, providedStatus: status }
          )
        );
      }
    }

    // Find payment
    const payment = await Payment.findById(id);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json(
        ErrorResponse.notFound('Payment', id)
      );
    }

    const oldStatus = payment.status;

    // Validate status transition
    if (!isValidTransition(oldStatus, newStatus)) {
      await session.abortTransaction();
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Invalid status transition',
          {
            currentStatus: oldStatus,
            currentStatusLabel: getStatusLabel(oldStatus),
            attemptedStatus: newStatus,
            attemptedStatusLabel: getStatusLabel(newStatus),
            reason: `Cannot transition from ${getStatusLabel(oldStatus)} to ${getStatusLabel(newStatus)}`
          }
        )
      );
    }

    // Update status
    payment.status = newStatus;

    if (reason && newStatus === PAYMENT_STATUS.FAILED) {
      payment.failureReason = reason;
    }

    await payment.save({ session });
    await session.commitTransaction();

    res.status(200).json(
      ErrorResponse.success(
        {
          payment,
          oldStatus,
          oldStatusLabel: getStatusLabel(oldStatus),
          newStatus,
          newStatusLabel: getStatusLabel(newStatus)
        },
        'Payment status updated successfully'
      )
    );

  } catch (error) {
    await session.abortTransaction();
    console.error('Update payment status error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid payment ID format',
          { id: 'Payment ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to update payment status',
        'Please verify the payment ID and status value'
      )
    );
  } finally {
    session.endSession();
  }
};

/**
 * Initiate refund
 *
 * Initiates a refund for a completed payment through Stripe.
 *
 * @route POST /api/v1/payment/:id/refund
 * @access Private/Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Payment ID
 * @param {Object} req.body - Refund data
 * @param {number} req.body.amount - Refund amount (optional, defaults to full amount)
 * @param {string} req.body.reason - Reason for refund (required)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Refund initiated
 * @returns {Object} 400 - Validation error
 * @returns {Object} 404 - Payment not found
 * @returns {Object} 422 - Payment cannot be refunded
 * @returns {Object} 500 - Server error
 */
exports.initiateRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount: refundAmount, reason } = req.body;

    if (!reason) {
      await session.abortTransaction();
      return res.status(400).json(
        ErrorResponse.validation(
          'Refund reason is required',
          { reason: 'Please provide a reason for the refund' }
        )
      );
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json(
        ErrorResponse.notFound('Payment', id)
      );
    }

    // Check if payment can be refunded
    if (!payment.canBeRefunded()) {
      await session.abortTransaction();
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Payment cannot be refunded',
          {
            paymentId: id,
            currentStatus: payment.status,
            currentStatusLabel: getStatusLabel(payment.status),
            reason: payment.status !== PAYMENT_STATUS.COMPLETED
              ? 'Only completed payments can be refunded'
              : 'Payment has already been refunded'
          }
        )
      );
    }

    // Process Stripe refund
    const refundData = {
      payment_intent: payment.stripeDetails.paymentIntentId
    };

    if (refundAmount && refundAmount < payment.amount) {
      refundData.amount = Math.round(refundAmount * 100); // Convert to cents
    }

    const stripeRefund = await stripe.refunds.create(refundData);

    // Update payment record
    payment.status = PAYMENT_STATUS.REFUNDED;
    payment.refundDetails = {
      refundId: stripeRefund.id,
      refundAmount: stripeRefund.amount / 100,
      refundReason: reason,
      refundedAt: new Date()
    };

    await payment.save({ session });
    await session.commitTransaction();

    res.status(200).json(
      ErrorResponse.success(
        { payment, refund: stripeRefund },
        'Refund processed successfully'
      )
    );

  } catch (error) {
    await session.abortTransaction();
    console.error('Initiate refund error:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Stripe refund failed',
          { stripe: error.message }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to process refund',
        'Please verify the payment and try again'
      )
    );
  } finally {
    session.endSession();
  }
};

/**
 * Get payment statistics
 *
 * Returns aggregated statistics for payments (admin only).
 *
 * @route GET /api/v1/payment/stats
 * @access Private/Admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Payment statistics
 * @returns {Object} 500 - Server error
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const formattedStats = stats.map(stat => ({
      status: stat._id,
      statusLabel: getStatusLabel(stat._id),
      count: stat.count,
      totalAmount: stat.totalAmount,
      avgAmount: stat.avgAmount
    }));

    res.status(200).json(
      ErrorResponse.success(
        { stats: formattedStats },
        'Payment statistics retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get payment stats error:', error);

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve payment statistics'
      )
    );
  }
};

/**
 * Get all payment statuses
 *
 * Returns list of all valid payment status codes.
 *
 * @route GET /api/v1/payment/statuses
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of statuses
 */
exports.getPaymentStatuses = async (req, res) => {
  try {
    const statuses = getAllStatuses();

    res.status(200).json(
      ErrorResponse.success(
        { statuses },
        'Payment statuses retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get payment statuses error:', error);

    res.status(500).json(
      ErrorResponse.serverError('Failed to retrieve payment statuses')
    );
  }
};

/**
 * Get all payment methods
 *
 * Returns list of all valid payment methods with details.
 *
 * @route GET /api/v1/payment/methods
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of payment methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = getAllPaymentMethodsWithDetails();

    res.status(200).json(
      ErrorResponse.success(
        { methods },
        'Payment methods retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get payment methods error:', error);

    res.status(500).json(
      ErrorResponse.serverError('Failed to retrieve payment methods')
    );
  }
};
