import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0"

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
    console.log('🔄 Iniciando criação de cobrança AppyPay v2.0');
    
    const requestData: CreateChargeRequest = await req.json();
    console.log('📥 Dados recebidos:', JSON.stringify(requestData, null, 2));

    // Validar dados obrigatórios
    if (!requestData.amount || !requestData.currency || !requestData.customerName || !requestData.customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios em falta: amount, currency, customerName, customerEmail' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obter token de acesso
    console.log('🔑 Obtendo token de acesso...');
    const tokenResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/appypay-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tokenResponse.ok) {
      console.error('❌ Erro ao obter token:', tokenResponse.status);
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

    // Preparar payload para criar cobrança
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL');
    const chargeUrl = `${apiBaseUrl}/v2.0/charges`;
    
    const chargePayload = {
      amount: requestData.amount,
      currency: requestData.currency,
      description: requestData.description,
      merchantTransactionId: requestData.merchantTransactionId,
      customer: {
        name: requestData.customerName,
        email: requestData.customerEmail,
        phone: requestData.customerPhone
      },
      notifications: {
        sms: requestData.smsNotification || false,
        email: requestData.emailNotification || false
      }
    };

    console.log('📡 Criando cobrança:', chargeUrl);
    console.log('📋 Payload:', JSON.stringify(chargePayload, null, 2));

    // Criar cobrança na AppyPay
    const chargeResponse = await fetch(chargeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `${tokenData.token_type} ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chargePayload)
    });

    const chargeResponseText = await chargeResponse.text();
    console.log('📨 Resposta da AppyPay:', chargeResponseText);

    if (!chargeResponse.ok) {
      console.error('❌ Erro ao criar cobrança:', chargeResponse.status, chargeResponseText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar cobrança na AppyPay',
          details: chargeResponseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const appyPayCharge = JSON.parse(chargeResponseText);
    
    // Normalizar resposta para compatibilidade com o frontend
    const normalizedCharge = {
      id: appyPayCharge.id || appyPayCharge.chargeId,
      reference: appyPayCharge.reference || appyPayCharge.paymentReference,
      amount: requestData.amount,
      currency: requestData.currency,
      description: requestData.description,
      merchantTransactionId: requestData.merchantTransactionId,
      status: appyPayCharge.status || 'pending',
      expiryDate: appyPayCharge.expiryDate || appyPayCharge.expireAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      paymentInstructions: appyPayCharge.paymentInstructions || 'Use esta referência para pagamento em qualquer terminal Multicaixa ou banco em Angola',
      customerName: requestData.customerName,
      customerEmail: requestData.customerEmail,
      customerPhone: requestData.customerPhone
    };

    console.log('✅ Cobrança criada com sucesso:', normalizedCharge);

    return new Response(
      JSON.stringify({
        success: true,
        charge: normalizedCharge
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 TESTE - Erro inesperado:', error);
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