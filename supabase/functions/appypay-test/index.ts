import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 TESTE - Verificando configurações da AppyPay');
    
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const authBaseUrl = Deno.env.get('APPYPAY_AUTH_BASE_URL');
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL');
    const baseUrl = Deno.env.get('APPYPAY_BASE_URL');
    
    console.log('📊 TESTE - Variáveis de ambiente:', {
      clientId: clientId ? `✅ ${clientId.substring(0, 5)}...` : '❌ Indefinido',
      clientSecret: clientSecret ? `✅ ${clientSecret.substring(0, 5)}...` : '❌ Indefinido',
      authBaseUrl: authBaseUrl ? `✅ ${authBaseUrl}` : '❌ Indefinido',
      apiBaseUrl: apiBaseUrl ? `✅ ${apiBaseUrl}` : '❌ Indefinido',
      baseUrl: baseUrl ? `✅ ${baseUrl}` : '❌ Indefinido'
    });
    
    // Testar URLs de token (limpar URLs malformadas)
    const cleanUrl = (url) => url ? url.replace(/^url\s+/, '').trim() : null;
    
    const tokenUrls = [
      authBaseUrl ? `${cleanUrl(authBaseUrl)}/v2.0/token` : null,
      apiBaseUrl ? `${cleanUrl(apiBaseUrl)}/v2.0/token` : null,
      baseUrl ? `${cleanUrl(baseUrl)}/v2.0/token` : null,
      'https://gwy-api.appypay.co.ao/v2.0/token', // URL de teste conhecida
      'https://gwy-api-tst.appypay.co.ao/v2.0/token' // URL de teste conhecida
    ].filter(Boolean);
    
    const testResults = [];
    
    for (const url of tokenUrls) {
      try {
        console.log(`🧪 TESTE - Testando URL: ${url}`);
        
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', clientId || 'test');
        formData.append('client_secret', clientSecret || 'test');
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });
        
        const responseText = await response.text();
        
        testResults.push({
          url,
          status: response.status,
          response: responseText.substring(0, 200),
          headers: Object.fromEntries(response.headers.entries())
        });
        
        console.log(`📊 TESTE - URL ${url}: Status ${response.status}`);
        
      } catch (error) {
        testResults.push({
          url,
          error: error.message
        });
        console.error(`❌ TESTE - Erro ao testar ${url}:`, error);
      }
    }
    
    return new Response(
      JSON.stringify({
        message: 'Teste de configuração AppyPay',
        environment: {
          clientId: clientId ? 'Definido' : 'Indefinido',
          clientSecret: clientSecret ? 'Definido' : 'Indefinido',
          authBaseUrl,
          apiBaseUrl,
          baseUrl
        },
        testResults
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 TESTE - Erro inesperado:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});