/**
 * User Controller
 *
 * Handles all user-related operations including registration, authentication, and CRUD operations
 *
 * @module controllers/userController
 * @requires ../models/User
 * @requires ../utils/errorResponse
 * @requires jsonwebtoken
 */

const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');

/**
 * Register new user
 *
 * Creates a new user account with email and password.
 * Returns JWT token for immediate authentication.
 *
 * @route POST /api/v1/users/register
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - User registration data
 * @param {string} req.body.name - User's full name (required)
 * @param {string} req.body.email - User's email (required, unique)
 * @param {string} req.body.password - User's password (required, min 6 chars)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - User registered successfully with token
 * @returns {Object} 400 - Validation error
 * @returns {Object} 409 - User already exists
 * @returns {Object} 500 - Server error
 *
 * @example
 * POST /api/v1/users/register
 * Body: {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "securepass123"
 * }
 * Response: {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "data": {
 *     "token": "jwt_token_here",
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "role": "user"
 *     }
 *   }
 * }
 */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    const missingFields = {};
    if (!name) missingFields.name = 'Name is required';
    if (!email) missingFields.email = 'Email is required';
    if (!password) missingFields.password = 'Password is required';

    // If any required fields are missing, return validation error
    if (Object.keys(missingFields).length > 0) {
      return res.status(400).json(
        ErrorResponse.validation('Required fields are missing', missingFields)
      );
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Password validation failed',
          { password: 'Password must be at least 6 characters' }
        )
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json(
        ErrorResponse.conflict(
          'User with this email already exists',
          'email',
          'Try logging in instead or use a different email'
        )
      );
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return success response with token and user data
    res.status(201).json(
      ErrorResponse.success(
        {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        },
        'User registered successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Register user error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json(
        ErrorResponse.mongoDuplicateKey(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to register user',
        'Please check your information and try again'
      )
    );
  }
};

/**
 * Login user
 *
 * Authenticates user with email and password.
 * Returns JWT token on successful authentication.
 *
 * @route POST /api/v1/users/login
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.email - User's email (required)
 * @param {string} req.body.password - User's password (required)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Login successful with token
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 500 - Server error
 *
 * @example
 * POST /api/v1/users/login
 * Body: {
 *   "email": "john@example.com",
 *   "password": "securepass123"
 * }
 * Response: {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "token": "jwt_token_here",
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "role": "user"
 *     }
 *   }
 * }
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    const missingFields = {};
    if (!email) missingFields.email = 'Email is required';
    if (!password) missingFields.password = 'Password is required';

    // If any required fields are missing, return validation error
    if (Object.keys(missingFields).length > 0) {
      return res.status(400).json(
        ErrorResponse.validation('Required fields are missing', missingFields)
      );
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json(
        ErrorResponse.unauthorized(
          'Invalid credentials',
          'Please check your email and password'
        )
      );
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json(
        ErrorResponse.unauthorized(
          'Invalid credentials',
          'Please check your email and password'
        )
      );
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return success response with token and user data
    res.status(200).json(
      ErrorResponse.success(
        {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        },
        'Login successful'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Login user error:', error);

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to login',
        'Please try again later'
      )
    );
  }
};

/**
 * Get all users
 *
 * Retrieves a list of all users in the database.
 * Excludes password field from response.
 *
 * @route GET /api/v1/users
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of users
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/users
 * Response: {
 *   "success": true,
 *   "message": "Users retrieved successfully",
 *   "data": {
 *     "users": [...],
 *     "count": 10
 *   }
 * }
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users from database, excluding password field
    const users = await User.find().select('-password');

    // Return success response with users
    res.status(200).json(
      ErrorResponse.success(
        { users, count: users.length },
        'Users retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Get all users error:', error);

    // Return generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve users',
        'Please try again later'
      )
    );
  }
};

/**
 * Get user by ID
 *
 * Retrieves a single user by their MongoDB ObjectID.
 * Returns 404 if user is not found.
 *
 * @route GET /api/v1/users/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID (MongoDB ObjectID)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - User data
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/users/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "User retrieved successfully",
 *   "data": {
 *     "user": { ... }
 *   }
 * }
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user by ID, excluding password field
    const user = await User.findById(id).select('-password');

    // Handle user not found
    if (!user) {
      return res.status(404).json(
        ErrorResponse.notFound('User', id)
      );
    }

    // Return success response with user data
    res.status(200).json(
      ErrorResponse.success(
        { user },
        'User retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Get user by ID error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid user ID format',
          { id: 'User ID must be a valid MongoDB ObjectID (24 hex characters)' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve user',
        'Please verify the user ID and try again'
      )
    );
  }
};

/**
 * Update user
 *
 * Updates an existing user by ID.
 * Requires admin authentication (handled by middleware).
 * Password cannot be updated through this endpoint.
 * Only provided fields will be updated.
 *
 * @route PUT /api/v1/users/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID to update
 * @param {Object} req.body - Fields to update
 * @param {string} req.body.name - User's name (optional)
 * @param {string} req.body.email - User's email (optional)
 * @param {string} req.body.role - User's role (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - User updated successfully
 * @returns {Object} 400 - Validation error or invalid ID format
 * @returns {Object} 404 - User not found
 * @returns {Object} 409 - Duplicate email
 * @returns {Object} 500 - Server error
 *
 * @example
 * PUT /api/v1/users/507f1f77bcf86cd799439011
 * Body: {
 *   "name": "John Updated",
 *   "role": "admin"
 * }
 * Response: {
 *   "success": true,
 *   "message": "User updated successfully",
 *   "data": {
 *     "user": { ... }
 *   }
 * }
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Remove password from update data (password should be updated via separate endpoint)
    const { password, ...updateData } = req.body;

    // Find and update user
    // new: true -> return updated document
    // runValidators: true -> run model validators on update
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Handle user not found
    if (!user) {
      return res.status(404).json(
        ErrorResponse.notFound('User', id)
      );
    }

    // Return success response with updated user
    res.status(200).json(
      ErrorResponse.success(
        { user },
        'User updated successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Update user error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid user ID format',
          { id: 'User ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json(
        ErrorResponse.mongoDuplicateKey(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to update user',
        'Please verify the user ID and data'
      )
    );
  }
};

/**
 * Delete user
 *
 * Permanently deletes a user from the database.
 * Requires admin authentication (handled by middleware).
 * This operation cannot be undone.
 *
 * @route DELETE /api/v1/users/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} 200 - User deleted successfully
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * DELETE /api/v1/users/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "User deleted successfully",
 *   "data": {
 *     "deletedUserId": "507f1f77bcf86cd799439011"
 *   }
 * }
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete user
    const user = await User.findByIdAndDelete(id);

    // Handle user not found
    if (!user) {
      return res.status(404).json(
        ErrorResponse.notFound('User', id)
      );
    }

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        { deletedUserId: id },
        'User deleted successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Delete user error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid user ID format',
          { id: 'User ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to delete user',
        'Please verify the user ID and try again'
      )
    );
  }
};
