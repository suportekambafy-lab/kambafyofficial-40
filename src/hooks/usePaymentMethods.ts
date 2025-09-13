import { useMemo } from 'react';

// Países que devem usar apenas pagamento por cartão
const CARD_ONLY_COUNTRIES = ['AR', 'ES', 'US'];

// Métodos de pagamento por cartão para países específicos
const CARD_PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Cartão de Crédito/Débito',
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
    // Se é um país que usa apenas cartão
    if (countryCode && CARD_ONLY_COUNTRIES.includes(countryCode)) {
      return CARD_PAYMENT_METHODS;
    }
    
    // Usar métodos de pagamento do produto ou padrão
    return productPaymentMethods || DEFAULT_PAYMENT_METHODS;
  }, [countryCode, productPaymentMethods]);

  const isCardOnlyCountry = useMemo(() => {
    return countryCode ? CARD_ONLY_COUNTRIES.includes(countryCode) : false;
  }, [countryCode]);

  return {
    availablePaymentMethods,
    isCardOnlyCountry
  };
};