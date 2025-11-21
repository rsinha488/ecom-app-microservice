const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');
const { verifyAccessToken, requireRole, requireOwnerOrAdmin } = require('../../middleware/auth');
const { setVersionHeaders } = require('../../middleware/apiVersion');

// Apply version headers
router.use(setVersionHeaders);

// Protected endpoints - all require authentication
// IMPORTANT: More specific routes must come BEFORE parameterized routes
// Otherwise Express will match /:id before /user/:userId
router.get('/', verifyAccessToken, requireRole('admin'), orderController.getAllOrders);
router.get('/user/:userId', verifyAccessToken, requireOwnerOrAdmin, orderController.getOrdersByUserId);
router.get('/:id', verifyAccessToken, orderController.getOrderById);
router.post('/', verifyAccessToken, orderController.createOrder);
router.put('/:id', verifyAccessToken, orderController.updateOrder);
router.patch('/:id/status', verifyAccessToken, requireRole('admin'), orderController.updateOrderStatus);
router.delete('/:id', verifyAccessToken, requireRole('admin'), orderController.deleteOrder);

module.exports = router;
