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
    const { 
      amount, 
      currency, 
      description, 
      merchantTransactionId, 
      paymentMethod,
      customerName,
      customerPhone,
      customerEmail 
    } = await req.json();

    console.log('📤 Dados recebidos:', {
      amount,
      currency,
      description,
      merchantTransactionId,
      paymentMethod,
      customerName,
      customerPhone,
      customerEmail
    });

    // Estrutura completa da requisição baseada na documentação da AppyPay
    const appyPayPayload = {
      amount: parseInt(amount), // Garantir que é um número inteiro
      currency: currency || "AOA",
      description: description,
      merchantTransactionId: merchantTransactionId,
      paymentMethod: paymentMethod,
      options: {
        SmartcardNumber: "Smart_card_Number", // Valor padrão
        MerchantOrigin: "Kambafy_Platform"    // Identificação da plataforma
      },
      notify: {
        name: customerName || "Cliente",
        telephone: customerPhone || "",
        email: customerEmail || "",
        smsNotification: true,
        emailNotification: true
      }
    };

    console.log('📤 Payload completo para AppyPay:', appyPayPayload);

    // Buscar credenciais da AppyPay
    const apiKey = Deno.env.get('APPYPAY_API_KEY');
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    
    // URL específica de autenticação
    const authUrl = 'https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token';
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL') || 'https://gwy-api.appypay.co.ao';
    
    console.log('🔐 Verificando credenciais:', {
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
      apiKeyLength: apiKey?.length || 0,
      authUrl,
      apiBaseUrl
    });
    
    if (!apiKey) {
      console.error('❌ APPYPAY_API_KEY não encontrada');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'APPYPAY_API_KEY não configurada'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔐 Testando endpoint de autenticação primeiro...');
    
    // Testar o endpoint de autenticação específico
    try {
      const authTestResponse = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔐 Teste de autenticação:', {
        url: authUrl,
        status: authTestResponse.status,
        statusText: authTestResponse.statusText
      });
      
      // Tentar ler a resposta
      const authResponseText = await authTestResponse.text();
      console.log('🔐 Resposta da autenticação:', {
        hasContent: !!authResponseText,
        contentLength: authResponseText?.length || 0,
        content: authResponseText ? authResponseText.substring(0, 200) + '...' : 'vazia'
      });
      
      // Se for 2xx, é sucesso
      if (authTestResponse.ok) {
        console.log('✅ Endpoint de autenticação FUNCIONOU!');
      } else if (authTestResponse.status === 401) {
        console.log('⚠️ Endpoint encontrado mas token inválido (401)');
      } else if (authTestResponse.status === 404) {
        console.log('❌ Endpoint de autenticação não encontrado (404)');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Endpoint de autenticação não encontrado: ${authUrl}`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        console.log(`⚠️ Endpoint responde com status: ${authTestResponse.status}`);
      }
      
    } catch (authError) {
      console.error('❌ Erro de conexão na autenticação:', authError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro de conexão no endpoint de autenticação: ${authError.message}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fazer requisição para AppyPay usando o endpoint correto fornecido
    const chargesUrl = 'https://gwy-api-tst.appypay.co.ao/v2.0/charges';
    console.log(`💳 Fazendo requisição para endpoint correto: ${chargesUrl}`);

    const appyPayResponse = await fetch(chargesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Kambafy-Integration/1.0'
      },
      body: JSON.stringify(appyPayPayload)
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