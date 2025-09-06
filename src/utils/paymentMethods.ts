
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
    id: "transfer",
    name: "Transferência Bancária",
    image: getPaymentMethodImage("transfer"),
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "referencia",
    name: "Pagamento por Referência",
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
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "klarna",
    name: "Klarna",
    image: getPaymentMethodImage("klarna"),
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "multibanco",
    name: "Multibanco",
    image: getPaymentMethodImage("multibanco"),
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    image: getPaymentMethodImage("apple_pay"),
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "kambapay",
    name: "KambaPay",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzI1NjNFQiIvPgo8cGF0aCBkPSJNMTIgMTJIMjhWMjhIMTJWMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgMTZIMjBWMjRIMTZWMTZaIiBmaWxsPSIjMjU2M0VCIi8+CjxwYXRoIGQ9Ik0yMCAxNkgyNFYyNEgyMFYxNloiIGZpbGw9IiMyNTYzRUIiLz4KPC9zdmc+",
    enabled: true,
    custom: true,
    countryFlag: "🇦🇴",
    countryName: "Saldo Digital"
  }
];

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
  return PAYMENT_METHODS.filter(method => method.isAngola || method.id === 'kambapay');
};

export const getMozambiquePaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isMozambique || method.id === 'kambapay');
};

export const getPortugalPaymentMethods = (): PaymentMethod[] => {
  return PAYMENT_METHODS.filter(method => method.isPortugal || method.id === 'kambapay');
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
