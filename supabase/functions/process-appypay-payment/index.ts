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
    console.log('🔐 Verificando credenciais:', {
      hasSecret: !!clientSecret,
      secretLength: clientSecret?.length || 0,
      secretPrefix: clientSecret ? clientSecret.substring(0, 10) + '...' : 'undefined',
      allEnvKeys: Object.keys(Deno.env.toObject()).filter(key => key.includes('APPYPAY'))
    });

    if (clientSecret) {
      appyPayHeaders['Authorization'] = `Bearer ${clientSecret}`;
      console.log('🔐 Authorization header configurado com Bearer token');
      console.log('📤 Headers finais:', Object.keys(appyPayHeaders));
    } else {
      console.log('⚠️ APPYPAY_CLIENT_SECRET não encontrado nas variáveis de ambiente');
      console.log('📋 Variáveis disponíveis:', Object.keys(Deno.env.toObject()));
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
      bodyText: responseText,
      hasContent: !!responseText,
      contentLength: responseText?.length || 0
    });

    let responseData;
    if (!responseText || responseText.trim() === '') {
      console.log('⚠️ AppyPay retornou resposta vazia');
      responseData = { 
        message: 'Resposta vazia da AppyPay',
        status: appyPayResponse.status,
        statusText: appyPayResponse.statusText
      };
    } else {
      try {
        responseData = JSON.parse(responseText);
        console.log('✅ JSON parseado com sucesso:', responseData);
      } catch (jsonError) {
        console.error('❌ Erro ao analisar JSON da AppyPay:', jsonError);
        responseData = { 
          error: 'Resposta inválida da AppyPay',
          rawResponse: responseText,
          parseError: jsonError.message,
          status: appyPayResponse.status
        };
      }
    }
    
    console.log('📊 Status da resposta AppyPay:', {
      ok: appyPayResponse.ok,
      status: appyPayResponse.status,
      hasResponseData: !!responseData
    });

    if (!appyPayResponse.ok) {
      console.error('❌ Erro da AppyPay (status não-2xx):', {
        status: appyPayResponse.status,
        statusText: appyPayResponse.statusText,
        responseData
      });
      
      // Se for resposta vazia mas com erro de status, tratar como erro da API
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `AppyPay retornou erro ${appyPayResponse.status}: ${appyPayResponse.statusText}`,
          details: {
            status: appyPayResponse.status,
            statusText: appyPayResponse.statusText,
            rawResponse: responseText,
            ...responseData
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ AppyPay processou com sucesso (status 2xx)');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData,
        message: 'Pagamento processado com sucesso',
        appyPayStatus: appyPayResponse.status
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