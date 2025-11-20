/**
 * Standardized Error Response Utility
 *
 * Provides consistent error response format across all microservices
 *
 * @module utils/errorResponse
 * @version 1.0.0
 * @author LaunchpadMERN Team
 *
 * @example
 * const ErrorResponse = require('../utils/errorResponse');
 *
 * // In your controller
 * if (!user) {
 *   return res.status(404).json(
 *     ErrorResponse.notFound('User', userId)
 *   );
 * }
 */

class ErrorResponse {
  /**
   * Create a validation error response (400 Bad Request)
   *
   * Use this when user input is invalid or missing
   *
   * @param {string} message - Human-readable error message
   * @param {Object} fields - Field-level error details
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.validation('Required fields missing', {
   *   email: 'Email is required',
   *   password: 'Password must be at least 6 characters'
   * })
   */
  static validation(message, fields = {}) {
    return {
      success: false,
      error: 'Validation Error',
      message,
      fields,
      statusCode: 400
    };
  }

  /**
   * Create an authentication error response (401 Unauthorized)
   *
   * Use this when authentication is required but not provided or invalid
   *
   * @param {string} message - Error message
   * @param {string} suggestion - Optional suggestion for user
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.unauthorized('Invalid credentials')
   */
  static unauthorized(message = 'Authentication required', suggestion = 'Please log in and try again') {
    return {
      success: false,
      error: 'Unauthorized',
      message,
      suggestion,
      statusCode: 401
    };
  }

  /**
   * Create a forbidden error response (403 Forbidden)
   *
   * Use this when user is authenticated but lacks permission
   *
   * @param {string} message - Error message
   * @param {string} requiredRole - Role required for this action
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.forbidden('Admin access required', 'admin')
   */
  static forbidden(message = 'You do not have permission to perform this action', requiredRole = null) {
    const response = {
      success: false,
      error: 'Forbidden',
      message,
      statusCode: 403
    };

    if (requiredRole) {
      response.requiredRole = requiredRole;
    }

    return response;
  }

  /**
   * Create a not found error response (404 Not Found)
   *
   * Use this when a requested resource doesn't exist
   *
   * @param {string} resource - Type of resource (e.g., 'User', 'Product')
   * @param {string} id - Optional ID of the resource
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.notFound('Product', productId)
   */
  static notFound(resource, id = null) {
    const response = {
      success: false,
      error: 'Not Found',
      message: id ? `${resource} with ID '${id}' was not found` : `${resource} not found`,
      suggestion: 'Please verify the ID and try again',
      statusCode: 404
    };

    if (id) {
      response.id = id;
    }

    return response;
  }

  /**
   * Create a conflict error response (409 Conflict)
   *
   * Use this when there's a resource conflict (e.g., duplicate email)
   *
   * @param {string} message - Error message
   * @param {string} field - Field that has the conflict
   * @param {string} suggestion - Optional suggestion
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.conflict('Email already exists', 'email', 'Try logging in instead')
   */
  static conflict(message, field = null, suggestion = null) {
    const response = {
      success: false,
      error: 'Conflict',
      message,
      statusCode: 409
    };

    if (field) {
      response.field = field;
    }

    if (suggestion) {
      response.suggestion = suggestion;
    }

    return response;
  }

  /**
   * Create an unprocessable entity error response (422)
   *
   * Use this for semantic errors (valid syntax but business logic issues)
   *
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.unprocessableEntity('Invalid status transition', {
   *   currentStatus: 'delivered',
   *   attemptedStatus: 'pending'
   * })
   */
  static unprocessableEntity(message, details = {}) {
    return {
      success: false,
      error: 'Unprocessable Entity',
      message,
      details,
      statusCode: 422
    };
  }

  /**
   * Create a rate limit error response (429 Too Many Requests)
   *
   * Use this when rate limit is exceeded
   *
   * @param {number} retryAfter - Seconds until retry is allowed
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.tooManyRequests(60)
   */
  static tooManyRequests(retryAfter = null) {
    const response = {
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      suggestion: 'Please slow down and try again later',
      statusCode: 429
    };

    if (retryAfter) {
      response.retryAfter = retryAfter;
    }

    return response;
  }

  /**
   * Create a server error response (500 Internal Server Error)
   *
   * Use this for unexpected server errors
   * Note: Don't expose internal error details to users in production
   *
   * @param {string} message - User-friendly error message
   * @param {string} suggestion - Optional suggestion
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.serverError()
   */
  static serverError(message = 'An unexpected error occurred', suggestion = 'Please try again later or contact support') {
    return {
      success: false,
      error: 'Server Error',
      message,
      suggestion,
      statusCode: 500
    };
  }

  /**
   * Create a service unavailable error response (503)
   *
   * Use this when service is temporarily unavailable
   *
   * @param {string} message - Error message
   * @param {number} retryAfter - Optional seconds until service is available
   * @returns {Object} Standardized error response
   *
   * @example
   * ErrorResponse.serviceUnavailable('Maintenance in progress', 3600)
   */
  static serviceUnavailable(message = 'Service temporarily unavailable', retryAfter = null) {
    const response = {
      success: false,
      error: 'Service Unavailable',
      message,
      suggestion: 'Please try again later',
      statusCode: 503
    };

    if (retryAfter) {
      response.retryAfter = retryAfter;
    }

    return response;
  }

  /**
   * Handle Mongoose validation errors
   *
   * Converts Mongoose ValidationError to standardized format
   *
   * @param {Error} error - Mongoose ValidationError
   * @returns {Object} Standardized error response
   *
   * @example
   * catch (error) {
   *   if (error.name === 'ValidationError') {
   *     return res.status(400).json(
   *       ErrorResponse.mongooseValidation(error)
   *     );
   *   }
   * }
   */
  static mongooseValidation(error) {
    const fields = {};

    Object.keys(error.errors).forEach(key => {
      fields[key] = error.errors[key].message;
    });

    return {
      success: false,
      error: 'Validation Error',
      message: 'Please check the provided information',
      fields,
      statusCode: 400
    };
  }

  /**
   * Handle MongoDB duplicate key errors
   *
   * Converts MongoDB E11000 duplicate key error to standardized format
   *
   * @param {Error} error - MongoDB duplicate key error
   * @returns {Object} Standardized error response
   *
   * @example
   * catch (error) {
   *   if (error.code === 11000) {
   *     return res.status(409).json(
   *       ErrorResponse.mongoDuplicateKey(error)
   *     );
   *   }
   * }
   */
  static mongoDuplicateKey(error) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];

    return {
      success: false,
      error: 'Duplicate Entry',
      message: `This ${field} is already in use`,
      field,
      value,
      suggestion: `Please use a different ${field}`,
      statusCode: 409
    };
  }

  /**
   * Handle JWT errors
   *
   * Converts JWT errors to standardized format
   *
   * @param {Error} error - JWT error
   * @returns {Object} Standardized error response
   *
   * @example
   * catch (error) {
   *   if (error.name === 'JsonWebTokenError') {
   *     return res.status(401).json(
   *       ErrorResponse.jwtError(error)
   *     );
   *   }
   * }
   */
  static jwtError(error) {
    const errorMessages = {
      'JsonWebTokenError': 'Invalid token',
      'TokenExpiredError': 'Token has expired',
      'NotBeforeError': 'Token not yet valid'
    };

    return {
      success: false,
      error: 'Authentication Error',
      message: errorMessages[error.name] || 'Token validation failed',
      suggestion: 'Please log in again',
      statusCode: 401
    };
  }

  /**
   * Create a success response
   *
   * Use this for successful operations
   *
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {Object} meta - Optional metadata (pagination, etc.)
   * @returns {Object} Standardized success response
   *
   * @example
   * res.status(200).json(
   *   ErrorResponse.success({ user }, 'User registered successfully')
   * )
   */
  static success(data = {}, message = 'Operation successful', meta = null) {
    const response = {
      success: true,
      message,
      data
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }
}

module.exports = ErrorResponse;
