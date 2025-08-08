import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
  structuredData?: object;
}

const defaultMeta = {
  title: 'Kambafy - TRANSFORME SEU CONHECIMENTO EM RENDA',
  description: 'Kambafy é a plataforma completa para criar, vender e gerenciar produtos digitais. Checkout otimizado, analytics avançados, integração com pagamentos e muito mais.',
  keywords: 'vendas digitais, e-commerce, produtos digitais, checkout, pagamentos online, plataforma de vendas, infoprodutos, cursos online',
  ogImage: 'https://kambafy.com/lovable-uploads/d8006597-4c28-4313-b50d-96a944e49040.png'
};

export const SEO = ({
  title,
  description,
  keywords,
  ogImage,
  canonical,
  noIndex = false,
  structuredData
}: SEOProps) => {
  const location = useLocation();
  
  useEffect(() => {
    // Update document title immediately
    const fullTitle = title ? `${title} | Kambafy` : defaultMeta.title;
    document.title = fullTitle;
    
    // Ensure meta tags are created immediately, even if they don't exist
    const metaDescription = description || defaultMeta.description;
    const metaKeywords = keywords || defaultMeta.keywords;
    const metaImage = ogImage || defaultMeta.ogImage;
    
    // Update meta tags with immediate DOM manipulation
    updateMetaTag('description', metaDescription);
    updateMetaTag('keywords', metaKeywords);
    updateMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Update Open Graph tags immediately
    updateMetaProperty('og:title', fullTitle);
    updateMetaProperty('og:description', metaDescription);
    updateMetaProperty('og:image', metaImage);
    updateMetaProperty('og:url', `https://kambafy.com${location.pathname}`);
    updateMetaProperty('og:type', 'product');
    updateMetaProperty('og:site_name', 'Kambafy');
    
    // Update Twitter tags immediately
    updateMetaProperty('twitter:card', 'summary_large_image');
    updateMetaProperty('twitter:title', fullTitle);
    updateMetaProperty('twitter:description', metaDescription);
    updateMetaProperty('twitter:image', metaImage);
    updateMetaProperty('twitter:site', '@kambafy');
    
    // Update canonical URL
    updateCanonical(canonical || `https://kambafy.com${location.pathname}`);
    
    // Add structured data with priority
    if (structuredData) {
      addStructuredData(structuredData);
    }
    
    // Force a small delay to ensure crawlers catch the changes
    setTimeout(() => {
      console.log('🎯 SEO meta tags updated:', {
        title: fullTitle,
        description: metaDescription,
        image: metaImage
      });
    }, 100);
    
  }, [title, description, keywords, ogImage, canonical, noIndex, structuredData, location.pathname]);

  return null;
};

const updateMetaTag = (name: string, content: string) => {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
};

const updateMetaProperty = (property: string, content: string) => {
  let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.content = content;
};

const updateCanonical = (href: string) => {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
};

const addStructuredData = (data: object) => {
  // Remove existing structured data
  const existing = document.querySelector('script[data-seo="structured-data"]');
  if (existing) {
    existing.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'structured-data');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'Kambafy - TRANSFORME SEU CONHECIMENTO EM RENDA',
    description: 'Crie, venda e gerencie seus produtos digitais com checkout otimizado, analytics avançados e integração completa com pagamentos. Comece grátis hoje!',
    keywords: 'kambafy, vendas digitais, e-commerce, produtos digitais, checkout, pagamentos online, plataforma de vendas',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Kambafy",
      "description": "Plataforma completa para criar, vender e gerenciar produtos digitais",
      "url": "https://kambafy.com",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web"
    }
  },
  
  features: {
    title: 'Funcionalidades da Kambafy - Checkout, Analytics e Integração',
    description: 'Descubra todas as funcionalidades da Kambafy: checkout otimizado, analytics em tempo real, integração com pagamentos, gestão de produtos digitais e muito mais.',
    keywords: 'funcionalidades kambafy, checkout otimizado, analytics, integração pagamentos, gestão produtos digitais'
  },
  
  pricing: {
    title: 'Preços e Planos da Kambafy - Comece Grátis',
    description: 'Conheça os planos da Kambafy. Comece grátis e escale conforme seu crescimento. Sem taxas ocultas, apenas resultados.',
    keywords: 'preços kambafy, planos kambafy, grátis, pricing, custos plataforma vendas'
  },
  
  howItWorks: {
    title: 'Como Funciona a Kambafy - Guia Completo',
    description: 'Aprenda como usar a Kambafy em 3 passos simples: crie seus produtos, configure seu checkout e comece a vender online hoje mesmo.',
    keywords: 'como funciona kambafy, tutorial kambafy, guia vendas digitais, passo a passo'
  },
  
  contact: {
    title: 'Contato - Fale Conosco | Kambafy',
    description: 'Entre em contato com a equipe Kambafy. Estamos aqui para ajudar você a maximizar suas vendas digitais.',
    keywords: 'contato kambafy, suporte kambafy, ajuda vendas digitais'
  },
  
  helpCenter: {
    title: 'Central de Ajuda - Suporte Kambafy',
    description: 'Encontre respostas para suas dúvidas na Central de Ajuda da Kambafy. Tutoriais, guias e suporte completo.',
    keywords: 'ajuda kambafy, suporte kambafy, faq, tutoriais, central ajuda'
  },
  
  privacy: {
    title: 'Política de Privacidade - Kambafy',
    description: 'Leia nossa política de privacidade e saiba como protegemos seus dados na plataforma Kambafy.',
    keywords: 'política privacidade kambafy, proteção dados, privacidade',
    noIndex: false
  },
  
  terms: {
    title: 'Termos de Uso - Kambafy',
    description: 'Conheça os termos de uso da plataforma Kambafy. Condições de uso, direitos e responsabilidades.',
    keywords: 'termos uso kambafy, condições uso, termos serviço',
    noIndex: false
  }
};

export default SEO;