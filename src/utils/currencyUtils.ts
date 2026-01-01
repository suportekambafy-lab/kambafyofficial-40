/**
 * Utility functions for currency handling
 * Centralizes logic for determining actual currency from payment methods
 */

// Métodos de pagamento angolanos - sempre KZ
const ANGOLA_PAYMENT_METHODS = ['express', 'multicaixa_express', 'reference', 'bank_transfer', 'transfer', 'kambapay'];

// Métodos de pagamento moçambicanos - sempre MZN
const MOZAMBIQUE_PAYMENT_METHODS = ['mpesa', 'emola', 'card_mz'];

// Métodos de pagamento europeus (Stripe PT/EU) - nunca KZ, usar original_currency ou EUR
const EUROPEAN_PAYMENT_METHODS = ['multibanco', 'mbway', 'klarna', 'klarna_uk', 'card', 'card_uk', 'apple_pay', 'google_pay'];

/**
 * Determines the actual currency of a sale based on the payment method
 * This is necessary because older sales may have incorrect original_currency values
 * 
 * @param sale - Sale object with payment_method, original_currency, and currency fields
 * @returns The actual currency code (KZ, EUR, MZN, etc.)
 */
export const getActualCurrency = (sale: {
  payment_method?: string | null;
  original_currency?: string | null;
  currency?: string | null;
}): string => {
  const paymentMethod = (sale.payment_method || '').toLowerCase();
  
  // Métodos angolanos: sempre KZ (independente do que está no banco)
  if (ANGOLA_PAYMENT_METHODS.includes(paymentMethod)) {
    return 'KZ';
  }
  
  // Métodos moçambicanos: sempre MZN
  if (MOZAMBIQUE_PAYMENT_METHODS.includes(paymentMethod)) {
    return 'MZN';
  }
  
  // Métodos europeus: respeitar original_currency se explicitamente definido
  // Dados legados com original_currency=KZ devem ficar como KZ (não forçar EUR)
  if (EUROPEAN_PAYMENT_METHODS.includes(paymentMethod)) {
    const origCurrency = sale.original_currency || '';
    const normalized = origCurrency === 'AOA' ? 'KZ' : origCurrency;
    
    // Se original_currency está explicitamente definido e não é KZ, usar
    if (normalized && normalized !== 'KZ') {
      return normalized;
    }
    
    // Se currency é uma moeda europeia válida, usar
    const currencyNormalized = (sale.currency || '') === 'AOA' ? 'KZ' : (sale.currency || '');
    if (currencyNormalized && currencyNormalized !== 'KZ') {
      return currencyNormalized;
    }
    
    // Dados legados: método europeu mas moeda KZ → manter como KZ
    // (eram vendas antigas com configuração incorreta)
    return 'KZ';
  }
  
  // Fallback: usar original_currency se disponível e válido
  const origCurrency = sale.original_currency || sale.currency || 'KZ';
  // Normalizar AOA para KZ
  return origCurrency === 'AOA' ? 'KZ' : origCurrency;
};

/**
 * Gets the actual amount in the correct currency
 * Uses original_amount when the currency matches, otherwise falls back to amount
 * 
 * @param sale - Sale object with amount, original_amount, original_currency, payment_method, currency
 * @returns The correct amount in the actual currency
 */
export const getActualAmount = (sale: {
  amount?: string | number | null;
  original_amount?: string | number | null;
  original_currency?: string | null;
  payment_method?: string | null;
  currency?: string | null;
}): number => {
  const actualCurrency = getActualCurrency(sale);
  const paymentMethod = (sale.payment_method || '').toLowerCase();
  const normalizedOrig = (sale.original_currency || '') === 'AOA' ? 'KZ' : (sale.original_currency || '');

  // Para métodos europeus, priorizar original_amount se existir e parecer válido
  if (EUROPEAN_PAYMENT_METHODS.includes(paymentMethod)) {
    if (sale.original_amount != null) {
      const origAmount = typeof sale.original_amount === 'number'
        ? sale.original_amount
        : parseFloat((sale.original_amount as any) || '0');

      if (origAmount > 0) {
        return origAmount;
      }
    }
  }

  // Usar original_amount apenas se a moeda original corresponder à moeda real
  const shouldUseOriginal = sale.original_amount != null && normalizedOrig === actualCurrency;

  const raw = shouldUseOriginal ? sale.original_amount : sale.amount;
  return typeof raw === 'number' ? raw : parseFloat((raw as any) || '0');
};

/**
 * Calculates the seller's earning after platform commission
 * 
 * @param grossAmount - Gross amount before commission
 * @param currency - Currency code to determine commission rate
 * @returns Net amount after commission
 */
export const calculateSellerEarning = (grossAmount: number, currency: string): number => {
  // Angola (KZ): 8.99%, Internacional: 9.99%
  const commissionRate = currency === 'KZ' ? 0.0899 : 0.0999;
  return grossAmount * (1 - commissionRate);
};

export { ANGOLA_PAYMENT_METHODS, MOZAMBIQUE_PAYMENT_METHODS, EUROPEAN_PAYMENT_METHODS };
