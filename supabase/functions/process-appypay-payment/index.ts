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

    // Estrutura simplificada da requisição baseada na especificação
    const appyPayPayload = {
      amount: parseInt(amount), // total da transação
      currency: currency || "AOA",
      description: description, // nome do produto
      merchantTransactionId: merchantTransactionId, // id único da transação
      paymentMethod: paymentMethod
    };

    console.log('📤 Payload AppyPay (estrutura correta):', appyPayPayload);

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
    
    // Log do payload e headers para debug
    console.log('📤 Payload sendo enviado:', JSON.stringify(appyPayPayload, null, 2));
    console.log('🔑 API Key sendo usada:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'
    });

    // Tentar diferentes métodos de autenticação
    const authMethods = [
      { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${apiKey}` } },
      { name: 'X-API-Key', headers: { 'X-API-Key': apiKey } },
      { name: 'ApiKey', headers: { 'ApiKey': apiKey } },
      { name: 'api-key', headers: { 'api-key': apiKey } }
    ];
    
    let appyPayResponse;
    let responseText = '';
    
    for (const authMethod of authMethods) {
      console.log(`🔐 Tentando método: ${authMethod.name}`);
      
      try {
        appyPayResponse = await fetch(chargesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Kambafy-Integration/1.0',
            ...authMethod.headers
          },
          body: JSON.stringify(appyPayPayload)
        });
        
        // Ler a resposta imediatamente para evitar "Body already consumed"
        responseText = await appyPayResponse.text();
        
        console.log(`💳 Resposta com ${authMethod.name}:`, {
          status: appyPayResponse.status,
          statusText: appyPayResponse.statusText,
          hasContent: !!responseText,
          contentLength: responseText?.length || 0
        });
        
        // Se não for 401, usar este método
        if (appyPayResponse.status !== 401) {
          console.log(`✅ Método de auth funcionou: ${authMethod.name}`);
          break;
        } else {
          console.log(`📋 Detalhe do erro 401 com ${authMethod.name}:`, responseText.substring(0, 200));
        }
        
      } catch (fetchError) {
        console.log(`❌ Erro com ${authMethod.name}:`, fetchError.message);
      }
    }

    // Verificar se há conteúdo para analisar (usar responseText já lido anteriormente)
    console.log('📋 Resposta bruta da AppyPay:', {
      status: appyPayResponse.status,
      statusText: appyPayResponse.statusText,
      headers: Object.fromEntries(appyPayResponse.headers.entries()),
      bodyText: responseText,
      hasContent: !!responseText,
      contentLength: responseText?.length || 0
    });

    let responseData;
    
    // Se for 401, tentar diferentes estratégias para obter mais detalhes
    if (appyPayResponse.status === 401) {
      console.log('🔍 Analisando erro 401 em detalhes...');
      
      if (!responseText || responseText.trim() === '') {
        console.log('⚠️ Erro 401 sem corpo de resposta - pode indicar problema de autenticação OAuth');
        console.log('💡 Verificando headers para mais informações...');
        
        const wwwAuthHeader = appyPayResponse.headers.get('www-authenticate');
        console.log('🔐 Header www-authenticate:', wwwAuthHeader);
        
        // Parece que precisa de autenticação OAuth primeiro
        console.log('🎯 Tentativa: Fazer autenticação OAuth primeiro');
        
        try {
          // Tentar obter token OAuth usando as credenciais
          const oauthResponse = await fetch('https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: clientId || '',
              client_secret: apiKey || '',
              scope: 'https://gwy-api.appypay.co.ao/.default'
            })
          });
          
          console.log('🔐 Resposta OAuth:', {
            status: oauthResponse.status,
            statusText: oauthResponse.statusText
          });
          
          const oauthText = await oauthResponse.text();
          console.log('🔐 Corpo da resposta OAuth:', oauthText.substring(0, 500));
          
          if (oauthResponse.ok && oauthText) {
            const oauthData = JSON.parse(oauthText);
            if (oauthData.access_token) {
              console.log('✅ Token OAuth obtido com sucesso');
              
              // Tentar novamente com o token OAuth
              const retryResponse = await fetch(chargesUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${oauthData.access_token}`
                },
                body: JSON.stringify(appyPayPayload)
              });
              
              const retryText = await retryResponse.text();
              console.log('🔄 Retry com token OAuth:', {
                status: retryResponse.status,
                statusText: retryResponse.statusText,
                responseText: retryText.substring(0, 200)
              });
              
              // Usar a resposta do retry
              appyPayResponse = retryResponse;
              responseText = retryText;
            }
          }
          
        } catch (oauthError) {
          console.log('❌ Erro na autenticação OAuth:', oauthError.message);
        }
        
        responseData = { 
          error: 'Unauthorized',
          error_description: 'API Key inválida ou expirada. Resposta vazia indica problema de autenticação.',
          status: appyPayResponse.status,
          statusText: appyPayResponse.statusText,
          wwwAuthenticate: wwwAuthHeader
        };
      } else {
        try {
          responseData = JSON.parse(responseText);
          console.log('✅ JSON parseado do erro 401:', responseData);
        } catch (jsonError) {
          responseData = { 
            error: 'Invalid response format',
            error_description: 'Resposta 401 não é JSON válido',
            rawResponse: responseText,
            parseError: jsonError.message
          };
        }
      }
    } else if (!responseText || responseText.trim() === '') {
      console.log('⚠️ AppyPay retornou resposta vazia para status não-401');
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