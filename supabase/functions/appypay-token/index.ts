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
    console.log('🔑 Iniciando geração de token AppyPay');
    console.log('🔍 Verificando variáveis de ambiente...');
    
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const baseUrl = Deno.env.get('APPYPAY_BASE_URL');
    
    console.log('📊 Status das variáveis:', {
      clientId: clientId ? '✅ Definido' : '❌ Indefinido',
      clientSecret: clientSecret ? '✅ Definido' : '❌ Indefinido',
      baseUrl: baseUrl ? `✅ ${baseUrl}` : '❌ Indefinido'
    });
    
    if (!clientId || !clientSecret) {
      console.error('❌ Credenciais AppyPay não configuradas');
      return new Response(
        JSON.stringify({ error: 'Credenciais AppyPay não configuradas' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📡 Fazendo requisição para token OAuth2');
    
    if (!baseUrl) {
      console.error('❌ APPYPAY_BASE_URL não configurada');
      return new Response(
        JSON.stringify({ error: 'URL base da AppyPay não configurada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // URL para geração de token - try different common OAuth2 paths
    const tokenUrl = `${baseUrl}/oauth/token`;
    console.log('🌐 URL do token:', tokenUrl);
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('resource', 'bee57785-7a19-4f1c-9c8d-aa03f2f0e333');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    console.log('📨 Resposta da API:', responseText);

    if (!response.ok) {
      console.error('❌ Erro na requisição OAuth2:', response.status, responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao obter token de acesso',
          details: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenData = JSON.parse(responseText);
    console.log('✅ Token gerado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
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