/**
 * Product Controller
 *
 * Handles all product-related operations including CRUD operations
 *
 * @module controllers/productController
 * @requires ../models/Product
 * @requires ../utils/errorResponse
 */

const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Get all products
 *
 * Retrieves a list of all products in the database.
 * Optionally supports filtering, sorting, and pagination.
 *
 * @route GET /api/v1/products
 * @access Public (anyone can view products)
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering/pagination
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Array of products
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/products
 * Response: {
 *   "success": true,
 *   "message": "Products retrieved successfully",
 *   "data": {
 *     "products": [...],
 *     "count": 10
 *   }
 * }
 */
exports.getAllProducts = async (req, res) => {
  try {
    // Build query based on filters
    const query = {};

    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    // Stock filter
    if (req.query.inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Search filter (if provided)
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Sorting
    let sort = {};
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort[sortField] = sortOrder;
    } else {
      sort = { createdAt: -1 }; // Default: newest first
    }

    // Fetch products with filters, pagination, and sorting
    const products = await Product.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Return success response with products and pagination info
    res.status(200).json(
      ErrorResponse.success(
        {
          products,
          count: products.length,
          total,
          page,
          pages: Math.ceil(total / limit)
        },
        'Products retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Get all products error:', error);

    // Return generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve products',
        'Please try again later'
      )
    );
  }
};

/**
 * Get product by ID
 *
 * Retrieves a single product by its MongoDB ObjectID.
 * Returns 404 if product is not found.
 *
 * @route GET /api/v1/products/:id
 * @access Public (anyone can view a product)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID (MongoDB ObjectID)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Product data
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Product not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/products/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "Product retrieved successfully",
 *   "data": {
 *     "product": { ... }
 *   }
 * }
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find product by ID
    const product = await Product.findById(id);

    // Handle product not found
    if (!product) {
      return res.status(404).json(
        ErrorResponse.notFound('Product', id)
      );
    }

    // Return success response with product data
    res.status(200).json(
      ErrorResponse.success(
        { product },
        'Product retrieved successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Get product by ID error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product ID format',
          { id: 'Product ID must be a valid MongoDB ObjectID (24 hex characters)' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to retrieve product',
        'Please verify the product ID and try again'
      )
    );
  }
};

/**
 * Create new product
 *
 * Creates a new product in the database.
 * Requires admin authentication (handled by middleware).
 * Validates all required fields before creation.
 *
 * @route POST /api/v1/products
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Product data
 * @param {string} req.body.name - Product name (required)
 * @param {string} req.body.description - Product description (required)
 * @param {number} req.body.price - Product price (required, positive)
 * @param {number} req.body.stock - Stock quantity (required, non-negative)
 * @param {string} req.body.category - Category ID (required)
 * @param {string} req.body.imageUrl - Product image URL (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Product created successfully
 * @returns {Object} 400 - Validation error
 * @returns {Object} 409 - Duplicate product name
 * @returns {Object} 500 - Server error
 *
 * @example
 * POST /api/v1/products
 * Body: {
 *   "name": "Wireless Mouse",
 *   "description": "Ergonomic wireless mouse",
 *   "price": 29.99,
 *   "stock": 100,
 *   "category": "507f1f77bcf86cd799439011"
 * }
 * Response: {
 *   "success": true,
 *   "message": "Product created successfully",
 *   "data": {
 *     "product": { ... }
 *   }
 * }
 */
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    // Validate required fields
    const missingFields = {};
    if (!name) missingFields.name = 'Product name is required';
    if (!description) missingFields.description = 'Product description is required';
    if (price === undefined || price === null) missingFields.price = 'Product price is required';
    if (stock === undefined || stock === null) missingFields.stock = 'Stock quantity is required';
    if (!category) missingFields.category = 'Product category is required';

    // If any required fields are missing, return validation error
    if (Object.keys(missingFields).length > 0) {
      return res.status(400).json(
        ErrorResponse.validation('Required fields are missing', missingFields)
      );
    }

    // Validate price is positive
    if (price < 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product price',
          { price: 'Price must be a positive number' }
        )
      );
    }

    // Validate stock is non-negative
    if (stock < 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid stock quantity',
          { stock: 'Stock quantity cannot be negative' }
        )
      );
    }

    // Create new product instance
    const product = new Product(req.body);

    // Save product to database
    const newProduct = await product.save();

    // Return success response with created product
    res.status(201).json(
      ErrorResponse.success(
        { product: newProduct },
        'Product created successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Create product error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        ErrorResponse.mongooseValidation(error)
      );
    }

    // Handle MongoDB duplicate key error (e.g., duplicate product name)
    if (error.code === 11000) {
      return res.status(409).json(
        ErrorResponse.mongoDuplicateKey(error)
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to create product',
        'Please check the product information and try again'
      )
    );
  }
};

/**
 * Update product
 *
 * Updates an existing product by ID.
 * Requires admin authentication (handled by middleware).
 * Only provided fields will be updated.
 *
 * @route PUT /api/v1/products/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID to update
 * @param {Object} req.body - Fields to update
 * @param {string} req.body.name - Product name (optional)
 * @param {string} req.body.description - Product description (optional)
 * @param {number} req.body.price - Product price (optional)
 * @param {number} req.body.stock - Stock quantity (optional)
 * @param {string} req.body.category - Category ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Product updated successfully
 * @returns {Object} 400 - Validation error or invalid ID format
 * @returns {Object} 404 - Product not found
 * @returns {Object} 409 - Duplicate product name
 * @returns {Object} 500 - Server error
 *
 * @example
 * PUT /api/v1/products/507f1f77bcf86cd799439011
 * Body: {
 *   "price": 24.99,
 *   "stock": 150
 * }
 * Response: {
 *   "success": true,
 *   "message": "Product updated successfully",
 *   "data": {
 *     "product": { ... }
 *   }
 * }
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, stock } = req.body;

    // Validate price if provided
    if (price !== undefined && price < 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product price',
          { price: 'Price must be a positive number' }
        )
      );
    }

    // Validate stock if provided
    if (stock !== undefined && stock < 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid stock quantity',
          { stock: 'Stock quantity cannot be negative' }
        )
      );
    }

    // Find and update product
    // new: true -> return updated document
    // runValidators: true -> run model validators on update
    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    // Handle product not found
    if (!product) {
      return res.status(404).json(
        ErrorResponse.notFound('Product', id)
      );
    }

    // Return success response with updated product
    res.status(200).json(
      ErrorResponse.success(
        { product },
        'Product updated successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Update product error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product ID format',
          { id: 'Product ID must be a valid MongoDB ObjectID' }
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
        'Failed to update product',
        'Please verify the product ID and data'
      )
    );
  }
};

/**
 * Delete product
 *
 * Permanently deletes a product from the database.
 * Requires admin authentication (handled by middleware).
 * This operation cannot be undone.
 *
 * @route DELETE /api/v1/products/:id
 * @access Private/Admin (requires admin role)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Product deleted successfully
 * @returns {Object} 400 - Invalid ID format
 * @returns {Object} 404 - Product not found
 * @returns {Object} 500 - Server error
 *
 * @example
 * DELETE /api/v1/products/507f1f77bcf86cd799439011
 * Response: {
 *   "success": true,
 *   "message": "Product deleted successfully",
 *   "data": {
 *     "deletedProductId": "507f1f77bcf86cd799439011"
 *   }
 * }
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete product
    const product = await Product.findByIdAndDelete(id);

    // Handle product not found
    if (!product) {
      return res.status(404).json(
        ErrorResponse.notFound('Product', id)
      );
    }

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        { deletedProductId: id },
        'Product deleted successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Delete product error:', error);

    // Handle MongoDB CastError (invalid ObjectID format)
    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product ID format',
          { id: 'Product ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    // Generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to delete product',
        'Please verify the product ID and try again'
      )
    );
  }
};

/**
 * Search products
 *
 * Searches products by name or description using text search.
 * Returns matching products.
 *
 * @route GET /api/v1/products/search
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.query.q - Search query
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Search results
 * @returns {Object} 400 - Missing query parameter
 * @returns {Object} 500 - Server error
 *
 * @example
 * GET /api/v1/products/search?q=laptop
 * Response: {
 *   "success": true,
 *   "message": "Search completed successfully",
 *   "data": {
 *     "products": [...],
 *     "count": 5
 *   }
 * }
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    // Validate query parameter
    if (!q || q.trim() === '') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Search query is required',
          { q: 'Please provide a search query' }
        )
      );
    }

    // Search products by name or description (case-insensitive)
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).limit(50); // Limit search results to 50

    // Return success response with search results
    res.status(200).json(
      ErrorResponse.success(
        { products, count: products.length },
        'Search completed successfully'
      )
    );

  } catch (error) {
    // Log error for debugging
    console.error('Search products error:', error);

    // Return generic server error
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to search products',
        'Please try again later'
      )
    );
  }
};

/**
 * Reserve stock for order
 *
 * Decreases product stock atomically for order processing.
 * This endpoint is called by the Orders service (or Kafka consumer internally).
 *
 * @route POST /api/v1/products/:id/reserve
 * @access Private (inter-service only)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID
 * @param {Object} req.body - Reservation data
 * @param {number} req.body.quantity - Quantity to reserve
 * @param {string} req.body.orderId - Order ID for tracking
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Stock reserved successfully
 * @returns {Object} 400 - Invalid quantity or insufficient stock
 * @returns {Object} 404 - Product not found
 * @returns {Object} 500 - Server error
 */
exports.reserveStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, orderId } = req.body;

    // Validate required fields
    if (!quantity || quantity <= 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid quantity',
          { quantity: 'Quantity must be a positive number' }
        )
      );
    }

    if (!orderId) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Order ID is required',
          { orderId: 'Order ID must be provided for stock reservation' }
        )
      );
    }

    // Attempt atomic stock reservation
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        stock: { $gte: quantity }, // Only update if stock sufficient
        isActive: true
      },
      {
        $inc: { stock: -quantity }
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Handle reservation failure
    if (!product) {
      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return res.status(404).json(
          ErrorResponse.notFound('Product', id)
        );
      }

      if (!existingProduct.isActive) {
        return res.status(400).json(
          ErrorResponse.validation(
            'Product is not active',
            { product: 'Cannot reserve stock for inactive products' }
          )
        );
      }

      // Insufficient stock
      return res.status(400).json(
        ErrorResponse.validation(
          'Insufficient stock',
          {
            productId: id,
            requestedQuantity: quantity,
            availableStock: existingProduct.stock,
            message: `Only ${existingProduct.stock} units available`
          }
        )
      );
    }

    // Update inStock flag if needed
    if (product.stock === 0 && product.inStock) {
      await Product.findByIdAndUpdate(id, { inStock: false });
    }

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        {
          productId: id,
          productName: product.name,
          reservedQuantity: quantity,
          newStock: product.stock,
          orderId
        },
        'Stock reserved successfully'
      )
    );

  } catch (error) {
    console.error('Reserve stock error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product ID format',
          { id: 'Product ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to reserve stock',
        'Please try again later'
      )
    );
  }
};

/**
 * Release stock (restore inventory)
 *
 * Increases product stock for order cancellation or failed reservation.
 * This endpoint is called when orders are cancelled.
 *
 * @route POST /api/v1/products/:id/release
 * @access Private (inter-service only)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID
 * @param {Object} req.body - Release data
 * @param {number} req.body.quantity - Quantity to release
 * @param {string} req.body.orderId - Order ID for tracking
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Stock released successfully
 * @returns {Object} 400 - Invalid quantity
 * @returns {Object} 404 - Product not found
 * @returns {Object} 500 - Server error
 */
exports.releaseStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, orderId } = req.body;

    // Validate required fields
    if (!quantity || quantity <= 0) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid quantity',
          { quantity: 'Quantity must be a positive number' }
        )
      );
    }

    if (!orderId) {
      return res.status(400).json(
        ErrorResponse.validation(
          'Order ID is required',
          { orderId: 'Order ID must be provided for stock release' }
        )
      );
    }

    // Atomically increase stock
    const product = await Product.findOneAndUpdate(
      { _id: id },
      {
        $inc: { stock: quantity },
        $set: { inStock: true } // Mark as in stock
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Handle product not found
    if (!product) {
      return res.status(404).json(
        ErrorResponse.notFound('Product', id)
      );
    }

    // Return success response
    res.status(200).json(
      ErrorResponse.success(
        {
          productId: id,
          productName: product.name,
          releasedQuantity: quantity,
          newStock: product.stock,
          orderId
        },
        'Stock released successfully'
      )
    );

  } catch (error) {
    console.error('Release stock error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Invalid product ID format',
          { id: 'Product ID must be a valid MongoDB ObjectID' }
        )
      );
    }

    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to release stock',
        'Please try again later'
      )
    );
  }
};
