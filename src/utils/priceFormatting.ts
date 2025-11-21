// Utility function for consistent price formatting across the app

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

// Função auxiliar para formatar números no padrão português
// Ponto para milhares, vírgula para decimais, máximo 2 casas decimais
export const formatNumberPT = (value: number): string => {
  return value.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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
          return `€${formatNumberPT(customPrice)}`;
        case 'MZN':
          return `${formatNumberPT(customPrice)} MZN`;
        case 'KZ':
        default:
          return `${formatNumberPT(customPrice)} KZ`;
      }
    }
  }

  // Se não há país específico, usar formatação padrão KZ
  if (!targetCountry || targetCountry.currency === 'KZ') {
    return `${formatNumberPT(priceInKZ)} KZ`;
  }

  // Converter preço para a moeda do país (fallback automático)
  const convertedPrice = priceInKZ / targetCountry.exchangeRate;
  
  switch (targetCountry.currency) {
    case 'EUR':
      return `€${formatNumberPT(convertedPrice)}`;
    case 'MZN':
      return `${formatNumberPT(convertedPrice)} MZN`;
    case 'KZ':
    default:
      return `${formatNumberPT(priceInKZ)} KZ`;
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
  // Se não é KZ, converter para KZ
  let amountInKZ = amount;
  
  if (currency.toUpperCase() !== 'KZ') {
    // Taxas de conversão para KZ (baseadas nas taxas reais do useGeoLocation)
    const exchangeRates: Record<string, number> = {
      'EUR': 1100, // 1 EUR = ~1100 KZ (aproximado - ajustado)
      'MZN': 14.3  // 1 MZN = ~14.3 KZ (aproximado)
    };
    
    const rate = exchangeRates[currency.toUpperCase()] || 1;
    amountInKZ = Math.round(amount * rate);
  }
  
  return `${formatNumberPT(amountInKZ)} KZ`;
};