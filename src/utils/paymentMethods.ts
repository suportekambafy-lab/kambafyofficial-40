
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
    image: "/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png",
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "reference",
    name: "Pagamento por referência",
    image: "/lovable-uploads/d8b7629c-9a63-44ac-a6a8-dbb0d773d76b.png",
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "transfer",
    name: "Transferência Bancária",
    image: "/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png",
    enabled: true,
    isAngola: true,
    countryFlag: "🇦🇴",
    countryName: "Angola"
  },
  {
    id: "emola",
    name: "e-Mola",
    image: "/lovable-uploads/41a05a3b-6287-483c-80dc-f1cc201e0bc2.png",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "epesa",
    name: "e-Pesa",
    image: "/lovable-uploads/9bef56a0-daf2-4e01-9a96-08d52cd17a67.png",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "card",
    name: "Pagamento com cartão",
    image: "/lovable-uploads/a84f5ef0-06c2-4e7f-b819-d484191f7d25.png",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "klarna",
    name: "Klarna",
    image: "/lovable-uploads/2635a306-a6ac-496f-8b84-f7a9ab0ee7eb.png",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "multibanco",
    name: "Multibanco",
    image: "/lovable-uploads/a3fbcc16-131c-48e4-8983-756aaa584af6.png",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    image: "/lovable-uploads/d6c21712-0212-4bb9-8cc1-3de35e106b9d.png",
    enabled: false,
    isPortugal: true,
    countryFlag: "🇵🇹",
    countryName: "Portugal"
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
