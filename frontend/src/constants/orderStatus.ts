/**
 * Order Status Constants (Frontend)
 *
 * Defines numeric status codes and their metadata for orders.
 * Synchronized with backend order status implementation.
 *
 * @module constants/orderStatus
 * @version 1.0.0
 */

/**
 * Numeric status codes for orders
 */
export enum OrderStatus {
  PENDING = 1,      // Order placed, awaiting processing
  PROCESSING = 2,   // Order is being prepared/packed
  SHIPPED = 3,      // Order has been dispatched
  DELIVERED = 4,    // Order has been delivered to customer
  CANCELLED = 5     // Order has been cancelled
}

/**
 * Order status metadata type
 */
export interface OrderStatusInfo {
  code: number;
  string: string;
  label: string;
  color: StatusColor;
  description: string;
}

/**
 * Status color type (Tailwind CSS color names)
 */
export type StatusColor = 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'gray';

/**
 * String representation of order statuses
 */
export const ORDER_STATUS_STRING: Record<number, string> = {
  [OrderStatus.PENDING]: 'pending',
  [OrderStatus.PROCESSING]: 'processing',
  [OrderStatus.SHIPPED]: 'shipped',
  [OrderStatus.DELIVERED]: 'delivered',
  [OrderStatus.CANCELLED]: 'cancelled'
};

/**
 * Reverse mapping: String to numeric code
 */
export const ORDER_STATUS_CODE: Record<string, number> = {
  'pending': OrderStatus.PENDING,
  'processing': OrderStatus.PROCESSING,
  'shipped': OrderStatus.SHIPPED,
  'delivered': OrderStatus.DELIVERED,
  'cancelled': OrderStatus.CANCELLED
};

/**
 * Display labels for frontend
 */
export const ORDER_STATUS_LABEL: Record<number, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled'
};

/**
 * Status descriptions
 */
export const ORDER_STATUS_DESCRIPTION: Record<number, string> = {
  [OrderStatus.PENDING]: 'Order placed, awaiting processing',
  [OrderStatus.PROCESSING]: 'Order is being prepared and packed',
  [OrderStatus.SHIPPED]: 'Order has been dispatched for delivery',
  [OrderStatus.DELIVERED]: 'Order has been delivered successfully',
  [OrderStatus.CANCELLED]: 'Order has been cancelled'
};

/**
 * Status colors for UI (Tailwind CSS classes)
 */
export const ORDER_STATUS_COLOR: Record<number, StatusColor> = {
  [OrderStatus.PENDING]: 'yellow',
  [OrderStatus.PROCESSING]: 'blue',
  [OrderStatus.SHIPPED]: 'purple',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.CANCELLED]: 'red'
};

/**
 * Tailwind CSS badge classes for each status
 */
export const ORDER_STATUS_BADGE_CLASS: Record<number, string> = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [OrderStatus.PROCESSING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [OrderStatus.SHIPPED]: 'bg-purple-100 text-purple-800 border-purple-200',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-200',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200'
};

/**
 * Valid status transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<number, number[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],  // Final state
  [OrderStatus.CANCELLED]: []   // Final state
};

/**
 * Convert numeric status code to string
 * @param statusCode - Numeric status code
 * @returns String representation of status
 */
export function statusToString(statusCode: number): string {
  const status = ORDER_STATUS_STRING[statusCode];
  if (!status) {
    throw new Error(`Invalid status code: ${statusCode}`);
  }
  return status;
}

/**
 * Convert string status to numeric code
 * @param statusString - String status value
 * @returns Numeric status code
 */
export function stringToStatus(statusString: string): number {
  const code = ORDER_STATUS_CODE[statusString.toLowerCase()];
  if (!code) {
    throw new Error(`Invalid status string: ${statusString}`);
  }
  return code;
}

/**
 * Check if a status transition is valid
 * @param currentStatus - Current status code
 * @param newStatus - Desired new status code
 * @returns True if transition is valid
 */
export function isValidTransition(currentStatus: number, newStatus: number): boolean {
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
 * @param statusCode - Numeric status code
 * @returns Display label
 */
export function getStatusLabel(statusCode: number): string {
  return ORDER_STATUS_LABEL[statusCode] || 'Unknown';
}

/**
 * Get color for status code
 * @param statusCode - Numeric status code
 * @returns Color name
 */
export function getStatusColor(statusCode: number): StatusColor {
  return ORDER_STATUS_COLOR[statusCode] || 'gray';
}

/**
 * Get badge class for status code
 * @param statusCode - Numeric status code
 * @returns Tailwind CSS badge classes
 */
export function getStatusBadgeClass(statusCode: number): string {
  return ORDER_STATUS_BADGE_CLASS[statusCode] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get description for status code
 * @param statusCode - Numeric status code
 * @returns Status description
 */
export function getStatusDescription(statusCode: number): string {
  return ORDER_STATUS_DESCRIPTION[statusCode] || 'Unknown status';
}

/**
 * Get all valid statuses
 * @returns Array of all status information
 */
export function getAllStatuses(): OrderStatusInfo[] {
  return Object.entries(OrderStatus)
    .filter(([key]) => isNaN(Number(key)))  // Filter out reverse mappings
    .map(([_, code]) => ({
      code: code as number,
      string: ORDER_STATUS_STRING[code as number],
      label: ORDER_STATUS_LABEL[code as number],
      color: ORDER_STATUS_COLOR[code as number],
      description: ORDER_STATUS_DESCRIPTION[code as number]
    }));
}

/**
 * Get allowed next statuses for a given status
 * @param currentStatus - Current status code
 * @returns Array of allowed next status codes
 */
export function getAllowedNextStatuses(currentStatus: number): number[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Get allowed next statuses with metadata
 * @param currentStatus - Current status code
 * @returns Array of allowed next statuses with metadata
 */
export function getAllowedNextStatusesInfo(currentStatus: number): OrderStatusInfo[] {
  const allowedCodes = getAllowedNextStatuses(currentStatus);
  return getAllStatuses().filter(status => allowedCodes.includes(status.code));
}
