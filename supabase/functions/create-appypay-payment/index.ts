import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-APPYPAY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função de criação de pagamento AppyPay iniciada");

    const { 
      productId, 
      customerEmail, 
      customerName, 
      customerPhone, 
      amount, 
      orderId 
    } = await req.json();

    // Validar dados obrigatórios
    if (!productId || !customerEmail || !customerName || !amount || !orderId) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    logStep("Dados do pagamento validados", {
      productId,
      customerEmail,
      customerName,
      amount,
      orderId
    });

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Obter token de autenticação AppyPay
    logStep("Obtendo token de autenticação AppyPay");
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/appypay-auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!authResponse.ok) {
      throw new Error('Falha ao obter token de autenticação AppyPay');
    }

    const authData = await authResponse.json();
    logStep("Token AppyPay obtido", { cached: authData.cached });

    // Calcular data de expiração (24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Preparar dados para a API AppyPay
    const paymentData = {
      amount: parseFloat(amount),
      currency: 'AOA', // Moeda de Angola
      description: `Pagamento para produto ${productId}`,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || null
      },
      orderId: orderId,
      expiresAt: expiresAt.toISOString()
    };

    logStep("Criando cobrança na API AppyPay", paymentData);

    // TODO: Chamar API real do AppyPay quando o endpoint estiver disponível
    // Por enquanto, simular resposta para desenvolvimento
    const appypayResponse = {
      success: true,
      transactionId: `APY_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      referenceNumber: `REF${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending',
      amount: paymentData.amount,
      expiresAt: paymentData.expiresAt
    };

    logStep("Resposta simulada da API AppyPay", appypayResponse);

    // Armazenar pagamento na base de dados
    const { data: paymentRecord, error: dbError } = await supabase
      .from('reference_payments')
      .insert({
        product_id: productId,
        order_id: orderId,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        amount: parseFloat(amount),
        currency: 'KZ', // Kz é a moeda usada no sistema
        reference_number: appypayResponse.referenceNumber,
        appypay_transaction_id: appypayResponse.transactionId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        webhook_data: appypayResponse
      })
      .select()
      .single();

    if (dbError) {
      logStep("Erro ao armazenar pagamento na BD", { error: dbError });
      throw new Error('Erro ao armazenar dados do pagamento');
    }

    logStep("Pagamento armazenado com sucesso", { paymentId: paymentRecord.id });

    return new Response(JSON.stringify({
      success: true,
      paymentId: paymentRecord.id,
      referenceNumber: appypayResponse.referenceNumber,
      transactionId: appypayResponse.transactionId,
      amount: parseFloat(amount),
      currency: 'KZ',
      expiresAt: expiresAt.toISOString(),
      instructions: 'Use o número de referência para fazer o pagamento em qualquer banco ou agente AppyPay',
      message: 'Pagamento por referência criado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep("Erro na criação do pagamento", { error: error.message });
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: 'Erro ao criar pagamento por referência'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});