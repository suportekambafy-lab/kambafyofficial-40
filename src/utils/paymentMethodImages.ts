// Real payment method images
export const PAYMENT_METHOD_IMAGES = {
  express: "/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png",
  reference: "/lovable-uploads/d8b7629c-9a63-44ac-a6a8-dbb0d773d76b.png", 
  transfer: "/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png",
  emola: "/lovable-uploads/3e7458ac-89de-46f2-a41b-9dffed4c1017.png",
  epesa: "/lovable-uploads/4cbb6857-ffc5-435f-8067-c6d7686af2a9.png",
  card: "/lovable-uploads/730e6c93-f015-4eb9-a5cb-a980f00fcde0.png",
  klarna: "/lovable-uploads/99792a29-387f-4e24-8d5b-bad59b4243ba.png",
  multibanco: "/lovable-uploads/41a05a3b-6287-483c-80dc-f1cc201e0bc2.png",
  apple_pay: "/lovable-uploads/76e91925-3550-46a4-9b32-a7dd908781fe.png"
};

// Function to get image for payment method
export const getPaymentMethodImage = (methodId: string): string => {
  return PAYMENT_METHOD_IMAGES[methodId as keyof typeof PAYMENT_METHOD_IMAGES] || "";
};