const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const { PAYMENT_METHOD } = require('../constants/paymentMethod');

/**
 * Payment Model
 *
 * Represents payment transactions in the system with proper numeric enums,
 * indexes for performance, and comprehensive validation.
 *
 * @module models/Payment
 * @version 1.0.0
 */

// Order item sub-schema
const itemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    trim: true
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  }
}, { _id: false });

// Stripe payment details sub-schema
const stripeDetailsSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    trim: true
  },
  paymentIntentId: {
    type: String,
    trim: true
  },
  chargeId: {
    type: String,
    trim: true
  },
  customerId: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String,
    trim: true
  }
}, { _id: false });

// Main payment schema
const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },

  items: {
    type: [itemSchema],
    required: [true, 'Payment items are required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Payment must have at least one item'
    }
  },

  paymentMethod: {
    type: Number,
    enum: [
      PAYMENT_METHOD.CREDIT_CARD,       // 1
      PAYMENT_METHOD.DEBIT_CARD,        // 2
      PAYMENT_METHOD.UPI,               // 3
      PAYMENT_METHOD.NET_BANKING,       // 4
      PAYMENT_METHOD.WALLET,            // 5
      PAYMENT_METHOD.CASH_ON_DELIVERY,  // 6
      PAYMENT_METHOD.STRIPE,            // 7
      PAYMENT_METHOD.PAYPAL             // 8
    ],
    required: [true, 'Payment method is required'],
  },

  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Payment amount must be greater than zero'
    }
  },

  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    trim: true,
    enum: {
      values: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
      message: '{VALUE} is not a supported currency'
    }
  },

  status: {
    type: Number,
    enum: [
      PAYMENT_STATUS.PENDING,       // 1
      PAYMENT_STATUS.PROCESSING,    // 2
      PAYMENT_STATUS.COMPLETED,     // 3
      PAYMENT_STATUS.FAILED,        // 4
      PAYMENT_STATUS.REFUNDED,      // 5
      PAYMENT_STATUS.CANCELLED      // 6
    ],
    default: PAYMENT_STATUS.PENDING,
    required: [true, 'Payment status is required'],

  },

  // Stripe-specific payment details
  stripeDetails: {
    type: stripeDetailsSchema,
    default: null
  },

  // Transaction reference ID from payment gateway
  transactionId: {
    type: String,
    trim: true,
    unique:true,
    sparse: true,  // Allow multiple null values but unique non-null values

  },

  // Email for payment confirmation
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },

  // Failure reason if payment failed
  failureReason: {
    type: String,
    trim: true
  },

  // Refund details if payment was refunded
  refundDetails: {
    refundId: {
      type: String,
      trim: true
    },
    refundAmount: {
      type: Number,
      min: 0
    },
    refundReason: {
      type: String,
      trim: true
    },
    refundedAt: {
      type: Date
    }
  },

  // Processing fees charged by payment gateway
  processingFee: {
    type: Number,
    default: 0,
    min: [0, 'Processing fee cannot be negative']
  },

  // Net amount received after fees
  netAmount: {
    type: Number,
    min: 0
  },

  // Metadata for additional information
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },

  // IP address of the customer (for fraud prevention)
  ipAddress: {
    type: String,
    trim: true
  },

  // User agent for tracking
  userAgent: {
    type: String,
    trim: true
  },

  // Timestamps for payment lifecycle
  initiatedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: {
    type: Date
  },

  failedAt: {
    type: Date
  },

  cancelledAt: {
    type: Date
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Single field indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ transactionId: 1 }, { sparse: true });
paymentSchema.index({ customerEmail: 1 });
paymentSchema.index({ createdAt: -1 });

// Compound indexes for common queries
paymentSchema.index({ userId: 1, status: 1, createdAt: -1 }); // ✅ Combined
paymentSchema.index({ orderId: 1, status: 1, createdAt: -1 }); // ✅ For order history
paymentSchema.index({ status: 1, paymentMethod: 1, createdAt: -1 }); // ✅ For analytics

// Index for analytics and reporting
paymentSchema.index({ createdAt: -1, status: 1, amount: 1 });
paymentSchema.index({ completedAt: -1 }, { sparse: true });

// Virtual for payment age
paymentSchema.virtual('ageInHours').get(function() {
  if (!this.createdAt) return null;
  const now = new Date();
  const diffMs = now - this.createdAt;
  return Math.floor(diffMs / (1000 * 60 * 60));
});

// Pre-save middleware to calculate net amount
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('processingFee')) {
    this.netAmount = this.amount - (this.processingFee || 0);
  }
  next();
});

// Pre-save middleware to set completion/failure timestamps
paymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();

    if (this.status === PAYMENT_STATUS.COMPLETED && !this.completedAt) {
      this.completedAt = now;
    } else if (this.status === PAYMENT_STATUS.FAILED && !this.failedAt) {
      this.failedAt = now;
    } else if (this.status === PAYMENT_STATUS.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = now;
    }
  }
  next();
});

// Method to check if payment is in terminal state
paymentSchema.methods.isTerminal = function() {
  return [
    PAYMENT_STATUS.COMPLETED,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.CANCELLED
  ].includes(this.status);
};

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.status === PAYMENT_STATUS.COMPLETED && !this.refundDetails?.refundId;
};

// Removing __v field from JSON output
paymentSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
