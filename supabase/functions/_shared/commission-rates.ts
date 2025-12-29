/**
 * Commission Rates Configuration
 * 
 * Angola payment methods: 8.99% platform fee
 * Mozambique payment methods: 9.99% platform fee
 * International/Stripe payment methods: 9.99% platform fee
 */

// Platform commission rates
export const ANGOLA_COMMISSION_RATE = 0.0899; // 8.99%
export const DEFAULT_COMMISSION_RATE = 0.0999; // 9.99% (Mozambique + International)

// Seller receives this percentage after platform fee
export const ANGOLA_SELLER_RATE = 1 - ANGOLA_COMMISSION_RATE; // 0.9101 (91.01%)
export const DEFAULT_SELLER_RATE = 1 - DEFAULT_COMMISSION_RATE; // 0.9001 (90.01%)

// Angola payment methods (8.99% fee)
export const ANGOLA_PAYMENT_METHODS = [
  'multicaixa_express',
  'express',           // AppyPay Express (Angola)
  'reference',         // AppyPay Reference (Angola)
  'paypal_angola',
  'bank_transfer_ao',
  'kambapay',
  'transfer',          // Legacy: bank transfer Angola
  'transferencia',     // Legacy: transferência Angola
  'bank_transfer'      // Legacy
];

/**
 * Get the platform commission rate based on payment method
 * @param paymentMethod - The payment method used for the transaction
 * @returns The commission rate (e.g., 0.0899 for 8.99%)
 */
export function getCommissionRate(paymentMethod?: string | null): number {
  if (!paymentMethod) return DEFAULT_COMMISSION_RATE;
  
  const normalizedMethod = paymentMethod.toLowerCase().trim();
  
  if (ANGOLA_PAYMENT_METHODS.includes(normalizedMethod)) {
    return ANGOLA_COMMISSION_RATE;
  }
  
  return DEFAULT_COMMISSION_RATE;
}

/**
 * Get the seller rate (1 - commission rate) based on payment method
 * @param paymentMethod - The payment method used for the transaction
 * @returns The seller rate (e.g., 0.9101 for 91.01%)
 */
export function getSellerRate(paymentMethod?: string | null): number {
  return 1 - getCommissionRate(paymentMethod);
}

/**
 * Calculate seller commission (amount after platform fee)
 * @param grossAmount - The total transaction amount
 * @param paymentMethod - The payment method used
 * @returns The amount the seller receives after platform fee
 */
export function calculateSellerCommission(grossAmount: number, paymentMethod?: string | null): number {
  return grossAmount * getSellerRate(paymentMethod);
}

/**
 * Calculate platform fee
 * @param grossAmount - The total transaction amount
 * @param paymentMethod - The payment method used
 * @returns The platform fee amount
 */
export function calculatePlatformFee(grossAmount: number, paymentMethod?: string | null): number {
  return grossAmount * getCommissionRate(paymentMethod);
}

/**
 * Get commission rate description for UI display
 * @param paymentMethod - The payment method used
 * @returns String like "8.99%" or "9.99%"
 */
export function getCommissionRateDisplay(paymentMethod?: string | null): string {
  const rate = getCommissionRate(paymentMethod);
  return `${(rate * 100).toFixed(2)}%`;
}
