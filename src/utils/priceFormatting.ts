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

// Função específica para vendedores - sempre mostra em KZ original
export const formatPriceForSeller = (
  originalAmountKZ: number,
  useToLocaleString: boolean = true
): string => {
  if (useToLocaleString) {
    return `${parseFloat(originalAmountKZ.toString()).toLocaleString('pt-BR')} KZ`;
  }
  return `${originalAmountKZ.toLocaleString()} KZ`;
};