const Order = require('../../../models/Order');
const orderController = require('../../../controllers/orderController');
const { orderEvents, ORDER_EVENTS } = require('../../../events/orderEvents');
const fixtures = require('../../fixtures/orders.json');

// Mock dependencies
jest.mock('../../../models/Order');
jest.mock('../../../events/orderEvents', () => ({
  orderEvents: {
    emit: jest.fn()
  },
  ORDER_EVENTS: {
    CREATED: 'order:created',
    UPDATED: 'order:updated',
    STATUS_CHANGED: 'order:status_changed',
    CANCELLED: 'order:cancelled',
    COMPLETED: 'order:completed'
  }
}));

describe('Order Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getAllOrders()', () => {
    // TC-ORD-002: Get All Orders - Admin Only
    test('TC-ORD-002: Should return all orders', async () => {
      // Arrange
      const mockOrders = [
        { ...fixtures.existingOrder },
        { ...fixtures.existingOrder, _id: '507f1f77bcf86cd799439021' }
      ];

      Order.find.mockResolvedValue(mockOrders);

      // Act
      await orderController.getAllOrders(req, res);

      // Assert
      expect(Order.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Orders retrieved successfully',
          data: expect.objectContaining({
            orders: mockOrders,
            count: mockOrders.length
          })
        })
      );
    });

    // TC-ORD-003: Get All Orders - Empty Result
    test('TC-ORD-003: Should return empty array when no orders exist', async () => {
      // Arrange
      Order.find.mockResolvedValue([]);

      // Act
      await orderController.getAllOrders(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            orders: [],
            count: 0
          })
        })
      );
    });
  });

  describe('getOrderById()', () => {
    // TC-ORD-004: Get Order by ID - Valid ID
    test('TC-ORD-004: Should return order by valid ID', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;

      const mockOrder = {
        _id: orderId,
        ...fixtures.existingOrder
      };

      Order.findById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrderById(req, res);

      // Assert
      expect(Order.findById).toHaveBeenCalledWith(orderId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Order retrieved successfully',
          data: expect.objectContaining({
            order: mockOrder
          })
        })
      );
    });

    // TC-ORD-005: Get Order by ID - Not Found
    test('TC-ORD-005: Should return 404 when order not found', async () => {
      // Arrange
      const orderId = 'nonexistent123';
      req.params.id = orderId;
      Order.findById.mockResolvedValue(null);

      // Act
      await orderController.getOrderById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not Found',
          message: `Order with ID '${orderId}' was not found`
        })
      );
    });
  });

  describe('getOrdersByUserId()', () => {
    // TC-ORD-008: Get Orders by User ID
    test('TC-ORD-008: Should return all orders for a specific user', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      req.params.userId = userId;

      const mockOrders = [
        { ...fixtures.existingOrder, userId },
        { ...fixtures.existingOrder, _id: '507f1f77bcf86cd799439021', userId }
      ];

      Order.find.mockResolvedValue(mockOrders);

      // Act
      await orderController.getOrdersByUserId(req, res);

      // Assert
      expect(Order.find).toHaveBeenCalledWith({ userId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User orders retrieved successfully',
          data: expect.objectContaining({
            orders: mockOrders,
            count: mockOrders.length,
            userId
          })
        })
      );
      expect(mockOrders.every(order => order.userId === userId)).toBe(true);
    });

    // TC-ORD-009: Get Orders by User ID - No Orders
    test('TC-ORD-009: Should return empty array when user has no orders', async () => {
      // Arrange
      const userId = 'user-with-no-orders';
      req.params.userId = userId;
      Order.find.mockResolvedValue([]);

      // Act
      await orderController.getOrdersByUserId(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            orders: [],
            count: 0,
            userId
          })
        })
      );
    });
  });

  describe('createOrder()', () => {
    // TC-ORD-001: Create Order - Valid Data
    test('TC-ORD-001: Should create order with valid data', async () => {
      // Arrange
      req.body = fixtures.validOrder;

      const savedOrder = {
        _id: 'new-order-id',
        orderNumber: 'ORD-1732024847593-XY34',
        ...fixtures.validOrder,
        totalAmount: 298.95, // (2 * 129.99) + (3 * 12.99)
        status: 'pending',
        paymentStatus: 'pending'
      };

      savedOrder.save = jest.fn().mockResolvedValue(savedOrder);

      Order.mockImplementation(() => savedOrder);

      // Act
      await orderController.createOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Order created successfully',
          data: expect.objectContaining({
            order: expect.objectContaining({
              userId: fixtures.validOrder.userId,
              items: expect.any(Array),
              orderNumber: expect.stringMatching(/^ORD-/)
            })
          })
        })
      );
      expect(orderEvents.emit).toHaveBeenCalledWith(ORDER_EVENTS.CREATED, savedOrder);
    });

    // TC-ORD-010: Create Order - Missing Required Fields
    test('TC-ORD-010: Should reject order with missing required fields', async () => {
      // Arrange
      req.body = fixtures.invalidOrders.missingUserId;

      // Act
      await orderController.createOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Required fields are missing',
          fields: expect.objectContaining({
            userId: 'User ID is required'
          })
        })
      );
      expect(orderEvents.emit).not.toHaveBeenCalled();
    });

    // TC-ORD-011: Create Order - Empty Items Array
    test('TC-ORD-011: Should reject order with empty items', async () => {
      // Arrange
      req.body = fixtures.invalidOrders.emptyItems;

      // Act
      await orderController.createOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unprocessable Entity',
          message: 'Cannot create order with empty cart'
        })
      );
    });

    // TC-ORD-019: WebSocket Event - Order Created
    test('TC-ORD-019: Should emit order created event via WebSocket', async () => {
      // Arrange
      req.body = fixtures.validOrder;

      const savedOrder = {
        _id: 'new-order-id',
        ...fixtures.validOrder,
        totalAmount: 298.95,
        status: 'pending'
      };

      savedOrder.save = jest.fn().mockResolvedValue(savedOrder);

      Order.mockImplementation(() => savedOrder);

      // Act
      await orderController.createOrder(req, res);

      // Assert
      expect(orderEvents.emit).toHaveBeenCalledWith(ORDER_EVENTS.CREATED, savedOrder);
      expect(orderEvents.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateOrder()', () => {
    // TC-ORD-012: Update Order - Valid Data
    test('TC-ORD-012: Should update order with valid data', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;
      req.body = {
        paymentStatus: 'paid'
      };

      const updatedOrder = {
        _id: orderId,
        ...fixtures.existingOrder,
        ...req.body
      };

      Order.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      // Act
      await orderController.updateOrder(req, res);

      // Assert
      expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
        orderId,
        req.body,
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Order updated successfully',
          data: expect.objectContaining({
            order: updatedOrder
          })
        })
      );
    });

    // TC-ORD-013: Update Order - Not Found
    test('TC-ORD-013: Should return 404 when updating non-existent order', async () => {
      // Arrange
      const orderId = 'nonexistent123';
      req.params.id = orderId;
      req.body = { status: 'processing' };

      Order.findByIdAndUpdate.mockResolvedValue(null);

      // Act
      await orderController.updateOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not Found',
          message: `Order with ID '${orderId}' was not found`
        })
      );
    });
  });

  describe('updateOrderStatus()', () => {
    // TC-ORD-014: Update Order Status - Pending to Processing
    test('TC-ORD-014: Should update order status from pending to processing', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;
      req.body = { status: 2 }; // 2 = processing

      const oldOrder = {
        _id: orderId,
        ...fixtures.existingOrder,
        status: 1 // 1 = pending
      };

      const updatedOrder = {
        ...oldOrder,
        status: 2 // 2 = processing
      };

      Order.findById.mockResolvedValue(oldOrder);
      Order.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      // Act
      await orderController.updateOrderStatus(req, res);

      // Assert
      expect(Order.findById).toHaveBeenCalledWith(orderId);
      expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
        orderId,
        { status: 2 },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Order status updated successfully',
          data: expect.objectContaining({
            order: updatedOrder,
            oldStatus: 1,
            newStatus: 2
          })
        })
      );
      expect(orderEvents.emit).toHaveBeenCalledWith(
        ORDER_EVENTS.STATUS_CHANGED,
        expect.objectContaining({
          order: updatedOrder,
          oldStatus: 1,
          newStatus: 2
        })
      );
    });

    // TC-ORD-015: Update Order Status - Mark as Delivered
    test('TC-ORD-015: Should mark order as delivered and emit completed event', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;
      req.body = { status: 4 }; // 4 = delivered

      const oldOrder = {
        _id: orderId,
        ...fixtures.existingOrder,
        status: 3 // 3 = shipped
      };

      const updatedOrder = {
        ...oldOrder,
        status: 4 // 4 = delivered
      };

      Order.findById.mockResolvedValue(oldOrder);
      Order.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      // Act
      await orderController.updateOrderStatus(req, res);

      // Assert
      expect(orderEvents.emit).toHaveBeenCalledWith(ORDER_EVENTS.STATUS_CHANGED, expect.any(Object));
      expect(orderEvents.emit).toHaveBeenCalledWith(ORDER_EVENTS.COMPLETED, updatedOrder);
    });

    // TC-ORD-016: Update Order Status - Cancel Order
    test('TC-ORD-016: Should cancel order and emit cancelled event', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;
      req.body = { status: 5 }; // 5 = cancelled

      const oldOrder = {
        _id: orderId,
        ...fixtures.existingOrder,
        status: 1 // 1 = pending
      };

      const updatedOrder = {
        ...oldOrder,
        status: 5 // 5 = cancelled
      };

      Order.findById.mockResolvedValue(oldOrder);
      Order.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      // Act
      await orderController.updateOrderStatus(req, res);

      // Assert
      expect(orderEvents.emit).toHaveBeenCalledWith(ORDER_EVENTS.STATUS_CHANGED, expect.any(Object));
      expect(orderEvents.emit).toHaveBeenCalledWith(ORDER_EVENTS.CANCELLED, updatedOrder);
    });

    // TC-ORD-020: WebSocket Event - Order Status Changed
    test('TC-ORD-020: Should emit status changed event via WebSocket', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;
      req.body = { status: 3 }; // 3 = shipped

      const oldOrder = {
        _id: orderId,
        ...fixtures.existingOrder,
        status: 2 // 2 = processing
      };

      const updatedOrder = {
        ...oldOrder,
        status: 3 // 3 = shipped
      };

      Order.findById.mockResolvedValue(oldOrder);
      Order.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      // Act
      await orderController.updateOrderStatus(req, res);

      // Assert
      expect(orderEvents.emit).toHaveBeenCalledWith(
        ORDER_EVENTS.STATUS_CHANGED,
        expect.objectContaining({
          order: updatedOrder,
          oldStatus: 2,
          newStatus: 3,
          oldStatusLabel: expect.any(String),
          newStatusLabel: expect.any(String)
        })
      );
    });

    // TC-ORD-017: Update Order Status - Invalid Status
    test('TC-ORD-017: Should handle invalid status update', async () => {
      // Arrange
      const orderId = '507f1f77bcf86cd799439020';
      req.params.id = orderId;
      req.body = { status: 'invalid-status' };

      const oldOrder = {
        _id: orderId,
        ...fixtures.existingOrder
      };

      Order.findById.mockResolvedValue(oldOrder);

      // Act
      await orderController.updateOrderStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Invalid status value'
        })
      );
    });

    // TC-ORD-018: Update Order Status - Order Not Found
    test('TC-ORD-018: Should return 404 when order not found for status update', async () => {
      // Arrange
      const orderId = 'nonexistent123';
      req.params.id = orderId;
      req.body = { status: 'processing' };

      Order.findById.mockResolvedValue(null);

      // Act
      await orderController.updateOrderStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not Found',
          message: `Order with ID '${orderId}' was not found`
        })
      );
      expect(orderEvents.emit).not.toHaveBeenCalled();
    });
  });
});
