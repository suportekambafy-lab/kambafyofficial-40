// Imagens reais dos métodos de pagamento
export const PAYMENT_METHOD_IMAGES = {
  // Angola - Imagens reais já existentes
  express: "/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png",
  reference: "/lovable-uploads/d8b7629c-9a63-44ac-a6a8-dbb0d773d76b.png", 
  transfer: "/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png",
  
  // Moçambique - Imagens reais dos métodos de pagamento
  emola: "/payment-logos/emola-logo.png",
  epesa: "/payment-logos/epesa-logo.png",
  
  // Portugal - Imagens reais dos métodos de pagamento
  card: "/payment-logos/card-logo.png",
  klarna: "/payment-logos/klarna-logo.svg",
  multibanco: "/payment-logos/multibanco-logo.png",
  apple_pay: "/payment-logos/apple-pay-logo.png"
};

// Function to get image for payment method
export const getPaymentMethodImage = (methodId: string): string => {
  return PAYMENT_METHOD_IMAGES[methodId as keyof typeof PAYMENT_METHOD_IMAGES] || "";
};