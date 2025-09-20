// Sistema de URLs de produto para Kambafy
// URLs amigáveis que fazem SEO inteligente baseado no user agent

export const CHECKOUT_PRERENDER_BASE = "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/checkout-prerender";
export const PRODUCT_PRERENDER_BASE = "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/product-prerender";

// Gerar URLs simples e amigáveis do próprio domínio Kambafy
export const getProductShareUrl = (productId: string): string => {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  const baseUrl = isLocal ? 'http://localhost:3000' : 'https://kambafy.com';
  return `${baseUrl}/p/${productId}`;
};

// Gerar URL de checkout direto
export const getCheckoutUrl = (productId: string): string => {
  const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  const baseUrl = isLocal ? 'http://localhost:3000' : 'https://pay.kambafy.com';
  return `${baseUrl}/checkout/${productId}`;
};

// Legacy - manter para compatibilidade (mas não usar mais)
export const getProductPrerenderUrl = (productId: string, context: 'checkout' | 'product' = 'product'): string => {
  if (context === 'checkout') {
    return `${CHECKOUT_PRERENDER_BASE}/${productId}`;
  }
  return `${PRODUCT_PRERENDER_BASE}/${productId}`;
};
