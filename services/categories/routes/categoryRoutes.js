const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyAccessToken, requireRole, optionalAuth } = require('../middleware/auth');

// Public endpoints - anyone can view categories
router.get('/', optionalAuth, categoryController.getAllCategories);
router.get('/:id', optionalAuth, categoryController.getCategoryById);

// Protected endpoints - require authentication and admin role
router.post('/', verifyAccessToken, requireRole('admin'), categoryController.createCategory);
router.put('/:id', verifyAccessToken, requireRole('admin'), categoryController.updateCategory);
router.delete('/:id', verifyAccessToken, requireRole('admin'), categoryController.deleteCategory);

module.exports = router;
