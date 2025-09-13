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
  // FORÇA LOGS SEMPRE
  console.log('🚨 usePaymentMethods EXECUTADO!');
  console.log('🚨 Country Code recebido:', countryCode);
  console.log('🚨 Product methods recebidos:', productPaymentMethods);
  
  const availablePaymentMethods = useMemo(() => {
    console.log('🔍 usePaymentMethods - Country:', countryCode, 'Card only countries:', CARD_ONLY_COUNTRIES);
    console.log('🔍 Product payment methods:', productPaymentMethods);
    
    // Se é um país que usa apenas cartão (Argentina, Espanha, Estados Unidos)
    if (countryCode && CARD_ONLY_COUNTRIES.includes(countryCode)) {
      console.log('✅ Forcing card-only payment methods for international country:', countryCode);
      console.log('✅ Returning CARD_PAYMENT_METHODS:', CARD_PAYMENT_METHODS);
      return CARD_PAYMENT_METHODS;
    }
    
    console.log('🔄 Using default payment methods for country:', countryCode);
    const result = productPaymentMethods || DEFAULT_PAYMENT_METHODS;
    console.log('🔄 Returning methods:', result);
    return result;
  }, [countryCode, productPaymentMethods]);

  const isCardOnlyCountry = useMemo(() => {
    const result = countryCode ? CARD_ONLY_COUNTRIES.includes(countryCode) : false;
    console.log('🎯 isCardOnlyCountry for', countryCode, ':', result);
    return result;
  }, [countryCode]);

  console.log('🎯 Final payment methods:', availablePaymentMethods);
  console.log('🎯 Is card only country:', isCardOnlyCountry);

  return {
    availablePaymentMethods,
    isCardOnlyCountry
  };
};