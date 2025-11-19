const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../../controllers/authController');
const { verifyAccessToken } = require('../../middleware/oauth2Middleware');
const { setVersionHeaders } = require('../../middleware/apiVersion');

// Apply version headers to all routes
router.use(setVersionHeaders);

// User registration
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim()
  ],
  authController.register
);

// OAuth2 Authorization endpoint
router.get('/oauth/authorize', authController.authorize);

// Login and get authorization code
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  authController.login
);

// OAuth2 Token endpoint
router.post('/oauth/token', authController.token);

// OpenID Connect UserInfo endpoint
router.get('/oauth/userinfo', verifyAccessToken, authController.userinfo);

// Token revocation endpoint
router.post('/oauth/revoke', authController.revoke);

// OpenID Connect Discovery endpoint
router.get('/.well-known/openid-configuration', authController.discovery);

module.exports = router;
