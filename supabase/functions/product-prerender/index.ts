import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const productId = url.pathname.split('/').pop()
    
    if (!productId || productId.length < 10) {
      return new Response('Product ID not found or invalid', { status: 400 })
    }

    console.log('🔍 Pre-rendering product page for:', productId)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch product data
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, description, cover, fantasy_name, price, seo_title, seo_description, seo_keywords, image_alt, slug, tags')
      .eq('id', productId)
      .single()

    if (error || !product) {
      console.error('❌ Product not found:', error)
      return new Response('Product not found', { status: 404 })
    }

    console.log('✅ Product found for SEO:', product.name)

    // Generate SEO-optimized HTML
    const title = (product.seo_title && product.seo_title.trim()) ? product.seo_title : `${product.name} | Kambafy`
    const description = (product.seo_description && product.seo_description.length > 0) ? product.seo_description : (product.description || `Conheça ${product.name} - Produto digital de qualidade disponível na Kambafy.`)
    
    // Process image URL
    const rawImage = product.cover || 'https://kambafy.com/kambafy-social-preview.png'
    let image = rawImage
    
    // If it's a relative path or lovable-uploads, make it absolute
    if (rawImage && !rawImage.startsWith('http')) {
      image = `https://kambafy.com${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
    } else if (rawImage && rawImage.includes('lovable-uploads/')) {
      image = `https://kambafy.com/lovable-uploads/${rawImage.split('lovable-uploads/').pop()}`
    }

    const checkoutUrl = `https://pay.kambafy.com/checkout/${product.id}`
    const productUrl = `https://kambafy.com/produto/${product.id}`
    const fbAppId = Deno.env.get('FACEBOOK_APP_ID') || '123456789'
    
    // Generate keywords
    const keywords = (product.seo_keywords && product.seo_keywords.length > 0)
      ? product.seo_keywords.join(', ')
      : `${product.name}, produto digital, kambafy${product.tags && product.tags.length ? ', ' + product.tags.join(', ') : ''}`

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO Meta Tags -->
    <title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="author" content="${product.fantasy_name || 'Kambafy'}" />
    
    <!-- Schema.org itemprops -->
    <meta itemprop="name" content="${title}" />
    <meta itemprop="description" content="${description}" />
    <meta itemprop="image" content="${image}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product" />
    <meta property="og:url" content="${productUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:alt" content="${product.image_alt || product.name}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Kambafy" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:updated_time" content="${new Date().toISOString()}" />
    <meta property="fb:app_id" content="${fbAppId}" />
    <meta property="product:brand" content="${product.fantasy_name || 'Kambafy'}" />
    <meta property="product:availability" content="in stock" />
    <meta property="product:condition" content="new" />
    <meta property="product:price:amount" content="${product.price}" />
    <meta property="product:price:currency" content="AOA" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${productUrl}" />
    <meta property="twitter:title" content="${title}" />
    <meta property="twitter:description" content="${description}" />
    <meta property="twitter:image" content="${image}" />
    <meta property="twitter:image:alt" content="${product.image_alt || product.name}" />
    <meta property="twitter:site" content="@kambafy" />
    <meta property="twitter:creator" content="@kambafy" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${productUrl}" />
    
    <!-- Alternative URLs -->
    <link rel="alternate" href="${checkoutUrl}" title="Página de Checkout" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/kambafy-icon.png" />
    
    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://pay.kambafy.com" />
    <link rel="dns-prefetch" href="//pay.kambafy.com" />
    
    <!-- Schema.org markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "${product.name}",
      "description": "${description}",
      "image": "${image}",
      "sku": "${product.id}",
      "mpn": "${product.id}",
      "brand": {
        "@type": "Brand",
        "name": "${product.fantasy_name || 'Kambafy'}"
      },
      "offers": {
        "@type": "Offer",
        "url": "${checkoutUrl}",
        "priceCurrency": "AOA",
        "price": "${product.price}",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": "${product.fantasy_name || 'Kambafy'}",
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
      "url": "${productUrl}",
      "category": "Digital Product"
    }
    </script>
    
    <!-- Redirect for browsers -->
    <script>
      // Se for um navegador real (não bot), redirecionar para checkout
      if (typeof window !== 'undefined' && window.navigator && !navigator.userAgent.toLowerCase().includes('bot') && !navigator.userAgent.toLowerCase().includes('crawler') && !navigator.userAgent.toLowerCase().includes('spider')) {
        // Aguardar um pouco para garantir que crawlers tenham tempo de processar
        setTimeout(function() {
          window.location.href = '${checkoutUrl}';
        }, 100);
      }
    </script>
  </head>
  <body>
    <div id="root">
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${product.cover ? `<img src="${image}" alt="${product.image_alt || product.name}" style="max-width: 400px; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ''}
        <h1 style="font-size: 28px; margin-bottom: 16px; color: #333;">${product.name}</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #666; max-width: 600px; margin-bottom: 24px;">${description}</p>
        <p style="font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 20px;">${product.price.toLocaleString('pt-AO')} Kz</p>
        <p style="margin-bottom: 20px; color: #888;">Redirecionando para o checkout...</p>
        <a href="${checkoutUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background 0.2s;">
          Comprar Agora
        </a>
      </div>
    </div>
  </body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache por 5 min (browser), 10 min (CDN)
        'X-Robots-Tag': 'index, follow',
        ...corsHeaders
      }
    })

  } catch (error) {
    console.error('❌ Error in product-prerender:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})