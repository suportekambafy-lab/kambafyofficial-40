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
    
    // URLs corretas baseadas no padrão Microsoft OAuth2
    const authBaseUrl = 'https://login.microsoftonline.com/auth.appypay.co.ao';
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL') || 'https://gwy-api.appypay.co.ao';
    
    console.log('🔐 Verificando credenciais:', {
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
      apiKeyLength: apiKey?.length || 0,
      authBaseUrl,
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

    console.log('🔐 Testando token de autenticação...');
    
    // Testar se o token é válido fazendo uma requisição GET para o endpoint de auth
    try {
      const authTestResponse = await fetch(`${authBaseUrl}/oauth2/token`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔐 Teste de autenticação:', {
        status: authTestResponse.status,
        statusText: authTestResponse.statusText
      });
      
      if (!authTestResponse.ok && authTestResponse.status !== 401) {
        const authError = await authTestResponse.text();
        console.error('❌ Erro no teste de autenticação:', authError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erro na autenticação AppyPay: ${authTestResponse.status} - ${authError}`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log('✅ Token testado (status esperado para teste)');
    } catch (authError) {
      console.error('❌ Erro de conexão na autenticação:', authError.message);
    }

    // Fazer requisição direta para AppyPay - usar endpoints corretos
    const possibleEndpoints = [
      `${apiBaseUrl}/charges`,
      `${apiBaseUrl}/v1/charges`, 
      `${apiBaseUrl}/v2/charges`,
      `${apiBaseUrl}/api/charges`,
      `${apiBaseUrl}/api/v1/charges`,
      `${apiBaseUrl}/api/v2/charges`,
      // Tentar sem o apiBaseUrl também
      'https://api.appypay.co.ao/charges',
      'https://api.appypay.co.ao/v1/charges',
      'https://api.appypay.co.ao/v2/charges'
    ];
    
    let appyPayResponse;
    let chargesError = '';
    
    // Tentar diferentes métodos de autenticação
    const authMethods = [
      { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${apiKey}` } },
      { name: 'API Key Header', headers: { 'X-API-Key': apiKey } },
      { name: 'AppyPay Key', headers: { 'AppyPay-Key': apiKey } },
      { name: 'Api-Key Header', headers: { 'Api-Key': apiKey } }
    ];
    
    for (const endpoint of possibleEndpoints) {
      console.log(`💳 Tentando endpoint: ${endpoint}`);
      
      for (const authMethod of authMethods) {
        console.log(`🔐 Tentando método de auth: ${authMethod.name}`);
        
        try {
          appyPayResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Kambafy-Integration/1.0',
              ...authMethod.headers
            },
            body: JSON.stringify(appyPayPayload)
          });
          
          console.log(`💳 Resposta ${endpoint} com ${authMethod.name}:`, {
            status: appyPayResponse.status,
            statusText: appyPayResponse.statusText
          });
          
          // Se não for 401 (unauthorized) ou 404 (not found), parar de tentar
          if (appyPayResponse.status !== 401 && appyPayResponse.status !== 404) {
            console.log(`✅ Método funcionou: ${authMethod.name} em ${endpoint} (status: ${appyPayResponse.status})`);
            break;
          } else {
            console.log(`❌ ${authMethod.name} falhou: ${appyPayResponse.status}`);
          }
        } catch (fetchError) {
          chargesError += `${endpoint} (${authMethod.name}): ${fetchError.message}\n`;
          console.log(`❌ Erro de conexão ${endpoint} (${authMethod.name}):`, fetchError.message);
        }
      }
      
      // Se encontrou um método que funcionou, parar de tentar endpoints
      if (appyPayResponse && appyPayResponse.status !== 401 && appyPayResponse.status !== 404) {
        break;
      }
    }
    
    // Se todos os métodos falharam
    if (!appyPayResponse || appyPayResponse.status === 401 || appyPayResponse.status === 404) {
      console.error('❌ Todos os métodos de autenticação falharam:', chargesError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Falha na autenticação AppyPay. Status: ${appyPayResponse?.status}. Tentamos múltiplos métodos de auth.`,
          details: {
            testedEndpoints: possibleEndpoints,
            testedAuthMethods: authMethods.map(m => m.name),
            lastStatus: appyPayResponse?.status,
            lastStatusText: appyPayResponse?.statusText
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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