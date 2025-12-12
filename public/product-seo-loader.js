// Detecta productId na URL e busca dados do produto imediatamente
(function() {
  // Verifica se estamos numa página de checkout
  const path = window.location.pathname;
  const checkoutMatch = path.match(/\/checkout\/([a-f0-9-]{36}|[a-zA-Z0-9_-]+)/);
  
  if (checkoutMatch) {
    const productId = checkoutMatch[1];
    console.log('🔍 [SEO LOADER] Detected checkout page for product:', productId);
    
    // Função para aplicar SEO imediatamente
    const applyProductSEO = (product) => {
      const title = (product.seo_title && product.seo_title.trim()) 
        ? product.seo_title 
        : `${product.name} | Kambafy`;
        
      const description = product.seo_description || (product.description || `Finalize sua compra do produto ${product.name} com segurança na Kambafy.`);
      const image = product.cover || 'https://kambafy.com/kambafy-social-preview.png';
      const url = `https://kambafy.com/checkout/${product.id}`;
      const keywords = (product.seo_keywords && product.seo_keywords.length > 0)
        ? product.seo_keywords.join(', ')
        : `${product.name}, comprar ${product.name}, checkout, pagamento seguro${product.tags && product.tags.length ? ', ' + product.tags.join(', ') : ''}`;
      const imageAlt = product.image_alt || product.name;
      
      // Atualizar title
      document.title = title;
      const pageTitleEl = document.getElementById('page-title');
      if (pageTitleEl) pageTitleEl.textContent = title;
      
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
      const canonicalEl = document.getElementById('canonical-url');
      if (canonicalEl) canonicalEl.href = url;
      
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
      
      console.log('✅ [SEO LOADER] SEO aplicado para produto:', product.name);
    };
    
    // Valida se é um Pixel ID válido (15-16 dígitos numéricos)
    const isValidPixelId = (pixelId) => {
      if (!pixelId) return false;
      const cleaned = String(pixelId).trim();
      return /^\d{15,16}$/.test(cleaned);
    };
    
    // Gera um UUID simples para event_id
    const generateEventId = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Função para inicializar Facebook Pixel e disparar eventos
    const initFacebookPixel = async () => {
      try {
        // Buscar pixel settings do produto (por UUID ou slug)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId);
        const query = isUUID 
          ? `product_id=eq.${productId}` 
          : `product_id=in.(select id from products where slug=eq.${productId})`;
        
        const response = await fetch(`https://hcbkqygdtzpxvctfdqbd.supabase.co/rest/v1/facebook_pixel_settings?${isUUID ? `product_id=eq.${productId}` : ''}&enabled=eq.true&select=pixel_id`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A'
          }
        });
        
        const pixelSettings = await response.json();
        
        // Filtrar apenas Pixel IDs válidos
        const validPixels = (pixelSettings || [])
          .map(s => s.pixel_id)
          .filter(isValidPixelId);
        
        if (validPixels.length === 0) {
          console.log('ℹ️ [FB PIXEL] No valid pixels found for this product');
          return;
        }
        
        console.log(`✅ [FB PIXEL] ${validPixels.length} valid pixel(s) found:`, validPixels);
        
        // Aguardar fbq estar disponível (já deve estar pois o script carrega antes)
        if (typeof window.fbq !== 'function') {
          console.error('❌ [FB PIXEL] fbq not available');
          return;
        }
        
        window._fbPixelsInitialized = window._fbPixelsInitialized || {};
        window._fbEventsTracked = window._fbEventsTracked || {};
        
        // Inicializar cada pixel válido
        validPixels.forEach(pixelId => {
          if (!window._fbPixelsInitialized[pixelId]) {
            window.fbq('init', pixelId);
            window._fbPixelsInitialized[pixelId] = true;
            console.log('✅ [FB PIXEL] Initialized:', pixelId);
          }
        });
        
        // Disparar PageView com eventID para deduplicação
        const pageViewEventId = generateEventId();
        window.fbq('track', 'PageView', {}, { eventID: pageViewEventId });
        console.log('✅ [FB PIXEL] PageView tracked with eventID:', pageViewEventId);
        
        // Disparar ViewContent após um pequeno delay
        setTimeout(() => {
          if (typeof window.fbq === 'function') {
            const viewContentEventId = generateEventId();
            window.fbq('track', 'ViewContent', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: viewContentEventId });
            console.log('✅ [FB PIXEL] ViewContent tracked with eventID:', viewContentEventId);
          }
        }, 300);
        
        // Disparar InitiateCheckout após delay maior (usuário está no checkout)
        setTimeout(() => {
          if (typeof window.fbq === 'function') {
            const initiateCheckoutEventId = generateEventId();
            window.fbq('track', 'InitiateCheckout', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: initiateCheckoutEventId });
            console.log('✅ [FB PIXEL] InitiateCheckout tracked with eventID:', initiateCheckoutEventId);
          }
        }, 1000);
        
      } catch (error) {
        console.error('❌ [FB PIXEL] Error loading pixel settings:', error);
      }
    };
    
    // Buscar dados do produto via Supabase
    const loadProductSEO = async () => {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId);
        const queryParam = isUUID ? `id=eq.${productId}` : `slug=eq.${productId}`;
        
        const response = await fetch(`https://hcbkqygdtzpxvctfdqbd.supabase.co/rest/v1/products?${queryParam}&select=id,name,description,cover,fantasy_name,price,seo_title,seo_description,seo_keywords,tags,slug,image_alt`, {
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
    
    // Executar imediatamente - SEO e Pixel em paralelo
    loadProductSEO();
    initFacebookPixel();
  }
})();