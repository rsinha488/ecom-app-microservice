const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { verifyAccessToken, requireRole, requireSelfOrAdmin } = require('../../middleware/auth');
const { setVersionHeaders } = require('../../middleware/apiVersion');

// Apply version headers
router.use(setVersionHeaders);

// Public endpoints - registration and login (deprecated - use auth service instead)
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected endpoints - require authentication
router.get('/', verifyAccessToken, requireRole('admin'), userController.getAllUsers);
router.get('/:id', verifyAccessToken, requireSelfOrAdmin, userController.getUserById);
router.put('/:id', verifyAccessToken, requireSelfOrAdmin, userController.updateUser);
router.delete('/:id', verifyAccessToken, requireRole('admin'), userController.deleteUser);

module.exports = router;
