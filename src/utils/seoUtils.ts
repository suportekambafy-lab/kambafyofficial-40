import { getProductImageUrl } from './imageUtils';

// Utility para definir meta tags dinamicamente no head
export const setMetaTag = (name: string, content: string) => {
  // Remove existing tag
  const existing = document.querySelector(`meta[name="${name}"]`);
  if (existing) {
    existing.remove();
  }
  
  // Create new tag
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
};

export const setMetaProperty = (property: string, content: string) => {
  // Remove existing tag
  const existing = document.querySelector(`meta[property="${property}"]`);
  if (existing) {
    existing.remove();
  }
  
  // Create new tag
  const meta = document.createElement('meta');
  meta.setAttribute('property', property);
  meta.content = content;
  document.head.appendChild(meta);
};

export const setPageTitle = (title: string) => {
  document.title = title;
};

export const setCanonicalUrl = (url: string) => {
  // Remove existing canonical
  const existing = document.querySelector('link[rel="canonical"]');
  if (existing) {
    existing.remove();
  }
  
  // Create new canonical
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = url;
  document.head.appendChild(link);
};

export const setStructuredData = (data: any) => {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }
  
  // Create new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

// Set product SEO immediately when product loads
export const setProductSEO = (product: any) => {
  const title = product.seo_title || `${product.name} - Checkout | Kambafy`;
  const description = product.seo_description || (product.description || `Finalize sua compra do produto ${product.name} com segurança na Kambafy.`);
  const image = product.cover ? getProductImageUrl(product.cover, 'https://kambafy.com/kambafy-social-preview.png') : 'https://kambafy.com/kambafy-social-preview.png';
  const url = `https://kambafy.com/checkout/${product.id}`;
  const keywords = (product.seo_keywords && product.seo_keywords.length > 0)
    ? product.seo_keywords.join(', ')
    : `${product.name}, comprar ${product.name}, checkout, pagamento seguro${product.tags?.length ? ', ' + product.tags.join(', ') : ''}`;
  
  // Set all meta tags imediatamente
  setPageTitle(title);
  setMetaTag('description', description);
  setMetaTag('keywords', keywords);
  
  // Open Graph
  setMetaProperty('og:title', title);
  setMetaProperty('og:description', description);
  setMetaProperty('og:image', image);
  setMetaProperty('og:image:alt', product.image_alt || product.name);
  setMetaProperty('og:url', url);
  setMetaProperty('og:type', 'product');
  setMetaProperty('og:site_name', 'Kambafy');
  
  // Twitter
  setMetaProperty('twitter:card', 'summary_large_image');
  setMetaProperty('twitter:title', title);
  setMetaProperty('twitter:description', description);
  setMetaProperty('twitter:image', image);
  setMetaProperty('twitter:image:alt', product.image_alt || product.name);
  
  // Canonical
  setCanonicalUrl(url);
  
  // Structured Data
  setStructuredData({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": description,
    "image": image,
    "brand": {
      "@type": "Brand",
      "name": product.fantasy_name || "Kambafy"
    },
    "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "AOA",
      "price": product.price,
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": product.fantasy_name || "Kambafy"
      }
    }
  });
  
  console.log('🎯 Product SEO set:', { title, description, image });
};