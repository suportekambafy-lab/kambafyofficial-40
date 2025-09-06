import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency, description, merchantTransactionId, paymentMethod } = await req.json();

    console.log('📤 Enviando para AppyPay:', {
      amount,
      currency,
      description,
      merchantTransactionId,
      paymentMethod,
      url: 'https://gwy-api.appypay.co.ao/v2.0/charges'
    });

    // Headers para AppyPay
    const appyPayHeaders = {
      'Content-Type': 'application/json'
    };

    // Adicionar Authorization se o secret estiver configurado
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    if (clientSecret) {
      appyPayHeaders['Authorization'] = `Bearer ${clientSecret}`;
      console.log('🔐 Authorization header adicionado');
    } else {
      console.log('⚠️ APPYPAY_CLIENT_SECRET não configurado');
    }

    console.log('📋 Headers sendo enviados:', Object.keys(appyPayHeaders));

    // Fazer requisição para AppyPay
    const appyPayResponse = await fetch('https://gwy-api.appypay.co.ao/v2.0/charges', {
      method: 'POST',
      headers: appyPayHeaders,
      body: JSON.stringify({
        amount,
        currency,
        description,
        merchantTransactionId,
        paymentMethod
      })
    });

    // Verificar se há conteúdo para analisar
    const responseText = await appyPayResponse.text();
    console.log('📋 Resposta bruta da AppyPay:', {
      status: appyPayResponse.status,
      statusText: appyPayResponse.statusText,
      headers: Object.fromEntries(appyPayResponse.headers.entries()),
      bodyText: responseText
    });

    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (jsonError) {
      console.error('❌ Erro ao analisar JSON da AppyPay:', jsonError);
      responseData = { 
        error: 'Resposta inválida da AppyPay',
        rawResponse: responseText,
        parseError: jsonError.message
      };
    }
    
    console.log('📥 Resposta completa da AppyPay:', {
      status: appyPayResponse.status,
      statusText: appyPayResponse.statusText,
      headers: Object.fromEntries(appyPayResponse.headers.entries()),
      data: responseData
    });

    if (!appyPayResponse.ok) {
      console.error('❌ Erro da AppyPay:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData?.message || 'Erro na AppyPay',
          details: responseData 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ AppyPay processou com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData,
        message: 'Pagamento processado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro na edge function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno no servidor',
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});