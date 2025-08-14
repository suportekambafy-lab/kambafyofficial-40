export const useCurrencyToCountry = () => {
  const getCurrencyInfo = (currency: string) => {
    const currencyMap: Record<string, { country: string; flag: string; name: string }> = {
      'KZ': { country: 'AO', flag: '🇦🇴', name: 'Angola' },
      'EUR': { country: 'PT', flag: '🇵🇹', name: 'Portugal' },
      'MZN': { country: 'MZ', flag: '🇲🇿', name: 'Moçambique' },
      'USD': { country: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
      'BRL': { country: 'BR', flag: '🇧🇷', name: 'Brasil' },
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
      'EUR': 1048, // 1 EUR = ~1048 KZ (aproximado)
      'MZN': 14.3, // 1 MZN = ~14.3 KZ (aproximado)
      'USD': 833, // 1 USD = ~833 KZ (aproximado)
      'BRL': 140, // 1 BRL = ~140 KZ (aproximado)
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