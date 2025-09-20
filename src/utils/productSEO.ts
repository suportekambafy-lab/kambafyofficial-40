import { getProductPrerenderUrl } from './checkoutPrerender';

/**
 * Utility functions for product SEO optimization
 */

export interface ProductSEOData {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  price: number | string; // Allow both number and string
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  image_alt?: string;
  fantasy_name?: string;
  tags?: string[];
}

/**
 * Gera link de produto otimizado para SEO
 */
export const generateProductSEOLink = (
  productId: string, 
  context: 'checkout' | 'product' = 'product'
): string => {
  return getProductPrerenderUrl(productId, context);
};

/**
 * Gera dados de Open Graph para produto
 */
export const generateProductOGData = (product: ProductSEOData) => {
  const title = (product.seo_title && product.seo_title.trim()) 
    ? product.seo_title 
    : `${product.name} | Kambafy`;
    
  const description = product.seo_description || 
    product.description || 
    `Conheça ${product.name} - Produto digital de qualidade disponível na Kambafy.`;
    
  let image = product.cover || 'https://kambafy.com/kambafy-social-preview.png';
  
  // Process image URL
  if (image && !image.startsWith('http')) {
    image = `https://kambafy.com${image.startsWith('/') ? '' : '/'}${image}`;
  } else if (image && image.includes('lovable-uploads/')) {
    image = `https://kambafy.com/lovable-uploads/${image.split('lovable-uploads/').pop()}`;
  }

  // Convert price to number if it's a string
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

  return {
    title,
    description,
    image,
    url: generateProductSEOLink(product.id),
    type: 'product',
    siteName: 'Kambafy',
    imageAlt: product.image_alt || product.name,
    price,
    currency: 'AOA',
    availability: 'in stock',
    brand: product.fantasy_name || 'Kambafy'
  };
};

/**
 * Gera structured data (JSON-LD) para produto
 */
export const generateProductStructuredData = (product: ProductSEOData) => {
  const ogData = generateProductOGData(product);
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": ogData.description,
    "image": ogData.image,
    "sku": product.id,
    "mpn": product.id,
    "brand": {
      "@type": "Brand",
      "name": ogData.brand
    },
    "offers": {
      "@type": "Offer",
      "url": `https://pay.kambafy.com/checkout/${product.id}`,
      "priceCurrency": ogData.currency,
      "price": ogData.price,
      "availability": "https://schema.org/InStock",
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": ogData.brand,
        "url": "https://kambafy.com"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "reviewCount": "1",
      "bestRating": "5",
      "worstRating": "1"
    },
    "url": ogData.url,
    "category": "Digital Product"
  };
};

/**
 * Copia link de produto para área de transferência com SEO otimizado
 */
export const copyProductLink = async (productId: string, context: 'checkout' | 'product' = 'product'): Promise<boolean> => {
  try {
    const link = generateProductSEOLink(productId, context);
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    console.error('Erro ao copiar link:', error);
    return false;
  }
};

/**
 * Compartilha produto via Web Share API (quando disponível)
 */
export const shareProduct = async (product: ProductSEOData): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }

  try {
    const ogData = generateProductOGData(product);
    
    await navigator.share({
      title: ogData.title,
      text: ogData.description,
      url: ogData.url
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao compartilhar:', error);
    return false;
  }
};