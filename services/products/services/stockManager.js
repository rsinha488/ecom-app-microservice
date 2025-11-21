/**
 * Stock Manager Service
 *
 * Handles inventory management operations including stock reservation and release.
 * Provides atomic operations to prevent race conditions.
 *
 * @module services/stockManager
 */

const Product = require('../models/Product');

/**
 * Reserve stock for order items
 * Decreases stock atomically for all products in the order
 *
 * @param {string} orderId - Order ID for tracking
 * @param {Array<Object>} items - Array of order items
 * @param {string} items[].productId - Product ID
 * @param {number} items[].quantity - Quantity to reserve
 * @returns {Promise<Object>} Reservation result
 */
async function reserveStock(orderId, items) {
  const reservationResults = [];
  const failedItems = [];

  try {
    console.log(`🔒 Attempting to reserve stock for order ${orderId}`);

    for (const item of items) {
      try {
        // Atomic stock update - only succeeds if stock >= quantity
        const product = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            stock: { $gte: item.quantity }, // Only update if stock sufficient
            isActive: true
          },
          {
            $inc: { stock: -item.quantity }
          },
          {
            new: true, // Return updated document
            runValidators: true
          }
        );

        if (!product) {
          // Stock insufficient or product not found
          const existingProduct = await Product.findById(item.productId);

          if (!existingProduct) {
            failedItems.push({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              reason: 'PRODUCT_NOT_FOUND',
              message: 'Product does not exist'
            });
          } else if (!existingProduct.isActive) {
            failedItems.push({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              reason: 'PRODUCT_INACTIVE',
              message: 'Product is no longer active'
            });
          } else {
            failedItems.push({
              productId: item.productId,
              productName: item.productName,
              requestedQuantity: item.quantity,
              availableStock: existingProduct.stock,
              reason: 'INSUFFICIENT_STOCK',
              message: `Insufficient stock: requested ${item.quantity}, available ${existingProduct.stock}`
            });
          }

          console.error(`❌ Failed to reserve stock for product ${item.productId}: ${failedItems[failedItems.length - 1].reason}`);
        } else {
          // Successfully reserved
          reservationResults.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            newStock: product.stock,
            success: true
          });

          console.log(`✅ Reserved ${item.quantity} units of ${item.productName} (new stock: ${product.stock})`);

          // Update inStock flag if stock reaches zero
          if (product.stock === 0 && product.inStock) {
            await Product.findByIdAndUpdate(item.productId, { inStock: false });
            console.log(`⚠️  Product ${item.productName} is now out of stock`);
          }
        }
      } catch (error) {
        console.error(`❌ Error reserving stock for product ${item.productId}:`, error.message);
        failedItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          reason: 'DATABASE_ERROR',
          message: error.message
        });
      }
    }

    // If any reservations failed, rollback successful ones
    if (failedItems.length > 0) {
      console.warn(`⚠️  Some items failed to reserve, rolling back successful reservations...`);

      for (const successfulItem of reservationResults) {
        await releaseStock(orderId, [successfulItem], 'RESERVATION_ROLLBACK');
      }

      return {
        success: false,
        orderId,
        reserved: [],
        failed: failedItems,
        message: 'Stock reservation failed - insufficient stock or product issues',
        rolledBack: reservationResults
      };
    }

    return {
      success: true,
      orderId,
      reserved: reservationResults,
      failed: [],
      message: `Successfully reserved stock for ${reservationResults.length} items`
    };

  } catch (error) {
    console.error(`❌ Critical error in stock reservation for order ${orderId}:`, error.message);

    // Attempt rollback
    for (const successfulItem of reservationResults) {
      try {
        await releaseStock(orderId, [successfulItem], 'ERROR_ROLLBACK');
      } catch (rollbackError) {
        console.error(`❌ Failed to rollback item ${successfulItem.productId}:`, rollbackError.message);
      }
    }

    throw error;
  }
}

/**
 * Release stock (restore inventory)
 * Increases stock for order cancellation or failed reservation
 *
 * @param {string} orderId - Order ID for tracking
 * @param {Array<Object>} items - Array of order items
 * @param {string} items[].productId - Product ID
 * @param {number} items[].quantity - Quantity to release
 * @param {string} reason - Reason for release (CANCELLED, ROLLBACK, etc.)
 * @returns {Promise<Object>} Release result
 */
async function releaseStock(orderId, items, reason = 'ORDER_CANCELLED') {
  const releaseResults = [];
  const failedItems = [];

  try {
    console.log(`🔓 Releasing stock for order ${orderId} (reason: ${reason})`);

    for (const item of items) {
      try {
        // Atomic stock increase
        const product = await Product.findOneAndUpdate(
          { _id: item.productId },
          {
            $inc: { stock: item.quantity },
            $set: { inStock: true } // Mark as in stock
          },
          {
            new: true,
            runValidators: true
          }
        );

        if (!product) {
          failedItems.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            reason: 'PRODUCT_NOT_FOUND',
            message: 'Product does not exist'
          });

          console.error(`❌ Failed to release stock: Product ${item.productId} not found`);
        } else {
          releaseResults.push({
            productId: item.productId,
            productName: item.productName || product.name,
            quantity: item.quantity,
            newStock: product.stock,
            success: true
          });

          console.log(`✅ Released ${item.quantity} units of ${product.name} (new stock: ${product.stock})`);
        }
      } catch (error) {
        console.error(`❌ Error releasing stock for product ${item.productId}:`, error.message);
        failedItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          reason: 'DATABASE_ERROR',
          message: error.message
        });
      }
    }

    return {
      success: failedItems.length === 0,
      orderId,
      released: releaseResults,
      failed: failedItems,
      reason,
      message: failedItems.length === 0
        ? `Successfully released stock for ${releaseResults.length} items`
        : `Partially released stock: ${releaseResults.length} succeeded, ${failedItems.length} failed`
    };

  } catch (error) {
    console.error(`❌ Critical error releasing stock for order ${orderId}:`, error.message);
    throw error;
  }
}

/**
 * Check stock availability for order items
 * Validates if order can be fulfilled without modifying stock
 *
 * @param {Array<Object>} items - Array of order items
 * @returns {Promise<Object>} Availability check result
 */
async function checkStockAvailability(items) {
  const availabilityResults = [];
  let allAvailable = true;

  for (const item of items) {
    try {
      const product = await Product.findById(item.productId);

      if (!product) {
        availabilityResults.push({
          productId: item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          available: false,
          reason: 'PRODUCT_NOT_FOUND'
        });
        allAvailable = false;
      } else if (!product.isActive) {
        availabilityResults.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          available: false,
          reason: 'PRODUCT_INACTIVE'
        });
        allAvailable = false;
      } else if (product.stock < item.quantity) {
        availabilityResults.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
          available: false,
          reason: 'INSUFFICIENT_STOCK'
        });
        allAvailable = false;
      } else {
        availabilityResults.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
          available: true
        });
      }
    } catch (error) {
      console.error(`❌ Error checking stock for product ${item.productId}:`, error.message);
      availabilityResults.push({
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        available: false,
        reason: 'DATABASE_ERROR',
        error: error.message
      });
      allAvailable = false;
    }
  }

  return {
    allAvailable,
    items: availabilityResults
  };
}

module.exports = {
  reserveStock,
  releaseStock,
  checkStockAvailability
};
