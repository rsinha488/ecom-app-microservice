const express = require('express');
const router = express.Router();
const productController = require('../../controllers/productController');
const { verifyAccessToken, requireRole, optionalAuth } = require('../../middleware/auth');
const { setVersionHeaders } = require('../../middleware/apiVersion');

// Apply version headers
router.use(setVersionHeaders);

// Public endpoints - anyone can view products
router.get('/', optionalAuth, productController.getAllProducts);
router.get('/:id', optionalAuth, productController.getProductById);

// Protected endpoints - require authentication
router.post('/', verifyAccessToken, requireRole('admin'), productController.createProduct);
router.put('/:id', verifyAccessToken, requireRole('admin'), productController.updateProduct);
router.delete('/:id', verifyAccessToken, requireRole('admin'), productController.deleteProduct);

module.exports = router;
