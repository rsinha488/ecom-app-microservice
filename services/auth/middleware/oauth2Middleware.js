const JWTManager = require('../utils/jwt');

/**
 * Middleware to verify OAuth2 access token
 */
const verifyAccessToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'No access token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = JWTManager.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired access token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
};

/**
 * Middleware to check if user has required scope
 */
const requireScope = (...requiredScopes) => {
  return (req, res, next) => {
    if (!req.user || !req.user.scope) {
      return res.status(403).json({
        error: 'insufficient_scope',
        error_description: 'Access token does not have required scope'
      });
    }

    const userScopes = Array.isArray(req.user.scope) ? req.user.scope : [];
    const hasRequiredScope = requiredScopes.some(scope => userScopes.includes(scope));

    if (!hasRequiredScope) {
      return res.status(403).json({
        error: 'insufficient_scope',
        error_description: `Required scope: ${requiredScopes.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        error: 'access_denied',
        error_description: 'User does not have required role'
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'access_denied',
        error_description: `Required role: ${requiredRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication - does not fail if token is missing
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = JWTManager.verifyAccessToken(token);
    req.user = decoded;
  } catch (error) {
    // Token is invalid but we don't fail the request
    req.user = null;
  }

  next();
};

module.exports = {
  verifyAccessToken,
  requireScope,
  requireRole,
  optionalAuth
};
