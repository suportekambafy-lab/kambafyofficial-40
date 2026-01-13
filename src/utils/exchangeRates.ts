/**
 * Centralized exchange rates for currency conversion to KZ
 * Used for gamification goals and consistent revenue calculations
 */

export const EXCHANGE_RATES: Record<string, number> = {
  EUR: 1053,
  MZN: 14.3,
  USD: 900,
  GBP: 1180,
  BRL: 180,
  KZ: 1,
  AOA: 1, // AOA is the same as KZ
};

/**
 * Convert an amount from a given currency to KZ
 * @param amount - The amount to convert
 * @param currency - The source currency code
 * @returns The amount in KZ
 */
export const convertToKZ = (amount: number, currency: string): number => {
  const normalizedCurrency = currency?.toUpperCase() || 'KZ';
  const rate = EXCHANGE_RATES[normalizedCurrency] || 1;
  return Math.round(amount * rate);
};

/**
 * Get the exchange rate for a given currency to KZ
 * @param currency - The currency code
 * @returns The exchange rate
 */
export const getExchangeRate = (currency: string): number => {
  const normalizedCurrency = currency?.toUpperCase() || 'KZ';
  return EXCHANGE_RATES[normalizedCurrency] || 1;
};
