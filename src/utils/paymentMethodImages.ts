// Imagens reais dos métodos de pagamento
export const PAYMENT_METHOD_IMAGES = {
  // Angola - Imagens reais já existentes
  express: "/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png",
  reference: "/lovable-uploads/multicaixa-reference-logo.png", 
  transfer: "/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png",
  
  // Moçambique - Imagens reais dos métodos de pagamento
  emola: "/lovable-uploads/70243346-a1ea-47dc-8ef7-abbd4a3d66a4.png",
  epesa: "/lovable-uploads/eb1d9ab5-b83b-4c85-9028-61693547d5c0.png",
  
  // Portugal - Imagens reais dos métodos de pagamento
  card: "/lovable-uploads/3253c01d-89da-4a32-846f-4861dd03645c.png",
  klarna: "/lovable-uploads/86f49c10-3542-43ce-89aa-cbef30d98480.png",
  multibanco: "/lovable-uploads/eaa553f2-386c-434b-8096-7243db77886e.png",
  apple_pay: "/lovable-uploads/e5e382c0-0f28-4710-945f-8335ed61fdc7.png",
  mbway: "/assets/mbway-logo.png"
};

// Function to get image for payment method
export const getPaymentMethodImage = (methodId: string): string => {
  return PAYMENT_METHOD_IMAGES[methodId as keyof typeof PAYMENT_METHOD_IMAGES] || "";
};