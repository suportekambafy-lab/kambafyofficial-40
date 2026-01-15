// Utility function for consistent price formatting across the app

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

// Helper para formatar número - só mostra decimais se necessário
// Formato PT/AO (padrão): ponto para milhares, vírgula para decimais (1.234,56)
const formatWithMaxTwoDecimals = (value: number): string => {
  // Arredonda para 2 casas decimais
  const rounded = Math.round(value * 100) / 100;
  
  // Verifica se tem decimais significativos
  const hasDecimals = rounded % 1 !== 0;
  
  if (hasDecimals) {
    // Formata com 2 casas decimais
    const [intPart, decPart] = rounded.toFixed(2).split('.');
    // Adiciona pontos como separadores de milhares
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  } else {
    // Sem decimais - só formata a parte inteira
    const intValue = Math.round(rounded);
    return intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
};

// Helper para formatar número em formato internacional
// Formato EN/INT: vírgula para milhares, ponto para decimais (1,234.56)
const formatInternational = (value: number): string => {
  // Arredonda para 2 casas decimais
  const rounded = Math.round(value * 100) / 100;
  
  // Verifica se tem decimais significativos
  const hasDecimals = rounded % 1 !== 0;
  
  if (hasDecimals) {
    // Formata com 2 casas decimais
    const [intPart, decPart] = rounded.toFixed(2).split('.');
    // Adiciona vírgulas como separadores de milhares
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInt}.${decPart}`;
  } else {
    // Sem decimais - só formata a parte inteira
    const intValue = Math.round(rounded);
    return intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
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
          return `€${formatInternational(customPrice)}`;
        case 'GBP':
          return `£${formatInternational(customPrice)}`;
        case 'USD':
          return `$${formatInternational(customPrice)}`;
        case 'MXN':
          return `$${customPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
        case 'CLP':
          return `$${Math.round(customPrice).toLocaleString('es-CL')} CLP`;
        case 'MZN':
          return `${formatWithMaxTwoDecimals(customPrice)} MT`;
        case 'ARS':
          const hasDecimalsCustom = customPrice % 1 !== 0;
          return hasDecimalsCustom 
            ? `$${customPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
            : `$${Math.round(customPrice).toLocaleString('es-AR')} ARS`;
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
      return `€${formatInternational(convertedPrice)}`;
    case 'GBP':
      return `£${formatInternational(convertedPrice)}`;
    case 'USD':
      return `$${formatInternational(convertedPrice)}`;
    case 'MXN':
      return `$${convertedPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    case 'CLP':
      return `$${Math.round(convertedPrice).toLocaleString('es-CL')} CLP`;
    case 'MZN':
      return `${formatWithMaxTwoDecimals(convertedPrice)} MT`;
    case 'ARS':
      const hasDecimalsConverted = convertedPrice % 1 !== 0;
      return hasDecimalsConverted 
        ? `$${convertedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
        : `$${Math.round(convertedPrice).toLocaleString('es-AR')} ARS`;
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

// Função específica para vendedores - formata no currency informado (SEM conversão)
export const formatPriceForSeller = (
  amount: number,
  currency: string = 'KZ',
  useToLocaleString: boolean = true
): string => {
  const normalizedCurrency = (currency || 'KZ') === 'AOA' ? 'KZ' : (currency || 'KZ');
  const code = normalizedCurrency.toUpperCase();

  // Moedas internacionais usam formato internacional (ponto decimal)
  // Moedas PT/AO usam formato local (vírgula decimal)
  switch (code) {
    case 'EUR':
      return `€${formatInternational(amount)}`;
    case 'GBP':
      return `£${formatInternational(amount)}`;
    case 'USD':
      return `$${formatInternational(amount)}`;
    case 'BRL':
      return `R$${formatWithMaxTwoDecimals(amount)}`;
    case 'MZN':
      return `${formatWithMaxTwoDecimals(amount)} MT`;
    case 'KZ':
      return `${formatWithMaxTwoDecimals(amount)} KZ`;
    default:
      return `${formatWithMaxTwoDecimals(amount)} ${code}`;
  }
};

// Função específica para admin - formata no currency informado (SEM conversão)
export const formatPriceForAdmin = (
  amount: number,
  currency: string = 'KZ',
  useToLocaleString: boolean = true
): string => {
  return formatPriceForSeller(amount, currency, useToLocaleString);
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

// Exportar helpers para uso em outros lugares que formatam valores diretamente
export { formatWithMaxTwoDecimals, formatInternational };
