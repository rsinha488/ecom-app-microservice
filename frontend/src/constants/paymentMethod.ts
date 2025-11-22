/**
 * Payment Method Constants (Frontend)
 *
 * Numeric codes for payment methods - synchronized with backend
 * Backend: services/orders/constants/paymentMethod.js
 */

export enum PaymentMethodCode {
  CREDIT_CARD = 1,
  DEBIT_CARD = 2,
  PAYPAL = 3,
  CASH_ON_DELIVERY = 4,
  BANK_TRANSFER = 5,
  UPI = 6,
  WALLET = 7,
}

export const PAYMENT_METHOD_NAME: Record<number, string> = {
  1: 'credit_card',
  2: 'debit_card',
  3: 'paypal',
  4: 'cash_on_delivery',
  5: 'bank_transfer',
  6: 'upi',
  7: 'wallet',
};

export const PAYMENT_METHOD_DISPLAY: Record<number, string> = {
  1: 'Credit Card',
  2: 'Debit Card',
  3: 'PayPal',
  4: 'Cash on Delivery',
  5: 'Bank Transfer',
  6: 'UPI',
  7: 'Digital Wallet',
};

export const PAYMENT_METHOD_DESCRIPTION: Record<number, string> = {
  1: 'Pay securely using your credit card',
  2: 'Pay using your debit card',
  3: 'Pay using your PayPal account',
  4: 'Pay with cash when the order is delivered',
  5: 'Transfer payment directly to our bank account',
  6: 'Pay using UPI (Unified Payments Interface)',
  7: 'Pay using digital wallets (Paytm, PhonePe, Google Pay, etc.)',
};

export const PAYMENT_METHOD_ICON: Record<number, string> = {
  1: 'FiCreditCard',
  2: 'FiCreditCard',
  3: 'FaPaypal',
  4: 'FiDollarSign',
  5: 'FiHome',
  6: 'FiSmartphone',
  7: 'FiPackage',
};

export const PAYMENT_METHOD_FEE: Record<number, number> = {
  1: 2.9, // 2.9% for credit cards
  2: 2.5, // 2.5% for debit cards
  3: 3.5, // 3.5% for PayPal
  4: 0,   // No fee for COD
  5: 0,   // No fee for bank transfer
  6: 0,   // No fee for UPI
  7: 1.5, // 1.5% for wallet
};

export const ONLINE_PAYMENT_METHODS = [1, 2, 3, 5, 6, 7];
export const OFFLINE_PAYMENT_METHODS = [4];

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
  return code >= 1 && code <= 7;
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
  // For now, only COD is enabled (as per current UI)
  // In production, this would be configurable
  return [PaymentMethodCode.CASH_ON_DELIVERY];
}
