const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController');
const { verifyAccessToken, requireRole, requireOwnerOrAdmin } = require('../../middleware/auth');
const { setVersionHeaders } = require('../../middleware/apiVersion');

/**
 * Payment Routes
 *
 * Defines all payment-related routes with proper authentication and authorization.
 * Routes are organized with public routes first, then authenticated routes.
 *
 * @module routes/v1/paymentRoutes
 * @requires express
 * @requires ../../controllers/paymentController
 * @requires ../../middleware/auth
 * @requires ../../middleware/apiVersion
 */

// Apply version headers to all routes
router.use(setVersionHeaders);

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * Get all payment statuses
 * Returns list of valid payment status codes for frontend
 * @route GET /api/v1/payment/statuses
 * @access Public
 */
router.get('/statuses', paymentController.getPaymentStatuses);

/**
 * Get all payment methods
 * Returns list of valid payment methods with details
 * @route GET /api/v1/payment/methods
 * @access Public
 */
router.get('/methods', paymentController.getPaymentMethods);

// ============================================================================
// WEBHOOK ROUTES (handled by Stripe signature verification)
// ============================================================================

/**
 * Stripe webhook handler
 * IMPORTANT: This route must come BEFORE authentication middleware
 * Stripe signature verification handles security
 * @route POST /api/v1/payment/webhook
 * @access Public (secured by Stripe signature)
 */
// Note: Webhook body parsing is handled in server.js with express.raw()

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

/**
 * Create Stripe checkout session
 * Initiates a new payment transaction
 * @route POST /api/v1/payment/checkout-session
 * @access Private (authenticated users)
 */
router.post('/checkout-session', verifyAccessToken, paymentController.createCheckoutSession);

/**
 * Get all payments
 * Admin only - retrieves all payments with optional filtering
 * @route GET /api/v1/payment
 * @access Private/Admin
 */
router.get('/', verifyAccessToken, requireRole('admin'), paymentController.getAllPayments);

/**
 * Get payment statistics
 * Admin only - returns aggregated payment statistics
 * @route GET /api/v1/payment/stats
 * @access Private/Admin
 */
router.get('/stats', verifyAccessToken, requireRole('admin'), paymentController.getPaymentStats);

/**
 * Get payments by user ID
 * Users can view their own payments, admins can view any user's payments
 * @route GET /api/v1/payment/user/:userId
 * @access Private (owner or admin)
 */
router.get('/user/:userId', verifyAccessToken, requireOwnerOrAdmin, paymentController.getPaymentsByUserId);

/**
 * Get payments by order ID
 * Returns all payment attempts for a specific order
 * @route GET /api/v1/payment/order/:orderId
 * @access Private (authenticated users)
 */
router.get('/order/:orderId', verifyAccessToken, paymentController.getPaymentsByOrderId);

/**
 * Get payment by ID
 * Retrieve a specific payment by its MongoDB ObjectID
 * @route GET /api/v1/payment/:id
 * @access Private (authenticated users)
 */
router.get('/:id', verifyAccessToken, paymentController.getPaymentById);

/**
 * Update payment status
 * Admin only - manually update payment status with transition validation
 * @route PATCH /api/v1/payment/:id/status
 * @access Private/Admin
 */
router.patch('/:id/status', verifyAccessToken, requireRole('admin'), paymentController.updatePaymentStatus);

/**
 * Initiate refund
 * Admin only - process a refund through Stripe
 * @route POST /api/v1/payment/:id/refund
 * @access Private/Admin
 */
router.post('/:id/refund', verifyAccessToken, requireRole('admin'), paymentController.initiateRefund);

module.exports = router;
