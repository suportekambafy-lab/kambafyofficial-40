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
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL') || 'https://gwy-api.appypay.co.ao';
    
    console.log('🔐 Verificando credenciais:', {
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
      apiKeyLength: apiKey?.length || 0,
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

    console.log('🔐 Usando autenticação direta com API Key');

    // Fazer requisição direta para AppyPay com API Key como Bearer token
    // Tentar múltiplos endpoints possíveis
    const possibleEndpoints = [
      `${apiBaseUrl}/charges`,
      `${apiBaseUrl}/v1/charges`, 
      `${apiBaseUrl}/v2.0/charges`,
      `${apiBaseUrl}/api/charges`,
      `${apiBaseUrl}/api/v1/charges`
    ];
    
    let appyPayResponse;
    let chargesError = '';
    
    for (const endpoint of possibleEndpoints) {
      console.log(`💳 Tentando endpoint: ${endpoint}`);
      
      try {
        appyPayResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'Kambafy-Integration/1.0'
          },
          body: JSON.stringify(appyPayPayload)
        });
        
        console.log(`💳 Resposta ${endpoint}:`, {
          status: appyPayResponse.status,
          statusText: appyPayResponse.statusText
        });
        
        if (appyPayResponse.status !== 404) {
          console.log(`✅ Endpoint encontrado: ${endpoint} (status: ${appyPayResponse.status})`);
          break;
        } else {
          chargesError += `${endpoint}: 404 Not Found\n`;
          console.log(`❌ Endpoint 404: ${endpoint}`);
        }
      } catch (fetchError) {
        chargesError += `${endpoint}: Erro de conexão - ${fetchError.message}\n`;
        console.log(`❌ Erro de conexão ${endpoint}:`, fetchError.message);
      }
    }
    
    // Se todos os endpoints retornaram 404, mostrar erro
    if (!appyPayResponse || appyPayResponse.status === 404) {
      console.error('❌ Nenhum endpoint de charges encontrado:', chargesError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Nenhum endpoint de charges AppyPay disponível:\n${chargesError}`
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