export const useCurrencyToCountry = () => {
  const getCurrencyInfo = (currency: string) => {
    const currencyMap: Record<string, { country: string; flag: string; name: string }> = {
      'KZ': { country: 'AO', flag: '🇦🇴', name: 'Angola' },
      'EUR': { country: 'PT', flag: '🇵🇹', name: 'Portugal' },
      'MZN': { country: 'MZ', flag: '🇲🇿', name: 'Moçambique' },
      'GBP': { country: 'GB', flag: '🇬🇧', name: 'Reino Unido' }
    };

    return currencyMap[currency.toUpperCase()] || { 
      country: 'UNKNOWN', 
      flag: '🌍', 
      name: 'Internacional' 
    };
  };

  const convertToKZ = (amount: number, fromCurrency: string) => {
    // Taxas de conversão aproximadas (inverso das taxas do hook useGeoLocation)
    const exchangeRates: Record<string, number> = {
      'KZ': 1, // Base currency
      'EUR': 1053, // 1 EUR = ~1053 KZ (aproximado)
      'MZN': 14.3, // 1 MZN = ~14.3 KZ (aproximado)
      'GBP': 1250 // 1 GBP = ~1250 KZ (aproximado)
    };

    const rate = exchangeRates[fromCurrency.toUpperCase()] || 1;
    return Math.round(amount * rate);
  };

  return {
    getCurrencyInfo,
    convertToKZ
  };
};