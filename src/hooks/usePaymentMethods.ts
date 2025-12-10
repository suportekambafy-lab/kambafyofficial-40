import { useMemo } from 'react';

// Países que devem usar apenas pagamento por cartão (Stripe) - removido
const CARD_ONLY_COUNTRIES: string[] = [];

// Métodos de pagamento por cartão para países específicos
const CARD_PAYMENT_METHODS: never[] = [];

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
  console.log('🚨🚨🚨 usePaymentMethods HOOK EXECUTADO!');
  console.log('🚨🚨🚨 País recebido:', countryCode);
  console.log('🚨🚨🚨 Product methods:', productPaymentMethods);
  console.log('🚨🚨🚨 CARD_ONLY_COUNTRIES:', CARD_ONLY_COUNTRIES);
  console.log('🚨🚨🚨 É país cartão?', countryCode && CARD_ONLY_COUNTRIES.includes(countryCode));
  
  const availablePaymentMethods = useMemo(() => {
    console.log('🔍🔍🔍 useMemo executando - Country:', countryCode);
    console.log('🔍🔍🔍 Is card only country?', countryCode && CARD_ONLY_COUNTRIES.includes(countryCode));
    
    // Se é um país que usa apenas cartão
    if (countryCode && CARD_ONLY_COUNTRIES.includes(countryCode)) {
      console.log('✅✅✅ FORÇANDO CARTÃO PARA PAÍS:', countryCode);
      console.log('✅✅✅ MÉTODOS RETORNADOS:', CARD_PAYMENT_METHODS);
      return CARD_PAYMENT_METHODS;
    }
    
    // Definir ordem dos métodos por país
    const paymentOrder: Record<string, string[]> = {
      'AO': ['express', 'reference', 'transfer'],
      'MZ': ['emola', 'mpesa'],
      'PT': ['card', 'mbway', 'multibanco', 'klarna']
    };
    
    // Países padrão (Angola, Portugal, Moçambique, etc.)
    let result = productPaymentMethods?.length ? productPaymentMethods : DEFAULT_PAYMENT_METHODS;
    
    // Ordenar métodos de acordo com a ordem definida para o país
    if (countryCode && paymentOrder[countryCode]) {
      const order = paymentOrder[countryCode];
      result = [...result].sort((a: any, b: any) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        // Se não está na lista de ordem, coloca no final
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    
    console.log('🔄🔄🔄 MÉTODOS PADRÃO PARA:', countryCode, result);
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