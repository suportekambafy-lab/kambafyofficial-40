
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
  isUK?: boolean;
  isUS?: boolean;
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
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "epesa",
    name: "e-Pesa",
    image: getPaymentMethodImage("epesa"),
    enabled: true,
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
    id: "mbway",
    name: "MB Way",
    image: getPaymentMethodImage("mbway"),
    enabled: true,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "card_uk",
    name: "Card Payment",
    image: getPaymentMethodImage("card_uk"),
    enabled: true,
    isUK: true,
    countryFlag: "🇬🇧",
    countryName: "United Kingdom"
  },
  {
    id: "klarna_uk",
    name: "Klarna",
    image: getPaymentMethodImage("klarna_uk"),
    enabled: true,
    isUK: true,
    countryFlag: "🇬🇧",
    countryName: "United Kingdom"
  },
  {
    id: "card_us",
    name: "Card Payment",
    image: getPaymentMethodImage("card_us"),
    enabled: true,
    isUS: true,
    countryFlag: "🇺🇸",
    countryName: "United States"
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
    'multibanco': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'klarna': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'mbway': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    
    // Moçambique
    'emola': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    'epesa': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    
    // Reino Unido
    'card_uk': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    'klarna_uk': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    
    // Estados Unidos
    'card_us': { code: 'US', name: 'United States', flag: '🇺🇸' },
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

export const getUKPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isUK);
};

export const getUSPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isUS);
};

export const getPaymentMethodsByCountry = (countryCode: string): PaymentMethod[] => {
  switch (countryCode) {
    case 'AO':
      return getAngolaPaymentMethods();
    case 'MZ':
      return getMozambiquePaymentMethods();
    case 'PT':
      return getPortugalPaymentMethods();
    case 'GB':
      return getUKPaymentMethods();
    case 'US':
      return getUSPaymentMethods();
    default:
      return [];
  }
};
