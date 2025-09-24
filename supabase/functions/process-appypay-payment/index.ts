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
      customerName,
      customerEmail,
      customerPhone,
      reference,
      redirectUrl
    } = await req.json();

    console.log('📤 Dados recebidos:', {
      amount,
      currency,
      customerName,
      customerEmail,
      customerPhone,
      reference,
      redirectUrl
    });

    if (!amount || !currency || !customerName || !customerEmail || !customerPhone || !reference || !redirectUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados obrigatórios ausentes'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar credenciais da AppyPay dos secrets
    const apiKey = Deno.env.get('APPYPAY_API_KEY');
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL');
    
    console.log('🔐 Verificando credenciais:', {
      hasApiKey: !!apiKey,
      hasApiBaseUrl: !!apiBaseUrl,
      apiKeyLength: apiKey?.length || 0
    });
    
    if (!apiKey || !apiBaseUrl) {
      console.error('❌ Credenciais AppyPay não encontradas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais AppyPay não configuradas (API_KEY ou API_BASE_URL)'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // --- CRIAR COBRANÇA ---
    console.log('💳 Criando cobrança na AppyPay...');

    
    const chargePayload = {
      amount: parseFloat(amount),
      currency: currency,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone
      },
      reference: reference,
      redirect_url: redirectUrl
    };

    console.log('📤 Payload da cobrança:', JSON.stringify(chargePayload, null, 2));

    const chargeResponse = await fetch(`${apiBaseUrl}/v2.0/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
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
        result: chargeData
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