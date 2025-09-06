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
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    
    console.log('🔐 Verificando credenciais:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0
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
    
    const authResponse = await fetch('https://gwy-api.appypay.co.ao/v2.0/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    console.log('🔐 Resposta da autenticação:', {
      status: authResponse.status,
      statusText: authResponse.statusText
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('❌ Erro na autenticação:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro na autenticação AppyPay: ${authResponse.status} - ${authError}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const authData = await authResponse.json();
    const bearerToken = authData.access_token;
    
    console.log('✅ Bearer Token gerado com sucesso');

    // Segundo: Fazer requisição de cobrança com Bearer Token

    // Fazer requisição para AppyPay com o Bearer Token gerado
    const appyPayResponse = await fetch('https://gwy-api.appypay.co.ao/v2.0/charges', {
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