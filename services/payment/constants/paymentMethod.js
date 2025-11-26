/**
 * Payment Method Constants
 *
 * Numeric codes for payment methods throughout the system.
 * Using numbers instead of strings provides better performance,
 * smaller storage footprint, and type safety.
 *
 * @module constants/paymentMethod
 * @version 1.0.0
 *
 * @constant {Object} PAYMENT_METHOD - Numeric method codes
 * @constant {Object} PAYMENT_METHOD_NAME - Human-readable names
 * @constant {Object} PAYMENT_METHOD_DISPLAY - Display labels
 * @constant {Object} PAYMENT_METHOD_DESCRIPTION - Detailed descriptions
 */

// Numeric method codes (stored in database)
const PAYMENT_METHOD = {
  CREDIT_CARD: 1,
  DEBIT_CARD: 2,
  UPI: 3,
  NET_BANKING: 4,
  WALLET: 5,
  CASH_ON_DELIVERY: 6,
  STRIPE: 7,
  PAYPAL: 8
};

// Human-readable method names (for API compatibility)
const PAYMENT_METHOD_NAME = {
  1: 'credit_card',
  2: 'debit_card',
  3: 'upi',
  4: 'net_banking',
  5: 'wallet',
  6: 'cash_on_delivery',
  7: 'stripe',
  8: 'paypal'
};

// Display labels (for UI)
const PAYMENT_METHOD_DISPLAY = {
  1: 'Credit Card',
  2: 'Debit Card',
  3: 'UPI',
  4: 'Net Banking',
  5: 'Digital Wallet',
  6: 'Cash on Delivery',
  7: 'Stripe',
  8: 'PayPal'
};

// Method descriptions
const PAYMENT_METHOD_DESCRIPTION = {
  1: 'Pay securely using your credit card',
  2: 'Pay using your debit card',
  3: 'Pay using UPI (Unified Payments Interface)',
  4: 'Transfer payment directly from your bank account',
  5: 'Pay using digital wallets (Paytm, PhonePe, Google Pay, etc.)',
  6: 'Pay with cash when the order is delivered',
  7: 'Pay securely using Stripe payment gateway',
  8: 'Pay using your PayPal account'
};

// Processing fees (percentage)
const PAYMENT_METHOD_FEE = {
  1: 2.9,    // 2.9% for credit cards
  2: 2.5,    // 2.5% for debit cards
  3: 0,      // No fee for UPI
  4: 0,      // No fee for net banking
  5: 1.5,    // 1.5% for wallet
  6: 0,      // No fee for COD
  7: 2.9,    // 2.9% for Stripe
  8: 3.5     // 3.5% for PayPal
};

// Online payment methods (require immediate processing)
const ONLINE_PAYMENT_METHODS = [1, 2, 3, 4, 5, 7, 8];

// Offline payment methods
const OFFLINE_PAYMENT_METHODS = [6];

/**
 * Get method label from numeric code
 * @param {number} code - Method code
 * @returns {string} Method label
 *
 * @example
 * getPaymentMethodLabel(1) // Returns 'credit_card'
 */
function getPaymentMethodLabel(code) {
  return PAYMENT_METHOD_NAME[code] || 'unknown';
}

/**
 * Get method code from label
 * @param {string} label - Method label ('credit_card', 'stripe', etc.)
 * @returns {number|null} Method code
 *
 * @example
 * getPaymentMethodCode('credit_card') // Returns 1
 * getPaymentMethodCode('stripe') // Returns 7
 */
function getPaymentMethodCode(label) {
  const lowerLabel = label?.toLowerCase();
  const entry = Object.entries(PAYMENT_METHOD_NAME).find(
    ([, value]) => value === lowerLabel
  );
  return entry ? parseInt(entry[0], 10) : null;
}

/**
 * Get method display name
 * @param {number} code - Method code
 * @returns {string} Display name
 *
 * @example
 * getPaymentMethodDisplay(1) // Returns 'Credit Card'
 * getPaymentMethodDisplay(7) // Returns 'Stripe'
 */
function getPaymentMethodDisplay(code) {
  return PAYMENT_METHOD_DISPLAY[code] || 'Unknown Method';
}

/**
 * Get method description
 * @param {number} code - Method code
 * @returns {string} Method description
 */
function getPaymentMethodDescription(code) {
  return PAYMENT_METHOD_DESCRIPTION[code] || 'Unknown payment method';
}

/**
 * Get processing fee percentage
 * @param {number} code - Method code
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
 *
 * @example
 * calculatePaymentFee(1, 1000) // Returns 29 (2.9% of 1000)
 */
function calculatePaymentFee(code, amount) {
  const feePercentage = getPaymentMethodFee(code);
  return (amount * feePercentage) / 100;
}

/**
 * Check if method requires online processing
 * @param {number} code - Method code
 * @returns {boolean} True if online payment
 */
function isOnlinePayment(code) {
  return ONLINE_PAYMENT_METHODS.includes(code);
}

/**
 * Check if method is offline
 * @param {number} code - Method code
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
  return code >= 1 && code <= 8;
}

/**
 * Get all valid payment method codes
 * @returns {number[]} Array of valid method codes
 */
function getAllPaymentMethods() {
  return Object.values(PAYMENT_METHOD);
}

/**
 * Get all payment methods with details
 * @returns {Array<{code: number, name: string, display: string, description: string, fee: number, isOnline: boolean}>}
 */
function getAllPaymentMethodsWithDetails() {
  return Object.entries(PAYMENT_METHOD).map(([key, code]) => ({
    code,
    name: PAYMENT_METHOD_NAME[code],
    display: PAYMENT_METHOD_DISPLAY[code],
    description: PAYMENT_METHOD_DESCRIPTION[code],
    fee: PAYMENT_METHOD_FEE[code],
    isOnline: isOnlinePayment(code)
  }));
}

module.exports = {
  PAYMENT_METHOD,
  PAYMENT_METHOD_NAME,
  PAYMENT_METHOD_DISPLAY,
  PAYMENT_METHOD_DESCRIPTION,
  PAYMENT_METHOD_FEE,
  ONLINE_PAYMENT_METHODS,
  OFFLINE_PAYMENT_METHODS,
  getPaymentMethodLabel,
  getPaymentMethodCode,
  getPaymentMethodDisplay,
  getPaymentMethodDescription,
  getPaymentMethodFee,
  calculatePaymentFee,
  isOnlinePayment,
  isOfflinePayment,
  isValidPaymentMethod,
  getAllPaymentMethods,
  getAllPaymentMethodsWithDetails
};
