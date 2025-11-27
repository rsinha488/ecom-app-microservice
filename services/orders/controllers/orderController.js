/**
 * Order Controller
 *
 * Handles all order-related operations including CRUD operations and real-time status updates
 * Uses numeric status codes for better performance and clearer status progression
 *
 * @module controllers/orderController
 * @requires ../models/Order
 * @requires ../events/orderEvents
 * @requires ../utils/errorResponse
 * @requires ../constants/orderStatus
 */

const Order = require('../models/Order');
const { orderEvents, ORDER_EVENTS } = require('../events/orderEvents');
const ErrorResponse = require('../utils/errorResponse');
const {
  ORDER_STATUS,
  statusToString,
  stringToStatus,
  isValidTransition,
  getStatusLabel,
  getAllStatuses
} = require('../constants/orderStatus');
const {
  publishOrderCreated,
  publishOrderStatusChanged,
  publishOrderCancelled,
  publishOrderCompleted
} = require('../services/kafkaProducer');
const { executeCancellationSaga } = require('../saga/cancellationSaga');

/**
 * Get all orders
 *
 * Retrieves a list of all orders in the database.
 * Optionally supports filtering, sorting, and pagination.
 * Admin-only access (handled by middleware).
 *
 * @route GET /api/v1/orders
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering/pagination
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of orders
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/orders
 * Response: {
 *   "success": true,
 *   "message": "Orders retrieved successfully",
 *   "data": {
 *     "orders": [...],
 *     "count": 25
 *   }
 * }
 */
exports.getAllOrders = async (req, res) => {
  try {
    // Fetch all orders from database
    const orders = await Order.find();

    // Return success response with orders
    res.status(200).json(
      ErrorResponse.success(
        { orders, count: orders.length },
        'Orders retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Get all orders error:', error);

    // Return generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve orders',
        'Please try again later'
      )
    );
  }
};

/**
 * Get order by ID
 *
 * Retrieves a single order by its MongoDB ObjectID.
 * Returns 404 if order is not found.
 *
 * @route GET /api/v1/orders/:id
 * @access Private (user can view their own orders, admin can view all)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order ID (MongoDB ObjectID)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order data
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Order not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/orders/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "Order retrieved successfully",
 *   "data": {
 *     "order": { ... }
 *   }
 * }
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find order by ID
    const order = await Order.findById(id);

    // Handle order not found
    if (!order) {
      return res.status(404).json(
        ErrorResponse.notFound('Order', id)
      );
    }

    // Return success response with order data
    res.status(200).json(
      ErrorResponse.success(
        { order },
        'Order retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Get order by ID error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid order ID format',
          { id: 'Order ID must be a valid MongoDB ObjectID (24 hex characters)' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve order',
        'Please verify the order ID and try again'
      )
    );
  }
};

/**
 * Get orders by user ID
 *
 * Retrieves all orders belonging to a specific user with optional filtering and sorting.
 * Supports query parameters for status filtering, search, and sorting.
 * Returns empty array if no orders found for the user.
 *
 * @route GET /api/v1/orders/user/:userId
 * @access Private (user can view their own orders, admin can view all)
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - User ID (MongoDB ObjectID)
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.status - Filter by order status (1-5)
 * @param {string} req.query.search - Search by order number or product name
 * @param {string} req.query.sortBy - Sort field: 'date' or 'amount' (default: 'date')
 * @param {string} req.query.sortOrder - Sort order: 'asc' or 'desc' (default: 'desc')
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of user's orders
 * @returns {Object} 400 - Invalid user ID format
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/orders/user/507f1f77bcf86cd799439011?status=2&sortBy=date&sortOrder=desc
 * Response: {
 *   "success": true,
 *   "message": "User orders retrieved successfully",
 *   "data": {
 *     "orders": [...],
 *     "count": 5,
 *     "userId": "507f1f77bcf86cd799439011",
 *     "filters": {
 *       "status": 2,
 *       "search": null,
 *       "sortBy": "date",
 *       "sortOrder": "desc"
 *     }
 *   }
 * }
 */
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, search, sortBy = 'date', sortOrder = 'desc' } = req.query;

    // Build query filter
    const filter = { userId };

    // Filter by status if provided
    if (status && status !== 'all') {
      const statusNumber = parseInt(status, 10);
      if (!isNaN(statusNumber) && statusNumber >= 1 && statusNumber <= 5) {
        filter.status = statusNumber;
      }
    }

    // Filter by search query (order number or product name)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { 'items.productName': searchRegex }
      ];
    }

    // Build sort options
    let sort = {};
    if (sortBy === 'amount') {
      sort.totalAmount = sortOrder === 'asc' ? 1 : -1;
    } else {
      // Default to sorting by creation date
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Find orders with filters and sorting applied
    const orders = await Order.find(filter).sort(sort);

    // Return success response with user's orders (even if empty)
    res.status(200).json(
      ErrorResponse.success(
        {
          orders,
          count: orders.length,
          userId,
          filters: {
            status: status || null,
            search: search || null,
            sortBy,
            sortOrder
          }
        },
        'User orders retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Get orders by user ID error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid user ID format',
          { userId: 'User ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve user orders',
        'Please verify the user ID and try again'
      )
    );
  }
};

/**
 * Create new order
 *
 * Creates a new order in the database.
 * Validates all required fields and emits ORDER_CREATED event for real-time notifications.
 *
 * @route POST /api/v1/orders
 * @access Private (authenticated users)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Order data
 * @param {string} req.body.userId - User ID (required)
 * @param {Array} req.body.items - Array of order items (required)
 * @param {number} req.body.totalAmount - Total order amount (required, positive)
 * @param {Object} req.body.shippingAddress - Shipping address (required)
 * @param {string} req.body.paymentMethod - Payment method (required)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Order created successfully
 * @returns {Object} 400 - Validation error
 * @returns {Object} 422 - Business logic error (e.g., empty cart)
 * @returns {Object} 500 - Server error
 *
 * @example
 * POST /api/v1/orders
 * Body: {
 *   "userId": "507f1f77bcf86cd799439011",
 *   "items": [
 *     { "productId": "...", "quantity": 2, "price": 29.99 }
 *   ],
 *   "totalAmount": 59.98,
 *   "shippingAddress": { ... },
 *   "paymentMethod": "credit_card"
 * }
 * Response: {
 *   "success": true,
 *   "message": "Order created successfully",
 *   "data": {
 *     "order": { ... }
 *   }
 * }
 */
exports.createOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount, shippingAddress, paymentMethod } = req.body;

    // Validate required fields
    const missingFields = {};
    if (!userId) missingFields.userId = 'User ID is required';
    if (!items) missingFields.items = 'Order items are required';
    if (totalAmount === undefined || totalAmount === null) missingFields.totalAmount = 'Total amount is required';
    if (!shippingAddress) missingFields.shippingAddress = 'Shipping address is required';
    if (!paymentMethod) missingFields.paymentMethod = 'Payment method is required';

    // If any required fields are missing, return validation error
    if (Object.keys(missingFields).length > 0) {
      return res.status(400).json(
        ErrorResponse.validation('Required fields are missing', missingFields)
      );
    }

    // Validate items array is not empty (business logic check)
    if (items.length === 0) {
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Cannot create order with empty cart',
          { items: 'At least one item is required in the order' }
        )
      );
    }

    // Validate total amount is positive
    if (totalAmount <= 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid total amount',
          { totalAmount: 'Total amount must be greater than zero' }
        )
      );
    }

    // Create new order instance
    const order = new Order(req.body);

    // Save order to database
    const newOrder = await order.save();

    if (paymentMethod === 6) {// paymentMethod = CoD(6) only then realtime update on order creation
      // Emit order created event for real-time notifications (WebSocket)
      // This triggers WebSocket notifications to admin dashboard
      orderEvents.emit(ORDER_EVENTS.CREATED, newOrder);
    }

    // Publish to Kafka for inter-service communication (async, non-blocking)
    // This triggers stock reservation in Products service
    setImmediate(() => {
      publishOrderCreated(newOrder).catch(err => {
        console.error('Failed to publish order created to Kafka:', err.message);
        // Don't fail the request - Kafka publish is async
      });
    });

    // Return success response with created order
    res.status(201).json(
      ErrorResponse.success(
        { order: newOrder },
        'Order created successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Create order error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to create order',
        'Please check the order information and try again'
      )
    );
  }
};

/**
 * Update order
 *
 * Updates an existing order by ID.
 * Only provided fields will be updated.
 * Note: Use updateOrderStatus() for status changes to emit proper events.
 *
 * @route PUT /api/v1/orders/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order ID to update
 * @param {Object} req.body - Fields to update
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order updated successfully
 * @returns {Object} 400 - Validation error or invalid ID format
 * @returns {Object} 404 - Order not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * PUT /api/v1/orders/507f1f77bcf86cd799439011
 * Body: {
 *   "shippingAddress": { ... }
 * }
 * Response: {
 *   "success": true,
 *   "message": "Order updated successfully",
 *   "data": {
 *     "order": { ... }
 *   }
 * }
 */
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalAmount } = req.body;

    // Validate total amount if provided
    if (totalAmount !== undefined && totalAmount <= 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid total amount',
          { totalAmount: 'Total amount must be greater than zero' }
        )
      );
    }

    // Find and update order
    // new: true -> return updated document
    // runValidators: true -> run model validators on update
    const order = await Order.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    // Handle order not found
    if (!order) {
      return res.status(404).json(
        ErrorResponse.notFound('Order', id)
      );
    }

    // Return success response with updated order
    res.status(200).json(
      ErrorResponse.success(
        { order },
        'Order updated successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Update order error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid order ID format',
          { id: 'Order ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to update order',
        'Please verify the order ID and data'
      )
    );
  }
};

/**
 * Update order status
 *
 * Updates an order's status and emits appropriate real-time events.
 * This method is separate from updateOrder() to ensure proper event emission.
 * Emits STATUS_CHANGED event and specific events for 'cancelled' and 'delivered' statuses.
 *
 * Valid status transitions:
 * - pending → processing → shipped → delivered
 * - Any status → cancelled (except delivered)
 *
 * @route PATCH /api/v1/orders/:id/status
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order ID
 * @param {Object} req.body - Status update data
 * @param {number} req.body.status - New status (1=pending, 2=processing, 3=shipped, 4=delivered, 5=cancelled)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order status updated successfully
 * @returns {Object} 400 - Validation error or invalid status value
 * @returns {Object} 404 - Order not found
 * @returns {Object} 422 - Invalid status transition
 * @returns {Object} 500 - Server error
 *
 * @example
 * PATCH /api/v1/orders/507f1f77bcf86cd799439011/status
 * Body: {
 *   "status": 3
 * }
 * Response: {
 *   "success": true,
 *   "message": "Order status updated successfully",
 *   "data": {
 *     "order": { ... },
 *     "oldStatus": 2,
 *     "oldStatusLabel": "Processing",
 *     "newStatus": 3,
 *     "newStatusLabel": "Shipped"
 *   }
 * }
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status field is provided
    if (status === undefined || status === null) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Status is required',
          { status: 'Order status must be provided' }
        )
      );
    }

    // Convert status to number if string provided (for backward compatibility)
    let newStatus = status;
    if (typeof status === 'string') {
      try {
        newStatus = stringToStatus(status);
      } catch (error) {
        return res.status(400).json(
          ErrorResponse.validation(
            'Invalid status value',
            {
              status: `Status must be a valid numeric code (1-5) or string (pending, processing, shipped, delivered, cancelled)`,
              providedStatus: status
            }
          )
        );
      }
    }

    // Validate status is a valid numeric code
    const validStatusCodes = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.SHIPPED,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CANCELLED
    ];

    if (!validStatusCodes.includes(newStatus)) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid status code',
          {
            status: `Status must be one of: ${validStatusCodes.join(', ')} (1=Pending, 2=Processing, 3=Shipped, 4=Delivered, 5=Cancelled)`,
            providedStatus: newStatus
          }
        )
      );
    }

    // Find order to get current status
    const oldOrder = await Order.findById(id);
    if (!oldOrder) {
      return res.status(404).json(
        ErrorResponse.notFound('Order', id)
      );
    }

    const oldStatus = oldOrder.status;

    // Validate status transition using the transition rules
    if (!isValidTransition(oldStatus, newStatus)) {
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Invalid status transition',
          {
            currentStatus: oldStatus,
            currentStatusLabel: getStatusLabel(oldStatus),
            attemptedStatus: newStatus,
            attemptedStatusLabel: getStatusLabel(newStatus),
            reason: oldStatus === ORDER_STATUS.DELIVERED
              ? 'Delivered orders are final and cannot be modified'
              : oldStatus === ORDER_STATUS.CANCELLED
                ? 'Cancelled orders cannot be modified'
                : `Cannot transition from ${getStatusLabel(oldStatus)} to ${getStatusLabel(newStatus)}`
          }
        )
      );
    }
    // Prepare update object  
    const update = {
      status: newStatus,
    };

    if (newStatus === ORDER_STATUS.CANCELLED) {
      update.paymentStatus = 4; //refunded
    } else if (newStatus === ORDER_STATUS.DELIVERED) {
      update.paymentStatus = 2;//paid
    }

    // Update order status
    const order = await Order.findByIdAndUpdate(
      id, update,
      { new: true, runValidators: true }
    );

    // Prepare event data
    const statusChangeData = {
      order,
      oldStatus,
      newStatus,
      oldStatusLabel: getStatusLabel(oldStatus),
      newStatusLabel: getStatusLabel(newStatus)
    };

    // Emit status changed event for real-time notifications (WebSocket)
    // This triggers WebSocket updates to all connected clients
    console.log('[OrderController] Emitting ORDER_EVENTS.STATUS_CHANGED event', statusChangeData);
    orderEvents.emit(ORDER_EVENTS.STATUS_CHANGED, statusChangeData);

    // Publish to Kafka for inter-service communication (async, non-blocking)
    setImmediate(() => {
      publishOrderStatusChanged(statusChangeData).catch(err => {
        console.error('Failed to publish status change to Kafka:', err.message);
      });
    });

    // Emit specific status events for business logic triggers
    if (newStatus === ORDER_STATUS.CANCELLED) {
      // Trigger cancellation workflow (refunds, inventory restoration, etc.)
      orderEvents.emit(ORDER_EVENTS.CANCELLED, order);

      // Publish to Kafka to trigger stock restoration
      setImmediate(() => {
        publishOrderCancelled(order).catch(err => {
          console.error('Failed to publish order cancelled to Kafka:', err.message);
        });
      });
    } else if (newStatus === ORDER_STATUS.DELIVERED) {
      // Trigger completion workflow (payment settlement, review requests, etc.)
      orderEvents.emit(ORDER_EVENTS.COMPLETED, order);

      // Publish to Kafka for analytics and completion workflows
      setImmediate(() => {
        publishOrderCompleted(order).catch(err => {
          console.error('Failed to publish order completed to Kafka:', err.message);
        });
      });
    }

    // Return success response with updated order
    res.status(200).json(
      ErrorResponse.success(
        {
          order,
          oldStatus,
          oldStatusLabel: getStatusLabel(oldStatus),
          newStatus,
          newStatusLabel: getStatusLabel(newStatus)
        },
        'Order status updated successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Update order status error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid order ID format',
          { id: 'Order ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to update order status',
        'Please verify the order ID and status value'
      )
    );
  }
};

/**
 * Delete order
 *
 * Permanently deletes an order from the database.
 * Requires admin authentication (handled by middleware).
 * This operation cannot be undone.
 *
 * Note: Consider implementing soft delete (marking as deleted) instead
 * of hard delete for audit trail and compliance purposes.
 *
 * @route DELETE /api/v1/orders/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order deleted successfully
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Order not found
 * @returns {Object} 422 - Cannot delete delivered orders
 * @returns {Object} 500 - Server error
 *
 * @example
 * DELETE /api/v1/orders/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "Order deleted successfully",
 *   "data": {
 *     "deletedOrderId": "507f1f77bcf86cd799439011"
 *   }
 * }
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Find order first to check if it can be deleted
    const order = await Order.findById(id);

    // Handle order not found
    if (!order) {
      return res.status(404).json(
        ErrorResponse.notFound('Order', id)
      );
    }

    // Business rule: Cannot delete delivered orders (for audit compliance)
    if (order.status === ORDER_STATUS.DELIVERED) {
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Cannot delete delivered orders',
          {
            orderId: id,
            status: order.status,
            statusLabel: getStatusLabel(order.status),
            reason: 'Delivered orders must be retained for compliance and audit purposes'
          }
        )
      );
    }

    // Delete the order
    await Order.findByIdAndDelete(id);

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        { deletedOrderId: id },
        'Order deleted successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Delete order error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid order ID format',
          { id: 'Order ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to delete order',
        'Please verify the order ID and try again'
      )
    );
  }
};

/**
 * Get all available order statuses
 *
 * Returns a list of all valid order status codes with their metadata.
 * Useful for populating dropdowns and UI elements in the frontend.
 *
 * @route GET /api/v1/orders/statuses
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of all statuses
 *
 * @example
 * GET /api/v1/orders/statuses
 * Response: {
 *   "success": true,
 *   "message": "Order statuses retrieved successfully",
 *   "data": {
 *     "statuses": [
 *       { "code": 1, "string": "pending", "label": "Pending", "color": "yellow" },
 *       { "code": 2, "string": "processing", "label": "Processing", "color": "blue" },
 *       ...
 *     ]
 *   }
 * }
 */
exports.getOrderStatuses = async (req, res) => {
  try {
    const statuses = getAllStatuses();

    res.status(200).json(
      ErrorResponse.success(
        { statuses },
        'Order statuses retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get order statuses error:', error);

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve order statuses'
      )
    );
  }
};

/**
 * Cancel order
 *
 * Cancels an order by updating its status to CANCELLED.
 * Users can only cancel their own orders.
 * Validates that the order can be cancelled (not already delivered or cancelled).
 *
 * Cancellation rules:
 * - Can cancel: Pending (1), Processing (2), Shipped (3)
 * - Cannot cancel: Delivered (4), already Cancelled (5)
 *
 * @route PATCH /api/v1/orders/:id/cancel
 * @access Private (user can cancel their own order, admin can cancel any order)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order ID
 * @param {Object} req.user - Authenticated user from middleware
 * @param {string} req.user.userId - User ID from JWT token
 * @param {Array} req.user.roles - User roles from JWT token
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order cancelled successfully
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 403 - User not authorized to cancel this order
 * @returns {Object} 404 - Order not found
 * @returns {Object} 422 - Order cannot be cancelled (already delivered or cancelled)
 * @returns {Object} 500 - Server error
 *
 * @example
 * PATCH /api/v1/orders/507f1f77bcf86cd799439011/cancel
 * Response: {
 *   "success": true,
 *   "message": "Order cancelled successfully",
 *   "data": {
 *     "order": { ... },
 *     "oldStatus": 2,
 *     "oldStatusLabel": "Processing",
 *     "newStatus": 5,
 *     "newStatusLabel": "Cancelled"
 *   }
 * }
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Extract user ID from JWT token (using 'sub' claim which is standard OIDC)
    const requestingUserId = req.user.sub || req.user.userId || req.user.id;
    const roles = req.user.roles || [];

    // Find order first to check if it exists and belongs to user
    const order = await Order.findById(id);

    // Handle order not found
    if (!order) {
      return res.status(404).json(
        ErrorResponse.notFound('Order', id)
      );
    }

    // Check if user owns this order (unless admin)
    const isAdmin = roles.some(role =>
      role === 3 || role === 'admin' || role === 'Admin'
    );

    // Compare both IDs as strings to ensure proper comparison
    const orderUserId = order.userId.toString();
    const authUserId = requestingUserId.toString();

    console.log('[Cancel Order] Authorization check:', {
      orderUserId,
      authUserId,
      isAdmin,
      match: orderUserId === authUserId
    });

    if (!isAdmin && orderUserId !== authUserId) {
      return res.status(403).json(
        ErrorResponse.forbidden(
          'You are not authorized to cancel this order',
          {
            orderId: id,
            reason: 'Order belongs to another user',
            orderUserId,
            requestingUserId: authUserId
          }
        )
      );
    }

    const currentStatus = order.status;

    // Check if order can be cancelled
    if (currentStatus === ORDER_STATUS.DELIVERED) {
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Cannot cancel delivered order',
          {
            orderId: id,
            currentStatus,
            currentStatusLabel: getStatusLabel(currentStatus),
            reason: 'Delivered orders cannot be cancelled. Please contact support for returns.'
          }
        )
      );
    }

    if (currentStatus === ORDER_STATUS.CANCELLED) {
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Order is already cancelled',
          {
            orderId: id,
            currentStatus,
            currentStatusLabel: getStatusLabel(currentStatus)
          }
        )
      );
    }

    // Validate transition is allowed
    if (!isValidTransition(currentStatus, ORDER_STATUS.CANCELLED)) {
      return res.status(422).json(
        ErrorResponse.unprocessableEntity(
          'Cannot cancel order in current status',
          {
            currentStatus,
            currentStatusLabel: getStatusLabel(currentStatus),
            reason: 'This order cannot be cancelled at this stage'
          }
        )
      );
    }

    // Execute Cancellation SAGA
    console.log(`[Controller] Executing cancellation SAGA for order ${id}`);

    const sagaResult = await executeCancellationSaga(id, {
      userId: requestingUserId.toString(),
      reason: req.body?.reason || 'Cancelled by customer'
    });

    if (!sagaResult.success) {
      return res.status(500).json(
        ErrorResponse.serverError(
          'Failed to cancel order',
          sagaResult.message || 'SAGA execution failed'
        )
      );
    }

    const updatedOrder = sagaResult.order;

    // Prepare event data for real-time notifications
    const statusChangeData = {
      order: updatedOrder,
      oldStatus: currentStatus,
      newStatus: ORDER_STATUS.CANCELLED,
      oldStatusLabel: getStatusLabel(currentStatus),
      newStatusLabel: getStatusLabel(ORDER_STATUS.CANCELLED)
    };

    // Emit status changed event for real-time notifications (WebSocket)
    orderEvents.emit(ORDER_EVENTS.STATUS_CHANGED, statusChangeData);

    // Emit cancellation event
    orderEvents.emit(ORDER_EVENTS.CANCELLED, updatedOrder);

    // Publish status change to Kafka (async, non-blocking)
    setImmediate(() => {
      publishOrderStatusChanged(statusChangeData).catch(err => {
        console.error('Failed to publish status change to Kafka:', err.message);
      });
    });

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        {
          order: updatedOrder,
          oldStatus: currentStatus,
          oldStatusLabel: getStatusLabel(currentStatus),
          newStatus: ORDER_STATUS.CANCELLED,
          newStatusLabel: getStatusLabel(ORDER_STATUS.CANCELLED),
          sagaId: sagaResult.sagaId,
          refundInitiated: sagaResult.refundInitiated
        },
        sagaResult.duplicate ? 'Order already cancelled' : 'Order cancelled successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Cancel order error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid order ID format',
          { id: 'Order ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to cancel order',
        'Please verify the order ID and try again'
      )
    );
  }
};
