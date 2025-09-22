// Constantes para métodos de pagamento
export const PAYMENT_METHOD_IMAGES = {
  express: "/lovable-uploads/multicaixa-express-logo.svg",
  reference: "svg-component",
  transfer: "svg-component",
  emola: "svg-component", 
  epesa: "svg-component",
  card: "svg-component",
  klarna: "svg-component",
  multibanco: "svg-component",
  apple_pay: "svg-component"
};

// Function to get image for payment method
export const getPaymentMethodImage = (methodId: string): string => {
  return PAYMENT_METHOD_IMAGES[methodId as keyof typeof PAYMENT_METHOD_IMAGES] || "";
};