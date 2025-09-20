// Utilitário para montar URLs de prerender (Edge Functions)
// Mantemos aqui para não tocar no arquivo autogerado do Supabase client

export const CHECKOUT_PRERENDER_BASE = "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/checkout-prerender";
export const PRODUCT_PRERENDER_BASE = "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/product-prerender";

// Função para detectar se uma URL é de produto e gerar o prerender correto
export const getProductPrerenderUrl = (productId: string, context: 'checkout' | 'product' = 'product'): string => {
  if (context === 'checkout') {
    return `${CHECKOUT_PRERENDER_BASE}/${productId}`;
  }
  return `${PRODUCT_PRERENDER_BASE}/${productId}`;
};
