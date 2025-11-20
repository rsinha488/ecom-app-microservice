/**
 * Category Controller
 *
 * Handles all category-related operations including CRUD operations
 *
 * @module controllers/categoryController
 * @requires ../models/Category
 * @requires ../utils/errorResponse
 */

const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Get all categories
 *
 * Retrieves a list of all categories in the database.
 * Optionally populates parent category information.
 *
 * @route GET /api/v1/categories
 * @access Public (anyone can view categories)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of categories
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/categories
 * Response: {
 *   "success": true,
 *   "message": "Categories retrieved successfully",
 *   "data": {
 *     "categories": [...],
 *     "count": 10
 *   }
 * }
 */
exports.getAllCategories = async (req, res) => {
  try {
    // Fetch all categories from database with parent category populated
    const categories = await Category.find().populate('parentCategory');

    // Return success response with categories
    res.status(200).json(
      ErrorResponse.success(
        { categories, count: categories.length },
        'Categories retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Get all categories error:', error);

    // Return generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve categories',
        'Please try again later'
      )
    );
  }
};

/**
 * Get category by ID
 *
 * Retrieves a single category by its MongoDB ObjectID.
 * Returns 404 if category is not found.
 *
 * @route GET /api/v1/categories/:id
 * @access Public (anyone can view a category)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Category ID (MongoDB ObjectID)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Category data
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Category not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/categories/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "Category retrieved successfully",
 *   "data": {
 *     "category": { ... }
 *   }
 * }
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find category by ID with parent category populated
    const category = await Category.findById(id).populate('parentCategory');

    // Handle category not found
    if (!category) {
      return res.status(404).json(
        ErrorResponse.notFound('Category', id)
      );
    }

    // Return success response with category data
    res.status(200).json(
      ErrorResponse.success(
        { category },
        'Category retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Get category by ID error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid category ID format',
          { id: 'Category ID must be a valid MongoDB ObjectID (24 hex characters)' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve category',
        'Please verify the category ID and try again'
      )
    );
  }
};

/**
 * Create new category
 *
 * Creates a new category in the database.
 * Requires admin authentication (handled by middleware).
 * Validates all required fields before creation.
 *
 * @route POST /api/v1/categories
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Category data
 * @param {string} req.body.name - Category name (required)
 * @param {string} req.body.slug - Category slug (required, unique)
 * @param {string} req.body.description - Category description (optional)
 * @param {string} req.body.parentCategory - Parent category ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Category created successfully
 * @returns {Object} 400 - Validation error
 * @returns {Object} 409 - Duplicate category slug
 * @returns {Object} 500 - Server error
 *
 * @example
 * POST /api/v1/categories
 * Body: {
 *   "name": "Electronics",
 *   "slug": "electronics",
 *   "description": "Electronic devices and accessories"
 * }
 * Response: {
 *   "success": true,
 *   "message": "Category created successfully",
 *   "data": {
 *     "category": { ... }
 *   }
 * }
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    // Validate required fields
    const missingFields = {};
    if (!name) missingFields.name = 'Category name is required';
    if (!slug) missingFields.slug = 'Category slug is required';

    // If any required fields are missing, return validation error
    if (Object.keys(missingFields).length > 0) {
      return res.status(400).json(
        ErrorResponse.validation('Required fields are missing', missingFields)
      );
    }

    // Create new category instance
    const category = new Category(req.body);

    // Save category to database
    const newCategory = await category.save();

    // Return success response with created category
    res.status(201).json(
      ErrorResponse.success(
        { category: newCategory },
        'Category created successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Create category error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Handle MongoDB duplicate key error (e.g., duplicate slug)
    if (error.code === 11000) {
      return res.status(409).json(
        ErrorResponse.mongoDuplicateKey(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to create category',
        'Please check the category information and try again'
      )
    );
  }
};

/**
 * Update category
 *
 * Updates an existing category by ID.
 * Requires admin authentication (handled by middleware).
 * Only provided fields will be updated.
 *
 * @route PUT /api/v1/categories/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Category ID to update
 * @param {Object} req.body - Fields to update
 * @param {string} req.body.name - Category name (optional)
 * @param {string} req.body.slug - Category slug (optional)
 * @param {string} req.body.description - Category description (optional)
 * @param {string} req.body.parentCategory - Parent category ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Category updated successfully
 * @returns {Object} 400 - Validation error or invalid ID format
 * @returns {Object} 404 - Category not found
 * @returns {Object} 409 - Duplicate category slug
 * @returns {Object} 500 - Server error
 *
 * @example
 * PUT /api/v1/categories/507f1f77bcf86cd799439011
 * Body: {
 *   "name": "Consumer Electronics",
 *   "description": "Updated description"
 * }
 * Response: {
 *   "success": true,
 *   "message": "Category updated successfully",
 *   "data": {
 *     "category": { ... }
 *   }
 * }
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and update category
    // new: true -> return updated document
    // runValidators: true -> run model validators on update
    const category = await Category.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    // Handle category not found
    if (!category) {
      return res.status(404).json(
        ErrorResponse.notFound('Category', id)
      );
    }

    // Return success response with updated category
    res.status(200).json(
      ErrorResponse.success(
        { category },
        'Category updated successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Update category error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid category ID format',
          { id: 'Category ID must be a valid MongoDB ObjectID' }
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
        'Failed to update category',
        'Please verify the category ID and data'
      )
    );
  }
};

/**
 * Delete category
 *
 * Permanently deletes a category from the database.
 * Requires admin authentication (handled by middleware).
 * This operation cannot be undone.
 *
 * @route DELETE /api/v1/categories/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Category ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Category deleted successfully
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Category not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * DELETE /api/v1/categories/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "Category deleted successfully",
 *   "data": {
 *     "deletedCategoryId": "507f1f77bcf86cd799439011"
 *   }
 * }
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete category
    const category = await Category.findByIdAndDelete(id);

    // Handle category not found
    if (!category) {
      return res.status(404).json(
        ErrorResponse.notFound('Category', id)
      );
    }

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        { deletedCategoryId: id },
        'Category deleted successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Delete category error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid category ID format',
          { id: 'Category ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to delete category',
        'Please verify the category ID and try again'
      )
    );
  }
};
