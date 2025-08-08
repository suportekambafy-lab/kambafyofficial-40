
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
  useIcon?: boolean; // Flag para usar ícone SVG em vez de imagem
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "express",
    name: "Multicaixa Express",
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola",
    useIcon: true
  },
  {
    id: "reference",
    name: "Pagamento por referência",
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola",
    useIcon: true
  },
  {
    id: "transfer",
    name: "Transferência Bancária",
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola",
    useIcon: true
  },
  {
    id: "emola",
    name: "e-Mola",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique",
    useIcon: true
  },
  {
    id: "epesa",
    name: "e-Pesa",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique",
    useIcon: true
  },
  {
    id: "card",
    name: "Pagamento com cartão",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal",
    useIcon: true
  },
  {
    id: "klarna",
    name: "Klarna",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal",
    useIcon: true
  },
  {
    id: "multibanco",
    name: "Multibanco",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal",
    useIcon: true
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal",
    useIcon: true
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
