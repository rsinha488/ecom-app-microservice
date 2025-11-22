const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../constants/orderStatus');
const { PAYMENT_STATUS_CODE } = require('../constants/paymentStatus');
const { PAYMENT_METHOD_CODE } = require('../constants/paymentMethod');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: Number,
    enum: [
      ORDER_STATUS.PENDING,      // 1
      ORDER_STATUS.PROCESSING,   // 2
      ORDER_STATUS.SHIPPED,      // 3
      ORDER_STATUS.DELIVERED,    // 4
      ORDER_STATUS.CANCELLED     // 5
    ],
    default: ORDER_STATUS.PENDING,
    required: true
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentStatus: {
    type: Number,
    enum: [
      PAYMENT_STATUS_CODE.PENDING,   // 1
      PAYMENT_STATUS_CODE.PAID,      // 2
      PAYMENT_STATUS_CODE.FAILED,    // 3
      PAYMENT_STATUS_CODE.REFUNDED   // 4
    ],
    default: PAYMENT_STATUS_CODE.PENDING,
    required: true
  },
  paymentMethod: {
    type: Number,
    enum: [
      PAYMENT_METHOD_CODE.CREDIT_CARD,       // 1
      PAYMENT_METHOD_CODE.DEBIT_CARD,        // 2
      PAYMENT_METHOD_CODE.PAYPAL,            // 3
      PAYMENT_METHOD_CODE.CASH_ON_DELIVERY,  // 4
      PAYMENT_METHOD_CODE.BANK_TRANSFER,     // 5
      PAYMENT_METHOD_CODE.UPI,               // 6
      PAYMENT_METHOD_CODE.WALLET             // 7
    ],
    required: true
  },
  trackingNumber: {
    type: String
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Single field indexes
orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ trackingNumber: 1 });

// Compound indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, status: 1 });
orderSchema.index({ userId: 1, paymentStatus: 1, createdAt: -1 });

// Index for product lookups in orders
orderSchema.index({ 'items.productId': 1 });

// Index for analytics and reporting
orderSchema.index({ createdAt: -1, status: 1, totalAmount: 1 });

module.exports = mongoose.model('Order', orderSchema);
