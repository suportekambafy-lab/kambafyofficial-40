// Sistema inteligente de SEO para produtos
// Detecta se é bot/crawler e faz prerender, senão redireciona para checkout
(function() {
  'use strict';

  // Detectar se é um bot/crawler
  const isBot = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const botPatterns = [
      'bot', 'crawler', 'spider', 'crawling', 'facebookexternalhit',
      'twitterbot', 'whatsapp', 'telegram', 'linkedinbot', 'slackbot',
      'discordbot', 'skypeuri', 'facebookplatform', 'googlebot',
      'bingbot', 'yandex', 'duckduckbot', 'baiduspider'
    ];
    
    return botPatterns.some(pattern => userAgent.includes(pattern));
  };

  // Detectar URLs de produto
  const detectProductUrls = () => {
    const path = window.location.pathname;
    const productMatches = [
      path.match(/\/p\/([a-f0-9-]{36})/),           // /p/uuid
      path.match(/\/produto\/([a-f0-9-]{36})/),      // /produto/uuid  
      path.match(/\/checkout\/([a-f0-9-]{36})/)      // /checkout/uuid
    ];
    
    return productMatches.find(match => match) || null;
  };

  const productMatch = detectProductUrls();
  
  if (productMatch) {
    const productId = productMatch[1];
    const isProductBot = isBot();
    
    console.log('🔍 Produto detectado:', productId, 'É bot:', isProductBot);
    
    if (isProductBot) {
      // Para bots: fazer prerender via fetch e substituir conteúdo
      console.log('🤖 Bot detectado, fazendo prerender...');
      
      const prerenderUrl = `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/product-prerender/${productId}`;
      
      fetch(prerenderUrl)
        .then(response => response.text())
        .then(html => {
          // Extrair apenas as meta tags do prerender
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          
          const metas = tempDiv.querySelectorAll('meta, title, script[type="application/ld+json"]');
          
          metas.forEach(meta => {
            const existing = document.querySelector(meta.tagName.toLowerCase() + 
              (meta.name ? `[name="${meta.name}"]` : '') +
              (meta.property ? `[property="${meta.property}"]` : '') +
              (meta.getAttribute('type') ? `[type="${meta.getAttribute('type')}"]` : '')
            );
            
            if (existing) {
              existing.replaceWith(meta.cloneNode(true));
            } else {
              document.head.appendChild(meta.cloneNode(true));
            }
          });
          
          console.log('✅ Meta tags do produto aplicadas para bot');
        })
        .catch(error => {
          console.warn('⚠️ Erro ao fazer prerender:', error);
        });
        
    } else {
      // Para usuários reais: redirecionar para checkout
      const isLocal = window.location.hostname.includes('localhost');
      const checkoutUrl = isLocal 
        ? `http://localhost:3000/checkout/${productId}`
        : `https://pay.kambafy.com/checkout/${productId}`;
      
      console.log('👤 Usuário real, redirecionando para:', checkoutUrl);
      
      // Pequeno delay para permitir que qualquer analytics seja processado
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 100);
    }
  }
})();