import { useState, useEffect } from 'react';

export const useCurrencyConverter = () => {
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [originalCurrency, setOriginalCurrency] = useState<string>('KZ');
  const [targetCurrency, setTargetCurrency] = useState<string>('KZ');

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    setOriginalAmount(amount);
    setOriginalCurrency(fromCurrency);
    setTargetCurrency(toCurrency);

    if (fromCurrency === toCurrency) {
      setConvertedAmount(amount);
      return;
    }

    // Exchange rates (approximate)
    const exchangeRates: Record<string, Record<string, number>> = {
      'KZ': {
        'EUR': 0.00095,
        'USD': 0.0012,
        'BRL': 0.007
      },
      'EUR': {
        'KZ': 1048,
        'USD': 1.1,
        'BRL': 6.2
      }
    };

    const rate = exchangeRates[fromCurrency]?.[toCurrency] || 1;
    setConvertedAmount(Math.round(amount * rate * 100) / 100);
  };

  return {
    convertedAmount,
    originalAmount,
    originalCurrency,
    targetCurrency,
    convertCurrency
  };
};