
import { getPaymentMethodImage } from './paymentMethodImages';

export interface PaymentMethod {
  id: string;
  name: string;
  image?: string;
  enabled: boolean;
  custom?: boolean;
  isAngola?: boolean;
  isMozambique?: boolean;
  isPortugal?: boolean;
  countryFlag?: string;
  countryName?: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "express",
    name: "Multicaixa Express",
    image: getPaymentMethodImage("express"),
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "reference",
    name: "Pagamento por Referência",
    image: getPaymentMethodImage("reference"),
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "transfer",
    name: "Transferência Bancária",
    image: getPaymentMethodImage("transfer"),
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "emola",
    name: "e-Mola",
    image: getPaymentMethodImage("emola"),
    enabled: false, // ❌ Desabilitado até configuração
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "epesa",
    name: "e-Pesa",
    image: getPaymentMethodImage("epesa"),
    enabled: false, // ❌ Desabilitado até configuração
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "card",
    name: "Pagamento com cartão",
    image: getPaymentMethodImage("card"),
    enabled: true,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "klarna",
    name: "Klarna",
    image: getPaymentMethodImage("klarna"),
    enabled: true,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "multibanco",
    name: "Multibanco",
    image: getPaymentMethodImage("multibanco"),
    enabled: true,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    image: getPaymentMethodImage("apple_pay"),
    enabled: false, // ❌ Desabilitado até configuração
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  }
];

// Mapear método de pagamento para país
export const getCountryByPaymentMethod = (paymentMethod: string) => {
  const paymentToCountry: Record<string, { code: string; name: string; flag: string }> = {
    // Angola
    'express': { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    'reference': { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    'transfer': { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    
    // Portugal  
    'card': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'stripe': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'paypal': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'multibanco': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'klarna': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'apple_pay': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    
    // Moçambique
    'mpesa': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    'emola': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    'epesa': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
  };
  
  return paymentToCountry[paymentMethod] || { code: 'AO', name: 'Angola', flag: '🇦🇴' };
};

export const getPaymentMethodName = (method: string): string => {
  const paymentMethod = PAYMENT_METHODS.find(pm => pm.id === method);
  return paymentMethod?.name || method || 'N/A';
};

export const getAllPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS;
};

export const getEnabledPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.enabled);
};

export const getAngolaPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isAngola);
};

export const getMozambiquePaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isMozambique);
};

export const getPortugalPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isPortugal);
};

export const getPaymentMethodsByCountry = (countryCode: string): PaymentMethod[] => {
  switch (countryCode) {
    case 'AO':
      return getAngolaPaymentMethods();
    case 'MZ':
      return getMozambiquePaymentMethods();
    case 'PT':
      return getPortugalPaymentMethods();
    default:
      return [];
  }
};
