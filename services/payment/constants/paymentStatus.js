/**
 * Payment Status Constants
 *
 * Defines numeric status codes and their string representations for payments.
 * Using numeric codes provides better performance, easier comparisons, and clearer status progression.
 *
 * @module constants/paymentStatus
 * @version 1.0.0
 *
 * Status Flow:
 * 1 (Pending) → 2 (Processing) → 3 (Completed)
 *              ↓
 *         4 (Failed) → 5 (Refunded)
 */

/**
 * Numeric status codes for payments
 * @readonly
 * @enum {number}
 */
const PAYMENT_STATUS = {
  PENDING: 1,       // Payment initiated, awaiting processing
  PROCESSING: 2,    // Payment is being processed by payment gateway
  COMPLETED: 3,     // Payment successfully completed
  FAILED: 4,        // Payment failed or was declined
  REFUNDED: 5,      // Payment has been refunded
  CANCELLED: 6      // Payment cancelled by user before completion
};

/**
 * String representation of payment statuses
 * Maps numeric codes to human-readable strings
 * @readonly
 * @enum {string}
 */
const PAYMENT_STATUS_STRING = {
  1: 'pending',
  2: 'processing',
  3: 'completed',
  4: 'failed',
  5: 'refunded',
  6: 'cancelled'
};

/**
 * Reverse mapping: String to numeric code
 * @readonly
 * @enum {number}
 */
const PAYMENT_STATUS_CODE = {
  'pending': 1,
  'processing': 2,
  'completed': 3,
  'failed': 4,
  'refunded': 5,
  'cancelled': 6
};

/**
 * Display labels for frontend
 * @readonly
 * @enum {string}
 */
const PAYMENT_STATUS_LABEL = {
  1: 'Pending',
  2: 'Processing',
  3: 'Completed',
  4: 'Failed',
  5: 'Refunded',
  6: 'Cancelled'
};

/**
 * Status colors for UI (Tailwind CSS classes)
 * @readonly
 * @enum {string}
 */
const PAYMENT_STATUS_COLOR = {
  1: 'yellow',      // Pending - Warning
  2: 'blue',        // Processing - Info
  3: 'green',       // Completed - Success
  4: 'red',         // Failed - Danger
  5: 'gray',        // Refunded - Neutral
  6: 'orange'       // Cancelled - Warning
};

/**
 * Valid status transitions
 * Defines which status changes are allowed
 * @readonly
 * @type {Object.<number, number[]>}
 */
const VALID_STATUS_TRANSITIONS = {
  1: [2, 4, 6],     // Pending → Processing, Failed, or Cancelled
  2: [3, 4],        // Processing → Completed or Failed
  3: [5],           // Completed → Refunded only
  4: [],            // Failed → No transitions (terminal state)
  5: [],            // Refunded → No transitions (terminal state)
  6: []             // Cancelled → No transitions (terminal state)
};

/**
 * Convert numeric status code to string
 * @param {number} statusCode - Numeric status code
 * @returns {string} String representation of status
 * @throws {Error} If status code is invalid
 *
 * @example
 * statusToString(1) // Returns 'pending'
 * statusToString(3) // Returns 'completed'
 */
function statusToString(statusCode) {
  const status = PAYMENT_STATUS_STRING[statusCode];
  if (!status) {
    throw new Error(`Invalid payment status code: ${statusCode}`);
  }
  return status;
}

/**
 * Convert string status to numeric code
 * @param {string} statusString - String status value
 * @returns {number} Numeric status code
 * @throws {Error} If status string is invalid
 *
 * @example
 * stringToStatus('pending') // Returns 1
 * stringToStatus('completed') // Returns 3
 */
function stringToStatus(statusString) {
  const code = PAYMENT_STATUS_CODE[statusString.toLowerCase()];
  if (!code) {
    throw new Error(`Invalid payment status string: ${statusString}`);
  }
  return code;
}

/**
 * Check if a status transition is valid
 * @param {number} currentStatus - Current status code
 * @param {number} newStatus - Desired new status code
 * @returns {boolean} True if transition is valid
 *
 * @example
 * isValidTransition(1, 2) // Returns true (Pending → Processing)
 * isValidTransition(3, 1) // Returns false (Completed → Pending not allowed)
 */
function isValidTransition(currentStatus, newStatus) {
  // Allow staying in the same status
  if (currentStatus === newStatus) {
    return true;
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.includes(newStatus);
}

/**
 * Get display label for status code
 * @param {number} statusCode - Numeric status code
 * @returns {string} Display label
 *
 * @example
 * getStatusLabel(1) // Returns 'Pending'
 * getStatusLabel(3) // Returns 'Completed'
 */
function getStatusLabel(statusCode) {
  return PAYMENT_STATUS_LABEL[statusCode] || 'Unknown';
}

/**
 * Get color for status code
 * @param {number} statusCode - Numeric status code
 * @returns {string} Color name
 *
 * @example
 * getStatusColor(1) // Returns 'yellow'
 * getStatusColor(3) // Returns 'green'
 */
function getStatusColor(statusCode) {
  return PAYMENT_STATUS_COLOR[statusCode] || 'gray';
}

/**
 * Get all valid statuses
 * @returns {Array<{code: number, string: string, label: string, color: string}>}
 */
function getAllStatuses() {
  return Object.entries(PAYMENT_STATUS).map(([key, code]) => ({
    code,
    string: PAYMENT_STATUS_STRING[code],
    label: PAYMENT_STATUS_LABEL[code],
    color: PAYMENT_STATUS_COLOR[code]
  }));
}

/**
 * Check if status is terminal (no further transitions possible)
 * @param {number} statusCode - Status code to check
 * @returns {boolean} True if status is terminal
 */
function isTerminalStatus(statusCode) {
  return [
    PAYMENT_STATUS.COMPLETED,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.CANCELLED
  ].includes(statusCode);
}

module.exports = {
  PAYMENT_STATUS,
  PAYMENT_STATUS_STRING,
  PAYMENT_STATUS_CODE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_COLOR,
  VALID_STATUS_TRANSITIONS,
  statusToString,
  stringToStatus,
  isValidTransition,
  getStatusLabel,
  getStatusColor,
  getAllStatuses,
  isTerminalStatus
};
