/**
 * Order Status Constants
 *
 * Defines numeric status codes and their string representations for orders.
 * Using numeric codes provides better performance, easier comparisons, and clearer status progression.
 *
 * @module constants/orderStatus
 * @version 1.0.0
 *
 * Status Flow:
 * 1 (Pending) → 2 (Processing) → 3 (Shipped) → 4 (Delivered)
 *                    ↓
 *                5 (Cancelled)
 */

/**
 * Numeric status codes for orders
 * @readonly
 * @enum {number}
 */
const ORDER_STATUS = {
  PENDING: 1,      // Order placed, awaiting processing
  PROCESSING: 2,   // Order is being prepared/packed
  SHIPPED: 3,      // Order has been dispatched
  DELIVERED: 4,    // Order has been delivered to customer
  CANCELLED: 5     // Order has been cancelled
};

/**
 * String representation of order statuses
 * Maps numeric codes to human-readable strings
 * @readonly
 * @enum {string}
 */
const ORDER_STATUS_STRING = {
  1: 'pending',
  2: 'processing',
  3: 'shipped',
  4: 'delivered',
  5: 'cancelled'
};

/**
 * Reverse mapping: String to numeric code
 * @readonly
 * @enum {number}
 */
const ORDER_STATUS_CODE = {
  'pending': 1,
  'processing': 2,
  'shipped': 3,
  'delivered': 4,
  'cancelled': 5
};

/**
 * Display labels for frontend
 * @readonly
 * @enum {string}
 */
const ORDER_STATUS_LABEL = {
  1: 'Pending',
  2: 'Processing',
  3: 'Shipped',
  4: 'Delivered',
  5: 'Cancelled'
};

/**
 * Status colors for UI (Tailwind CSS classes)
 * @readonly
 * @enum {string}
 */
const ORDER_STATUS_COLOR = {
  1: 'yellow',    // Pending - Warning
  2: 'blue',      // Processing - Info
  3: 'purple',    // Shipped - In Transit
  4: 'green',     // Delivered - Success
  5: 'red'        // Cancelled - Danger
};

/**
 * Valid status transitions
 * Defines which status changes are allowed
 * @readonly
 * @type {Object.<number, number[]>}
 */
const VALID_STATUS_TRANSITIONS = {
  1: [2, 5],      // Pending → Processing or Cancelled
  2: [3, 5],      // Processing → Shipped or Cancelled
  3: [4, 5],      // Shipped → Delivered or Cancelled
  4: [],          // Delivered → No transitions allowed (final state)
  5: []           // Cancelled → No transitions allowed (final state)
};

/**
 * Convert numeric status code to string
 * @param {number} statusCode - Numeric status code
 * @returns {string} String representation of status
 * @throws {Error} If status code is invalid
 *
 * @example
 * statusToString(1) // Returns 'pending'
 * statusToString(4) // Returns 'delivered'
 */
function statusToString(statusCode) {
  const status = ORDER_STATUS_STRING[statusCode];
  if (!status) {
    throw new Error(`Invalid status code: ${statusCode}`);
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
 * stringToStatus('delivered') // Returns 4
 */
function stringToStatus(statusString) {
  const code = ORDER_STATUS_CODE[statusString.toLowerCase()];
  if (!code) {
    throw new Error(`Invalid status string: ${statusString}`);
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
 * isValidTransition(4, 1) // Returns false (Delivered → Pending not allowed)
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
 */
function getStatusLabel(statusCode) {
  return ORDER_STATUS_LABEL[statusCode] || 'Unknown';
}

/**
 * Get color for status code
 * @param {number} statusCode - Numeric status code
 * @returns {string} Color name
 *
 * @example
 * getStatusColor(1) // Returns 'yellow'
 * getStatusColor(4) // Returns 'green'
 */
function getStatusColor(statusCode) {
  return ORDER_STATUS_COLOR[statusCode] || 'gray';
}

/**
 * Get all valid statuses
 * @returns {Array<{code: number, string: string, label: string, color: string}>}
 */
function getAllStatuses() {
  return Object.entries(ORDER_STATUS).map(([key, code]) => ({
    code,
    string: ORDER_STATUS_STRING[code],
    label: ORDER_STATUS_LABEL[code],
    color: ORDER_STATUS_COLOR[code]
  }));
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_STRING,
  ORDER_STATUS_CODE,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  VALID_STATUS_TRANSITIONS,
  statusToString,
  stringToStatus,
  isValidTransition,
  getStatusLabel,
  getStatusColor,
  getAllStatuses
};
