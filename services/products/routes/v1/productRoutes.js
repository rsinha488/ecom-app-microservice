const express = require('express');
const router = express.Router();
const productController = require('../../controllers/productController');
const { verifyAccessToken, requireRole, optionalAuth } = require('../../middleware/auth');
const { setVersionHeaders } = require('../../middleware/apiVersion');
const {
  cacheMiddleware,
  detailCacheMiddleware,
  cacheInvalidationMiddleware
} = require('../../middleware/cache');

// Apply version headers
router.use(setVersionHeaders);

// Apply cache invalidation on write operations (POST, PUT, DELETE)
router.use(cacheInvalidationMiddleware('products:*'));

// Public endpoints - anyone can view products (with caching)
// IMPORTANT: /search must come before /:id to avoid route conflicts
router.get('/search',
  cacheMiddleware({
    ttl: 180,
    prefix: 'products:search',
    condition: (req, res, data) => res.statusCode === 200 && data.success === true
  }),
  optionalAuth,
  productController.searchProducts
);

router.get('/',
  cacheMiddleware({
    ttl: 300,
    prefix: 'products:list',
    condition: (req, res, data) => res.statusCode === 200 && data.success === true
  }),
  optionalAuth,
  productController.getAllProducts
);

router.get('/:id',
  detailCacheMiddleware({ ttl: 600, prefix: 'products:detail' }), // 10 min cache for single product
  optionalAuth,
  productController.getProductById
);

// Protected endpoints - require authentication (no caching, will invalidate cache)
router.post('/', verifyAccessToken, requireRole('admin'), productController.createProduct);
router.put('/:id', verifyAccessToken, requireRole('admin'), productController.updateProduct);
router.delete('/:id', verifyAccessToken, requireRole('admin'), productController.deleteProduct);

// Stock management endpoints - inter-service communication
// TODO: Add service-to-service authentication middleware
router.post('/:id/reserve', productController.reserveStock);
router.post('/:id/release', productController.releaseStock);

module.exports = router;
