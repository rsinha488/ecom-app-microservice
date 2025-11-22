/**
 * Payment Method Constants
 *
 * Numeric codes for payment methods throughout the system.
 * Using numbers instead of strings provides better performance,
 * smaller storage footprint, and type safety.
 *
 * @constant {Object} PAYMENT_METHOD_CODE - Numeric method codes
 * @constant {Object} PAYMENT_METHOD_NAME - Human-readable names
 * @constant {Object} PAYMENT_METHOD_DISPLAY - Display labels
 * @constant {Object} PAYMENT_METHOD_DESCRIPTION - Detailed descriptions
 * @constant {Object} PAYMENT_METHOD_ICON - Icon mappings for UI
 */

// Numeric method codes (stored in database)
const PAYMENT_METHOD_CODE = {
  CREDIT_CARD: 1,
  DEBIT_CARD: 2,
  PAYPAL: 3,
  CASH_ON_DELIVERY: 4,
  BANK_TRANSFER: 5,
  UPI: 6,
  WALLET: 7,
};

// Human-readable method names (for API compatibility)
const PAYMENT_METHOD_NAME = {
  1: 'credit_card',
  2: 'debit_card',
  3: 'paypal',
  4: 'cash_on_delivery',
  5: 'bank_transfer',
  6: 'upi',
  7: 'wallet',
};

// Display labels (for UI)
const PAYMENT_METHOD_DISPLAY = {
  1: 'Credit Card',
  2: 'Debit Card',
  3: 'PayPal',
  4: 'Cash on Delivery',
  5: 'Bank Transfer',
  6: 'UPI',
  7: 'Digital Wallet',
};

// Method descriptions
const PAYMENT_METHOD_DESCRIPTION = {
  1: 'Pay securely using your credit card',
  2: 'Pay using your debit card',
  3: 'Pay using your PayPal account',
  4: 'Pay with cash when the order is delivered',
  5: 'Transfer payment directly to our bank account',
  6: 'Pay using UPI (Unified Payments Interface)',
  7: 'Pay using digital wallets (Paytm, PhonePe, Google Pay, etc.)',
};

// Icon classes (React Icons or custom)
const PAYMENT_METHOD_ICON = {
  1: 'FiCreditCard',
  2: 'FiCreditCard',
  3: 'FaPaypal',
  4: 'FiDollarSign',
  5: 'FiHome', // Bank icon
  6: 'FiSmartphone',
  7: 'FiPackage',
};

// Processing fees (percentage)
const PAYMENT_METHOD_FEE = {
  1: 2.9, // 2.9% for credit cards
  2: 2.5, // 2.5% for debit cards
  3: 3.5, // 3.5% for PayPal
  4: 0,   // No fee for COD
  5: 0,   // No fee for bank transfer
  6: 0,   // No fee for UPI
  7: 1.5, // 1.5% for wallet
};

// Online payment methods (require immediate processing)
const ONLINE_PAYMENT_METHODS = [1, 2, 3, 5, 6, 7];

// Offline payment methods
const OFFLINE_PAYMENT_METHODS = [4];

/**
 * Get method label from numeric code
 * @param {number} code - Method code (1-7)
 * @returns {string} Method label
 */
function getPaymentMethodLabel(code) {
  return PAYMENT_METHOD_NAME[code] || 'unknown';
}

/**
 * Get method code from label
 * @param {string} label - Method label ('credit_card', 'paypal', etc.)
 * @returns {number|null} Method code
 */
function getPaymentMethodCode(label) {
  const lowerLabel = label?.toLowerCase();
  return Object.keys(PAYMENT_METHOD_NAME).find(
    key => PAYMENT_METHOD_NAME[key] === lowerLabel
  ) || null;
}

/**
 * Get method display name
 * @param {number} code - Method code (1-7)
 * @returns {string} Display name
 */
function getPaymentMethodDisplay(code) {
  return PAYMENT_METHOD_DISPLAY[code] || 'Unknown Method';
}

/**
 * Get method description
 * @param {number} code - Method code (1-7)
 * @returns {string} Method description
 */
function getPaymentMethodDescription(code) {
  return PAYMENT_METHOD_DESCRIPTION[code] || 'Unknown payment method';
}

/**
 * Get method icon
 * @param {number} code - Method code (1-7)
 * @returns {string} Icon identifier
 */
function getPaymentMethodIcon(code) {
  return PAYMENT_METHOD_ICON[code] || 'FiDollarSign';
}

/**
 * Get processing fee percentage
 * @param {number} code - Method code (1-7)
 * @returns {number} Fee percentage
 */
function getPaymentMethodFee(code) {
  return PAYMENT_METHOD_FEE[code] || 0;
}

/**
 * Calculate fee amount
 * @param {number} code - Method code
 * @param {number} amount - Transaction amount
 * @returns {number} Fee amount
 */
function calculatePaymentFee(code, amount) {
  const feePercentage = getPaymentMethodFee(code);
  return (amount * feePercentage) / 100;
}

/**
 * Check if method requires online processing
 * @param {number} code - Method code (1-7)
 * @returns {boolean} True if online payment
 */
function isOnlinePayment(code) {
  return ONLINE_PAYMENT_METHODS.includes(code);
}

/**
 * Check if method is offline
 * @param {number} code - Method code (1-7)
 * @returns {boolean} True if offline payment
 */
function isOfflinePayment(code) {
  return OFFLINE_PAYMENT_METHODS.includes(code);
}

/**
 * Validate payment method code
 * @param {number} code - Method code to validate
 * @returns {boolean} True if valid
 */
function isValidPaymentMethod(code) {
  return code >= 1 && code <= 7;
}

/**
 * Get all valid payment method codes
 * @returns {number[]} Array of valid method codes
 */
function getAllPaymentMethods() {
  return Object.values(PAYMENT_METHOD_CODE);
}

/**
 * Get enabled payment methods (for UI)
 * In production, this would come from settings/config
 * @returns {number[]} Array of enabled method codes
 */
function getEnabledPaymentMethods() {
  // For now, only COD is enabled (as per current UI)
  // In production, this would be configurable
  return [PAYMENT_METHOD_CODE.CASH_ON_DELIVERY];
}

module.exports = {
  PAYMENT_METHOD_CODE,
  PAYMENT_METHOD_NAME,
  PAYMENT_METHOD_DISPLAY,
  PAYMENT_METHOD_DESCRIPTION,
  PAYMENT_METHOD_ICON,
  PAYMENT_METHOD_FEE,
  ONLINE_PAYMENT_METHODS,
  OFFLINE_PAYMENT_METHODS,
  getPaymentMethodLabel,
  getPaymentMethodCode,
  getPaymentMethodDisplay,
  getPaymentMethodDescription,
  getPaymentMethodIcon,
  getPaymentMethodFee,
  calculatePaymentFee,
  isOnlinePayment,
  isOfflinePayment,
  isValidPaymentMethod,
  getAllPaymentMethods,
  getEnabledPaymentMethods,
};
