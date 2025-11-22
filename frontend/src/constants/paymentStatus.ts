/**
 * Payment Status Constants (Frontend)
 *
 * Numeric codes for payment status - synchronized with backend
 * Backend: services/orders/constants/paymentStatus.js
 */

export enum PaymentStatusCode {
  PENDING = 1,
  PAID = 2,
  FAILED = 3,
  REFUNDED = 4,
}

export const PAYMENT_STATUS_NAME: Record<number, string> = {
  1: 'pending',
  2: 'paid',
  3: 'failed',
  4: 'refunded',
};

export const PAYMENT_STATUS_DISPLAY: Record<number, string> = {
  1: 'Pending',
  2: 'Paid',
  3: 'Failed',
  4: 'Refunded',
};

export const PAYMENT_STATUS_DESCRIPTION: Record<number, string> = {
  1: 'Payment is pending and awaiting processing',
  2: 'Payment has been successfully received and confirmed',
  3: 'Payment transaction failed or was declined',
  4: 'Payment has been refunded to the customer',
};

export interface PaymentStatusColor {
  bg: string;
  text: string;
  border: string;
  badge: string;
}

export const PAYMENT_STATUS_COLOR: Record<number, PaymentStatusColor> = {
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
 */
export function getPaymentStatusLabel(code: number): string {
  return PAYMENT_STATUS_NAME[code] || 'unknown';
}

/**
 * Get status code from label
 */
export function getPaymentStatusCode(label: string): number | null {
  const lowerLabel = label?.toLowerCase();
  const code = Object.keys(PAYMENT_STATUS_NAME).find(
    key => PAYMENT_STATUS_NAME[parseInt(key)] === lowerLabel
  );
  return code ? parseInt(code) : null;
}

/**
 * Get status display name
 */
export function getPaymentStatusDisplay(code: number): string {
  return PAYMENT_STATUS_DISPLAY[code] || 'Unknown';
}

/**
 * Get status description
 */
export function getPaymentStatusDescription(code: number): string {
  return PAYMENT_STATUS_DESCRIPTION[code] || 'Unknown payment status';
}

/**
 * Get status color classes
 */
export function getPaymentStatusColor(code: number): PaymentStatusColor {
  return PAYMENT_STATUS_COLOR[code] || PAYMENT_STATUS_COLOR[1];
}

/**
 * Validate payment status code
 */
export function isValidPaymentStatus(code: number): boolean {
  return code >= 1 && code <= 4;
}

/**
 * Get all valid payment status codes
 */
export function getAllPaymentStatuses(): number[] {
  return Object.values(PaymentStatusCode).filter((v) => typeof v === 'number') as number[];
}
