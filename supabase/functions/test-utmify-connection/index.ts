import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📦 Body recebido:', JSON.stringify(body));
    
    const apiToken = body?.apiToken;
    console.log('🔑 Token recebido:', apiToken ? `${apiToken.substring(0, 5)}...${apiToken.substring(apiToken.length - 5)}` : 'VAZIO');
    console.log('📏 Token length:', apiToken?.length || 0);

    if (!apiToken || apiToken.trim().length < 10) {
      console.log('❌ Token inválido - length:', apiToken?.length || 0);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou muito curto', receivedLength: apiToken?.length || 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔵 Testando conexão UTMify...');

    // Payload de teste real para a API da UTMify
    const testPayload = {
      orderId: `TEST-KAMBAFY-${Date.now()}`,
      platform: 'kambafy',
      paymentMethod: 'pix',
      status: 'paid',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      refundedAt: null,
      customer: {
        name: 'Teste Kambafy',
        email: 'teste@kambafy.com',
        phone: null,
        document: null,
        country: 'AO',
        ip: '127.0.0.1'
      },
      products: [{
        id: 'test-product-001',
        name: 'Produto de Teste Kambafy',
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: 100
      }],
      trackingParameters: {
        src: 'test',
        sck: null,
        utm_source: 'kambafy_test',
        utm_campaign: 'connection_test',
        utm_medium: 'api',
        utm_content: null,
        utm_term: null
      },
      commission: {
        totalPriceInCents: 100,
        gatewayFeeInCents: 0,
        userCommissionInCents: 100,
        currency: 'USD'
      },
      isTest: false // Enviar como venda real para aparecer no dashboard
    };

    console.log('📤 Enviando payload para UTMify:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken.trim()
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData = null;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    console.log('📥 Resposta UTMify:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Conexão bem-sucedida! O sinal de teste foi enviado.',
          data: responseData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (response.status === 401) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido',
          message: 'A UTMify rejeitou o token. Verifique se está correto.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (response.status === 400) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro de validação',
          message: responseData?.message || 'A UTMify retornou um erro de validação.',
          details: responseData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ${response.status}`,
          message: responseData?.message || 'Erro desconhecido da API UTMify',
          details: responseData 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('❌ Erro no teste UTMify:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro de conexão',
        message: error.message || 'Não foi possível conectar à API da UTMify' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
