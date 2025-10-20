import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, accept',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
};

// Rate limiting simples (em memória)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests por minuto
const RATE_WINDOW = 60000; // 1 minuto em ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let pathParts = url.pathname.split('/').filter(p => p);

    console.log('🎯 Bunny Proxy Request:', {
      method: req.method,
      path: url.pathname,
      pathParts
    });

    // Remove o nome da função se estiver presente (bunny-proxy)
    if (pathParts[0] === 'bunny-proxy') {
      pathParts = pathParts.slice(1);
    }

    // Formato esperado: /video/{videoId}/playlist.m3u8 ou /video/{videoId}/seg-{n}.m4s
    if (pathParts[0] !== 'video' || pathParts.length < 2) {
      return new Response('Invalid request format. Expected: /video/{videoId}/resource', {
        status: 400,
        headers: corsHeaders
      });
    }

    const videoId = pathParts[1];
    const resource = pathParts.slice(2).join('/'); // playlist.m3u8, seg-1.m4s, etc.

    // Validação básica de videoId (UUID ou ID Bunny)
    if (!videoId || videoId.length < 10) {
      return new Response('Invalid video ID', {
        status: 400,
        headers: corsHeaders
      });
    }

    // Rate limiting por IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      console.warn('⚠️ Rate limit exceeded for IP:', clientIp);
      return new Response('Too many requests', {
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': '60'
        }
      });
    }

    // Construir URL do Bunny - OTIMIZADO PARA ZONA EUROPA
    // Europa oferece ~95% de economia vs África e melhor latência via cabos submarinos
    // Configure BUNNY_EUROPE_CDN_URL nas secrets com sua zona Europa (ex: falkenstein.b-cdn.net ou https://falkenstein.b-cdn.net)
    let bunnyBaseUrl = Deno.env.get('BUNNY_EUROPE_CDN_URL') || 'https://vz-5c879716-268.b-cdn.net';
    
    // Adicionar https:// se não estiver presente
    if (!bunnyBaseUrl.startsWith('http://') && !bunnyBaseUrl.startsWith('https://')) {
      bunnyBaseUrl = `https://${bunnyBaseUrl}`;
    }
    
    const bunnyUrl = `${bunnyBaseUrl}/${videoId}/${resource}`;
    
    console.log('📍 Usando zona Bunny:', bunnyBaseUrl);

    console.log('🔄 Proxying to Bunny:', bunnyUrl);

    // Fazer requisição ao Bunny mantendo headers importantes
    const bunnyHeaders = new Headers();
    
    // Forward de headers importantes para streaming
    const headersToForward = ['range', 'accept', 'accept-encoding', 'user-agent'];
    headersToForward.forEach(header => {
      const value = req.headers.get(header);
      if (value) {
        bunnyHeaders.set(header, value);
      }
    });

    const bunnyResponse = await fetch(bunnyUrl, {
      method: req.method,
      headers: bunnyHeaders,
    });

    if (!bunnyResponse.ok) {
      console.error('❌ Bunny request failed:', {
        status: bunnyResponse.status,
        statusText: bunnyResponse.statusText
      });

      return new Response(`Bunny request failed: ${bunnyResponse.statusText}`, {
        status: bunnyResponse.status,
        headers: corsHeaders
      });
    }

    // Construir headers de resposta
    const responseHeaders = new Headers(corsHeaders);
    
    // Forward de headers importantes do Bunny
    const bunnyHeadersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified'
    ];

    bunnyHeadersToForward.forEach(header => {
      const value = bunnyResponse.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Headers de cache agressivo
    if (resource.endsWith('.m3u8')) {
      // Playlist: cache menor (conteúdo pode mudar)
      responseHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    } else if (resource.includes('seg-') || resource.endsWith('.m4s') || resource.endsWith('.ts')) {
      // Segmentos de vídeo: cache longo (imutáveis)
      responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Outros recursos: cache moderado
      responseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    }

    // Headers de segurança
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    const responseTime = Date.now() - startTime;

    console.log('✅ Proxy successful:', {
      videoId,
      resource,
      status: bunnyResponse.status,
      contentType: bunnyResponse.headers.get('content-type'),
      responseTime: `${responseTime}ms`,
      clientIp
    });

    // Retornar resposta do Bunny com streaming
    return new Response(bunnyResponse.body, {
      status: bunnyResponse.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);

    return new Response(JSON.stringify({
      error: 'Internal proxy error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
