const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const { PAYMENT_METHOD } = require('../constants/paymentMethod');

/**
 * Payment Model - IMPROVED VERSION
 *
 * Addresses all schema-level improvements:
 * ✅ Unique payment numbers
 * ✅ Amount validation (precision, min/max)
 * ✅ Audit trail (status history, who modified)
 * ✅ Idempotency keys for duplicate prevention
 * ✅ Tax and discount breakdown
 * ✅ Currency conversion support
 * ✅ Text search indexes
 * ✅ Stripe ID format validation
 * ✅ Items total validation
 * ✅ Optimized compound indexes
 *
 * @module models/Payment
 * @version 2.0.0
 */

// Order item sub-schema with total validation
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
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  // Total for this line item (calculated)
  lineTotal: {
    type: Number,
    get: v => Math.round(v * 100) / 100
  }
}, { _id: false, toJSON: { getters: true } });

// Stripe payment details sub-schema with format validation
const stripeDetailsSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('cs_');
      },
      message: 'Invalid Stripe session ID format (must start with cs_)'
    }
  },
  paymentIntentId: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('pi_');
      },
      message: 'Invalid Stripe payment intent ID format (must start with pi_)'
    }
  },
  chargeId: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('ch_');
      },
      message: 'Invalid Stripe charge ID format (must start with ch_)'
    }
  },
  customerId: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('cus_');
      },
      message: 'Invalid Stripe customer ID format (must start with cus_)'
    }
  },
  receiptUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('http');
      },
      message: 'Receipt URL must be a valid HTTP/HTTPS URL'
    }
  }
}, { _id: false });

// Tax information sub-schema
const taxSchema = new mongoose.Schema({
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  taxType: {
    type: String,
    enum: ['VAT', 'GST', 'SALES_TAX', 'NONE'],
    default: 'NONE'
  },
  taxRegion: {
    type: String,
    trim: true
  }
}, { _id: false, toJSON: { getters: true } });

// Discount information sub-schema
const discountSchema = new mongoose.Schema({
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  discountCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED', 'NONE'],
    default: 'NONE'
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  }
}, { _id: false, toJSON: { getters: true } });

// Status change history sub-schema
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: Number,
    required: true
  },
  statusLabel: {
    type: String
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

// Main payment schema
const paymentSchema = new mongoose.Schema({
  // Unique payment identifier (like order number)
  paymentNumber: {
    type: String,
    unique: true,
    required: [true, 'Payment number is required'],
    trim: true,
    uppercase: true,
    immutable: true // Cannot be changed after creation
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required']
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  items: {
    type: [itemSchema],
    required: [true, 'Payment items are required'],
    validate: [
      {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Payment must have at least one item'
      },
      {
        validator: function(items) {
          // Validate items total matches subtotal
          if (!this.subtotal) return true;
          const itemsTotal = items.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0
          );
          return Math.abs(itemsTotal - this.subtotal) < 0.01;
        },
        message: 'Items total must match payment subtotal'
      }
    ]
  },

  paymentMethod: {
    type: Number,
    enum: {
      values: [
        PAYMENT_METHOD.CREDIT_CARD,
        PAYMENT_METHOD.DEBIT_CARD,
        PAYMENT_METHOD.UPI,
        PAYMENT_METHOD.NET_BANKING,
        PAYMENT_METHOD.WALLET,
        PAYMENT_METHOD.CASH_ON_DELIVERY,
        PAYMENT_METHOD.STRIPE,
        PAYMENT_METHOD.PAYPAL
      ],
      message: 'Invalid payment method'
    },
    required: [true, 'Payment method is required']
  },

  // Financial breakdown
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },

  tax: {
    type: taxSchema,
    default: () => ({})
  },

  discount: {
    type: discountSchema,
    default: () => ({})
  },

  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be at least 0.01'],
    max: [1000000, 'Payment amount cannot exceed $1,000,000'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100,
    validate: [
      {
        validator: function(value) {
          // Validate: amount = subtotal + tax - discount + processingFee
          const calculated =
            (this.subtotal || 0) +
            (this.tax?.taxAmount || 0) -
            (this.discount?.discountAmount || 0) +
            (this.processingFee || 0);
          return Math.abs(calculated - value) < 0.01;
        },
        message: 'Amount must equal subtotal + tax - discount + processing fee'
      },
      {
        validator: function(value) {
          // Maximum 2 decimal places for currency
          return (value * 100) % 1 === 0;
        },
        message: 'Amount can have maximum 2 decimal places'
      }
    ]
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

  // Multi-currency support
  originalCurrency: {
    type: String,
    uppercase: true,
    trim: true
  },

  originalAmount: {
    type: Number,
    min: 0,
    get: v => v ? Math.round(v * 100) / 100 : v
  },

  exchangeRate: {
    type: Number,
    min: 0
  },

  status: {
    type: Number,
    enum: {
      values: [
        PAYMENT_STATUS.PENDING,
        PAYMENT_STATUS.PROCESSING,
        PAYMENT_STATUS.COMPLETED,
        PAYMENT_STATUS.FAILED,
        PAYMENT_STATUS.REFUNDED,
        PAYMENT_STATUS.CANCELLED
      ],
      message: 'Invalid payment status'
    },
    default: PAYMENT_STATUS.PENDING,
    required: [true, 'Payment status is required']
  },

  // Stripe-specific payment details
  stripeDetails: {
    type: stripeDetailsSchema,
    default: null
  },

  // Transaction reference from payment gateway
  transactionId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },

  // Idempotency key for duplicate prevention
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    immutable: true
  },

  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },

  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },

  // Refund details
  refundDetails: {
    refundId: {
      type: String,
      trim: true
    },
    refundAmount: {
      type: Number,
      min: 0,
      get: v => v ? Math.round(v * 100) / 100 : v
    },
    refundReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    refundedAt: {
      type: Date
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  processingFee: {
    type: Number,
    default: 0,
    min: [0, 'Processing fee cannot be negative'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },

  netAmount: {
    type: Number,
    min: 0,
    get: v => v ? Math.round(v * 100) / 100 : v
  },

  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },

  // Security & fraud prevention
  ipAddress: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Basic IP validation (IPv4 and IPv6)
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
        return !v || ipv4Regex.test(v) || ipv6Regex.test(v);
      },
      message: 'Invalid IP address format'
    }
  },

  userAgent: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Audit trail
  statusHistory: [statusHistorySchema],

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps for payment lifecycle
  initiatedAt: {
    type: Date,
    default: Date.now,
    required: true
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
  toJSON: {
    virtuals: true,
    getters: true
  },
  toObject: {
    virtuals: true,
    getters: true
  }
});

// ============================================================================
// INDEXES - Optimized for common queries
// ============================================================================

// Unique indexes
paymentSchema.index({ paymentNumber: 1 }, { unique: true });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Single field indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ customerEmail: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ completedAt: -1 }, { sparse: true });

// Compound indexes (most selective field first)
paymentSchema.index({ userId: 1, status: 1, createdAt: -1 }); // User's payment history
paymentSchema.index({ orderId: 1, status: 1, createdAt: -1 }); // Order payment attempts
paymentSchema.index({ status: 1, paymentMethod: 1, createdAt: -1 }); // Analytics
paymentSchema.index({ status: 1, createdAt: -1, amount: 1 }); // Reporting
paymentSchema.index({ customerEmail: 1, status: 1 }); // Email lookups

// Index for product lookups in payment items
paymentSchema.index({ 'items.productId': 1 });

// Text index for search
paymentSchema.index(
  {
    paymentNumber: 'text',
    transactionId: 'text',
    customerEmail: 'text'
  },
  {
    weights: {
      paymentNumber: 10,
      transactionId: 8,
      customerEmail: 5
    },
    name: 'payment_text_search'
  }
);

// ============================================================================
// VIRTUALS
// ============================================================================

paymentSchema.virtual('ageInHours').get(function() {
  if (!this.createdAt) return null;
  const now = new Date();
  const diffMs = now - this.createdAt;
  return Math.floor(diffMs / (1000 * 60 * 60));
});

paymentSchema.virtual('ageInDays').get(function() {
  if (!this.createdAt) return null;
  const now = new Date();
  const diffMs = now - this.createdAt;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

paymentSchema.virtual('isExpired').get(function() {
  // Payment is expired if pending for more than 24 hours
  if (this.status !== PAYMENT_STATUS.PENDING) return false;
  const hoursSinceCreation = this.ageInHours;
  return hoursSinceCreation > 24;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Pre-save: Generate payment number
paymentSchema.pre('save', function(next) {
  if (!this.paymentNumber && this.isNew) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.paymentNumber = `PAY-${timestamp}-${random}`;
  }
  next();
});

// Pre-save: Calculate line totals
paymentSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.lineTotal = item.price * item.quantity;
    });
  }
  next();
});

// Pre-save: Calculate net amount
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('processingFee')) {
    this.netAmount = this.amount - (this.processingFee || 0);
  }
  next();
});

// Pre-save: Update status timestamps
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

// Pre-save: Add to status history
paymentSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    const { statusToString } = require('../constants/paymentStatus');

    if (!this.statusHistory) {
      this.statusHistory = [];
    }

    this.statusHistory.push({
      status: this.status,
      statusLabel: statusToString(this.status),
      changedAt: new Date(),
      changedBy: this._modifiedBy, // Set by controller
      reason: this._statusChangeReason, // Set by controller
      ipAddress: this._requestIp,
      metadata: this._changeMetadata
    });
  }
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

paymentSchema.methods.isTerminal = function() {
  return [
    PAYMENT_STATUS.COMPLETED,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.CANCELLED
  ].includes(this.status);
};

paymentSchema.methods.canBeRefunded = function() {
  return this.status === PAYMENT_STATUS.COMPLETED &&
         !this.refundDetails?.refundId &&
         this.amount > 0;
};

paymentSchema.methods.canBeCancelled = function() {
  return [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING].includes(this.status);
};

paymentSchema.methods.isSuccessful = function() {
  return this.status === PAYMENT_STATUS.COMPLETED;
};

paymentSchema.methods.hasFullRefund = function() {
  if (!this.refundDetails?.refundAmount) return false;
  return Math.abs(this.refundDetails.refundAmount - this.amount) < 0.01;
};

paymentSchema.methods.getRefundableAmount = function() {
  if (!this.canBeRefunded()) return 0;
  const alreadyRefunded = this.refundDetails?.refundAmount || 0;
  return Math.max(0, this.amount - alreadyRefunded);
};

// ============================================================================
// STATIC METHODS
// ============================================================================

paymentSchema.statics.findByPaymentNumber = function(paymentNumber) {
  return this.findOne({ paymentNumber: paymentNumber.toUpperCase() });
};

paymentSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId });
};

paymentSchema.statics.findPendingExpired = function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.find({
    status: PAYMENT_STATUS.PENDING,
    createdAt: { $lt: twentyFourHoursAgo }
  });
};

// ============================================================================
// JSON TRANSFORM
// ============================================================================

paymentSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    // Don't expose sensitive internal flags
    delete ret._modifiedBy;
    delete ret._statusChangeReason;
    delete ret._requestIp;
    delete ret._changeMetadata;
    return ret;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
