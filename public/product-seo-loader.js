// Detecta productId na URL e busca dados do produto imediatamente
(function() {
  // Verifica se estamos numa página de checkout
  const path = window.location.pathname;
  const checkoutMatch = path.match(/\/checkout\/([a-f0-9-]{36})/);
  
  if (checkoutMatch) {
    const productId = checkoutMatch[1];
    console.log('🔍 Detected checkout page for product:', productId);
    
    // Função para aplicar SEO imediatamente
    const applyProductSEO = (product) => {
      const title = product.seo_title || `${product.name} - Checkout | Kambafy`;
      const description = product.seo_description || (product.description || `Finalize sua compra do produto ${product.name} com segurança na Kambafy.`);
      const image = product.cover || 'https://kambafy.com/kambafy-social-preview.png';
      const url = `https://kambafy.com/checkout/${product.id}`;
      const keywords = (product.seo_keywords && product.seo_keywords.length > 0)
        ? product.seo_keywords.join(', ')
        : `${product.name}, comprar ${product.name}, checkout, pagamento seguro${product.tags && product.tags.length ? ', ' + product.tags.join(', ') : ''}`;
      const imageAlt = product.image_alt || product.name;
      
      // Atualizar title
      document.title = title;
      document.getElementById('page-title').textContent = title;
      
      // Função para atualizar meta tag existente por ID
      const updateById = (id, content) => {
        const element = document.getElementById(id);
        if (element) element.content = content;
      };
      
      // Meta tags básicas
      updateById('page-description', description);
      const keywordsTag = document.querySelector('meta[name="keywords"]');
      if (keywordsTag) keywordsTag.setAttribute('content', keywords);
      
      // Open Graph
      updateById('og-title', title);
      updateById('og-description', description);
      updateById('og-image', image);
      updateById('og-url', url);
      
      // Ensure OG/Twitter image alt tags
      const setMetaProp = (property, value) => {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('property', property);
          document.head.appendChild(el);
        }
        el.setAttribute('content', value);
      };
      setMetaProp('og:image:alt', imageAlt);
      
      // Twitter
      updateById('twitter-title', title);
      updateById('twitter-description', description);
      updateById('twitter-image', image);
      updateById('twitter-url', url);
      setMetaProp('twitter:image:alt', imageAlt);
      
      // Canonical
      document.getElementById('canonical-url').href = url;
      
      // Structured Data
      const structuredDataElement = document.getElementById('structured-data');
      if (structuredDataElement) {
        structuredDataElement.textContent = JSON.stringify({
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
      }
      
      console.log('✅ SEO aplicado para produto:', product.name);
    };
    
    // Buscar dados do produto via Supabase
    const loadProductSEO = async () => {
      try {
        // Usar endpoint público para buscar dados do produto
        const response = await fetch(`https://hcbkqygdtzpxvctfdqbd.supabase.co/rest/v1/products?id=eq.${productId}&select=id,name,description,cover,fantasy_name,price,seo_title,seo_description,seo_keywords,tags,slug,image_alt`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A'
          }
        });
        
        const products = await response.json();
        if (products && products.length > 0) {
          applyProductSEO(products[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do produto para SEO:', error);
      }
    };
    
    // Executar imediatamente
    loadProductSEO();
  }
})();