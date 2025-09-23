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

    // Buscar credenciais da AppyPay dos secrets
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const resource = "bee57785-7a19-4f1c-9c8d-aa03f2f0e333";
    
    console.log('🔐 Verificando credenciais:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
      resource
    });
    
    if (!clientId || !clientSecret) {
      console.error('❌ Credenciais AppyPay não encontradas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais AppyPay não configuradas (CLIENT_ID ou CLIENT_SECRET)'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // --- GERAR TOKEN AUTOMATICAMENTE ---
    console.log('🔐 Gerando token de acesso automaticamente...');
    
    const tokenResponse = await fetch('https://gwy-api.appypay.co.ao/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
        'resource': resource
      })
    });

    console.log('🔐 Resposta do token:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText
    });

    const tokenText = await tokenResponse.text();
    console.log('🔐 Corpo da resposta do token:', tokenText.substring(0, 300));

    if (!tokenResponse.ok) {
      console.error('❌ Erro ao obter token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: tokenText
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao obter token AppyPay: ${tokenResponse.status} ${tokenResponse.statusText}`,
          details: tokenText
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (parseError) {
      console.error('❌ Erro ao analisar resposta do token:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resposta do token AppyPay inválida',
          details: tokenText
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('❌ Token de acesso não encontrado na resposta:', tokenData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token de acesso não encontrado na resposta da AppyPay',
          details: tokenData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Token gerado com sucesso:', {
      hasToken: !!accessToken,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 20) + '...'
    });

    // --- CRIAR COBRANÇA ---
    console.log('💳 Criando cobrança na AppyPay...');
    
    const chargePayload = {
      amount: parseFloat(amount),
      currency: currency || "AOA",
      description: description,
      merchantTransactionId: merchantTransactionId,
      paymentMethod: paymentMethod,
      options: {
        SmartcardNumber: customerPhone || "Smart_card_Number",
        MerchantOrigin: "Kambafy_Checkout"
      }
    };

    console.log('📤 Payload da cobrança:', JSON.stringify(chargePayload, null, 2));

    const chargeResponse = await fetch('https://gwy-api.appypay.co.ao/v2/charges', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'pt-AO',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chargePayload)
    });

    console.log('💳 Resposta da cobrança:', {
      status: chargeResponse.status,
      statusText: chargeResponse.statusText
    });

    const chargeText = await chargeResponse.text();
    console.log('💳 Corpo da resposta da cobrança:', chargeText.substring(0, 500));

    let chargeData;
    try {
      chargeData = JSON.parse(chargeText);
    } catch (parseError) {
      console.error('❌ Erro ao analisar resposta da cobrança:', parseError);
      chargeData = { 
        error: 'Resposta inválida',
        rawResponse: chargeText,
        parseError: parseError.message
      };
    }

    if (!chargeResponse.ok) {
      console.error('❌ Erro ao criar cobrança:', {
        status: chargeResponse.status,
        statusText: chargeResponse.statusText,
        response: chargeData
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao criar cobrança AppyPay: ${chargeResponse.status} ${chargeResponse.statusText}`,
          details: chargeData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Cobrança criada com sucesso:', chargeData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: chargeData,
        message: 'Cobrança AppyPay criada com sucesso',
        chargeId: chargeData.id || chargeData.chargeId,
        status: chargeData.status,
        amount: chargeData.amount,
        currency: chargeData.currency
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
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});