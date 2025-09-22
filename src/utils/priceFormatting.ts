// Utility function for consistent price formatting across the app

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

export const formatPrice = (
  priceInKZ: number, 
  targetCountry?: CountryInfo,
  useToLocaleString: boolean = true,
  customPrices?: Record<string, string>
): string => {
  // Verificar se há preço customizado para o país
  if (targetCountry && customPrices && customPrices[targetCountry.code]) {
    const customPrice = parseFloat(customPrices[targetCountry.code]);
    if (!isNaN(customPrice)) {
      switch (targetCountry.currency) {
        case 'EUR':
          return `€${customPrice.toFixed(2)}`;
        case 'MZN':
          return `${customPrice.toFixed(2)} MZN`;
        case 'KZ':
        default:
          if (useToLocaleString) {
            return `${parseFloat(customPrice.toString()).toLocaleString('pt-BR')} KZ`;
          }
          return `${customPrice.toLocaleString()} KZ`;
      }
    }
  }

  // Se não há país específico, usar formatação padrão KZ
  if (!targetCountry || targetCountry.currency === 'KZ') {
    // Usar o mesmo formato do ProductCard - parseFloat().toLocaleString('pt-BR')
    if (useToLocaleString) {
      return `${parseFloat(priceInKZ.toString()).toLocaleString('pt-BR')} KZ`;
    }
    return `${priceInKZ.toLocaleString()} KZ`;
  }

  // Converter preço para a moeda do país (fallback automático)
  const convertedPrice = priceInKZ / targetCountry.exchangeRate;
  
  switch (targetCountry.currency) {
    case 'EUR':
      return `€${convertedPrice.toFixed(2)}`;
    case 'MZN':
      return `${convertedPrice.toFixed(2)} MZN`;
    case 'KZ':
    default:
      if (useToLocaleString) {
        return `${parseFloat(priceInKZ.toString()).toLocaleString('pt-BR')} KZ`;
      }
      return `${priceInKZ.toLocaleString()} KZ`;
  }
};

// Função para formatar preço a partir de string (compatibilidade com database)
export const formatPriceFromString = (
  priceString: string,
  targetCountry?: CountryInfo,
  useToLocaleString: boolean = true,
  customPrices?: Record<string, string>
): string => {
  const priceNumber = parseFloat(priceString);
  return formatPrice(priceNumber, targetCountry, useToLocaleString, customPrices);
};

// Função específica para vendedores - sempre mostra em KZ original ou convertido
export const formatPriceForSeller = (
  amount: number,
  currency: string = 'KZ',
  useToLocaleString: boolean = true
): string => {
  // Debug detalhado
  console.log(`🔄 formatPriceForSeller INÍCIO:`, {
    amount,
    currency,
    useToLocaleString
  });
  
  // Se não é KZ, converter para KZ
  let amountInKZ = amount;
  
  if (currency.toUpperCase() !== 'KZ') {
    // Taxas de conversão para KZ (inverso das taxas do useGeoLocation)
    const exchangeRates: Record<string, number> = {
      'EUR': 1053, // 1 EUR = ~1053 KZ (aproximado)
      'MZN': 14.3  // 1 MZN = ~14.3 KZ (aproximado)
    };
    
    const rate = exchangeRates[currency.toUpperCase()] || 1;
    amountInKZ = Math.round(amount * rate);
    
    console.log(`💱 CONVERSÃO:`, {
      originalAmount: amount,
      originalCurrency: currency,
      rate,
      convertedAmount: amountInKZ
    });
  }
  
  const result = useToLocaleString 
    ? `${parseFloat(amountInKZ.toString()).toLocaleString('pt-BR')} KZ`
    : `${amountInKZ.toLocaleString()} KZ`;
    
  console.log(`✅ RESULTADO formatPriceForSeller:`, result);
  return result;
};