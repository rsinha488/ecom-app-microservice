const Product = require('../../../models/Product');
const productController = require('../../../controllers/productController');
const fixtures = require('../../fixtures/products.json');

// Mock Product model
jest.mock('../../../models/Product');

describe('Product Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getAllProducts()', () => {
    // TC-PROD-001: Get All Products - No Filters
    test('TC-PROD-001: Should return all products', async () => {
      // Arrange
      const mockProducts = [
        { ...fixtures.validProduct, _id: '1' },
        { ...fixtures.existingProduct }
      ];

      // Mock the query chain
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockProducts)
      };

      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(mockProducts.length);

      // Act
      await productController.getAllProducts(req, res);

      // Assert
      expect(Product.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Products retrieved successfully',
          data: expect.objectContaining({
            products: mockProducts,
            count: mockProducts.length
          })
        })
      );
    });

    // TC-PROD-002: Get All Products - Empty Database
    test('TC-PROD-002: Should return empty array when no products exist', async () => {
      // Arrange
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([])
      };

      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(0);

      // Act
      await productController.getAllProducts(req, res);

      // Assert
      expect(Product.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            products: [],
            count: 0
          })
        })
      );
    });

    // TC-PROD-003: Get All Products - Database Error
    test('TC-PROD-003: Should handle database errors', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockRejectedValue(new Error(errorMessage))
      };

      Product.find.mockReturnValue(mockQuery);

      // Act
      await productController.getAllProducts(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Server Error',
          message: 'Failed to retrieve products'
        })
      );
    });
  });

  describe('getProductById()', () => {
    // TC-PROD-004: Get Product by ID - Valid ID
    test('TC-PROD-004: Should return product by valid ID', async () => {
      // Arrange
      const productId = '691d99ff4a0e73e090b83cd8';
      req.params.id = productId;

      const mockProduct = {
        _id: productId,
        ...fixtures.existingProduct
      };

      Product.findById.mockResolvedValue(mockProduct);

      // Act
      await productController.getProductById(req, res);

      // Assert
      expect(Product.findById).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Product retrieved successfully',
          data: expect.objectContaining({
            product: mockProduct
          })
        })
      );
    });

    // TC-PROD-005: Get Product by ID - Product Not Found
    test('TC-PROD-005: Should return 404 when product not found', async () => {
      // Arrange
      const productId = 'nonexistent123';
      req.params.id = productId;
      Product.findById.mockResolvedValue(null);

      // Act
      await productController.getProductById(req, res);

      // Assert
      expect(Product.findById).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not Found',
          message: `Product with ID '${productId}' was not found`
        })
      );
    });

    // TC-PROD-006: Get Product by ID - Invalid ID Format
    test('TC-PROD-006: Should handle invalid ID format', async () => {
      // Arrange
      req.params.id = 'invalid-id-format';
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      Product.findById.mockRejectedValue(error);

      // Act
      await productController.getProductById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Invalid product ID format'
        })
      );
    });
  });

  describe('createProduct()', () => {
    // TC-PROD-010: Create Product - Valid Data (Admin)
    test('TC-PROD-010: Should create product with valid data', async () => {
      // Arrange
      req.body = fixtures.validProduct;

      const savedProduct = {
        _id: 'new-product-id',
        ...fixtures.validProduct,
        inStock: true,
        isActive: true,
        rating: 0,
        reviewCount: 0
      };

      savedProduct.save = jest.fn().mockResolvedValue(savedProduct);

      Product.mockImplementation(() => savedProduct);

      // Act
      await productController.createProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Product created successfully',
          data: expect.objectContaining({
            product: expect.objectContaining({
              name: fixtures.validProduct.name,
              price: fixtures.validProduct.price
            })
          })
        })
      );
    });

    // TC-PROD-011: Create Product - Missing Required Fields
    test('TC-PROD-011: Should reject product with missing required fields', async () => {
      // Arrange
      req.body = fixtures.invalidProducts.missingName;

      // Act
      await productController.createProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Required fields are missing',
          fields: expect.objectContaining({
            name: 'Product name is required'
          })
        })
      );
    });

    // TC-PROD-012: Create Product - Invalid Price
    test('TC-PROD-012: Should reject product with negative price', async () => {
      // Arrange
      req.body = fixtures.invalidProducts.negativePrice;

      // Act
      await productController.createProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Invalid product price',
          fields: expect.objectContaining({
            price: 'Price must be a positive number'
          })
        })
      );
    });

    // TC-PROD-013: Create Product - Invalid Stock
    test('TC-PROD-013: Should reject product with negative stock', async () => {
      // Arrange
      req.body = fixtures.invalidProducts.negativeStock;

      // Act
      await productController.createProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Invalid stock quantity',
          fields: expect.objectContaining({
            stock: 'Stock quantity cannot be negative'
          })
        })
      );
    });
  });

  describe('updateProduct()', () => {
    // TC-PROD-014: Update Product - Valid Data (Admin)
    test('TC-PROD-014: Should update product with valid data', async () => {
      // Arrange
      const productId = '691d99ff4a0e73e090b83cd8';
      req.params.id = productId;
      req.body = {
        price: 149.99,
        stock: 75
      };

      const updatedProduct = {
        _id: productId,
        ...fixtures.existingProduct,
        ...req.body
      };

      Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      await productController.updateProduct(req, res);

      // Assert
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        productId,
        req.body,
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Product updated successfully',
          data: expect.objectContaining({
            product: updatedProduct
          })
        })
      );
    });

    // TC-PROD-015: Update Product - Product Not Found
    test('TC-PROD-015: Should return 404 when updating non-existent product', async () => {
      // Arrange
      const productId = 'nonexistent123';
      req.params.id = productId;
      req.body = { price: 99.99 };

      Product.findByIdAndUpdate.mockResolvedValue(null);

      // Act
      await productController.updateProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not Found',
          message: `Product with ID '${productId}' was not found`
        })
      );
    });

    // TC-PROD-016: Update Product - Invalid Data
    test('TC-PROD-016: Should reject update with invalid data', async () => {
      // Arrange
      req.params.id = '691d99ff4a0e73e090b83cd8';
      req.body = { price: -50 };

      // Act
      await productController.updateProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Invalid product price',
          fields: expect.objectContaining({
            price: 'Price must be a positive number'
          })
        })
      );
    });
  });

  describe('deleteProduct()', () => {
    // TC-PROD-017: Delete Product - Valid ID (Admin)
    test('TC-PROD-017: Should delete product with valid ID', async () => {
      // Arrange
      const productId = '691d99ff4a0e73e090b83cd8';
      req.params.id = productId;

      const deletedProduct = {
        _id: productId,
        ...fixtures.existingProduct
      };

      Product.findByIdAndDelete.mockResolvedValue(deletedProduct);

      // Act
      await productController.deleteProduct(req, res);

      // Assert
      expect(Product.findByIdAndDelete).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Product deleted successfully',
          data: expect.objectContaining({
            deletedProductId: productId
          })
        })
      );
    });

    // TC-PROD-018: Delete Product - Product Not Found
    test('TC-PROD-018: Should return 404 when deleting non-existent product', async () => {
      // Arrange
      const productId = 'nonexistent123';
      req.params.id = productId;
      Product.findByIdAndDelete.mockResolvedValue(null);

      // Act
      await productController.deleteProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not Found',
          message: `Product with ID '${productId}' was not found`
        })
      );
    });

    // TC-PROD-019: Delete Product - Database Error
    test('TC-PROD-019: Should handle database errors during deletion', async () => {
      // Arrange
      req.params.id = '691d99ff4a0e73e090b83cd8';
      const error = new Error('Database error during deletion');
      Product.findByIdAndDelete.mockRejectedValue(error);

      // Act
      await productController.deleteProduct(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Server Error',
          message: 'Failed to delete product'
        })
      );
    });
  });
});
