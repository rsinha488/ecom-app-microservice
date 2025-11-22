/**
 * Payment Status Constants
 *
 * Numeric codes for payment status throughout the system.
 * Using numbers instead of strings provides better performance,
 * smaller storage footprint, and type safety.
 *
 * @constant {Object} PAYMENT_STATUS_CODE - Numeric status codes
 * @constant {Object} PAYMENT_STATUS_NAME - Human-readable names
 * @constant {Object} PAYMENT_STATUS_DESCRIPTION - Detailed descriptions
 * @constant {Object} PAYMENT_STATUS_COLOR - UI color mappings
 */

// Numeric status codes (stored in database)
const PAYMENT_STATUS_CODE = {
  PENDING: 1,
  PAID: 2,
  FAILED: 3,
  REFUNDED: 4,
};

// Human-readable status names
const PAYMENT_STATUS_NAME = {
  1: 'pending',
  2: 'paid',
  3: 'failed',
  4: 'refunded',
};

// Status descriptions
const PAYMENT_STATUS_DESCRIPTION = {
  1: 'Payment is pending and awaiting processing',
  2: 'Payment has been successfully received and confirmed',
  3: 'Payment transaction failed or was declined',
  4: 'Payment has been refunded to the customer',
};

// UI color codes (Tailwind CSS classes)
const PAYMENT_STATUS_COLOR = {
  1: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  2: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800 border-green-200',
  },
  3: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800 border-red-200',
  },
  4: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

/**
 * Get status label from numeric code
 * @param {number} code - Status code (1-4)
 * @returns {string} Status label
 */
function getPaymentStatusLabel(code) {
  return PAYMENT_STATUS_NAME[code] || 'unknown';
}

/**
 * Get status code from label
 * @param {string} label - Status label ('pending', 'paid', etc.)
 * @returns {number} Status code
 */
function getPaymentStatusCode(label) {
  const lowerLabel = label?.toLowerCase();
  return Object.keys(PAYMENT_STATUS_NAME).find(
    key => PAYMENT_STATUS_NAME[key] === lowerLabel
  ) || null;
}

/**
 * Get status description
 * @param {number} code - Status code (1-4)
 * @returns {string} Status description
 */
function getPaymentStatusDescription(code) {
  return PAYMENT_STATUS_DESCRIPTION[code] || 'Unknown payment status';
}

/**
 * Get status color classes
 * @param {number} code - Status code (1-4)
 * @returns {Object} Color classes object
 */
function getPaymentStatusColor(code) {
  return PAYMENT_STATUS_COLOR[code] || PAYMENT_STATUS_COLOR[1];
}

/**
 * Validate payment status code
 * @param {number} code - Status code to validate
 * @returns {boolean} True if valid
 */
function isValidPaymentStatus(code) {
  return code >= 1 && code <= 4;
}

/**
 * Get all valid payment status codes
 * @returns {number[]} Array of valid status codes
 */
function getAllPaymentStatuses() {
  return Object.values(PAYMENT_STATUS_CODE);
}

module.exports = {
  PAYMENT_STATUS_CODE,
  PAYMENT_STATUS_NAME,
  PAYMENT_STATUS_DESCRIPTION,
  PAYMENT_STATUS_COLOR,
  getPaymentStatusLabel,
  getPaymentStatusCode,
  getPaymentStatusDescription,
  getPaymentStatusColor,
  isValidPaymentStatus,
  getAllPaymentStatuses,
};
