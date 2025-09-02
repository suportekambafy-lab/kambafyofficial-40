import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateChargeRequest {
  amount: number;
  currency: string;
  description: string;
  merchantTransactionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  smsNotification?: boolean;
  emailNotification?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando criação de cobrança AppyPay');
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestData: CreateChargeRequest = await req.json();
    console.log('📥 Dados recebidos:', JSON.stringify(requestData, null, 2));

    // Validar dados obrigatórios
    if (!requestData.amount || !requestData.currency || !requestData.merchantTransactionId) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obter credenciais do ambiente
    const baseUrl = Deno.env.get('APPYPAY_BASE_URL');
    if (!baseUrl) {
      console.error('❌ APPYPAY_BASE_URL não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração AppyPay incompleta' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Gerar token de acesso
    console.log('🔑 Gerando token de acesso AppyPay');
    const tokenResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/appypay-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tokenResponse.ok) {
      console.error('❌ Erro ao gerar token:', tokenResponse.status);
      return new Response(
        JSON.stringify({ error: 'Erro ao obter token de acesso' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token obtido com sucesso');

    // Preparar dados para criação da cobrança
    const chargeData = {
      amount: requestData.amount,
      currency: requestData.currency,
      description: requestData.description,
      merchantTransactionId: requestData.merchantTransactionId,
      paymentMethod: "REF_96ee61a9-e9ff-4030-8be6-0b775e847e5f", // ID fixo para referencial
      options: {
        SmartcardNumber: "Kambafy_Payment",
        MerchantOrigin: "Kambafy_Platform"
      },
      notify: {
        name: requestData.customerName,
        telephone: requestData.customerPhone,
        email: requestData.customerEmail,
        smsNotification: requestData.smsNotification !== false,
        emailNotification: requestData.emailNotification !== false
      }
    };

    console.log('📤 Criando cobrança na AppyPay:', JSON.stringify(chargeData, null, 2));

    // Criar cobrança na AppyPay
    const chargeResponse = await fetch(`${baseUrl}/v2.0/charges`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chargeData)
    });

    const responseText = await chargeResponse.text();
    console.log('📨 Resposta da AppyPay:', responseText);

    if (!chargeResponse.ok) {
      console.error('❌ Erro ao criar cobrança:', chargeResponse.status, responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar cobrança',
          details: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const chargeResult = JSON.parse(responseText);
    console.log('✅ Cobrança criada com sucesso:', chargeResult.id);

    return new Response(
      JSON.stringify({
        success: true,
        charge: chargeResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});