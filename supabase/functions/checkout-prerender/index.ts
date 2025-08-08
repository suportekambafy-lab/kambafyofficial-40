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
    
    if (!productId) {
      return new Response('Product ID not found', { status: 400 })
    }

    console.log('🔍 Pre-rendering checkout for product:', productId)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch product data
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, description, cover, fantasy_name, price, seo_title, seo_description, seo_keywords, image_alt, slug')
      .eq('id', productId)
      .single()

    if (error || !product) {
      console.error('❌ Product not found:', error)
      return new Response('Product not found', { status: 404 })
    }

    console.log('✅ Product found:', product.name)

    // Generate SEO-optimized HTML
    const title = (product.seo_title && product.seo_title.length > 0) ? product.seo_title : `${product.name} - Checkout | Kambafy`
    const description = (product.seo_description && product.seo_description.length > 0) ? product.seo_description : (product.description || `Finalize sua compra do produto ${product.name} com segurança na Kambafy.`)
    const rawImage = product.cover || 'https://kambafy.com/kambafy-social-preview.png'
    const image = (rawImage && rawImage.startsWith('http')) ? rawImage : 'https://kambafy.com/kambafy-social-preview.png'
    const checkoutUrl = `https://pay.kambafy.com/checkout/${product.id}`
    const fbAppId = Deno.env.get('FACEBOOK_APP_ID') || '123456789'

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product" />
    <meta property="og:url" content="${checkoutUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:alt" content="${product.image_alt || product.name}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Kambafy" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="fb:app_id" content="${fbAppId}" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${checkoutUrl}" />
    <meta property="twitter:title" content="${title}" />
    <meta property="twitter:description" content="${description}" />
    <meta property="twitter:image" content="${image}" />
    <meta property="twitter:image:alt" content="${product.image_alt || product.name}" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${checkoutUrl}" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/kambafy-icon.png" />
    
    <!-- Schema.org markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "${product.name}",
      "description": "${description}",
      "image": "${image}",
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
        "seller": {
          "@type": "Organization",
          "name": "${product.fantasy_name || 'Kambafy'}"
        }
      }
    }
    </script>
    
    <!-- Redirect for browsers -->
    <script>
      // Se for um navegador real (não bot), redirecionar para a SPA
      if (window && !navigator.userAgent.includes('bot') && !navigator.userAgent.includes('crawler')) {
        window.location.href = '${checkoutUrl}';
      }
    </script>
  </head>
  <body>
    <div id="root">
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 20px;">
        <h1>${product.name}</h1>
        <p>${description}</p>
        <p>Redirecionando para o checkout...</p>
        <a href="${checkoutUrl}" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Ir para o Checkout
        </a>
      </div>
    </div>
  </body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache por 5 minutos
        ...corsHeaders
      }
    })

  } catch (error) {
    console.error('❌ Error in checkout-prerender:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})