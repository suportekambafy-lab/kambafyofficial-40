import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabase } from "../_shared/supabase.ts"

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('🔄 Iniciando criação de cobrança AppyPay');
    
    const requestData: CreateChargeRequest = await req.json();
    console.log('📥 Dados recebidos:', JSON.stringify(requestData, null, 2));

    const baseUrl = Deno.env.get('APPYPAY_BASE_URL');
    
    if (!baseUrl) {
      console.error('❌ APPYPAY_BASE_URL não configurada');
      return new Response(
        JSON.stringify({ error: 'URL base da AppyPay não configurada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔑 Gerando token de acesso AppyPay');
    
    // Obter token de acesso via função supabase
    const { data: tokenData, error: tokenError } = await supabase.functions.invoke('appypay-token');
    
    if (tokenError || !tokenData?.success) {
      console.error('❌ Erro ao gerar token:', tokenError || tokenData?.error);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao gerar token de acesso',
          details: tokenError?.message || tokenData?.error
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const accessToken = tokenData.access_token;
    console.log('✅ Token obtido com sucesso');

    // Preparar dados da cobrança conforme documentação AppyPay
    const chargeData = {
      amount: requestData.amount,
      currency: requestData.currency,
      description: requestData.description,
      merchantTransactionId: requestData.merchantTransactionId,
      paymentMethod: "REF_96ee61a9-e9ff-4030-8be6-0b775e847e5f", // ID fixo para referência multibanco
      options: {
        SmartcardNumber: "Smart_card_Number",
        MerchantOrigin: "Kambafy_Platform"
      },
      notify: {
        name: requestData.customerName,
        telephone: requestData.customerPhone,
        email: requestData.customerEmail,
        smsNotification: requestData.smsNotification ?? true,
        emailNotification: requestData.emailNotification ?? true
      }
    };

    console.log('📤 Enviando dados para AppyPay:', JSON.stringify(chargeData, null, 2));

    // Fazer requisição para criar cobrança
    const chargesUrl = `${baseUrl}/v1/charges`;
    
    const response = await fetch(chargesUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargeData)
    });

    const responseText = await response.text();
    console.log('📨 Resposta da API AppyPay:', response.status, responseText);

    if (!response.ok) {
      console.error('❌ Erro na requisição AppyPay:', response.status, responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar cobrança na AppyPay',
          status: response.status,
          details: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const chargeResult = JSON.parse(responseText);
    console.log('✅ Cobrança criada com sucesso:', chargeResult);

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