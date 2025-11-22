# Error Handling Implementation Guide

**Date:** 2025-11-20
**Status:** 📋 Comprehensive Error Handling Standards

---

## 🎯 Overview

This guide provides standardized error handling patterns for all microservices with:
- Consistent status codes
- Meaningful error messages
- Developer-friendly comments
- User-friendly suggestions
- Proper logging

---

## 📊 Standard Error Response Format

### Success Response:
```javascript
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response:
```javascript
{
  "success": false,
  "error": "Error Type", // Short, machine-readable error type
  "message": "Human-readable error message", // User-friendly message
  "suggestion": "What the user should do next", // Optional guidance
  "fields": { // Optional field-level errors for validation
    "fieldName": "Error message for this field"
  }
}
```

---

## 🔢 HTTP Status Codes Guide

| Code | Name | Usage | Example |
|------|------|-------|---------|
| **200** | OK | Successful GET, PUT, PATCH, DELETE | User info retrieved |
| **201** | Created | Successful POST (resource created) | User registered |
| **400** | Bad Request | Invalid input, validation errors | Missing required fields |
| **401** | Unauthorized | Missing/invalid authentication | Invalid credentials |
| **403** | Forbidden | Authenticated but no permission | Not admin for this action |
| **404** | Not Found | Resource doesn't exist | User/Product not found |
| **409** | Conflict | Resource conflict | Duplicate email |
| **422** | Unprocessable Entity | Valid syntax but semantic errors | Invalid business logic |
| **429** | Too Many Requests | Rate limit exceeded | Too many login attempts |
| **500** | Internal Server Error | Unexpected server errors | Database connection failed |
| **503** | Service Unavailable | Service temporarily down | Maintenance mode |

---

## 🛠️ Implementation Patterns

### Pattern 1: Validation Errors (400)

```javascript
/**
 * Validate required fields
 * Returns 400 with field-level errors
 */
if (!email || !password || !name) {
  return res.status(400).json({
    success: false,
    error: 'Validation Error',
    message: 'Required fields are missing',
    fields: {
      email: !email ? 'Email is required' : null,
      password: !password ? 'Password is required' : null,
      name: !name ? 'Name is required' : null
    }
  });
}
```

### Pattern 2: Authentication Errors (401)

```javascript
/**
 * Invalid credentials
 * Returns 401 with user-friendly message
 */
const user = await User.findOne({ email });
if (!user || !(await user.comparePassword(password))) {
  return res.status(401).json({
    success: false,
    error: 'Authentication Failed',
    message: 'Invalid email or password',
    suggestion: 'Please check your credentials and try again'
  });
}
```

### Pattern 3: Not Found Errors (404)

```javascript
/**
 * Resource not found
 * Returns 404 with helpful message
 */
const product = await Product.findById(id);
if (!product) {
  return res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Product with ID '${id}' was not found`,
    suggestion: 'Please verify the product ID and try again'
  });
}
```

### Pattern 4: Duplicate Resource (409)

```javascript
/**
 * Resource already exists
 * Returns 409 conflict
 */
const existingUser = await User.findOne({ email });
if (existingUser) {
  return res.status(409).json({
    success: false,
    error: 'Duplicate Email',
    message: 'An account with this email already exists',
    suggestion: 'Try logging in instead or use a different email'
  });
}
```

### Pattern 5: Permission Denied (403)

```javascript
/**
 * User authenticated but lacks permission
 * Returns 403 forbidden
 */
if (!req.user.roles.includes('admin')) {
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'You do not have permission to perform this action',
    requiredRole: 'admin',
    yourRoles: req.user.roles
  });
}
```

### Pattern 6: Server Errors (500)

```javascript
/**
 * Unexpected errors
 * Returns 500 with generic message (hide internal details)
 */
try {
  // Operation
} catch (error) {
  console.error('Operation error:', error); // Log for debugging

  return res.status(500).json({
    success: false,
    error: 'Server Error',
    message: 'An unexpected error occurred',
    suggestion: 'Please try again later or contact support'
    // Don't expose error.message to users in production!
  });
}
```

### Pattern 7: MongoDB Validation Errors

```javascript
/**
 * Handle Mongoose validation errors
 * Returns 400 with field-specific messages
 */
catch (error) {
  if (error.name === 'ValidationError') {
    const fields = {};
    Object.keys(error.errors).forEach(key => {
      fields[key] = error.errors[key].message;
    });

    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Please check the provided information',
      fields
    });
  }
}
```

### Pattern 8: MongoDB Duplicate Key Error

```javascript
/**
 * Handle MongoDB duplicate key errors
 * Returns 409 conflict
 */
catch (error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: `This ${field} is already in use`,
      field: field,
      value: error.keyValue[field]
    });
  }
}
```

---

## 📝 Code Documentation Standards

### Function Documentation Template:

```javascript
/**
 * Brief description of what the function does
 *
 * @route HTTP_METHOD /api/v1/resource/path
 * @access Public|Protected|Admin
 * @param {Type} param - Description
 * @returns {Object} statusCode - Description
 * @throws {Error} statusCode - Error description
 * @example
 * // Example usage
 * POST /api/v1/users/register
 * Body: { email, password, name }
 */
exports.functionName = async (req, res) => {
  try {
    // 1. Extract and validate input
    const { field1, field2 } = req.body;

    // 2. Check preconditions
    if (!field1) {
      return res.status(400).json({...});
    }

    // 3. Perform business logic
    const result = await Model.operation();

    // 4. Return success response
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    // 5. Handle errors appropriately
    console.error('Function error:', error);
    res.status(500).json({...});
  }
};
```

### Inline Comments Best Practices:

```javascript
// ✅ GOOD: Explain WHY, not WHAT
// Hash password for security before storing
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ GOOD: Explain business logic
// Users can only edit their own profile unless they're admin
if (req.user.id !== userId && !req.user.roles.includes('admin')) {
  return res.status(403).json({...});
}

// ✅ GOOD: Explain non-obvious code
// Mongoose populate is needed here to avoid N+1 query problem
const orders = await Order.find({ userId }).populate('items.productId');

// ❌ BAD: State the obvious
// Set name to the name from request
const name = req.body.name;

// ❌ BAD: Redundant comment
// Find user by ID
const user = await User.findById(id);
```

---

## 🔧 Utility Functions

### Create Error Response Utility:

**File:** `services/[service]/utils/errorResponse.js`

```javascript
/**
 * Standardized error response utility
 * Ensures consistent error format across all endpoints
 */

class ErrorResponse {
  /**
   * Create a validation error response
   */
  static validation(message, fields = {}) {
    return {
      success: false,
      error: 'Validation Error',
      message,
      fields
    };
  }

  /**
   * Create an authentication error response
   */
  static unauthorized(message = 'Authentication required') {
    return {
      success: false,
      error: 'Unauthorized',
      message,
      suggestion: 'Please log in and try again'
    };
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(message = 'You do not have permission', requiredRole = null) {
    return {
      success: false,
      error: 'Forbidden',
      message,
      ...(requiredRole && { requiredRole })
    };
  }

  /**
   * Create a not found error response
   */
  static notFound(resource, id = null) {
    return {
      success: false,
      error: 'Not Found',
      message: `${resource} not found`,
      ...(id && { id })
    };
  }

  /**
   * Create a conflict error response
   */
  static conflict(message, field = null) {
    return {
      success: false,
      error: 'Conflict',
      message,
      ...(field && { field })
    };
  }

  /**
   * Create a server error response
   */
  static serverError(message = 'An unexpected error occurred') {
    return {
      success: false,
      error: 'Server Error',
      message,
      suggestion: 'Please try again later or contact support'
    };
  }
}

module.exports = ErrorResponse;
```

### Usage Example:

```javascript
const ErrorResponse = require('../utils/errorResponse');

// Validation error
if (!email) {
  return res.status(400).json(
    ErrorResponse.validation('Email is required', {
      email: 'Email field cannot be empty'
    })
  );
}

// Not found error
const user = await User.findById(id);
if (!user) {
  return res.status(404).json(
    ErrorResponse.notFound('User', id)
  );
}

// Unauthorized error
if (!token) {
  return res.status(401).json(
    ErrorResponse.unauthorized()
  );
}
```

---

## 🎯 Service-Specific Examples

### Auth Service Error Handling:

```javascript
// Registration - Duplicate email (409)
const existingUser = await User.findOne({ email });
if (existingUser) {
  return res.status(409).json({
    success: false,
    error: 'Duplicate Email',
    message: 'An account with this email already exists',
    suggestion: 'Try logging in or use password recovery'
  });
}

// Login - Invalid credentials (401)
if (!user || !(await user.comparePassword(password))) {
  return res.status(401).json({
    success: false,
    error: 'Authentication Failed',
    message: 'Invalid email or password',
    suggestion: 'Please check your credentials'
  });
}

// Token - Expired (401)
if (new Date() > token.expires_at) {
  return res.status(401).json({
    success: false,
    error: 'Token Expired',
    message: 'Your session has expired',
    expiredAt: token.expires_at,
    suggestion: 'Please log in again'
  });
}
```

### Products Service Error Handling:

```javascript
// Get Product - Not Found (404)
const product = await Product.findById(id);
if (!product) {
  return res.status(404).json({
    success: false,
    error: 'Product Not Found',
    message: `Product with ID '${id}' does not exist`,
    suggestion: 'Please check the product ID'
  });
}

// Create Product - Validation (400)
if (!name || !price || price < 0) {
  return res.status(400).json({
    success: false,
    error: 'Validation Error',
    message: 'Invalid product data',
    fields: {
      name: !name ? 'Product name is required' : null,
      price: !price ? 'Price is required' : price < 0 ? 'Price must be positive' : null
    }
  });
}

// Delete Product - Permission (403)
if (!req.user.roles.includes('admin')) {
  return res.status(403).json({
    success: false,
    error: 'Admin Access Required',
    message: 'Only administrators can delete products',
    yourRole: req.user.roles[0],
    requiredRole: 'admin'
  });
}
```

### Orders Service Error Handling:

```javascript
// Create Order - Empty cart (400)
if (!items || items.length === 0) {
  return res.status(400).json({
    success: false,
    error: 'Empty Order',
    message: 'Cannot create an order without items',
    suggestion: 'Add products to your cart first'
  });
}

// Get Order - Not authorized (403)
if (order.userId !== req.user.id && !req.user.roles.includes('admin')) {
  return res.status(403).json({
    success: false,
    error: 'Access Denied',
    message: 'You can only view your own orders',
    suggestion: 'Contact support if you believe this is an error'
  });
}

// Update Status - Invalid transition (422)
const validTransitions = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered']
};

if (!validTransitions[currentStatus]?.includes(newStatus)) {
  return res.status(422).json({
    success: false,
    error: 'Invalid Status Transition',
    message: `Cannot change order status from '${currentStatus}' to '${newStatus}'`,
    currentStatus,
    allowedTransitions: validTransitions[currentStatus]
  });
}
```

---

## 🔍 Frontend Error Handling

### Handle Backend Errors in Frontend:

```typescript
// frontend/src/utils/apiErrorHandler.ts

export interface APIError {
  success: false;
  error: string;
  message: string;
  suggestion?: string;
  fields?: Record<string, string>;
}

/**
 * Extract user-friendly error message from API response
 */
export function getErrorMessage(error: any): string {
  // API error response
  if (error.response?.data) {
    const data = error.response.data;

    // Use custom message if available
    if (data.message) {
      return data.message;
    }

    // Field-level errors
    if (data.fields) {
      const fieldErrors = Object.values(data.fields).filter(Boolean);
      if (fieldErrors.length > 0) {
        return fieldErrors.join(', ');
      }
    }

    // Fallback to error type
    if (data.error) {
      return data.error;
    }
  }

  // Network errors
  if (error.message === 'Network Error') {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get suggestion from API error
 */
export function getErrorSuggestion(error: any): string | null {
  return error.response?.data?.suggestion || null;
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: any): boolean {
  return error.response?.status === 401;
}

/**
 * Check if error is permission related
 */
export function isPermissionError(error: any): boolean {
  return error.response?.status === 403;
}
```

### Usage in React Components:

```typescript
import { getErrorMessage, getErrorSuggestion, isAuthError } from '@/utils/apiErrorHandler';

try {
  const response = await axios.post('/api/v1/auth/login', credentials);
  // Handle success
} catch (error) {
  const message = getErrorMessage(error);
  const suggestion = getErrorSuggestion(error);

  // Show error to user
  toast.error(message);

  if (suggestion) {
    toast.info(suggestion);
  }

  // Redirect to login if auth error
  if (isAuthError(error)) {
    router.push('/login');
  }
}
```

---

## ✅ Implementation Checklist

### For Each Endpoint:

- [ ] **Input Validation**
  - [ ] Check required fields (400)
  - [ ] Validate data types (400)
  - [ ] Validate data formats (400)
  - [ ] Validate business rules (422)

- [ ] **Authentication & Authorization**
  - [ ] Check authentication (401)
  - [ ] Check permissions (403)
  - [ ] Validate token expiry (401)

- [ ] **Resource Operations**
  - [ ] Handle not found (404)
  - [ ] Handle duplicates (409)
  - [ ] Handle conflicts (409)

- [ ] **Error Responses**
  - [ ] Consistent format
  - [ ] User-friendly messages
  - [ ] Helpful suggestions
  - [ ] No sensitive data exposed

- [ ] **Documentation**
  - [ ] JSDoc comments
  - [ ] Inline comments for complex logic
  - [ ] Example requests/responses

- [ ] **Logging**
  - [ ] Log errors with context
  - [ ] Don't log sensitive data
  - [ ] Include timestamps
  - [ ] Include user/request IDs

---

## 🎯 Next Steps

1. ✅ Created enhanced Auth controller with improved error handling
2. ⏳ Create enhanced Products controller
3. ⏳ Create enhanced Orders controller
4. ⏳ Create enhanced Categories controller
5. ⏳ Create enhanced Users controller
6. ⏳ Update frontend error handling utilities
7. ⏳ Update all frontend API calls to handle new error format

---

**See `authController.enhanced.js` for a complete example implementation!**
