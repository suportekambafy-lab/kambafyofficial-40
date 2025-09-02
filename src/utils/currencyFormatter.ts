// Utilitário para formatação de moedas baseada no país
export const formatCurrencyByCountry = (amount: number, currency: string): string => {
  const numericAmount = parseFloat(amount.toString());
  
  switch (currency.toUpperCase()) {
    case 'EUR':
      return `€${numericAmount.toFixed(2)}`;
    case 'MZN':
      return `${numericAmount.toFixed(2)} MZN`;
    case 'BRL':
      return `R$${numericAmount.toFixed(2)}`;
    case 'USD':
      return `$${numericAmount.toFixed(2)}`;
    case 'GBP':
      return `£${numericAmount.toFixed(2)}`;
    case 'CVE':
      return `${numericAmount.toFixed(2)} CVE`;
    case 'STN':
      return `${numericAmount.toFixed(2)} STN`;
    case 'KZ':
    default:
      return `${numericAmount.toLocaleString('pt-BR')} KZ`;
  }
};

// Mapeamento de países para formatação de números
export const getLocaleByCountry = (countryCode: string): string => {
  const localeMap: Record<string, string> = {
    'AO': 'pt-AO', // Angola
    'PT': 'pt-PT', // Portugal
    'MZ': 'pt-MZ', // Moçambique
    'BR': 'pt-BR', // Brasil
    'ES': 'es-ES', // Espanha
    'US': 'en-US', // Estados Unidos
    'GB': 'en-GB', // Reino Unido
    'FR': 'fr-FR', // França
    'DE': 'de-DE', // Alemanha
    'IT': 'it-IT', // Itália
    'CV': 'pt-CV', // Cabo Verde
    'ST': 'pt-ST'  // São Tomé e Príncipe
  };
  
  return localeMap[countryCode] || 'pt-AO';
};