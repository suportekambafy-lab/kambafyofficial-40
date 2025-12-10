
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

// Obter bandeira do país pelo código ISO ou nome
export const getCountryFlag = (countryCode: string | null | undefined): { code: string; name: string; flag: string } => {
  if (!countryCode) return { code: 'AO', name: 'Angola', flag: '🇦🇴' };
  
  const countryMap: Record<string, { code: string; name: string; flag: string }> = {
    'AO': { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    'Angola': { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    'PT': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'Portugal': { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    'MZ': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    'Moçambique': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    'Mozambique': { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    'BR': { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    'Brasil': { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    'Brazil': { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    'GB': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    'UK': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    'United Kingdom': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    'US': { code: 'US', name: 'United States', flag: '🇺🇸' },
    'USA': { code: 'US', name: 'United States', flag: '🇺🇸' },
    'United States': { code: 'US', name: 'United States', flag: '🇺🇸' },
    'ES': { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
    'Spain': { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
    'Espanha': { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
    'FR': { code: 'FR', name: 'França', flag: '🇫🇷' },
    'France': { code: 'FR', name: 'França', flag: '🇫🇷' },
    'França': { code: 'FR', name: 'França', flag: '🇫🇷' },
    'DE': { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
    'Germany': { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
    'Alemanha': { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
    'IT': { code: 'IT', name: 'Itália', flag: '🇮🇹' },
    'Italy': { code: 'IT', name: 'Itália', flag: '🇮🇹' },
    'Itália': { code: 'IT', name: 'Itália', flag: '🇮🇹' },
    'NL': { code: 'NL', name: 'Holanda', flag: '🇳🇱' },
    'Netherlands': { code: 'NL', name: 'Holanda', flag: '🇳🇱' },
    'Holanda': { code: 'NL', name: 'Holanda', flag: '🇳🇱' },
    'ZA': { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
    'South Africa': { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
    'África do Sul': { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
    'CV': { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
    'Cabo Verde': { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
    'Cape Verde': { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  };
  
  return countryMap[countryCode] || { code: countryCode, name: countryCode, flag: '🌍' };
};
