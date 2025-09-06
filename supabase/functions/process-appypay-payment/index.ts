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

    // Buscar credenciais e URLs da AppyPay
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const authBaseUrl = Deno.env.get('APPYPAY_AUTH_BASE_URL') || 'https://gwy-api.appypay.co.ao';
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL') || 'https://gwy-api.appypay.co.ao';
    
    console.log('🔐 Verificando credenciais e configurações:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
      authBaseUrl,
      apiBaseUrl
    });
    
    if (!clientId || !clientSecret) {
      console.error('❌ Credenciais da AppyPay não encontradas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais da AppyPay não configuradas (CLIENT_ID e CLIENT_SECRET necessários)'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Primeiro: Gerar Bearer Token usando as credenciais
    console.log('🔐 Gerando Bearer Token...');
    
    // Endpoints possíveis para autenticação (vamos tentar múltiplos)
    const authEndpoints = [
      `${authBaseUrl}/connect/token`,
      `${authBaseUrl}/v2.0/connect/token`,
      `${authBaseUrl}/oauth/token`,
      `${authBaseUrl}/v2.0/auth/token`
    ];
    
    let authResponse;
    let authError = '';
    
    // Tentar cada endpoint até encontrar um que funcione
    for (const endpoint of authEndpoints) {
      console.log(`🔗 Tentando endpoint de auth: ${endpoint}`);
      
      // Preparar dados no formato form-urlencoded
      const formData = new URLSearchParams();
      formData.append('client_id', clientId);
      formData.append('client_secret', clientSecret);
      formData.append('grant_type', 'client_credentials');
      
      try {
        authResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formData.toString()
        });
        
        console.log(`🔐 Resposta da autenticação ${endpoint}:`, {
          status: authResponse.status,
          statusText: authResponse.statusText
        });
        
        if (authResponse.ok) {
          console.log(`✅ Endpoint funcionou: ${endpoint}`);
          break;
        } else {
          const errorText = await authResponse.text();
          authError += `${endpoint}: ${authResponse.status} ${authResponse.statusText} - ${errorText}\n`;
          console.log(`❌ Endpoint falhou ${endpoint}: ${authResponse.status} - ${errorText}`);
        }
      } catch (fetchError) {
        authError += `${endpoint}: Erro de conexão - ${fetchError.message}\n`;
        console.log(`❌ Erro de conexão ${endpoint}:`, fetchError.message);
      }
    }

    
    // Verificar se conseguimos autenticar
    if (!authResponse || !authResponse.ok) {
      console.error('❌ Falha na autenticação em todos os endpoints:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro na autenticação AppyPay. Tentamos múltiplos endpoints:\n${authError}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const authData = await authResponse.json();
    const bearerToken = authData.access_token;
    
    if (!bearerToken) {
      console.error('❌ Token de acesso não encontrado na resposta:', authData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token de acesso não recebido da AppyPay'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ Bearer Token gerado com sucesso');

    // Segundo: Fazer requisição de cobrança com Bearer Token
    const chargesUrl = `${apiBaseUrl}/v2.0/charges`;
    console.log(`💳 Fazendo requisição de cobrança para: ${chargesUrl}`);

    // Fazer requisição para AppyPay com o Bearer Token gerado
    const appyPayResponse = await fetch(chargesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
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