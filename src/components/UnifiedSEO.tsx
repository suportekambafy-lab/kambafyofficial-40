import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface UnifiedSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonical?: string;
  noIndex?: boolean;
  type?: 'website' | 'product' | 'article';
  structuredData?: object | object[];
  price?: string;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

const defaultMeta = {
  title: 'Kambafy - Transforme seu conhecimento em renda',
  description: 'Crie, venda e gerencie seus produtos digitais com checkout otimizado, analytics avançados e integração completa com pagamentos. Comece grátis hoje!',
  keywords: 'vendas digitais, e-commerce, produtos digitais, checkout, pagamentos online, plataforma de vendas, infoprodutos, cursos online',
  image: 'https://kambafy.com/lovable-uploads/d8006597-4c28-4313-b50d-96a944e49040.png'
};

export const UnifiedSEO = ({
  title,
  description,
  keywords,
  image,
  canonical,
  noIndex = false,
  type = 'website',
  structuredData,
  price,
  currency,
  availability
}: UnifiedSEOProps) => {
  const location = useLocation();
  
  const fullTitle = title ? `${title} | Kambafy` : defaultMeta.title;
  const metaDescription = description || defaultMeta.description;
  const metaKeywords = keywords || defaultMeta.keywords;
  const metaImage = image || defaultMeta.image;
  const canonicalUrl = canonical || `https://kambafy.com${location.pathname}`;
  
  // Build structured data array
  const structuredDataArray: object[] = [];
  
  // Add organization schema
  structuredDataArray.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Kambafy",
    "url": "https://kambafy.com",
    "logo": "https://kambafy.com/lovable-uploads/d8006597-4c28-4313-b50d-96a944e49040.png",
    "sameAs": [
      "https://twitter.com/kambafy",
      "https://facebook.com/kambafy"
    ]
  });
  
  // Add website schema
  structuredDataArray.push({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Kambafy",
    "url": "https://kambafy.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://kambafy.com/marketplace?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });
  
  // Add custom structured data
  if (structuredData) {
    if (Array.isArray(structuredData)) {
      structuredDataArray.push(...structuredData);
    } else {
      structuredDataArray.push(structuredData);
    }
  }
  
  // Add product schema if price is provided
  if (price && type === 'product') {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": title,
      "description": metaDescription,
      "image": metaImage,
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": currency || "AOA",
        "availability": `https://schema.org/${availability || 'InStock'}`,
        "url": canonicalUrl
      }
    });
  }

  return (
    <Helmet prioritizeSeoTags>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content="Kambafy" />
      <meta property="og:locale" content="pt_AO" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:site" content="@kambafy" />
      
      {/* Structured Data */}
      {structuredDataArray.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default UnifiedSEO;
