// Utility function for consistent price formatting across the app

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

// Helper para formatar número com exatamente 2 casas decimais
const formatWithMaxTwoDecimals = (value: number): string => {
  // Arredonda para 2 casas decimais
  const rounded = Math.round(value * 100) / 100;
  // Formata com separador de milhares e vírgula decimal (pt-BR) - sempre 2 casas
  return rounded.toLocaleString('pt-BR', {
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
          return `€${formatWithMaxTwoDecimals(customPrice)}`;
        case 'GBP':
          return `£${formatWithMaxTwoDecimals(customPrice)}`;
        case 'USD':
          return `$${formatWithMaxTwoDecimals(customPrice)}`;
        case 'MZN':
          return `${formatWithMaxTwoDecimals(customPrice)} MZN`;
        case 'KZ':
        default:
          return `${formatWithMaxTwoDecimals(customPrice)} KZ`;
      }
    }
  }

  // Se não há país específico, usar formatação padrão KZ
  if (!targetCountry || targetCountry.currency === 'KZ') {
    return `${formatWithMaxTwoDecimals(priceInKZ)} KZ`;
  }

  // Converter preço para a moeda do país (fallback automático)
  let convertedPrice = priceInKZ * targetCountry.exchangeRate;
  
  // Garantir mínimo de 1 para GBP, EUR e USD
  if ((targetCountry.currency === 'GBP' || targetCountry.currency === 'EUR' || targetCountry.currency === 'USD') && convertedPrice < 1) {
    convertedPrice = 1;
  }
  
  switch (targetCountry.currency) {
    case 'EUR':
      return `€${formatWithMaxTwoDecimals(convertedPrice)}`;
    case 'GBP':
      return `£${formatWithMaxTwoDecimals(convertedPrice)}`;
    case 'USD':
      return `$${formatWithMaxTwoDecimals(convertedPrice)}`;
    case 'MZN':
      return `${formatWithMaxTwoDecimals(convertedPrice)} MZN`;
    case 'KZ':
    default:
      return `${formatWithMaxTwoDecimals(priceInKZ)} KZ`;
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
      'GBP': 1300, // 1 GBP = ~1300 KZ (aproximado)
      'MZN': 14.3  // 1 MZN = ~14.3 KZ (aproximado)
    };
    
    const rate = exchangeRates[currency.toUpperCase()] || 1;
    amountInKZ = Math.round(amount * rate);
  }
  
  return `${formatWithMaxTwoDecimals(amountInKZ)} KZ`;
};

// Função específica para admin - mostra valor completo (com taxa) em KZ
export const formatPriceForAdmin = (
  amount: number,
  currency: string = 'KZ',
  useToLocaleString: boolean = true
): string => {
  // Se não é KZ, converter para KZ
  let amountInKZ = amount;
  
  if (currency.toUpperCase() !== 'KZ') {
    const exchangeRates: Record<string, number> = {
      'EUR': 1053,
      'GBP': 1250,
      'MZN': 14.3
    };
    
    const rate = exchangeRates[currency.toUpperCase()] || 1;
    amountInKZ = Math.round(amount * rate);
  }
  
  return `${formatWithMaxTwoDecimals(amountInKZ)} KZ`;
};

// Helper para obter o texto do intervalo de assinatura
export const getSubscriptionIntervalText = (interval: string, intervalCount: number = 1): string => {
  const intervals: Record<string, { singular: string; plural: string }> = {
    'day': { singular: 'dia', plural: 'dias' },
    'week': { singular: 'semana', plural: 'semanas' },
    'month': { singular: 'mês', plural: 'meses' },
    'year': { singular: 'ano', plural: 'anos' }
  };
  
  const intervalInfo = intervals[interval] || intervals['month'];
  
  if (intervalCount === 1) {
    return intervalInfo.singular;
  }
  return `${intervalCount} ${intervalInfo.plural}`;
};

// Exportar helper para uso em outros lugares que formatam valores diretamente
export { formatWithMaxTwoDecimals };
