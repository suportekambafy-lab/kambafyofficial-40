import { useMemo } from 'react';

// Países que devem usar apenas pagamento por cartão (Stripe)
const CARD_ONLY_COUNTRIES = ['AR', 'ES', 'US'];

// Métodos de pagamento por cartão para países específicos
const CARD_PAYMENT_METHODS = [
  {
    id: 'card_international',
    name: 'Cartão Internacional (Stripe)',
    image: '/payment-logos/card-logo.png',
    enabled: true
  }
];

// Métodos de pagamento padrão (Angola, Portugal, Moçambique)
const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'express',
    name: 'Multicaixa Express',
    image: '/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png',
    enabled: true
  },
  {
    id: 'reference',
    name: 'Pagamento por referência',
    image: '/lovable-uploads/d8b7629c-9a63-44ac-a6a8-dbb0d773d76b.png',
    enabled: true
  },
  {
    id: 'transfer',
    name: 'Transferência Bancária',
    image: '/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png',
    enabled: true
  }
];

export const usePaymentMethods = (countryCode?: string, productPaymentMethods?: any[]) => {
  const availablePaymentMethods = useMemo(() => {
    console.log('🔍 usePaymentMethods - Country:', countryCode, 'Card only countries:', CARD_ONLY_COUNTRIES);
    
    // Se é um país que usa apenas cartão (Argentina, Espanha, Estados Unidos)
    if (countryCode && CARD_ONLY_COUNTRIES.includes(countryCode)) {
      console.log('✅ Using card-only payment methods for country:', countryCode);
      return CARD_PAYMENT_METHODS;
    }
    
    // Verificar se o produto tem métodos configurados
    if (productPaymentMethods && productPaymentMethods.length > 0) {
      // Filtrar apenas métodos habilitados
      const enabledMethods = productPaymentMethods.filter((method: any) => method.enabled);
      
      // Se tem cartão internacional habilitado e é país internacional
      if (countryCode && ['AR', 'ES', 'US'].includes(countryCode)) {
        const internationalCard = enabledMethods.find(m => m.id === 'card_international');
        if (internationalCard) {
          return [internationalCard];
        }
        // Fallback para cartão internacional se não configurado
        return CARD_PAYMENT_METHODS;
      }
      
      return enabledMethods;
    }
    
    // Usar métodos de pagamento do produto ou padrão
    console.log('🔄 Using default payment methods for country:', countryCode);
    return DEFAULT_PAYMENT_METHODS;
  }, [countryCode, productPaymentMethods]);

  const isCardOnlyCountry = useMemo(() => {
    const result = countryCode ? CARD_ONLY_COUNTRIES.includes(countryCode) : false;
    console.log('🎯 isCardOnlyCountry for', countryCode, ':', result);
    return result;
  }, [countryCode]);

  return {
    availablePaymentMethods,
    isCardOnlyCountry
  };
};