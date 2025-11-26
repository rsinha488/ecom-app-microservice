/**
 * Payment Method Constants (Frontend)
 *
 * Numeric codes for payment methods - synchronized with backend
 * Backend: services/payment/constants/paymentMethod.js
 *
 * IMPORTANT: These codes MUST match the backend payment service exactly!
 */

export enum PaymentMethodCode {
  CREDIT_CARD = 1,
  DEBIT_CARD = 2,
  UPI = 3,
  NET_BANKING = 4,
  WALLET = 5,
  CASH_ON_DELIVERY = 6,
  STRIPE = 7,
  // PAYPAL = 8  // Removed as per requirement
}

export const PAYMENT_METHOD_NAME: Record<number, string> = {
  1: 'credit_card',
  2: 'debit_card',
  3: 'upi',
  4: 'net_banking',
  5: 'wallet',
  6: 'cash_on_delivery',
  7: 'stripe',
  // 8: 'paypal'  // Removed
};

export const PAYMENT_METHOD_DISPLAY: Record<number, string> = {
  1: 'Credit Card',
  2: 'Debit Card',
  3: 'UPI',
  4: 'Net Banking',
  5: 'Digital Wallet',
  6: 'Cash on Delivery',
  7: 'Stripe',
  // 8: 'PayPal'  // Removed
};

export const PAYMENT_METHOD_DESCRIPTION: Record<number, string> = {
  1: 'Pay securely using your credit card',
  2: 'Pay using your debit card',
  3: 'Pay using UPI (Unified Payments Interface)',
  4: 'Transfer payment directly from your bank account',
  5: 'Pay using digital wallets (Paytm, PhonePe, Google Pay, etc.)',
  6: 'Pay with cash when the order is delivered',
  7: 'Pay securely using Stripe payment gateway',
  // 8: 'Pay using your PayPal account'  // Removed
};

export const PAYMENT_METHOD_ICON: Record<number, string> = {
  1: 'FiCreditCard',
  2: 'FiCreditCard',
  3: 'FiSmartphone', // UPI
  4: 'FiDollarSign', // Net Banking
  5: 'FiHome', // Wallet
  6: 'FiPackage', // Cash on Delivery
  7: 'FiCreditCard', // Stripe
};

export const PAYMENT_METHOD_FEE: Record<number, number> = {
  1: 2.9, // 2.9% for credit cards
  2: 2.5, // 2.5% for debit cards
  3: 0,   // No fee for UPI
  4: 0,   // No fee for net banking
  5: 1.5, // 1.5% for wallet
  6: 0,   // No fee for COD
  7: 2.9, // 2.9% for Stripe
};

export const ONLINE_PAYMENT_METHODS = [1, 2, 3, 4, 5, 7]; // All except COD
export const OFFLINE_PAYMENT_METHODS = [6]; // Only COD

/**
 * Get method label from numeric code
 */
export function getPaymentMethodLabel(code: number): string {
  return PAYMENT_METHOD_NAME[code] || 'unknown';
}

/**
 * Get method code from label
 */
export function getPaymentMethodCode(label: string): number | null {
  const lowerLabel = label?.toLowerCase();
  const code = Object.keys(PAYMENT_METHOD_NAME).find(
    key => PAYMENT_METHOD_NAME[parseInt(key)] === lowerLabel
  );
  return code ? parseInt(code) : null;
}

/**
 * Get method display name
 */
export function getPaymentMethodDisplay(code: number): string {
  return PAYMENT_METHOD_DISPLAY[code] || 'Unknown Method';
}

/**
 * Get method description
 */
export function getPaymentMethodDescription(code: number): string {
  return PAYMENT_METHOD_DESCRIPTION[code] || 'Unknown payment method';
}

/**
 * Get method icon identifier
 */
export function getPaymentMethodIcon(code: number): string {
  return PAYMENT_METHOD_ICON[code] || 'FiDollarSign';
}

/**
 * Get processing fee percentage
 */
export function getPaymentMethodFee(code: number): number {
  return PAYMENT_METHOD_FEE[code] || 0;
}

/**
 * Calculate fee amount
 */
export function calculatePaymentFee(code: number, amount: number): number {
  const feePercentage = getPaymentMethodFee(code);
  return (amount * feePercentage) / 100;
}

/**
 * Check if method requires online processing
 */
export function isOnlinePayment(code: number): boolean {
  return ONLINE_PAYMENT_METHODS.includes(code);
}

/**
 * Check if method is offline
 */
export function isOfflinePayment(code: number): boolean {
  return OFFLINE_PAYMENT_METHODS.includes(code);
}

/**
 * Validate payment method code
 */
export function isValidPaymentMethod(code: number): boolean {
  return code >= 1 && code <= 7 && code !== 8; // 1-7 valid, PayPal (8) removed
}

/**
 * Get all valid payment method codes
 */
export function getAllPaymentMethods(): number[] {
  return Object.values(PaymentMethodCode).filter((v) => typeof v === 'number') as number[];
}

/**
 * Get enabled payment methods (for UI)
 * In production, this would come from settings/config
 */
export function getEnabledPaymentMethods(): number[] {
  // COD and Stripe are enabled
  // In production, this would be configurable
  return [PaymentMethodCode.CASH_ON_DELIVERY, PaymentMethodCode.STRIPE];
}
